import { _decorator, Component, Node, Sprite, UITransform, Vec3, view } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 横向无限滚动背景（适合左右拼接的背景图）。
 *
 * 节点结构示例：
 * - Canvas
 *   - BgScroll   <-- 挂本脚本
 *     - BgA (Sprite + UITransform)
 *     - BgB (Sprite + UITransform)
 *
 * 说明：
 * - 子节点会按顺序自动排成一排
 * - 默认从左往右移动（direction = 1），超出右侧后回到最左侧，实现循环
 * - 可选：自动把每个子背景缩放到“父节点高度”，并保持图片宽高比（autoResizeTiles）
 */
@ccclass('ScrollingTiledBackground')
export class ScrollingTiledBackground extends Component {
  @property({ tooltip: '移动速度（像素/秒）' })
  public speed = 60;

  @property({ tooltip: '方向：1=从左往右，-1=从右往左' })
  public direction: 1 | -1 = 1;

  @property({ tooltip: '自动将每块背景按父节点高度等比缩放（推荐开启）' })
  public autoResizeTiles = true;

  @property({ tooltip: '把子节点重新排布为无缝拼接（推荐开启）' })
  public autoLayoutTiles = true;

  private _tiles: Node[] = [];
  private _tileWidth = 0;
  private _viewWidth = 0;
  private _tmp = new Vec3();

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
    if (this._tiles.length < 2 || this._tileWidth <= 0 || this._viewWidth <= 0) return;

    const dx = this.speed * this.direction * dt;

    // 视口边界：当“整块 tile 完全离开屏幕”才回收
    const halfView = this._viewWidth / 2;
    const halfTile = this._tileWidth / 2;
    const rightBound = halfView + halfTile;
    const leftBound = -halfView - halfTile;

    for (const tile of this._tiles) {
      const p = tile.position;
      tile.setPosition(p.x + dx, p.y, p.z);
    }

    if (this.direction > 0) {
      // 从左往右：出右侧 -> 放到最左侧
      for (const tile of this._tiles) {
        if (tile.position.x > rightBound) {
          const leftmostX = this.getLeftmostX();
          tile.getPosition(this._tmp);
          tile.setPosition(leftmostX - this._tileWidth, this._tmp.y, this._tmp.z);
        }
      }
    } else {
      // 从右往左：出左侧 -> 放到最右侧
      for (const tile of this._tiles) {
        if (tile.position.x < leftBound) {
          const rightmostX = this.getRightmostX();
          tile.getPosition(this._tmp);
          tile.setPosition(rightmostX + this._tileWidth, this._tmp.y, this._tmp.z);
        }
      }
    }
  }

  private setup(): void {
    this._tiles = this.node.children.filter((c) => c && c.isValid && c.activeInHierarchy);

    const parentTransform = this.node.parent?.getComponent(UITransform);
    const selfTransform = this.node.getComponent(UITransform);
    const viewportTransform = parentTransform ?? selfTransform;
    if (!viewportTransform) return;

    this._viewWidth = viewportTransform.contentSize.width;

    if (this._tiles.length < 2) return;

    if (this.autoResizeTiles) {
      const targetHeight = viewportTransform.contentSize.height;
      for (const t of this._tiles) {
        this.resizeTileKeepAspect(t, targetHeight);
      }
    }

    // tileWidth 以第一块为准（要求每块同宽，才能无缝）
    const firstTransform = this._tiles[0].getComponent(UITransform);
    if (!firstTransform) return;
    this._tileWidth = firstTransform.contentSize.width;

    if (this.autoLayoutTiles) {
      this.layoutTiles();
    }
  }

  private resizeTileKeepAspect(tile: Node, targetHeight: number): void {
    const sprite = tile.getComponent(Sprite);
    const transform = tile.getComponent(UITransform);
    if (!sprite || !sprite.spriteFrame || !transform) return;

    sprite.sizeMode = Sprite.SizeMode.CUSTOM;

    const original = sprite.spriteFrame.originalSize;
    const aspect = original.width / Math.max(1, original.height);
    transform.setContentSize(targetHeight * aspect, targetHeight);
  }

  private layoutTiles(): void {
    // 将所有 tile 在本节点局部坐标系下排成一排并居中
    const n = this._tiles.length;
    const startX = -((n - 1) * this._tileWidth) / 2;

    for (let i = 0; i < n; i++) {
      const tile = this._tiles[i];
      tile.getPosition(this._tmp);
      tile.setPosition(startX + i * this._tileWidth, this._tmp.y, this._tmp.z);
    }
  }

  private getLeftmostX(): number {
    let min = Number.POSITIVE_INFINITY;
    for (const t of this._tiles) min = Math.min(min, t.position.x);
    return min;
  }

  private getRightmostX(): number {
    let max = Number.NEGATIVE_INFINITY;
    for (const t of this._tiles) max = Math.max(max, t.position.x);
    return max;
  }
}

