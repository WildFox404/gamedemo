import { _decorator, Component, Node, UITransform, Graphics, Color, Vec3, view, EventTouch, input, Input } from 'cc';
import { BaseItem } from '../item/BaseItem';
import { PlacedItem, PlacedItemData } from './PlacedItem';
import { DragManager } from './DragManager';
import { ItemSlot } from './ItemSlot';
const { ccclass, property } = _decorator;

/**
 * 仓库组件
 * 创建一个7*5的网格仓库，每个格子用正方形表示
 */
@ccclass('Warehouse')
export class Warehouse extends Component {
  @property({ tooltip: '仓库列数（宽度）' })
  public columns: number = 7;

  @property({ tooltip: '仓库行数（高度）' })
  public rows: number = 5;

  @property({ tooltip: '每个格子的大小（像素）' })
  public cellSize: number = 80;

  @property({ tooltip: '格子之间的间距（像素）' })
  public spacing: number = 5;

  @property({ tooltip: '格子的边框颜色' })
  public borderColor: Color = new Color(100, 100, 100, 255);

  @property({ tooltip: '格子的填充颜色' })
  public fillColor: Color = new Color(200, 200, 200, 255);

  @property({ tooltip: '边框宽度（像素）' })
  public borderWidth: number = 2;

  @property({ tooltip: '有效放置时的预览颜色' })
  public validPlaceColor: Color = new Color(100, 255, 100, 150);

  @property({ tooltip: '无效放置时的预览颜色' })
  public invalidPlaceColor: Color = new Color(255, 100, 100, 150);

  private _gridNodes: Node[] = [];
  private _placedItems: PlacedItemData[] = [];
  private _previewNode: Node | null = null;
  private _dragManager: DragManager | null = null;

  private getCellStep(): number {
    return this.cellSize + this.spacing;
  }

  private getWarehouseTopLeft(): Vec3 {
    const totalWidth = this.columns * this.cellSize + (this.columns - 1) * this.spacing;
    const totalHeight = this.rows * this.cellSize + (this.rows - 1) * this.spacing;
    return new Vec3(-totalWidth / 2, totalHeight / 2, 0);
  }

  private uiToLocalPos(uiX: number, uiY: number): Vec3 | null {
    const uiTransform = this.node.getComponent(UITransform);
    if (!uiTransform) {
      return null;
    }

    const localPos = new Vec3();
    uiTransform.convertToNodeSpaceAR(new Vec3(uiX, uiY, 0), localPos);
    return localPos;
  }

  /**
   * 仓库本地坐标转换为网格坐标（返回物品左上角第一个方块的位置）
   */
  public localToGrid(localPos: Vec3, item?: BaseItem): { row: number; col: number } | null {
    const step = this.getCellStep();
    const topLeft = this.getWarehouseTopLeft();

    // 先计算鼠标命中的锚点格子（统一吸附口径）
    const anchorCol = Math.floor((localPos.x - topLeft.x + this.cellSize * 0.5) / step);
    const anchorRow = Math.floor((topLeft.y - localPos.y + this.cellSize * 0.5) / step);

    if (anchorRow < 0 || anchorRow >= this.rows || anchorCol < 0 || anchorCol >= this.columns) {
      return null;
    }

    const row = anchorRow - (item?.anchorRow ?? 0);
    const col = anchorCol - (item?.anchorCol ?? 0);
    return { row, col };
  }

  /**
   * 网格坐标转换为仓库本地坐标（物品左上角第一个方块的左上角）
   */
  public gridToLocalTopLeft(row: number, col: number): Vec3 {
    const step = this.getCellStep();
    const topLeft = this.getWarehouseTopLeft();
    return new Vec3(topLeft.x + col * step, topLeft.y - row * step, 0);
  }

  protected onLoad(): void {
    this.createWarehouse();
  }

  protected onEnable(): void {
    view.on('canvas-resize', this.centerWarehouse, this);
    view.on('resize', this.centerWarehouse, this);
    input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    // 在 onEnable 时重新设置拖拽管理器（此时 DragManager 应该已经创建）
    this.setupDrag();
    console.log(`[Warehouse] onEnable 被调用，已注册触摸事件`);
  }

