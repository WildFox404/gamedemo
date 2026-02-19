import { _decorator, Component, Node, UITransform, Graphics, Color, Vec2, Vec3, Size, view, EventTouch, input, Input, RigidBody2D, BoxCollider2D, ERigidBody2DType, PhysicsSystem2D } from 'cc';
import { BaseItem } from '../item/BaseItem';
import { PlacedItem, PlacedItemData } from './PlacedItem';
import { DragManager } from './DragManager';
import { ItemSlot } from './ItemSlot';
import { ItemDisplay } from './ItemDisplay';
const { ccclass, property } = _decorator;

/**
 * 仓库组件
 * 创建一个7*5的网格仓库，每个格子用正方形表示
 */
@ccclass('Warehouse')
export class Warehouse extends Component {
  @property({ tooltip: '仓库列数（宽度）' })
  public columns: number = 10;

  @property({ tooltip: '仓库行数（高度）' })
  public rows: number = 6;

  @property({ tooltip: '每个格子的大小（像素）' })
  public cellSize: number = 80;

  @property({ tooltip: '格子之间的间距（像素）' })
  public spacing: number = 5;

  @property({ tooltip: '屏幕左右留白（像素）' })
  public horizontalPadding: number = 20;

  @property({ tooltip: '仓库距屏幕底部留白（像素）' })
  public bottomPadding: number = 20;

  @property({ tooltip: '背景内边距（像素）' })
  public panelPadding: number = 12;

  @property({ tooltip: '仓库背景色' })
  public panelBackgroundColor: Color = new Color(28, 34, 46, 235);

  @property({ tooltip: '仓库边框色' })
  public panelBorderColor: Color = new Color(98, 140, 220, 255);

  @property({ tooltip: '仓库边框宽度（像素）' })
  public panelBorderWidth: number = 3;

  @property({ tooltip: '仓库背景圆角（像素）' })
  public panelCornerRadius: number = 18;

  @property({ tooltip: '物品内部方块间距（像素）' })
  public itemSpacing: number = 0;

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

  @property({ tooltip: '仓库上方杂物区高度（像素）' })
  public junkAreaHeight: number = 260;

  @property({ tooltip: '杂物区与仓库的间距（像素）' })
  public junkAreaGap: number = 16;

  @property({ tooltip: '杂物区背景色' })
  public junkAreaBackgroundColor: Color = new Color(22, 26, 36, 140);

  @property({ tooltip: '杂物区边框色' })
  public junkAreaBorderColor: Color = new Color(120, 130, 160, 200);

  @property({ tooltip: '杂物区边界厚度（像素）' })
  public junkBoundaryThickness: number = 14;

  private _gridNodes: Node[] = [];
  private _placedItems: PlacedItemData[] = [];
  private _previewNode: Node | null = null;
  private _dragManager: DragManager | null = null;
  private _draggingPlacedData: PlacedItemData | null = null;
  private _draggingJunkNode: Node | null = null;
  private _draggingJunkItem: BaseItem | null = null;
  private _draggingJunkLocalPos: Vec3 = new Vec3();
  private _backgroundNode: Node | null = null;
  private _junkAreaNode: Node | null = null;
  private _junkItemsNode: Node | null = null;
  private _junkBoundaryNodes: Node[] = [];
  private _junkItemMap: Map<Node, BaseItem> = new Map();

  private getCellStep(): number {
    return this.cellSize + this.spacing;
  }

  private getItemStep(): number {
    return this.cellSize + this.itemSpacing;
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
    const referencePos = item ? this.convertItemCenterToAnchorCenter(localPos, item) : localPos;
    const gridWidth = this.columns * step - this.spacing;
    const gridHeight = this.rows * step - this.spacing;

    if (
      referencePos.x < topLeft.x ||
      referencePos.x > topLeft.x + gridWidth ||
      referencePos.y > topLeft.y ||
      referencePos.y < topLeft.y - gridHeight
    ) {
      return null;
    }

    // 先计算鼠标命中的锚点格子（统一吸附口径）
    const anchorCol = Math.floor((referencePos.x - topLeft.x + this.cellSize * 0.5) / step);
    const anchorRow = Math.floor((topLeft.y - referencePos.y + this.cellSize * 0.5) / step);

    if (anchorRow < 0 || anchorRow >= this.rows || anchorCol < 0 || anchorCol >= this.columns) {
      return null;
    }

    const row = anchorRow - (item?.anchorRow ?? 0);
    const col = anchorCol - (item?.anchorCol ?? 0);
    return { row, col };
  }

