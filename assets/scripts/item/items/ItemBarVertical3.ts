import { BaseItem } from '../BaseItem';
import { ItemShapes, ItemColors } from '../ItemShapes';

/**
 * 纵向3格长条物品
 */
export class ItemBarVertical3 extends BaseItem {
  constructor() {
    super(
      'item_bar_vertical_3',
      '纵向长条',
      ItemShapes.BAR_VERTICAL_3,
      ItemColors.PURPLE,
      '一个纵向3格的长条物品',
      'bar'
    );
  }
}
