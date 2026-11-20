import { BuildingId } from '../core/types';

export interface BuildingConfig {
  id: BuildingId;
  name: string;
  subtitle: string;
  description: string;
  resourceName: string;
  baseRatePerSec: number;
  baseCost: number;
  autoUnlockLevel: number;
  auraDesc: (level: number) => string;
  stageNames: [string, string, string, string];
  color: string;
}

export const BUILDINGS: Record<BuildingId, BuildingConfig> = {
  spiritArray: {
    id: 'spiritArray',
    name: '聚灵玄阵',
    subtitle: '吐纳天地灵气',
    description: '持续凝聚灵石，用于建造沙盘地块与升级仙居建筑。',
    resourceName: '灵石',
    baseRatePerSec: 1.1,
    baseCost: 55,
    autoUnlockLevel: 3,
    auraDesc: (lv) => `全队攻击 +${(lv * 4).toFixed(0)}%`,
    stageNames: ['石台阵基', '青玉八卦阵', '星辰灵脉阵', '九天聚仙大阵'],
    color: '#38bdf8',
  },
  springPool: {
    id: 'springPool',
    name: '瑶池灵泉',
    subtitle: '滋养灵果仙露',
    description: '凝结砍树所需的灵果，升至 3 级开启傀儡自动采集。',
    resourceName: '灵果',
    baseRatePerSec: 0.16,
    baseCost: 65,
    autoUnlockLevel: 3,
    auraDesc: (lv) => `离线挂机上限 +${lv} 小时`,
    stageNames: ['山涧小潭', '翡翠灵池', '琼浆玉泉', '瑶池仙源'],
    color: '#4ade80',
  },
  alchemyFurnace: {
    id: 'alchemyFurnace',
    name: '紫金丹炉',
    subtitle: '控火炼丹成道',
    description: '开启真实【控火炼丹】玩法，同时少量吐纳灵丹修为。',
    resourceName: '修为',
    baseRatePerSec: 1.3,
    baseCost: 75,
    autoUnlockLevel: 3,
    auraDesc: (lv) => `炼丹极品率 +${(lv * 5).toFixed(0)}%`,
    stageNames: ['青铜药鼎', '三足紫金炉', '八卦炼仙鼎', '太上乾坤炉'],
    color: '#fb923c',
  },
  beastGarden: {
    id: 'beastGarden',
    name: '御灵仙苑',
    subtitle: '驯养山海护法',
    description: '出产灵兽口粮用于培养上阵护法，稳固全队气血。',
    resourceName: '兽粮',
    baseRatePerSec: 0.45,
    baseCost: 80,
    autoUnlockLevel: 3,
    auraDesc: (lv) => `全队生命 +${(lv * 5).toFixed(0)}%`,
    stageNames: ['竹篱灵栏', '青瓦百兽苑', '云栖御兽台', '山海仙灵宫'],
    color: '#c084fc',
  },
  herbFarm: {
    id: 'herbFarm',
    name: '百草药田',
    subtitle: '种植炼丹灵草',
    description: '持续培育青灵草、赤阳花等炼丹灵药，供紫金丹炉开炉炼丹。',
    resourceName: '灵草',
    baseRatePerSec: 0.12,
    baseCost: 60,
    autoUnlockLevel: 3,
    auraDesc: (lv) => `弟子采集效率 +${(lv * 10).toFixed(0)}%`,
    stageNames: ['荒坡苗圃', '灵泉药畦', '千年灵药园', '太古仙草囿'],
    color: '#22c55e',
  },
  forge: {
    id: 'forge',
    name: '神兵锻造坊',
    subtitle: '千锤百炼铸神器',
    description: '冶炼玄铁锻造并进阶【本命法宝】，释放强力战斗大招！',
    resourceName: '玄铁',
    baseRatePerSec: 0.18,
    baseCost: 85,
    autoUnlockLevel: 3,
    auraDesc: (lv) => `法宝大招威力 +${(lv * 8).toFixed(0)}%`,
    stageNames: ['铁匠石棚', '地火锻兵台', '赤霄铸剑庐', '造化神兵殿'],
    color: '#f59e0b',
  },
  thunderTower: {
    id: 'thunderTower',
    name: '九霄雷塔',
    subtitle: '护岛镇妖御敌',
    description: '妖兽攻岛兽潮来袭时自动降下神雷轰击妖兽，守护仙山！',
    resourceName: '雷威',
    baseRatePerSec: 0,
    baseCost: 90,
    autoUnlockLevel: 1,
    auraDesc: (lv) => `兽潮雷击伤害 ${120 * lv}`,
    stageNames: ['石雕引雷柱', '青铜镇妖塔', '紫霄聚雷阁', '九天灭魔雷塔'],
    color: '#a855f7',
  },
};

export const BUILDING_ORDER: BuildingId[] = [
  'spiritArray',
  'springPool',
  'herbFarm',
  'alchemyFurnace',
  'forge',
  'beastGarden',
  'thunderTower',
];
