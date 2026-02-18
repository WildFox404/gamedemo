# 物品面板使用说明

## 概述

物品面板组件 (`ItemPanel`) 用于在页面上方显示三个随机物品，并提供刷新按钮来重新生成物品。

## 组件结构

- **ItemPanel** - 主面板组件，管理三个物品槽位和刷新按钮
- **ItemSlot** - 物品槽位组件，显示单个物品
- **ItemDisplay** - 物品显示组件，可视化显示物品形状

## 使用方法

### 在游戏场景中使用

1. **打开 `game.scene` 场景**

2. **在 Canvas 节点下创建新节点**
   - 节点名称：`ItemPanel`
   - 位置：放在页面上方（例如 Y = 250）

3. **添加 ItemPanel 组件**
   - 选中 `ItemPanel` 节点
   - 点击"添加组件"
   - 搜索并添加 `ItemPanel` 组件

4. **配置属性（可选）**
   - `Slot Count`: 3（槽位数量，默认3）
   - `Slot Width`: 200（槽位宽度）
   - `Slot Height`: 200（槽位高度）
   - `Slot Spacing`: 20（槽位间距）
   - `Button Width`: 150（按钮宽度）
   - `Button Height`: 50（按钮高度）
   - `Button Text`: "刷新"（按钮文本）

5. **运行游戏**
   - 面板会自动在初始化时生成三个随机物品
   - 点击刷新按钮可以重新生成三个随机物品

## 自动创建模式

如果不手动创建槽位节点和按钮节点，组件会自动创建：

- **自动创建槽位**：如果 `Slot Nodes` 数组为空，会自动创建三个槽位节点
- **自动创建按钮**：如果 `Refresh Button Node` 为空，会自动创建刷新按钮

## 手动配置模式

如果需要自定义布局：

1. **创建槽位节点**
   - 在 `ItemPanel` 节点下创建三个子节点（例如：`Slot_0`, `Slot_1`, `Slot_2`）
   - 每个节点添加 `ItemSlot` 组件
   - 在 `ItemPanel` 的 `Slot Nodes` 属性中拖入这三个节点

2. **创建刷新按钮节点**
   - 在 `ItemPanel` 节点下创建按钮节点（例如：`RefreshButton`）
   - 添加 `Button` 组件
   - 在 `ItemPanel` 的 `Refresh Button Node` 属性中拖入该节点

## API 说明

### ItemPanel 主要方法

```typescript
// 随机生成物品
generateRandomItems(): void

// 获取当前所有物品
getCurrentItems(): (BaseItem | null)[]

// 获取指定槽位的物品
getItemAtSlot(index: number): BaseItem | null
```

### ItemSlot 主要方法

```typescript
// 设置物品
setItem(item: BaseItem | null): void

// 获取当前物品
getItem(): BaseItem | null

// 清空槽位
clear(): void
```

### ItemDisplay 主要方法

```typescript
// 设置要显示的物品
setItem(item: BaseItem | null): void

// 获取当前物品
getItem(): BaseItem | null
```

## 示例代码

```typescript
import { ItemPanel } from './ui/ItemPanel';

// 获取物品面板组件
const itemPanel = this.node.getComponent(ItemPanel);

// 手动刷新物品
itemPanel.generateRandomItems();

// 获取当前物品
const items = itemPanel.getCurrentItems();
console.log('当前物品:', items);

// 获取第一个槽位的物品
const firstItem = itemPanel.getItemAtSlot(0);
if (firstItem) {
  console.log('第一个物品:', firstItem.name);
}
```

## 注意事项

1. 物品面板会自动在 `onLoad` 时生成初始物品
2. 刷新按钮会自动绑定点击事件
3. 物品显示会自动适配槽位大小
4. 面板会自动居中显示，但可以通过设置节点位置来调整
5. 建议将面板放在页面上方，避免与仓库重叠
