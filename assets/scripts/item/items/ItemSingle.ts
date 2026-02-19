import { BaseItem, ItemType } from '../BaseItem';
import { ItemShapes, ItemColors } from '../ItemShapes';

/**
 * 单格物品
 */
export class ItemSingle extends BaseItem {
  constructor() {
    super(
      'item_single',
      '单格物品',
      ItemShapes.SINGLE,
      ItemColors.GRAY,
      '一个单格的物品',
      ItemType.SUMMON
    );
  }
}