  /**
   * 将“物品中心点”坐标换算为“锚点方块中心点”坐标，用于网格吸附
   */
  private convertItemCenterToAnchorCenter(centerLocalPos: Vec3, item: BaseItem): Vec3 {
    const step = this.getCellStep();
    const occupiedWidth = item.width * step - this.spacing;
    const occupiedHeight = item.height * step - this.spacing;

    // 以物品左上角为原点的几何量（Y 向下为正）
    const centerX = occupiedWidth * 0.5;
    const centerY = occupiedHeight * 0.5;
    const anchorCenterX = item.anchorCol * step + this.cellSize * 0.5;
    const anchorCenterY = item.anchorRow * step + this.cellSize * 0.5;

    const deltaX = anchorCenterX - centerX;
    const deltaYInLocal = -(anchorCenterY - centerY);
    return new Vec3(centerLocalPos.x + deltaX, centerLocalPos.y + deltaYInLocal, 0);
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
    this.setupJunkArea();
  }

  protected onEnable(): void {
    view.on('canvas-resize', this.onViewResize, this);
    view.on('resize', this.onViewResize, this);
    input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    // 在 onEnable 时重新设置拖拽管理器（此时 DragManager 应该已经创建）
    this.setupDrag();
    console.log(`[Warehouse] onEnable 被调用，已注册触摸事件`);
  }

