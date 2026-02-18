import { _decorator, Component, UITransform, Widget } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('FixedLogo')
export class FixedLogo extends Component {
  protected onEnable(): void {
    const widget = this.getComponent(Widget) ?? this.addComponent(Widget);
    widget.isAlignTop = true;
    widget.top = 40;                 // 1/4 高度
    widget.isAlignHorizontalCenter = true;
    widget.horizontalCenter = 0;     // 左右居中
    widget.isAbsoluteTop = true;     // 用像素单位
    widget.updateAlignment();        // 立即生效
  }
}