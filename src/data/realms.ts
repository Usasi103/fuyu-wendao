import { EquipSlot, QualityTier, SubStatKey } from '../core/types';

export interface RealmTierConfig {
  tierIndex: number;
  name: string;
  maxSubLevel: number;
  auraColor: string;
  titlePrefix: string;
  unlockNote: string;
}

export const REALM_TIERS: RealmTierConfig[] = [
  { tierIndex: 0, name: '炼气', maxSubLevel: 9, auraColor: '#94a3b8', titlePrefix: '初入仙途', unlockNote: '开启太古灵树伐木' },
  { tierIndex: 1, name: '筑基', maxSubLevel: 9, auraColor: '#4ade80', titlePrefix: '道基初成', unlockNote: '全属性大幅跃迁，解锁第二护法位' },
  { tierIndex: 2, name: '金丹', maxSubLevel: 9, auraColor: '#38bdf8', titlePrefix: '金丹大道', unlockNote: '丹成九转，灵树掉落品质提升' },
  { tierIndex: 3, name: '元婴', maxSubLevel: 9, auraColor: '#a855f7', titlePrefix: '碎丹成婴', unlockNote: '解锁第三护法位，战力质变' },
  { tierIndex: 4, name: '化神', maxSubLevel: 9, auraColor: '#f59e0b', titlePrefix: '神识化境', unlockNote: '神通威力显著增强' },
  { tierIndex: 5, name: '炼虚', maxSubLevel: 9, auraColor: '#f43f5e', titlePrefix: '返璞归真', unlockNote: '解锁高阶流派抗性上限' },
  { tierIndex: 6, name: '合体', maxSubLevel: 9, auraColor: '#ec4899', titlePrefix: '天人合一', unlockNote: '洞天产出倍率大幅提升' },
  { tierIndex: 7, name: '大乘', maxSubLevel: 9, auraColor: '#eab308', titlePrefix: '半步仙尊', unlockNote: '执掌浮屿灵脉' },
  { tierIndex: 8, name: '渡劫', maxSubLevel: 9, auraColor: '#ef4444', titlePrefix: '九霄雷尊', unlockNote: '飞升登仙，万法不侵' },
];

export const QUALITY_CONFIG: Record<
  QualityTier,
  {
    name: string;
    color: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
    mult: number;
    subStatCount: number;
    subStatRange: [number, number];
  }
> = {
  0: {
    name: '凡品',
    color: '#cbd5e1',
    bgClass: 'bg-slate-800/80',
    borderClass: 'border-slate-500',
    textClass: 'text-slate-300',
    mult: 1.0,
    subStatCount: 0,
    subStatRange: [0, 0],
  },
  1: {
    name: '灵品',
    color: '#4ade80',
    bgClass: 'bg-emerald-950/80',
    borderClass: 'border-emerald-500',
    textClass: 'text-emerald-400',
    mult: 1.38,
    subStatCount: 1,
    subStatRange: [0.02, 0.04],
  },
  2: {
    name: '玄品',
    color: '#38bdf8',
    bgClass: 'bg-sky-950/80',
    borderClass: 'border-sky-400',
    textClass: 'text-sky-400',
    mult: 1.9,
    subStatCount: 1,
    subStatRange: [0.04, 0.07],
  },
  3: {
    name: '地品',
    color: '#c084fc',
    bgClass: 'bg-purple-950/80',
    borderClass: 'border-purple-400',
    textClass: 'text-purple-400',
    mult: 2.65,
    subStatCount: 2,
    subStatRange: [0.05, 0.09],
  },
  4: {
    name: '天品',
    color: '#fbbf24',
    bgClass: 'bg-amber-950/80',
    borderClass: 'border-amber-400',
    textClass: 'text-amber-400',
    mult: 3.75,
    subStatCount: 2,
    subStatRange: [0.07, 0.13],
  },
  5: {
    name: '仙品',
    color: '#fb923c',
    bgClass: 'bg-orange-950/80',
    borderClass: 'border-orange-400',
    textClass: 'text-orange-400',
    mult: 5.3,
    subStatCount: 2,
    subStatRange: [0.1, 0.17],
  },
  6: {
    name: '神品',
    color: '#f87171',
    bgClass: 'bg-rose-950/80',
    borderClass: 'border-rose-500',
    textClass: 'text-rose-400',
    mult: 7.8,
    subStatCount: 3,
    subStatRange: [0.12, 0.21],
  },
};

