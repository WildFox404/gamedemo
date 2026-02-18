import { _decorator, Component, Node, EventTouch, Vec3, UITransform, Camera, view, input, Input } from 'cc';
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
  private _dragOffset: Vec3 = new Vec3();
  private _isDragging: boolean = false;
  private _sourceSlot: Node | null = null;

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
  public startDrag(item: BaseItem, sourceSlot: Node, touch: EventTouch, cellSize: number = 80, spacing: number = 5): void {
    console.log(`[DragManager] startDrag 被调用，物品: ${item?.name || 'null'}`);
    
    if (!item) {
      console.log(`[DragManager] 物品为空，取消拖拽`);
      return;
    }

    this._draggingItem = item;
    this._sourceSlot = sourceSlot;
    this._isDragging = true;
    console.log(`[DragManager] 拖拽状态已设置，isDragging: ${this._isDragging}`);

    // 创建拖拽预览节点（使用仓库的方块大小）
    this.createDragPreview(item, cellSize, spacing);
    console.log(`[DragManager] 拖拽预览已创建，cellSize: ${cellSize}, spacing: ${spacing}`);

    // 计算拖拽偏移（考虑锚点）
    const worldPos = touch.getUILocation();
    const localPos = new Vec3();
    if (this._dragPreviewNode) {
      const uiTransform = this._dragPreviewNode.getComponent(UITransform);
      if (uiTransform) {
        this.node.getComponent(UITransform)?.convertToNodeSpaceAR(new Vec3(worldPos.x, worldPos.y, 0), localPos);
        // 计算锚点偏移
        const anchorOffsetX = item.anchorCol * (cellSize + spacing);
        const anchorOffsetY = -item.anchorRow * (cellSize + spacing);
        this._dragOffset.set(localPos.x - anchorOffsetX, localPos.y - anchorOffsetY, 0);
      }
    }

    // 监听全局触摸移动和结束事件
    input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
    input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
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
    
    // 使用中心锚点，与仓库格子和放置的物品一致
    uiTransform.setAnchorPoint(0.5, 0.5);

    const display = this._dragPreviewNode.addComponent(ItemDisplay);
    display.cellSize = cellSize;
    display.spacing = spacing;
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
    const localPos = new Vec3();
    this.node.getComponent(UITransform)?.convertToNodeSpaceAR(new Vec3(worldPos.x, worldPos.y, 0), localPos);
    
    this._dragPreviewNode.setPosition(localPos.x, localPos.y, 0);
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

    if (this._dragPreviewNode) {
      this._dragPreviewNode.destroy();
      this._dragPreviewNode = null;
    }

    this._draggingItem = null;
    this._sourceSlot = null;
    this._isDragging = false;
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
}