  protected onDisable(): void {
    view.off('canvas-resize', this.onViewResize, this);
    view.off('resize', this.onViewResize, this);
    input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.off(Input.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
  }

  /**
   * 创建仓库网格
   */
  private createWarehouse(): void {
    // 清除现有格子
    this.clearWarehouse();

    // 宽度铺满屏幕（左右留白）
    const visibleSize = view.getVisibleSize();
    const availableWidth = Math.max(0, visibleSize.width - this.horizontalPadding * 2 - this.panelPadding * 2);
    const computedCellSize = (availableWidth - (this.columns - 1) * this.spacing) / this.columns;
    this.cellSize = Math.max(1, Math.floor(computedCellSize));

    // 计算仓库总尺寸（网格区域）
    const totalWidth = this.columns * this.cellSize + (this.columns - 1) * this.spacing;
    const totalHeight = this.rows * this.cellSize + (this.rows - 1) * this.spacing;
    const panelWidth = totalWidth + this.panelPadding * 2;
    const panelHeight = totalHeight + this.panelPadding * 2;

    // 设置容器大小
    const containerTransform = this.getComponent(UITransform);
    if (containerTransform) {
      containerTransform.setContentSize(panelWidth, panelHeight);
      containerTransform.setAnchorPoint(0.5, 0.5);
    }

    this.createBackground(panelWidth, panelHeight);

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
    const visibleSize = view.getVisibleSize();
    const uiTransform = this.getComponent(UITransform);
    const warehouseHeight = uiTransform ? uiTransform.contentSize.height : 0;
    const y = -visibleSize.height / 2 + warehouseHeight / 2 + this.bottomPadding;
    this.node.setPosition(0, y, 0);
  }

  private onViewResize(): void {
    this.refresh();
    this.setupJunkArea();
  }

  private createBackground(panelWidth: number, panelHeight: number): void {
    const bgNode = new Node('WarehousePanelBg');
    const uiTransform = bgNode.addComponent(UITransform);
    uiTransform.setContentSize(panelWidth, panelHeight);
    uiTransform.setAnchorPoint(0.5, 0.5);
    bgNode.setPosition(0, 0, -1);

    const graphics = bgNode.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = this.panelBackgroundColor;
    graphics.strokeColor = this.panelBorderColor;
    graphics.lineWidth = this.panelBorderWidth;

    const x = -panelWidth / 2;
    const y = -panelHeight / 2;
    graphics.roundRect(x, y, panelWidth, panelHeight, this.panelCornerRadius);
    graphics.fill();
    graphics.stroke();

    this.node.addChild(bgNode);
    this._backgroundNode = bgNode;
  }

  private setupJunkArea(): void {
    const parent = this.node.parent;
    const warehouseTransform = this.node.getComponent(UITransform);
    if (!parent || !warehouseTransform) {
      return;
    }

    this.ensurePhysicsEnabled();

    if (!this._junkAreaNode || !this._junkAreaNode.isValid) {
      this._junkAreaNode = new Node('JunkArea');
      const areaTransform = this._junkAreaNode.addComponent(UITransform);
      areaTransform.setAnchorPoint(0.5, 0.5);
      this._junkAreaNode.addComponent(Graphics);
      parent.addChild(this._junkAreaNode);

      this._junkItemsNode = new Node('JunkItems');
      const itemsTransform = this._junkItemsNode.addComponent(UITransform);
      itemsTransform.setAnchorPoint(0.5, 0.5);
      this._junkAreaNode.addChild(this._junkItemsNode);

      this._junkBoundaryNodes = [
        this.createJunkBoundary('JunkBoundaryLeft'),
        this.createJunkBoundary('JunkBoundaryRight'),
        this.createJunkBoundary('JunkBoundaryBottom'),
      ];
      for (const boundary of this._junkBoundaryNodes) {
        this._junkAreaNode.addChild(boundary);
      }
    }

    const visible = view.getVisibleSize();
    const areaWidth = Math.max(120, visible.width - this.horizontalPadding * 2);
    const maxAvailableHeight = Math.max(120, visible.height - warehouseTransform.contentSize.height - this.bottomPadding - 40);
    const areaHeight = Math.min(this.junkAreaHeight, maxAvailableHeight);

    const warehouseTopY = this.node.position.y + warehouseTransform.contentSize.height * 0.5;
    const areaY = warehouseTopY + this.junkAreaGap + areaHeight * 0.5;
    this._junkAreaNode.setPosition(0, areaY, 0);

    const areaTransform = this._junkAreaNode.getComponent(UITransform)!;
    areaTransform.setContentSize(areaWidth, areaHeight);

    const junkGraphics = this._junkAreaNode.getComponent(Graphics)!;
    junkGraphics.clear();
    junkGraphics.fillColor = this.junkAreaBackgroundColor;
    junkGraphics.strokeColor = this.junkAreaBorderColor;
    junkGraphics.lineWidth = 2;
    const areaX = -areaWidth * 0.5;
    const areaBottomY = -areaHeight * 0.5;
    junkGraphics.roundRect(areaX, areaBottomY, areaWidth, areaHeight, 12);
    junkGraphics.fill();
    junkGraphics.stroke();

    if (this._junkItemsNode) {
      const itemsTransform = this._junkItemsNode.getComponent(UITransform);
      if (itemsTransform) {
        itemsTransform.setContentSize(areaWidth, areaHeight);
      }
      this._junkItemsNode.setPosition(0, 0, 0);
    }

    this.layoutJunkBoundaries(areaWidth, areaHeight);
  }

  private createJunkBoundary(name: string): Node {
    const node = new Node(name);
    const ui = node.addComponent(UITransform);
    ui.setAnchorPoint(0.5, 0.5);
    const rb = node.addComponent(RigidBody2D);
    rb.type = ERigidBody2DType.Static;
    const collider = node.addComponent(BoxCollider2D);
    collider.density = 1;
    collider.friction = 0.8;
    collider.restitution = 0.05;
    return node;
  }

  private layoutJunkBoundaries(areaWidth: number, areaHeight: number): void {
    if (this._junkBoundaryNodes.length < 3) {
      return;
    }

    const thickness = this.junkBoundaryThickness;
    const left = this._junkBoundaryNodes[0];
    const right = this._junkBoundaryNodes[1];
    const bottom = this._junkBoundaryNodes[2];

    this.setBoundaryRect(left, thickness, areaHeight, -areaWidth * 0.5 - thickness * 0.5, 0);
    this.setBoundaryRect(right, thickness, areaHeight, areaWidth * 0.5 + thickness * 0.5, 0);
    this.setBoundaryRect(bottom, areaWidth + thickness * 2, thickness, 0, -areaHeight * 0.5 - thickness * 0.5);
  }

  private setBoundaryRect(node: Node, width: number, height: number, x: number, y: number): void {
    const ui = node.getComponent(UITransform);
    const collider = node.getComponent(BoxCollider2D);
    if (!ui || !collider) {
      return;
    }
    ui.setContentSize(width, height);
    node.setPosition(x, y, 0);
    collider.size = new Size(width, height);
    collider.offset = new Vec2(0, 0);
  }

  private ensurePhysicsEnabled(): void {
    if (!PhysicsSystem2D.instance.enable) {
      PhysicsSystem2D.instance.enable = true;
      PhysicsSystem2D.instance.gravity = new Vec2(0, -1400);
    }
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
    this._backgroundNode = null;
    this._previewNode = null;
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
          this.onDragPlaceSuccess();
        } else {
          console.warn(`[Warehouse] 放置失败`);
          this.restoreDragSource();
        }
      } else {
        console.log(`[Warehouse] 不能放置（重叠或越界）`);
        this.restoreDragSource();
      }
    } else {
      console.log(`[Warehouse] 位置不在有效范围内`);
      const uiPos = event.getUILocation();
      const piled = this.tryDropItemToJunkArea(item, uiPos.x, uiPos.y);
      if (piled) {
        this.onDragPlaceSuccess();
      } else {
        this.restoreDragSource();
      }
    }

    this.hidePreview();
    // 结束拖拽
    this._dragManager.endDrag();
  }

  private onTouchCancel(event: EventTouch): void {
    if (!this._dragManager || !this._dragManager.isDragging()) {
      return;
    }
    this.restoreDragSource();
    this.hidePreview();
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
    const itemTotalWidth = item.width * this.cellSize + (item.width - 1) * this.itemSpacing;
    const itemTotalHeight = item.height * this.cellSize + (item.height - 1) * this.itemSpacing;
    uiTransform.setContentSize(itemTotalWidth, itemTotalHeight);
    
    // 使用左上角锚点
    uiTransform.setAnchorPoint(0, 1);
    placedNode.setPosition(itemTopLeft.x, itemTopLeft.y, 0);

    // 先添加到父节点，确保组件能正确初始化
    this.node.addChild(placedNode);

    // 然后添加组件并设置物品
    const placedItem = placedNode.addComponent(PlacedItem);
    placedItem.cellSize = this.cellSize;
    placedItem.spacing = this.itemSpacing;
    placedItem.setPlacedItem(item, row, col);

    // 调试信息
    console.log(`[Warehouse] 放置物品: ${item.name}, 位置: (${row}, ${col}), 颜色: R=${item.color.r}, G=${item.color.g}, B=${item.color.b}`);

    if (addToPlacedList) {
      this._placedItems.push({ item, row, col, node: placedNode });
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
    const itemTotalWidth = item.width * this.cellSize + (item.width - 1) * this.itemSpacing;
    const itemTotalHeight = item.height * this.cellSize + (item.height - 1) * this.itemSpacing;
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

    const itemStep = this.getItemStep();
    for (const [itemRow, itemCol] of occupiedPositions) {
      const x = startX + itemCol * itemStep;
      const y = startY - itemRow * itemStep - this.cellSize;
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

    if (this._junkItemsNode) {
      for (const node of [...this._junkItemsNode.children]) {
        node.destroy();
      }
    }
    this._junkItemMap.clear();
  }

  public startDragFromPlacedItem(placedNode: Node, touch: EventTouch): boolean {
    if (!this._dragManager || this._dragManager.isDragging()) {
      return false;
    }

    const uiPos = touch.getUILocation();
    const targetData = this.findTopPlacedItemAtTouch(uiPos.x, uiPos.y, placedNode);
    if (!targetData) {
      return false;
    }

    const index = this._placedItems.findIndex(data => data === targetData);
    if (index < 0) {
      return false;
    }

    const data = this._placedItems[index];
    this._placedItems.splice(index, 1);
    this._draggingPlacedData = data;
    data.node.active = false;

    this._dragManager.startDrag(data.item, null, touch, this.cellSize, this.itemSpacing);
    return true;
  }

  private restoreDraggedPlacedItem(): void {
    if (!this._draggingPlacedData) {
      return;
    }

    this._draggingPlacedData.node.active = true;
    this._placedItems.push(this._draggingPlacedData);
    this._draggingPlacedData = null;
  }

  private restoreDraggedJunkItem(): void {
    if (!this._draggingJunkNode || !this._draggingJunkItem) {
      return;
    }
    this._draggingJunkNode.active = true;
    this._draggingJunkNode.setPosition(
      this._draggingJunkLocalPos.x,
      this._draggingJunkLocalPos.y,
      this._draggingJunkLocalPos.z
    );
    this._junkItemMap.set(this._draggingJunkNode, this._draggingJunkItem);
    this._draggingJunkNode = null;
    this._draggingJunkItem = null;
    this._draggingJunkLocalPos.set(0, 0, 0);
  }

  private restoreDragSource(): void {
    this.restoreDraggedPlacedItem();
    this.restoreDraggedJunkItem();
  }

  private onDragPlaceSuccess(): void {
    if (this._draggingPlacedData) {
      if (this._draggingPlacedData.node && this._draggingPlacedData.node.isValid) {
        this._draggingPlacedData.node.destroy();
      }
      this._draggingPlacedData = null;
      this._draggingJunkNode = null;
      this._draggingJunkItem = null;
      this._draggingJunkLocalPos.set(0, 0, 0);
      return;
    }

    if (this._draggingJunkNode) {
      this._junkItemMap.delete(this._draggingJunkNode);
      if (this._draggingJunkNode.isValid) {
        this._draggingJunkNode.destroy();
      }
      this._draggingJunkNode = null;
      this._draggingJunkItem = null;
      this._draggingJunkLocalPos.set(0, 0, 0);
      return;
    }

    // 从源槽位移除物品
    const sourceSlot = (this._dragManager as any)._sourceSlot;
    if (sourceSlot) {
      const itemSlot = sourceSlot.getComponent(ItemSlot);
      if (itemSlot) {
        itemSlot.removeItem();
      }
    }
  }

  /**
   * 找到点击点命中的最上层已放置物品（按真实占用格命中，不按矩形包围盒）
   */
  private findTopPlacedItemAtTouch(uiX: number, uiY: number, preferredNode?: Node): PlacedItemData | null {
    const candidates = this._placedItems.filter(data => this.isTouchOnPlacedItemOccupiedCell(data, uiX, uiY));
    if (candidates.length === 0) {
      return null;
    }

    // 如果首选节点本身命中占用格，优先使用它
    if (preferredNode) {
      const preferred = candidates.find(data => data.node === preferredNode);
      if (preferred) {
        return preferred;
      }
    }

    // 否则按同层级中的显示顺序选择最上层节点
    let top = candidates[0];
    for (let i = 1; i < candidates.length; i++) {
      if (candidates[i].node.getSiblingIndex() > top.node.getSiblingIndex()) {
        top = candidates[i];
      }
    }
    return top;
  }

  /**
   * 判断点击是否命中该物品的真实占用格
   */
  private isTouchOnPlacedItemOccupiedCell(data: PlacedItemData, uiX: number, uiY: number): boolean {
    const node = data.node;
    if (!node || !node.isValid || !node.activeInHierarchy) {
      return false;
    }

    const uiTransform = node.getComponent(UITransform);
    if (!uiTransform) {
      return false;
    }

    const localPos = new Vec3();
    uiTransform.convertToNodeSpaceAR(new Vec3(uiX, uiY, 0), localPos);

    // PlacedItem 使用左上角锚点 (0,1)，局部坐标 x 向右为正，y 向下为负
    const step = this.cellSize + this.itemSpacing;
    if (step <= 0) {
      return false;
    }

    const col = Math.floor(localPos.x / step);
    const row = Math.floor((-localPos.y) / step);
    if (row < 0 || col < 0 || row >= data.item.height || col >= data.item.width) {
      return false;
    }

    return data.item.isOccupied(row, col);
  }

  private onJunkItemTouchStart(event: EventTouch): void {
    if (!this._junkItemsNode || !this._dragManager || this._dragManager.isDragging()) {
      return;
    }
    const junkNode = event.currentTarget as Node;
    const item = this._junkItemMap.get(junkNode);
    if (!item) {
      return;
    }

    const started = this.startDragFromJunkItem(junkNode, item, event);
    if (started) {
      event.propagationStopped = true;
    }
  }

  private startDragFromJunkItem(junkNode: Node, item: BaseItem, touch: EventTouch): boolean {
    if (!this._dragManager || this._dragManager.isDragging()) {
      return false;
    }
    if (!junkNode.isValid) {
      return false;
    }

    this._draggingJunkNode = junkNode;
    this._draggingJunkItem = item;
    this._draggingJunkLocalPos.set(junkNode.position.x, junkNode.position.y, junkNode.position.z);
    this._junkItemMap.delete(junkNode);
    junkNode.active = false;
    this._dragManager.startDrag(item, null, touch, this.cellSize, this.itemSpacing);
    return true;
  }

  private tryDropItemToJunkArea(item: BaseItem, uiX: number, uiY: number): boolean {
    if (!this._junkAreaNode || !this._junkAreaNode.isValid || !this._junkItemsNode) {
      return false;
    }

    const areaTransform = this._junkAreaNode.getComponent(UITransform);
    if (!areaTransform) {
      return false;
    }

    const localInArea = new Vec3();
    areaTransform.convertToNodeSpaceAR(new Vec3(uiX, uiY, 0), localInArea);
    const halfW = areaTransform.contentSize.width * 0.5;
    const halfH = areaTransform.contentSize.height * 0.5;
    if (localInArea.x < -halfW || localInArea.x > halfW || localInArea.y < -halfH || localInArea.y > halfH) {
      return false;
    }

    const junkNode = new Node(`JunkItem_${Date.now()}`);
    const uiTransform = junkNode.addComponent(UITransform);
    const itemW = item.width * this.cellSize + (item.width - 1) * this.itemSpacing;
    const itemH = item.height * this.cellSize + (item.height - 1) * this.itemSpacing;
    uiTransform.setContentSize(itemW, itemH);
    uiTransform.setAnchorPoint(0.5, 0.5);

    const display = junkNode.addComponent(ItemDisplay);
    display.cellSize = this.cellSize;
    display.spacing = this.itemSpacing;
    display.setItem(item);

    const body = junkNode.addComponent(RigidBody2D);
    body.type = ERigidBody2DType.Dynamic;
    body.gravityScale = 1;
    body.angularDamping = 3;
    body.linearDamping = 0.4;

    // 为镂空形状按占用格逐块添加碰撞体，避免空洞区域出现碰撞
    const step = this.cellSize + this.itemSpacing;
    const startX = -itemW * 0.5 + this.cellSize * 0.5;
    const startY = itemH * 0.5 - this.cellSize * 0.5;
    for (const [itemRow, itemCol] of item.getOccupiedPositions()) {
      const collider = junkNode.addComponent(BoxCollider2D);
      collider.size = new Size(this.cellSize, this.cellSize);
      collider.offset = new Vec2(
        startX + itemCol * step,
        startY - itemRow * step
      );
      collider.density = 1;
      collider.friction = 0.9;
      collider.restitution = 0.05;
    }

    junkNode.setPosition(localInArea.x, localInArea.y, 0);
    junkNode.angle = Math.random() * 14 - 7;
    junkNode.on(Node.EventType.TOUCH_START, this.onJunkItemTouchStart, this);
    this._junkItemsNode.addChild(junkNode);
    this._junkItemMap.set(junkNode, item.clone());
    return true;
  }
}
