import { _decorator, Component, Sprite, UITransform, view } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 背景图保持宽高比：
 * - 高度始终等于父节点（通常是 Canvas）的高度
 * - 宽度按图片比例计算，因此可能左右“超出屏幕”（被裁切），不会被拉伸变形
 *
 * 用法：挂到 `Background` 节点（节点上有 Sprite）。
 * 建议：不要给 Background 勾选 Widget 的 Left/Right 拉伸。
 */
@ccclass('BackgroundKeepAspect')
export class BackgroundKeepAspect extends Component {
  @property({ type: Sprite, tooltip: '不填则自动取同节点 Sprite' })
  public sprite: Sprite | null = null;

  protected onEnable(): void {
    if (!this.sprite) this.sprite = this.getComponent(Sprite);
    this.apply();

    (view as any).on?.('canvas-resize', this.apply, this);
    (view as any).on?.('resize', this.apply, this);
  }

  protected onDisable(): void {
    (view as any).off?.('canvas-resize', this.apply, this);
    (view as any).off?.('resize', this.apply, this);
  }

  public apply(): void {
    const sprite = this.sprite;
    if (!sprite || !sprite.spriteFrame) return;

    // 确保按节点尺寸渲染（避免 RAW/TRIMMED 抢回尺寸）
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;

    const parentTransform = this.node.parent?.getComponent(UITransform);
    const selfTransform = this.getComponent(UITransform);
    if (!parentTransform || !selfTransform) return;

    const parentHeight = parentTransform.contentSize.height;

    const original = sprite.spriteFrame.originalSize;
    const aspect = original.width / Math.max(1, original.height);

    const width = parentHeight * aspect;
    selfTransform.setContentSize(width, parentHeight);
  }
}

