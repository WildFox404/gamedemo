import { _decorator, Component, Node, UITransform, Graphics, Color, EventTouch } from 'cc';
import { BaseItem } from '../item/BaseItem';
const { ccclass, property } = _decorator;

/**
 * 已放置的物品数据
 */
export interface PlacedItemData {
  item: BaseItem;
  row: number;
  col: number;
  node: Node;
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
  public spacing: number = 0;

  @property({ tooltip: '星星格颜色' })
  public starColor: Color = new Color(255, 220, 90, 255);

  @property({ tooltip: '星星无效填充色' })
  public starInactiveFillColor: Color = new Color(130, 130, 130, 255);

  @property({ tooltip: '星星描边色' })
  public starStrokeColor: Color = new Color(255, 220, 90, 255);

  @property({ tooltip: '星星圆点半径比例（相对格子）' })
  public starRadiusRatio: number = 0.28;

  @property({ tooltip: '是否显示星星格（2）' })
  public showStars: boolean = false;

  private _item: BaseItem | null = null;
  private _row: number = 0;
  private _col: number = 0;
  private _cellNodes: Node[] = [];
  private _touchStartPosX: number = 0;
  private _touchStartPosY: number = 0;
  private _touchMoved: boolean = false;
  private _dragStarted: boolean = false;
  private _activeStarKeys: Set<string> = new Set<string>();
  private static readonly DRAG_THRESHOLD_PX = 12;

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
    this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    // 如果已经有物品数据，在onLoad时更新显示
    if (this._item) {
      this.updateDisplay();
    }
  }

  protected onDestroy(): void {
    this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
    this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
    this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
    this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
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

  public setShowStars(show: boolean): void {
    if (this.showStars === show) {
      return;
    }
    this.showStars = show;
    this.updateDisplay();
  }

  public setActiveStarKeys(keys: Set<string>): void {
    this._activeStarKeys = new Set(keys);
    if (this.showStars) {
      this.updateDisplay();
    }
  }

  private onTouchStart(event: EventTouch): void {
    if (!this._item) {
      return;
    }
    const uiPos = event.getUILocation();
    this._touchStartPosX = uiPos.x;
    this._touchStartPosY = uiPos.y;
    this._touchMoved = false;
    this._dragStarted = false;
  }

  private onTouchMove(event: EventTouch): void {
    if (!this._item || this._dragStarted) {
      return;
    }
    const uiPos = event.getUILocation();
    const dx = uiPos.x - this._touchStartPosX;
    const dy = uiPos.y - this._touchStartPosY;
    if (dx * dx + dy * dy < PlacedItem.DRAG_THRESHOLD_PX * PlacedItem.DRAG_THRESHOLD_PX) {
      return;
    }
    this._touchMoved = true;
    const warehouse = this.node.parent?.getComponent('Warehouse') as any;
    if (!warehouse || typeof warehouse.startDragFromPlacedItem !== 'function') {
      return;
    }
    const started = warehouse.startDragFromPlacedItem(this.node, event);
    if (started) {
      this._dragStarted = true;
      event.propagationStopped = true;
    }
  }

  private onTouchEnd(event: EventTouch): void {
    if (!this._item) {
      return;
    }
    if (!this._touchMoved && !this._dragStarted) {
      const warehouse = this.node.parent?.getComponent('Warehouse') as any;
      if (warehouse && typeof warehouse.selectPlacedItem === 'function') {
        warehouse.selectPlacedItem(this.node);
      }
      event.propagationStopped = true;
    }
    this._dragStarted = false;
    this._touchMoved = false;
  }

  private onTouchCancel(event: EventTouch): void {
    this._dragStarted = false;
    this._touchMoved = false;
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
      // 使用左上角锚点（与父节点一致）
      containerTransform.setAnchorPoint(0, 1);
    }

    // 计算起始位置（左上角第一个方块的左上角）
    // 从容器左上角开始，第一个方块的位置
    const startX = 0;
    const startY = 0;

    // 创建格子
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (shape[row][col] !== 0) {
          const isStar = shape[row][col] === 2;
          if (isStar && !this.showStars) {
            continue;
          }
          const isStarActive = isStar && this._activeStarKeys.has(this.getStarKey(row, col));
          const cellNode = this.createCell(
            row,
            col,
            startX,
            startY,
            isStar ? this.starColor : itemColor,
            isStar,
            isStarActive
          );
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
  private createCell(
    row: number,
    col: number,
    startX: number,
    startY: number,
    color: Color,
    isStar: boolean,
    isStarActive: boolean
  ): Node {
    const cellNode = new Node(`Cell_${row}_${col}`);

    // 添加UITransform
    const uiTransform = cellNode.addComponent(UITransform);
    uiTransform.setContentSize(this.cellSize, this.cellSize);
    uiTransform.setAnchorPoint(0, 1); // 左上角锚点

    // 计算位置（左上角位置）
    const x = startX + col * (this.cellSize + this.spacing);
    const y = startY - row * (this.cellSize + this.spacing);
    cellNode.setPosition(x, y, 0);

    // 添加Graphics组件绘制格子/星星
    const graphics = cellNode.addComponent(Graphics);
    this.drawCell(graphics, color, isStar, isStarActive);

    return cellNode;
  }

  /**
   * 绘制单个格子
   */
  private drawCell(graphics: Graphics, color: Color, isStar: boolean, isStarActive: boolean): void {
    graphics.clear();
    const fillColor = new Color(color.r, color.g, color.b, color.a);
    if (isStar) {
      const radius = this.cellSize * Math.max(0.1, Math.min(this.starRadiusRatio, 0.48));
      graphics.fillColor = isStarActive ? fillColor : this.starInactiveFillColor;
      graphics.circle(this.cellSize * 0.5, -this.cellSize * 0.5, radius);
      graphics.fill();
      graphics.strokeColor = this.starStrokeColor;
      graphics.lineWidth = 2;
      graphics.circle(this.cellSize * 0.5, -this.cellSize * 0.5, radius);
      graphics.stroke();
      return;
    }

    // 对齐左上角锚点 (0, 1)：节点局部原点在左上角
    const x = 0;
    const y = -this.cellSize;
    graphics.fillColor = fillColor;
    graphics.rect(x, y, this.cellSize, this.cellSize);
    graphics.fill();
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

  private getStarKey(row: number, col: number): string {
    return `${row},${col}`;
  }
}
