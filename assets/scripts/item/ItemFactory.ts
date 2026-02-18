import { BaseItem } from './BaseItem';
import { ItemSquare2x2 } from './items/ItemSquare2x2';
import { ItemLShape1 } from './items/ItemLShape1';
import { ItemLShape2 } from './items/ItemLShape2';
import { ItemBarHorizontal3 } from './items/ItemBarHorizontal3';
import { ItemBarVertical3 } from './items/ItemBarVertical3';
import { ItemTShape } from './items/ItemTShape';
import { ItemTShapeInverted } from './items/ItemTShapeInverted';
import { ItemZShape } from './items/ItemZShape';
import { ItemZShapeInverted } from './items/ItemZShapeInverted';
import { ItemSingle } from './items/ItemSingle';

/**
 * 物品工厂类
 * 用于创建和管理所有物品实例
 */
export class ItemFactory {
  private static _instance: ItemFactory | null = null;
  private _itemRegistry: Map<string, () => BaseItem> = new Map();

  private constructor() {
    this.registerAllItems();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ItemFactory {
    if (!ItemFactory._instance) {
      ItemFactory._instance = new ItemFactory();
    }
    return ItemFactory._instance;
  }

  /**
   * 注册所有物品类型
   */
  private registerAllItems(): void {
    // 注册10种物品
    this.registerItem('item_square_2x2', () => new ItemSquare2x2());
    this.registerItem('item_l_shape_1', () => new ItemLShape1());
    this.registerItem('item_l_shape_2', () => new ItemLShape2());
    this.registerItem('item_bar_horizontal_3', () => new ItemBarHorizontal3());
    this.registerItem('item_bar_vertical_3', () => new ItemBarVertical3());
    this.registerItem('item_t_shape', () => new ItemTShape());
    this.registerItem('item_t_shape_inverted', () => new ItemTShapeInverted());
    this.registerItem('item_z_shape', () => new ItemZShape());
    this.registerItem('item_z_shape_inverted', () => new ItemZShapeInverted());
    this.registerItem('item_single', () => new ItemSingle());
  }

  /**
   * 注册一个物品类型
   */
  public registerItem(id: string, factory: () => BaseItem): void {
    this._itemRegistry.set(id, factory);
  }

  /**
   * 根据ID创建物品
   */
  public createItem(id: string): BaseItem | null {
    const factory = this._itemRegistry.get(id);
    if (factory) {
      return factory();
    }
    console.warn(`物品ID "${id}" 未注册`);
    return null;
  }

  /**
   * 创建所有物品的实例
   */
  public createAllItems(): BaseItem[] {
    const items: BaseItem[] = [];
    for (const [id, factory] of this._itemRegistry) {
      const item = factory();
      if (item) {
        items.push(item);
      }
    }
    return items;
  }

  /**
   * 获取所有已注册的物品ID
   */
  public getAllItemIds(): string[] {
    return Array.from(this._itemRegistry.keys());
  }

  /**
   * 检查物品ID是否存在
   */
  public hasItem(id: string): boolean {
    return this._itemRegistry.has(id);
  }

  /**
   * 获取物品数量
   */
  public getItemCount(): number {
    return this._itemRegistry.size;
  }

  /**
   * 随机创建一个物品
   */
  public createRandomItem(): BaseItem | null {
    const allItemIds = this.getAllItemIds();
    if (allItemIds.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * allItemIds.length);
    return this.createItem(allItemIds[randomIndex]);
  }

  /**
   * 随机创建多个不同的物品
   * @param count 要创建的数量
   * @returns 物品数组
   */
  public createRandomItems(count: number): BaseItem[] {
    const allItemIds = this.getAllItemIds();
    if (allItemIds.length === 0) {
      return [];
    }

    const items: BaseItem[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < count && i < allItemIds.length; i++) {
      let randomIndex: number;
      do {
        randomIndex = Math.floor(Math.random() * allItemIds.length);
      } while (usedIndices.has(randomIndex) && usedIndices.size < allItemIds.length);

      usedIndices.add(randomIndex);
      const item = this.createItem(allItemIds[randomIndex]);
      if (item) {
        items.push(item);
      }
    }

    // 如果物品数量不足，允许重复
    while (items.length < count) {
      const randomIndex = Math.floor(Math.random() * allItemIds.length);
      const item = this.createItem(allItemIds[randomIndex]);
      if (item) {
        items.push(item);
      }
    }

    return items;
  }
}
