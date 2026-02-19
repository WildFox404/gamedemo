import { _decorator, Component, Node, EventTouch, EventKeyboard, KeyCode, Vec3, UITransform, Color, input, Input } from 'cc';
import { BaseItem } from '../item/BaseItem';
import { ItemDisplay } from './ItemDisplay';
const { ccclass } = _decorator;

/**
 * 拖拽管理器
 * 管理物品的拖拽状态和拖拽预览
 */
@ccclass('DragManager')
export class DragManager extends Component {
  private static _instance: DragManager | null = null;
  private _draggingItem: BaseItem | null = null;
  private _dragPreviewNode: Node | null = null;
  private _anchorCenterOffset: Vec3 = new Vec3();
  private _lastPointerUiPos: Vec3 = new Vec3();
  private _dragStartUiPos: Vec3 = new Vec3();
  private _dragCellSize: number = 80;
  private _dragSpacing: number = 5;
  private _isDragging: boolean = false;
  private _sourceSlot: Node | null = null;
  private _dragDisplay: ItemDisplay | null = null;

  public static getInstance(): DragManager {
    return DragManager._instance!;
  }

  protected onLoad(): void {
    if (DragManager._instance && DragManager._instance !== this) {
      this.node.destroy();
      return;
    }
    DragManager._instance = this;
  }

  /**
   * 开始拖拽
   */
  public startDrag(item: BaseItem, sourceSlot: Node | null, touch: EventTouch, cellSize: number = 80, spacing: number = 5): void {
    console.log(`[DragManager] startDrag 被调用，物品: ${item?.name || 'null'}`);
    
    if (!item) {
      console.log(`[DragManager] 物品为空，取消拖拽`);
      return;
    }

    // 拖拽期间使用副本，避免取消拖拽时影响原物品数据
    this._draggingItem = item.clone();
    this._sourceSlot = sourceSlot;
    this._isDragging = true;
    this._dragCellSize = cellSize;
    this._dragSpacing = spacing;
    console.log(`[DragManager] 拖拽状态已设置，isDragging: ${this._isDragging}`);

    // 创建拖拽预览节点（使用仓库的方块大小）
    this.createDragPreview(this._draggingItem, cellSize, spacing);
    console.log(`[DragManager] 拖拽预览已创建，cellSize: ${cellSize}, spacing: ${spacing}`);
    this.recalculateAnchorCenterOffset(this._draggingItem, cellSize, spacing);

    const worldPos = touch.getUILocation();
    this._dragStartUiPos.set(worldPos.x, worldPos.y, 0);
    this.updateDragPreviewPosition(worldPos.x, worldPos.y);

    // 监听全局触摸移动、结束和旋转快捷键
    input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    console.log(`[DragManager] 已注册全局触摸事件`);
  }

  /**
   * 创建拖拽预览（使用仓库的方块大小）
   */
  private createDragPreview(item: BaseItem, cellSize: number, spacing: number): void {
    if (this._dragPreviewNode) {
      this._dragPreviewNode.destroy();
    }

    this._dragPreviewNode = new Node('DragPreview');
    const uiTransform = this._dragPreviewNode.addComponent(UITransform);
    
    // 计算预览大小
    const totalWidth = item.width * cellSize + (item.width - 1) * spacing;
    const totalHeight = item.height * cellSize + (item.height - 1) * spacing;
    uiTransform.setContentSize(totalWidth, totalHeight);
    
    // 统一使用中心锚点，便于计算锚点方块中心偏移
    uiTransform.setAnchorPoint(0.5, 0.5);

    const display = this._dragPreviewNode.addComponent(ItemDisplay);
    this._dragDisplay = display;
    display.cellSize = cellSize;
    display.spacing = spacing;
    display.showStars = true;
    display.setItem(item);

    // 设置半透明效果
    this._dragPreviewNode.setScale(0.95, 0.95, 1);

    this.node.addChild(this._dragPreviewNode);
  }

  /**
   * 触摸移动事件
   */
  private onTouchMove(event: EventTouch): void {
    if (!this._isDragging || !this._dragPreviewNode) return;

    const worldPos = event.getUILocation();
    this.updateDragPreviewPosition(worldPos.x, worldPos.y);
  }

