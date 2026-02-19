# 系统说明：战斗 Buff（扩展模块）

## 1. 相关代码

- `assets/scripts/combat/BuffSystem.ts`
- `assets/scripts/combat/CombatEntity.ts`
- `assets/scripts/combat/index.ts`

> 说明：该模块已实现为独立通用逻辑，当前未深度接入主玩法循环。

## 2. Buff 类型

- `LIFE_STEAL`：吸血
- `HASTE`：急速
- `FREEZE`：冰冻
- `BLIND`：致盲
- `LUCKY`：幸运

## 3. 数值规则

### 3.1 吸血

- 每次攻击回复值 = 吸血层数
- 且受上限约束：
  - 不超过本次武器伤害
  - 不超过当前缺失生命

### 3.2 攻速

- 急速每层 +2%
- 冰冻每层 -2%
- 最终攻速 = `baseAttackSpeed * (1 + (haste-freeze)*0.02)`

### 3.3 命中率

- 幸运每层 +2%
- 致盲每层 -2%
- 最终命中率会被夹在 `[0,1]`

## 4. 对外接口

`BuffSystem` 提供：

- `addBuff(type, stacks)`
- `removeBuff(type, stacks)`
- `clearBuff(type)` / `clearAllBuffs()`
- `getBuffStacks(type)`
- `getAttackSpeed()`
- `getHitChance()`
- `onAttack(weaponDamage)`（返回本次结算结果）

`CombatEntity` 提供示例封装：

- `addBuff(...)`
- `attack(weaponDamage)`
- `getCurrentHp()` / `getAttackSpeed()` / `getHitChance()`

## 5. 接入建议

将其接入主玩法时，推荐流程：

1. 放置/联动变化后，汇总星星与连锁结果
2. 映射为 Buff 叠层变化（例如链路数 -> 急速层）
3. 在攻击事件触发时调用 `onAttack(...)` 进行最终结算
4. 将结算结果同步到 UI（血量、攻速、命中显示）
