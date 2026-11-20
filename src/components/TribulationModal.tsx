import React, { useState } from 'react';
import { Flame, ShieldAlert, Sparkles, X } from 'lucide-react';
import { calcBreakthroughStoneCost, calcExpRequired, calcTribulationSuccessRate, getRealmDisplay } from '../core/formulas';
import { REALM_TIERS } from '../data/realms';
import { useGameStore } from '../store/gameStore';
import { PillIcon, SpiritStoneIcon, XianxiaModalBackdrop } from './XianxiaUI';

export const TribulationModal: React.FC = () => {
  const open = useGameStore((s) => s.tribulationModalOpen);
  const close = useGameStore((s) => s.closeTribulationModal);
  const realmTier = useGameStore((s) => s.realmTier);
  const realmSub = useGameStore((s) => s.realmSub);
  const exp = useGameStore((s) => s.exp);
  const resources = useGameStore((s) => s.resources);
  const getHeroTotalPower = useGameStore((s) => s.getHeroTotalPower);
  const attemptBreakthrough = useGameStore((s) => s.attemptBreakthrough);

  const [pillsToUse, setPillsToUse] = useState(0);
  const [feedback, setFeedback] = useState('');

  if (!open) return null;

  const tierCfg = REALM_TIERS[realmTier];
  const isMajor = realmSub >= tierCfg.maxSubLevel && realmTier < REALM_TIERS.length - 1;
  const expReq = calcExpRequired(realmTier, realmSub);
  const stoneCost = calcBreakthroughStoneCost(realmTier, realmSub);
  const power = getHeroTotalPower();
  const maxPills = Math.min(3, resources.tribulationPills);
  const actualPills = Math.min(pillsToUse, maxPills);
  const { rate, recommendedPower } = calcTribulationSuccessRate(realmTier, power, actualPills);
  const targetRealm = isMajor ? getRealmDisplay(realmTier + 1, 1) : getRealmDisplay(realmTier, realmSub + 1);

  return (
    <XianxiaModalBackdrop onClose={close} maxWidth="max-w-md">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-amber-400" />
          <h3 className="font-xianxia text-lg font-bold text-amber-200 tracking-wide">
            {isMajor ? '九霄雷劫 · 大境界突破' : '聚灵冲关 · 境界晋升'}
          </h3>
        </div>
        <button onClick={close} className="p-1 text-[#a79c82] hover:text-amber-200 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="xianxia-card rounded-xl p-3.5 flex flex-col gap-2.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-[#b6ab91]">当前境界：{getRealmDisplay(realmTier, realmSub)}</span>
          <span className="font-xianxia font-bold text-amber-300 text-sm">→ {targetRealm}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-black/35 border border-[#c99c4a]/20 p-2">
            <div className="text-[11px] text-[#9c927a]">修为要求</div>
            <div className={`font-bold mt-0.5 ${exp >= expReq ? 'text-emerald-300' : 'text-rose-300'}`}>
              {exp.toLocaleString()} / {expReq.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg bg-black/35 border border-[#c99c4a]/20 p-2">
            <div className="text-[11px] text-[#9c927a]">聚阵灵石</div>
            <div className={`font-bold mt-0.5 flex items-center gap-1 ${resources.spiritStones >= stoneCost ? 'text-sky-300' : 'text-rose-300'}`}>
              <SpiritStoneIcon className="w-3.5 h-3.5" />
              {resources.spiritStones.toLocaleString()} / {stoneCost.toLocaleString()}
            </div>
          </div>
        </div>

        {isMajor && (
          <>
            <div className="rounded-lg bg-black/40 border border-amber-500/30 p-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[#d6cbb2]">渡劫成功几率</span>
                <span className={`text-base font-black ${rate >= 0.75 ? 'text-emerald-300' : rate >= 0.5 ? 'text-amber-300' : 'text-rose-400'}`}>
                  {(rate * 100).toFixed(0)}%
                </span>
              </div>
              <div className="text-[11px] text-[#a79c82]">
                当前战力 {power.toLocaleString()} / 推荐战力 {recommendedPower.toLocaleString()}
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#c99c4a]/20">
                <span className="flex items-center gap-1 text-amber-200">
                  <PillIcon className="w-4 h-4" /> 服用渡劫丹 (+22%/枚，余 {resources.tribulationPills})
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPillsToUse(Math.max(0, actualPills - 1))}
                    className="w-6 h-6 rounded bg-black/50 border border-[#c99c4a]/40 text-amber-200 font-bold cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-5 text-center font-bold text-amber-300">{actualPills}</span>
                  <button
                    onClick={() => setPillsToUse(Math.min(maxPills, actualPills + 1))}
                    className="w-6 h-6 rounded bg-black/50 border border-[#c99c4a]/40 text-amber-200 font-bold cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-lg bg-rose-950/45 border border-rose-500/35 px-2.5 py-2 text-[11px] text-rose-200">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>天劫凶险！若渡劫失败，将遭雷劫反噬散去 30% 当前修为，且消耗灵石与丹药。可通过镇妖古塔获取渡劫丹！</span>
            </div>
          </>
        )}
      </div>

      {feedback && <div className="mt-2.5 text-center text-xs font-bold text-rose-300">{feedback}</div>}

      <div className="mt-3.5 flex gap-2.5">
        <button
          onClick={close}
          className="flex-1 py-2.5 rounded-xl bg-black/40 border border-[#c99c4a]/35 text-[#d6cbb2] text-xs font-bold cursor-pointer"
        >
          再积底蕴
        </button>
        <button
          disabled={exp < expReq || resources.spiritStones < stoneCost}
          onClick={() => {
            const res = attemptBreakthrough(actualPills);
            if (!res.success) setFeedback(res.message);
            else setFeedback('');
          }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer transition ${
            exp >= expReq && resources.spiritStones >= stoneCost
              ? isMajor
                ? 'xianxia-btn-crimson'
                : 'xianxia-btn-gold'
              : 'bg-stone-900/70 border border-stone-700 text-stone-500 cursor-not-allowed'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          {isMajor ? '引动天劫' : '立即突破'}
        </button>
      </div>
    </XianxiaModalBackdrop>
  );
};
