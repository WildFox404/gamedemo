/**
 * 物品系统导出文件
 * 统一导出所有物品相关的类和接口
 */

// 基类和类型
export { BaseItem, ItemShape } from './BaseItem';

// 形状和颜色定义
export { ItemShapes, ItemColors } from './ItemShapes';

// 物品工厂
export { ItemFactory } from './ItemFactory';

// 所有物品类
export { ItemSquare2x2 } from './items/ItemSquare2x2';
export { ItemLShape1 } from './items/ItemLShape1';
export { ItemLShape2 } from './items/ItemLShape2';
export { ItemBarHorizontal3 } from './items/ItemBarHorizontal3';
export { ItemBarVertical3 } from './items/ItemBarVertical3';
export { ItemTShape } from './items/ItemTShape';
export { ItemTShapeInverted } from './items/ItemTShapeInverted';
export { ItemZShape } from './items/ItemZShape';
export { ItemZShapeInverted } from './items/ItemZShapeInverted';
export { ItemSingle } from './items/ItemSingle';
