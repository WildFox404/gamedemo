import { BaseItem, ItemType } from '../BaseItem';
import { ItemShapes, ItemColors } from '../ItemShapes';

/**
 * 倒T形物品
 */
export class ItemTShapeInverted extends BaseItem {
  constructor() {
    super(
      'item_t_shape_inverted',
      '倒T形物品',
      ItemShapes.T_SHAPE_INVERTED,
      ItemColors.CYAN,
      '一个倒T形的物品',
      ItemType.PROP
    );
  }
}
