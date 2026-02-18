import {
  _decorator,
  Component,
  Node,
  Sprite,
  UITransform,
  Vec3,
  view,
  instantiate,
} from 'cc';
import { ParallaxLayer, AlignmentType } from './ParallaxLayer';

const { ccclass, property } = _decorator;

/**
 * 多层视差滚动背景系统（极简版）。
 *
 * 用法：
 * 1. 在每个 Layer 子节点挂 ParallaxLayer 组件
 * 2. 在该组件里设 speedFactor / alignment
 * 3. ParallaxRoot 仅暴露 BaseSpeed / Direction
 */
@ccclass('ParallaxBackground')
export class ParallaxBackground extends Component {
  @property({ tooltip: '基础移动速度（像素/秒）' }) public baseSpeed = 60;
  @property({ tooltip: '方向：1=从左往右，-1=从右往左' }) public direction: 1 | -1 = 1;

  /* ---------- 内部数据 ---------- */
  private _layerData: Array<{
    node: Node;
    speedFactor: number;
    tiles: Node[];
    tileWidth: number;
    alignment: 'top' | 'bottom' | 'center';
  }> = [];
  private _viewWidth = 0;
  private _viewHeight = 0;
  private _tmp = new Vec3();

  /* ---------- 生命周期 ---------- */
  protected onEnable(): void {
    this.setup();
    (view as any).on?.('canvas-resize', this.setup, this);
    (view as any).on?.('resize', this.setup, this);
  }
  protected onDisable(): void {
    (view as any).off?.('canvas-resize', this.setup, this);
    (view as any).off?.('resize', this.setup, this);
  }
  protected update(dt: number): void {
    if (this._layerData.length === 0) return;
    const baseDx = this.baseSpeed * this.direction * dt;
    for (const layer of this._layerData) {
      const dx = baseDx * layer.speedFactor;
      const halfView = this._viewWidth / 2;
      const halfTile = layer.tileWidth / 2;
      const rightBound = halfView + halfTile;
      const leftBound  = -halfView - halfTile;

      // 视差滚动 + tile 回收
      for (const tile of layer.tiles) {
        const p = tile.position;
        tile.setPosition(p.x + dx, p.y, p.z);
      }
      if (this.direction > 0) {
        for (const tile of layer.tiles) {
          if (tile.position.x > rightBound) {
            const leftmostX = this.getLeftmostX(layer.tiles);
            tile.getPosition(this._tmp);
            tile.setPosition(leftmostX - layer.tileWidth, this._tmp.y, this._tmp.z);
          }
        }
      } else {
        for (const tile of layer.tiles) {
          if (tile.position.x < leftBound) {
            const rightmostX = this.getRightmostX(layer.tiles);
            tile.getPosition(this._tmp);
            tile.setPosition(rightmostX + layer.tileWidth, this._tmp.y, this._tmp.z);
          }
        }
      }
    }
  }

  /* ---------- 核心逻辑 ---------- */
  private setup(): void {
    const viewportTransform = this.node.parent?.getComponent(UITransform) ?? this.node.getComponent(UITransform);
    if (!viewportTransform) return;
    this._viewWidth  = viewportTransform.contentSize.width;
    this._viewHeight = viewportTransform.contentSize.height;

    const layerNodes = this.node.children.filter(n => n && n.isValid && n.activeInHierarchy);
    this._layerData = [];

    for (let i = 0; i < layerNodes.length; i++) {
      const layerNode = layerNodes[i];
      const comp = layerNode.getComponent(ParallaxLayer);
      const speedFactor = comp ? comp.speedFactor : Math.max(0.1, i / (layerNodes.length - 1));
      let alignment: 'top' | 'bottom' | 'center' = 'center';
      if (comp && !comp.autoDetect) {
        alignment = comp.alignment as 'top' | 'bottom' | 'center';
      } else {
        const name = layerNode.name.toLowerCase();
        if (name.includes('top') || name.includes('sky') || name.includes('cloud')) alignment = 'top';
        else if (name.includes('bottom') || name.includes('ground') || name.includes('floor')) alignment = 'bottom';
      }

      let tiles = layerNode.children.filter(c => c && c.isValid && c.activeInHierarchy);
      if (tiles.length === 0) tiles = [layerNode]; // 自身当 tile
      if (tiles.length < 2) { // 至少 2 块循环
        const need = 2 - tiles.length;
        const template = tiles[0];
        for (let k = 0; k < need; k++) {
          const clone = instantiate(template);
          template.parent!.addChild(clone);
          tiles.push(clone);
        }
      }

      const firstTF = tiles[0].getComponent(UITransform);
      if (!firstTF) continue;
      const tileHeight = firstTF.contentSize.height;
      const tileWidth  = firstTF.contentSize.width;

      this.alignTilesVertically(tiles, alignment, tileHeight);

      this._layerData.push({
        node: layerNode,
        speedFactor,
        tiles,
        tileWidth,
        alignment,
      });
    }
  }

  /* ---------- 工具函数 ---------- */
  private alignTilesVertically(tiles: Node[], alignment: 'top' | 'bottom' | 'center', tileHeight: number): void {
    const parentTF = this.node.parent?.getComponent(UITransform) ?? this.node.getComponent(UITransform);
    if (!parentTF) return;
    const viewHeight = parentTF.contentSize.height;

    const n = tiles.length;
    const firstTF   = tiles[0].getComponent(UITransform);
    const tileWidth = firstTF.contentSize.width;     // ← 修复：显式取宽度
    const startX    = -((n - 1) * tileWidth) / 2;

    tiles.forEach((tile, idx) => {
      let y = 0;
      if (alignment === 'top')    y =  viewHeight / 2 - tileHeight / 2;
      if (alignment === 'bottom') y = -viewHeight / 2 + tileHeight / 2;
      tile.setPosition(startX + idx * tileWidth, y, 0);
    });
  }

  private getLeftmostX(tiles: Node[]): number  { let min = Infinity;  for (const t of tiles) min = Math.min(min, t.position.x); return min; }
  private getRightmostX(tiles: Node[]): number { let max = -Infinity; for (const t of tiles) max = Math.max(max, t.position.x); return max; }
}