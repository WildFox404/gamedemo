import { BaseItem } from '../BaseItem';
import { ItemShapes, ItemColors } from '../ItemShapes';

/**
 * L形物品（缺一角的矩形）
 */
export class ItemLShape1 extends BaseItem {
  constructor() {
    super(
      'item_l_shape_1',
      'L形物品',
      ItemShapes.L_SHAPE_1,
      ItemColors.BLUE,
      '一个L形的物品，缺右下角',
      'l_shape'
    );
  }
}
