import { Color } from 'cc';

/**
 * 物品形状类型
 * 二维数组，1表示占用，0表示不占用
 * 例如：[[1,1],[1,1]] 表示2x2的正方形
 */
export type ItemShape = number[][];

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
  public readonly type: string;

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

  constructor(
    id: string,
    name: string,
    shape: ItemShape,
    color: Color,
    description: string = '',
    type: string = 'default',
    anchorRow: number = 0,
    anchorCol: number = 0
  ) {
    this.id = id;
    this.name = name;
    this.shape = shape;
    this.color = color;
    this.description = description;
    this.type = type;
    // 确保锚点在有效范围内
    this.anchorRow = Math.max(0, Math.min(anchorRow, shape.length - 1));
    this.anchorCol = Math.max(0, Math.min(anchorCol, shape.length > 0 ? shape[0].length - 1 : 0));
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
    });
  }
}
