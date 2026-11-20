import React from 'react';
import { useGameStore } from '../store/gameStore';
import { BUILDINGS, BUILDING_ORDER } from '../data/buildings';
import { calcBuildingBlueprintCost, calcBuildingUpgradeCost } from '../core/formulas';
import { BuildingId } from '../core/types';
import { XianxiaModalBackdrop } from './XianxiaUI';

export const SandboxTilePanel: React.FC = () => {
  const selectedTile = useGameStore((s) => s.selectedTile);
  const sandboxTiles = useGameStore((s) => s.sandboxTiles);
  const buildings = useGameStore((s) => s.buildings);
  const resources = useGameStore((s) => s.resources);

  const realmTier = useGameStore((s) => s.realmTier);
  const realmSub = useGameStore((s) => s.realmSub);
  const highestStageCleared = useGameStore((s) => s.highestStageCleared);
  const treeLevel = useGameStore((s) => s.treeLevel);
  const getUnlocks = useGameStore((s) => s.getUnlocks);

  const clearSelectedTile = useGameStore((s) => s.clearSelectedTile);
  const unlockSandboxTile = useGameStore((s) => s.unlockSandboxTile);
  const buildOnTile = useGameStore((s) => s.buildOnTile);
  const upgradeBuilding = useGameStore((s) => s.upgradeBuilding);
  const collectBuilding = useGameStore((s) => s.collectBuilding);

  if (!selectedTile) return null;

  // 触发状态更新以确保解锁同步
  void realmTier;
  void realmSub;
  void highestStageCleared;
  void treeLevel;
  const unlocks = getUnlocks();

  const tile = sandboxTiles.find((t) => t.x === selectedTile.x && t.y === selectedTile.y);
  if (!tile) return null;

  const unlockedCount = sandboxTiles.filter((t) => t.unlocked).length;
  const expandCostStones = 50 + (unlockedCount - 8) * 35;
  const adjacentUnlocked = sandboxTiles.some(
    (t) => t.unlocked && Math.abs(t.x - tile.x) + Math.abs(t.y - tile.y) === 1
  );

  const builtSet = new Set(sandboxTiles.filter((t) => t.buildingId && t.buildingId !== 'spiritTree').map((t) => t.buildingId));

  const isBuildingUnlocked = (id: BuildingId): boolean => {
    if (id === 'spiritArray') return true;
    if (id === 'springPool') return unlocks.springPool;
    if (id === 'alchemyFurnace') return unlocks.alchemyFurnace;
    if (id === 'beastGarden') return unlocks.beastGarden;
    if (id === 'herbFarm') return unlocks.herbFarm;
    if (id === 'forge') return unlocks.forge;
    if (id === 'thunderTower') return unlocks.thunderTower;
    return false;
  };

  return (
    <XianxiaModalBackdrop onClose={clearSelectedTile} maxWidth="max-w-md">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold font-xianxia text-amber-300">
            浮岛地块 ({tile.x}, {tile.y}) · {tile.unlocked ? '已开垦灵土' : '未开垦荒崖'}
          </h3>
          <button onClick={clearSelectedTile} className="text-xs text-slate-400 hover:text-white cursor-pointer">
            ✕ 关闭
          </button>
        </div>

        {!tile.unlocked ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-300">
              消耗灵石与仙建蓝图开垦此地块后，即可自由筑造灵田、丹炉、锻造坊或护岛雷塔。
            </p>
            {!adjacentUnlocked && (
              <div className="text-xs text-rose-300">⚠ 必须先开垦与现有浮岛相邻的地块。</div>
            )}
            <button
              disabled={!adjacentUnlocked || resources.spiritStones < expandCostStones || resources.blueprints < 1}
              onClick={() => unlockSandboxTile(tile.x, tile.y)}
              className="xianxia-btn-gold w-full py-2 rounded-xl text-xs cursor-pointer disabled:opacity-40"
            >
              开垦扩建 ({expandCostStones} 灵石 + 1 蓝图)
            </button>
          </div>
        ) : tile.buildingId && tile.buildingId !== 'spiritTree' ? (
          (() => {
            const bid = tile.buildingId as BuildingId;
            const meta = BUILDINGS[bid];
            const st = buildings[bid];
            const upCost = calcBuildingUpgradeCost(bid, st.level);
            const bpNeed = calcBuildingBlueprintCost(st.level);
            return (
              <div className="space-y-3">
                <div className="xianxia-card rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-amber-200">
                      {meta.name} Lv.{st.level}
                    </span>
                    <span className="text-xs text-emerald-300">库存 {Math.floor(st.storedAmount)}</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{meta.description}</p>
                </div>
                <div className="flex gap-2">
                  {bid !== 'thunderTower' && (
                    <button
                      onClick={() => collectBuilding(bid)}
                      className="xianxia-btn-jade flex-1 py-2 rounded-xl text-xs cursor-pointer"
                    >
                      收取产物
                    </button>
                  )}
                  <button
                    disabled={resources.spiritStones < upCost || resources.blueprints < bpNeed}
                    onClick={() => upgradeBuilding(bid)}
                    className="xianxia-btn-gold flex-1 py-2 rounded-xl text-xs cursor-pointer disabled:opacity-40"
                  >
                    升级 ({upCost}灵石{bpNeed ? '+1蓝图' : ''})
                  </button>
                </div>
              </div>
            );
          })()
        ) : tile.buildingId === 'spiritTree' ? (
          <div className="text-xs text-emerald-200 py-2">此地块为仙岛主根灵脉，扎根着建木灵树！点击浮岛灵树直接砍树掉落仙装。</div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            <div className="text-xs text-slate-300">选择要在此空地筑造的仙门设施：</div>
            {BUILDING_ORDER.map((bid) => {
              const cfg = BUILDINGS[bid];
              const already = builtSet.has(bid);
              const unlocked = isBuildingUnlocked(bid);
              return (
                <div key={bid} className="xianxia-card rounded-xl p-2.5 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-amber-200">{cfg.name}</div>
                    <div className="text-[10px] text-slate-300">{cfg.description}</div>
                  </div>
                  {already ? (
                    <span className="text-[11px] text-emerald-300 shrink-0">已筑造</span>
                  ) : !unlocked ? (
                    <span className="text-[11px] text-slate-400 shrink-0">未解锁</span>
                  ) : (
                    <button
                      disabled={resources.spiritStones < cfg.baseCost || resources.blueprints < 1}
                      onClick={() => buildOnTile(tile.x, tile.y, bid)}
                      className="xianxia-btn-gold px-2.5 py-1.5 rounded-lg text-[11px] shrink-0 cursor-pointer disabled:opacity-40"
                    >
                      建造 ({cfg.baseCost}石+1图)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </XianxiaModalBackdrop>
  );
};

export const DisciplesRaidBar: React.FC = () => {
  const disciples = useGameStore((s) => s.disciples);
  const raidCountdownSec = useGameStore((s) => s.raidCountdownSec);
  const activeRaid = useGameStore((s) => s.activeRaid);
  const spiritStones = useGameStore((s) => s.resources.spiritStones);
  const recruitDisciple = useGameStore((s) => s.recruitDisciple);
  const triggerIslandRaid = useGameStore((s) => s.triggerIslandRaid);

  const recruitCost = 75 * disciples.length;

  return (
    <div className="w-full max-w-2xl rounded-xl xianxia-panel px-2.5 py-1 flex flex-wrap items-center justify-between gap-1.5 text-[10px] sm:text-[11px]">
      <div className="flex items-center gap-2">
        <span className="text-emerald-300 font-semibold">
          👥 宗门弟子: {disciples.length}/5 (产速+{disciples.length * 10}%)
        </span>
        {disciples.length < 5 && (
          <button
            disabled={spiritStones < recruitCost}
            onClick={recruitDisciple}
            className="px-2 py-0.5 rounded bg-emerald-900/70 hover:bg-emerald-800 border border-emerald-400/50 text-emerald-100 cursor-pointer disabled:opacity-40"
          >
            招募 ({recruitCost}灵石)
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {activeRaid ? (
          <div className="flex items-center gap-2">
            <span className="text-rose-300 font-bold animate-pulse">
              🔥 第 {activeRaid.wave} 波妖兽攻岛中 ({Math.max(0, Math.ceil(activeRaid.enemyHp))}/{activeRaid.enemyMaxHp})
            </span>
          </div>
        ) : (
          <>
            <span className="text-amber-200/80">妖兽攻岛倒计时: {Math.max(0, Math.ceil(raidCountdownSec))}s</span>
            <button
              onClick={triggerIslandRaid}
              className="px-2 py-0.5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-400/50 text-rose-200 cursor-pointer"
            >
              引兽守岛(赚玄铁)
            </button>
          </>
        )}
      </div>
    </div>
  );
};
