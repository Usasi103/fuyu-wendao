import { CultivationArtConfig } from '../core/types';

export const CULTIVATION_ARTS: CultivationArtConfig[] = [
  {
    id: 'sword_heart',
    name: '《太虚剑心诀》',
    school: '破军剑道',
    description: '凝神于剑，每重提升攻击与暴击爆伤，适合暴击秒杀流。',
    color: '#fbbf24',
    unlockCostStones: 180,
    perLevel: { atkPct: 0.05, crit: 0.025, critDmg: 0.06 },
  },
  {
    id: 'wind_thunder',
    name: '《风雷九变》',
    school: '疾影连斩',
    description: '身化流风，每重提升出手速度与连击率，克制高闪避妖王。',
    color: '#38bdf8',
    unlockCostStones: 180,
    perLevel: { speed: 4, combo: 0.028, atkPct: 0.03 },
  },
  {
    id: 'blood_lotus',
    name: '《血莲长生经》',
    school: '气血续航',
    description: '炼血化元，每重提升气血上限与吸血率，持久消耗战利器。',
    color: '#f43f5e',
    unlockCostStones: 220,
    perLevel: { hpPct: 0.06, lifesteal: 0.025 },
  },
  {
    id: 'jade_body',
    name: '《金刚玄玉身》',
    school: '镇岳护体',
    description: '铸就仙躯，每重提升防御、抗暴与稳心抗晕，大幅稳固渡劫根基。',
    color: '#4ade80',
    unlockCostStones: 200,
    perLevel: { defPct: 0.07, antiCrit: 0.03, antiStun: 0.03 },
  },
];
