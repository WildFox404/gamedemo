import { _decorator, Component, Node, UITransform, Graphics, Color } from 'cc';
import { BaseItem } from '../item/BaseItem';
const { ccclass, property } = _decorator;

/**
 * 物品显示组件
 * 用于可视化显示物品的形状
 */
@ccclass('ItemDisplay')
export class ItemDisplay extends Component {
  @property({ tooltip: '每个格子的大小（像素）' })
  public cellSize: number = 40;

  @property({ tooltip: '格子之间的间距（像素）' })
  public spacing: number = 0;

  @property({ tooltip: '边框颜色' })
  public borderColor: Color = new Color(50, 50, 50, 255);

  @property({ tooltip: '边框宽度（像素）' })
  public borderWidth: number = 1;

  private _item: BaseItem | null = null;
  private _cellNodes: Node[] = [];

  /**
   * 设置要显示的物品
   */
  public setItem(item: BaseItem | null): void {
    this._item = item;
    this.updateDisplay();
  }

  /**
   * 获取当前物品
   */
  public getItem(): BaseItem | null {
    return this._item;
  }

  protected onLoad(): void {
    this.updateDisplay();
  }

  /**
   * 更新显示
   */
  private updateDisplay(): void {
    this.clearDisplay();

    if (!this._item) {
      return;
    }

    const shape = this._item.shape;
    const itemColor = this._item.color;

    // 计算显示区域大小
    const rows = shape.length;
    const cols = rows > 0 ? shape[0].length : 0;
    const totalWidth = cols * this.cellSize + (cols - 1) * this.spacing;
    const totalHeight = rows * this.cellSize + (rows - 1) * this.spacing;

    // 设置容器大小
    const containerTransform = this.getComponent(UITransform);
    if (containerTransform) {
      containerTransform.setContentSize(totalWidth, totalHeight);
      containerTransform.setAnchorPoint(0.5, 0.5);
    }

    // 计算起始位置（左上角）
    const startX = -totalWidth / 2 + this.cellSize / 2;
    const startY = totalHeight / 2 - this.cellSize / 2;

    // 创建格子
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (shape[row][col] === 1) {
          const cellNode = this.createCell(row, col, startX, startY, itemColor);
          this.node.addChild(cellNode);
          this._cellNodes.push(cellNode);
        }
      }
    }
  }

  /**
   * 创建单个格子
   */
  private createCell(row: number, col: number, startX: number, startY: number, color: Color): Node {
    const cellNode = new Node(`Cell_${row}_${col}`);

    // 添加UITransform
    const uiTransform = cellNode.addComponent(UITransform);
    uiTransform.setContentSize(this.cellSize, this.cellSize);
    uiTransform.setAnchorPoint(0.5, 0.5);

    // 计算位置
    const x = startX + col * (this.cellSize + this.spacing);
    const y = startY - row * (this.cellSize + this.spacing);
    cellNode.setPosition(x, y, 0);

    // 添加Graphics组件绘制正方形
    const graphics = cellNode.addComponent(Graphics);
    this.drawCell(graphics, color);

    return cellNode;
  }

  /**
   * 绘制单个格子
   */
  private drawCell(graphics: Graphics, color: Color): void {
    graphics.clear();

    const halfSize = this.cellSize / 2;
    const x = -halfSize;
    const y = -halfSize;

    // 绘制填充
    graphics.fillColor = color;
    graphics.rect(x, y, this.cellSize, this.cellSize);
    graphics.fill();

    // 绘制边框
    graphics.strokeColor = this.borderColor;
    graphics.lineWidth = this.borderWidth;
    graphics.rect(x, y, this.cellSize, this.cellSize);
    graphics.stroke();
  }

  /**
   * 清除显示
   */
  private clearDisplay(): void {
    // 销毁所有格子节点
    for (const node of this._cellNodes) {
      if (node && node.isValid) {
        node.destroy();
      }
    }
    this._cellNodes = [];

    // 清除所有子节点
    this.node.removeAllChildren();
  }
}
