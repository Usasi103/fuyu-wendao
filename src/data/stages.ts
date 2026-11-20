export interface StageEnemyTemplate {
  name: string;
  role: 'tank' | 'dps' | 'control';
  primaryColor: string;
  accentColor: string;
  hpMult: number;
  atkMult: number;
  defMult: number;
  traits?: {
    crit?: number;
    combo?: number;
    dodge?: number;
    lifesteal?: number;
    stun?: number;
    antiCrit?: number;
    antiCombo?: number;
    antiDodge?: number;
    dmgBoost?: number;
    dmgReduce?: number;
  };
}

export interface StageInfo {
  stage: number;
  zoneName: string;
  isBoss: boolean;
  isElite: boolean;
  enemies: StageEnemyTemplate[];
  strategyHint?: string;
}

const ZONES = [
  '青云外山',
  '迷雾竹海',
  '赤炎裂谷',
  '寒潭古渊',
  '万妖荒原',
  '落雷绝峰',
  '幽冥鬼域',
  '九霄仙门',
];

const MOB_POOL: StageEnemyTemplate[] = [
  { name: '山魈小妖', role: 'dps', primaryColor: '#94a3b8', accentColor: '#475569', hpMult: 0.9, atkMult: 1.0, defMult: 0.8 },
  { name: '铁甲妖狼', role: 'tank', primaryColor: '#64748b', accentColor: '#334155', hpMult: 1.25, atkMult: 0.85, defMult: 1.2 },
  { name: '赤鳞毒蟒', role: 'dps', primaryColor: '#34d399', accentColor: '#065f46', hpMult: 0.85, atkMult: 1.15, defMult: 0.75, traits: { combo: 0.12 } },
  { name: '幽影鬼卒', role: 'control', primaryColor: '#a78bfa', accentColor: '#4c1d95', hpMult: 0.95, atkMult: 0.95, defMult: 0.9, traits: { dodge: 0.15 } },
];

const BOSS_POOL: Array<{ template: StageEnemyTemplate; hint: string }> = [
  {
    template: {
      name: '黑风妖王',
      role: 'tank',
      primaryColor: '#f59e0b',
      accentColor: '#78350f',
      hpMult: 2.4,
      atkMult: 1.38,
      defMult: 1.45,
      traits: { antiCrit: 0.22, stun: 0.14, dmgReduce: 0.18 },
    },
    hint: '护甲厚重且自带18%减伤抗暴！建议觉醒【青龙连爆脉】+ 搭配【青鸾剑灵】打连爆破防',
  },
  {
    template: {
      name: '幻影妖狐',
      role: 'dps',
      primaryColor: '#ec4899',
      accentColor: '#831843',
      hpMult: 2.0,
      atkMult: 1.52,
      defMult: 1.05,
      traits: { dodge: 0.38, antiCrit: 0.2, dmgBoost: 0.16 },
    },
    hint: '极高闪避与16%增伤！请保留【命中(破闪)】词条，或参悟《风雷九变》高连击压制',
  },
  {
    template: {
      name: '血煞老魔',
      role: 'dps',
      primaryColor: '#ef4444',
      accentColor: '#7f1d1d',
      hpMult: 2.35,
      atkMult: 1.48,
      defMult: 1.2,
      traits: { lifesteal: 0.3, combo: 0.24, dmgBoost: 0.2 },
    },
    hint: '高吸血高增伤！建议切【玄武镇岳脉】堆减伤抗住爆发，并上阵【紫霄雷雀】眩晕打断',
  },
  {
    template: {
      name: '镇岳石魔',
      role: 'tank',
      primaryColor: '#a8a29e',
      accentColor: '#44403c',
      hpMult: 2.9,
      atkMult: 1.3,
      defMult: 1.8,
      traits: { antiCombo: 0.32, stun: 0.18, dmgReduce: 0.24 },
    },
    hint: '24%减伤与高抗连！推荐升级灵树换高品暴击装，并利用治疗护法持久战磨死',
  },
];

export function buildStageInfo(stage: number): StageInfo {
  const zoneIdx = Math.min(ZONES.length - 1, Math.floor((stage - 1) / 10));
  const zoneName = `${ZONES[zoneIdx]} · 第${stage}重`;
  const isBoss = stage % 10 === 0;
  const isElite = !isBoss && stage % 5 === 0;

  if (isBoss) {
    const bossEntry = BOSS_POOL[(Math.floor(stage / 10) - 1) % BOSS_POOL.length];
    const escort1 = MOB_POOL[stage % MOB_POOL.length];
    return {
      stage,
      zoneName,
      isBoss: true,
      isElite: false,
      enemies: [
        { ...escort1, name: `${escort1.name}·护卫`, hpMult: 1.0, atkMult: 0.9 },
        bossEntry.template,
      ],
      strategyHint: bossEntry.hint,
    };
  }

  if (isElite) {
    const elite = MOB_POOL[(stage + 1) % MOB_POOL.length];
    const mob = MOB_POOL[stage % MOB_POOL.length];
    return {
      stage,
      zoneName,
      isBoss: false,
      isElite: true,
      enemies: [
        mob,
        { ...elite, name: `${elite.name}·统领`, hpMult: 1.55, atkMult: 1.22, defMult: 1.15 },
      ],
    };
  }

  const count = stage >= 4 ? 2 : 1;
  const enemies: StageEnemyTemplate[] = [];
  for (let i = 0; i < count; i++) {
    const tpl = MOB_POOL[(stage + i) % MOB_POOL.length];
    enemies.push(tpl);
  }
  return {
    stage,
    zoneName,
    isBoss: false,
    isElite: false,
    enemies,
  };
}