export const SLOT_META: Record<
  EquipSlot,
  { label: string; prefixes: string[]; nouns: string[]; atkWeight: number; hpWeight: number; defWeight: number; spdWeight: number }
> = {
  weapon: {
    label: '仙兵',
    prefixes: ['青霜', '赤霄', '太虚', '玄冥', '紫电', '诛仙', '沧澜'],
    nouns: ['灵剑', '斩月刀', '飞虹剑', '破军戟', '玄铁剑'],
    atkWeight: 1.55,
    hpWeight: 0.4,
    defWeight: 0.3,
    spdWeight: 1.1,
  },
  robe: {
    label: '道袍',
    prefixes: ['云纹', '八卦', '流仙', '玄武', '星辰', '混元'],
    nouns: ['鹤氅', '法衣', '战袍', '灵甲', '仙衫'],
    atkWeight: 0.25,
    hpWeight: 1.5,
    defWeight: 1.4,
    spdWeight: 0.5,
  },
  crown: {
    label: '仙冠',
    prefixes: ['紫金', '玉清', '朝霞', '天罡', '龙纹', '太乙'],
    nouns: ['束发冠', '法冠', '星冠', '灵冕', '道冠'],
    atkWeight: 0.65,
    hpWeight: 1.1,
    defWeight: 0.9,
    spdWeight: 0.7,
  },
  jade: {
    label: '灵佩',
    prefixes: ['温润', '乾坤', '冰心', '玲珑', '盘龙', '琉璃'],
    nouns: ['玉佩', '护心镜', '仙符', '灵犀坠', '道印'],
    atkWeight: 0.8,
    hpWeight: 1.0,
    defWeight: 0.85,
    spdWeight: 0.9,
  },
  ring: {
    label: '法戒',
    prefixes: ['须弥', '纳戒', '赤焰', '寒玉', '星陨', '混沌'],
    nouns: ['指环', '道戒', '法环', '龙戒', '仙扳指'],
    atkWeight: 1.15,
    hpWeight: 0.65,
    defWeight: 0.55,
    spdWeight: 1.0,
  },
  boots: {
    label: '仙履',
    prefixes: ['踏云', '御风', '流光', '缩地', '青莲', '逍遥'],
    nouns: ['灵靴', '云履', '仙靴', '追风履', '行云靴'],
    atkWeight: 0.45,
    hpWeight: 0.85,
    defWeight: 0.75,
    spdWeight: 1.85,
  },
};

export const SUB_STAT_META: Record<SubStatKey, { label: string; isAnti: boolean; color: string }> = {
  crit: { label: '暴击', isAnti: false, color: '#fbbf24' },
  combo: { label: '连击', isAnti: false, color: '#38bdf8' },
  dodge: { label: '闪避', isAnti: false, color: '#4ade80' },
  lifesteal: { label: '吸血', isAnti: false, color: '#f43f5e' },
  stun: { label: '击晕', isAnti: false, color: '#c084fc' },
  antiCrit: { label: '抗暴', isAnti: true, color: '#94a3b8' },
  antiCombo: { label: '抗连', isAnti: true, color: '#94a3b8' },
  antiDodge: { label: '命中(破闪)', isAnti: true, color: '#94a3b8' },
  antiLifesteal: { label: '重伤(抗吸)', isAnti: true, color: '#94a3b8' },
  antiStun: { label: '稳心(抗晕)', isAnti: true, color: '#94a3b8' },
};
