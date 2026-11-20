import { BloodlineConfig, ExpeditionMission } from '../core/types';

export const BLOODLINES: BloodlineConfig[] = [
  {
    id: 'qinglong',
    name: '青龙连爆脉',
    totem: '东方青龙',
    description: '每级强化最终增伤与连击/暴击，主打极限连爆破防。',
    color: '#38bdf8',
    perLevel: { dmgBoost: 0.04, combo: 0.02, crit: 0.02 },
  },
  {
    id: 'xuanwu',
    name: '玄武镇岳脉',
    totem: '北方玄武',
    description: '每级强化最终减伤，硬抗高难妖王大招与天劫反噬。',
    color: '#2dd4bf',
    perLevel: { dmgReduce: 0.045 },
  },
  {
    id: 'yinglong',
    name: '应龙幻影脉',
    totem: '太古应龙',
    description: '每级强化闪避与增伤，残血极限闪避反杀。',
    color: '#4ade80',
    perLevel: { dodge: 0.025, dmgBoost: 0.025 },
  },
  {
    id: 'zhuque',
    name: '朱雀焚血脉',
    totem: '南方朱雀',
    description: '每级强化吸血与增伤，站桩续航消耗流首选。',
    color: '#fb7185',
    perLevel: { lifesteal: 0.022, dmgBoost: 0.03 },
  },
];

export const EXPEDITION_MISSIONS: ExpeditionMission[] = [
  {
    id: 'herb_valley',
    name: '百草灵谷采集',
    durationSec: 25,
    description: '采摘千年灵果并收集少量灵石，缓解伐木体力匮乏。',
    rewards: { spiritFruits: 7, spiritStones: 35 },
  },
  {
    id: 'ancient_ruins',
    name: '古宗遗迹拓印',
    durationSec: 45,
    description: '寻访上古洞天残垣，稳定带回稀缺的【仙建蓝图】！',
    rewards: { blueprints: 2, spiritStones: 45 },
  },
  {
    id: 'demon_abyss',
    name: '幽冥秘境探宝',
    durationSec: 70,
    description: '深入险地搜寻淬灵砂与渡劫丹，锻造极品流派词条。',
    rewards: { reforgeDust: 22, tribulationPills: 1, blueprints: 1 },
  },
];
