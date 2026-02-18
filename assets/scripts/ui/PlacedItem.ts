import { _decorator, Component, Node, UITransform, Graphics, Color } from 'cc';
import { BaseItem } from '../item/BaseItem';
const { ccclass, property } = _decorator;

/**
 * 已放置的物品数据
 */
export interface PlacedItemData {
  item: BaseItem;
  row: number;
  col: number;
}

/**
 * 已放置的物品组件
 * 用于在仓库中显示已放置的物品
 */
@ccclass('PlacedItem')
export class PlacedItem extends Component {
  @property({ tooltip: '每个格子的大小（像素）' })
  public cellSize: number = 80;

  @property({ tooltip: '格子之间的间距（像素）' })
  public spacing: number = 5;

  private _item: BaseItem | null = null;
  private _row: number = 0;
  private _col: number = 0;
  private _cellNodes: Node[] = [];

  /**
   * 设置放置的物品和位置
   */
  public setPlacedItem(item: BaseItem, row: number, col: number): void {
    this._item = item;
    this._row = row;
    this._col = col;
    this.updateDisplay();
  }

  protected onLoad(): void {
    // 如果已经有物品数据，在onLoad时更新显示
    if (this._item) {
      this.updateDisplay();
    }
  }

  /**
   * 获取物品
   */
  public getItem(): BaseItem | null {
    return this._item;
  }

  /**
   * 获取位置
   */
  public getPosition(): { row: number; col: number } {
    return { row: this._row, col: this._col };
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
      // 使用中心锚点，与仓库格子一致
      containerTransform.setAnchorPoint(0.5, 0.5);
    }

    // 计算起始位置（左上角第一个方块的中心）
    // 从容器中心向左上偏移到第一个方块的中心
    const startX = -(totalWidth / 2) + this.cellSize / 2;
    const startY = (totalHeight / 2) - this.cellSize / 2;

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

    // 确保Graphics组件正确渲染
    this.scheduleOnce(() => {
      for (const cellNode of this._cellNodes) {
        const graphics = cellNode.getComponent(Graphics);
        if (graphics) {
          // 强制重新绘制
          graphics.markForUpdateRenderData();
        }
      }
    }, 0);
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

    // 绘制填充 - 确保颜色正确设置
    const fillColor = new Color(color.r, color.g, color.b, color.a);
    graphics.fillColor = fillColor;
    graphics.rect(x, y, this.cellSize, this.cellSize);
    graphics.fill();

    // 绘制边框
    graphics.strokeColor = new Color(50, 50, 50, 255);
    graphics.lineWidth = 2;
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
    this.node.removeAllChildren();
  }
}
