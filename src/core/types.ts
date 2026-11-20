import { ElementType } from '../data/elements';
import { HerbId } from '../data/alchemyAndForge';

export type EquipSlot = 'weapon' | 'robe' | 'crown' | 'jade' | 'ring' | 'boots';

export type QualityTier = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type SubStatKey =
  | 'crit'
  | 'combo'
  | 'dodge'
  | 'lifesteal'
  | 'stun'
  | 'antiCrit'
  | 'antiCombo'
  | 'antiDodge'
  | 'antiLifesteal'
  | 'antiStun';

export interface CombatStats {
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  crit: number;
  combo: number;
  dodge: number;
  lifesteal: number;
  stun: number;
  antiCrit: number;
  antiCombo: number;
  antiDodge: number;
  antiLifesteal: number;
  antiStun: number;
  critDmg: number;
  critRes: number;
  dmgBoost: number; // 最终增伤%（寻道大千第一梯队属性）
  dmgReduce: number; // 最终减伤%（寻道大千第一梯队属性）
}

export interface EquipmentItem {
  id: string;
  name: string;
  slot: EquipSlot;
  quality: QualityTier;
  level: number;
  atk: number;
  hp: number;
  def: number;
  speed: number;
  subStats: Partial<Record<SubStatKey, number>>;
  power: number;
}

export type BuildingId =
  | 'spiritArray'
  | 'springPool'
  | 'alchemyFurnace'
  | 'beastGarden'
  | 'herbFarm'
  | 'forge'
  | 'thunderTower';

export interface SandboxTile {
  x: number;
  y: number;
  unlocked: boolean;
  terrain: 'grass' | 'spirit' | 'farm';
  buildingId: BuildingId | 'spiritTree' | null;
}

export interface DiscipleState {
  id: string;
  name: string;
  role: 'gather' | 'alchemy' | 'guard';
  level: number;
  x: number; // 实时沙盘像素逻辑坐标 0..6
  y: number; // 0..4
  targetX: number;
  targetY: number;
  carrying?: string;
}

export interface BuildingState {
  id: BuildingId;
  level: number;
  storedAmount: number;
  bonusProgress: number;
  garrisonCompanionId?: string | null; // 委任驻守护法提升35%产出
}

export type CompanionRole = 'tank' | 'dps' | 'healer' | 'control';

export interface CompanionConfig {
  id: string;
  name: string;
  title: string;
  role: CompanionRole;
  element: 'gold' | 'wood' | 'water' | 'fire' | 'thunder';
  baseHp: number;
  baseAtk: number;
  baseDef: number;
  baseSpeed: number;
  skillName: string;
  skillDesc: string;
  skillCoeff: number;
  skillCooldown: number;
  specialEffect?: 'heal' | 'shield' | 'stun' | 'multiHit' | 'bleed';
  unlockStage: number;
  primaryColor: string;
  accentColor: string;
}

export interface CompanionState {
  id: string;
  unlocked: boolean;
  level: number;
  star: number;
  investedFood: number;
}

export interface CultivationArtConfig {
  id: string;
  name: string;
  school: string;
  description: string;
  color: string;
  unlockCostStones: number;
  perLevel: Partial<
    Record<'atkPct' | 'hpPct' | 'defPct' | 'crit' | 'critDmg' | 'combo' | 'lifesteal' | 'speed' | 'antiCrit' | 'antiStun', number>
  >;
}

export interface BloodlineConfig {
  id: string;
  name: string;
  totem: string;
  description: string;
  color: string;
  perLevel: {
    dmgBoost?: number;
    dmgReduce?: number;
    crit?: number;
    combo?: number;
    dodge?: number;
    lifesteal?: number;
  };
}

export interface ExpeditionMission {
  id: string;
  name: string;
  durationSec: number;
  description: string;
  rewards: {
    blueprints?: number;
    spiritStones?: number;
    spiritFruits?: number;
    reforgeDust?: number;
    tribulationPills?: number;
  };
}

export interface ActiveExpedition {
  missionId: string;
  companionId: string | null;
  remainingSec: number;
  totalSec: number;
}

export interface AutoChopFilter {
  enabled: boolean;
  minKeepQuality: QualityTier;
  autoEquipHigherPower: boolean;
}

export interface Resources {
  spiritStones: number;
  spiritFruits: number;
  beastFood: number;
  hourglasses: number;
  tribulationPills: number;
  reforgeDust: number;
  blueprints: number;
  spiritIron: number; // 玄铁：锻造本命法宝
  herbs: Record<HerbId, number>; // 四大灵草：真实炼丹原料
}

export interface CombatUnitSnapshot {
  uid: string;
  name: string;
  isPlayerSide: boolean;
  isHero?: boolean;
  role: CompanionRole | 'hero';
  element: ElementType;
  gridRow: number; // 0..2
  gridCol: number; // 0=前排, 1=中排, 2=后排
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  stats: CombatStats;
  skillCooldown: number;
  maxCooldown: number;
  stunned: boolean;
  stunImmune: boolean;
  chargingUlt?: boolean; // Boss 蓄力预警标记
  shield: number;
  primaryColor: string;
  accentColor: string;
}

export interface CombatEvent {
  id: string;
  timestamp: number;
  actorUid: string;
  targetUid: string;
  type: 'attack' | 'crit' | 'combo' | 'dodge' | 'heal' | 'stun' | 'shield' | 'skill';
  amount: number;
  text: string;
}

export interface OfflineRewardSummary {
  elapsedSeconds: number;
  spiritStones: number;
  spiritFruits: number;
  exp: number;
  beastFood: number;
  autoChopsSimulated: number;
}
