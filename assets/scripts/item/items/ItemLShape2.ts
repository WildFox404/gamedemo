import { BaseItem } from '../BaseItem';
import { ItemShapes, ItemColors } from '../ItemShapes';

/**
 * 反L形物品
 */
export class ItemLShape2 extends BaseItem {
  constructor() {
    super(
      'item_l_shape_2',
      '反L形物品',
      ItemShapes.L_SHAPE_2,
      ItemColors.GREEN,
      '一个反L形的物品，缺左下角',
      'l_shape'
    );
  }
}
