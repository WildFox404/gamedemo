import { _decorator, Component, ResolutionPolicy, view } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 移动端常用的 Canvas 自适配：
 * - 设定一个“设计分辨率”（例如横屏 1280x720 / 竖屏 720x1280）
 * - 根据真实屏幕宽高比，自动在 FIXED_WIDTH / FIXED_HEIGHT 之间切换
 *
 * 用法：挂到 `Canvas` 节点即可。
 */
@ccclass('CanvasAdapter')
export class CanvasAdapter extends Component {
  @property({ tooltip: '设计分辨率宽（如横屏 1280 / 竖屏 720）' })
  public designWidth = 1280;

  @property({ tooltip: '设计分辨率高（如横屏 720 / 竖屏 1280）' })
  public designHeight = 720;

  @property({ tooltip: '自动根据屏幕宽高比选择固定宽/高（推荐开启）' })
  public autoFixedWidthOrHeight = true;

  @property({ tooltip: '关闭自动时使用的策略（SHOW_ALL / NO_BORDER / EXACT_FIT 等）' })
  public fallbackPolicy: ResolutionPolicy = ResolutionPolicy.SHOW_ALL;

  protected onEnable(): void {
    this.apply();

    // 兼容不同版本事件名：canvas-resize / resize
    (view as any).on?.('canvas-resize', this.apply, this);
    (view as any).on?.('resize', this.apply, this);
  }

  protected onDisable(): void {
    (view as any).off?.('canvas-resize', this.apply, this);
    (view as any).off?.('resize', this.apply, this);
  }

  public apply(): void {
    const frame = view.getFrameSize();
    const screenAspect = frame.width / Math.max(1, frame.height);
    const designAspect = this.designWidth / Math.max(1, this.designHeight);

    let policy = this.fallbackPolicy;

    // 更“宽”的屏幕：固定高度（横向显示更多）
    // 更“高”的屏幕：固定宽度（纵向显示更多）
    if (this.autoFixedWidthOrHeight) {
      policy =
        screenAspect >= designAspect
          ? ResolutionPolicy.FIXED_HEIGHT
          : ResolutionPolicy.FIXED_WIDTH;
    }

    view.setDesignResolutionSize(this.designWidth, this.designHeight, policy);
  }
}

