import { create } from 'zustand';
import { ALCHEMY_RECIPES, HerbId, NATAL_ARTIFACTS } from '../data/alchemyAndForge';
import { BLOODLINES, EXPEDITION_MISSIONS } from '../data/bloodlines';
import { BUILDING_ORDER, BUILDINGS } from '../data/buildings';
import { COMPANIONS } from '../data/companions';
import { CULTIVATION_ARTS } from '../data/cultivationArts';
import { ElementType } from '../data/elements';
import { generateRealmMap, REALM_EVENTS, RealmEventChoice, RealmMapTile, ROGUELITE_RELICS, RogueliteRelic } from '../data/exploration';
import { REALM_TIERS } from '../data/realms';
import { CombatSimulationState, createCombatSession, stepCombatTurn, triggerNatalUltimate } from '../core/combatEngine';
import {
  calcArtUpgradeCost,
  calcBloodlineUpgradeCost,
  calcBreakthroughStoneCost,
  calcBuildingBlueprintCost,
  calcBuildingRatePerSec,
  calcBuildingUpgradeCost,
  calcCombatPower,
  calcCompanionFoodCost,
  calcExpRequired,
  calcHeroTotalStats,
  calcIslandLevelCap,
  calcMaxOfflineSeconds,
  calcTreeBlueprintCost,
  calcTreeUpgradeCost,
  calcTribulationSuccessRate,
  clamp,
  getUnlockStatus,
} from '../core/formulas';
import { calcDecomposeRewards, generateEquipment, reforgeItemSubStats } from '../core/lootEngine';
import { soundEngine } from '../core/soundEngine';
import {
  ActiveExpedition,
  AutoChopFilter,
  BuildingId,
  BuildingState,
  CompanionState,
  DiscipleState,
  EquipSlot,
  EquipmentItem,
  OfflineRewardSummary,
  Resources,
  SandboxTile,
} from '../core/types';

export const SAVE_STORAGE_KEY = 'fuyu_wendao_save_v2';
export const CLOUD_KEY_STORAGE = 'fuyu_wendao_cloud_key';

export interface GameLogEntry {
  id: string;
  text: string;
  tone: 'info' | 'good' | 'warn' | 'epic';
}

export interface VisualFxCue {
  id: number;
  type: 'chop' | 'loot' | 'breakthrough' | 'breakthrough_fail' | 'collect';
  quality?: number;
  buildingId?: BuildingId;
  text?: string;
}

export interface PersistedGameState {
  version: number;
  heroName: string;
  heroElement: ElementType;
  realmTier: number;
  realmSub: number;
  exp: number;
  treeLevel: number;
  pityCounter: number;
  totalChops: number;
  resources: Resources;
  equipment: Partial<Record<EquipSlot, EquipmentItem>>;
  pendingItem: EquipmentItem | null;
  autoChop: AutoChopFilter;
  buildings: Record<BuildingId, BuildingState>;
  sandboxTiles: SandboxTile[];
  disciples: DiscipleState[];
  raidCountdownSec: number;
  raidWave: number;
  companions: Record<string, CompanionState>;
  deployedCompanions: string[];
  formationPositions: Record<string, { row: number; col: number }>;
  cultivationArts: Record<string, number>;
  activeArtId: string | null;
  bloodlineLevels: Record<string, number>;
  activeBloodlineId: string | null;
  natalArtifacts: Record<string, number>;
  activeArtifactId: 'zhuxian_sword' | 'hunyuan_bell' | 'jiuyou_banner' | null;
  autoUltimate: boolean;
  elixirBuffs: { atkBuffTurns: number; defBuffTurns: number };
  activeExpedition: ActiveExpedition | null;
  realmMap: {
    floor: number;
    width: number;
    height: number;
    playerX: number;
    playerY: number;
    tiles: RealmMapTile[];
  };
  activeRelicIds: string[];
  currentStage: number;
  highestStageCleared: number;
  towerFloorCleared: number;
  autoPushStage: boolean;
  autoPushTower: boolean;
  timeScale: 1 | 2 | 5;
  muted: boolean;
  lastSavedAt: number;
}

export interface GameStore extends PersistedGameState {
  activeTab: 'island' | 'combat' | 'explore';
  combatMode: 'stage' | 'tower' | 'explore';
  combat: CombatSimulationState | null;
  offlineReward: OfflineRewardSummary | null;
  logs: GameLogEntry[];
  fxCue: VisualFxCue | null;
  tribulationModalOpen: boolean;
  selectedTile: { x: number; y: number } | null;
  activeRaid: { wave: number; enemyHp: number; enemyMaxHp: number } | null;
  pendingRelicChoices: RogueliteRelic[] | null;
  pendingEvent: RealmEventChoice | null;
  pendingMerchantOpen: boolean;
  pendingExploreTile: { x: number; y: number; isBoss: boolean } | null;
  cloudSyncKey: string;
  cloudStatus: 'local' | 'syncing' | 'synced' | 'offline_backend' | 'error';

  setActiveTab: (tab: 'island' | 'combat' | 'explore') => void;
  setHeroName: (name: string) => void;
  setHeroElement: (elem: ElementType) => void;
  setTimeScale: (scale: 1 | 2 | 5) => void;
  toggleMuted: () => void;

  selectSandboxTile: (x: number, y: number) => void;
  clearSelectedTile: () => void;
  unlockSandboxTile: (x: number, y: number) => void;
  buildOnTile: (x: number, y: number, buildingId: BuildingId) => void;
  recruitDisciple: () => void;
  triggerIslandRaid: () => void;

  chopTree: () => void;
  equipPending: () => void;
  decomposePending: () => void;
  reforgeEquipment: (slot: EquipSlot) => void;
  updateAutoChop: (patch: Partial<AutoChopFilter>) => void;
  upgradeTree: () => void;

  openTribulationModal: () => void;
  closeTribulationModal: () => void;
  attemptBreakthrough: (pillsUsed?: number) => { success: boolean; isMajor: boolean; message: string };

  collectBuilding: (id: BuildingId) => void;
  collectAllBuildings: () => void;
  upgradeBuilding: (id: BuildingId) => void;
  garrisonBuilding: (id: BuildingId, companionId: string | null) => void;
  useHourglass: () => void;

  brewAlchemyPill: (recipeId: string, qualityScore: 0 | 1 | 2) => { ok: boolean; message: string };
  forgeOrUpgradeArtifact: (id: 'zhuxian_sword' | 'hunyuan_bell' | 'jiuyou_banner') => void;
  setActiveArtifact: (id: 'zhuxian_sword' | 'hunyuan_bell' | 'jiuyou_banner') => void;
  triggerCombatUltimate: () => void;
  toggleAutoUltimate: () => void;
  setFormationSlot: (uid: string, row: number, col: number) => void;

  moveRealmMapTile: (x: number, y: number) => void;
  pickRogueliteRelic: (id: string) => void;
  resolveRealmEvent: (choiceIdx: 0 | 1) => void;
  buyMerchantItem: (kind: 'blueprint' | 'pill' | 'dust') => void;
  closeMerchant: () => void;
  resetRealmMap: (floor?: number) => void;

  upgradeCompanion: (id: string) => void;
  resetCompanion: (id: string) => void;
  toggleDeployCompanion: (id: string) => void;

  upgradeCultivationArt: (id: string) => void;
  setActiveArt: (id: string) => void;

  upgradeBloodline: (id: string) => void;
  setActiveBloodline: (id: string) => void;

  startExpedition: (missionId: string, companionId: string | null) => void;
  claimExpedition: () => void;

  startStageCombat: (stage?: number) => void;
  startTowerCombat: (floor?: number) => void;
  tickGame: (dtSeconds: number) => void;
  tickCombatStep: () => void;
  toggleAutoPushStage: () => void;
  toggleAutoPushTower: () => void;

  dismissOfflineReward: () => void;
  exportSaveJson: () => string;
  importSaveJson: (raw: string) => { ok: boolean; error?: string };
  resetAllProgress: () => void;

  bindCloudSyncKey: (key: string) => Promise<{ ok: boolean; message: string }>;
  pushCloudSave: () => Promise<boolean>;
  unbindCloudSync: () => void;

  getHeroTotalPower: () => number;
  getMaxDeploySlots: () => number;
  getUnlocks: () => ReturnType<typeof getUnlockStatus>;
}

function createDefaultSandboxTiles(): SandboxTile[] {
  const tiles: SandboxTile[] = [];
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 6; x++) {
      const unlocked = x >= 1 && x <= 4 && y >= 1 && y <= 2;
      const terrain: SandboxTile['terrain'] = (x + y) % 5 === 0 ? 'spirit' : (x === 4 && y === 2) ? 'farm' : 'grass';
      let buildingId: SandboxTile['buildingId'] = null;
      if (x === 2 && y === 1) buildingId = 'spiritTree';
      else if (x === 1 && y === 1) buildingId = 'spiritArray';
      tiles.push({ x, y, unlocked, terrain, buildingId });
    }
  }
  return tiles;
}

