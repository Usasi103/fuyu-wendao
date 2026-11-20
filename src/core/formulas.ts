import { BLOODLINES } from '../data/bloodlines';
import { BUILDINGS } from '../data/buildings';
import { COMPANIONS } from '../data/companions';
import { CULTIVATION_ARTS } from '../data/cultivationArts';
import { ROGUELITE_RELICS } from '../data/exploration';
import { QUALITY_CONFIG, REALM_TIERS } from '../data/realms';
import {
  BuildingId,
  BuildingState,
  CombatStats,
  CompanionConfig,
  CompanionState,
  EquipSlot,
  EquipmentItem,
  QualityTier,
  SubStatKey,
} from './types';

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function getRealmDisplay(tierIndex: number, subLevel: number): string {
  const tier = REALM_TIERS[clamp(tierIndex, 0, REALM_TIERS.length - 1)];
  return `${tier.name}${subLevel}层`;
}

/**
 * 渐进式功能解锁判定（避免前期所有玩法一股脑全开）
 */
export function getUnlockStatus(realmTier: number, realmSub: number, highestStageCleared: number, treeLevel: number) {
  return {
    springPool: realmTier >= 1 || realmSub >= 3 || highestStageCleared >= 2,
    herbFarm: realmTier >= 1 || realmSub >= 4 || highestStageCleared >= 2,
    companions: highestStageCleared >= 2 || realmTier >= 1,
    alchemyFurnace: realmTier >= 1 || highestStageCleared >= 3,
    forge: highestStageCleared >= 4 || realmTier >= 1,
    thunderTower: highestStageCleared >= 3 || realmTier >= 1,
    autoChop: realmTier >= 1 && treeLevel >= 3,
    beastGarden: highestStageCleared >= 5 || realmTier >= 2,
    tower: highestStageCleared >= 5 || realmTier >= 1,
    cultivationArts: realmTier >= 1,
    reforge: highestStageCleared >= 8 || realmTier >= 2,
  };
}

/**
 * 境界基础属性公式
 */
export function calcHeroRealmBaseStats(tierIndex: number, subLevel: number): { maxHp: number; atk: number; def: number; speed: number } {
  const tierMult = Math.pow(2.55, tierIndex);
  const subMult = 1 + 0.12 * (subLevel - 1);
  return {
    maxHp: Math.round(310 * tierMult * subMult),
    atk: Math.round(36 * tierMult * subMult),
    def: Math.round(17 * tierMult * subMult),
    speed: Math.round(100 + tierIndex * 6 + subLevel * 0.8),
  };
}

/**
 * 境界升级所需修为经验公式：5.5^T * 1.22^(s-1)（确保跨大境界严格递增）
 */
export function calcExpRequired(tierIndex: number, subLevel: number): number {
  return Math.round(120 * Math.pow(5.5, tierIndex) * Math.pow(1.22, subLevel - 1));
}

/**
 * 小境界/大境界突破灵石消耗
 */
export function calcBreakthroughStoneCost(tierIndex: number, subLevel: number): number {
  const isMajor = subLevel >= REALM_TIERS[clamp(tierIndex, 0, REALM_TIERS.length - 1)].maxSubLevel;
  const base = 30 * Math.pow(2.4, tierIndex) * Math.pow(1.12, subLevel - 1);
  return Math.round(isMajor ? base * 2.5 : base * 0.6);
}

/**
 * 大境界渡劫成功率计算（基础 38% + 战力达标加成 + 渡劫丹加成，封顶 100%）
 */
export function calcTribulationSuccessRate(
  realmTier: number,
  heroPower: number,
  pillsUsed: number
): { rate: number; recommendedPower: number } {
  const recommendedPower = Math.round(950 * Math.pow(2.75, realmTier));
  const powerRatio = heroPower / Math.max(1, recommendedPower);
  const powerBonus = clamp((powerRatio - 0.6) * 0.55, -0.15, 0.42);
  const pillBonus = Math.min(3, Math.max(0, pillsUsed)) * 0.22;
  const rate = clamp(0.38 + powerBonus + pillBonus, 0.15, 1.0);
  return { rate, recommendedPower };
}

/**
 * 灵树等级对应的装备品质概率分布 (0..6)
 */
