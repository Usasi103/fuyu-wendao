import React from 'react';
import { ArrowUpCircle, BookOpen, CheckCircle2, Compass, Flame, Lock, RefreshCw, RotateCcw, Shield, Sparkles, Swords, Users } from 'lucide-react';
import { BLOODLINES, EXPEDITION_MISSIONS } from '../data/bloodlines';
import { BUILDING_ORDER, BUILDINGS } from '../data/buildings';
import { COMPANIONS } from '../data/companions';
import { CULTIVATION_ARTS } from '../data/cultivationArts';
import { QUALITY_CONFIG, SLOT_META, SUB_STAT_META } from '../data/realms';
import {
  calcArtUpgradeCost,
  calcBloodlineUpgradeCost,
  calcBuildingBlueprintCost,
  calcBuildingRatePerSec,
  calcBuildingUpgradeCost,
  calcCompanionFoodCost,
  calcCompanionStats,
  calcHeroTotalStats,
  calcIslandLevelCap,
} from '../core/formulas';
import { EquipSlot, SubStatKey } from '../core/types';
import { useGameStore } from '../store/gameStore';

const EQUIP_SLOTS: EquipSlot[] = ['weapon', 'robe', 'crown', 'jade', 'ring', 'boots'];

const UNLOCK_TEXT: Record<string, string> = {
  springPool: '需【炼气3层】或通关【第2关】解锁',
  alchemyFurnace: '需突破至【筑基1层】解锁',
  beastGarden: '需通关【第5关】或【金丹1层】解锁',
  herbFarm: '需【炼气4层】或通关【第3关】解锁',
  forge: '需通关【第4关】或【筑基2层】解锁',
  thunderTower: '需通关【第6关】或【筑基3层】解锁',
};

