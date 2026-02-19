import { _decorator, Component, Node, UITransform, Graphics, Color, Label, Vec2, Vec3, Size, view, EventTouch, input, Input, RigidBody2D, BoxCollider2D, ERigidBody2DType, PhysicsSystem2D } from 'cc';
import { BaseItem, ItemType } from '../item/BaseItem';
import { PlacedItem, PlacedItemData } from './PlacedItem';
import { DragManager } from './DragManager';
import { ItemSlot } from './ItemSlot';
import { ItemDisplay } from './ItemDisplay';
const { ccclass, property } = _decorator;

export interface StarLinkItemBonus {
  itemId: string;
  row: number;
  col: number;
  starCount: number;
  linkedNeighbors: number;
  chainSize: number;
}

export interface StarLinkResult {
  totalStars: number;
  activeStarLinks: number;
  uniqueLinkedPairs: number;
  chainCount: number;
  maxChainSize: number;
  itemBonuses: StarLinkItemBonus[];
}

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

  @property({ tooltip: '物品介绍框宽度（像素）' })
  public itemInfoWidth: number = 680;

  @property({ tooltip: '物品介绍框最小高度（像素）' })
  public itemInfoMinHeight: number = 360;

  @property({ tooltip: '介绍框与物品右侧间距（像素）' })
  public itemInfoOffsetX: number = 40;

  @property({ tooltip: '拖拽悬停判定距离（像素）' })
  public dragHoverThreshold: number = 16;

  @property({ tooltip: '拖拽悬停后显示介绍框延时（秒）' })
  public dragHoverDelaySeconds: number = 0.25;

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
  private _selectedPlacedNode: Node | null = null;
  private _itemInfoNode: Node | null = null;
  private _itemInfoLabel: Label | null = null;
  private _dragHoverElapsedSeconds: number = 0;
  private _hasDragHoverSample: boolean = false;
  private _dragHoverSamplePos: Vec3 = new Vec3();
  private _starLinkListeners: Array<(result: StarLinkResult) => void> = [];
  private _lastStarLinkResult: StarLinkResult = {
    totalStars: 0,
    activeStarLinks: 0,
    uniqueLinkedPairs: 0,
    chainCount: 0,
    maxChainSize: 0,
    itemBonuses: [],
  };

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
    this.setupItemInfoPanel();
  }

  protected update(dt: number): void {
    this.syncDragPreviewStarState();
    this.updateDragHoverInfo(dt);
    if (!this._dragManager || !this._dragManager.isDragging()) {
      this.updateItemInfoForSelection();
    }
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
    this.hideItemInfoPanel();
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
    this.updateItemInfoForSelection();
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
      this.placeItem(data.item, data.row, data.col, true);
    }
    this.recomputeStarLinksAndBroadcast();
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
      this._dragManager?.setDragPreviewActiveStarKeys(new Set<string>());
      this.updateItemInfoForSelection();
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
      const activeStarKeys = this.computeActiveStarKeysForCandidate(item, row, col);
      this._dragManager.setDragPreviewActiveStarKeys(activeStarKeys);
      this.showPreview(item, row, col, canPlace);
    } else {
      this._dragManager.setDragPreviewActiveStarKeys(new Set<string>());
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
      const uiPos = event.getUILocation();
      if (!this.findTopPlacedItemAtTouch(uiPos.x, uiPos.y)) {
        this.selectPlacedItem(null);
      }
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
    this.hideItemInfoPanel();
    this.resetDragHoverState();
    // 结束拖拽
    this._dragManager.endDrag();
  }

  private onTouchCancel(event: EventTouch): void {
    if (!this._dragManager || !this._dragManager.isDragging()) {
      return;
    }
    this.restoreDragSource();
    this.hidePreview();
    this.hideItemInfoPanel();
    this.resetDragHoverState();
    this._dragManager.endDrag();
  }

  /**
   * 检查是否可以放置物品
   */
  public canPlaceItem(item: BaseItem, row: number, col: number): boolean {
    // 仅占用格(1)参与边界与重叠检测；星星格(2)不占仓库格子
    const occupiedPositions = item.getOccupiedPositions();
    for (const [itemRow, itemCol] of occupiedPositions) {
      const gridRow = row + itemRow;
      const gridCol = col + itemCol;

      if (gridRow < 0 || gridRow >= this.rows || gridCol < 0 || gridCol >= this.columns) {
        return false;
      }

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
    placedItem.setShowStars(false);
    placedItem.setPlacedItem(item, row, col);

    // 调试信息
    console.log(`[Warehouse] 放置物品: ${item.name}, 位置: (${row}, ${col}), 颜色: R=${item.color.r}, G=${item.color.g}, B=${item.color.b}`);

    if (addToPlacedList) {
      this._placedItems.push({ item, row, col, node: placedNode });
      this.recomputeStarLinksAndBroadcast();
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
    const starPositions = item.getStarPositions();

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

    // 星星格仅显示，不参与可放置碰撞
    if (starPositions.length > 0) {
      const activeStarKeys = this.computeActiveStarKeysForCandidate(item, row, col);
      const starActiveFillColor = new Color(255, 220, 90, 220);
      const starInactiveFillColor = new Color(130, 130, 130, 220);
      const starStrokeColor = new Color(255, 220, 90, 230);
      const starRadius = this.cellSize * 0.28;
      for (const [itemRow, itemCol] of starPositions) {
        const x = startX + itemCol * itemStep;
        const y = startY - itemRow * itemStep - this.cellSize;
        const starKey = this.getStarKey(itemRow, itemCol);
        graphics.fillColor = activeStarKeys.has(starKey) ? starActiveFillColor : starInactiveFillColor;
        graphics.circle(x + this.cellSize * 0.5, y + this.cellSize * 0.5, starRadius);
        graphics.fill();
        graphics.strokeColor = starStrokeColor;
        graphics.lineWidth = 2;
        graphics.circle(x + this.cellSize * 0.5, y + this.cellSize * 0.5, starRadius);
        graphics.stroke();
      }
    }

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
    this._selectedPlacedNode = null;
    this.hideItemInfoPanel();
    this.recomputeStarLinksAndBroadcast();
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
    this.recomputeStarLinksAndBroadcast();
    this._draggingPlacedData = data;
    this.selectPlacedItem(null);
    this.hideItemInfoPanel();
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
    this.selectPlacedItem(this._draggingPlacedData.node);
    this.recomputeStarLinksAndBroadcast();
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

    return data.item.isInteractiveCell(row, col);
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
      this.selectPlacedItem(null);
      this.hideItemInfoPanel();
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

  public addStarLinkListener(listener: (result: StarLinkResult) => void): void {
    if (this._starLinkListeners.indexOf(listener) < 0) {
      this._starLinkListeners.push(listener);
    }
  }

  public selectPlacedItem(node: Node | null): void {
    this._selectedPlacedNode = node && node.isValid ? node : null;
    for (const data of this._placedItems) {
      const placedComp = data.node.getComponent(PlacedItem);
      if (!placedComp) {
        continue;
      }
      const selected = data.node === this._selectedPlacedNode;
      placedComp.setShowStars(selected);
      placedComp.setActiveStarKeys(selected ? this.computeActiveStarKeysForPlacedItem(data) : new Set<string>());
    }
    // 选中项置于最上层，避免星星被其他物品遮挡
    if (this._selectedPlacedNode && this._selectedPlacedNode.parent === this.node) {
      this._selectedPlacedNode.setSiblingIndex(this.node.children.length - 1);
    }
    this.updateItemInfoForSelection();
  }

  public removeStarLinkListener(listener: (result: StarLinkResult) => void): void {
    this._starLinkListeners = this._starLinkListeners.filter(cb => cb !== listener);
  }

  public getStarLinkSnapshot(): StarLinkResult {
    return {
      ...this._lastStarLinkResult,
      itemBonuses: this._lastStarLinkResult.itemBonuses.map(b => ({ ...b })),
    };
  }

  private recomputeStarLinksAndBroadcast(): void {
    const result = this.computeStarLinks();
    this._lastStarLinkResult = result;
    if (this._selectedPlacedNode) {
      this.selectPlacedItem(this._selectedPlacedNode);
    }
    for (const listener of this._starLinkListeners) {
      listener(result);
    }
  }

  private computeStarLinks(): StarLinkResult {
    const totalStars = this._placedItems.reduce((sum, data) => sum + data.item.starCount, 0);
    const neighborMap = new Map<PlacedItemData, Set<PlacedItemData>>();
    const pairKeys = new Set<string>();
    let activeStarLinks = 0;

    for (const data of this._placedItems) {
      const stars = data.item.getStarPositions();
      if (!neighborMap.has(data)) {
        neighborMap.set(data, new Set());
      }

      for (const [starRow, starCol] of stars) {
        const baseRow = data.row + starRow;
        const baseCol = data.col + starCol;
        // 星星生效条件：星星格(baseRow, baseCol)上必须有目标物体的占用格，不能仅因物体其他部分相邻就生效
        const target = this.getOccupiedCellOwner(baseRow, baseCol, data);
        if (!target || !data.item.canStarLinkTo(target.item)) {
          continue;
        }
        activeStarLinks++;
        const a = this.getPlacedItemToken(data);
        const b = this.getPlacedItemToken(target);
        const pairKey = a < b ? `${a}|${b}` : `${b}|${a}`;
        pairKeys.add(pairKey);

        neighborMap.get(data)!.add(target);
        if (!neighborMap.has(target)) {
          neighborMap.set(target, new Set());
        }
        neighborMap.get(target)!.add(data);
      }
    }

    const chainInfo = this.computeChains(neighborMap);
    const itemBonuses: StarLinkItemBonus[] = [];
    for (const data of this._placedItems) {
      const neighbors = neighborMap.get(data);
      itemBonuses.push({
        itemId: data.item.id,
        row: data.row,
        col: data.col,
        starCount: data.item.starCount,
        linkedNeighbors: neighbors ? neighbors.size : 0,
        chainSize: chainInfo.chainSizeByItem.get(data) ?? 1,
      });
    }

    return {
      totalStars,
      activeStarLinks,
      uniqueLinkedPairs: pairKeys.size,
      chainCount: chainInfo.chainCount,
      maxChainSize: chainInfo.maxChainSize,
      itemBonuses,
    };
  }

  private computeChains(neighborMap: Map<PlacedItemData, Set<PlacedItemData>>): {
    chainCount: number;
    maxChainSize: number;
    chainSizeByItem: Map<PlacedItemData, number>;
  } {
    const visited = new Set<PlacedItemData>();
    const chainSizeByItem = new Map<PlacedItemData, number>();
    let chainCount = 0;
    let maxChainSize = 0;

    for (const item of this._placedItems) {
      if (visited.has(item)) {
        continue;
      }
      const neighbors = neighborMap.get(item);
      if (!neighbors || neighbors.size === 0) {
        chainSizeByItem.set(item, 1);
        visited.add(item);
        continue;
      }

      const stack: PlacedItemData[] = [item];
      const component: PlacedItemData[] = [];
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) {
          continue;
        }
        visited.add(current);
        component.push(current);
        const currentNeighbors = neighborMap.get(current);
        if (!currentNeighbors) {
          continue;
        }
        for (const next of currentNeighbors) {
          if (!visited.has(next)) {
            stack.push(next);
          }
        }
      }

      if (component.length >= 2) {
        chainCount++;
      }
      maxChainSize = Math.max(maxChainSize, component.length);
      for (const node of component) {
        chainSizeByItem.set(node, component.length);
      }
    }

    if (maxChainSize === 0 && this._placedItems.length > 0) {
      maxChainSize = 1;
    }

    return { chainCount, maxChainSize, chainSizeByItem };
  }

  private getInteractiveCellOwner(row: number, col: number, exclude?: PlacedItemData): PlacedItemData | null {
    for (const data of this._placedItems) {
      if (exclude && data === exclude) {
        continue;
      }
      const localRow = row - data.row;
      const localCol = col - data.col;
      if (data.item.isInteractiveCell(localRow, localCol)) {
        return data;
      }
    }
    return null;
  }

  private getOccupiedCellOwner(row: number, col: number, exclude?: PlacedItemData): PlacedItemData | null {
    for (const data of this._placedItems) {
      if (exclude && data === exclude) {
        continue;
      }
      const localRow = row - data.row;
      const localCol = col - data.col;
      if (data.item.isOccupied(localRow, localCol)) {
        return data;
      }
    }
    return null;
  }

  private getPlacedItemToken(data: PlacedItemData): string {
    return `${data.item.id}@${data.row},${data.col}`;
  }

  private setupItemInfoPanel(): void {
    const parent = this.node.parent;
    if (!parent || (this._itemInfoNode && this._itemInfoNode.isValid)) {
      return;
    }

    const panelNode = new Node('ItemInfoPanel');
    const panelTransform = panelNode.addComponent(UITransform);
    panelTransform.setAnchorPoint(0, 0.5);
    panelTransform.setContentSize(this.itemInfoWidth, this.itemInfoMinHeight);
    const panelGraphics = panelNode.addComponent(Graphics);
    this.drawItemInfoBackground(panelGraphics, this.itemInfoWidth, this.itemInfoMinHeight);

    const labelNode = new Node('ItemInfoLabel');
    const labelTransform = labelNode.addComponent(UITransform);
    labelTransform.setAnchorPoint(0, 1);
    labelTransform.setContentSize(this.itemInfoWidth - 40, this.itemInfoMinHeight - 40);
    labelNode.setPosition(20, this.itemInfoMinHeight / 2 - 20, 0);
    const label = labelNode.addComponent(Label);
    label.fontSize = 48;
    label.lineHeight = 64;
    label.color = new Color(240, 240, 240, 255);
    label.string = '';
    panelNode.addChild(labelNode);
    parent.addChild(panelNode);
    panelNode.active = false;

    this._itemInfoNode = panelNode;
    this._itemInfoLabel = label;
  }

  private drawItemInfoBackground(graphics: Graphics, width: number, height: number): void {
    graphics.clear();
    graphics.fillColor = new Color(20, 24, 34, 230);
    graphics.strokeColor = new Color(112, 150, 230, 255);
    graphics.lineWidth = 2;
    const x = 0;
    const y = -height / 2;
    graphics.roundRect(x, y, width, height, 12);
    graphics.fill();
    graphics.stroke();
  }

  private updateItemInfoForSelection(): void {
    if (!this._selectedPlacedNode || !this._selectedPlacedNode.isValid) {
      this.hideItemInfoPanel();
      return;
    }
    const selectedData = this._placedItems.find(data => data.node === this._selectedPlacedNode);
    if (!selectedData) {
      this.hideItemInfoPanel();
      return;
    }

    const text = this.buildItemInfoText(selectedData.item, selectedData);
    const itemW = selectedData.item.width * this.cellSize + (selectedData.item.width - 1) * this.itemSpacing;
    const itemH = selectedData.item.height * this.cellSize + (selectedData.item.height - 1) * this.itemSpacing;
    const uiTransform = selectedData.node.getComponent(UITransform);
    if (!uiTransform) {
      this.hideItemInfoPanel();
      return;
    }
    const centerWorld = uiTransform.convertToWorldSpaceAR(new Vec3(itemW / 2, -itemH / 2, 0));
    this.showItemInfoPanel(text, centerWorld.x, centerWorld.y, itemW, itemH);
  }

  private updateItemInfoForDrag(item: BaseItem): void {
    if (!this._dragManager || !this._dragManager.isDragging()) {
      this.hideItemInfoPanel();
      return;
    }
    const worldPos = this._dragManager.getDragPreviewWorldPosition();
    if (!worldPos) {
      this.hideItemInfoPanel();
      return;
    }
    const itemW = item.width * this.cellSize + (item.width - 1) * this.itemSpacing;
    const itemH = item.height * this.cellSize + (item.height - 1) * this.itemSpacing;
    const text = this.buildItemInfoText(item);
    const centerX = worldPos.x + itemW / 2;
    const centerY = worldPos.y;
    this.showItemInfoPanel(text, centerX, centerY, itemW, itemH);
  }

  private updateDragHoverInfo(dt: number): void {
    if (!this._dragManager || !this._dragManager.isDragging()) {
      this.resetDragHoverState();
      return;
    }
    const item = this._dragManager.getDraggingItem();
    if (!item) {
      this.resetDragHoverState();
      return;
    }
    const worldPos = this._dragManager.getDragPreviewWorldPosition();
    if (!worldPos) {
      this.resetDragHoverState();
      return;
    }

    if (!this._hasDragHoverSample) {
      this._dragHoverSamplePos.set(worldPos.x, worldPos.y, worldPos.z);
      this._hasDragHoverSample = true;
      this._dragHoverElapsedSeconds = 0;
      this.hideItemInfoPanel();
      return;
    }

    const dx = worldPos.x - this._dragHoverSamplePos.x;
    const dy = worldPos.y - this._dragHoverSamplePos.y;
    this._dragHoverSamplePos.set(worldPos.x, worldPos.y, worldPos.z);

    if (dx * dx + dy * dy > this.dragHoverThreshold * this.dragHoverThreshold) {
      this._dragHoverElapsedSeconds = 0;
      this.hideItemInfoPanel();
      return;
    }

    this._dragHoverElapsedSeconds += Math.max(0, dt);
    if (this._dragHoverElapsedSeconds < this.dragHoverDelaySeconds) {
      this.hideItemInfoPanel();
      return;
    }
    this.updateItemInfoForDrag(item);
  }

  private resetDragHoverState(): void {
    this._dragHoverElapsedSeconds = 0;
    this._hasDragHoverSample = false;
    this._dragHoverSamplePos.set(0, 0, 0);
  }

  private syncDragPreviewStarState(): void {
    if (!this._dragManager || !this._dragManager.isDragging()) {
      return;
    }
    const item = this._dragManager.getDraggingItem();
    const pointer = this._dragManager.getCurrentPointerUiPosition();
    if (!item || !pointer) {
      this._dragManager.setDragPreviewActiveStarKeys(new Set<string>());
      return;
    }
    const localPos = this.uiToLocalPos(pointer.x, pointer.y);
    if (!localPos) {
      this._dragManager.setDragPreviewActiveStarKeys(new Set<string>());
      return;
    }
    const gridPos = this.localToGrid(localPos, item);
    if (!gridPos) {
      this._dragManager.setDragPreviewActiveStarKeys(new Set<string>());
      return;
    }
    this._dragManager.setDragPreviewActiveStarKeys(
      this.computeActiveStarKeysForCandidate(item, gridPos.row, gridPos.col)
    );
  }

  /**
   * 显示物品介绍框。优先放在物品上下左右中不遮挡物品且能完整显示的一侧。
   * @param itemWidthPx 物品宽度（像素），为 0 时按参考点做左右切换
   * @param itemHeightPx 物品高度（像素），为 0 时按参考点做左右切换
   */
  private showItemInfoPanel(
    text: string,
    worldX: number,
    worldY: number,
    itemWidthPx: number = 0,
    itemHeightPx: number = 0
  ): void {
    this.setupItemInfoPanel();
    if (!this._itemInfoNode || !this._itemInfoLabel) {
      return;
    }

    this._itemInfoLabel.string = text;
    const lineCount = Math.max(1, text.split('\n').length);
    const height = Math.max(this.itemInfoMinHeight, lineCount * 64 + 80);
    const panelTransform = this._itemInfoNode.getComponent(UITransform);
    if (!panelTransform) {
      return;
    }
    panelTransform.setContentSize(this.itemInfoWidth, height);
    const graphics = this._itemInfoNode.getComponent(Graphics);
    if (graphics) {
      this.drawItemInfoBackground(graphics, this.itemInfoWidth, height);
    }

    const labelNode = this._itemInfoLabel.node;
    const labelTransform = labelNode.getComponent(UITransform);
    if (labelTransform) {
      labelTransform.setContentSize(this.itemInfoWidth - 40, height - 40);
    }
    labelNode.setPosition(20, height / 2 - 20, 0);

    const parentTransform = this._itemInfoNode.parent?.getComponent(UITransform);
    if (!parentTransform) {
      return;
    }
    const local = new Vec3();
    parentTransform.convertToNodeSpaceAR(new Vec3(worldX, worldY, 0), local);
    const visible = view.getVisibleSize();
    const halfW = visible.width / 2;
    const halfH = visible.height / 2;
    const margin = this.itemInfoOffsetX;
    const W = this.itemInfoWidth;
    const H = height;
    // 面板以锚点为中心时，在父节点中的可放置范围（使面板不超出屏幕）
    const minPanelX = -halfW + 6 + W / 2;
    const maxPanelX = halfW - 6 - W / 2;
    const minPanelY = -halfH + 6 + H / 2;
    const maxPanelY = halfH - 6 - H / 2;

    let panelX: number;
    let panelY: number;

    if (itemWidthPx > 0 && itemHeightPx > 0) {
      const itemLeft = local.x - itemWidthPx / 2;
      const itemRight = local.x + itemWidthPx / 2;
      const itemBottom = local.y - itemHeightPx / 2;
      const itemTop = local.y + itemHeightPx / 2;
      const candidates: Array<{ x: number; y: number }> = [
        { x: itemRight + margin + W / 2, y: local.y },
        { x: itemLeft - margin - W / 2, y: local.y },
        { x: local.x, y: itemTop + margin + H / 2 },
        { x: local.x, y: itemBottom - margin - H / 2 },
      ];
      const inView = (x: number, y: number) =>
        x >= minPanelX && x <= maxPanelX && y >= minPanelY && y <= maxPanelY;
      const chosen = candidates.find(p => inView(p.x, p.y));
      if (chosen) {
        panelX = chosen.x;
        panelY = chosen.y;
      } else {
        panelX = Math.max(minPanelX, Math.min(maxPanelX, local.x + margin + W / 2));
        panelY = Math.max(minPanelY, Math.min(maxPanelY, local.y));
      }
    } else {
      const anchorSide = worldX >= 0 ? 'right' : 'left';
      panelX = local.x + (anchorSide === 'right' ? margin + W / 2 : -(margin + W / 2));
      if (panelX > maxPanelX) {
        panelX = local.x - margin - W / 2;
      } else if (panelX < minPanelX) {
        panelX = local.x + margin + W / 2;
      }
      panelX = Math.max(minPanelX, Math.min(maxPanelX, panelX));
      panelY = Math.max(minPanelY, Math.min(maxPanelY, local.y));
    }

    this._itemInfoNode.setPosition(panelX, panelY, 0);
    this._itemInfoNode.active = true;
  }

  private hideItemInfoPanel(): void {
    if (this._itemInfoNode) {
      this._itemInfoNode.active = false;
    }
  }

  private buildItemInfoText(item: BaseItem, placedData?: PlacedItemData): string {
    const lines: string[] = [];
    lines.push(`${item.name}`);
    lines.push(`ID: ${item.id}`);
    lines.push(`类型: ${this.formatItemType(item.type)}`);
    lines.push(`占用格: ${item.cellCount}  星星: ${item.starCount}`);
    if (item.feature) {
      lines.push(`功能: ${item.feature}`);
    }
    if (item.description) {
      lines.push(item.description);
    }
    if (placedData) {
      const bonus = this._lastStarLinkResult.itemBonuses.find(
        b => b.itemId === placedData.item.id && b.row === placedData.row && b.col === placedData.col
      );
      if (bonus) {
        lines.push(`联动邻居: ${bonus.linkedNeighbors}  连锁规模: ${bonus.chainSize}`);
      }
    }
    return lines.join('\n');
  }

  private formatItemType(type: ItemType): string {
    switch (type) {
      case ItemType.PROP:
        return '道具';
      case ItemType.SUMMON:
        return '召唤物';
      case ItemType.FOOD:
        return '食物';
      default:
        return String(type);
    }
  }

  private computeActiveStarKeysForPlacedItem(data: PlacedItemData): Set<string> {
    const active = new Set<string>();
    for (const [starRow, starCol] of data.item.getStarPositions()) {
      const worldRow = data.row + starRow;
      const worldCol = data.col + starCol;
      // 仅当星星格(worldRow, worldCol)上有目标物体的占用格时，该星星才生效
      const target = this.getOccupiedCellOwner(worldRow, worldCol, data);
      // 必须用当前物品(data)的联动规则判断：仅当「当前物品」能对「该格上的目标」联动时，当前物品的这颗星才生效
      if (!target || target === data) {
        continue;
      }
      if (!data.item.canStarLinkTo(target.item)) {
        continue;
      }
      active.add(this.getStarKey(starRow, starCol));
    }
    return active;
  }

  private computeActiveStarKeysForCandidate(item: BaseItem, row: number, col: number): Set<string> {
    const active = new Set<string>();
    for (const [starRow, starCol] of item.getStarPositions()) {
      const worldRow = row + starRow;
      const worldCol = col + starCol;
      // 仅当星星格(worldRow, worldCol)上有目标物体的占用格时，该星星才生效（候选未放入，无需 exclude）
      const target = this.getOccupiedCellOwner(worldRow, worldCol);
      if (target && item.canStarLinkTo(target.item)) {
        active.add(this.getStarKey(starRow, starCol));
      }
    }
    return active;
  }

  private getStarKey(row: number, col: number): string {
    return `${row},${col}`;
  }
}