export function getTreeQualityProbabilities(treeLevel: number): number[] {
  const maxUnlockedQuality = clamp(Math.floor((treeLevel + 1) / 2) + 1, 1, 6);
  const weights: number[] = [];
  for (let q = 0; q <= 6; q++) {
    if (q > maxUnlockedQuality) {
      weights.push(0);
      continue;
    }
    const center = clamp((treeLevel - 1) * 0.4, 0.15, 5.2);
    const dist = Math.abs(q - center);
    const w = Math.exp(-0.58 * dist * dist) * (q === maxUnlockedQuality ? 0.8 : 1);
    weights.push(w);
  }
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  return weights.map((w) => w / sum);
}

export function calcTreeUpgradeCost(treeLevel: number): number {
  return Math.round(95 * Math.pow(1.56, treeLevel - 1));
}

/**
 * 疯狂水世界式蓝图卡点：2级起升级灵树与仙建需消耗稀缺【仙建蓝图】
 */
export function calcTreeBlueprintCost(treeLevel: number): number {
  return treeLevel >= 1 ? treeLevel : 0;
}

export function calcBuildingBlueprintCost(level: number): number {
  return level >= 1 ? Math.max(1, Math.ceil(level * 0.7)) : 0;
}

/**
 * 推图进度限制灵树与建筑等级上限（不推图无法无限憋在家里满级）
 */
export function calcIslandLevelCap(highestStageCleared: number): number {
  return 2 + Math.floor(highestStageCleared / 2);
}

export function calcCombatPower(
  stats: {
    maxHp: number;
    atk: number;
    def: number;
    speed?: number;
    subStats?: Partial<Record<SubStatKey, number>>;
  },
  levelFactor = 1
): number {
  let subScore = 0;
  if (stats.subStats) {
    for (const [k, v] of Object.entries(stats.subStats)) {
      if (!v) continue;
      const isAnti = k.startsWith('anti');
      subScore += v * (isAnti ? 85 : 130) * levelFactor;
    }
  }
  const spdScore = (stats.speed ?? 0) * 1.5;
  return Math.round(stats.maxHp * 0.28 + stats.atk * 2.4 + stats.def * 1.6 + spdScore + subScore);
}

export function calcEquipPower(item: Omit<EquipmentItem, 'power'>): number {
  const levelFactor = Math.max(1, item.level * 0.65);
  return calcCombatPower(
    {
      maxHp: item.hp,
      atk: item.atk,
      def: item.def,
      speed: item.speed,
      subStats: item.subStats,
    },
    levelFactor
  );
}

export function calcBuildingRatePerSec(id: BuildingId, level: number, stageBonus = 0, hasGarrison = false): number {
  if (level <= 0) return 0;
  const cfg = BUILDINGS[id];
  const stageMult = 1 + stageBonus * 0.05;
  const garrisonMult = hasGarrison ? 1.35 : 1.0;
  return cfg.baseRatePerSec * (1 + 0.28 * (level - 1)) * Math.pow(1.13, level - 1) * stageMult * garrisonMult;
}

export function calcBuildingUpgradeCost(id: BuildingId, level: number): number {
  const cfg = BUILDINGS[id];
  return Math.round(cfg.baseCost * Math.pow(1.46, level));
}

export function calcMaxOfflineSeconds(springPoolLevel: number): number {
  return (12 + Math.max(0, springPoolLevel)) * 3600;
}

/**
 * 主角完整战斗属性汇总（境界基础 + 穿戴装备 + 洞天光环 + 心法殿功法）
 */
