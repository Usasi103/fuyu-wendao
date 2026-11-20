import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { ALCHEMY_RECIPES, HERB_META, HerbId, NATAL_ARTIFACTS } from '../data/alchemyAndForge';
import { ELEMENT_META, ElementType } from '../data/elements';
import { COMPANIONS } from '../data/companions';

export const AlchemyForgeFormation: React.FC = () => {
  const [subMode, setSubMode] = useState<'alchemy' | 'forge' | 'formation'>('alchemy');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>(ALCHEMY_RECIPES[0].id);
  const [isBrewing, setIsBrewing] = useState(false);
  const [needlePos, setNeedlePos] = useState(50);
  const [brewNotice, setBrewNotice] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('hero');

  const herbs = useGameStore((s) => s.resources.herbs);
  const spiritStones = useGameStore((s) => s.resources.spiritStones);
  const spiritIron = useGameStore((s) => s.resources.spiritIron);
  const reforgeDust = useGameStore((s) => s.resources.reforgeDust);
  const elixirBuffs = useGameStore((s) => s.elixirBuffs);
  const furnaceLv = useGameStore((s) => s.buildings.alchemyFurnace.level);
  const forgeLv = useGameStore((s) => s.buildings.forge.level);
  const natalArtifacts = useGameStore((s) => s.natalArtifacts);
  const activeArtifactId = useGameStore((s) => s.activeArtifactId);
  const heroElement = useGameStore((s) => s.heroElement);
  const heroName = useGameStore((s) => s.heroName);
  const deployedCompanions = useGameStore((s) => s.deployedCompanions);
  const formationPositions = useGameStore((s) => s.formationPositions);

  const brewAlchemyPill = useGameStore((s) => s.brewAlchemyPill);
  const forgeOrUpgradeArtifact = useGameStore((s) => s.forgeOrUpgradeArtifact);
  const setActiveArtifact = useGameStore((s) => s.setActiveArtifact);
  const setHeroElement = useGameStore((s) => s.setHeroElement);
  const setFormationSlot = useGameStore((s) => s.setFormationSlot);

  // 炼丹火候游标往复动画 (40%-60% 为金色极品区间，25%-75% 为翠绿中品区间)
  useEffect(() => {
    if (!isBrewing) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - t0) / 1000;
      const pos = 50 + 48 * Math.sin(elapsed * 4.2);
      setNeedlePos(pos);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isBrewing]);

  const activeRecipe = ALCHEMY_RECIPES.find((r) => r.id === selectedRecipeId) ?? ALCHEMY_RECIPES[0];

  const handleStopFlame = () => {
    setIsBrewing(false);
    const dist = Math.abs(needlePos - 50);
    const qualityScore: 0 | 1 | 2 = dist <= 10 ? 2 : dist <= 25 ? 1 : 0;
    const res = brewAlchemyPill(activeRecipe.id, qualityScore);
    setBrewNotice(res.message);
  };

  const deployedUnits: Array<{ uid: string; name: string; elem: ElementType; sprite: string }> = [
    { uid: 'hero', name: heroName, elem: heroElement, sprite: './assets/pixel/px_hero.png' },
    ...deployedCompanions.map((cid) => {
      const meta = COMPANIONS.find((c) => c.id === cid);
      const spriteMap: Record<string, string> = {
        turtle_guardian: './assets/pixel/px_comp_turtle.png',
        sword_spirit: './assets/pixel/px_comp_sword.png',
        jade_deer: './assets/pixel/px_comp_deer.png',
        thunder_roc: './assets/pixel/px_comp_thunder.png',
        nine_tail_fox: './assets/pixel/px_comp_fox.png',
      };
      const elemMap: Record<string, ElementType> = {
        turtle_guardian: 'earth',
        sword_spirit: 'gold',
        jade_deer: 'wood',
        thunder_roc: 'fire',
        nine_tail_fox: 'water',
      };
      return {
        uid: cid,
        name: meta?.name ?? cid,
        elem: elemMap[cid] ?? 'wood',
        sprite: spriteMap[cid] ?? './assets/pixel/px_comp_turtle.png',
      };
    }),
  ];

  return (
    <div className="space-y-3">
      {/* 顶部子标签 */}
      <div className="grid grid-cols-3 gap-1.5">
        <button
          onClick={() => setSubMode('alchemy')}
          className={`py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
            subMode === 'alchemy'
              ? 'bg-emerald-900/70 border-emerald-400 text-emerald-100'
              : 'bg-slate-900/60 border-slate-700 text-slate-300'
          }`}
        >
          🔥 控火炼丹
        </button>
        <button
          onClick={() => setSubMode('forge')}
          className={`py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
            subMode === 'forge'
              ? 'bg-amber-900/70 border-amber-400 text-amber-100'
              : 'bg-slate-900/60 border-slate-700 text-slate-300'
          }`}
        >
          ⚔️ 神兵锻造
        </button>
        <button
          onClick={() => setSubMode('formation')}
          className={`py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
            subMode === 'formation'
              ? 'bg-sky-900/70 border-sky-400 text-sky-100'
              : 'bg-slate-900/60 border-slate-700 text-slate-300'
          }`}
        >
          🧭 九宫五行
        </button>
      </div>

      {/* 1. 真实炼丹 */}
      {subMode === 'alchemy' && (
        <div className="space-y-2.5">
          <div className="xianxia-card rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(HERB_META) as HerbId[]).map((h) => (
                <span key={h} className="px-2 py-0.5 rounded bg-slate-950/75 border border-slate-700" style={{ color: HERB_META[h].color }}>
                  {HERB_META[h].name}: {herbs[h] ?? 0}
                </span>
              ))}
            </div>
            <div className="text-[11px] text-amber-200">
              战丹余效: 攻+{elixirBuffs.atkBuffTurns}场 / 防+{elixirBuffs.defBuffTurns}场
            </div>
          </div>

          {furnaceLv < 1 && (
            <div className="rounded-xl border border-amber-400/50 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
              提示：请先在「浮岛洞天」点击空白地块建造【紫金丹炉】，方可开炉炼丹！
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALCHEMY_RECIPES.map((r) => {
              const selected = r.id === activeRecipe.id;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelectedRecipeId(r.id);
                    setIsBrewing(false);
                    setBrewNotice(null);
                  }}
                  className={`xianxia-card rounded-xl p-2.5 text-left transition cursor-pointer ${
                    selected ? 'border-amber-300 ring-1 ring-amber-400/60' : 'opacity-85 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm" style={{ color: r.color }}>
                      {r.name}
                    </span>
                    <span className="text-[11px] text-cyan-300">{r.stoneCost}灵石</span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">{r.desc}</div>
                  <div className="text-[10px] text-emerald-300 mt-1 flex flex-wrap gap-1.5">
                    {Object.entries(r.ingredients).map(([hid, cnt]) => (
                      <span key={hid}>
                        {HERB_META[hid as HerbId].name}×{cnt}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* 控火迷你挑战槽 */}
          <div className="xianxia-card rounded-xl p-3 space-y-2 border border-amber-500/40">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-amber-200">炉火控温小游戏（黄金中区停针 = 极品成丹！）</span>
              <span className="text-[11px] text-slate-400">当前：{activeRecipe.name}</span>
            </div>
            <div className="relative h-5 rounded-full overflow-hidden border border-amber-400/50 bg-slate-900">
              <div className="absolute inset-y-0 left-[25%] w-[50%] bg-emerald-600/55" />
              <div className="absolute inset-y-0 left-[40%] w-[20%] bg-amber-400/85" />
              <div
                className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_8px_#fff]"
                style={{ left: `calc(${needlePos}% - 3px)` }}
              />
            </div>
            <div className="flex items-center gap-2">
              {!isBrewing ? (
                <button
                  disabled={furnaceLv < 1}
                  onClick={() => {
                    setBrewNotice(null);
                    setIsBrewing(true);
                  }}
                  className="xianxia-btn-jade px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  引火开炉（现有灵石 {spiritStones}）
                </button>
              ) : (
                <button
                  onClick={handleStopFlame}
                  className="xianxia-btn-gold px-5 py-1.5 rounded-lg text-xs font-bold cursor-pointer animate-pulse"
                >
                  聚灵封炉！定格成丹
                </button>
              )}
              {brewNotice && <span className="text-xs text-amber-200 font-semibold">{brewNotice}</span>}
            </div>
          </div>
        </div>
      )}

      {/* 2. 神兵锻造 */}
      {subMode === 'forge' && (
        <div className="space-y-2.5">
          <div className="xianxia-card rounded-xl p-2.5 flex items-center justify-between text-xs">
            <span>
              秘境玄铁: <strong className="text-sky-300">{spiritIron}</strong> · 淬灵砂:{' '}
              <strong className="text-purple-300">{reforgeDust}</strong>
            </span>
            <span className="text-slate-300">锻造坊 Lv.{forgeLv}</span>
          </div>
          {forgeLv < 1 && (
            <div className="rounded-xl border border-amber-400/50 bg-amber-950/40 px-3 py-2 text-xs text-amber-200">
              提示：请先在「浮岛洞天」点击空白地块建造【神兵锻造坊】后再锻造本命法宝！
            </div>
          )}
          <div className="grid grid-cols-1 gap-2">
            {NATAL_ARTIFACTS.map((art) => {
              const lv = natalArtifacts[art.id] ?? 0;
              const ironNeed = Math.round(art.forgeCostIron * Math.pow(1.45, lv));
              const dustNeed = Math.round(art.forgeCostDust * Math.pow(1.4, lv));
              const isEquipped = activeArtifactId === art.id;
              return (
                <div key={art.id} className="xianxia-card rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm" style={{ color: art.color }}>
                        {art.name} {lv > 0 ? `Lv.${lv}` : '（未锻造）'}
                      </span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded border"
                        style={{ borderColor: ELEMENT_META[art.element].color, color: ELEMENT_META[art.element].color }}
                      >
                        {ELEMENT_META[art.element].label}系大招 · {art.ultName}
                      </span>
                      {isEquipped && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400 text-amber-200">
                          已佩带
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">{art.ultDesc}</div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {lv > 0 && !isEquipped && (
                      <button
                        onClick={() => setActiveArtifact(art.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-sky-400/50 text-xs text-sky-200 cursor-pointer"
                      >
                        佩带出战
                      </button>
                    )}
                    <button
                      disabled={forgeLv < 1 || spiritIron < ironNeed || reforgeDust < dustNeed}
                      onClick={() => forgeOrUpgradeArtifact(art.id)}
                      className="xianxia-btn-gold px-3 py-1.5 rounded-lg text-xs cursor-pointer disabled:opacity-40"
                    >
                      {lv > 0 ? '重铸升阶' : '锻造'} ({ironNeed}铁+{dustNeed}砂)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. 九宫布阵 & 五行切换 */}
      {subMode === 'formation' && (
        <div className="space-y-2.5">
          <div className="xianxia-card rounded-xl p-2.5 space-y-2">
            <div className="text-xs font-bold text-amber-200">主角灵根五行（克制享 1.3× 伤害，被克 0.8×）</div>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(ELEMENT_META) as ElementType[]).map((el) => {
                const m = ELEMENT_META[el];
                const active = heroElement === el;
                return (
                  <button
                    key={el}
                    onClick={() => setHeroElement(el)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      active ? 'bg-slate-800 ring-1 ring-amber-300' : 'bg-slate-950/70 opacity-75'
                    }`}
                    style={{ borderColor: m.color, color: m.color }}
                  >
                    {m.label} · 克{ELEMENT_META[m.beats].label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2.5">
            <div className="xianxia-card rounded-xl p-2 space-y-1.5">
              <div className="text-[11px] font-bold text-slate-300">① 点选上阵单位</div>
              {deployedUnits.map((u) => (
                <button
                  key={u.uid}
                  onClick={() => setSelectedUnitId(u.uid)}
                  className={`w-full px-2 py-1.5 rounded-lg border text-left flex items-center gap-2 text-xs cursor-pointer ${
                    selectedUnitId === u.uid
                      ? 'bg-amber-950/60 border-amber-300 text-amber-100'
                      : 'bg-slate-900/70 border-slate-700 text-slate-300'
                  }`}
                >
                  <div
                    className="w-5 h-5 shrink-0"
                    style={{
                      backgroundImage: `url(${u.sprite})`,
                      backgroundSize: '400% 100%',
                      imageRendering: 'pixelated',
                    }}
                  />
                  <span className="truncate">{u.name}</span>
                  <span className="ml-auto text-[10px]" style={{ color: ELEMENT_META[u.elem].color }}>
                    {ELEMENT_META[u.elem].label}
                  </span>
                </button>
              ))}
            </div>

            <div className="xianxia-card rounded-xl p-2.5">
              <div className="flex items-center justify-between text-[11px] text-slate-300 mb-2">
                <span>② 点选右侧九宫阵位放置（左=后排输出 · 右=前排承伤）</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {[0, 1, 2].map((row) =>
                  [2, 1, 0].map((col) => {
                    const occupant = deployedUnits.find((u) => {
                      const pos = formationPositions[u.uid] ?? (u.uid === 'hero' ? { row: 1, col: 1 } : { row: 1, col: 0 });
                      return pos.row === row && pos.col === col;
                    });
                    const colLabel = col === 0 ? '前排' : col === 1 ? '中军' : '后排';
                    return (
                      <button
                        key={`${row}_${col}`}
                        onClick={() => setFormationSlot(selectedUnitId, row, col)}
                        className={`h-14 rounded-lg border flex flex-col items-center justify-center transition cursor-pointer ${
                          occupant
                            ? 'bg-emerald-950/60 border-amber-400/70'
                            : 'bg-slate-950/75 border-slate-700/70 hover:border-sky-400/60'
                        }`}
                      >
                        {occupant ? (
                          <>
                            <div
                              className="w-6 h-6"
                              style={{
                                backgroundImage: `url(${occupant.sprite})`,
                                backgroundSize: '400% 100%',
                                imageRendering: 'pixelated',
                              }}
                            />
                            <span className="text-[10px] text-amber-200 truncate max-w-[90%]">{occupant.name}</span>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-500">{colLabel}</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
