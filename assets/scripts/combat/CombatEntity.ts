import { BuffSystem, BuffType, CombatStats, AttackBuffResult } from './BuffSystem';

/**
 * 示例战斗实体：
 * - 管理生命、攻速、命中率
 * - 提供攻击事件入口，内部触发 Buff 结算
 */
export class CombatEntity {
  private readonly _buffSystem: BuffSystem;

  constructor(stats: CombatStats) {
    this._buffSystem = new BuffSystem(stats);
  }

  public get buffSystem(): BuffSystem {
    return this._buffSystem;
  }

  public addBuff(type: BuffType, stacks: number = 1): void {
    this._buffSystem.addBuff(type, stacks);
  }

  public attack(weaponDamage: number): AttackBuffResult {
    return this._buffSystem.onAttack(weaponDamage);
  }

  public getCurrentHp(): number {
    return this._buffSystem.getStats().currentHp;
  }

  public getAttackSpeed(): number {
    return this._buffSystem.getAttackSpeed();
  }

  public getHitChance(): number {
    return this._buffSystem.getHitChance();
  }
}
