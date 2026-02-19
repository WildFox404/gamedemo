export enum BuffType {
  LIFE_STEAL = 'life_steal',
  HASTE = 'haste',
  FREEZE = 'freeze',
  BLIND = 'blind',
  LUCKY = 'lucky',
}

export interface CombatStats {
  maxHp: number;
  currentHp: number;
  baseAttackSpeed: number;
  /** 命中率范围 0~1，例如 0.8 表示 80% */
  baseHitChance: number;
}

export interface AttackBuffResult {
  healApplied: number;
  currentHp: number;
  attackSpeed: number;
  hitChance: number;
}

/**
 * Buff 系统（支持叠层）
 *
 * 规则：
 * - 吸血：每次攻击回复 = 吸血层数，且不超过武器伤害，也不超过缺失生命
 * - 急速：每层 +2% 攻速
 * - 冰冻：每层 -2% 攻速
 * - 致盲：每层 -2% 命中率
 * - 幸运：每层 +2% 命中率
 */
export class BuffSystem {
  private static readonly PERCENT_PER_STACK = 0.02;
  private readonly _stacks = new Map<BuffType, number>();
  private _stats: CombatStats;

  constructor(initialStats: CombatStats) {
    this._stats = {
      maxHp: Math.max(1, initialStats.maxHp),
      currentHp: Math.max(0, Math.min(initialStats.currentHp, initialStats.maxHp)),
      baseAttackSpeed: Math.max(0, initialStats.baseAttackSpeed),
      baseHitChance: BuffSystem.clamp01(initialStats.baseHitChance),
    };
  }

  public getStats(): CombatStats {
    return { ...this._stats };
  }

  public setCurrentHp(hp: number): void {
    this._stats.currentHp = Math.max(0, Math.min(hp, this._stats.maxHp));
  }

  public addBuff(type: BuffType, stacks: number = 1): void {
    if (stacks <= 0) {
      return;
    }
    this._stacks.set(type, this.getBuffStacks(type) + stacks);
  }

  public removeBuff(type: BuffType, stacks: number = 1): void {
    if (stacks <= 0) {
      return;
    }
    const next = this.getBuffStacks(type) - stacks;
    if (next <= 0) {
      this._stacks.delete(type);
      return;
    }
    this._stacks.set(type, next);
  }

  public clearBuff(type: BuffType): void {
    this._stacks.delete(type);
  }

  public clearAllBuffs(): void {
    this._stacks.clear();
  }

  public getBuffStacks(type: BuffType): number {
    return this._stacks.get(type) ?? 0;
  }

  public getAttackSpeed(): number {
    const haste = this.getBuffStacks(BuffType.HASTE);
    const freeze = this.getBuffStacks(BuffType.FREEZE);
    const ratio = 1 + (haste - freeze) * BuffSystem.PERCENT_PER_STACK;
    return Math.max(0, this._stats.baseAttackSpeed * ratio);
  }

  public getHitChance(): number {
    const lucky = this.getBuffStacks(BuffType.LUCKY);
    const blind = this.getBuffStacks(BuffType.BLIND);
    const delta = (lucky - blind) * BuffSystem.PERCENT_PER_STACK;
    return BuffSystem.clamp01(this._stats.baseHitChance + delta);
  }

  /**
   * 攻击事件结算（在你的攻击命中或触发攻击时调用）
   * @param weaponDamage 武器伤害
   */
  public onAttack(weaponDamage: number): AttackBuffResult {
    const lifeStealStacks = this.getBuffStacks(BuffType.LIFE_STEAL);
    const damageLimit = Math.max(0, weaponDamage);
    const missingHp = Math.max(0, this._stats.maxHp - this._stats.currentHp);
    const healApplied = Math.min(lifeStealStacks, damageLimit, missingHp);
    this._stats.currentHp += healApplied;

    return {
      healApplied,
      currentHp: this._stats.currentHp,
      attackSpeed: this.getAttackSpeed(),
      hitChance: this.getHitChance(),
    };
  }

  private static clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
  }
}
