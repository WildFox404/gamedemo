import { _decorator, Node, Enum, CCClass } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 对齐方式枚举
 */
export enum AlignmentType {
  TOP = 'top',
  BOTTOM = 'bottom',
  CENTER = 'center',
}

Enum(AlignmentType);

/**
 * 视差层配置数据类。
 * 用于在 ParallaxRoot 的属性检查器中统一配置各层属性。
 */
@ccclass('ParallaxLayerConfig')
export class ParallaxLayerConfig {
  @property({
    type: Node,
    tooltip: '层节点（拖入对应的 Layer 节点）',
  })
  public layerNode: Node | null = null;

  @property({
    tooltip: '速度系数（0-1），越远的层数值越小。例如：最远层 0.1，最近层 1.0',
    range: [0, 1, 0.01],
  })
  public speedFactor = 0.5;

  @property({
    type: Enum(AlignmentType),
    tooltip: '垂直对齐方式：TOP=贴顶部，BOTTOM=贴底部，CENTER=居中',
  })
  public alignment: AlignmentType = AlignmentType.CENTER;

  constructor() {
    // 确保类可以被正确序列化
  }
}
