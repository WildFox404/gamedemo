import { BaseItem, ItemType } from '../BaseItem';
import { ItemShapes, ItemColors } from '../ItemShapes';

/**
 * T形物品
 */
export class ItemTShape extends BaseItem {
  constructor() {
    super(
      'item_t_shape',
      'T形物品',
      ItemShapes.T_SHAPE,
      ItemColors.ORANGE,
      '一个T形的物品',
      ItemType.SUMMON
    );
  }
}
