import { _decorator, Component, Node, UITransform, Button, Label, Graphics, Color, Layout, view } from 'cc';
import { BaseItem } from '../item/BaseItem';
import { ItemFactory } from '../item/ItemFactory';
import { ItemSlot } from './ItemSlot';
const { ccclass, property } = _decorator;

/**
 * 物品面板组件
 * 管理三个物品槽位和刷新按钮
 */
@ccclass('ItemPanel')
export class ItemPanel extends Component {
  @property({ tooltip: '物品槽位数量' })
  public slotCount: number = 3;

  @property({ type: [Node], tooltip: '物品槽位节点数组（如果为空则自动创建）' })
  public slotNodes: Node[] = [];

  @property({ type: Node, tooltip: '刷新按钮节点（如果为空则自动创建）' })
  public refreshButtonNode: Node | null = null;

  @property({ tooltip: '槽位宽度（像素）' })
  public slotWidth: number = 200;

  @property({ tooltip: '槽位高度（像素）' })
  public slotHeight: number = 200;

  @property({ tooltip: '槽位之间的间距（像素）' })
  public slotSpacing: number = 20;

  @property({ tooltip: '面板背景颜色' })
  public panelBackgroundColor: Color = new Color(250, 250, 250, 255);

  @property({ tooltip: '面板边框颜色' })
  public panelBorderColor: Color = new Color(200, 200, 200, 255);

  @property({ tooltip: '刷新按钮宽度（像素）' })
  public buttonWidth: number = 150;

  @property({ tooltip: '刷新按钮高度（像素）' })
  public buttonHeight: number = 50;

  @property({ tooltip: '刷新按钮文本' })
  public buttonText: string = '刷新';

  private _slots: ItemSlot[] = [];
  private _currentItems: (BaseItem | null)[] = [];
  private _itemFactory: ItemFactory;

  protected onLoad(): void {
    this._itemFactory = ItemFactory.getInstance();
    this.setupPanel();
    this.generateRandomItems();
  }

  protected onEnable(): void {
    view.on('canvas-resize', this.onResize, this);
    view.on('resize', this.onResize, this);
  }

  protected onDisable(): void {
    view.off('canvas-resize', this.onResize, this);
    view.off('resize', this.onResize, this);
  }

  /**
   * 设置面板
   */
  private setupPanel(): void {
    // 设置容器大小
    const containerTransform = this.getComponent(UITransform);
    if (containerTransform) {
      const totalWidth = this.slotCount * this.slotWidth + (this.slotCount - 1) * this.slotSpacing + 40;
      const totalHeight = this.slotHeight + this.buttonHeight + 40;
      containerTransform.setContentSize(totalWidth, totalHeight);
      containerTransform.setAnchorPoint(0.5, 0.5);
    }

    // 绘制面板背景
    this.drawPanelBackground();

    // 设置槽位
    this.setupSlots();

    // 设置刷新按钮
    this.setupRefreshButton();
  }

  /**
   * 绘制面板背景
   */
  private drawPanelBackground(): void {
    let graphics = this.getComponent(Graphics);
    if (!graphics) {
      graphics = this.addComponent(Graphics);
    }

    graphics.clear();
    graphics.fillColor = this.panelBackgroundColor;
    graphics.strokeColor = this.panelBorderColor;
    graphics.lineWidth = 2;

    const containerTransform = this.getComponent(UITransform);
    if (containerTransform) {
      const width = containerTransform.contentSize.width;
      const height = containerTransform.contentSize.height;
      const x = -width / 2;
      const y = -height / 2;

      graphics.roundRect(x, y, width, height, 10);
      graphics.fill();
      graphics.stroke();
    }
  }

  /**
   * 设置槽位
   */
  private setupSlots(): void {
    // 清除现有槽位
    this.clearSlots();

    // 创建或使用现有槽位节点
    if (this.slotNodes.length === this.slotCount) {
      // 使用现有节点
      for (let i = 0; i < this.slotCount; i++) {
        const slotNode = this.slotNodes[i];
        if (slotNode) {
          let slot = slotNode.getComponent(ItemSlot);
          if (!slot) {
            slot = slotNode.addComponent(ItemSlot);
          }
          slot.slotWidth = this.slotWidth;
          slot.slotHeight = this.slotHeight;
          this._slots.push(slot);
        }
      }
    } else {
      // 自动创建槽位节点
      const containerTransform = this.getComponent(UITransform);
      const startX = -(this.slotCount - 1) * (this.slotWidth + this.slotSpacing) / 2;
      const slotY = this.buttonHeight / 2 + 10;

      for (let i = 0; i < this.slotCount; i++) {
        const slotNode = new Node(`Slot_${i}`);
        const x = startX + i * (this.slotWidth + this.slotSpacing);
        slotNode.setPosition(x, slotY, 0);

        const slot = slotNode.addComponent(ItemSlot);
        slot.slotWidth = this.slotWidth;
        slot.slotHeight = this.slotHeight;

        this.node.addChild(slotNode);
        this._slots.push(slot);
        this.slotNodes.push(slotNode);
      }
    }

    // 初始化物品数组
    this._currentItems = new Array(this.slotCount).fill(null);
  }

