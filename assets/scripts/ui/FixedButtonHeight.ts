import { _decorator, Component, Sprite, UITransform, view } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('FixedButtonHeight')
export class FixedButtonHeight extends Component {
  /** 高度占视图的比例，1/5 = 0.2，即 20% */
  @property({ tooltip: '高度 = 视图高度 × 该比例', range: [0, 1, 0.01] })
  public heightRatio = 0.1;          // 1/5

  private _designAspectRatio = 0;

  protected onLoad(): void {
    // 从 Sprite 获取设计尺寸的宽高比，用于等比例缩放
    const sprite = this.getComponent(Sprite);
    if (sprite?.spriteFrame) {
      const rect = sprite.spriteFrame.rect;
      this._designAspectRatio = rect.width / rect.height;
    }
    if (this._designAspectRatio <= 0) {
      const ui = this.getComponent(UITransform);
      if (ui) {
        this._designAspectRatio = ui.contentSize.width / ui.contentSize.height || 2.5;
      } else {
        this._designAspectRatio = 2.0;
      }
    }
  }

  protected onEnable(): void {
    this.updateSize();
    view.on('canvas-resize', this.updateSize, this);
    view.on('resize', this.updateSize, this);
  }

  protected onDisable(): void {
    view.off('canvas-resize', this.updateSize, this);
    view.off('resize', this.updateSize, this);
  }

  private updateSize(): void {
    const ui = this.getComponent(UITransform);
    if (!ui) return;
    if (this._designAspectRatio <= 0) this.onLoad();

    const viewHeight = view.getVisibleSize().height;
    const targetHeight = viewHeight * this.heightRatio;
    const targetWidth = targetHeight * this._designAspectRatio;

    ui.setContentSize(targetWidth, targetHeight);
  }
}