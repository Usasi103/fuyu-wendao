import { useEffect, useState } from 'react';
import {
  Axe,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cloud,
  Compass,
  Flame,
  FlaskConical,
  Hammer,
  Hourglass,
  Lock,
  Map,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Swords,
  Trees,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { AlchemyForgeFormation } from './components/AlchemyForgeFormation';
import { ArtsPanel, BuildingsPanel, CompanionsPanel, ExpeditionBloodlinePanel, GearPanel } from './components/Drawers';
import { EquipmentCompareModal } from './components/EquipmentModal';
import { ExplorationView } from './components/ExplorationView';
import { DisciplesRaidBar, SandboxTilePanel } from './components/SandboxTilePanel';
import { SettingsModal } from './components/SettingsModal';
import { TribulationModal } from './components/TribulationModal';
import {
  BeastFoodIcon,
  BlueprintIcon,
  CornerFiligree,
  DustIcon,
  PillIcon,
  SpiritFruitIcon,
  SpiritStoneIcon,
  XianxiaModalBackdrop,
} from './components/XianxiaUI';
import { NATAL_ARTIFACTS } from './data/alchemyAndForge';
import {
  calcBreakthroughStoneCost,
  calcExpRequired,
  calcIslandLevelCap,
  calcTreeBlueprintCost,
  calcTreeUpgradeCost,
  getRealmDisplay,
} from './core/formulas';
import { QUALITY_CONFIG } from './data/realms';
import { QualityTier } from './core/types';
import { CombatScene } from './game/CombatScene';
import { IslandScene } from './game/IslandScene';
import { useGameStore } from './store/gameStore';

export function App() {
  const [bottomTab, setBottomTab] = useState<'buildings' | 'alchemy' | 'gear' | 'companions' | 'arts' | 'expedition' | 'logs'>('buildings');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeTab = useGameStore((s) => s.activeTab);
  const setActiveTab = useGameStore((s) => s.setActiveTab);
  const combatMode = useGameStore((s) => s.combatMode);
  const heroName = useGameStore((s) => s.heroName);
  const realmTier = useGameStore((s) => s.realmTier);
  const realmSub = useGameStore((s) => s.realmSub);
  const exp = useGameStore((s) => s.exp);
  const treeLevel = useGameStore((s) => s.treeLevel);
  const pityCounter = useGameStore((s) => s.pityCounter);
  const resources = useGameStore((s) => s.resources);
  const autoChop = useGameStore((s) => s.autoChop);
  const timeScale = useGameStore((s) => s.timeScale);
  const muted = useGameStore((s) => s.muted);
  const combat = useGameStore((s) => s.combat);
  const currentStage = useGameStore((s) => s.currentStage);
  const highestStageCleared = useGameStore((s) => s.highestStageCleared);
  const towerFloorCleared = useGameStore((s) => s.towerFloorCleared);
  const autoPushStage = useGameStore((s) => s.autoPushStage);
  const autoPushTower = useGameStore((s) => s.autoPushTower);
  const activeExpedition = useGameStore((s) => s.activeExpedition);
  const offlineReward = useGameStore((s) => s.offlineReward);
  const logs = useGameStore((s) => s.logs);
  const cloudSyncKey = useGameStore((s) => s.cloudSyncKey);
  const realmFloor = useGameStore((s) => s.realmMap.floor);
  const activeArtifactId = useGameStore((s) => s.activeArtifactId);
  const autoUltimate = useGameStore((s) => s.autoUltimate);

  const getHeroTotalPower = useGameStore((s) => s.getHeroTotalPower);
  const getUnlocks = useGameStore((s) => s.getUnlocks);
  const chopTree = useGameStore((s) => s.chopTree);
  const updateAutoChop = useGameStore((s) => s.updateAutoChop);
  const upgradeTree = useGameStore((s) => s.upgradeTree);
  const openTribulationModal = useGameStore((s) => s.openTribulationModal);
  const useHourglass = useGameStore((s) => s.useHourglass);
  const setTimeScale = useGameStore((s) => s.setTimeScale);
  const toggleMuted = useGameStore((s) => s.toggleMuted);
  const startStageCombat = useGameStore((s) => s.startStageCombat);
  const startTowerCombat = useGameStore((s) => s.startTowerCombat);
  const toggleAutoPushStage = useGameStore((s) => s.toggleAutoPushStage);
  const toggleAutoPushTower = useGameStore((s) => s.toggleAutoPushTower);
  const triggerCombatUltimate = useGameStore((s) => s.triggerCombatUltimate);
  const toggleAutoUltimate = useGameStore((s) => s.toggleAutoUltimate);
  const dismissOfflineReward = useGameStore((s) => s.dismissOfflineReward);

  // 如果用户之前绑定过云存档口令，启动时自动从云端拉取最新存档
  useEffect(() => {
    const key = useGameStore.getState().cloudSyncKey;
    if (key) {
      useGameStore.getState().bindCloudSyncKey(key).catch(() => {});
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      useGameStore.getState().tickGame(0.25);
    }, 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const unlocks = useGameStore.getState().getUnlocks();
    if (!autoChop.enabled || !unlocks.autoChop) return;
    const ms = Math.max(220, Math.round(900 / timeScale));
    const timer = setInterval(() => {
      const s = useGameStore.getState();
      if (s.resources.spiritFruits >= 1) {
        s.chopTree();
      }
    }, ms);
    return () => clearInterval(timer);
  }, [autoChop.enabled, timeScale, realmTier, treeLevel]);

  useEffect(() => {
    if (activeTab !== 'combat') return;
    const ms = Math.max(180, Math.round(700 / timeScale));
    const timer = setInterval(() => {
      useGameStore.getState().tickCombatStep();
    }, ms);
    return () => clearInterval(timer);
  }, [activeTab, timeScale]);

  const expReq = calcExpRequired(realmTier, realmSub);
  const stoneBreakCost = calcBreakthroughStoneCost(realmTier, realmSub);
  const expPct = Math.min(100, (exp / Math.max(1, expReq)) * 100);
  const canBreakthrough = exp >= expReq;
  const treeCost = calcTreeUpgradeCost(treeLevel);
  const treeBpCost = calcTreeBlueprintCost(treeLevel);
  const islandCap = calcIslandLevelCap(highestStageCleared);
  const treeAtCap = treeLevel >= islandCap;
  const canUpgradeTree = !treeAtCap && resources.spiritStones >= treeCost && resources.blueprints >= treeBpCost;
  const totalPower = getHeroTotalPower();
  const unlocks = getUnlocks();

  return (
    <div className="h-dvh w-screen flex flex-col bg-[#070e12] text-[#f3ead3] overflow-hidden">
      {/* 顶部仙途玉简 HUD */}
      <header className="shrink-0 relative border-b border-[#c99c4a]/45 bg-gradient-to-b from-[#132329] to-[#0a1418] px-3 py-2 flex flex-wrap items-center justify-between gap-2 z-20 shadow-lg">
        <div className="flex items-center gap-2.5">
          {/* 旋转八卦灵阵道印 */}
          <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
            <svg className="absolute inset-0 w-10 h-10 text-[#d4a853]/70 animate-spin-slow" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="18" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 3" />
              <polygon points="20,3 35,29 5,29" stroke="currentColor" strokeWidth="0.9" opacity="0.55" />
            </svg>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f5cd6d] to-[#9b5b13] border border-[#fff2b2] flex items-center justify-center text-[#241203] font-xianxia font-black text-sm shadow">
              仙
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-xianxia font-bold text-sm text-amber-100">{heroName}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#133330] border border-[#47a88d]/60 text-emerald-200 font-semibold">
                {getRealmDisplay(realmTier, realmSub)}
              </span>
              <span className="text-xs text-amber-300 font-bold flex items-center gap-0.5">
                <Zap className="w-3.5 h-3.5" /> {totalPower.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <div className="w-32 sm:w-44 h-2.5 bg-black/60 border border-[#c99c4a]/35 rounded-full overflow-hidden p-[1px]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2dd4bf] via-[#38bdf8] to-[#f5cd6d] transition-all duration-200"
                  style={{ width: `${expPct}%` }}
                />
              </div>
              <span className="text-[11px] text-[#cbbd9f]">
                {exp}/{expReq}
              </span>
              <button
                onClick={openTribulationModal}
                title={`突破需修为 ${expReq} + 灵石 ${stoneBreakCost}`}
                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition ${
                  canBreakthrough
                    ? 'xianxia-btn-crimson animate-pulse'
                    : 'bg-black/45 border border-[#c99c4a]/30 text-[#b6ab91] hover:text-amber-200'
                }`}
              >
                {canBreakthrough ? '渡劫突破!' : '境界'}
              </button>
            </div>
          </div>
        </div>

        {/* 玉简资源栏 */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <div className="xianxia-pill px-2 py-1 rounded-lg flex items-center gap-1" title="灵石">
            <SpiritStoneIcon className="w-3.5 h-3.5" />
            <strong className="text-sky-200">{resources.spiritStones.toLocaleString()}</strong>
          </div>
          <div className="xianxia-pill px-2 py-1 rounded-lg flex items-center gap-1" title="灵果（砍树体力）">
            <SpiritFruitIcon className="w-3.5 h-3.5" />
            <strong className="text-rose-200">{resources.spiritFruits.toLocaleString()}</strong>
          </div>
          <div className="xianxia-pill px-2 py-1 rounded-lg flex items-center gap-1" title="兽粮">
            <BeastFoodIcon className="w-3.5 h-3.5" />
            <strong className="text-purple-200">{resources.beastFood.toLocaleString()}</strong>
          </div>
          <div className="xianxia-pill px-2 py-1 rounded-lg flex items-center gap-1" title="仙建蓝图（推图与秘境产出）">
            <BlueprintIcon className="w-3.5 h-3.5" />
            <strong className="text-blue-200">{resources.blueprints}</strong>
          </div>
          <div className="xianxia-pill px-2 py-1 rounded-lg hidden sm:flex items-center gap-1" title="秘境玄铁（锻造本命法宝）">
            <span className="text-sky-300 font-bold">铁</span>
            <strong className="text-sky-200">{resources.spiritIron}</strong>
          </div>
          <div className="xianxia-pill px-2 py-1 rounded-lg hidden sm:flex items-center gap-1" title="渡劫丹">
            <PillIcon className="w-3.5 h-3.5" />
            <strong className="text-amber-200">{resources.tribulationPills}</strong>
          </div>
          <div className="xianxia-pill px-2 py-1 rounded-lg hidden sm:flex items-center gap-1" title="淬灵砂">
            <DustIcon className="w-3.5 h-3.5" />
            <strong className="text-teal-200">{resources.reforgeDust}</strong>
          </div>
          <button
            onClick={useHourglass}
            disabled={resources.hourglasses < 1}
            title="消耗 1 个时空沙漏，立刻获得 30 分钟洞天产出"
            className={`px-2 py-1 rounded-lg border flex items-center gap-1 cursor-pointer transition ${
              resources.hourglasses > 0
                ? 'bg-amber-900/40 border-amber-400/60 text-amber-200 hover:bg-amber-800/50'
                : 'bg-black/40 border-[#c99c4a]/20 text-[#68604f] cursor-not-allowed'
            }`}
          >
            <Hourglass className="w-3.5 h-3.5" />
            <span>{resources.hourglasses}</span>
          </button>
        </div>

        {/* 调速与云存档 */}
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-lg bg-black/50 border border-[#c99c4a]/35 p-0.5 text-xs">
            {([1, 2, 5] as const).map((sp) => (
              <button
                key={sp}
                onClick={() => setTimeScale(sp)}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer transition ${
                  timeScale === sp ? 'xianxia-btn-gold' : 'text-[#a79c82] hover:text-amber-100'
                }`}
              >
                {sp}x
              </button>
            ))}
          </div>
          <button
            onClick={toggleMuted}
            className="p-1.5 rounded-lg xianxia-pill text-[#cbbd9f] hover:text-amber-200 cursor-pointer"
            title={muted ? '开启音效' : '静音'}
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="px-2 py-1.5 rounded-lg xianxia-pill text-[#cbbd9f] hover:text-amber-200 flex items-center gap-1 text-xs cursor-pointer"
            title="云端同步与设置"
          >
            <Cloud className={`w-3.5 h-3.5 ${cloudSyncKey ? 'text-emerald-400' : 'text-[#a79c82]'}`} />
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 主体 2D 实时动画舞台 */}
      <main className="relative flex-1 min-h-0 overflow-hidden">
        {/* 场景切换牌匾 */}
        <div className="absolute top-2.5 left-2.5 z-20 flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveTab('island')}
            className={`px-3 py-1.5 rounded-xl text-xs font-xianxia font-bold flex items-center gap-1 backdrop-blur cursor-pointer transition ${
              activeTab === 'island' ? 'xianxia-btn-jade' : 'xianxia-pill text-[#cbbd9f] hover:text-amber-100'
            }`}
          >
            <Trees className="w-3.5 h-3.5" /> 浮屿洞天
          </button>
          <button
            onClick={() => setActiveTab('explore')}
            className={`px-3 py-1.5 rounded-xl text-xs font-xianxia font-bold flex items-center gap-1 backdrop-blur cursor-pointer transition ${
              activeTab === 'explore' ? 'xianxia-btn-gold' : 'xianxia-pill text-[#cbbd9f] hover:text-amber-100'
            }`}
          >
            <Map className="w-3.5 h-3.5" /> 秘境星图 ({realmFloor}域)
          </button>
          <button
            onClick={() => {
              setActiveTab('combat');
              startStageCombat(currentStage);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-xianxia font-bold flex items-center gap-1 backdrop-blur cursor-pointer transition ${
              activeTab === 'combat' && combatMode === 'stage' ? 'xianxia-btn-crimson' : 'xianxia-pill text-[#cbbd9f] hover:text-amber-100'
            }`}
          >
            <Swords className="w-3.5 h-3.5" /> 秘境斗法 ({currentStage}关)
          </button>
          <button
            onClick={() => {
              if (unlocks.tower) startTowerCombat(towerFloorCleared + 1);
            }}
            disabled={!unlocks.tower}
            title={unlocks.tower ? '挑战镇妖古塔获取淬灵砂与渡劫丹' : '通关第5关或突破筑基期解锁'}
            className={`px-3 py-1.5 rounded-xl text-xs font-xianxia font-bold flex items-center gap-1 backdrop-blur transition ${
              !unlocks.tower
                ? 'bg-black/55 border border-[#c99c4a]/20 text-[#7d7461] cursor-not-allowed'
                : activeTab === 'combat' && combatMode === 'tower'
                  ? 'xianxia-btn-gold cursor-pointer'
                  : 'xianxia-pill text-amber-200 hover:brightness-110 cursor-pointer'
            }`}
          >
            {unlocks.tower ? <Flame className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            镇妖塔 ({towerFloorCleared}层)
          </button>
        </div>

        {activeTab === 'island' ? (
          <>
            <IslandScene />
            <SandboxTilePanel />

            {/* 底部悬浮操作栈（弟子/守岛条 + 砍树台） */}
            <div className="absolute bottom-2 inset-x-2 z-20 flex flex-col items-center gap-1.5 pointer-events-none">
              <div className="pointer-events-auto w-full flex justify-center">
                <DisciplesRaidBar />
              </div>

              <div className="pointer-events-auto relative w-full sm:w-auto max-w-2xl xianxia-panel rounded-2xl px-3 py-2 flex flex-wrap items-center justify-center gap-2">
                <CornerFiligree className="w-2.5 h-2.5" />
                <button
                  onClick={chopTree}
                  disabled={resources.spiritFruits < 1}
                  className={`px-4 py-1.5 rounded-xl font-xianxia font-black text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer transition active:scale-95 ${
                    resources.spiritFruits >= 1
                      ? 'xianxia-btn-gold'
                      : 'bg-black/45 border border-stone-700 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <Axe className="w-4 h-4" />
                  挥斧砍树 ({resources.spiritFruits})
                </button>

                <button
                  onClick={upgradeTree}
                  disabled={!canUpgradeTree}
                  title={treeAtCap ? `需通关第 ${(islandCap - 1) * 2} 关秘境解锁灵树 Lv.${islandCap + 1}` : `需 ${treeCost} 灵石 + ${treeBpCost} 仙建蓝图`}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                    canUpgradeTree ? 'xianxia-btn-jade' : 'bg-black/45 border border-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  {treeAtCap ? `灵树上限(Lv.${islandCap})` : `育树 (${treeCost}石 ${treeBpCost}图)`}
                </button>

                <div className="flex items-center gap-1.5 pl-1 border-l border-[#c99c4a]/30">
                  <button
                    disabled={!unlocks.autoChop}
                    onClick={() => updateAutoChop({ enabled: !autoChop.enabled })}
                    title={unlocks.autoChop ? '自动砍树并按品质处理' : '需达到【筑基1层】且【太古灵树 Lv.3】解锁'}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                      !unlocks.autoChop
                        ? 'bg-black/45 border border-stone-800 text-[#7d7461] cursor-not-allowed'
                        : autoChop.enabled
                          ? 'xianxia-btn-jade cursor-pointer'
                          : 'bg-black/45 border border-[#c99c4a]/35 text-[#cbbd9f] cursor-pointer'
                    }`}
                  >
                    {!unlocks.autoChop && <Lock className="w-3 h-3" />}
                    {autoChop.enabled && unlocks.autoChop ? '自动伐木中' : '自动伐木'}
                  </button>
                  <select
                    value={autoChop.minKeepQuality}
                    onChange={(e) => updateAutoChop({ minKeepQuality: Number(e.target.value) as QualityTier })}
                    className="bg-black/60 border border-[#c99c4a]/35 rounded-lg px-2 py-1.5 text-xs text-amber-200 cursor-pointer"
                  >
                    {([1, 2, 3, 4, 5] as QualityTier[]).map((q) => (
                      <option key={q} value={q}>
                        留{QUALITY_CONFIG[q].name}+
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-[11px] text-[#a79c82] hidden sm:inline">保底 {pityCounter}/20</span>
              </div>
            </div>
          </>
        ) : activeTab === 'explore' ? (
          <ExplorationView />
        ) : (
          <>
            <CombatScene />

            <div className="absolute top-2.5 right-2.5 z-20 flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-1.5 xianxia-panel rounded-xl px-3 py-1.5 text-xs">
                {combatMode === 'stage' ? (
                  <>
                    <button onClick={() => startStageCombat(Math.max(1, currentStage - 1))} className="p-0.5 hover:text-amber-300 cursor-pointer">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="font-xianxia font-bold text-amber-200">
                      {combat?.zoneName ?? `第 ${currentStage} 关`}
                      {combat?.isBoss && <span className="ml-1 text-rose-400">[妖王]</span>}
                    </span>
                    <button
                      onClick={() => startStageCombat(Math.min(highestStageCleared + 1, currentStage + 1))}
                      className="p-0.5 hover:text-amber-300 cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={toggleAutoPushStage}
                      className={`ml-1 px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                        autoPushStage ? 'xianxia-btn-jade' : 'bg-black/45 border border-[#c99c4a]/30 text-[#9c927a]'
                      }`}
                    >
                      {autoPushStage ? '自动推图' : '循环刷关'}
                    </button>
                  </>
                ) : combatMode === 'explore' ? (
                  <div className="flex items-center gap-2">
                    <span className="font-xianxia font-bold text-amber-200">星图第 {realmFloor} 域遭遇战</span>
                    <button
                      onClick={() => setActiveTab('explore')}
                      className="px-2 py-0.5 rounded bg-slate-800 border border-amber-400/40 text-[11px] text-amber-200 cursor-pointer"
                    >
                      返回星图
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-xianxia font-bold text-amber-200">{combat?.zoneName}</span>
                    <button
                      onClick={toggleAutoPushTower}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer ${
                        autoPushTower ? 'xianxia-btn-jade' : 'bg-black/45 border border-[#c99c4a]/30 text-[#9c927a]'
                      }`}
                    >
                      {autoPushTower ? '自动连爬' : '单层停驻'}
                    </button>
                    <button
                      onClick={() => startTowerCombat(towerFloorCleared + 1)}
                      className="px-2.5 py-0.5 rounded xianxia-btn-gold text-[11px] font-bold cursor-pointer"
                    >
                      {combat?.status === 'victory' ? `挑战第${towerFloorCleared + 1}层` : '再战本层'}
                    </button>
                  </div>
                )}
              </div>
              {combat?.strategyHint && (
                <div className="max-w-xs xianxia-panel border-rose-500/45 rounded-lg px-2.5 py-1 text-[11px] text-rose-200">
                  军师锦囊：{combat.strategyHint}
                </div>
              )}
            </div>

            {/* 本命法宝大招怒气条 */}
            {combat && (
              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 xianxia-panel rounded-xl px-3 py-1.5 flex items-center gap-2.5 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-amber-200 font-bold whitespace-nowrap">法宝灵力</span>
                  <div className="w-24 sm:w-32 h-2.5 rounded-full bg-slate-900 border border-amber-400/50 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all duration-150"
                      style={{ width: `${Math.min(100, combat.rage)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-amber-300">{Math.floor(combat.rage)}/100</span>
                </div>
                <button
                  disabled={combat.status !== 'fighting' || combat.rage < 100}
                  onClick={triggerCombatUltimate}
                  className={`px-3 py-1 rounded-lg font-bold text-xs cursor-pointer transition whitespace-nowrap ${
                    combat.status === 'fighting' && combat.rage >= 100
                      ? 'xianxia-btn-gold animate-pulse'
                      : 'bg-slate-800/80 border border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  祭出{NATAL_ARTIFACTS.find((a) => a.id === (activeArtifactId ?? 'zhuxian_sword'))?.name ?? '本命法宝'}!
                </button>
                <button
                  onClick={toggleAutoUltimate}
                  className={`px-2 py-1 rounded-lg text-[11px] font-bold border cursor-pointer whitespace-nowrap ${
                    autoUltimate ? 'bg-emerald-900/70 border-emerald-400 text-emerald-200' : 'bg-slate-900/70 border-slate-700 text-slate-400'
                  }`}
                >
                  {autoUltimate ? '自动大招:开' : '自动大招:关'}
                </button>
              </div>
            )}
          </>
        )}

        <EquipmentCompareModal />
      </main>

      {/* 底部仙途卷轴功能面板 */}
      <section className="shrink-0 h-[34dvh] min-h-[195px] max-h-[275px] border-t border-[#c99c4a]/45 bg-gradient-to-b from-[#0e1b20] to-[#070e12] flex flex-col z-20">
        <div className="flex items-center gap-1 px-2 sm:px-3 pt-2 border-b border-[#c99c4a]/30 overflow-x-auto">
          {[
            { id: 'buildings', label: '洞天仙建', icon: Hammer },
            { id: 'alchemy', label: '丹道/九宫', icon: FlaskConical },
            { id: 'gear', label: '法宝洗练', icon: ShieldCheck },
            { id: 'companions', label: '护法灵兽', icon: Users },
            { id: 'arts', label: '心法殿', icon: BookOpen },
            {
              id: 'expedition',
              label: activeExpedition && activeExpedition.remainingSec <= 0 ? '游历仙脉(可领!)' : '游历仙脉',
              icon: Compass,
            },
            { id: 'logs', label: '仙途传书', icon: ScrollText },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = bottomTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setBottomTab(tab.id as typeof bottomTab)}
                className={`px-2.5 sm:px-3.5 py-1.5 rounded-t-lg text-[11px] sm:text-xs font-xianxia font-bold flex items-center gap-1 whitespace-nowrap cursor-pointer transition ${
                  active
                    ? 'bg-[#16272e] text-amber-200 border-t border-x border-[#c99c4a]/55 shadow-inner'
                    : 'text-[#9c927a] hover:text-amber-100'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
          <div className="ml-auto text-[11px] text-[#a79c82] hidden md:flex items-center gap-1 pr-2 whitespace-nowrap">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            秘境第 {highestStageCleared} 重 · 镇妖塔 {towerFloorCleared} 层
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          {bottomTab === 'buildings' && <BuildingsPanel />}
          {bottomTab === 'alchemy' && <AlchemyForgeFormation />}
          {bottomTab === 'gear' && <GearPanel />}
          {bottomTab === 'companions' && <CompanionsPanel />}
          {bottomTab === 'arts' && <ArtsPanel />}
          {bottomTab === 'expedition' && <ExpeditionBloodlinePanel />}
          {bottomTab === 'logs' && (
            <div className="flex flex-col gap-1 text-xs">
              {logs.map((entry) => (
                <div
                  key={entry.id}
                  className={`px-2.5 py-1.5 rounded bg-black/35 border-l-2 ${
                    entry.tone === 'epic'
                      ? 'border-amber-400 text-amber-200'
                      : entry.tone === 'good'
                        ? 'border-emerald-400 text-emerald-200'
                        : entry.tone === 'warn'
                          ? 'border-rose-400 text-rose-300'
                          : 'border-[#c99c4a]/50 text-[#d6cbb2]'
                  }`}
                >
                  {entry.text}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 离线挂机收益弹窗（点击空白处可关闭） */}
      {offlineReward && (
        <XianxiaModalBackdrop onClose={dismissOfflineReward} maxWidth="max-w-sm">
          <div className="text-center flex flex-col gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-xianxia text-lg font-bold text-amber-100">洞天吐纳 · 闭关收获</h3>
            <p className="text-xs text-[#b6ab91]">
              道友离去 <strong className="text-emerald-300">{Math.floor(offlineReward.elapsedSeconds / 60)} 分钟</strong>，仙屿自动吐纳灵气凝聚：
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs xianxia-card rounded-xl p-3">
              <div>灵石 +{offlineReward.spiritStones}</div>
              <div>灵果 +{offlineReward.spiritFruits}</div>
              <div>修为 +{offlineReward.exp}</div>
              <div>兽粮 +{offlineReward.beastFood}</div>
            </div>
            <button onClick={dismissOfflineReward} className="w-full py-2.5 rounded-xl xianxia-btn-gold font-xianxia font-black text-sm cursor-pointer">
              收入囊中
            </button>
          </div>
        </XianxiaModalBackdrop>
      )}

      <TribulationModal />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default App;
