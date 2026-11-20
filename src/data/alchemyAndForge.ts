import { ElementType } from './elements';

export type HerbId = 'qingling' | 'chiyang' | 'ziyu' | 'jiuyou';

export const HERB_META: Record<HerbId, { name: string; color: string; desc: string }> = {
  qingling: { name: '青灵草', color: '#4ade80', desc: '常见灵草，炼制修为丹与护脉丹之基' },
  chiyang: { name: '赤阳花', color: '#fb7185', desc: '阳炎灵花，催发攻伐暴击药力' },
  ziyu: { name: '紫玉参', color: '#c084fc', desc: '千年灵参，稳固道基抗天劫' },
  jiuyou: { name: '九幽莲', color: '#38bdf8', desc: '秘境奇珍，炼制极品仙丹必备' },
};

export interface AlchemyRecipe {
  id: string;
  name: string;
  desc: string;
  ingredients: Partial<Record<HerbId, number>>;
  stoneCost: number;
  effectType: 'tribulationPill' | 'atkBuff' | 'defBuff' | 'expGain';
  color: string;
}

export const ALCHEMY_RECIPES: AlchemyRecipe[] = [
  {
    id: 'essence_pill',
    name: '凝元修为丹',
    desc: '立即炼化大量修为，极品火候额外产出 +50% 修为！',
    ingredients: { qingling: 3 },
    stoneCost: 25,
    effectType: 'expGain',
    color: '#38bdf8',
  },
  {
    id: 'fury_elixir',
    name: '烈阳剑元丹',
    desc: '接下来 3 场战斗全队攻击 +25%、暴击 +12%（极品翻倍持续场次）',
    ingredients: { qingling: 2, chiyang: 2 },
    stoneCost: 40,
    effectType: 'atkBuff',
    color: '#fb7185',
  },
  {
    id: 'jade_guard_pill',
    name: '玄武护体丹',
    desc: '接下来 3 场战斗全队防御 +25%、减伤 +15%',
    ingredients: { qingling: 2, ziyu: 2 },
    stoneCost: 40,
    effectType: 'defBuff',
    color: '#4ade80',
  },
  {
    id: 'breakthrough_pill',
    name: '护脉渡劫丹',
    desc: '炼出渡劫丹（+22%大境界渡劫成功率），极品火候一次成丹 2 枚！',
    ingredients: { qingling: 3, ziyu: 2, jiuyou: 1 },
    stoneCost: 65,
    effectType: 'tribulationPill',
    color: '#fbbf24',
  },
];

export interface NatalArtifactConfig {
  id: 'zhuxian_sword' | 'hunyuan_bell' | 'jiuyou_banner';
  name: string;
  element: ElementType;
  ultName: string;
  ultDesc: string;
  forgeCostIron: number;
  forgeCostDust: number;
  color: string;
}

export const NATAL_ARTIFACTS: NatalArtifactConfig[] = [
  {
    id: 'zhuxian_sword',
    name: '诛仙剑阵',
    element: 'gold',
    ultName: '万剑天落',
    ultDesc: '召唤诛仙剑气轰击敌方全体，造成超高倍金系爆发伤害并附带破甲！',
    forgeCostIron: 25,
    forgeCostDust: 20,
    color: '#fbbf24',
  },
  {
    id: 'hunyuan_bell',
    name: '混元金钟',
    element: 'earth',
    ultName: '太古震岳盾',
    ultDesc: '为我方全体施加巨额护盾与回血，可完美挡下妖王蓄力大招！',
    forgeCostIron: 25,
    forgeCostDust: 20,
    color: '#2dd4bf',
  },
  {
    id: 'jiuyou_banner',
    name: '九幽噬魂幡',
    element: 'fire',
    ultName: '幽炎焚魂',
    ultDesc: '焚烧敌方全体并吸取巨量气血回复全队，有高概率震晕敌方主将！',
    forgeCostIron: 30,
    forgeCostDust: 25,
    color: '#fb7185',
  },
];