function createInitialPersistedState(): PersistedGameState {
  const companions: Record<string, CompanionState> = {};
  COMPANIONS.forEach((c, idx) => {
    companions[c.id] = {
      id: c.id,
      unlocked: idx === 0,
      level: 1,
      star: 1,
      investedFood: 0,
    };
  });

  const cultivationArts: Record<string, number> = {};
  CULTIVATION_ARTS.forEach((a) => {
    cultivationArts[a.id] = 0;
  });

  const bloodlineLevels: Record<string, number> = {};
  BLOODLINES.forEach((b) => {
    bloodlineLevels[b.id] = 0;
  });

  return {
    version: 4,
    heroName: '逍遥散修',
    heroElement: 'gold',
    realmTier: 0,
    realmSub: 1,
    exp: 0,
    treeLevel: 1,
    pityCounter: 0,
    totalChops: 0,
    resources: {
      spiritStones: 95,
      spiritFruits: 16,
      beastFood: 20,
      hourglasses: 1,
      tribulationPills: 0,
      reforgeDust: 0,
      blueprints: 2,
      spiritIron: 12,
      herbs: { qingling: 4, chiyang: 1, ziyu: 1, jiuyou: 0 },
    },
    equipment: {},
    pendingItem: null,
    autoChop: {
      enabled: false,
      minKeepQuality: 2,
      autoEquipHigherPower: true,
    },
    buildings: {
      spiritArray: { id: 'spiritArray', level: 1, storedAmount: 10, bonusProgress: 0, garrisonCompanionId: null },
      springPool: { id: 'springPool', level: 0, storedAmount: 0, bonusProgress: 0, garrisonCompanionId: null },
      alchemyFurnace: { id: 'alchemyFurnace', level: 0, storedAmount: 0, bonusProgress: 0, garrisonCompanionId: null },
      beastGarden: { id: 'beastGarden', level: 0, storedAmount: 0, bonusProgress: 0, garrisonCompanionId: null },
      herbFarm: { id: 'herbFarm', level: 0, storedAmount: 0, bonusProgress: 0, garrisonCompanionId: null },
      forge: { id: 'forge', level: 0, storedAmount: 0, bonusProgress: 0, garrisonCompanionId: null },
      thunderTower: { id: 'thunderTower', level: 0, storedAmount: 0, bonusProgress: 0, garrisonCompanionId: null },
    },
    sandboxTiles: createDefaultSandboxTiles(),
    disciples: [
      { id: 'disc_1', name: '青云外门弟子', role: 'gather', level: 1, x: 1.5, y: 1.5, targetX: 2.2, targetY: 1.2 },
    ],
    raidCountdownSec: 75,
    raidWave: 1,
    companions,
    deployedCompanions: ['turtle_guardian'],
    formationPositions: {
      hero: { row: 1, col: 1 },
      turtle_guardian: { row: 1, col: 0 },
    },
    cultivationArts,
    activeArtId: null,
    bloodlineLevels,
    activeBloodlineId: null,
    natalArtifacts: { zhuxian_sword: 0, hunyuan_bell: 0, jiuyou_banner: 0 },
    activeArtifactId: null,
    autoUltimate: false,
    elixirBuffs: { atkBuffTurns: 0, defBuffTurns: 0 },
    activeExpedition: null,
    realmMap: generateRealmMap(1),
    activeRelicIds: [],
    currentStage: 1,
    highestStageCleared: 0,
    towerFloorCleared: 0,
    autoPushStage: true,
    autoPushTower: true,
    timeScale: 1,
    muted: false,
    lastSavedAt: Date.now(),
  };
}

let fxSeq = 1;
let logSeq = 1;

function makeLog(text: string, tone: GameLogEntry['tone'] = 'info'): GameLogEntry {
  logSeq += 1;
  return { id: `log_${logSeq}`, text, tone };
}

function extractPersisted(state: GameStore): PersistedGameState {
  return {
    version: state.version,
    heroName: state.heroName,
    heroElement: state.heroElement,
    realmTier: state.realmTier,
    realmSub: state.realmSub,
    exp: state.exp,
    treeLevel: state.treeLevel,
    pityCounter: state.pityCounter,
    totalChops: state.totalChops,
    resources: state.resources,
    equipment: state.equipment,
    pendingItem: state.pendingItem,
    autoChop: state.autoChop,
    buildings: state.buildings,
    sandboxTiles: state.sandboxTiles,
    disciples: state.disciples,
    raidCountdownSec: state.raidCountdownSec,
    raidWave: state.raidWave,
    companions: state.companions,
    deployedCompanions: state.deployedCompanions,
    formationPositions: state.formationPositions,
    cultivationArts: state.cultivationArts,
    activeArtId: state.activeArtId,
    bloodlineLevels: state.bloodlineLevels,
    activeBloodlineId: state.activeBloodlineId,
    natalArtifacts: state.natalArtifacts,
    activeArtifactId: state.activeArtifactId,
    autoUltimate: state.autoUltimate,
    elixirBuffs: state.elixirBuffs,
    activeExpedition: state.activeExpedition,
    realmMap: state.realmMap,
    activeRelicIds: state.activeRelicIds,
    currentStage: state.currentStage,
    highestStageCleared: state.highestStageCleared,
    towerFloorCleared: state.towerFloorCleared,
    autoPushStage: state.autoPushStage,
    autoPushTower: state.autoPushTower,
    timeScale: state.timeScale,
    muted: state.muted,
    lastSavedAt: Date.now(),
  };
}

let cloudDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function saveToStorage(state: GameStore): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(extractPersisted(state)));
  } catch {
    // ignore storage errors
  }

  if (state.cloudSyncKey) {
    if (cloudDebounceTimer) clearTimeout(cloudDebounceTimer);
    cloudDebounceTimer = setTimeout(() => {
      useGameStore.getState().pushCloudSave().catch(() => {});
    }, 1800);
  }
}

function applyOfflineCalculation(merged: PersistedGameState): {
  state: PersistedGameState;
  offlineReward: OfflineRewardSummary | null;
} {
  const now = Date.now();
  const rawElapsed = Math.max(0, Math.floor((now - (merged.lastSavedAt || now)) / 1000));
  const maxSec = calcMaxOfflineSeconds(merged.buildings.springPool?.level ?? 1);
  const elapsedSeconds = Math.min(rawElapsed, maxSec);

  if (elapsedSeconds < 30) {
    return { state: { ...merged, lastSavedAt: now }, offlineReward: null };
  }

  const unlocks = getUnlockStatus(merged.realmTier, merged.realmSub, merged.highestStageCleared, merged.treeLevel);
  const stageBonus = merged.highestStageCleared;
  const stones = Math.round(calcBuildingRatePerSec('spiritArray', merged.buildings.spiritArray.level, stageBonus) * elapsedSeconds);
  const fruits = unlocks.springPool
    ? Math.floor(calcBuildingRatePerSec('springPool', merged.buildings.springPool.level, stageBonus) * elapsedSeconds)
    : 0;
  const exp = unlocks.alchemyFurnace
    ? Math.round(calcBuildingRatePerSec('alchemyFurnace', merged.buildings.alchemyFurnace.level, stageBonus) * elapsedSeconds)
    : 0;
  const food = unlocks.beastGarden
    ? Math.round(calcBuildingRatePerSec('beastGarden', merged.buildings.beastGarden.level, stageBonus) * elapsedSeconds)
    : 0;

  merged.resources.spiritStones += stones;
  merged.resources.spiritFruits += fruits;
  merged.exp += exp;
  merged.resources.beastFood += food;
  merged.lastSavedAt = now;

  return {
    state: merged,
    offlineReward: {
      elapsedSeconds,
      spiritStones: stones,
      spiritFruits: fruits,
      exp,
      beastFood: food,
      autoChopsSimulated: 0,
    },
  };
}

function mergeWithDefaults(parsed: Partial<PersistedGameState>): PersistedGameState {
  const defaults = createInitialPersistedState();
  return {
    ...defaults,
    ...parsed,
    resources: {
      ...defaults.resources,
      ...(parsed.resources ?? {}),
      herbs: { ...defaults.resources.herbs, ...(parsed.resources?.herbs ?? {}) },
    },
    autoChop: { ...defaults.autoChop, ...(parsed.autoChop ?? {}) },
    buildings: { ...defaults.buildings, ...(parsed.buildings ?? {}) },
    sandboxTiles: parsed.sandboxTiles?.length === 24 ? parsed.sandboxTiles : defaults.sandboxTiles,
    disciples: parsed.disciples?.length ? parsed.disciples : defaults.disciples,
    companions: { ...defaults.companions, ...(parsed.companions ?? {}) },
    formationPositions: { ...defaults.formationPositions, ...(parsed.formationPositions ?? {}) },
    cultivationArts: { ...defaults.cultivationArts, ...(parsed.cultivationArts ?? {}) },
    bloodlineLevels: { ...defaults.bloodlineLevels, ...(parsed.bloodlineLevels ?? {}) },
    natalArtifacts: { ...defaults.natalArtifacts, ...(parsed.natalArtifacts ?? {}) },
    elixirBuffs: { ...defaults.elixirBuffs, ...(parsed.elixirBuffs ?? {}) },
    realmMap: parsed.realmMap?.tiles?.length ? parsed.realmMap : defaults.realmMap,
  };
}

function loadInitialWithOffline(): {
  initial: PersistedGameState;
  offlineReward: OfflineRewardSummary | null;
  cloudKey: string;
} {
  const defaults = createInitialPersistedState();
  let cloudKey = '';
  try {
    if (typeof localStorage === 'undefined') return { initial: defaults, offlineReward: null, cloudKey };
    cloudKey = localStorage.getItem(CLOUD_KEY_STORAGE) ?? '';
    const raw = localStorage.getItem(SAVE_STORAGE_KEY) ?? localStorage.getItem('fuyu_wendao_save_v1');
    if (!raw) return { initial: defaults, offlineReward: null, cloudKey };
    const parsed = JSON.parse(raw) as Partial<PersistedGameState>;
    const merged = mergeWithDefaults(parsed);
    const { state, offlineReward } = applyOfflineCalculation(merged);
    return { initial: state, offlineReward, cloudKey };
  } catch {
    return { initial: defaults, offlineReward: null, cloudKey };
  }
}

const { initial: loadedState, offlineReward: initialOffline, cloudKey: initialCloudKey } = loadInitialWithOffline();
soundEngine.muted = loadedState.muted;