export function calcHeroTotalStats(
  realmTier: number,
  realmSub: number,
  equipment: Partial<Record<EquipSlot, EquipmentItem>>,
  buildings: Record<BuildingId, BuildingState>,
  cultivationArts: Record<string, number> = {},
  activeArtId: string | null = null,
  bloodlineLevels: Record<string, number> = {},
  activeBloodlineId: string | null = null,
  activeRelicIds: string[] = [],
  elixirBuffs: { atkBuffTurns?: number; defBuffTurns?: number } = {}
): CombatStats {
  const base = calcHeroRealmBaseStats(realmTier, realmSub);
  const stats: CombatStats = {
    maxHp: base.maxHp,
    atk: base.atk,
    def: base.def,
    speed: base.speed,
    crit: 0.05,
    combo: 0.03,
    dodge: 0.02,
    lifesteal: 0,
    stun: 0,
    antiCrit: 0,
    antiCombo: 0,
    antiDodge: 0,
    antiLifesteal: 0,
    antiStun: 0,
    critDmg: 0,
    critRes: 0,
    dmgBoost: 0,
    dmgReduce: 0,
  };

  for (const item of Object.values(equipment)) {
    if (!item) continue;
    stats.maxHp += item.hp;
    stats.atk += item.atk;
    stats.def += item.def;
    stats.speed += item.speed;
    for (const [k, v] of Object.entries(item.subStats)) {
      if (v && k in stats) {
        (stats as unknown as Record<string, number>)[k] += v;
      }
    }
  }

  let atkPctBonus = (buildings.spiritArray?.level ?? 1) * 0.04;
  let hpPctBonus = (buildings.beastGarden?.level ?? 1) * 0.05;
  let defPctBonus = 0;

  // 心法殿加成：主修心法享受 100% 加成，辅修心法享受 40% 被动加成
  for (const art of CULTIVATION_ARTS) {
    const lv = cultivationArts[art.id] ?? 0;
    if (lv <= 0) continue;
    const mult = activeArtId === art.id ? 1.0 : 0.4;
    if (art.perLevel.atkPct) atkPctBonus += art.perLevel.atkPct * lv * mult;
    if (art.perLevel.hpPct) hpPctBonus += art.perLevel.hpPct * lv * mult;
    if (art.perLevel.defPct) defPctBonus += art.perLevel.defPct * lv * mult;
    if (art.perLevel.speed) stats.speed += Math.round(art.perLevel.speed * lv * mult);
    if (art.perLevel.crit) stats.crit += art.perLevel.crit * lv * mult;
    if (art.perLevel.critDmg) stats.critDmg += art.perLevel.critDmg * lv * mult;
    if (art.perLevel.combo) stats.combo += art.perLevel.combo * lv * mult;
    if (art.perLevel.lifesteal) stats.lifesteal += art.perLevel.lifesteal * lv * mult;
    if (art.perLevel.antiCrit) stats.antiCrit += art.perLevel.antiCrit * lv * mult;
    if (art.perLevel.antiStun) stats.antiStun += art.perLevel.antiStun * lv * mult;
  }

  // 仙脉觉醒加成（寻道大千血脉增减伤系统：主激活 100%，其余 35%）
  for (const bl of BLOODLINES) {
    const lv = bloodlineLevels[bl.id] ?? 0;
    if (lv <= 0) continue;
    const mult = activeBloodlineId === bl.id ? 1.0 : 0.35;
    if (bl.perLevel.dmgBoost) stats.dmgBoost += bl.perLevel.dmgBoost * lv * mult;
    if (bl.perLevel.dmgReduce) stats.dmgReduce += bl.perLevel.dmgReduce * lv * mult;
    if (bl.perLevel.crit) stats.crit += bl.perLevel.crit * lv * mult;
    if (bl.perLevel.combo) stats.combo += bl.perLevel.combo * lv * mult;
    if (bl.perLevel.dodge) stats.dodge += bl.perLevel.dodge * lv * mult;
    if (bl.perLevel.lifesteal) stats.lifesteal += bl.perLevel.lifesteal * lv * mult;
  }

  // 秘境肉鸽赐福词条
  for (const rid of activeRelicIds) {
    const relic = ROGUELITE_RELICS.find((r) => r.id === rid);
    if (!relic) continue;
    if (relic.effect.atkPct) atkPctBonus += relic.effect.atkPct;
    if (relic.effect.hpPct) hpPctBonus += relic.effect.hpPct;
    if (relic.effect.crit) stats.crit += relic.effect.crit;
    if (relic.effect.combo) stats.combo += relic.effect.combo;
    if (relic.effect.lifesteal) stats.lifesteal += relic.effect.lifesteal;
    if (relic.effect.dmgBoost) stats.dmgBoost += relic.effect.dmgBoost;
  }

  // 炼丹增益丹药
  if ((elixirBuffs.atkBuffTurns ?? 0) > 0) {
    atkPctBonus += 0.25;
    stats.crit += 0.12;
  }
  if ((elixirBuffs.defBuffTurns ?? 0) > 0) {
    defPctBonus += 0.25;
    stats.dmgReduce += 0.15;
  }

  stats.atk = Math.round(stats.atk * (1 + atkPctBonus));
  stats.maxHp = Math.round(stats.maxHp * (1 + hpPctBonus));
  stats.def = Math.round(stats.def * (1 + defPctBonus));

  return stats;
}

