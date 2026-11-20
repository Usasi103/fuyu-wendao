import React, { useState } from 'react';
import { Cloud, CloudOff, Copy, Download, RotateCcw, Upload, X } from 'lucide-react';
import { getTreeQualityProbabilities } from '../core/formulas';
import { QUALITY_CONFIG } from '../data/realms';
import { QualityTier } from '../core/types';
import { useGameStore } from '../store/gameStore';
import { XianxiaModalBackdrop } from './XianxiaUI';

export const SettingsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const heroName = useGameStore((s) => s.heroName);
  const treeLevel = useGameStore((s) => s.treeLevel);
  const cloudSyncKey = useGameStore((s) => s.cloudSyncKey);
  const cloudStatus = useGameStore((s) => s.cloudStatus);
  const setHeroName = useGameStore((s) => s.setHeroName);
  const exportSaveJson = useGameStore((s) => s.exportSaveJson);
  const importSaveJson = useGameStore((s) => s.importSaveJson);
  const resetAllProgress = useGameStore((s) => s.resetAllProgress);
  const bindCloudSyncKey = useGameStore((s) => s.bindCloudSyncKey);
  const pushCloudSave = useGameStore((s) => s.pushCloudSave);
  const unbindCloudSync = useGameStore((s) => s.unbindCloudSync);

  const [nameInput, setNameInput] = useState(heroName);
  const [cloudInput, setCloudInput] = useState(cloudSyncKey);
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState('');

  if (!open) return null;

  const probs = getTreeQualityProbabilities(treeLevel);

  return (
    <XianxiaModalBackdrop onClose={onClose}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-xianxia text-lg font-bold text-amber-200">仙途玉简 · 云端存档与掉率公示</h3>
        <button onClick={onClose} className="p-1 text-[#a79c82] hover:text-amber-200 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex gap-2 items-center">
          <label className="text-xs text-[#b6ab91] whitespace-nowrap">道号：</label>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            className="flex-1 bg-black/45 border border-[#c99c4a]/40 rounded-lg px-3 py-1.5 text-sm text-amber-100"
            maxLength={12}
          />
          <button
            onClick={() => {
              setHeroName(nameInput);
              setMsg('道号已铭刻！');
            }}
            className="px-3 py-1.5 rounded-lg xianxia-btn-gold text-xs font-bold cursor-pointer"
          >
            改名
          </button>
        </div>

        {/* 跨浏览器/跨设备云存档（VPS 后端） */}
        <div className="xianxia-card rounded-xl p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-200 flex items-center gap-1.5">
              {cloudSyncKey ? <Cloud className="w-4 h-4 text-emerald-400" /> : <CloudOff className="w-4 h-4 text-[#9c927a]" />}
              跨浏览器 / 手机互通云存档（VPS 模式）
            </span>
            <span className="text-[11px] text-emerald-300">
              {cloudStatus === 'synced'
                ? '已云端同步'
                : cloudStatus === 'syncing'
                  ? '同步中...'
                  : cloudStatus === 'offline_backend'
                    ? '未连接后端'
                    : '仅本地保存'}
            </span>
          </div>
          <p className="text-[11px] text-[#9c927a]">
            输入专属仙途口令（如 <code className="text-amber-300">xiaoyao888</code>），在电脑或手机任意浏览器输入同一口令即可拉取并自动同步进度！
          </p>
          <div className="flex gap-2">
            <input
              value={cloudInput}
              onChange={(e) => setCloudInput(e.target.value)}
              placeholder="输入 3~32 位云端存档口令..."
              className="flex-1 bg-black/45 border border-[#c99c4a]/35 rounded-lg px-2.5 py-1.5 text-xs text-amber-100"
            />
            <button
              onClick={async () => {
                const res = await bindCloudSyncKey(cloudInput);
                setMsg(res.message);
              }}
              className="px-3 py-1.5 rounded-lg xianxia-btn-jade text-xs font-bold cursor-pointer"
            >
              绑定/拉取
            </button>
            {cloudSyncKey && (
              <>
                <button
                  onClick={async () => {
                    const ok = await pushCloudSave();
                    setMsg(ok ? '已立刻上传至云端！' : '上传失败，请确认 VPS 后端已启动');
                  }}
                  className="px-2.5 py-1.5 rounded-lg xianxia-btn-gold text-xs font-bold cursor-pointer"
                >
                  立刻上传
                </button>
                <button
                  onClick={() => {
                    unbindCloudSync();
                    setCloudInput('');
                    setMsg('已解绑云端同步，切回本地存档');
                  }}
                  className="px-2 py-1.5 rounded-lg bg-black/40 border border-[#c99c4a]/30 text-xs text-[#b6ab91] cursor-pointer"
                >
                  解绑
                </button>
              </>
            )}
          </div>
        </div>

        <div className="xianxia-card rounded-xl p-3">
          <div className="text-xs font-bold text-amber-200 mb-2">
            太古灵树 (Lv.{treeLevel}) 法宝掉率公示（每 20 抽保底高品）
          </div>
          <div className="grid grid-cols-4 gap-2 text-xs">
            {probs.map((p, idx) => {
              const q = QUALITY_CONFIG[idx as QualityTier];
              return (
                <div key={idx} className="flex items-center justify-between bg-black/40 border border-[#c99c4a]/15 px-2 py-1 rounded">
                  <span className={q.textClass}>{q.name}</span>
                  <span className="text-[#e6dbc2]">{(p * 100).toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="xianxia-card rounded-xl p-3 flex flex-col gap-2">
          <div className="text-xs font-bold text-amber-200">离线 JSON 存档导出 / 导入</div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const json = exportSaveJson();
                navigator.clipboard?.writeText(json).catch(() => {});
                setImportText(json);
                setMsg('已生成存档文本并复制到剪贴板！');
              }}
              className="flex-1 py-1.5 px-3 rounded-lg xianxia-btn-jade text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" /> 复制存档码
            </button>
            <button
              onClick={() => {
                const blob = new Blob([exportSaveJson()], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `fuyu-wendao-save.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="py-1.5 px-3 rounded-lg bg-black/45 border border-[#c99c4a]/35 text-[#e6dbc2] text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> 下载
            </button>
          </div>

          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="在此粘贴存档 JSON 字符串后点击导入..."
            rows={2}
            className="w-full bg-black/45 border border-[#c99c4a]/30 rounded-lg p-2 text-xs text-amber-100 font-mono"
          />
          <div className="flex gap-2">
            <button
              onClick={() => {
                const res = importSaveJson(importText);
                setMsg(res.ok ? '存档恢复成功！' : res.error ?? '导入失败');
              }}
              className="flex-1 py-1.5 rounded-lg xianxia-btn-gold text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" /> 导入存档
            </button>
            <button
              onClick={() => {
                resetAllProgress();
                setMsg('已兵解重修，回到炼气一层！');
              }}
              className="py-1.5 px-3 rounded-lg xianxia-btn-crimson text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 兵解重修
            </button>
          </div>
          {msg && <div className="text-xs text-amber-300 font-semibold">{msg}</div>}
        </div>
      </div>
    </XianxiaModalBackdrop>
  );
};
