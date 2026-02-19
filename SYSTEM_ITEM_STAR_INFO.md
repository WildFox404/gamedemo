# 系统说明：物品、星星联动与介绍框

## 1. 相关代码

- `assets/scripts/item/BaseItem.ts`
- `assets/scripts/item/ItemShapes.ts`
- `assets/scripts/item/ItemFactory.ts`
- `assets/scripts/item/items/*.ts`
- `assets/scripts/ui/ItemDisplay.ts`
- `assets/scripts/ui/PlacedItem.ts`
- `assets/scripts/ui/Warehouse.ts`

## 2. 物品基础模型（BaseItem）

核心字段：

- `id` / `name`
- `shape`（0/1/2）
- `color`
- `description`
- `type`（`PROP`/`SUMMON`/`FOOD`）
- `feature`（功能描述，用于介绍框展示）
- `starRequiredNeighborType`（星星联动目标类型限制，可空）
- `anchorRow` / `anchorCol`

核心方法：

- `getOccupiedPositions()`：仅返回 `1`
- `getStarPositions()`：仅返回 `2`
- `isOccupied()` / `isStar()` / `isInteractiveCell()`
- `canStarLinkTo(target)`：判断目标类型是否满足星星联动条件

## 3. 星星联动系统

### 3.1 判定核心

- 星星按四邻（上/下/左/右）判定
- 仅邻接到目标物体的实体占用格（`1`）才算命中
- 不按整物体包围盒判定，不按目标星星格（`2`）判定
- 还需满足 `canStarLinkTo(target.item)` 的类型条件

### 3.2 连锁结果

`Warehouse` 会计算并缓存 `StarLinkResult`，包含：

- 总星星数
- 有效联动次数
- 唯一联动物品对数
- 连锁组数量与最大连锁规模
- 每个已放置物品的联动摘要（邻接数、连锁规模）

## 4. 星星显示逻辑

- 默认不显示星星
- 仅在以下场景显示：
  - 拖拽预览
  - 仓库选中物品

显示样式：

- 生效：黄心圆
- 失效：灰心黄边

拖拽时状态同步：

- 预显示与手上拖拽预览同步更新
- 非法位置或不满足条件时，立即回灰色失效态

## 5. 物品介绍框系统

展示时机：

- 选中仓库物品
- 拖拽悬停（位移小于阈值并达到延时）

展示内容：

- 名称、ID、类型
- 占用格与星星数
- 功能（`feature`）
- 描述（`description`）
- 若在仓库中：联动邻居数、连锁规模

布局规则：

- 默认在物品右侧
- 右侧空间不足自动翻转到左侧
- 位置带屏幕边界限制