export function calcBloodlineUpgradeCost(currentLevel: number): { dust: number; stones: number } {
  return {
    dust: Math.round(18 * Math.pow(1.42, currentLevel)),
    stones: Math.round(60 * Math.pow(1.45, currentLevel)),
  };
}

export function calcArtUpgradeCost(baseCost: number, currentLevel: number): number {
  return Math.round(baseCost * Math.pow(1.48, currentLevel));
}

export function calcCompanionStats(
  config: CompanionConfig,
  state: CompanionState,
  buildings: Record<BuildingId, BuildingState>
): CombatStats {
  const lvMult = Math.pow(1.16, state.level - 1) * (1 + 0.12 * (state.level - 1));
  const starMult = 1 + (state.star - 1) * 0.22;
  const atkAura = 1 + (buildings.spiritArray?.level ?? 1) * 0.04;
  const hpAura = 1 + (buildings.beastGarden?.level ?? 1) * 0.05;

  return {
    maxHp: Math.round(config.baseHp * lvMult * starMult * hpAura),
    atk: Math.round(config.baseAtk * lvMult * starMult * atkAura),
    def: Math.round(config.baseDef * lvMult * starMult),
    speed: Math.round(config.baseSpeed + state.level * 0.5),
    crit: config.role === 'dps' ? 0.12 : 0.05,
    combo: config.specialEffect === 'multiHit' ? 0.14 : 0.04,
    dodge: config.role === 'control' ? 0.1 : 0.03,
    lifesteal: 0,
    stun: config.specialEffect === 'stun' ? 0.24 : 0,
    antiCrit: config.role === 'tank' ? 0.12 : 0,
    antiCombo: config.role === 'tank' ? 0.1 : 0,
    antiDodge: 0.05,
    antiLifesteal: 0,
    antiStun: config.role === 'tank' ? 0.15 : 0,
    critDmg: 0,
    critRes: 0,
    dmgBoost: config.role === 'dps' ? 0.05 : 0,
    dmgReduce: config.role === 'tank' ? 0.08 : 0,
  };
}

export function calcCompanionFoodCost(level: number): number {
  return Math.round(22 * Math.pow(1.3, level - 1));
}

export function getCompanionConfig(id: string): CompanionConfig | undefined {
  return COMPANIONS.find((c) => c.id === id);
}

export function calcMitigatedDamage(
  atk: number,
  def: number,
  skillRatio = 1,
  attackerDmgBoost = 0,
  defenderDmgReduce = 0
): number {
  const raw = atk * skillRatio;
  const mitigation = atk / (atk + Math.max(0, def) * 1.25);
  const baseDmg = Math.max(raw * 0.08, raw * mitigation);
  const specialMult = clamp(1 + attackerDmgBoost - defenderDmgReduce, 0.25, 3.0);
  return baseDmg * specialMult;
}

export function calcEffectiveRate(attackerRate: number, defenderAntiRate: number): number {
  return clamp(attackerRate - defenderAntiRate, 0, 0.8);
}

export function calcCritMultiplier(attackerCritDmg: number, defenderCritRes: number): number {
  return Math.max(1.25, 1.65 + attackerCritDmg - defenderCritRes);
}

/**
 * 关卡怪物强度曲线（调陡梯度，让精英关与 Boss 关产生真实压迫感）
 */
export function calcStageBaseScale(stage: number): { hp: number; atk: number; def: number; speed: number } {
  const s = Math.max(1, stage);
  const scale = Math.pow(1.23, s - 1) * (1 + (s - 1) * 0.1);
  return {
    hp: Math.round(230 * scale),
    atk: Math.round(26 * scale),
    def: Math.round(12 * scale),
    speed: Math.round(94 + s * 1.5),
  };
}

export function getQualityLabel(q: QualityTier): string {
  return QUALITY_CONFIG[q].name;
}