  /**
   * 设置刷新按钮
   */
  private setupRefreshButton(): void {
    if (this.refreshButtonNode) {
      // 使用现有按钮节点
      let button = this.refreshButtonNode.getComponent(Button);
      if (!button) {
        button = this.refreshButtonNode.addComponent(Button);
      }
      this.setupButtonStyle(this.refreshButtonNode, button);
    } else {
      // 自动创建刷新按钮
      const buttonNode = new Node('RefreshButton');
      buttonNode.setPosition(0, -(this.slotHeight / 2 + this.buttonHeight / 2 + 10), 0);

      const uiTransform = buttonNode.addComponent(UITransform);
      uiTransform.setContentSize(this.buttonWidth, this.buttonHeight);
      uiTransform.setAnchorPoint(0.5, 0.5);

      const button = buttonNode.addComponent(Button);
      this.setupButtonStyle(buttonNode, button);

      this.node.addChild(buttonNode);
      this.refreshButtonNode = buttonNode;
    }
  }

  /**
   * 设置按钮样式
   */
  private setupButtonStyle(buttonNode: Node, button: Button): void {
    // 绘制按钮背景
    let graphics = buttonNode.getComponent(Graphics);
    if (!graphics) {
      graphics = buttonNode.addComponent(Graphics);
    }

    const drawButton = () => {
      graphics.clear();
      graphics.fillColor = new Color(100, 150, 255, 255);
      graphics.strokeColor = new Color(80, 120, 200, 255);
      graphics.lineWidth = 2;

      const uiTransform = buttonNode.getComponent(UITransform);
      if (uiTransform) {
        const width = uiTransform.contentSize.width;
        const height = uiTransform.contentSize.height;
        const x = -width / 2;
        const y = -height / 2;

        graphics.roundRect(x, y, width, height, 8);
        graphics.fill();
        graphics.stroke();
      }
    };

    drawButton();

    // 添加按钮文本
    let label = buttonNode.getComponentInChildren(Label);
    if (!label) {
      const labelNode = new Node('Label');
      const labelTransform = labelNode.addComponent(UITransform);
      labelTransform.setContentSize(this.buttonWidth, this.buttonHeight);
      labelTransform.setAnchorPoint(0.5, 0.5);
      labelNode.setPosition(0, 0, 0);

      label = labelNode.addComponent(Label);
      label.string = this.buttonText;
      label.fontSize = 24;
      label.color = Color.WHITE;

      buttonNode.addChild(labelNode);
    } else {
      label.string = this.buttonText;
    }

    // 添加点击事件
    button.node.off(Button.EventType.CLICK, this.onRefreshClick, this);
    button.node.on(Button.EventType.CLICK, this.onRefreshClick, this);
  }

  /**
   * 刷新按钮点击事件
   */
  private onRefreshClick(): void {
    this.generateRandomItems();
  }

  /**
   * 随机生成物品
   */
  public generateRandomItems(): void {
    // 使用工厂方法随机创建物品
    const selectedItems = this._itemFactory.createRandomItems(this.slotCount);

    // 设置到槽位
    for (let i = 0; i < this.slotCount; i++) {
      if (this._slots[i] && selectedItems[i]) {
        this._slots[i].setItem(selectedItems[i]);
        this._currentItems[i] = selectedItems[i];
      } else {
        this._slots[i]?.setItem(null);
        this._currentItems[i] = null;
      }
    }
  }

  /**
   * 清除槽位
   */
  private clearSlots(): void {
    for (const slot of this._slots) {
      if (slot && slot.node && slot.node.isValid) {
        slot.clear();
      }
    }
    this._slots = [];
  }

  /**
   * 窗口大小变化处理
   */
  private onResize(): void {
    // 可以在这里添加响应式布局逻辑
  }

  /**
   * 获取当前物品数组
   */
  public getCurrentItems(): (BaseItem | null)[] {
    return [...this._currentItems];
  }

  /**
   * 获取指定槽位的物品
   */
  public getItemAtSlot(index: number): BaseItem | null {
    if (index >= 0 && index < this._currentItems.length) {
      return this._currentItems[index];
    }
    return null;
  }
}
