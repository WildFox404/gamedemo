import { BaseItem } from '../BaseItem';
import { ItemShapes, ItemColors } from '../ItemShapes';

/**
 * 2x2 正方形物品
 */
export class ItemSquare2x2 extends BaseItem {
  constructor() {
    super(
      'item_square_2x2',
      '正方形',
      ItemShapes.SQUARE_2X2,
      ItemColors.RED,
      '一个2x2的正方形物品',
      'square'
    );
  }
}
