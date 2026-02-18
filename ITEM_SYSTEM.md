# 物品系统说明文档

## 1. 文档目标

本文档用于说明当前项目中“物品系统”的结构、关键属性、数据流和扩展示例，帮助你快速理解：

- 物品由哪些属性组成
- 物品如何被创建和随机生成
- 物品如何在 UI、拖拽、仓库放置中被使用
- 如何新增一个物品类型

---

## 2. 核心文件结构

物品系统主要位于 `assets/scripts/item/`：

- `BaseItem.ts`：物品基类与通用行为
- `ItemShapes.ts`：预定义形状与颜色常量
- `ItemFactory.ts`：物品工厂（注册、创建、随机生成）
- `items/*.ts`：具体物品类型（10种）
- `index.ts`：统一导出入口

与 UI 的关联主要在：

- `assets/scripts/ui/ItemPanel.ts`：生成并分发随机物品
- `assets/scripts/ui/ItemSlot.ts`：槽位显示、开始拖拽
- `assets/scripts/ui/ItemDisplay.ts`：物品可视化渲染
- `assets/scripts/ui/Warehouse.ts`：放置判定与落子
- `assets/scripts/ui/PlacedItem.ts`：已放置物品展示

---

## 3. BaseItem 属性说明

`BaseItem` 是所有物品的统一数据模型，关键属性如下：

- `id: string`  
  物品唯一 ID（例如 `item_t_shape`）。

- `name: string`  
  物品显示名称（例如 `T形物品`）。

- `shape: number[][]`  
  物品形状矩阵，`1` 表示占用，`0` 表示空位。  
  例如：`[[1,1,1],[0,1,0]]`。

- `color: Color`  
  物品渲染颜色。

- `description: string`  
  说明文本。

- `type: ItemType`  
  物品枚举类型，当前支持：`ItemType.PROP`（道具类）/ `ItemType.SUMMON`（召唤物类）。

- `anchorRow: number` / `anchorCol: number`  
  放置锚点（默认 `0,0`，即左上角第一个方块）。

派生属性与方法：

- `width` / `height`：根据 `shape` 动态计算
- `cellCount`：占用方块总数
- `getOccupiedPositions()`：返回所有占用格坐标
- `isOccupied(row, col)`：检查局部格是否占用
- `rotateClockwise()`：返回旋转后的形状数据
- `clone()`：深拷贝当前物品

---

## 4. 形状与颜色定义

`ItemShapes.ts` 中维护了常量化的形状和颜色：

- 形状：`SQUARE_2X2`、`L_SHAPE_1`、`BAR_HORIZONTAL_3`、`T_SHAPE`、`Z_SHAPE` 等
- 颜色：`RED`、`BLUE`、`GREEN`、`ORANGE` 等

这样做的好处：

- 避免每个具体物品重复写矩阵
- 颜色策略集中管理，便于统一美术风格

---

## 5. 工厂与注册机制

`ItemFactory` 是单例，内部维护：

- `_itemRegistry: Map<string, () => BaseItem>`

核心能力：

- `registerItem(id, factory)`：注册物品类型
- `createItem(id)`：按 ID 创建实例
- `createAllItems()`：创建全部已注册物品
- `createRandomItem()`：随机创建 1 个物品
- `createRandomItems(count)`：随机创建多个物品（优先不重复）

当前项目在 `registerAllItems()` 中写死注册了 10 种物品。

---

## 6. 系统运行数据流

1. `ItemPanel` 调用 `ItemFactory.createRandomItems(slotCount)` 生成物品。  
2. 物品被设置到 `ItemSlot`，通过 `ItemDisplay` 渲染形状。  
3. 玩家触摸槽位，`ItemSlot` 调用 `DragManager.startDrag(...)`。  
4. `Warehouse` 根据 `BaseItem.shape` 与锚点计算预显示和可放置性。  
5. 放置成功后，创建 `PlacedItem` 渲染落在仓库中的物品。  

---

## 7. 示例

### 示例1：一个具体物品是如何定义的

以下是“横向3格长条”思路（简化示例）：

```ts
export class ItemBarHorizontal3 extends BaseItem {
  constructor() {
    super(
      'item_bar_horizontal_3',
      '横向长条',
      ItemShapes.BAR_HORIZONTAL_3, // [[1,1,1]]
      ItemColors.YELLOW,
      '一个横向3格的长条物品',
      ItemType.PROP
    );
  }
}
```

说明：该类没有额外行为，只是把配置传给 `BaseItem`。

### 示例2：从工厂创建一个指定物品

```ts
const factory = ItemFactory.getInstance();
const item = factory.createItem('item_t_shape');
if (item) {
  console.log(item.name, item.width, item.height, item.cellCount);
}
```

### 示例3：获取一个物品的占用格

```ts
const positions = item.getOccupiedPositions();
// 例如 T 形可能返回:
// [ [0,0], [0,1], [0,2], [1,1] ]
```

该结果用于仓库中：

- 边界检测（是否越界）
- 重叠检测（是否与已放置物品冲突）

### 示例4：新增一个“4格横条”物品（完整流程）

步骤A：在 `ItemShapes.ts` 中确认已有形状（当前已有 `BAR_HORIZONTAL_4`）。

步骤B：新增类文件 `assets/scripts/item/items/ItemBarHorizontal4.ts`：

```ts
import { BaseItem, ItemType } from '../BaseItem';
import { ItemShapes, ItemColors } from '../ItemShapes';

export class ItemBarHorizontal4 extends BaseItem {
  constructor() {
    super(
      'item_bar_horizontal_4',
      '横向四连条',
      ItemShapes.BAR_HORIZONTAL_4,
      ItemColors.CYAN,
      '一个横向4格的物品',
      ItemType.PROP
    );
  }
}
```

步骤C：在 `ItemFactory.ts` 中注册：

```ts
this.registerItem('item_bar_horizontal_4', () => new ItemBarHorizontal4());
```

步骤D：在 `index.ts` 中导出（可选但推荐）：

```ts
export { ItemBarHorizontal4 } from './items/ItemBarHorizontal4';
```

完成后，该物品会自动参与随机生成（若工厂已注册）。

---

## 8. 当前解耦现状

### 已解耦

- 业务逻辑（拖拽、仓库判定）基本依赖 `BaseItem` 接口，不依赖具体物品类。
- 生成入口统一通过 `ItemFactory`，不是 UI 层直接 `new ItemXxx()`。

### 仍有耦合

- `ItemFactory.registerAllItems()` 仍是硬编码注册，新增物品要改工厂。
- 每个物品依旧是独立类文件，本质上更多是“配置类”而非行为类。

---

## 9. 后续优化建议（可选）

- 方案1：改为 `ItemConfig[]` 数据驱动（JSON/TS 配置），减少样板类。
- 方案2：把“稀有度、权重、等级、标签”纳入配置，支持更细粒度随机策略。
- 方案3：预留旋转策略字段（是否允许旋转、旋转后形状集）。

---

## 10. 快速结论

当前物品系统结构清晰、可用性高，适合中小规模扩展。  
若后续物品类型快速增长，建议从“类驱动”逐步迁移到“配置驱动”。
