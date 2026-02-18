import { BaseItem, ItemShape } from './BaseItem';
import { Color } from 'cc';

/**
 * 预定义的物品形状
 */
export class ItemShapes {
  /**
   * 1. 2x2 正方形
   * [[1,1],
   *  [1,1]]
   */
  static readonly SQUARE_2X2: ItemShape = [
    [1, 1],
    [1, 1],
  ];

  /**
   * 2. L形（缺一角的矩形）
   * [[1,1],
   *  [1,1],
   *  [1,0]]
   */
  static readonly L_SHAPE_1: ItemShape = [
    [1, 1],
    [1, 1],
    [1, 0],
  ];

  /**
   * 3. 反L形
   * [[1,1],
   *  [1,1],
   *  [0,1]]
   */
  static readonly L_SHAPE_2: ItemShape = [
    [1, 1],
    [1, 1],
    [0, 1],
  ];

  /**
   * 4. 长条（横向3格）
   * [[1,1,1]]
   */
  static readonly BAR_HORIZONTAL_3: ItemShape = [
    [1, 1, 1],
  ];

  /**
   * 5. 长条（纵向3格）
   * [[1],
   *  [1],
   *  [1]]
   */
  static readonly BAR_VERTICAL_3: ItemShape = [
    [1],
    [1],
    [1],
  ];

  /**
   * 6. T形
   * [[1,1,1],
   *  [0,1,0]]
   */
  static readonly T_SHAPE: ItemShape = [
    [1, 1, 1],
    [0, 1, 0],
  ];

  /**
   * 7. 倒T形
   * [[0,1,0],
   *  [1,1,1]]
   */
  static readonly T_SHAPE_INVERTED: ItemShape = [
    [0, 1, 0],
    [1, 1, 1],
  ];

  /**
   * 8. Z形
   * [[1,1,0],
   *  [0,1,1]]
   */
  static readonly Z_SHAPE: ItemShape = [
    [1, 1, 0],
    [0, 1, 1],
  ];

  /**
   * 9. 反Z形
   * [[0,1,1],
   *  [1,1,0]]
   */
  static readonly Z_SHAPE_INVERTED: ItemShape = [
    [0, 1, 1],
    [1, 1, 0],
  ];

  /**
   * 10. 单格
   * [[1]]
   */
  static readonly SINGLE: ItemShape = [
    [1],
  ];

  /**
   * 11. 直线（横向4格）
   * [[1,1,1,1]]
   */
  static readonly BAR_HORIZONTAL_4: ItemShape = [
    [1, 1, 1, 1],
  ];

  /**
   * 12. 直线（纵向4格）
   * [[1],
   *  [1],
   *  [1],
   *  [1]]
   */
  static readonly BAR_VERTICAL_4: ItemShape = [
    [1],
    [1],
    [1],
    [1],
  ];
}

/**
 * 预定义的颜色
 */
export class ItemColors {
  static readonly RED = new Color(255, 100, 100, 255);
  static readonly BLUE = new Color(100, 150, 255, 255);
  static readonly GREEN = new Color(100, 255, 150, 255);
  static readonly YELLOW = new Color(255, 255, 100, 255);
  static readonly PURPLE = new Color(200, 100, 255, 255);
  static readonly ORANGE = new Color(255, 180, 100, 255);
  static readonly CYAN = new Color(100, 255, 255, 255);
  static readonly PINK = new Color(255, 150, 200, 255);
  static readonly BROWN = new Color(180, 140, 100, 255);
  static readonly GRAY = new Color(150, 150, 150, 255);
}
