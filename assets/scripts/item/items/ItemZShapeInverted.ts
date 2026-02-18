import { BaseItem, ItemType } from '../BaseItem';
import { ItemShapes, ItemColors } from '../ItemShapes';

/**
 * 反Z形物品
 */
export class ItemZShapeInverted extends BaseItem {
  constructor() {
    super(
      'item_z_shape_inverted',
      '反Z形物品',
      ItemShapes.Z_SHAPE_INVERTED,
      ItemColors.BROWN,
      '一个反Z形的物品',
      ItemType.PROP
    );
  }
}
