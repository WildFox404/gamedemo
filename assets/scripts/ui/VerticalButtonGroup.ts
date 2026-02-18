import { _decorator, Component, Node, Layout, UITransform, view, Button, Sprite, Label, Color, Vec3, Graphics, tween, Input, EventTouch, director } from 'cc';
const { ccclass, property } = _decorator;

/**
 * 垂直按钮组
 * 自动创建三个垂直排列的按钮，间距20，容器居中在canvas中
 */
@ccclass('VerticalButtonGroup')
export class VerticalButtonGroup extends Component {
  @property({ tooltip: '按钮间距（像素）' })
  public spacing = 20;

  @property({ tooltip: '按钮宽度（像素）' })
  public buttonWidth = 200;

  @property({ tooltip: '按钮高度（像素）' })
  public buttonHeight = 60;

  @property({ tooltip: '圆角半径（像素）' })
  public borderRadius = 10;

  @property({ tooltip: '背景颜色（灰色透明）' })
  public backgroundColor = new Color(128, 128, 128, 180);

  @property({ tooltip: '点击时的缩放比例' })
  public clickScale = 0.9;

  @property({ tooltip: '缩放动画时长（秒）' })
  public scaleDuration = 0.1;

  @property({ tooltip: '按钮文本数组（按顺序）' })
  public buttonTexts: string[] = ['开始', '设置', '退出'];

  @property({ tooltip: '游戏场景名称（点击"开始"按钮后跳转，例如：game）' })
  public gameSceneName: string = 'game';

  @property({ type: [Node], tooltip: '按钮节点数组（如果已有按钮节点，则使用这些节点）' })
  public buttonNodes: Node[] = [];

  protected onLoad(): void {
    this.setupButtons();
  }

  protected start(): void {
    // 在start中居中，确保所有组件都已初始化
    this.centerContainer();
  }

  protected onEnable(): void {
    view.on('canvas-resize', this.centerContainer, this);
    view.on('resize', this.centerContainer, this);
  }

  protected onDisable(): void {
    view.off('canvas-resize', this.centerContainer, this);
    view.off('resize', this.centerContainer, this);
  }

  /**
   * 设置按钮
   */
  private setupButtons(): void {
    // 如果已有按钮节点，使用它们；否则创建新按钮
    if (this.buttonNodes.length > 0) {
      this.arrangeExistingButtons();
    } else {
      this.createButtons();
    }

    // 设置布局
    this.setupLayout();
  }

  /**
   * 创建新按钮
   */
  private createButtons(): void {
    // 清除现有子节点（如果有）
    this.node.removeAllChildren();

    for (let i = 0; i < this.buttonTexts.length; i++) {
      const buttonNode = new Node(`Button${i + 1}`);
      
      // 添加UITransform
      const uiTransform = buttonNode.addComponent(UITransform);
      uiTransform.setContentSize(this.buttonWidth, this.buttonHeight);
      uiTransform.setAnchorPoint(0.5, 0.5);

      // 添加Graphics组件绘制圆角矩形背景
      const graphics = buttonNode.addComponent(Graphics);
      this.drawRoundedRect(graphics, this.buttonWidth, this.buttonHeight, this.borderRadius, this.backgroundColor);

      // 添加Button组件
      const button = buttonNode.addComponent(Button);
      
      // 添加点击缩放效果
      this.addClickScaleEffect(buttonNode, button);
      
      // 添加按钮点击事件
      this.addButtonClickEvent(buttonNode, button, i);
      
      // 创建Label子节点用于显示文本
      const labelNode = new Node('Label');
      const labelTransform = labelNode.addComponent(UITransform);
      labelTransform.setContentSize(this.buttonWidth, this.buttonHeight);
      labelTransform.setAnchorPoint(0.5, 0.5);
      
      const label = labelNode.addComponent(Label);
      label.string = this.buttonTexts[i] || `按钮${i + 1}`;
      label.fontSize = 24;
      label.color = Color.WHITE;
      
      buttonNode.addChild(labelNode);
      
      // 添加到容器
      this.node.addChild(buttonNode);
      this.buttonNodes.push(buttonNode);
    }
  }

