import React from 'react';
import { ArrowDown, ArrowUp, Sparkles, Trash2 } from 'lucide-react';
import { QUALITY_CONFIG, SLOT_META, SUB_STAT_META } from '../data/realms';
import { calcDecomposeRewards } from '../core/lootEngine';
import { EquipmentItem, SubStatKey } from '../core/types';
import { useGameStore } from '../store/gameStore';
import { XianxiaModalBackdrop } from './XianxiaUI';

const ItemCard: React.FC<{ title: string; item: EquipmentItem | undefined }> = ({ title, item }) => {
  if (!item) {
    return (
      <div className="flex-1 rounded-xl border border-[#c99c4a]/25 bg-black/35 p-3 flex flex-col justify-center items-center text-[#8f856e] text-xs min-h-[148px]">
        <span>{title}</span>
        <span className="mt-1">空法宝位</span>
      </div>
    );
  }
  const q = QUALITY_CONFIG[item.quality];
  return (
    <div className={`flex-1 rounded-xl border ${q.borderClass} ${q.bgClass} p-3 flex flex-col gap-1.5`}>
      <div className="text-[11px] text-[#b6ab91]">{title}</div>
      <div className={`font-xianxia font-bold text-sm ${q.textClass}`}>
        [{q.name}] {item.name}
      </div>
      <div className="text-xs text-amber-300 font-semibold">战力 {item.power}</div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-xs text-[#f3ead3] mt-1">
        <span>攻击 +{item.atk}</span>
        <span>气血 +{item.hp}</span>
        <span>防御 +{item.def}</span>
        <span>身法 +{item.speed}</span>
      </div>
      {Object.keys(item.subStats).length > 0 && (
        <div className="mt-1.5 pt-1.5 border-t border-[#c99c4a]/25 flex flex-wrap gap-1">
          {Object.entries(item.subStats).map(([k, v]) => {
            if (!v) return null;
            const meta = SUB_STAT_META[k as SubStatKey];
            return (
              <span
                key={k}
                className="text-[11px] px-1.5 py-0.5 rounded bg-black/50 border border-[#c99c4a]/25"
                style={{ color: meta.color }}
              >
                {meta.label} +{(v * 100).toFixed(1)}%
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const EquipmentCompareModal: React.FC = () => {
  const pendingItem = useGameStore((s) => s.pendingItem);
  const equipment = useGameStore((s) => s.equipment);
  const alchemyLv = useGameStore((s) => s.buildings.alchemyFurnace.level);
  const equipPending = useGameStore((s) => s.equipPending);
  const decomposePending = useGameStore((s) => s.decomposePending);

  if (!pendingItem) return null;

  const currentItem = equipment[pendingItem.slot];
  const powerDiff = pendingItem.power - (currentItem?.power ?? 0);
  const rewards = calcDecomposeRewards(pendingItem, alchemyLv);
  const slotLabel = SLOT_META[pendingItem.slot].label;

  // 点击空白处按战力高低自动处理并关闭
  const handleBackdropDismiss = () => {
    if (powerDiff > 0) equipPending();
    else decomposePending();
  };

  return (
    <XianxiaModalBackdrop onClose={handleBackdropDismiss}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="font-xianxia font-bold text-amber-100 text-base">灵树掉宝 · {slotLabel}鉴宝</h3>
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full ${
            powerDiff >= 0 ? 'bg-emerald-900/60 border border-emerald-400/50 text-emerald-300' : 'bg-rose-900/60 border border-rose-400/50 text-rose-300'
          }`}
        >
          {powerDiff >= 0 ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
          {powerDiff >= 0 ? `+${powerDiff}` : powerDiff} 战力
        </div>
      </div>

      <div className="flex gap-2.5">
        <ItemCard title="当前佩带" item={currentItem} />
        <ItemCard title="灵树新获" item={pendingItem} />
      </div>

      <div className="mt-4 flex gap-2.5">
        <button
          onClick={decomposePending}
          className="flex-1 py-2.5 px-3 rounded-xl bg-black/45 hover:bg-black/65 border border-[#c99c4a]/35 text-[#e6dbc2] text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition"
        >
          <Trash2 className="w-4 h-4 text-amber-400" />
          化灵 (修为+{rewards.exp} / 灵石+{rewards.spiritStones})
        </button>
        <button
          onClick={equipPending}
          className="flex-1 py-2.5 px-3 rounded-xl xianxia-btn-gold text-sm font-black flex items-center justify-center gap-1.5 cursor-pointer transition"
        >
          <Sparkles className="w-4 h-4" />
          {currentItem ? '替换佩带' : '立即佩带'}
        </button>
      </div>
    </XianxiaModalBackdrop>
  );
};
