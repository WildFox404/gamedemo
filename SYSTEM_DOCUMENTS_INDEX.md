# 系统文档索引

本索引汇总当前项目的“游戏设定”和“系统说明”文档，按阅读顺序组织。

## 1) 游戏设定

- `GAME_SETTINGS_SUMMARY.md`
  - 核心玩法与目标
  - 关键信息结构（网格、物品、星星、类型）
  - 交互规则总览

## 2) 玩法系统

- `SYSTEM_WAREHOUSE_DRAG_JUNK.md`
  - 仓库网格、拖拽放置、杂物区物理堆积
  - 坐标转换与落点判定
  - 放置成功/失败/回退流程

- `SYSTEM_ITEM_STAR_INFO.md`
  - 物品系统（BaseItem、ItemShapes、ItemFactory）
  - 星星格（2）语义与联动判定
  - 功能属性（feature）与类型条件联动
  - 介绍框显示逻辑

## 3) 战斗扩展系统

- `SYSTEM_COMBAT_BUFF.md`
  - Buff 类型与叠层规则
  - 攻速/命中/吸血结算
  - 接入攻击流程示例

## 4) 历史设计文档

- `GAME_DESIGN.md`
  - 早期总体技术设计（包含坐标修复计划）
  - 部分参数与当前实现有差异（例如仓库尺寸、星星机制）

- `ITEM_SYSTEM.md`
  - 物品系统介绍文档（较早版本）
  - 当前可结合 `SYSTEM_ITEM_STAR_INFO.md` 对照阅读
