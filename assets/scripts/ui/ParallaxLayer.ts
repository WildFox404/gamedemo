import { _decorator, Component, Node, Enum, Sprite, UITransform } from 'cc';
import { BackgroundKeepAspect } from './BackgroundKeepAspect';

const { ccclass, property } = _decorator;

export enum AlignmentType {
  TOP    = 'top',
  BOTTOM = 'bottom',
  CENTER = 'center',
}
Enum(AlignmentType);

@ccclass('ParallaxLayer')
export class ParallaxLayer extends Component {
  @property({ tooltip: '速度系数（0-1）', range: [0, 1, 0.01] })
  public speedFactor = 0.5;

  @property({ type: Enum(AlignmentType), tooltip: '垂直对齐' })
  public alignment: AlignmentType = AlignmentType.CENTER;

  @property({ tooltip: '是否让 ParallaxRoot 自动判断（启用后忽略上方设置）' })
  public autoDetect = false;

  /* 一键等高铺满开关 */
  @property({ tooltip: '自动添加/移除 BackgroundKeepAspect（等高占满屏幕）' })
  public useBackgroundKeepAspect = false;

  protected onEnable(): void {
    if (this.useBackgroundKeepAspect) this.addBackgroundKeepAspect();
  }
  protected onDisable(): void {
    this.removeBackgroundKeepAspect();
  }

  /* ---------- 工具 ---------- */
  private addBackgroundKeepAspect(): void {
    const comp = this.node.getComponent(BackgroundKeepAspect);
    console.log('[ParallaxLayer] 已存在 BackgroundKeepAspect?', comp);
    if (!comp) {
      this.node.addComponent(BackgroundKeepAspect);
      console.log('[ParallaxLayer] 已自动添加 BackgroundKeepAspect');
    }

    /* ===== 诊断（以 Canvas 为基准） ===== */
    const spr      = this.node.getComponent(Sprite);
    const canvasTF = this.node.scene.getComponentInChildren(UITransform); // ← Canvas
    console.log('[ParallaxLayer] SpriteFrame原始尺寸', spr?.spriteFrame?.originalSize);
    console.log('[ParallaxLayer] Canvas高度', canvasTF?.contentSize.height);
  }
  private removeBackgroundKeepAspect(): void {
    const comp = this.node.getComponent(BackgroundKeepAspect);
    if (comp) comp.destroy();
  }
}