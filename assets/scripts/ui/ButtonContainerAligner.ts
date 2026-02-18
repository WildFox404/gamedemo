import { _decorator, Component, Node, Layout, UITransform, view } from 'cc';
const { ccclass, property } = _decorator;

/**
 * ButtonContainer 垂直居中对齐器
 * 自动计算并设置按钮组的垂直位置，使其在屏幕中居中
 */
@ccclass('ButtonContainerAligner')
export class ButtonContainerAligner extends Component {
  @property({ tooltip: '是否启用垂直居中对齐' })
  public enableVerticalCenter = true;

  @property({ tooltip: '额外的垂直偏移（像素）' })
  public verticalOffset = 0;

  @property({ tooltip: '按钮平均高度（百分比，用于计算居中位置）' })
  public buttonHeightPercent = 10;

  protected onEnable(): void {
    this.alignButtons();
    
    // 监听屏幕尺寸变化
    view.on('canvas-resize', this.alignButtons, this);
    view.on('resize', this.alignButtons, this);
  }

  protected onDisable(): void {
    view.off('canvas-resize', this.alignButtons, this);
    view.off('resize', this.alignButtons, this);
  }

  private alignButtons(): void {
    if (!this.enableVerticalCenter) return;

    const layout = this.getComponent(Layout);
    if (!layout) {
      console.warn('ButtonContainerAligner: 需要Layout组件来正确计算居中位置');
      return;
    }

    // 获取屏幕尺寸
    const screenSize = view.getVisibleSize();
    const screenHeight = screenSize.height;

    // 计算按钮组的总高度
    const buttonCount = this.node.children.length;
    const buttonHeight = screenHeight * (this.buttonHeightPercent / 100);
    const spacing = layout.spacingY;
    const totalHeight = buttonCount * buttonHeight + (buttonCount - 1) * spacing;

    // 计算居中位置
    const centerY = (totalHeight / 2) - (buttonHeight / 2) + this.verticalOffset;

    // 调整容器位置（因为容器锚点是0.5, 0.5）
    const currentPos = this.node.position;
    this.node.setPosition(currentPos.x, -centerY, currentPos.z);

    console.log(`按钮组居中: 屏幕高度=${screenHeight}, 总高度=${totalHeight}, 居中偏移=${centerY}`);
  }
}