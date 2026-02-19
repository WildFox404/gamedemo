import { BaseItem, ItemType } from '../BaseItem';
import { ItemShapes, ItemColors } from '../ItemShapes';

/**
 * Z形物品
 */
export class ItemZShape extends BaseItem {
  constructor() {
    super(
      'item_z_shape',
      'Z形物品',
      ItemShapes.Z_SHAPE,
      ItemColors.PINK,
      '一个Z形的物品',
      ItemType.SUMMON
    );
  }
}
