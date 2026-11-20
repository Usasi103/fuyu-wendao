import React from 'react';
import { useGameStore } from '../store/gameStore';
import { MapTileType, ROGUELITE_RELICS } from '../data/exploration';
import { XianxiaModalBackdrop } from './XianxiaUI';

const TILE_VISUAL: Record<MapTileType, { icon: string; name: string; bg: string; border: string; sprite?: string }> = {
  start: { icon: '⛩️', name: '传送阵', bg: 'bg-sky-950/60', border: 'border-sky-400/50' },
  empty: { icon: '🌫️', name: '灵雾', bg: 'bg-slate-900/60', border: 'border-slate-700/60' },
  herb: { icon: '🌿', name: '灵草玄铁', bg: 'bg-emerald-950/65', border: 'border-emerald-400/50' },
  chest: { icon: '📦', name: '古修宝箱', bg: 'bg-amber-950/65', border: 'border-amber-400/60' },
  enemy: {
    icon: '🐺',
    name: '妖兽巡逻',
    bg: 'bg-rose-950/65',
    border: 'border-rose-400/60',
    sprite: './assets/pixel/px_enemy_wolf.png',
  },
  merchant: { icon: '🏮', name: '云游仙商', bg: 'bg-indigo-950/65', border: 'border-indigo-400/60' },
  shrine: { icon: '🗿', name: '机缘神坛', bg: 'bg-violet-950/65', border: 'border-violet-400/60' },
  event: { icon: '📜', name: '秘境奇遇', bg: 'bg-teal-950/65', border: 'border-teal-400/50' },
  boss: {
    icon: '👹',
    name: '镇域妖王',
    bg: 'bg-red-950/80',
    border: 'border-red-400',
    sprite: './assets/pixel/px_enemy_boss.png',
  },
};