  private updateDragPreviewPosition(uiX: number, uiY: number): void {
    if (!this._dragPreviewNode) {
      return;
    }

    this._lastPointerUiPos.set(uiX, uiY, 0);

    const localPos = new Vec3();
    const rootTransform = this.node.getComponent(UITransform);
    if (!rootTransform) {
      return;
    }
    rootTransform.convertToNodeSpaceAR(new Vec3(uiX, uiY, 0), localPos);

    this._dragPreviewNode.setPosition(
      localPos.x - this._anchorCenterOffset.x,
      localPos.y - this._anchorCenterOffset.y,
      0
    );
  }

  private onKeyDown(event: EventKeyboard): void {
    if (!this._isDragging || !this._draggingItem) {
      return;
    }
    if (event.keyCode !== KeyCode.KEY_R) {
      return;
    }

    this.rotateDraggingItemClockwise();
  }

  private rotateDraggingItemClockwise(): void {
    if (!this._draggingItem) {
      return;
    }

    const rotatedItem = this.createClockwiseRotatedItem(this._draggingItem);
    this._draggingItem = rotatedItem;
    this.createDragPreview(rotatedItem, this._dragCellSize, this._dragSpacing);
    this.recalculateAnchorCenterOffset(rotatedItem, this._dragCellSize, this._dragSpacing);
    this.updateDragPreviewPosition(this._lastPointerUiPos.x, this._lastPointerUiPos.y);
  }

  private createClockwiseRotatedItem(item: BaseItem): BaseItem {
    const rotatedShape = item.rotateClockwise();
    const rotatedAnchorRow = item.anchorCol;
    const rotatedAnchorCol = item.height - 1 - item.anchorRow;

    return new BaseItem(
      item.id,
      item.name,
      rotatedShape,
      new Color(item.color.r, item.color.g, item.color.b, item.color.a),
      item.description,
      item.type,
      item.feature,
      item.starRequiredNeighborType,
      rotatedAnchorRow,
      rotatedAnchorCol
    );
  }

  private recalculateAnchorCenterOffset(item: BaseItem, cellSize: number, spacing: number): void {
    // 视觉优化：拖拽时光标位于物品中心，不再贴在锚点方块中心
    this._anchorCenterOffset.set(0, 0, 0);
  }

  /**
   * 触摸结束事件
   */
  private onTouchEnd(event: EventTouch): void {
    // 不在这里结束拖拽，让 Warehouse 先处理放置
    // Warehouse 处理完后再调用 endDrag()
  }

  /**
   * 触摸取消事件
   */
  private onTouchCancel(event: EventTouch): void {
    this.endDrag();
  }

  /**
   * 结束拖拽
   */
  public endDrag(): void {
    console.log(`[DragManager] endDrag 被调用`);
    
    // 移除全局事件监听
    input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.off(Input.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);

    if (this._dragPreviewNode) {
      this._dragPreviewNode.destroy();
      this._dragPreviewNode = null;
    }
    this._dragDisplay = null;

    this._draggingItem = null;
    this._sourceSlot = null;
    this._isDragging = false;
    this._lastPointerUiPos.set(0, 0, 0);
    this._dragStartUiPos.set(0, 0, 0);
    console.log(`[DragManager] 拖拽已结束`);
  }

  /**
   * 获取当前拖拽的物品
   */
  public getDraggingItem(): BaseItem | null {
    return this._draggingItem;
  }

  /**
   * 是否正在拖拽
   */
  public isDragging(): boolean {
    return this._isDragging;
  }

  /**
   * 获取拖拽预览节点位置（世界坐标）
   */
  public getDragPreviewWorldPosition(): Vec3 | null {
    if (!this._dragPreviewNode) return null;
    
    const worldPos = new Vec3();
    this._dragPreviewNode.getWorldPosition(worldPos);
    return worldPos;
  }

  public isDragHovering(thresholdPx: number): boolean {
    if (!this._isDragging) {
      return false;
    }
    const dx = this._lastPointerUiPos.x - this._dragStartUiPos.x;
    const dy = this._lastPointerUiPos.y - this._dragStartUiPos.y;
    return dx * dx + dy * dy <= thresholdPx * thresholdPx;
  }

  public setDragPreviewActiveStarKeys(keys: Set<string>): void {
    if (!this._dragDisplay) {
      return;
    }
    this._dragDisplay.setActiveStarKeys(keys);
  }

  public getCurrentPointerUiPosition(): Vec3 | null {
    if (!this._isDragging) {
      return null;
    }
    return new Vec3(this._lastPointerUiPos.x, this._lastPointerUiPos.y, 0);
  }
}
