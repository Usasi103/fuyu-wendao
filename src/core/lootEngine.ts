import { QUALITY_CONFIG, SLOT_META } from '../data/realms';
import { calcEquipPower, clamp, getTreeQualityProbabilities } from './formulas';
import { EquipSlot, EquipmentItem, QualityTier, SubStatKey } from './types';

const ALL_SLOTS: EquipSlot[] = ['weapon', 'robe', 'crown', 'jade', 'ring', 'boots'];
const ALL_SUB_STATS: SubStatKey[] = [
  'crit',
  'combo',
  'dodge',
  'lifesteal',
  'stun',
  'antiCrit',
  'antiCombo',
  'antiDodge',
  'antiLifesteal',
  'antiStun',
];

let uidCounter = 1;
function nextEquipId(): string {
  uidCounter += 1;
  return `eq_${Date.now().toString(36)}_${uidCounter}`;
}

export function rollQuality(treeLevel: number, pityCounter: number): { quality: QualityTier; nextPity: number } {
  const probs = getTreeQualityProbabilities(treeLevel);
  const maxUnlocked = clamp(Math.floor((treeLevel + 1) / 2) + 1, 1, 6) as QualityTier;

  if (pityCounter >= 19) {
    const guaranteed = clamp(maxUnlocked - 1, 1, 6) as QualityTier;
    return { quality: guaranteed, nextPity: 0 };
  }

  const r = Math.random();
  let acc = 0;
  let chosen: QualityTier = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i];
    if (r <= acc) {
      chosen = i as QualityTier;
      break;
    }
  }

  const pityThreshold = Math.max(1, maxUnlocked - 1);
  const nextPity = chosen >= pityThreshold ? 0 : pityCounter + 1;
  return { quality: chosen, nextPity };
}

function rollSubStats(quality: QualityTier): Partial<Record<SubStatKey, number>> {
  const qCfg = QUALITY_CONFIG[quality];
  const subStats: Partial<Record<SubStatKey, number>> = {};
  const availableKeys = [...ALL_SUB_STATS];
  for (let i = 0; i < qCfg.subStatCount; i++) {
    if (availableKeys.length === 0) break;
    const pickIdx = Math.floor(Math.random() * availableKeys.length);
    const key = availableKeys.splice(pickIdx, 1)[0];
    const [minR, maxR] = qCfg.subStatRange;
    const raw = minR + Math.random() * (maxR - minR);
    subStats[key] = Math.round(raw * 1000) / 1000;
  }
  return subStats;
}

export function generateEquipment(
  heroTotalLevel: number,
  treeLevel: number,
  pityCounter: number,
  forcedSlot?: EquipSlot
): { item: EquipmentItem; nextPity: number } {
  const { quality, nextPity } = rollQuality(treeLevel, pityCounter);
  const slot = forcedSlot ?? ALL_SLOTS[Math.floor(Math.random() * ALL_SLOTS.length)];
  const meta = SLOT_META[slot];
  const qCfg = QUALITY_CONFIG[quality];

  const levelScale = Math.pow(1.095, heroTotalLevel - 1) * (1 + 0.08 * (heroTotalLevel - 1));
  const jitter = () => 0.92 + Math.random() * 0.16;

  const atk = Math.round(14 * levelScale * qCfg.mult * meta.atkWeight * jitter());
  const hp = Math.round(85 * levelScale * qCfg.mult * meta.hpWeight * jitter());
  const def = Math.round(6 * levelScale * qCfg.mult * meta.defWeight * jitter());
  const speed = Math.max(1, Math.round((2 + heroTotalLevel * 0.35) * (0.7 + quality * 0.18) * meta.spdWeight));
  const subStats = rollSubStats(quality);

  const prefix = meta.prefixes[Math.floor(Math.random() * meta.prefixes.length)];
  const noun = meta.nouns[Math.floor(Math.random() * meta.nouns.length)];
  const name = `${prefix}${noun}`;

  const draft: Omit<EquipmentItem, 'power'> = {
    id: nextEquipId(),
    name,
    slot,
    quality,
    level: heroTotalLevel,
    atk,
    hp,
    def,
    speed,
    subStats,
  };

  return {
    item: {
      ...draft,
      power: calcEquipPower(draft),
    },
    nextPity,
  };
}

/**
 * 法宝洗练：保留品质、主属性与等级，重铸所有流派副词条
 */
export function reforgeItemSubStats(item: EquipmentItem): EquipmentItem {
  const newSubs = rollSubStats(item.quality);
  const draft: Omit<EquipmentItem, 'power'> = {
    ...item,
    subStats: newSubs,
  };
  return {
    ...draft,
    power: calcEquipPower(draft),
  };
}

export function calcDecomposeRewards(item: EquipmentItem, alchemyLevel: number): { exp: number; spiritStones: number } {
  const qBonus = Math.pow(1.42, item.quality);
  const expMult = 1 + alchemyLevel * 0.07;
  const exp = Math.round((12 + item.level * 4) * qBonus * expMult);
  const spiritStones = Math.round((7 + item.level * 2.5) * qBonus);
  return { exp, spiritStones };
}