export const useGameStore = create<GameStore>((set, get) => ({
  ...loadedState,
  activeTab: 'island',
  combatMode: 'stage',
  combat: null,
  offlineReward: initialOffline,
  logs: [makeLog('踏入浮屿仙途！先砍伐灵树获取法宝，突破筑基即可解锁炼丹与心法之道。', 'info')],
  fxCue: null,
  tribulationModalOpen: false,
  selectedTile: null,
  activeRaid: null,
  pendingRelicChoices: null,
  pendingEvent: null,
  pendingMerchantOpen: false,
  pendingExploreTile: null,
  cloudSyncKey: initialCloudKey,
  cloudStatus: initialCloudKey ? 'syncing' : 'local',

  setActiveTab: (tab) => {
    set({ activeTab: tab });
    if (tab === 'combat' && !get().combat) {
      get().startStageCombat(get().currentStage);
    }
  },

  setHeroName: (name) => {
    const clean = name.trim().slice(0, 12) || '逍遥散修';
    set({ heroName: clean });
    saveToStorage(get());
  },

  setHeroElement: (elem) => {
    set({ heroElement: elem });
    saveToStorage(get());
  },

  selectSandboxTile: (x, y) => set({ selectedTile: { x, y } }),
  clearSelectedTile: () => set({ selectedTile: null }),

  unlockSandboxTile: (x, y) => {
    const s = get();
    const tile = s.sandboxTiles.find((t) => t.x === x && t.y === y);
    if (!tile || tile.unlocked) return;
    // 需与已解锁地块相邻
    const adjacent = s.sandboxTiles.some((t) => t.unlocked && Math.abs(t.x - x) + Math.abs(t.y - y) === 1);
    if (!adjacent) {
      set((st) => ({ logs: [makeLog('只能开垦与现有仙岛相邻的地块！', 'warn'), ...st.logs.slice(0, 29)] }));
      return;
    }
    const unlockedCount = s.sandboxTiles.filter((t) => t.unlocked).length;
    const stoneCost = 50 + (unlockedCount - 8) * 35;
    const bpCost = 1;
    if (s.resources.spiritStones < stoneCost || s.resources.blueprints < bpCost) {
      set((st) => ({ logs: [makeLog(`扩建地块需要 ${stoneCost} 灵石 + ${bpCost} 蓝图！`, 'warn'), ...st.logs.slice(0, 29)] }));
      return;
    }
    soundEngine.playLoot(true);
    set((st) => ({
      resources: {
        ...st.resources,
        spiritStones: st.resources.spiritStones - stoneCost,
        blueprints: st.resources.blueprints - bpCost,
      },
      sandboxTiles: st.sandboxTiles.map((t) => (t.x === x && t.y === y ? { ...t, unlocked: true } : t)),
      logs: [makeLog(`消耗 ${bpCost} 蓝图开垦浮岛新地块 (${x},${y})！`, 'good'), ...st.logs.slice(0, 29)],
    }));
    saveToStorage(get());
  },

  buildOnTile: (x, y, buildingId) => {
    const s = get();
    const tile = s.sandboxTiles.find((t) => t.x === x && t.y === y);
    if (!tile || !tile.unlocked || tile.buildingId) return;
    const alreadyBuilt = s.sandboxTiles.some((t) => t.buildingId === buildingId);
    if (alreadyBuilt) {
      set((st) => ({ logs: [makeLog(`${BUILDINGS[buildingId].name}已在仙岛建造，可直接点击升级！`, 'warn'), ...st.logs.slice(0, 29)] }));
      return;
    }
    const cfg = BUILDINGS[buildingId];
    const stoneCost = cfg.baseCost;
    const bpCost = 1;
    if (s.resources.spiritStones < stoneCost || s.resources.blueprints < bpCost) {
      set((st) => ({ logs: [makeLog(`建造${cfg.name}需 ${stoneCost} 灵石 + ${bpCost} 蓝图！`, 'warn'), ...st.logs.slice(0, 29)] }));
      return;
    }
    soundEngine.playBreakthrough();
    set((st) => ({
      resources: {
        ...st.resources,
        spiritStones: st.resources.spiritStones - stoneCost,
        blueprints: st.resources.blueprints - bpCost,
      },
      sandboxTiles: st.sandboxTiles.map((t) => (t.x === x && t.y === y ? { ...t, buildingId } : t)),
      buildings: {
        ...st.buildings,
        [buildingId]: { ...st.buildings[buildingId], level: Math.max(1, st.buildings[buildingId].level) },
      },
      selectedTile: null,
      logs: [makeLog(`在浮岛 (${x},${y}) 成功筑造【${cfg.name}】！`, 'epic'), ...st.logs.slice(0, 29)],
    }));
    saveToStorage(get());
  },

  recruitDisciple: () => {
    const s = get();
    if (s.disciples.length >= 5) return;
    const cost = 75 * s.disciples.length;
    if (s.resources.spiritStones < cost) {
      set((st) => ({ logs: [makeLog(`招募宗门弟子需要 ${cost} 灵石！`, 'warn'), ...st.logs.slice(0, 29)] }));
      return;
    }
    const roles: DiscipleState['role'][] = ['gather', 'alchemy', 'guard'];
    const names = ['青云药童', '玄铁炼徒', '灵溪巡卫', '紫竹仙侍', '天枢护院'];
    const idx = s.disciples.length;
    soundEngine.playLoot(true);
    set((st) => ({
      resources: { ...st.resources, spiritStones: st.resources.spiritStones - cost },
      disciples: [
        ...st.disciples,
        {
          id: `disc_${idx + 1}`,
          name: names[idx % names.length],
          role: roles[idx % roles.length],
          level: 1,
          x: 2,
          y: 1.5,
          targetX: 3.5,
          targetY: 2,
        },
      ],
      logs: [makeLog(`招收新弟子【${names[idx % names.length]}】，已在仙岛巡逻劳作！`, 'good'), ...st.logs.slice(0, 29)],
    }));
    saveToStorage(get());
  },

  triggerIslandRaid: () => {
    const s = get();
    if (s.activeRaid) return;
    const hp = Math.round(450 * Math.pow(1.32, s.raidWave - 1));
    set((st) => ({
      activeRaid: { wave: st.raidWave, enemyHp: hp, enemyMaxHp: hp },
      raidCountdownSec: 75,
      logs: [makeLog(`第 ${st.raidWave} 波妖兽攻岛来袭！全宗弟子与九霄雷塔正在御敌！`, 'warn'), ...st.logs.slice(0, 29)],
    }));
  },

  setTimeScale: (scale) => {
    set({ timeScale: scale });
    saveToStorage(get());
  },

  toggleMuted: () => {
    const next = !get().muted;
    soundEngine.muted = next;
    set({ muted: next });
    saveToStorage(get());
  },

  getUnlocks: () => {
    const s = get();
    return getUnlockStatus(s.realmTier, s.realmSub, s.highestStageCleared, s.treeLevel);
  },

  getMaxDeploySlots: () => {
    const tier = get().realmTier;
    if (tier >= 3) return 3;
    if (tier >= 1) return 2;
    return 1;
  },

  getHeroTotalPower: () => {
    const s = get();
    const heroStats = calcHeroTotalStats(
      s.realmTier,
      s.realmSub,
      s.equipment,
      s.buildings,
      s.cultivationArts,
      s.activeArtId,
      s.bloodlineLevels,
      s.activeBloodlineId,
      s.activeRelicIds,
      s.elixirBuffs
    );
    const heroPow = calcCombatPower(heroStats, 1 + s.realmTier * 0.5);
    let compPow = 0;
    for (const cid of s.deployedCompanions) {
      const st = s.companions[cid];
      if (st?.unlocked) {
        compPow += Math.round((120 + st.level * 45) * Math.pow(1.16, st.level - 1));
      }
    }
    return heroPow + compPow;
  },

  chopTree: () => {
    const s = get();
    if (s.pendingItem) {
      const existing = s.equipment[s.pendingItem.slot];
      if (!existing || s.pendingItem.power > existing.power) {
        get().equipPending();
      } else {
        get().decomposePending();
      }
    }

    const curr = get();
    if (curr.resources.spiritFruits < 1) {
      set((st) => ({
        logs: [makeLog('灵果耗尽！需等待瑶池灵泉凝聚或前往秘境斗法夺取灵果。', 'warn'), ...st.logs.slice(0, 29)],
      }));
      return;
    }

    soundEngine.playChop();
    const heroTotalLv = curr.realmTier * 9 + curr.realmSub;
    const { item, nextPity } = generateEquipment(heroTotalLv, curr.treeLevel, curr.pityCounter);
    const existing = curr.equipment[item.slot];
    const alchemyLv = curr.buildings.alchemyFurnace.level;
    const unlocks = curr.getUnlocks();

    if (unlocks.autoChop && curr.autoChop.enabled) {
      const canAutoEquip = curr.autoChop.autoEquipHigherPower && (!existing || item.power > existing.power);
      if (canAutoEquip) {
        const nextEquip = { ...curr.equipment, [item.slot]: item };
        let gainedExp = 0;
        let gainedStones = 0;
        if (existing) {
          const rw = calcDecomposeRewards(existing, alchemyLv);
          gainedExp = rw.exp;
          gainedStones = rw.spiritStones;
        }
        soundEngine.playLoot(item.quality >= 3);
        fxSeq += 1;
        set((st) => ({
          resources: {
            ...st.resources,
            spiritFruits: st.resources.spiritFruits - 1,
            spiritStones: st.resources.spiritStones + gainedStones,
          },
          exp: st.exp + gainedExp,
          equipment: nextEquip,
          pityCounter: nextPity,
          totalChops: st.totalChops + 1,
          fxCue: { id: fxSeq, type: 'loot', quality: item.quality, text: `自动换装 ${item.name}` },
          logs: [makeLog(`自动换上【${item.name}】(+${item.power - (existing?.power ?? 0)}战力)`, item.quality >= 3 ? 'epic' : 'good'), ...st.logs.slice(0, 29)],
        }));
        saveToStorage(get());
        return;
      }

      if (item.quality < curr.autoChop.minKeepQuality) {
        const rw = calcDecomposeRewards(item, alchemyLv);
        fxSeq += 1;
        set((st) => ({
          resources: {
            ...st.resources,
            spiritFruits: st.resources.spiritFruits - 1,
            spiritStones: st.resources.spiritStones + rw.spiritStones,
          },
          exp: st.exp + rw.exp,
          pityCounter: nextPity,
          totalChops: st.totalChops + 1,
          fxCue: { id: fxSeq, type: 'chop', quality: item.quality, text: `化灵 +${rw.exp}修为` },
          logs: [makeLog(`自动分解 ${item.name}，修为 +${rw.exp}、灵石 +${rw.spiritStones}`, 'info'), ...st.logs.slice(0, 29)],
        }));
        saveToStorage(get());
        return;
      }
    }

    soundEngine.playLoot(item.quality >= 3);
    fxSeq += 1;
    set((st) => ({
      resources: {
        ...st.resources,
        spiritFruits: st.resources.spiritFruits - 1,
      },
      pendingItem: item,
      pityCounter: nextPity,
      totalChops: st.totalChops + 1,
      fxCue: { id: fxSeq, type: 'loot', quality: item.quality, text: item.name },
    }));
    saveToStorage(get());
  },

  equipPending: () => {
    const s = get();
    if (!s.pendingItem) return;
    const item = s.pendingItem;
    const oldItem = s.equipment[item.slot];
    let expGain = 0;
    let stoneGain = 0;
    if (oldItem) {
      const rw = calcDecomposeRewards(oldItem, s.buildings.alchemyFurnace.level);
      expGain = rw.exp;
      stoneGain = rw.spiritStones;
    }
    set((st) => ({
      equipment: { ...st.equipment, [item.slot]: item },
      pendingItem: null,
      exp: st.exp + expGain,
      resources: {
        ...st.resources,
        spiritStones: st.resources.spiritStones + stoneGain,
      },
      logs: [
        makeLog(`装备【${item.name}】${oldItem ? `，旧装化灵得修为+${expGain}` : ''}`, item.quality >= 3 ? 'epic' : 'good'),
        ...st.logs.slice(0, 29),
      ],
    }));
    saveToStorage(get());
  },

  decomposePending: () => {
    const s = get();
    if (!s.pendingItem) return;
    const item = s.pendingItem;
    const rw = calcDecomposeRewards(item, s.buildings.alchemyFurnace.level);
    set((st) => ({
      pendingItem: null,
      exp: st.exp + rw.exp,
      resources: {
        ...st.resources,
        spiritStones: st.resources.spiritStones + rw.spiritStones,
      },
      logs: [makeLog(`分解【${item.name}】，修为 +${rw.exp}，灵石 +${rw.spiritStones}`, 'info'), ...st.logs.slice(0, 29)],
    }));
    saveToStorage(get());
  },

  reforgeEquipment: (slot) => {
    const s = get();
    if (!s.getUnlocks().reforge) return;
    const item = s.equipment[slot];
    if (!item || item.quality < 1) return;
    const dustCost = 20;
    const stoneCost = 35;
    if (s.resources.reforgeDust < dustCost || s.resources.spiritStones < stoneCost) {
      set((prev) => ({
        logs: [makeLog(`洗练需要 ${dustCost} 淬灵砂与 ${stoneCost} 灵石（挑战镇妖古塔获取淬灵砂）`, 'warn'), ...prev.logs.slice(0, 29)],
      }));
      return;
    }
    const reforged = reforgeItemSubStats(item);
    soundEngine.playLoot(true);
    set((prev) => ({
      resources: {
        ...prev.resources,
        reforgeDust: prev.resources.reforgeDust - dustCost,
        spiritStones: prev.resources.spiritStones - stoneCost,
      },
      equipment: { ...prev.equipment, [slot]: reforged },
      logs: [makeLog(`淬灵洗练【${reforged.name}】成功，新战力 ${reforged.power}！`, 'good'), ...prev.logs.slice(0, 29)],
    }));
    saveToStorage(get());
  },

  updateAutoChop: (patch) => {
    set((st) => ({
      autoChop: { ...st.autoChop, ...patch },
    }));
    saveToStorage(get());
  },

  upgradeTree: () => {
    const s = get();
    const lvCap = calcIslandLevelCap(s.highestStageCleared);
    if (s.treeLevel >= lvCap) {
      set((st) => ({
        logs: [
          makeLog(`灵树已达当前上限 Lv.${lvCap}！需先通关第 ${(lvCap - 1) * 2} 关秘境以拓宽洞天灵脉。`, 'warn'),
          ...st.logs.slice(0, 29),
        ],
      }));
      return;
    }
    const cost = calcTreeUpgradeCost(s.treeLevel);
    const bpCost = calcTreeBlueprintCost(s.treeLevel);
    if (s.resources.spiritStones < cost || s.resources.blueprints < bpCost) {
      set((st) => ({
        logs: [
          makeLog(`灵树升级需要 ${cost} 灵石 + ${bpCost} 仙建蓝图（推图或山海游历获取蓝图）`, 'warn'),
          ...st.logs.slice(0, 29),
        ],
      }));
      return;
    }
    const nextLv = s.treeLevel + 1;
    soundEngine.playBreakthrough();
    set((st) => ({
      treeLevel: nextLv,
      resources: {
        ...st.resources,
        spiritStones: st.resources.spiritStones - cost,
        blueprints: st.resources.blueprints - bpCost,
      },
      logs: [makeLog(`消耗 ${bpCost} 张仙建蓝图，太古灵树晋升至 Lv.${nextLv}！`, 'epic'), ...st.logs.slice(0, 29)],
    }));
    saveToStorage(get());
  },

  openTribulationModal: () => set({ tribulationModalOpen: true }),
  closeTribulationModal: () => set({ tribulationModalOpen: false }),

  attemptBreakthrough: (pillsUsed = 0) => {
    const s = get();
    const expReq = calcExpRequired(s.realmTier, s.realmSub);
    const stoneCost = calcBreakthroughStoneCost(s.realmTier, s.realmSub);
    const currentTierCfg = REALM_TIERS[s.realmTier];
    const isMajorBreak = s.realmSub >= currentTierCfg.maxSubLevel && s.realmTier < REALM_TIERS.length - 1;

    if (s.exp < expReq) {
      return { success: false, isMajor: isMajorBreak, message: '修为不足，无法冲击瓶颈！' };
    }
    if (s.resources.spiritStones < stoneCost) {
      set((st) => ({
        logs: [makeLog(`突破需要消耗 ${stoneCost} 灵石聚阵稳固经脉！`, 'warn'), ...st.logs.slice(0, 29)],
      }));
      return { success: false, isMajor: isMajorBreak, message: `灵石不足（需 ${stoneCost} 灵石）` };
    }

    const actualPills = isMajorBreak ? Math.min(pillsUsed, s.resources.tribulationPills, 3) : 0;

    if (isMajorBreak) {
      const { rate } = calcTribulationSuccessRate(s.realmTier, s.getHeroTotalPower(), actualPills);
      const roll = Math.random();
      if (roll > rate) {
        // 渡劫失败，产生真实挫败感与修为反噬
        const lostExp = Math.round(s.exp * 0.3);
        soundEngine.playHit(true);
        fxSeq += 1;
        set((st) => ({
          exp: Math.max(0, st.exp - lostExp),
          resources: {
            ...st.resources,
            spiritStones: st.resources.spiritStones - stoneCost,
            tribulationPills: st.resources.tribulationPills - actualPills,
          },
          fxCue: { id: fxSeq, type: 'breakthrough_fail', text: '天劫反噬! 渡劫失败' },
          logs: [
            makeLog(
              `九霄雷劫过猛！渡劫失败（成功率 ${(rate * 100).toFixed(0)}%），损失修为 ${lostExp}，请强化战力或攒渡劫丹再试！`,
              'warn'
            ),
            ...st.logs.slice(0, 29),
          ],
        }));
        saveToStorage(get());
        return { success: false, isMajor: true, message: `天劫反噬！修为散失 ${lostExp}，请提升战力或服用渡劫丹` };
      }
    }

    let nextTier = s.realmTier;
    let nextSub = s.realmSub + 1;
    if (isMajorBreak) {
      nextTier = s.realmTier + 1;
      nextSub = 1;
    }

    soundEngine.playBreakthrough();
    fxSeq += 1;
    const realmLabel = `${REALM_TIERS[clamp(nextTier, 0, REALM_TIERS.length - 1)].name}${nextSub}层`;
    set((st) => ({
      exp: st.exp - expReq,
      realmTier: nextTier,
      realmSub: nextSub,
      tribulationModalOpen: false,
      resources: {
        ...st.resources,
        spiritStones: st.resources.spiritStones - stoneCost,
        tribulationPills: st.resources.tribulationPills - actualPills,
        spiritFruits: st.resources.spiritFruits + (isMajorBreak ? 10 : 2),
      },
      fxCue: { id: fxSeq, type: 'breakthrough', text: isMajorBreak ? `飞升突破 · ${realmLabel}` : `突破 ${realmLabel}` },
      logs: [
        makeLog(
          isMajorBreak
            ? `力抗紫霄神雷！成功踏入【${realmLabel}】！解锁全新仙途功能，获赠 10 灵果！`
            : `冲破关窍，晋升至【${realmLabel}】！`,
          isMajorBreak ? 'epic' : 'good'
        ),
        ...st.logs.slice(0, 29),
      ],
    }));
    saveToStorage(get());
    return { success: true, isMajor: isMajorBreak, message: `成功晋升【${realmLabel}】！` };
  },

  collectBuilding: (id) => {
    const s = get();
    const b = s.buildings[id];
    const amt = Math.floor(b.storedAmount);
    if (amt <= 0) return;

    const res = { ...s.resources, herbs: { ...s.resources.herbs } };
    let expGain = 0;
    if (id === 'spiritArray') res.spiritStones += amt;
    if (id === 'springPool') res.spiritFruits += amt;
    if (id === 'alchemyFurnace') expGain = amt;
    if (id === 'beastGarden') res.beastFood += amt;
    if (id === 'herbFarm') {
      res.herbs.qingling += amt;
      res.herbs.chiyang += Math.floor(amt * 0.4);
      res.herbs.ziyu += Math.floor(amt * 0.25);
    }
    if (id === 'forge') res.spiritIron += amt;

    fxSeq += 1;
    set((st) => ({
      resources: res,
      exp: st.exp + expGain,
      buildings: {
        ...st.buildings,
        [id]: { ...b, storedAmount: b.storedAmount - amt },
      },
      fxCue: { id: fxSeq, type: 'collect', buildingId: id, text: `+${amt} ${BUILDINGS[id].resourceName}` },
    }));
    saveToStorage(get());
  },

  collectAllBuildings: () => {
    const unlocks = get().getUnlocks();
    BUILDING_ORDER.forEach((id) => {
      if (id === 'springPool' && !unlocks.springPool) return;
      if (id === 'alchemyFurnace' && !unlocks.alchemyFurnace) return;
      if (id === 'beastGarden' && !unlocks.beastGarden) return;
      if (id === 'herbFarm' && !unlocks.herbFarm) return;
      if (id === 'forge' && !unlocks.forge) return;
      get().collectBuilding(id);
    });
  },

  upgradeBuilding: (id) => {
    const s = get();
    const b = s.buildings[id];
    const lvCap = calcIslandLevelCap(s.highestStageCleared);
    if (b.level >= lvCap) {
      set((st) => ({
        logs: [
          makeLog(`${BUILDINGS[id].name}已达当前秘境上限 Lv.${lvCap}！请推图突破更高关卡。`, 'warn'),
          ...st.logs.slice(0, 29),
        ],
      }));
      return;
    }
    const cost = calcBuildingUpgradeCost(id, b.level);
    const bpCost = calcBuildingBlueprintCost(b.level);
    if (s.resources.spiritStones < cost || s.resources.blueprints < bpCost) {
      set((st) => ({
        logs: [makeLog(`升级${BUILDINGS[id].name}需要 ${cost} 灵石 + ${bpCost} 仙建蓝图`, 'warn'), ...st.logs.slice(0, 29)],
      }));
      return;
    }

    const nextLv = b.level + 1;
    soundEngine.playLoot(true);
    set((st) => ({
      resources: {
        ...st.resources,
        spiritStones: st.resources.spiritStones - cost,
        blueprints: st.resources.blueprints - bpCost,
      },
      buildings: {
        ...st.buildings,
        [id]: { ...b, level: nextLv },
      },
      logs: [
        makeLog(
          `${BUILDINGS[id].name} 晋升至 Lv.${nextLv}${nextLv === BUILDINGS[id].autoUnlockLevel ? '（已解锁傀儡自动收集！）' : ''}`,
          'good'
        ),
        ...st.logs.slice(0, 29),
      ],
    }));
    saveToStorage(get());
  },

  garrisonBuilding: (id, companionId) => {
    const s = get();
    if (companionId) {
      const comp = s.companions[companionId];
      if (!comp?.unlocked) return;
    }
    // 解除其他建筑的同一护法委任
    const nextBuildings = { ...s.buildings };
    for (const bid of BUILDING_ORDER) {
      if (nextBuildings[bid].garrisonCompanionId === companionId && companionId !== null) {
        nextBuildings[bid] = { ...nextBuildings[bid], garrisonCompanionId: null };
      }
    }
    nextBuildings[id] = { ...nextBuildings[id], garrisonCompanionId: companionId };
    set({ buildings: nextBuildings });
    saveToStorage(get());
  },

  useHourglass: () => {
    const s = get();
    if (s.resources.hourglasses < 1) return;
    const skipSec = 1800;
    const unlocks = s.getUnlocks();
    const stageBonus = s.highestStageCleared;
    const stones = Math.round(calcBuildingRatePerSec('spiritArray', s.buildings.spiritArray.level, stageBonus) * skipSec);
    const fruits = unlocks.springPool
      ? Math.floor(calcBuildingRatePerSec('springPool', s.buildings.springPool.level, stageBonus) * skipSec)
      : 0;
    const exp = unlocks.alchemyFurnace
      ? Math.round(calcBuildingRatePerSec('alchemyFurnace', s.buildings.alchemyFurnace.level, stageBonus) * skipSec)
      : 0;
    const food = unlocks.beastGarden
      ? Math.round(calcBuildingRatePerSec('beastGarden', s.buildings.beastGarden.level, stageBonus) * skipSec)
      : 0;

    soundEngine.playBreakthrough();
    set((st) => ({
      resources: {
        ...st.resources,
        hourglasses: st.resources.hourglasses - 1,
        spiritStones: st.resources.spiritStones + stones,
        spiritFruits: st.resources.spiritFruits + fruits,
        beastFood: st.resources.beastFood + food,
      },
      exp: st.exp + exp,
      logs: [
        makeLog(`催动时空沙漏！收获半小时产出：灵石+${stones}、灵果+${fruits}、修为+${exp}、兽粮+${food}`, 'epic'),
        ...st.logs.slice(0, 29),
      ],
    }));
    saveToStorage(get());
  },

  upgradeCompanion: (id) => {
    const s = get();
    const st = s.companions[id];
    const cfg = COMPANIONS.find((c) => c.id === id);
    if (!st || !cfg || !st.unlocked) return;

    const cost = calcCompanionFoodCost(st.level);
    if (s.resources.beastFood < cost) {
      set((prev) => ({
        logs: [makeLog(`兽粮不足，升级【${cfg.name}】需要 ${cost} 兽粮`, 'warn'), ...prev.logs.slice(0, 29)],
      }));
      return;
    }

    const nextLv = st.level + 1;
    const nextStar = nextLv % 5 === 0 ? st.star + 1 : st.star;
    soundEngine.playLoot(nextStar > st.star);
    set((prev) => ({
      resources: {
        ...prev.resources,
        beastFood: prev.resources.beastFood - cost,
      },
      companions: {
        ...prev.companions,
        [id]: {
          ...st,
          level: nextLv,
          star: nextStar,
          investedFood: st.investedFood + cost,
        },
      },
      logs: [makeLog(`【${cfg.name}】升至 Lv.${nextLv}${nextStar > st.star ? ` 突破 ${nextStar} 星！` : ''}`, 'good'), ...prev.logs.slice(0, 29)],
    }));
    saveToStorage(get());
  },

  resetCompanion: (id) => {
    const s = get();
    const st = s.companions[id];
    const cfg = COMPANIONS.find((c) => c.id === id);
    if (!st || !cfg || st.level <= 1) return;

    const refund = st.investedFood;
    set((prev) => ({
      resources: {
        ...prev.resources,
        beastFood: prev.resources.beastFood + refund,
      },
      companions: {
        ...prev.companions,
        [id]: { ...st, level: 1, star: 1, investedFood: 0 },
      },
      logs: [makeLog(`无损重生【${cfg.name}】，全额返还 ${refund} 兽粮！`, 'info'), ...prev.logs.slice(0, 29)],
    }));
    saveToStorage(get());
  },

  toggleDeployCompanion: (id) => {
    const s = get();
    const st = s.companions[id];
    if (!st?.unlocked) return;
    const maxSlots = s.getMaxDeploySlots();
    const exists = s.deployedCompanions.includes(id);

    let nextDeployed: string[];
    if (exists) {
      nextDeployed = s.deployedCompanions.filter((x) => x !== id);
    } else {
      if (s.deployedCompanions.length >= maxSlots) {
        nextDeployed = [...s.deployedCompanions.slice(1), id];
      } else {
        nextDeployed = [...s.deployedCompanions, id];
      }
    }
    set({ deployedCompanions: nextDeployed });
    if (s.combat) {
      if (s.combatMode === 'tower') get().startTowerCombat(s.towerFloorCleared + 1);
      else get().startStageCombat(s.currentStage);
    }
    saveToStorage(get());
  },

  upgradeCultivationArt: (id) => {
    const s = get();
    if (!s.getUnlocks().cultivationArts) return;
    const cfg = CULTIVATION_ARTS.find((a) => a.id === id);
    if (!cfg) return;
    const lv = s.cultivationArts[id] ?? 0;
    const cost = calcArtUpgradeCost(cfg.unlockCostStones, lv);
    if (s.resources.spiritStones < cost) {
      set((prev) => ({
        logs: [makeLog(`参悟${cfg.name}需要 ${cost} 灵石`, 'warn'), ...prev.logs.slice(0, 29)],
      }));
      return;
    }
    soundEngine.playBreakthrough();
    set((prev) => ({
      resources: { ...prev.resources, spiritStones: prev.resources.spiritStones - cost },
      cultivationArts: { ...prev.cultivationArts, [id]: lv + 1 },
      activeArtId: prev.activeArtId ?? id,
      logs: [makeLog(`参悟${cfg.name}至第 ${lv + 1} 重！`, 'epic'), ...prev.logs.slice(0, 29)],
    }));
    saveToStorage(get());
  },

  setActiveArt: (id) => {
    const s = get();
    if ((s.cultivationArts[id] ?? 0) <= 0) return;
    set({ activeArtId: id });
    saveToStorage(get());
  },

  upgradeBloodline: (id) => {
    const s = get();
    if (!s.getUnlocks().cultivationArts) return;
    const cfg = BLOODLINES.find((b) => b.id === id);
    if (!cfg) return;
    const lv = s.bloodlineLevels[id] ?? 0;
    const { dust, stones } = calcBloodlineUpgradeCost(lv);
    if (s.resources.reforgeDust < dust || s.resources.spiritStones < stones) {
      set((prev) => ({
        logs: [makeLog(`觉醒${cfg.name}需要 ${dust} 淬灵砂 + ${stones} 灵石`, 'warn'), ...prev.logs.slice(0, 29)],
      }));
      return;
    }
    soundEngine.playBreakthrough();
    set((prev) => ({
      resources: {
        ...prev.resources,
        reforgeDust: prev.resources.reforgeDust - dust,
        spiritStones: prev.resources.spiritStones - stones,
      },
      bloodlineLevels: { ...prev.bloodlineLevels, [id]: lv + 1 },
      activeBloodlineId: prev.activeBloodlineId ?? id,
      logs: [makeLog(`激活【${cfg.name}】至第 ${lv + 1} 阶！增减伤根基大幅强化！`, 'epic'), ...prev.logs.slice(0, 29)],
    }));
    saveToStorage(get());
  },

  setActiveBloodline: (id) => {
    const s = get();
    if ((s.bloodlineLevels[id] ?? 0) <= 0) return;
    set({ activeBloodlineId: id });
    saveToStorage(get());
  },

  startExpedition: (missionId, companionId) => {
    const s = get();
    if (s.activeExpedition) return;
    const mission = EXPEDITION_MISSIONS.find((m) => m.id === missionId);
    if (!mission) return;
    // 有护法带队缩短 25% 耗时
    const totalSec = companionId ? Math.round(mission.durationSec * 0.75) : mission.durationSec;
    set((prev) => ({
      activeExpedition: { missionId, companionId, remainingSec: totalSec, totalSec },
      logs: [makeLog(`派遣队伍前往【${mission.name}】，预计 ${totalSec} 秒后满载而归！`, 'info'), ...prev.logs.slice(0, 29)],
    }));
    saveToStorage(get());
  },

  claimExpedition: () => {
    const s = get();
    const exp = s.activeExpedition;
    if (!exp || exp.remainingSec > 0) return;
    const mission = EXPEDITION_MISSIONS.find((m) => m.id === exp.missionId);
    if (!mission) return;
    const rw = mission.rewards;
    soundEngine.playLoot(true);
    set((prev) => ({
      activeExpedition: null,
      resources: {
        ...prev.resources,
        blueprints: prev.resources.blueprints + (rw.blueprints ?? 0),
        spiritStones: prev.resources.spiritStones + (rw.spiritStones ?? 0),
        spiritFruits: prev.resources.spiritFruits + (rw.spiritFruits ?? 0),
        reforgeDust: prev.resources.reforgeDust + (rw.reforgeDust ?? 0),
        tribulationPills: prev.resources.tribulationPills + (rw.tribulationPills ?? 0),
      },
      logs: [
        makeLog(
          `【${mission.name}】游历归来！收获：${rw.blueprints ? `蓝图+${rw.blueprints} ` : ''}${rw.spiritFruits ? `灵果+${rw.spiritFruits} ` : ''}${rw.reforgeDust ? `淬灵砂+${rw.reforgeDust} ` : ''}${rw.tribulationPills ? `渡劫丹+${rw.tribulationPills} ` : ''}${rw.spiritStones ? `灵石+${rw.spiritStones}` : ''}`,
          'epic'
        ),
        ...prev.logs.slice(0, 28),
      ],
    }));
    saveToStorage(get());
  },

  brewAlchemyPill: (recipeId, qualityScore) => {
    const s = get();
    const recipe = ALCHEMY_RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return { ok: false, message: '丹方不存在' };
    if (s.buildings.alchemyFurnace.level < 1) return { ok: false, message: '需先在仙岛建造【紫金丹炉】！' };
    if (s.resources.spiritStones < recipe.stoneCost) {
      return { ok: false, message: `灵石不足（需 ${recipe.stoneCost}）` };
    }
    for (const [h, need] of Object.entries(recipe.ingredients)) {
      if ((s.resources.herbs[h as HerbId] ?? 0) < (need ?? 0)) {
        return { ok: false, message: '灵草不足，请建造药田或探索秘境采集！' };
      }
    }

    const nextHerbs = { ...s.resources.herbs };
    for (const [h, need] of Object.entries(recipe.ingredients)) {
      nextHerbs[h as HerbId] = Math.max(0, (nextHerbs[h as HerbId] ?? 0) - (need ?? 0));
    }

    const qLabel = qualityScore === 2 ? '极品' : qualityScore === 1 ? '中品' : '下品';
    const nextRes = { ...s.resources, spiritStones: s.resources.spiritStones - recipe.stoneCost, herbs: nextHerbs };
    let expGain = 0;
    const nextBuffs = { ...s.elixirBuffs };

    if (recipe.effectType === 'expGain') {
      const mult = qualityScore === 2 ? 1.6 : qualityScore === 1 ? 1.15 : 0.8;
      expGain = Math.round(180 * (1 + s.realmTier * 2.5) * mult);
    } else if (recipe.effectType === 'atkBuff') {
      nextBuffs.atkBuffTurns += qualityScore === 2 ? 6 : qualityScore === 1 ? 3 : 2;
    } else if (recipe.effectType === 'defBuff') {
      nextBuffs.defBuffTurns += qualityScore === 2 ? 6 : qualityScore === 1 ? 3 : 2;
    } else if (recipe.effectType === 'tribulationPill') {
      nextRes.tribulationPills += qualityScore === 2 ? 2 : 1;
    }

    soundEngine.playBreakthrough();
    set((st) => ({
      resources: nextRes,
      exp: st.exp + expGain,
      elixirBuffs: nextBuffs,
      logs: [
        makeLog(`开炉成丹！【${qLabel} · ${recipe.name}】炼制成功！${expGain ? `修为+${expGain}` : ''}`, qualityScore === 2 ? 'epic' : 'good'),
        ...st.logs.slice(0, 29),
      ],
    }));
    saveToStorage(get());
    return { ok: true, message: `成功炼出【${qLabel} · ${recipe.name}】！` };
  },

  forgeOrUpgradeArtifact: (id) => {
    const s = get();
    const cfg = NATAL_ARTIFACTS.find((a) => a.id === id);
    if (!cfg) return;
    if (s.buildings.forge.level < 1) {
      set((st) => ({ logs: [makeLog('需先在仙岛建造【神兵锻造坊】！', 'warn'), ...st.logs.slice(0, 29)] }));
      return;
    }
    const lv = s.natalArtifacts[id] ?? 0;
    const ironNeed = Math.round(cfg.forgeCostIron * Math.pow(1.45, lv));
    const dustNeed = Math.round(cfg.forgeCostDust * Math.pow(1.4, lv));
    if (s.resources.spiritIron < ironNeed || s.resources.reforgeDust < dustNeed) {
      set((st) => ({ logs: [makeLog(`锻造${cfg.name}需要 ${ironNeed} 玄铁 + ${dustNeed} 淬灵砂！`, 'warn'), ...st.logs.slice(0, 29)] }));
      return;
    }
    soundEngine.playBreakthrough();
    set((st) => ({
      resources: {
        ...st.resources,
        spiritIron: st.resources.spiritIron - ironNeed,
        reforgeDust: st.resources.reforgeDust - dustNeed,
      },
      natalArtifacts: { ...st.natalArtifacts, [id]: lv + 1 },
      activeArtifactId: st.activeArtifactId ?? id,
      logs: [makeLog(`神兵出炉！【${cfg.name}】锻造至 Lv.${lv + 1}！`, 'epic'), ...st.logs.slice(0, 29)],
    }));
    saveToStorage(get());
  },

  setActiveArtifact: (id) => {
    const s = get();
    if ((s.natalArtifacts[id] ?? 0) <= 0) return;
    set({ activeArtifactId: id });
    saveToStorage(get());
  },

  triggerCombatUltimate: () => {
    const s = get();
    if (!s.combat || s.combat.status !== 'fighting' || s.combat.rage < 100) return;
    const artId = s.activeArtifactId ?? 'zhuxian_sword';
    const artLv = Math.max(1, s.natalArtifacts[artId] ?? 1);
    const { nextState } = triggerNatalUltimate(s.combat, artId, artLv, s.buildings.forge.level);
    soundEngine.playBreakthrough();
    set({ combat: nextState });
  },

  toggleAutoUltimate: () => {
    set((st) => ({ autoUltimate: !st.autoUltimate }));
    saveToStorage(get());
  },

  setFormationSlot: (uid, row, col) => {
    const s = get();
    const nextPos = { ...s.formationPositions };
    // 若目标格已有其他单位，互换位置
    const occupant = Object.entries(nextPos).find(([, p]) => p.row === row && p.col === col);
    if (occupant && occupant[0] !== uid) {
      nextPos[occupant[0]] = nextPos[uid] ?? { row: 1, col: 0 };
    }
    nextPos[uid] = { row, col };
    set({ formationPositions: nextPos });
    saveToStorage(get());
  },

  moveRealmMapTile: (x, y) => {
    const s = get();
    if (s.pendingRelicChoices || s.pendingEvent || s.pendingMerchantOpen || s.pendingExploreTile) return;
    const { playerX, playerY, tiles } = s.realmMap;
    const dist = Math.abs(x - playerX) + Math.abs(y - playerY);
    if (dist !== 1) return;
    const target = tiles.find((t) => t.x === x && t.y === y);
    if (!target) return;

    const updatedTiles = tiles.map((t) => {
      const reveal = t.revealed || Math.abs(t.x - x) + Math.abs(t.y - y) <= 1;
      const cleared = t.x === x && t.y === y && (t.type === 'empty' || t.type === 'herb' || t.type === 'chest' || t.type === 'start')
        ? true
        : t.cleared;
      return { ...t, revealed: reveal, cleared };
    });

    const nextMap = { ...s.realmMap, playerX: x, playerY: y, tiles: updatedTiles };

    if (!target.cleared) {
      if (target.type === 'herb') {
        const herbKeys: HerbId[] = ['qingling', 'chiyang', 'ziyu', 'jiuyou'];
        const pick = herbKeys[Math.floor(Math.random() * (s.realmMap.floor >= 2 ? 4 : 3))];
        const amt = 2 + Math.floor(Math.random() * 2);
        const iron = 5 + s.realmMap.floor * 2;
        soundEngine.playLoot(false);
        set((st) => ({
          realmMap: nextMap,
          resources: {
            ...st.resources,
            spiritIron: st.resources.spiritIron + iron,
            herbs: { ...st.resources.herbs, [pick]: (st.resources.herbs[pick] ?? 0) + amt },
          },
          logs: [makeLog(`秘境采药：获得灵草 +${amt}、玄铁 +${iron}！`, 'good'), ...st.logs.slice(0, 29)],
        }));
        saveToStorage(get());
        return;
      }
      if (target.type === 'chest') {
        const bp = 1 + (Math.random() < 0.4 ? 1 : 0);
        const stones = 45 + s.realmMap.floor * 20;
        soundEngine.playLoot(true);
        set((st) => ({
          realmMap: nextMap,
          resources: { ...st.resources, blueprints: st.resources.blueprints + bp, spiritStones: st.resources.spiritStones + stones },
          logs: [makeLog(`开启古修宝箱：仙建蓝图 +${bp}、灵石 +${stones}！`, 'epic'), ...st.logs.slice(0, 29)],
        }));
        saveToStorage(get());
        return;
      }
      if (target.type === 'shrine') {
        const shuffled = [...ROGUELITE_RELICS].sort(() => Math.random() - 0.5).slice(0, 3);
        set({ realmMap: nextMap, pendingRelicChoices: shuffled });
        return;
      }
      if (target.type === 'event') {
        const ev = REALM_EVENTS[Math.floor(Math.random() * REALM_EVENTS.length)];
        set({ realmMap: nextMap, pendingEvent: ev });
        return;
      }
      if (target.type === 'merchant') {
        set({ realmMap: nextMap, pendingMerchantOpen: true });
        return;
      }
      if (target.type === 'enemy' || target.type === 'boss') {
        const stageLevel = s.realmMap.floor * 3 + (target.type === 'boss' ? 2 : 0);
        const sim = createCombatSession({
          mode: 'explore',
          stage: stageLevel,
          heroName: s.heroName,
          heroElement: s.heroElement,
          realmTier: s.realmTier,
          realmSub: s.realmSub,
          equipment: s.equipment,
          buildings: s.buildings,
          deployedCompanions: s.deployedCompanions,
          companionStates: s.companions,
          formationPositions: s.formationPositions,
          cultivationArts: s.cultivationArts,
          activeArtId: s.activeArtId,
          bloodlineLevels: s.bloodlineLevels,
          activeBloodlineId: s.activeBloodlineId,
          activeRelicIds: s.activeRelicIds,
          elixirBuffs: s.elixirBuffs,
        });
        set({
          realmMap: nextMap,
          pendingExploreTile: { x, y, isBoss: target.type === 'boss' },
          activeTab: 'combat',
          combatMode: 'explore',
          combat: sim,
        });
        return;
      }
    }

    set({ realmMap: nextMap });
    saveToStorage(get());
  },

  pickRogueliteRelic: (id) => {
    const s = get();
    const { playerX, playerY, tiles } = s.realmMap;
    const relic = ROGUELITE_RELICS.find((r) => r.id === id);
    set((st) => ({
      pendingRelicChoices: null,
      activeRelicIds: st.activeRelicIds.includes(id) ? st.activeRelicIds : [...st.activeRelicIds, id],
      realmMap: {
        ...st.realmMap,
        tiles: tiles.map((t) => (t.x === playerX && t.y === playerY ? { ...t, cleared: true } : t)),
      },
      logs: [makeLog(`获得秘境机缘赐福【${relic?.name ?? id}】！`, 'epic'), ...st.logs.slice(0, 29)],
    }));
    saveToStorage(get());
  },

  resolveRealmEvent: (choiceIdx) => {
    const s = get();
    const ev = s.pendingEvent;
    if (!ev) return;
    const ch = ev.choices[choiceIdx];
    const { playerX, playerY, tiles } = s.realmMap;
    soundEngine.playLoot(true);
    set((st) => ({
      pendingEvent: null,
      realmMap: {
        ...st.realmMap,
        tiles: tiles.map((t) => (t.x === playerX && t.y === playerY ? { ...t, cleared: true } : t)),
      },
      resources: {
        ...st.resources,
        spiritStones: st.resources.spiritStones + (ch.stones ?? 0),
        spiritIron: st.resources.spiritIron + (ch.iron ?? 0),
        blueprints: st.resources.blueprints + (ch.blueprints ?? 0),
        herbs: {
          ...st.resources.herbs,
          qingling: (st.resources.herbs.qingling ?? 0) + (ch.herbs ?? 0),
        },
      },
      logs: [makeLog(`秘境奇遇【${ev.title}】：获得 ${ch.rewardText}`, 'epic'), ...st.logs.slice(0, 29)],
    }));
    saveToStorage(get());
  },

  buyMerchantItem: (kind) => {
    const s = get();
    const prices = { blueprint: 80, pill: 120, dust: 70 };
    const cost = prices[kind];
    if (s.resources.spiritStones < cost) {
      set((st) => ({ logs: [makeLog(`仙商交易需要 ${cost} 灵石！`, 'warn'), ...st.logs.slice(0, 29)] }));
      return;
    }
    soundEngine.playLoot(true);
    set((st) => ({
      resources: {
        ...st.resources,
        spiritStones: st.resources.spiritStones - cost,
        blueprints: st.resources.blueprints + (kind === 'blueprint' ? 2 : 0),
        tribulationPills: st.resources.tribulationPills + (kind === 'pill' ? 1 : 0),
        reforgeDust: st.resources.reforgeDust + (kind === 'dust' ? 25 : 0),
      },
      logs: [makeLog(`与云游仙商交易成功！`, 'good'), ...st.logs.slice(0, 29)],
    }));
    saveToStorage(get());
  },

  closeMerchant: () => {
    const s = get();
    const { playerX, playerY, tiles } = s.realmMap;
    set({
      pendingMerchantOpen: false,
      realmMap: {
        ...s.realmMap,
        tiles: tiles.map((t) => (t.x === playerX && t.y === playerY ? { ...t, cleared: true } : t)),
      },
    });
    saveToStorage(get());
  },

  resetRealmMap: (floor) => {
    const nextFloor = floor ?? 1;
    set({
      realmMap: generateRealmMap(nextFloor),
      activeRelicIds: [],
      pendingRelicChoices: null,
      pendingEvent: null,
      pendingMerchantOpen: false,
      pendingExploreTile: null,
    });
    saveToStorage(get());
  },

  startStageCombat: (stageOverride) => {
    const s = get();
    const stage = Math.max(1, stageOverride ?? s.currentStage);
    const sim = createCombatSession({
      mode: 'stage',
      stage,
      heroName: s.heroName,
      heroElement: s.heroElement,
      realmTier: s.realmTier,
      realmSub: s.realmSub,
      equipment: s.equipment,
      buildings: s.buildings,
      deployedCompanions: s.deployedCompanions,
      companionStates: s.companions,
      formationPositions: s.formationPositions,
      cultivationArts: s.cultivationArts,
      activeArtId: s.activeArtId,
      bloodlineLevels: s.bloodlineLevels,
      activeBloodlineId: s.activeBloodlineId,
      elixirBuffs: s.elixirBuffs,
    });
    set({ combatMode: 'stage', currentStage: stage, combat: sim });
  },

  startTowerCombat: (floorOverride) => {
    const s = get();
    if (!s.getUnlocks().tower) return;
    const floor = Math.max(1, floorOverride ?? s.towerFloorCleared + 1);
    const sim = createCombatSession({
      mode: 'tower',
      stage: floor,
      heroName: s.heroName,
      heroElement: s.heroElement,
      realmTier: s.realmTier,
      realmSub: s.realmSub,
      equipment: s.equipment,
      buildings: s.buildings,
      deployedCompanions: s.deployedCompanions,
      companionStates: s.companions,
      formationPositions: s.formationPositions,
      cultivationArts: s.cultivationArts,
      activeArtId: s.activeArtId,
      bloodlineLevels: s.bloodlineLevels,
      activeBloodlineId: s.activeBloodlineId,
      elixirBuffs: s.elixirBuffs,
    });
    set({ activeTab: 'combat', combatMode: 'tower', combat: sim });
  },

  tickCombatStep: () => {
    const s = get();
    if (!s.combat || s.combat.status !== 'fighting') return;

    const { nextState, turnEvents } = stepCombatTurn(s.combat);
    const hasCrit = turnEvents.some((e) => e.type === 'crit');
    if (s.activeTab === 'combat' && turnEvents.some((e) => e.amount > 0)) {
      soundEngine.playHit(hasCrit);
    }

    // 开启自动施法时，满 100 怒气自动祭出本命法宝
    if (nextState.status === 'fighting' && nextState.rage >= 100 && s.autoUltimate) {
      const artId = s.activeArtifactId ?? 'zhuxian_sword';
      const artLv = Math.max(1, s.natalArtifacts[artId] ?? 1);
      const ultRes = triggerNatalUltimate(nextState, artId, artLv, s.buildings.forge.level);
      set({ combat: ultRes.nextState });
      return;
    }

    if (nextState.status === 'victory') {
      // 消耗 1 场丹药增益计数
      const nextElixirBuffs = {
        atkBuffTurns: Math.max(0, s.elixirBuffs.atkBuffTurns - 1),
        defBuffTurns: Math.max(0, s.elixirBuffs.defBuffTurns - 1),
      };

      if (nextState.mode === 'explore' && s.pendingExploreTile) {
        const { x, y, isBoss } = s.pendingExploreTile;
        const nextFloor = isBoss ? s.realmMap.floor + 1 : s.realmMap.floor;
        const bp = isBoss ? 2 : 1;
        const iron = isBoss ? 15 : 6;
        const dust = isBoss ? 25 : 10;
        set((prev) => ({
          combat: nextState,
          elixirBuffs: nextElixirBuffs,
          pendingExploreTile: null,
          resources: {
            ...prev.resources,
            blueprints: prev.resources.blueprints + bp,
            spiritIron: prev.resources.spiritIron + iron,
            reforgeDust: prev.resources.reforgeDust + dust,
          },
          realmMap: isBoss
            ? generateRealmMap(nextFloor)
            : {
                ...prev.realmMap,
                tiles: prev.realmMap.tiles.map((t) => (t.x === x && t.y === y ? { ...t, cleared: true } : t)),
              },
          logs: [
            makeLog(
              isBoss
                ? `击败秘境妖王！蓝图+${bp}、玄铁+${iron}、淬灵砂+${dust}，自动进入星图第 ${nextFloor} 域！`
                : `清剿巡逻妖兽！蓝图+${bp}、玄铁+${iron}、淬灵砂+${dust}`,
              'epic'
            ),
            ...prev.logs.slice(0, 28),
          ],
        }));
        saveToStorage(get());
        setTimeout(() => {
          const latest = get();
          if (latest.combatMode === 'explore') latest.setActiveTab('explore');
        }, 900);
        return;
      }

      if (nextState.mode === 'tower') {
        const floor = nextState.stage;
        const isFirst = floor > s.towerFloorCleared;
        const dustGain = 15 + floor * 6 + (isFirst ? 20 : 0);
        const pillGain = isFirst || floor % 3 === 0 ? 1 : 0;
        const bpGain = isFirst ? 1 : 0;
        const stoneGain = 45 + floor * 25;
        set((prev) => ({
          combat: nextState,
          towerFloorCleared: Math.max(prev.towerFloorCleared, floor),
          resources: {
            ...prev.resources,
            reforgeDust: prev.resources.reforgeDust + dustGain,
            tribulationPills: prev.resources.tribulationPills + pillGain,
            blueprints: prev.resources.blueprints + bpGain,
            spiritStones: prev.resources.spiritStones + stoneGain,
          },
          logs: [
            makeLog(
              `镇妖古塔第 ${floor} 层镇压成功！淬灵砂+${dustGain}、灵石+${stoneGain}${bpGain ? '、蓝图+1' : ''}${pillGain ? '、渡劫丹+1' : ''}`,
              'epic'
            ),
            ...prev.logs.slice(0, 28),
          ],
        }));
        saveToStorage(get());

        // 修复镇妖塔通关后无缝自动进入下一层！
        setTimeout(() => {
          const latest = get();
          if (latest.activeTab === 'combat' && latest.combatMode === 'tower' && latest.autoPushTower) {
            latest.startTowerCombat(floor + 1);
          }
        }, 900);
        return;
      }

      const stage = nextState.stage;
      const isFirstClear = stage > s.highestStageCleared;
      const stoneReward = Math.round((24 + stage * 14) * (nextState.isBoss ? 2.2 : 1) * (isFirstClear ? 1.6 : 0.5));
      const fruitReward = (nextState.isBoss ? 6 : 1) + (isFirstClear ? 2 : 0);
      const foodReward = Math.round((10 + stage * 4) * (isFirstClear ? 1.4 : 0.6));
      const expReward = Math.round((24 + stage * 15) * (isFirstClear ? 1.4 : 0.65));
      const pillBonus = nextState.isBoss && isFirstClear ? 1 : 0;
      const bpBonus = isFirstClear ? (nextState.isBoss ? 3 : nextState.stage % 2 === 0 ? 2 : 1) : Math.random() < 0.2 ? 1 : 0;

      const updatedComps = { ...s.companions };
      const newlyUnlocked: string[] = [];
      for (const c of COMPANIONS) {
        if (!updatedComps[c.id].unlocked && stage >= c.unlockStage) {
          updatedComps[c.id] = { ...updatedComps[c.id], unlocked: true };
          newlyUnlocked.push(c.name);
        }
      }

      const nextHighest = Math.max(s.highestStageCleared, stage);
      const nextStage = s.autoPushStage ? stage + 1 : stage;

      set((prev) => ({
        combat: nextState,
        highestStageCleared: nextHighest,
        companions: updatedComps,
        exp: prev.exp + expReward,
        resources: {
          ...prev.resources,
          spiritStones: prev.resources.spiritStones + stoneReward,
          spiritFruits: prev.resources.spiritFruits + fruitReward,
          beastFood: prev.resources.beastFood + foodReward,
          tribulationPills: prev.resources.tribulationPills + pillBonus,
          blueprints: prev.resources.blueprints + bpBonus,
        },
        logs: [
          ...(newlyUnlocked.length > 0
            ? [makeLog(`解锁新护法灵兽：【${newlyUnlocked.join('、')}】加入仙途！`, 'epic')]
            : []),
          makeLog(
            `通关第 ${stage} 关！灵石+${stoneReward}、灵果+${fruitReward}${bpBonus ? `、仙建蓝图+${bpBonus}` : ''}${pillBonus ? '、渡劫丹+1' : ''}`,
            nextState.isBoss ? 'epic' : 'good'
          ),
          ...prev.logs.slice(0, 28),
        ],
      }));
      saveToStorage(get());

      setTimeout(() => {
        const latest = get();
        if (latest.activeTab === 'combat' && latest.combatMode === 'stage') {
          latest.startStageCombat(nextStage);
        } else {
          set({ currentStage: nextStage });
        }
      }, 950);
      return;
    }

    if (nextState.status === 'defeat') {
      set((prev) => ({
        combat: nextState,
        autoPushStage: false,
        logs: [
          makeLog(
            nextState.mode === 'tower'
              ? `镇妖塔第 ${nextState.stage} 层挑战失败，请先淬炼法宝或参悟心法后再战！`
              : `第 ${nextState.stage} 关妖魔凶猛，斗法惜败！请回洞天砍树换装或调整阵容。`,
            'warn'
          ),
          ...prev.logs.slice(0, 29),
        ],
      }));
      if (nextState.mode === 'explore') {
        setTimeout(() => {
          set({ pendingExploreTile: null, activeTab: 'explore', combatMode: 'stage', combat: null });
        }, 1200);
      } else if (nextState.mode === 'stage') {
        setTimeout(() => {
          const latest = get();
          if (latest.activeTab === 'combat' && latest.combatMode === 'stage') {
            latest.startStageCombat(Math.max(1, nextState.stage));
          }
        }, 1300);
      }
      return;
    }

    set({ combat: nextState });
  },

  toggleAutoPushStage: () => {
    set((st) => ({ autoPushStage: !st.autoPushStage }));
  },

  toggleAutoPushTower: () => {
    set((st) => ({ autoPushTower: !st.autoPushTower }));
  },

  tickGame: (rawDtSeconds) => {
    const s = get();
    const dt = rawDtSeconds * s.timeScale;
    const stageBonus = s.highestStageCleared;
    const unlocks = s.getUnlocks();

    const nextBuildings = { ...s.buildings };
    const nextRes = { ...s.resources };
    let nextExp = s.exp;

    const builtSet = new Set(s.sandboxTiles.filter((t) => t.buildingId && t.buildingId !== 'spiritTree').map((t) => t.buildingId));

    for (const id of BUILDING_ORDER) {
      if (id === 'springPool' && !unlocks.springPool) continue;
      if (id === 'alchemyFurnace' && !unlocks.alchemyFurnace) continue;
      if (id === 'beastGarden' && !unlocks.beastGarden) continue;
      if (id === 'herbFarm' && !unlocks.herbFarm) continue;
      if (id === 'forge' && !unlocks.forge) continue;
      if (id === 'thunderTower') continue;

      const b = nextBuildings[id];
      if (b.level <= 0 && !builtSet.has(id)) continue;
      const effLv = Math.max(1, b.level);
      const discipleBonus = 1 + s.disciples.length * 0.1;
      const rate = calcBuildingRatePerSec(id, effLv, stageBonus, Boolean(b.garrisonCompanionId)) * discipleBonus;
      const gained = rate * dt;
      const cap = rate * 3600 * 4;

      if (effLv >= BUILDINGS[id].autoUnlockLevel) {
        const total = b.storedAmount + gained;
        const whole = Math.floor(total);
        const frac = total - whole;
        if (whole > 0) {
          if (id === 'spiritArray') nextRes.spiritStones += whole;
          if (id === 'springPool') nextRes.spiritFruits += whole;
          if (id === 'alchemyFurnace') nextExp += whole;
          if (id === 'beastGarden') nextRes.beastFood += whole;
          if (id === 'herbFarm') {
            nextRes.herbs = {
              ...nextRes.herbs,
              qingling: nextRes.herbs.qingling + whole,
              chiyang: nextRes.herbs.chiyang + (Math.random() < 0.35 ? 1 : 0),
              ziyu: nextRes.herbs.ziyu + (Math.random() < 0.25 ? 1 : 0),
            };
          }
          if (id === 'forge') nextRes.spiritIron += whole;
        }
        nextBuildings[id] = { ...b, storedAmount: frac };
      } else {
        nextBuildings[id] = { ...b, storedAmount: Math.min(cap, b.storedAmount + gained) };
      }
    }

    // 弟子在沙盘地块间移动巡逻
    const unlockedTiles = s.sandboxTiles.filter((t) => t.unlocked);
    const nextDisciples = s.disciples.map((d) => {
      const dx = d.targetX - d.x;
      const dy = d.targetY - d.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.12 && unlockedTiles.length > 0) {
        const pick = unlockedTiles[Math.floor(Math.random() * unlockedTiles.length)];
        return { ...d, targetX: pick.x + 0.5, targetY: pick.y + 0.5 };
      }
      const step = Math.min(dist, dt * 0.85);
      return {
        ...d,
        x: d.x + (dx / Math.max(0.01, dist)) * step,
        y: d.y + (dy / Math.max(0.01, dist)) * step,
      };
    });

    // 妖兽攻岛倒计时与守岛战斗结算
    let nextRaidCd = s.raidCountdownSec;
    let nextRaid = s.activeRaid ? { ...s.activeRaid } : null;
    let nextRaidWave = s.raidWave;
    const extraLogs: GameLogEntry[] = [];

    if (nextRaid) {
      const towerDps = s.buildings.thunderTower.level * 55;
      const discipleDps = s.disciples.length * 32 + 45;
      nextRaid.enemyHp -= (towerDps + discipleDps) * dt;
      if (nextRaid.enemyHp <= 0) {
        const ironGain = 8 + nextRaid.wave * 4;
        const bpGain = nextRaid.wave % 2 === 1 ? 1 : 0;
        nextRes.spiritIron += ironGain;
        nextRes.blueprints += bpGain;
        nextRes.spiritStones += 25 + nextRaid.wave * 12;
        extraLogs.push(makeLog(`成功击退第 ${nextRaid.wave} 波攻岛妖兽！玄铁+${ironGain}${bpGain ? '、蓝图+1' : ''}`, 'epic'));
        nextRaid = null;
        nextRaidWave += 1;
        nextRaidCd = 75;
      }
    } else {
      nextRaidCd -= dt;
      if (nextRaidCd <= 0) {
        const hp = Math.round(420 * Math.pow(1.28, s.raidWave - 1));
        nextRaid = { wave: s.raidWave, enemyHp: hp, enemyMaxHp: hp };
        extraLogs.push(makeLog(`第 ${s.raidWave} 波妖兽攻岛袭来！弟子与雷塔已开始迎敌！`, 'warn'));
      }
    }

    const nextExpedition = s.activeExpedition
      ? { ...s.activeExpedition, remainingSec: Math.max(0, s.activeExpedition.remainingSec - dt) }
      : null;

    set((prev) => ({
      buildings: nextBuildings,
      resources: nextRes,
      exp: nextExp,
      disciples: nextDisciples,
      raidCountdownSec: nextRaidCd,
      activeRaid: nextRaid,
      raidWave: nextRaidWave,
      activeExpedition: nextExpedition,
      logs: extraLogs.length ? [...extraLogs, ...prev.logs.slice(0, 27)] : prev.logs,
      lastSavedAt: Date.now(),
    }));
  },

  dismissOfflineReward: () => {
    set({ offlineReward: null });
    saveToStorage(get());
  },

  exportSaveJson: () => JSON.stringify(extractPersisted(get())),

  importSaveJson: (raw) => {
    try {
      const parsed = JSON.parse(raw) as Partial<PersistedGameState>;
      if (!parsed || typeof parsed.realmTier !== 'number' || !parsed.resources) {
        return { ok: false, error: '存档格式无效' };
      }
      const merged = mergeWithDefaults(parsed);
      set({ ...merged, combat: null, offlineReward: null });
      saveToStorage(get());
      return { ok: true };
    } catch {
      return { ok: false, error: 'JSON 解析失败，请检查存档文本' };
    }
  },

  resetAllProgress: () => {
    const fresh = createInitialPersistedState();
    set({
      ...fresh,
      combat: null,
      offlineReward: null,
      logs: [makeLog('兵解重修，一切从炼气一层重新开始！', 'info')],
    });
    saveToStorage(get());
  },

  bindCloudSyncKey: async (rawKey) => {
    const clean = rawKey.trim();
    if (clean.length < 3) return { ok: false, message: '云端存档口令至少需要 3 个字符' };
    set({ cloudStatus: 'syncing' });
    try {
      const resp = await fetch(`/api/save/${encodeURIComponent(clean)}`);
      if (resp.status === 404) {
        // 尚无云端记录，将当前进度上传绑定
        localStorage.setItem(CLOUD_KEY_STORAGE, clean);
        set({ cloudSyncKey: clean });
        const ok = await get().pushCloudSave();
        return {
          ok,
          message: ok ? `已绑定新云端仙途口令【${clean}】，当前进度已同步上云！` : '云端保存失败，请检查服务器状态',
        };
      }
      if (!resp.ok) {
        set({ cloudStatus: 'offline_backend' });
        return { ok: false, message: '未检测到 VPS 云存档后端（当前为纯静态模式）' };
      }
      const data = (await resp.json()) as { exists?: boolean; save?: Partial<PersistedGameState> };
      if (data.exists && data.save) {
        const merged = mergeWithDefaults(data.save);
        const { state, offlineReward } = applyOfflineCalculation(merged);
        localStorage.setItem(CLOUD_KEY_STORAGE, clean);
        set({
          ...state,
          cloudSyncKey: clean,
          cloudStatus: 'synced',
          combat: null,
          offlineReward,
          logs: [makeLog(`已从云端恢复【${clean}】的仙途存档！`, 'epic'), ...get().logs.slice(0, 28)],
        });
        localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(extractPersisted(get())));
        return { ok: true, message: `已从云端加载【${clean}】的存档！` };
      }
      return { ok: false, message: '云端存档响应异常' };
    } catch {
      set({ cloudStatus: 'offline_backend' });
      return { ok: false, message: '未连接云存档服务（若在本地或纯静态页面，请启动后端或使用 JSON 导入导出）' };
    }
  },

  pushCloudSave: async () => {
    const s = get();
    if (!s.cloudSyncKey) return false;
    set({ cloudStatus: 'syncing' });
    try {
      const resp = await fetch(`/api/save/${encodeURIComponent(s.cloudSyncKey)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(extractPersisted(s)),
      });
      if (!resp.ok) {
        set({ cloudStatus: 'error' });
        return false;
      }
      set({ cloudStatus: 'synced' });
      return true;
    } catch {
      set({ cloudStatus: 'offline_backend' });
      return false;
    }
  },

  unbindCloudSync: () => {
    localStorage.removeItem(CLOUD_KEY_STORAGE);
    set({ cloudSyncKey: '', cloudStatus: 'local' });
  },
}));
