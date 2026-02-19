import { Color } from 'cc';

/**
 * 物品形状类型
 * 二维数组：
 * - 0 表示空
 * - 1 表示占用仓库格子
 * - 2 表示星星格（用于联动，不占用仓库格子）
 */
export type ItemShape = Array<Array<0 | 1 | 2>>;

/**
 * 物品类型枚举
 */
export enum ItemType {
  /** 道具类 */
  PROP = 'prop',
  /** 召唤物类 */
  SUMMON = 'summon',
  /** 食物类 */
  FOOD = 'food',
}

/**
 * 物品基类
 * 所有物品都应该继承此类
 */
export class BaseItem {
  /**
   * 物品唯一ID
   */
  public readonly id: string;

  /**
   * 物品名称
   */
  public readonly name: string;

  /**
   * 物品形状（二维数组，1表示占用，0表示不占用）
   * 形状以左上角为原点，向下向右扩展
   */
  public readonly shape: ItemShape;

  /**
   * 物品颜色（用于显示）
   */
  public readonly color: Color;

  /**
   * 物品描述
   */
  public readonly description: string;

  /**
   * 物品类型（用于分类）
   */
  public readonly type: ItemType;

  /**
   * 物品功能描述（用于介绍展示）
   */
  public readonly feature: string;

  /**
   * 星星联动目标类型限制（为空表示不限制）
   */
  public readonly starRequiredNeighborType: ItemType | null;

  /**
   * 锚点行（相对于形状的左上角，用于确定放置位置）
   * 默认0，表示左上角第一个方块
   */
  public readonly anchorRow: number;

  /**
   * 锚点列（相对于形状的左上角，用于确定放置位置）
   * 默认0，表示左上角第一个方块
   */
  public readonly anchorCol: number;

  /**
   * 物品宽度（形状的列数）
   */
  public get width(): number {
    return this.shape.length > 0 ? this.shape[0].length : 0;
  }

  /**
   * 物品高度（形状的行数）
   */
  public get height(): number {
    return this.shape.length;
  }

  /**
   * 物品占用的格子数量
   */
  public get cellCount(): number {
    let count = 0;
    for (const row of this.shape) {
      for (const cell of row) {
        if (cell === 1) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * 星星格数量（值为2的格子）
   */
  public get starCount(): number {
    let count = 0;
    for (const row of this.shape) {
      for (const cell of row) {
        if (cell === 2) {
          count++;
        }
      }
    }
    return count;
  }

  constructor(
    id: string,
    name: string,
    shape: ItemShape,
    color: Color,
    description: string = '',
    type: ItemType = ItemType.PROP,
    feature: string = '',
    starRequiredNeighborType: ItemType | null = null,
    anchorRow: number = 0,
    anchorCol: number = 0
  ) {
    this.id = id;
    this.name = name;
    this.shape = shape;
    this.color = color;
    this.description = description;
    this.type = type;
    this.feature = feature;
    this.starRequiredNeighborType = starRequiredNeighborType;
    // 确保锚点在有效范围内
    this.anchorRow = Math.max(0, Math.min(anchorRow, shape.length - 1));
    this.anchorCol = Math.max(0, Math.min(anchorCol, shape.length > 0 ? shape[0].length - 1 : 0));
  }

  /**
   * 判断目标物品是否满足星星联动条件。
   * 未设置 starRequiredNeighborType 表示该物品星星无联动功能，一律不生效（灰色）。
   */
  public canStarLinkTo(target: BaseItem): boolean {
    if (!this.starRequiredNeighborType) {
      return false;
    }
    return target.type === this.starRequiredNeighborType;
  }

  /**
   * 获取形状中所有占用的位置（相对于左上角）
   * @returns 位置数组，每个位置为 [row, col]
   */
  public getOccupiedPositions(): Array<[number, number]> {
    const positions: Array<[number, number]> = [];
    for (let row = 0; row < this.shape.length; row++) {
      for (let col = 0; col < this.shape[row].length; col++) {
        if (this.shape[row][col] === 1) {
          positions.push([row, col]);
        }
      }
    }
    return positions;
  }

  /**
   * 获取形状中所有星星格的位置（相对于左上角）
   * @returns 位置数组，每个位置为 [row, col]
   */
  public getStarPositions(): Array<[number, number]> {
    const positions: Array<[number, number]> = [];
    for (let row = 0; row < this.shape.length; row++) {
      for (let col = 0; col < this.shape[row].length; col++) {
        if (this.shape[row][col] === 2) {
          positions.push([row, col]);
        }
      }
    }
    return positions;
  }

  /**
   * 检查指定位置是否被占用（相对于物品左上角）
   * @param row 行索引
   * @param col 列索引
   * @returns 是否占用
   */
  public isOccupied(row: number, col: number): boolean {
    if (row < 0 || row >= this.shape.length) {
      return false;
    }
    if (col < 0 || col >= this.shape[row].length) {
      return false;
    }
    return this.shape[row][col] === 1;
  }

  /**
   * 检查指定位置是否为星星格（相对于物品左上角）
   */
  public isStar(row: number, col: number): boolean {
    if (row < 0 || row >= this.shape.length) {
      return false;
    }
    if (col < 0 || col >= this.shape[row].length) {
      return false;
    }
    return this.shape[row][col] === 2;
  }

  /**
   * 检查是否为可交互格（占用格或星星格）
   */
  public isInteractiveCell(row: number, col: number): boolean {
    if (row < 0 || row >= this.shape.length) {
      return false;
    }
    if (col < 0 || col >= this.shape[row].length) {
      return false;
    }
    return this.shape[row][col] !== 0;
  }

  /**
   * 旋转物品形状（顺时针90度）
   * @returns 旋转后的新形状
   */
  public rotateClockwise(): ItemShape {
    const rows = this.shape.length;
    const cols = this.shape[0]?.length || 0;
    const rotated: ItemShape = [];

    // 创建旋转后的数组
    for (let col = 0; col < cols; col++) {
      rotated[col] = [];
      for (let row = rows - 1; row >= 0; row--) {
        rotated[col].push(this.shape[row][col]);
      }
    }

    return rotated;
  }

  /**
   * 创建物品的副本
   */
  public clone(): BaseItem {
    return new BaseItem(
      this.id,
      this.name,
      this.shape.map(row => [...row]),
      new Color(this.color.r, this.color.g, this.color.b, this.color.a),
      this.description,
      this.type,
      this.feature,
      this.starRequiredNeighborType,
      this.anchorRow,
      this.anchorCol
    );
  }

  /**
   * 转换为JSON字符串（用于序列化）
   */
  public toJSON(): string {
    return JSON.stringify({
      id: this.id,
      name: this.name,
      shape: this.shape,
      color: {
        r: this.color.r,
        g: this.color.g,
        b: this.color.b,
        a: this.color.a,
      },
      description: this.description,
      type: this.type,
      feature: this.feature,
      starRequiredNeighborType: this.starRequiredNeighborType,
    });
  }
}
