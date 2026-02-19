import { BaseItem, ItemType } from '../BaseItem';
import { ItemShapes, ItemColors } from '../ItemShapes';

/**
 * 横向3格长条物品
 */
export class ItemBarHorizontal3 extends BaseItem {
  constructor() {
    super(
      'item_bar_horizontal_3',
      '横向长条',
      ItemShapes.BAR_HORIZONTAL_3,
      ItemColors.YELLOW,
      '一个横向3格的长条物品',
      ItemType.SUMMON,
      '召唤共鸣：星星仅对召唤物联动生效',
      ItemType.SUMMON
    );
  }
}