export const GearPanel: React.FC = () => {
  const realmTier = useGameStore((s) => s.realmTier);
  const realmSub = useGameStore((s) => s.realmSub);
  const equipment = useGameStore((s) => s.equipment);
  const buildings = useGameStore((s) => s.buildings);
  const cultivationArts = useGameStore((s) => s.cultivationArts);
  const activeArtId = useGameStore((s) => s.activeArtId);
  const bloodlineLevels = useGameStore((s) => s.bloodlineLevels);
  const activeBloodlineId = useGameStore((s) => s.activeBloodlineId);
  const activeRelicIds = useGameStore((s) => s.activeRelicIds);
  const elixirBuffs = useGameStore((s) => s.elixirBuffs);
  const reforgeDust = useGameStore((s) => s.resources.reforgeDust);
  const highestStageCleared = useGameStore((s) => s.highestStageCleared);
  const treeLevel = useGameStore((s) => s.treeLevel);
  const getUnlocks = useGameStore((s) => s.getUnlocks);
  const reforgeEquipment = useGameStore((s) => s.reforgeEquipment);
  void highestStageCleared;
  void treeLevel;
  const unlocks = getUnlocks();

  const stats = calcHeroTotalStats(
    realmTier,
    realmSub,
    equipment,
    buildings,
    cultivationArts,
    activeArtId,
    bloodlineLevels,
    activeBloodlineId,
    activeRelicIds,
    elixirBuffs
  );

  const subKeys: SubStatKey[] = [
    'crit',
    'combo',
    'dodge',
    'lifesteal',
    'stun',
    'antiCrit',
    'antiCombo',
    'antiDodge',
    'antiLifesteal',
    'antiStun',
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {EQUIP_SLOTS.map((slot) => {
          const item = equipment[slot];
          const meta = SLOT_META[slot];
          if (!item) {
            return (
              <div
                key={slot}
                className="rounded-xl border border-dashed border-[#c99c4a]/25 bg-black/30 p-2.5 flex flex-col justify-between min-h-[88px]"
              >
                <span className="text-xs text-[#9c927a]">{meta.label}</span>
                <span className="text-xs text-[#68604f]">未佩带法宝</span>
              </div>
            );
          }
          const q = QUALITY_CONFIG[item.quality];
          return (
            <div key={slot} className={`rounded-xl border ${q.borderClass} ${q.bgClass} p-2.5 flex flex-col justify-between gap-1`}>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-[#b6ab91]">{meta.label}</span>
                <span className={q.textClass}>{q.name}</span>
              </div>
              <div className={`font-xianxia font-bold text-xs truncate ${q.textClass}`}>{item.name}</div>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[11px] text-amber-300 font-semibold">战力 {item.power}</span>
                {unlocks.reforge && item.quality >= 1 && (
                  <button
                    onClick={() => reforgeEquipment(slot)}
                    title={`消耗 20 淬灵砂 + 35 灵石重铸副词条（当前砂：${reforgeDust}）`}
                    className="px-1.5 py-0.5 rounded bg-black/45 border border-teal-400/50 text-teal-300 text-[10px] flex items-center gap-0.5 cursor-pointer hover:bg-teal-900/40"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> 洗练
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="xianxia-card rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-xianxia font-bold text-amber-200 flex items-center gap-1.5">
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            道体属性总览
          </span>
          <span className="text-[10px] text-[#9c927a]">
            {unlocks.reforge ? `淬灵砂 ${reforgeDust}（洗练20砂/次）` : '通关第8关或金丹期解锁法宝洗练'}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="bg-black/35 border border-[#c99c4a]/20 rounded-lg px-2 py-1.5">
            <div className="text-[#9c927a] text-[10px]">气血</div>
            <div className="font-bold text-emerald-300">{stats.maxHp}</div>
          </div>
          <div className="bg-black/35 border border-[#c99c4a]/20 rounded-lg px-2 py-1.5">
            <div className="text-[#9c927a] text-[10px]">攻击</div>
            <div className="font-bold text-amber-300">{stats.atk}</div>
          </div>
          <div className="bg-black/35 border border-[#c99c4a]/20 rounded-lg px-2 py-1.5">
            <div className="text-[#9c927a] text-[10px]">防御</div>
            <div className="font-bold text-sky-300">{stats.def}</div>
          </div>
          <div className="bg-black/35 border border-[#c99c4a]/20 rounded-lg px-2 py-1.5">
            <div className="text-[#9c927a] text-[10px]">身法</div>
            <div className="font-bold text-purple-300">{stats.speed}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-amber-950/35 border border-amber-500/30 rounded px-2 py-1 flex items-center justify-between">
            <span className="text-amber-200/85">最终增伤</span>
            <strong className="text-amber-300">+{(stats.dmgBoost * 100).toFixed(1)}%</strong>
          </div>
          <div className="bg-emerald-950/35 border border-emerald-500/30 rounded px-2 py-1 flex items-center justify-between">
            <span className="text-emerald-200/85">最终减伤</span>
            <strong className="text-emerald-300">+{(stats.dmgReduce * 100).toFixed(1)}%</strong>
          </div>
        </div>
        <div className="grid grid-cols-5 gap-1.5 text-[11px] mt-0.5">
          {subKeys.map((k) => {
            const val = stats[k];
            const meta = SUB_STAT_META[k];
            return (
              <div key={k} className="bg-black/30 border border-[#c99c4a]/15 rounded px-1.5 py-1 flex flex-col">
                <span className="text-[10px] text-[#9c927a] truncate">{meta.label}</span>
                <span className="font-semibold" style={{ color: val > 0 ? meta.color : '#68604f' }}>
                  {(val * 100).toFixed(1)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const BuildingsPanel: React.FC = () => {
  const buildings = useGameStore((s) => s.buildings);
  const spiritStones = useGameStore((s) => s.resources.spiritStones);
  const blueprints = useGameStore((s) => s.resources.blueprints);
  const companions = useGameStore((s) => s.companions);
  const highestStage = useGameStore((s) => s.highestStageCleared);
  const realmTier = useGameStore((s) => s.realmTier);
  const realmSub = useGameStore((s) => s.realmSub);
  const treeLevel = useGameStore((s) => s.treeLevel);
  const getUnlocks = useGameStore((s) => s.getUnlocks);
  const collectBuilding = useGameStore((s) => s.collectBuilding);
  const collectAllBuildings = useGameStore((s) => s.collectAllBuildings);
  const upgradeBuilding = useGameStore((s) => s.upgradeBuilding);
  const garrisonBuilding = useGameStore((s) => s.garrisonBuilding);
  void realmTier;
  void realmSub;
  void treeLevel;
  const unlocks = getUnlocks();
  const lvCap = calcIslandLevelCap(highestStage);
  const unlockedComps = COMPANIONS.filter((c) => companions[c.id]?.unlocked);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-[#cbbd9f]">
          等级上限 <strong className="text-sky-300">Lv.{lvCap}</strong>（随推图提升）· 持有蓝图{' '}
          <strong className="text-amber-300">{blueprints}</strong> · Lv.3 自动托管
        </span>
        <button onClick={collectAllBuildings} className="px-3 py-1 rounded-lg xianxia-btn-jade text-xs font-bold cursor-pointer shrink-0">
          一键收取
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {BUILDING_ORDER.map((id) => {
          const cfg = BUILDINGS[id];
          const isUnlocked =
            id === 'spiritArray' ||
            (id === 'springPool' && unlocks.springPool) ||
            (id === 'alchemyFurnace' && unlocks.alchemyFurnace) ||
            (id === 'beastGarden' && unlocks.beastGarden) ||
            (id === 'herbFarm' && unlocks.herbFarm) ||
            (id === 'forge' && unlocks.forge) ||
            (id === 'thunderTower' && unlocks.thunderTower);

          if (!isUnlocked) {
            return (
              <div key={id} className="rounded-xl border border-dashed border-[#c99c4a]/25 bg-black/35 p-3 flex flex-col justify-center items-center text-center gap-1.5 min-h-[126px]">
                <Lock className="w-4 h-4 text-[#a79c82]" />
                <div className="font-xianxia font-bold text-sm text-[#a79c82]">{cfg.name}</div>
                <div className="text-[11px] text-amber-400/80">{UNLOCK_TEXT[id]}</div>
              </div>
            );
          }

          const b = buildings[id];
          if (b.level <= 0) {
            return (
              <div key={id} className="rounded-xl border border-amber-400/35 bg-amber-950/20 p-3 flex flex-col justify-center items-center text-center gap-1.5 min-h-[126px]">
                <div className="font-xianxia font-bold text-sm text-amber-200">{cfg.name} · 已解锁</div>
                <div className="text-[11px] text-emerald-300">{cfg.description}</div>
                <div className="text-[11px] text-amber-300/90 mt-1">
                  请在上方浮岛沙盘点击空地筑造（{cfg.baseCost}灵石+1蓝图）
                </div>
              </div>
            );
          }
          const hasGarrison = Boolean(b.garrisonCompanionId);
          const rate = calcBuildingRatePerSec(id, b.level, highestStage, hasGarrison);
          const cost = calcBuildingUpgradeCost(id, b.level);
          const bpCost = calcBuildingBlueprintCost(b.level);
          const atCap = b.level >= lvCap;
          const canAfford = !atCap && spiritStones >= cost && blueprints >= bpCost;
          const isAuto = b.level >= cfg.autoUnlockLevel;
          const stageIdx = b.level >= 9 ? 3 : b.level >= 6 ? 2 : b.level >= 3 ? 1 : 0;

          return (
            <div key={id} className="xianxia-card rounded-xl p-3 flex flex-col justify-between gap-2">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-xianxia font-bold text-sm text-amber-100">{cfg.name}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/45 border border-[#c99c4a]/30 text-amber-300 font-semibold">
                    Lv.{b.level}/{lvCap}
                  </span>
                </div>
                <div className="text-[11px] text-[#9c927a] mt-0.5">
                  {cfg.stageNames[stageIdx]} · {cfg.auraDesc(b.level)}
                </div>
                <div className="text-xs text-emerald-300 mt-1 font-medium">
                  产出：{rate >= 1 ? rate.toFixed(1) : (rate * 60).toFixed(1)} {cfg.resourceName}/{rate >= 1 ? '秒' : '分'}
                  {hasGarrison && <span className="text-amber-300 ml-1">(驻守+35%)</span>}
                </div>
                {unlockedComps.length > 0 && (
                  <div className="mt-1.5 flex items-center gap-1 text-[11px]">
                    <span className="text-[#9c927a]">委任:</span>
                    <select
                      value={b.garrisonCompanionId ?? ''}
                      onChange={(e) => garrisonBuilding(id, e.target.value || null)}
                      className="flex-1 bg-black/50 border border-[#c99c4a]/25 rounded px-1.5 py-0.5 text-[11px] text-amber-200 cursor-pointer"
                    >
                      <option value="">无人驻守</option>
                      {unlockedComps.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (+35%)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-1.5 pt-1">
                {!isAuto ? (
                  <button
                    onClick={() => collectBuilding(id)}
                    className="flex-1 py-1.5 rounded-lg bg-black/45 hover:bg-black/65 border border-[#c99c4a]/35 text-amber-300 text-xs font-semibold cursor-pointer"
                  >
                    收 {Math.floor(b.storedAmount)}
                  </button>
                ) : (
                  <div className="flex-1 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/35 text-emerald-300 text-[11px] flex items-center justify-center gap-1">
                    <Sparkles className="w-3 h-3" /> 傀儡托管
                  </div>
                )}
                <button
                  onClick={() => upgradeBuilding(id)}
                  disabled={!canAfford}
                  className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer transition ${
                    canAfford ? 'xianxia-btn-gold' : 'bg-black/35 border border-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  <ArrowUpCircle className="w-3 h-3" />
                  {atCap ? '达上限' : `${cost}石 ${bpCost}图`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const CompanionsPanel: React.FC = () => {
  const companions = useGameStore((s) => s.companions);
  const deployed = useGameStore((s) => s.deployedCompanions);
  const buildings = useGameStore((s) => s.buildings);
  const beastFood = useGameStore((s) => s.resources.beastFood);
  const realmTier = useGameStore((s) => s.realmTier);
  const realmSub = useGameStore((s) => s.realmSub);
  const highestStageCleared = useGameStore((s) => s.highestStageCleared);
  const treeLevel = useGameStore((s) => s.treeLevel);
  const getUnlocks = useGameStore((s) => s.getUnlocks);
  const getMaxDeploySlots = useGameStore((s) => s.getMaxDeploySlots);
  const upgradeCompanion = useGameStore((s) => s.upgradeCompanion);
  const resetCompanion = useGameStore((s) => s.resetCompanion);
  const toggleDeploy = useGameStore((s) => s.toggleDeployCompanion);
  void realmTier;
  void realmSub;
  void highestStageCleared;
  void treeLevel;
  const unlocks = getUnlocks();
  const maxSlots = getMaxDeploySlots();

  const roleLabels: Record<string, string> = {
    tank: '前排护盾',
    dps: '主C爆发',
    healer: '回春辅助',
    control: '雷法控制',
  };

  if (!unlocks.companions) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center py-6">
        <Lock className="w-6 h-6 text-amber-400/75" />
        <div className="font-xianxia text-base font-bold text-amber-200">护法仙兽殿尚未开启</div>
        <div className="text-xs text-[#a79c82]">需先在秘境斗法通关【第 2 关】或踏入【筑基期】，方能开启多护法协同布阵！</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#cbbd9f]">
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-purple-300" />
          上阵护法位：<strong className="text-amber-300">{deployed.length} / {maxSlots}</strong>（筑基2位，元婴3位）
        </span>
        <span className="text-emerald-300">支持 100% 免费无损重生退还兽粮</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {COMPANIONS.map((cfg) => {
          const st = companions[cfg.id];
          const isDeployed = deployed.includes(cfg.id);
          const stats = calcCompanionStats(cfg, st, buildings);
          const cost = calcCompanionFoodCost(st.level);
          const canUpgrade = st.unlocked && beastFood >= cost;

          return (
            <div
              key={cfg.id}
              className={`xianxia-card rounded-xl p-3 flex flex-col justify-between gap-2 ${
                isDeployed ? 'ring-1 ring-amber-400/60' : ''
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: cfg.primaryColor }} />
                    <span className="font-xianxia font-bold text-sm text-amber-100">{cfg.name}</span>
                  </div>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/45 border border-[#c99c4a]/25 text-[#cbbd9f]">
                    {roleLabels[cfg.role]}
                  </span>
                </div>
                <div className="text-[11px] text-[#9c927a] mt-1">
                  <strong className="text-amber-300">{cfg.skillName}</strong>：{cfg.skillDesc}
                </div>
                {st.unlocked && (
                  <div className="flex gap-3 text-[11px] text-[#e6dbc2] mt-1.5">
                    <span>Lv.{st.level} ({st.star}★)</span>
                    <span>血 {stats.maxHp}</span>
                    <span>攻 {stats.atk}</span>
                    <span>防 {stats.def}</span>
                  </div>
                )}
              </div>

              {!st.unlocked ? (
                <div className="py-1.5 rounded-lg bg-black/45 border border-[#c99c4a]/20 text-[#8f856e] text-xs flex items-center justify-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> 通关第 {cfg.unlockStage} 关解锁
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => toggleDeploy(cfg.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer ${
                      isDeployed ? 'xianxia-btn-jade' : 'bg-black/45 border border-[#c99c4a]/30 text-[#e6dbc2]'
                    }`}
                  >
                    {isDeployed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                    {isDeployed ? '出战中' : '出战'}
                  </button>
                  <button
                    onClick={() => upgradeCompanion(cfg.id)}
                    disabled={!canUpgrade}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      canUpgrade ? 'xianxia-btn-gold' : 'bg-black/35 border border-stone-800 text-stone-500 cursor-not-allowed'
                    }`}
                  >
                    喂养 ({cost}粮)
                  </button>
                  {st.level > 1 && (
                    <button
                      onClick={() => resetCompanion(cfg.id)}
                      title="无损重生返还全部兽粮"
                      className="px-2 py-1.5 rounded-lg bg-black/45 border border-[#c99c4a]/35 text-amber-300 text-xs cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ArtsPanel: React.FC = () => {
  const cultivationArts = useGameStore((s) => s.cultivationArts);
  const activeArtId = useGameStore((s) => s.activeArtId);
  const spiritStones = useGameStore((s) => s.resources.spiritStones);
  const realmTier = useGameStore((s) => s.realmTier);
  const realmSub = useGameStore((s) => s.realmSub);
  const highestStageCleared = useGameStore((s) => s.highestStageCleared);
  const treeLevel = useGameStore((s) => s.treeLevel);
  const getUnlocks = useGameStore((s) => s.getUnlocks);
  const upgradeArt = useGameStore((s) => s.upgradeCultivationArt);
  const setActiveArt = useGameStore((s) => s.setActiveArt);
  void realmTier;
  void realmSub;
  void highestStageCleared;
  void treeLevel;
  const unlocks = getUnlocks();

  if (!unlocks.cultivationArts) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-center py-6">
        <Lock className="w-6 h-6 text-amber-400/75" />
        <div className="font-xianxia text-base font-bold text-amber-200">藏经心法殿尚未开启</div>
        <div className="text-xs text-[#a79c82]">需渡劫突破至【筑基1层】方可研习仙宗秘传心法，定制你的战斗流派！</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="text-xs text-[#cbbd9f] flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5 text-amber-300" />
        <span>主修心法发挥 100% 威力，其余已参悟心法提供 40% 被动加成。</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {CULTIVATION_ARTS.map((art) => {
          const lv = cultivationArts[art.id] ?? 0;
          const isMain = activeArtId === art.id;
          const cost = calcArtUpgradeCost(art.unlockCostStones, lv);
          const canAfford = spiritStones >= cost;

          return (
            <div key={art.id} className={`xianxia-card rounded-xl p-3 flex flex-col justify-between gap-2 ${isMain ? 'ring-1 ring-amber-400/70' : ''}`}>
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-xianxia font-bold text-sm" style={{ color: art.color }}>
                    {art.name}
                  </span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-black/45 border border-[#c99c4a]/30 text-amber-200">
                    {lv > 0 ? `第${lv}重` : '未参悟'}
                  </span>
                </div>
                <div className="text-[11px] text-[#a79c82] mt-0.5">{art.school}</div>
                <div className="text-[11px] text-[#e6dbc2] mt-1">{art.description}</div>
              </div>
              <div className="flex gap-1.5">
                {lv > 0 && (
                  <button
                    onClick={() => setActiveArt(art.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      isMain ? 'xianxia-btn-jade' : 'bg-black/45 border border-[#c99c4a]/30 text-[#cbbd9f]'
                    }`}
                  >
                    {isMain ? '主修中' : '设为主修'}
                  </button>
                )}
                <button
                  onClick={() => upgradeArt(art.id)}
                  disabled={!canAfford}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    canAfford ? 'xianxia-btn-gold' : 'bg-black/35 border border-stone-800 text-stone-500 cursor-not-allowed'
                  }`}
                >
                  {lv === 0 ? `参悟 (${cost}石)` : `精研 (${cost}石)`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const ExpeditionBloodlinePanel: React.FC = () => {
  const activeExpedition = useGameStore((s) => s.activeExpedition);
  const companions = useGameStore((s) => s.companions);
  const bloodlineLevels = useGameStore((s) => s.bloodlineLevels);
  const activeBloodlineId = useGameStore((s) => s.activeBloodlineId);
  const resources = useGameStore((s) => s.resources);
  const realmTier = useGameStore((s) => s.realmTier);
  const realmSub = useGameStore((s) => s.realmSub);
  const highestStageCleared = useGameStore((s) => s.highestStageCleared);
  const treeLevel = useGameStore((s) => s.treeLevel);
  const getUnlocks = useGameStore((s) => s.getUnlocks);
  const startExpedition = useGameStore((s) => s.startExpedition);
  const claimExpedition = useGameStore((s) => s.claimExpedition);
  const upgradeBloodline = useGameStore((s) => s.upgradeBloodline);
  const setActiveBloodline = useGameStore((s) => s.setActiveBloodline);
  void realmTier;
  void realmSub;
  void highestStageCleared;
  void treeLevel;
  const unlocks = getUnlocks();
  const unlockedComps = COMPANIONS.filter((c) => companions[c.id]?.unlocked);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {/* 山海游历（疯狂水世界式探索产出蓝图/灵果/淬灵砂） */}
      <div className="xianxia-card rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-xianxia font-bold text-amber-200 flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-sky-300" />
            山海游历（获取稀缺蓝图与淬灵砂）
          </span>
          {unlockedComps.length > 0 && <span className="text-[11px] text-emerald-300">护法带队缩短 25% 耗时</span>}
        </div>

        {activeExpedition ? (
          <div className="rounded-lg bg-black/40 border border-amber-400/35 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-200">
                {EXPEDITION_MISSIONS.find((m) => m.id === activeExpedition.missionId)?.name}
              </span>
              <span className="text-sky-300 font-semibold">
                {activeExpedition.remainingSec <= 0 ? '已归来！' : `剩余 ${Math.ceil(activeExpedition.remainingSec)} 秒`}
              </span>
            </div>
            <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-400 to-amber-400 transition-all"
                style={{
                  width: `${Math.min(100, ((activeExpedition.totalSec - activeExpedition.remainingSec) / activeExpedition.totalSec) * 100)}%`,
                }}
              />
            </div>
            <button
              onClick={claimExpedition}
              disabled={activeExpedition.remainingSec > 0}
              className={`w-full py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                activeExpedition.remainingSec <= 0
                  ? 'xianxia-btn-gold'
                  : 'bg-black/40 border border-stone-800 text-stone-500 cursor-not-allowed'
              }`}
            >
              {activeExpedition.remainingSec <= 0 ? '领取游历收获' : '游历探索中...'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {EXPEDITION_MISSIONS.map((m) => (
              <div key={m.id} className="rounded-lg bg-black/35 border border-[#c99c4a]/25 p-2 flex flex-col justify-between gap-1.5">
                <div>
                  <div className="font-bold text-xs text-amber-100">{m.name}</div>
                  <div className="text-[10px] text-[#9c927a] mt-0.5">{m.description}</div>
                  <div className="text-[10px] text-sky-300 mt-1">
                    {m.rewards.blueprints ? `蓝图+${m.rewards.blueprints} ` : ''}
                    {m.rewards.spiritFruits ? `灵果+${m.rewards.spiritFruits} ` : ''}
                    {m.rewards.reforgeDust ? `淬灵砂+${m.rewards.reforgeDust} ` : ''}
                    {m.rewards.tribulationPills ? `渡劫丹+${m.rewards.tribulationPills} ` : ''}
                  </div>
                </div>
                <button
                  onClick={() => startExpedition(m.id, unlockedComps[0]?.id ?? null)}
                  className="w-full py-1 rounded xianxia-btn-jade text-[11px] font-bold cursor-pointer"
                >
                  派遣 ({unlockedComps.length > 0 ? Math.round(m.durationSec * 0.75) : m.durationSec}s)
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 四大仙脉觉醒（寻道大千式 增伤/减伤核心） */}
      <div className="xianxia-card rounded-xl p-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-xianxia font-bold text-amber-200 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-400" />
            四大仙脉觉醒（主激活 100% · 辅脉 35% 增减伤）
          </span>
          {!unlocks.cultivationArts && <span className="text-[11px] text-amber-400">筑基1层开启</span>}
        </div>

        {!unlocks.cultivationArts ? (
          <div className="flex-1 flex items-center justify-center text-xs text-[#9c927a] py-4">
            <Lock className="w-4 h-4 mr-1.5" /> 需渡劫突破至【筑基1层】唤醒太古四象仙脉！
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {BLOODLINES.map((bl) => {
              const lv = bloodlineLevels[bl.id] ?? 0;
              const isActive = activeBloodlineId === bl.id;
              const { dust, stones } = calcBloodlineUpgradeCost(lv);
              const canAfford = resources.reforgeDust >= dust && resources.spiritStones >= stones;

              return (
                <div key={bl.id} className={`rounded-lg bg-black/35 border p-2 flex flex-col justify-between gap-1.5 ${isActive ? 'border-amber-400' : 'border-[#c99c4a]/25'}`}>
                  <div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold" style={{ color: bl.color }}>
                        {bl.name}
                      </span>
                      <span className="text-[10px] text-amber-200">{lv > 0 ? `${lv}阶` : '未觉醒'}</span>
                    </div>
                    <div className="text-[10px] text-[#9c927a] mt-0.5">{bl.description}</div>
                  </div>
                  <div className="flex gap-1">
                    {lv > 0 && (
                      <button
                        onClick={() => setActiveBloodline(bl.id)}
                        className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                          isActive ? 'xianxia-btn-jade' : 'bg-black/45 border border-[#c99c4a]/30 text-[#cbbd9f]'
                        }`}
                      >
                        {isActive ? '主脉' : '激活'}
                      </button>
                    )}
                    <button
                      onClick={() => upgradeBloodline(bl.id)}
                      disabled={!canAfford}
                      className={`flex-1 py-1 rounded text-[10px] font-bold cursor-pointer ${
                        canAfford ? 'xianxia-btn-gold' : 'bg-black/35 border border-stone-800 text-stone-500 cursor-not-allowed'
                      }`}
                    >
                      觉醒 ({dust}砂 {stones}石)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