export const ExplorationView: React.FC = () => {
  const realmMap = useGameStore((s) => s.realmMap);
  const activeRelicIds = useGameStore((s) => s.activeRelicIds);
  const pendingRelicChoices = useGameStore((s) => s.pendingRelicChoices);
  const pendingEvent = useGameStore((s) => s.pendingEvent);
  const pendingMerchantOpen = useGameStore((s) => s.pendingMerchantOpen);
  const spiritStones = useGameStore((s) => s.resources.spiritStones);
  const blueprints = useGameStore((s) => s.resources.blueprints);
  const spiritIron = useGameStore((s) => s.resources.spiritIron);

  const moveRealmMapTile = useGameStore((s) => s.moveRealmMapTile);
  const pickRogueliteRelic = useGameStore((s) => s.pickRogueliteRelic);
  const resolveRealmEvent = useGameStore((s) => s.resolveRealmEvent);
  const buyMerchantItem = useGameStore((s) => s.buyMerchantItem);
  const closeMerchant = useGameStore((s) => s.closeMerchant);
  const resetRealmMap = useGameStore((s) => s.resetRealmMap);

  const activeRelics = ROGUELITE_RELICS.filter((r) => activeRelicIds.includes(r.id));

  return (
    <div className="relative h-full w-full overflow-y-auto bg-[#07111a] pt-14 sm:pt-13 px-2.5 pb-3 sm:px-4 sm:pb-4 flex flex-col gap-2.5">
      {/* 顶部星图状态栏 */}
      <div className="xianxia-card rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div>
          <div className="text-sm sm:text-base font-bold font-xianxia text-amber-300 flex items-center gap-2">
            <span>🌌 秘境星图 · 第 {realmMap.floor} 域</span>
            <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-200">
              点击相邻方格步步探索
            </span>
          </div>
          <div className="text-[11px] text-slate-300 mt-0.5">
            玄铁 <span className="text-sky-300 font-bold">{spiritIron}</span> · 蓝图{' '}
            <span className="text-amber-300 font-bold">{blueprints}</span> · 灵石{' '}
            <span className="text-cyan-300 font-bold">{spiritStones}</span> · 击败右端镇域妖王跃升下一域
          </div>
        </div>
        <button
          onClick={() => resetRealmMap(1)}
          className="px-2.5 py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-amber-500/35 text-[11px] text-amber-200 font-semibold cursor-pointer"
        >
          重置第1域
        </button>
      </div>

      {/* 肉鸽秘境赐福展示 */}
      <div className="xianxia-card rounded-xl px-3 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[11px] text-amber-200/80 whitespace-nowrap font-semibold">本轮秘境赐福:</span>
        {activeRelics.length === 0 ? (
          <span className="text-[11px] text-slate-400 whitespace-nowrap">暂无赐福，踩中🗿机缘神坛可三选一肉鸽祝福！</span>
        ) : (
          activeRelics.map((r) => (
            <span
              key={r.id}
              title={r.desc}
              className="px-2 py-0.5 rounded-md border text-[11px] font-semibold whitespace-nowrap bg-slate-950/70"
              style={{ borderColor: r.color, color: r.color }}
            >
              ✦ {r.name}
            </span>
          ))
        )}
      </div>

      {/* 7x5 迷雾网格 */}
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div
          className="grid gap-1.5 sm:gap-2 w-full max-w-2xl p-2 sm:p-3 rounded-xl border border-amber-500/30 bg-slate-950/85 shadow-2xl"
          style={{ gridTemplateColumns: `repeat(${realmMap.width}, minmax(0, 1fr))` }}
        >
          {realmMap.tiles.map((tile) => {
            const isPlayer = tile.x === realmMap.playerX && tile.y === realmMap.playerY;
            const isAdjacent = Math.abs(tile.x - realmMap.playerX) + Math.abs(tile.y - realmMap.playerY) === 1;
            const meta = TILE_VISUAL[tile.type];

            if (!tile.revealed) {
              return (
                <button
                  key={`${tile.x}_${tile.y}`}
                  disabled={!isAdjacent}
                  onClick={() => isAdjacent && moveRealmMapTile(tile.x, tile.y)}
                  className={`aspect-square rounded-lg border flex flex-col items-center justify-center transition ${
                    isAdjacent
                      ? 'bg-slate-800/80 border-amber-400/70 hover:bg-slate-700/90 cursor-pointer animate-pulse'
                      : 'bg-slate-950/90 border-slate-800/70 opacity-60 cursor-default'
                  }`}
                >
                  <span className="text-base sm:text-lg opacity-65">☁️</span>
                  {isAdjacent && <span className="text-[9px] text-amber-200 mt-0.5">可踏入</span>}
                </button>
              );
            }

            return (
              <button
                key={`${tile.x}_${tile.y}`}
                disabled={!isAdjacent}
                onClick={() => isAdjacent && moveRealmMapTile(tile.x, tile.y)}
                className={`relative aspect-square rounded-lg border p-1 flex flex-col items-center justify-center transition ${meta.bg} ${
                  isPlayer
                    ? 'border-amber-300 ring-2 ring-amber-400/70'
                    : isAdjacent
                    ? `${meta.border} hover:brightness-125 cursor-pointer ring-1 ring-amber-300/40`
                    : `${meta.border} opacity-90 cursor-default`
                }`}
              >
                {isPlayer ? (
                  <div
                    className="w-7 h-7 sm:w-9 sm:h-9"
                    style={{
                      backgroundImage: 'url(./assets/pixel/px_hero.png)',
                      backgroundSize: '400% 100%',
                      backgroundPosition: '0 0',
                      imageRendering: 'pixelated',
                    }}
                  />
                ) : tile.cleared ? (
                  <span className="text-xs text-slate-400">✓</span>
                ) : meta.sprite ? (
                  <div
                    className="w-6 h-6 sm:w-8 sm:h-8"
                    style={{
                      backgroundImage: `url(${meta.sprite})`,
                      backgroundSize: '400% 100%',
                      backgroundPosition: '0 0',
                      imageRendering: 'pixelated',
                    }}
                  />
                ) : (
                  <span className="text-base sm:text-xl leading-none">{meta.icon}</span>
                )}
                <span className="text-[9px] sm:text-[10px] text-slate-200/90 truncate max-w-full mt-0.5 font-medium">
                  {isPlayer ? '道友位置' : tile.cleared ? '已清剿' : tile.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 底部图例 */}
      <div className="text-[11px] text-slate-300/80 text-center shrink-0">
        🌿采药/玄铁 · 📦蓝图宝箱 · 🗿三选一肉鸽赐福 · 📜古修奇遇 · 🏮仙商 · 🐺巡逻妖兽 · 👹镇域妖王
      </div>

      {/* 肉鸽神坛三选一弹窗 */}
      {pendingRelicChoices && (
        <XianxiaModalBackdrop onClose={() => useGameStore.setState({ pendingRelicChoices: null })} maxWidth="max-w-lg">
          <div>
            <h3 className="text-base sm:text-lg font-bold font-xianxia text-amber-300 text-center">
              🗿 上古机缘神坛 · 肉鸽赐福三选一
            </h3>
            <p className="text-xs text-slate-300 text-center mt-1 mb-3">
              选择一项本轮秘境赐福，或点击空白处暂离此神坛
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {pendingRelicChoices.map((r) => (
                <button
                  key={r.id}
                  onClick={() => pickRogueliteRelic(r.id)}
                  className="xianxia-card rounded-xl p-3 text-left hover:brightness-125 transition cursor-pointer flex flex-col justify-between gap-2 border"
                  style={{ borderColor: r.color }}
                >
                  <div>
                    <div className="font-bold text-sm" style={{ color: r.color }}>
                      ✦ {r.name}
                    </div>
                    <div className="text-[11px] text-slate-200 mt-1 leading-relaxed">{r.desc}</div>
                  </div>
                  <div className="text-[11px] text-amber-300 font-semibold">择定此道果 →</div>
                </button>
              ))}
            </div>
          </div>
        </XianxiaModalBackdrop>
      )}

      {/* 随机奇遇事件弹窗 */}
      {pendingEvent && (
        <XianxiaModalBackdrop onClose={() => useGameStore.setState({ pendingEvent: null })} maxWidth="max-w-md">
          <div>
            <h3 className="text-base sm:text-lg font-bold font-xianxia text-teal-200">📜 {pendingEvent.title}</h3>
            <p className="text-xs sm:text-sm text-slate-200 mt-2 leading-relaxed">{pendingEvent.desc}</p>
            <div className="mt-4 flex flex-col gap-2">
              {pendingEvent.choices.map((ch, idx) => (
                <button
                  key={ch.label}
                  onClick={() => resolveRealmEvent(idx as 0 | 1)}
                  className="xianxia-card rounded-xl p-3 text-left hover:border-amber-300 transition cursor-pointer"
                >
                  <div className="text-sm font-bold text-amber-200">{ch.label}</div>
                  <div className="text-[11px] text-emerald-300 mt-0.5">可得：{ch.rewardText}</div>
                </button>
              ))}
            </div>
          </div>
        </XianxiaModalBackdrop>
      )}

      {/* 云游仙商弹窗 */}
      {pendingMerchantOpen && (
        <XianxiaModalBackdrop onClose={closeMerchant} maxWidth="max-w-md">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-bold font-xianxia text-amber-300">🏮 云游仙商行囊</h3>
              <span className="text-xs text-cyan-300 font-bold">现有灵石: {spiritStones}</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 mb-3">奇珍限量互市，点击空白处或离开按钮结束交易</p>
            <div className="space-y-2">
              <div className="xianxia-card rounded-xl p-2.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-amber-200">仙建蓝图 ×2</div>
                  <div className="text-[11px] text-slate-400">扩建浮岛地块与建造宗门设施必备</div>
                </div>
                <button
                  onClick={() => buyMerchantItem('blueprint')}
                  disabled={spiritStones < 80}
                  className="xianxia-btn-gold px-3 py-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-40"
                >
                  80 灵石
                </button>
              </div>
              <div className="xianxia-card rounded-xl p-2.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-emerald-200">渡劫护脉丹 ×1</div>
                  <div className="text-[11px] text-slate-400">大境界渡劫 +22% 成功率</div>
                </div>
                <button
                  onClick={() => buyMerchantItem('pill')}
                  disabled={spiritStones < 120}
                  className="xianxia-btn-gold px-3 py-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-40"
                >
                  120 灵石
                </button>
              </div>
              <div className="xianxia-card rounded-xl p-2.5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-sky-200">淬灵玄砂 ×25</div>
                  <div className="text-[11px] text-slate-400">锻造本命法宝与淬炼灵装</div>
                </div>
                <button
                  onClick={() => buyMerchantItem('dust')}
                  disabled={spiritStones < 70}
                  className="xianxia-btn-gold px-3 py-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-40"
                >
                  70 灵石
                </button>
              </div>
            </div>
            <button
              onClick={closeMerchant}
              className="mt-4 w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs text-slate-200 font-semibold cursor-pointer"
            >
              拱手辞别仙商
            </button>
          </div>
        </XianxiaModalBackdrop>
      )}
    </div>
  );
};