  protected onDisable(): void {
    view.off('canvas-resize', this.centerWarehouse, this);
    view.off('resize', this.centerWarehouse, this);
    input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
  }

  /**
   * 创建仓库网格
   */
  private createWarehouse(): void {
    // 清除现有格子
    this.clearWarehouse();

    // 计算仓库总尺寸
    const totalWidth = this.columns * this.cellSize + (this.columns - 1) * this.spacing;
    const totalHeight = this.rows * this.cellSize + (this.rows - 1) * this.spacing;

    // 设置容器大小
    const containerTransform = this.getComponent(UITransform);
    if (containerTransform) {
      containerTransform.setContentSize(totalWidth, totalHeight);
      containerTransform.setAnchorPoint(0.5, 0.5);
    }

    // 计算起始位置（左上角第一个格子的左上角）
    const startX = -totalWidth / 2;
    const startY = totalHeight / 2;

    // 创建格子
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.columns; col++) {
        const cellNode = this.createCell(row, col, startX, startY);
        this.node.addChild(cellNode);
        this._gridNodes.push(cellNode);
      }
    }

    // 居中仓库
    this.centerWarehouse();
  }

  /**
   * 创建单个格子
   */
  private createCell(row: number, col: number, startX: number, startY: number): Node {
    const cellNode = new Node(`Cell_${row}_${col}`);

    // 添加UITransform
    const uiTransform = cellNode.addComponent(UITransform);
    uiTransform.setContentSize(this.cellSize, this.cellSize);
    uiTransform.setAnchorPoint(0, 1); // 左上角锚点

    // 计算位置（左上角位置）
    // startX, startY 已经是第一个格子的左上角
    const x = startX + col * (this.cellSize + this.spacing);
    const y = startY - row * (this.cellSize + this.spacing);
    cellNode.setPosition(x, y, 0);

    // 添加Graphics组件绘制正方形
    const graphics = cellNode.addComponent(Graphics);
    this.drawCell(graphics);

    return cellNode;
  }

  /**
   * 绘制单个格子（正方形）
   */
  private drawCell(graphics: Graphics): void {
    graphics.clear();
    // 对齐左上角锚点 (0, 1)：节点局部原点在左上角
    const x = 0;
    const y = -this.cellSize;

    // 绘制填充
    graphics.fillColor = this.fillColor;
    graphics.rect(x, y, this.cellSize, this.cellSize);
    graphics.fill();

    // 绘制边框
    graphics.strokeColor = this.borderColor;
    graphics.lineWidth = this.borderWidth;
    graphics.rect(x, y, this.cellSize, this.cellSize);
    graphics.stroke();
  }

  /**
   * 居中仓库
   */
  private centerWarehouse(): void {
    this.node.setPosition(0, 0, 0);
  }

  /**
   * 清除仓库
   */
  private clearWarehouse(): void {
    // 销毁所有格子节点
    for (const node of this._gridNodes) {
      if (node && node.isValid) {
        node.destroy();
      }
    }
    this._gridNodes = [];

    // 清除所有子节点
    this.node.removeAllChildren();
  }

  /**
   * 获取指定位置的格子节点
   */
  public getCellNode(row: number, col: number): Node | null {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.columns) {
      return null;
    }
    const index = row * this.columns + col;
    return this._gridNodes[index] || null;
  }

  /**
   * 重新创建仓库（当属性改变时调用）
   */
  public refresh(): void {
    this.createWarehouse();
    // 重新放置所有已放置的物品
    const placedItems = [...this._placedItems];
    this._placedItems = [];
    for (const data of placedItems) {
      this.placeItem(data.item, data.row, data.col, false);
    }
  }

  /**
   * 设置拖拽功能
   */
  private setupDrag(): void {
    // 查找Canvas节点（向上遍历父节点）
    let parent = this.node.parent;
    while (parent) {
      const canvas = parent.getComponent('cc.Canvas');
      if (canvas) {
        let dragManagerNode = parent.getChildByName('DragManager');
        if (!dragManagerNode) {
          // 如果不存在，创建 DragManager 节点
          console.log(`[Warehouse] 创建拖拽管理器节点`);
          dragManagerNode = new Node('DragManager');
          dragManagerNode.addComponent(UITransform);
          parent.addChild(dragManagerNode);
        }
        
        this._dragManager = dragManagerNode.getComponent(DragManager);
        if (!this._dragManager) {
          // 如果组件不存在，添加组件
          console.log(`[Warehouse] 添加拖拽管理器组件`);
          this._dragManager = dragManagerNode.addComponent(DragManager);
        }
        
        console.log(`[Warehouse] 拖拽管理器已设置: ${this._dragManager ? '成功' : '失败'}`);
        break;
      }
      parent = parent.parent;
    }
    
    if (!this._dragManager) {
      console.warn(`[Warehouse] 拖拽管理器未初始化，放置功能可能无法使用`);
    }
  }

  /**
   * 触摸移动事件（显示放置预览）
   */
  private onTouchMove(event: EventTouch): void {
    if (!this._dragManager || !this._dragManager.isDragging()) {
      this.hidePreview();
      return;
    }

    const item = this._dragManager.getDraggingItem();
    if (!item) {
      this.hidePreview();
      return;
    }

    const uiPos = event.getUILocation();
    const localPos = this.uiToLocalPos(uiPos.x, uiPos.y);
    if (!localPos) {
      this.hidePreview();
      return;
    }

    // 计算应该放置的行列（使用统一锚点管线）
    const gridPos = this.localToGrid(localPos, item);
    if (gridPos) {
      const { row, col } = gridPos;
      const canPlace = this.canPlaceItem(item, row, col);
      this.showPreview(item, row, col, canPlace);
    } else {
      this.hidePreview();
    }
  }

  /**
   * 触摸结束事件（放置物品）
   */
  private onTouchEnd(event: EventTouch): void {
    console.log(`[Warehouse] onTouchEnd 被调用`);
    
    if (!this._dragManager) {
      console.log(`[Warehouse] 拖拽管理器不存在`);
      return;
    }

    if (!this._dragManager.isDragging()) {
      console.log(`[Warehouse] 当前没有拖拽状态`);
      return;
    }

    const item = this._dragManager.getDraggingItem();
    if (!item) {
      console.log(`[Warehouse] 没有拖拽的物品`);
      this.hidePreview();
      this._dragManager.endDrag();
      return;
    }

    console.log(`[Warehouse] 开始处理放置，物品: ${item.name}`);

    const uiPos = event.getUILocation();
    const localPos = this.uiToLocalPos(uiPos.x, uiPos.y);
    if (!localPos) {
      this.hidePreview();
      this._dragManager.endDrag();
      return;
    }

    // 计算放置位置（使用统一锚点管线）
    const gridPos = this.localToGrid(localPos, item);
    if (gridPos) {
      const { row, col } = gridPos;
      console.log(`[Warehouse] 尝试放置物品到位置: (${row}, ${col}), 物品锚点: (${item.anchorRow}, ${item.anchorCol})`);
      
      if (this.canPlaceItem(item, row, col)) {
        // 可以放置
        console.log(`[Warehouse] 可以放置，开始放置物品`);
        const success = this.placeItem(item, row, col, true);
        
        if (success) {
          console.log(`[Warehouse] 放置成功！`);
          // 从源槽位移除物品
          const sourceSlot = (this._dragManager as any)._sourceSlot;
          if (sourceSlot) {
            const itemSlot = sourceSlot.getComponent(ItemSlot);
            if (itemSlot) {
              itemSlot.removeItem();
            }
          }
        } else {
          console.warn(`[Warehouse] 放置失败`);
        }
      } else {
        console.log(`[Warehouse] 不能放置（重叠或越界）`);
      }
    } else {
      console.log(`[Warehouse] 位置不在有效范围内`);
    }

    this.hidePreview();
    // 结束拖拽
    this._dragManager.endDrag();
  }

  /**
   * 检查是否可以放置物品
   */
  public canPlaceItem(item: BaseItem, row: number, col: number): boolean {
    // 检查边界
    if (row < 0 || col < 0 || row + item.height > this.rows || col + item.width > this.columns) {
      return false;
    }

    // 检查是否与已放置的物品重叠
    const occupiedPositions = item.getOccupiedPositions();
    for (const [itemRow, itemCol] of occupiedPositions) {
      const gridRow = row + itemRow;
      const gridCol = col + itemCol;

      // 检查是否与已放置的物品重叠
      if (this.isCellOccupied(gridRow, gridCol)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 检查指定格子是否被占用
   */
  private isCellOccupied(row: number, col: number): boolean {
    for (const placedItem of this._placedItems) {
      const occupiedPositions = placedItem.item.getOccupiedPositions();
      for (const [itemRow, itemCol] of occupiedPositions) {
        const gridRow = placedItem.row + itemRow;
        const gridCol = placedItem.col + itemCol;
        if (gridRow === row && gridCol === col) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 放置物品
   */
  public placeItem(item: BaseItem, row: number, col: number, addToPlacedList: boolean = true): boolean {
    if (!this.canPlaceItem(item, row, col)) {
      return false;
    }

    const itemTopLeft = this.gridToLocalTopLeft(row, col);

    // 创建已放置的物品节点
    const placedNode = new Node(`PlacedItem_${this._placedItems.length}`);
    const uiTransform = placedNode.addComponent(UITransform);
    
    // 物品容器的尺寸
    const itemTotalWidth = item.width * this.cellSize + (item.width - 1) * this.spacing;
    const itemTotalHeight = item.height * this.cellSize + (item.height - 1) * this.spacing;
    uiTransform.setContentSize(itemTotalWidth, itemTotalHeight);
    
    // 使用左上角锚点
    uiTransform.setAnchorPoint(0, 1);
    placedNode.setPosition(itemTopLeft.x, itemTopLeft.y, 0);

    // 先添加到父节点，确保组件能正确初始化
    this.node.addChild(placedNode);

    // 然后添加组件并设置物品
    const placedItem = placedNode.addComponent(PlacedItem);
    placedItem.cellSize = this.cellSize;
    placedItem.spacing = this.spacing;
    placedItem.setPlacedItem(item, row, col);

    // 调试信息
    console.log(`[Warehouse] 放置物品: ${item.name}, 位置: (${row}, ${col}), 颜色: R=${item.color.r}, G=${item.color.g}, B=${item.color.b}`);

    if (addToPlacedList) {
      this._placedItems.push({ item, row, col });
    }

    return true;
  }

  /**
   * 显示放置预览（考虑锚点）
   */
  private showPreview(item: BaseItem, row: number, col: number, canPlace: boolean): void {
    this.hidePreview();

    const previewNode = new Node('Preview');
    const uiTransform = previewNode.addComponent(UITransform);
    
    // 物品容器的尺寸
    const itemTotalWidth = item.width * this.cellSize + (item.width - 1) * this.spacing;
    const itemTotalHeight = item.height * this.cellSize + (item.height - 1) * this.spacing;
    uiTransform.setContentSize(itemTotalWidth, itemTotalHeight);
    
    // 使用左上角锚点
    uiTransform.setAnchorPoint(0, 1);

    const graphics = previewNode.addComponent(Graphics);
    const occupiedPositions = item.getOccupiedPositions();

    graphics.clear();
    graphics.fillColor = canPlace ? this.validPlaceColor : this.invalidPlaceColor;

    // 计算相对于容器左上角的偏移
    const startX = 0;
    const startY = 0;

    for (const [itemRow, itemCol] of occupiedPositions) {
      const x = startX + itemCol * (this.cellSize + this.spacing);
      const y = startY - itemRow * (this.cellSize + this.spacing) - this.cellSize;
      graphics.rect(x, y, this.cellSize, this.cellSize);
    }
    graphics.fill();

    const itemTopLeft = this.gridToLocalTopLeft(row, col);
    previewNode.setPosition(itemTopLeft.x, itemTopLeft.y, 0);

    this.node.addChild(previewNode);
    this._previewNode = previewNode;
  }

  /**
   * 隐藏预览
   */
  private hidePreview(): void {
    if (this._previewNode) {
      this._previewNode.destroy();
      this._previewNode = null;
    }
  }

  /**
   * 获取已放置的物品列表
   */
  public getPlacedItems(): PlacedItemData[] {
    return [...this._placedItems];
  }

  /**
   * 清空仓库
   */
  public clearAllItems(): void {
    // 销毁所有已放置的物品节点
    const placedNodes = this.node.children.filter(child => child.name.startsWith('PlacedItem_'));
    for (const node of placedNodes) {
      node.destroy();
    }
    this._placedItems = [];
  }
}
