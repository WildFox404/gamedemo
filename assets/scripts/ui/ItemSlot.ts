import { _decorator, Component, Node, UITransform, Graphics, Color, Label, EventTouch, input, Input } from 'cc';
import { BaseItem } from '../item/BaseItem';
import { ItemDisplay } from './ItemDisplay';
import { DragManager } from './DragManager';
const { ccclass, property } = _decorator;

/**
 * 物品槽位组件
 * 显示一个物品槽位，包含背景和物品显示
 */
@ccclass('ItemSlot')
export class ItemSlot extends Component {
  @property({ tooltip: '槽位宽度（像素）' })
  public slotWidth: number = 200;

  @property({ tooltip: '槽位高度（像素）' })
  public slotHeight: number = 200;

  @property({ tooltip: '背景颜色' })
  public backgroundColor: Color = new Color(240, 240, 240, 255);

  @property({ tooltip: '边框颜色' })
  public borderColor: Color = new Color(150, 150, 150, 255);

  @property({ tooltip: '边框宽度（像素）' })
  public borderWidth: number = 2;

  @property({ tooltip: '圆角半径（像素）' })
  public borderRadius: number = 10;

  @property({ type: Node, tooltip: '物品显示节点（如果为空则自动创建）' })
  public itemDisplayNode: Node | null = null;

  @property({ type: Node, tooltip: '物品名称标签节点（可选）' })
  public nameLabelNode: Node | null = null;

  private _itemDisplay: ItemDisplay | null = null;
  private _nameLabel: Label | null = null;
  private _currentItem: BaseItem | null = null;
  private _dragManager: DragManager | null = null;
  private _warehouse: any = null;

  protected onLoad(): void {
    this.setupSlot();
    this.setupDrag();
  }

  protected onEnable(): void {
    // 确保拖拽管理器存在
    this.setupDrag();
  }

  /**
   * 设置槽位
   */
  private setupSlot(): void {
    // 设置容器大小
    const containerTransform = this.getComponent(UITransform);
    if (containerTransform) {
      containerTransform.setContentSize(this.slotWidth, this.slotHeight);
      containerTransform.setAnchorPoint(0.5, 0.5);
    }

    // 绘制背景
    this.drawBackground();

    // 设置物品显示节点
    this.setupItemDisplay();

    // 设置名称标签
    this.setupNameLabel();
  }

  /**
   * 绘制背景
   */
  private drawBackground(): void {
    let graphics = this.getComponent(Graphics);
    if (!graphics) {
      graphics = this.addComponent(Graphics);
    }

    graphics.clear();
    graphics.fillColor = this.backgroundColor;
    graphics.strokeColor = this.borderColor;
    graphics.lineWidth = this.borderWidth;

    const halfWidth = this.slotWidth / 2;
    const halfHeight = this.slotHeight / 2;
    const x = -halfWidth;
    const y = -halfHeight;

    graphics.roundRect(x, y, this.slotWidth, this.slotHeight, this.borderRadius);
    graphics.fill();
    graphics.stroke();
  }

  /**
   * 设置物品显示节点
   */
  private setupItemDisplay(): void {
    if (this.itemDisplayNode) {
      this._itemDisplay = this.itemDisplayNode.getComponent(ItemDisplay);
      if (!this._itemDisplay) {
        this._itemDisplay = this.itemDisplayNode.addComponent(ItemDisplay);
      }
    } else {
      // 自动创建物品显示节点
      const displayNode = new Node('ItemDisplay');
      displayNode.setPosition(0, 0, 0);
      const uiTransform = displayNode.addComponent(UITransform);
      uiTransform.setContentSize(this.slotWidth - 40, this.slotHeight - 40);
      uiTransform.setAnchorPoint(0.5, 0.5);
      
      this._itemDisplay = displayNode.addComponent(ItemDisplay);
      this.node.addChild(displayNode);
      this.itemDisplayNode = displayNode;
    }
  }

  /**
   * 设置名称标签
   */
  private setupNameLabel(): void {
    if (this.nameLabelNode) {
      this._nameLabel = this.nameLabelNode.getComponent(Label);
    } else {
      // 可选：自动创建名称标签
      // 这里不自动创建，保持简洁
    }
  }

  /**
   * 设置物品
   */
  public setItem(item: BaseItem | null): void {
    this._currentItem = item;
    
    if (this._itemDisplay) {
      this._itemDisplay.setItem(item);
    }

    // 更新名称标签
    if (this._nameLabel && item) {
      this._nameLabel.string = item.name;
    }
  }

  /**
   * 获取当前物品
   */
  public getItem(): BaseItem | null {
    return this._currentItem;
  }

  /**
   * 清空槽位
   */
  public clear(): void {
    this.setItem(null);
  }

  /**
   * 设置拖拽功能
   */
  private setupDrag(): void {
    // 查找或创建拖拽管理器
    let parent = this.node.parent;
    while (parent) {
      const canvas = parent.getComponent('cc.Canvas');
      if (canvas) {
        let dragManagerNode = parent.getChildByName('DragManager');
        if (!dragManagerNode) {
          dragManagerNode = new Node('DragManager');
          dragManagerNode.addComponent(UITransform);
          parent.addChild(dragManagerNode);
        }
        this._dragManager = dragManagerNode.getComponent(DragManager) || dragManagerNode.addComponent(DragManager);
        
        // 查找仓库组件（遍历所有子节点）
        const findWarehouse = (node: Node): any => {
          const warehouse = node.getComponent('Warehouse');
          if (warehouse) return warehouse;
          for (const child of node.children) {
            const result = findWarehouse(child);
            if (result) return result;
          }
          return null;
        };
        this._warehouse = findWarehouse(parent);
        break;
      }
      parent = parent.parent;
    }

    // 添加触摸事件监听
    this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
  }

  /**
   * 触摸开始事件
   */
  private onTouchStart(event: EventTouch): void {
    console.log(`[ItemSlot] 触摸开始，当前物品: ${this._currentItem?.name || 'null'}`);
    
    if (!this._currentItem) {
      console.log(`[ItemSlot] 没有物品，取消拖拽`);
      return;
    }
    
    if (!this._dragManager) {
      console.log(`[ItemSlot] 拖拽管理器不存在`);
      return;
    }

    // 获取仓库的cellSize和物品内部间距
    let cellSize = 80;
    let itemSpacing = 0;
    if (this._warehouse) {
      cellSize = this._warehouse.cellSize || 80;
      itemSpacing = this._warehouse.itemSpacing ?? 0;
      console.log(`[ItemSlot] 使用仓库设置: cellSize=${cellSize}, itemSpacing=${itemSpacing}`);
    } else {
      console.log(`[ItemSlot] 未找到仓库，使用默认值`);
    }

    // 开始拖拽（传递仓库方块大小与物品内部间距）
    console.log(`[ItemSlot] 开始拖拽物品: ${this._currentItem.name}`);
    this._dragManager.startDrag(this._currentItem, this.node, event, cellSize, itemSpacing);
  }

  /**
   * 移除物品（拖拽后调用）
   */
  public removeItem(): void {
    if (this._currentItem) {
      this.setItem(null);
    }
  }
}
