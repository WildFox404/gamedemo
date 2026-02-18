# 物品系统使用说明

## 概述

物品系统提供了一个灵活的框架来创建和管理不同形状的物品。每个物品都有一个二维数组定义的形状，可以放置在仓库网格中。

## 文件结构

```
item/
├── BaseItem.ts           # 物品基类
├── ItemShapes.ts        # 预定义的形状和颜色
├── ItemFactory.ts       # 物品工厂（单例）
├── index.ts             # 统一导出
├── items/               # 具体物品类
│   ├── ItemSquare2x2.ts
│   ├── ItemLShape1.ts
│   ├── ItemLShape2.ts
│   ├── ItemBarHorizontal3.ts
│   ├── ItemBarVertical3.ts
│   ├── ItemTShape.ts
│   ├── ItemTShapeInverted.ts
│   ├── ItemZShape.ts
│   ├── ItemZShapeInverted.ts
│   └── ItemSingle.ts
└── README.md
```

## 已实现的10种物品

1. **ItemSquare2x2** - 2x2正方形 (红色)
   - 形状: `[[1,1],[1,1]]`

2. **ItemLShape1** - L形物品，缺右下角 (蓝色)
   - 形状: `[[1,1],[1,1],[1,0]]`

3. **ItemLShape2** - 反L形物品，缺左下角 (绿色)
   - 形状: `[[1,1],[1,1],[0,1]]`

4. **ItemBarHorizontal3** - 横向3格长条 (黄色)
   - 形状: `[[1,1,1]]`

5. **ItemBarVertical3** - 纵向3格长条 (紫色)
   - 形状: `[[1],[1],[1]]`

6. **ItemTShape** - T形物品 (橙色)
   - 形状: `[[1,1,1],[0,1,0]]`

7. **ItemTShapeInverted** - 倒T形物品 (青色)
   - 形状: `[[0,1,0],[1,1,1]]`

8. **ItemZShape** - Z形物品 (粉色)
   - 形状: `[[1,1,0],[0,1,1]]`

9. **ItemZShapeInverted** - 反Z形物品 (棕色)
   - 形状: `[[0,1,1],[1,1,0]]`

10. **ItemSingle** - 单格物品 (灰色)
    - 形状: `[[1]]`

## 使用方法

### 1. 使用物品工厂创建物品

```typescript
import { ItemFactory } from './item';

// 获取工厂实例
const factory = ItemFactory.getInstance();

// 根据ID创建物品
const item = factory.createItem('item_square_2x2');
if (item) {
  console.log(`物品名称: ${item.name}`);
  console.log(`物品尺寸: ${item.width}x${item.height}`);
  console.log(`占用格子数: ${item.cellCount}`);
}

// 创建所有物品
const allItems = factory.createAllItems();
console.log(`共有 ${allItems.length} 种物品`);
```

### 2. 直接创建物品实例

```typescript
import { ItemSquare2x2, ItemLShape1 } from './item';

// 创建2x2正方形
const square = new ItemSquare2x2();

// 创建L形物品
const lShape = new ItemLShape1();

// 获取物品信息
console.log(square.name);        // "正方形"
console.log(square.width);       // 2
console.log(square.height);      // 2
console.log(square.cellCount);   // 4
```

### 3. 检查物品形状

```typescript
const item = new ItemSquare2x2();

// 获取所有占用位置
const positions = item.getOccupiedPositions();
// 返回: [[0,0], [0,1], [1,0], [1,1]]

// 检查特定位置是否占用
const isOccupied = item.isOccupied(0, 0);  // true
const isEmpty = item.isOccupied(2, 2);     // false

// 旋转物品（顺时针90度）
const rotatedShape = item.rotateClockwise();
```

### 4. 创建自定义物品

```typescript
import { BaseItem } from './item';
import { ItemColors } from './item';

// 创建自定义形状的物品
class MyCustomItem extends BaseItem {
  constructor() {
    super(
      'my_custom_item',           // ID
      '自定义物品',                // 名称
      [[1, 1, 1], [0, 1, 0]],    // 形状
      ItemColors.PURPLE,          // 颜色
      '这是我的自定义物品',        // 描述
      'custom'                     // 类型
    );
  }
}

// 使用自定义物品
const customItem = new MyCustomItem();

// 注册到工厂（可选）
const factory = ItemFactory.getInstance();
factory.registerItem('my_custom_item', () => new MyCustomItem());
```

## BaseItem 基类属性

### 只读属性
- `id: string` - 物品唯一ID
- `name: string` - 物品名称
- `shape: ItemShape` - 物品形状（二维数组）
- `color: Color` - 物品颜色
- `description: string` - 物品描述
- `type: string` - 物品类型

### 计算属性
- `width: number` - 物品宽度（列数）
- `height: number` - 物品高度（行数）
- `cellCount: number` - 占用的格子数量

### 方法
- `getOccupiedPositions(): Array<[number, number]>` - 获取所有占用位置
- `isOccupied(row: number, col: number): boolean` - 检查位置是否占用
- `rotateClockwise(): ItemShape` - 顺时针旋转90度
- `clone(): BaseItem` - 创建物品副本
- `toJSON(): string` - 转换为JSON字符串

## 扩展说明

### 添加新物品

1. 在 `items/` 目录下创建新的物品类文件
2. 继承 `BaseItem` 类
3. 在构造函数中定义形状、颜色等属性
4. 在 `ItemFactory.ts` 中注册新物品

### 添加新形状

在 `ItemShapes.ts` 中添加新的形状常量：

```typescript
static readonly MY_NEW_SHAPE: ItemShape = [
  [1, 1],
  [1, 0],
];
```

### 添加新颜色

在 `ItemColors.ts` 中添加新的颜色常量：

```typescript
static readonly MY_COLOR = new Color(255, 200, 100, 255);
```

## 注意事项

1. 形状数组中的 `1` 表示占用，`0` 表示不占用
2. 形状以左上角为原点，向下向右扩展
3. 所有物品类都应该继承 `BaseItem`
4. 使用 `ItemFactory` 可以统一管理所有物品
5. 物品是不可变的（所有属性都是只读的），需要修改时使用 `clone()` 方法