  /**
   * 排列已有按钮
   */
  private arrangeExistingButtons(): void {
    // 确保按钮数量匹配
    const buttonCount = Math.min(this.buttonNodes.length, this.buttonTexts.length);
    
    for (let i = 0; i < buttonCount; i++) {
      const buttonNode = this.buttonNodes[i];
      if (!buttonNode || !buttonNode.isValid) continue;

      // 确保按钮已添加到容器中
      if (buttonNode.parent !== this.node) {
        this.node.addChild(buttonNode);
      }

      // 确保按钮有UITransform
      let uiTransform = buttonNode.getComponent(UITransform);
      if (!uiTransform) {
        uiTransform = buttonNode.addComponent(UITransform);
      }
      uiTransform.setContentSize(this.buttonWidth, this.buttonHeight);
      uiTransform.setAnchorPoint(0.5, 0.5);

      // 确保按钮有Graphics背景
      let graphics = buttonNode.getComponent(Graphics);
      if (!graphics) {
        graphics = buttonNode.addComponent(Graphics);
      }
      graphics.clear();
      this.drawRoundedRect(graphics, this.buttonWidth, this.buttonHeight, this.borderRadius, this.backgroundColor);

      // 更新文本（如果存在Label）
      const label = buttonNode.getComponentInChildren(Label);
      if (label && this.buttonTexts[i]) {
        label.string = this.buttonTexts[i];
      }

      // 确保按钮有点击缩放效果和点击事件
      const button = buttonNode.getComponent(Button);
      if (button) {
        this.addClickScaleEffect(buttonNode, button);
        this.addButtonClickEvent(buttonNode, button, i);
      }
    }
  }

  /**
   * 设置布局组件
   */
  private setupLayout(): void {
    let layout = this.getComponent(Layout);
    if (!layout) {
      layout = this.addComponent(Layout);
    }

    layout.type = Layout.Type.VERTICAL;
    layout.spacingY = this.spacing;
    layout.resizeMode = Layout.ResizeMode.CONTAINER;
    layout.verticalDirection = Layout.VerticalDirection.TOP_TO_BOTTOM;
    
    // 设置容器的锚点为中心
    const containerTransform = this.getComponent(UITransform);
    if (containerTransform) {
      containerTransform.setAnchorPoint(0.5, 0.5);
    }

    // 强制更新布局
    layout.updateLayout();
  }

  /**
   * 居中容器
   */
  private centerContainer(): void {
    // 计算按钮组总高度
    const buttonCount = this.buttonNodes.length || this.buttonTexts.length;
    const totalHeight = buttonCount * this.buttonHeight + (buttonCount - 1) * this.spacing;
    
    // 设置容器大小
    const containerTransform = this.getComponent(UITransform);
    if (containerTransform) {
      containerTransform.setContentSize(this.buttonWidth, totalHeight);
    }

    // 设置容器位置为canvas中心（锚点0.5,0.5时，位置0,0就是中心）
    this.node.setPosition(0, 0, 0);
  }

  /**
   * 绘制圆角矩形
   */
  private drawRoundedRect(graphics: Graphics, width: number, height: number, radius: number, color: Color): void {
    graphics.clear();
    graphics.fillColor = color;
    
    // 计算圆角矩形的路径
    const x = -width / 2;
    const y = -height / 2;
    
    graphics.roundRect(x, y, width, height, radius);
    graphics.fill();
  }

  /**
   * 添加点击缩放效果
   */
  private addClickScaleEffect(buttonNode: Node, button: Button): void {
    const originalScale = new Vec3(1, 1, 1);
    const clickScale = new Vec3(this.clickScale, this.clickScale, 1);

    // 按下时缩放
    buttonNode.on(Input.EventType.TOUCH_START, () => {
      tween(buttonNode)
        .to(this.scaleDuration, { scale: clickScale }, { easing: 'sineOut' })
        .start();
    }, buttonNode);

    // 抬起时恢复
    buttonNode.on(Input.EventType.TOUCH_END, () => {
      tween(buttonNode)
        .to(this.scaleDuration, { scale: originalScale }, { easing: 'sineOut' })
        .start();
    }, buttonNode);

    // 取消时恢复（手指移出按钮区域）
    buttonNode.on(Input.EventType.TOUCH_CANCEL, () => {
      tween(buttonNode)
        .to(this.scaleDuration, { scale: originalScale }, { easing: 'sineOut' })
        .start();
    }, buttonNode);
  }

  /**
   * 添加按钮点击事件
   */
  private addButtonClickEvent(buttonNode: Node, button: Button, index: number): void {
    button.node.on(Button.EventType.CLICK, () => {
      const buttonText = this.buttonTexts[index] || '';
      
      if (buttonText === '开始') {
        // 跳转到游戏场景
        this.loadGameScene();
      } else if (buttonText === '设置') {
        // 设置按钮的处理（可以后续添加）
        console.log('点击了设置按钮');
      } else if (buttonText === '退出') {
        // 退出应用
        console.log('点击了退出按钮');
        // 如果需要退出应用，可以取消注释下面的代码
        // if (sys.isNative) {
        //   sys.exit();
        // }
      }
    }, buttonNode);
  }

  /**
   * 加载游戏场景
   */
  private loadGameScene(): void {
    if (this.gameSceneName) {
      director.loadScene(this.gameSceneName);
    } else {
      console.warn('游戏场景名称未设置');
    }
  }
}
