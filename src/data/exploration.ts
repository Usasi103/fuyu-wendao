export type MapTileType =
  | 'start'
  | 'empty'
  | 'herb'
  | 'chest'
  | 'enemy'
  | 'merchant'
  | 'shrine'
  | 'event'
  | 'boss';

export interface RealmMapTile {
  x: number;
  y: number;
  type: MapTileType;
  revealed: boolean;
  cleared: boolean;
  label: string;
}

export interface RogueliteRelic {
  id: string;
  name: string;
  desc: string;
  color: string;
  effect: {
    atkPct?: number;
    hpPct?: number;
    crit?: number;
    combo?: number;
    lifesteal?: number;
    dmgBoost?: number;
    startRage?: number;
  };
}

export const ROGUELITE_RELICS: RogueliteRelic[] = [
  { id: 'sword_split', name: '剑气分化', desc: '秘境探索期间全队攻击 +22%，连击 +10%', color: '#38bdf8', effect: { atkPct: 0.22, combo: 0.1 } },
  { id: 'rage_start', name: '紫府蓄势', desc: '开局直接获得 55 点法宝灵力怒气，抢占先手大招！', color: '#fbbf24', effect: { startRage: 55, dmgBoost: 0.1 } },
  { id: 'blood_feast', name: '嗜血战意', desc: '暴击 +12%，吸血 +12%', color: '#fb7185', effect: { crit: 0.12, lifesteal: 0.12 } },
  { id: 'immortal_shell', name: '玄龟甲佑', desc: '气血上限 +30%，最终增伤 +12%', color: '#4ade80', effect: { hpPct: 0.3, dmgBoost: 0.12 } },
  { id: 'element_fury', name: '五行共鸣', desc: '最终增伤 +24%', color: '#c084fc', effect: { dmgBoost: 0.24 } },
];

export interface RealmEventChoice {
  title: string;
  desc: string;
  choices: [
    { label: string; rewardText: string; stones?: number; iron?: number; herbs?: number; blueprints?: number; riskHpPct?: number },
    { label: string; rewardText: string; stones?: number; iron?: number; herbs?: number; blueprints?: number; riskHpPct?: number },
  ];
}

export const REALM_EVENTS: RealmEventChoice[] = [
  {
    title: '古修坐化洞府',
    desc: '你在迷雾石壁后发现一座上古修士遗留的石室，案台上有古剑残片与一卷阵图，但阵法禁制仍在闪烁。',
    choices: [
      { label: '强行破阵取宝', rewardText: '仙建蓝图+2、玄铁+12', blueprints: 2, iron: 12 },
      { label: '恭敬叩拜搜寻外围', rewardText: '灵石+70、青灵草+4', stones: 70, herbs: 4 },
    ],
  },
  {
    title: '灵泉异兽残魂',
    desc: '一头重伤的灵兽残魂守着几株罕见灵草，似乎愿意以灵草换取安息。',
    choices: [
      { label: '超度残魂收草药', rewardText: '青灵草+5、淬灵砂+18', herbs: 5 },
      { label: '炼化残魂取玄铁', rewardText: '玄铁+18、灵石+50', iron: 18, stones: 50 },
    ],
  },
];

export function generateRealmMap(floor: number): {
  floor: number;
  width: number;
  height: number;
  playerX: number;
  playerY: number;
  tiles: RealmMapTile[];
} {
  const width = 7;
  const height = 5;
  const tiles: RealmMapTile[] = [];

  const pool: MapTileType[] = [
    'herb', 'herb', 'herb', 'herb', 'herb',
    'chest', 'chest', 'chest',
    'enemy', 'enemy', 'enemy', 'enemy', 'enemy', 'enemy',
    'shrine', 'shrine',
    'merchant',
    'event', 'event',
  ];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let type: MapTileType = 'empty';
      let label = '灵雾空地';
      if (x === 0 && y === 2) {
        type = 'start';
        label = '传送阵入口';
      } else if (x === 6 && y === 2) {
        type = 'boss';
        label = `第${floor}重妖王`;
      } else if (Math.random() < 0.65) {
        type = pool[Math.floor(Math.random() * pool.length)];
        label =
          type === 'herb'
            ? '灵草灵矿'
            : type === 'chest'
              ? '古修宝箱'
              : type === 'enemy'
                ? '妖兽巡逻'
                : type === 'shrine'
                  ? '机缘祭坛'
                  : type === 'merchant'
                    ? '云游仙商'
                    : '随机奇遇';
      }
      const nearStart = Math.abs(x - 0) + Math.abs(y - 2) <= 1;
      tiles.push({
        x,
        y,
        type,
        revealed: nearStart,
        cleared: x === 0 && y === 2,
        label,
      });
    }
  }

  return { floor, width, height, playerX: 0, playerY: 2, tiles };
}
