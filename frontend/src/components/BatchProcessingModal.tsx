import React, { useState } from 'react';
import { 
  X, Sliders, CheckCircle2, Tag as TagIcon, Check, Layers, AlertCircle
} from 'lucide-react';
import { SignalSample, AnnotationStatus } from '../types/radio';
import { ALL_PRESET_TAGS } from '../data/mockSignals';

interface BatchProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  totalSamples: number;
  onBatchApply: (updates: {
    status?: AnnotationStatus;
    addTags?: string[];
    environment?: '室内' | '室外' | '城市' | '郊区' | '野外';
    antenna?: string;
  }) => void;
}

export const BatchProcessingModal: React.FC<BatchProcessingModalProps> = ({
  isOpen,
  onClose,
  selectedIds,
  totalSamples,
  onBatchApply,
}) => {
  const [targetScope, setTargetScope] = useState<'selected' | 'all'>('selected');
  const [updateStatus, setUpdateStatus] = useState<AnnotationStatus | ''>('');
  const [selectedTagsToAdd, setSelectedTagsToAdd] = useState<string[]>([]);
  const [updateEnv, setUpdateEnv] = useState<'' | '室内' | '室外' | '城市' | '郊区' | '野外'>('');
  const [updateAntenna, setUpdateAntenna] = useState('');

  if (!isOpen) return null;

  const count = targetScope === 'selected' ? selectedIds.length : totalSamples;

  const handleApply = () => {
    onBatchApply({
      ...(updateStatus ? { status: updateStatus } : {}),
      ...(selectedTagsToAdd.length > 0 ? { addTags: selectedTagsToAdd } : {}),
      ...(updateEnv ? { environment: updateEnv } : {}),
      ...(updateAntenna ? { antenna: updateAntenna } : {}),
    });
    onClose();
  };

  const toggleTag = (tag: string) => {
    if (selectedTagsToAdd.includes(tag)) {
      setSelectedTagsToAdd(selectedTagsToAdd.filter(t => t !== tag));
    } else {
      setSelectedTagsToAdd([...selectedTagsToAdd, tag]);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">批量标注与属性应用 (Batch Action)</h2>
              <p className="text-xs text-slate-500">统一对多条选定样本批量追加标签、修改状态或物理场景信息</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          
          {/* Target Scope */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">应用目标范围</label>
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={targetScope === 'selected'}
                  onChange={() => setTargetScope('selected')}
                  className="text-blue-600"
                />
                <span className="text-slate-700 font-medium">当前勾选的 {selectedIds.length} 项样本</span>
              </label>

              <label className="flex items-center space-x-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={targetScope === 'all'}
                  onChange={() => setTargetScope('all')}
                  className="text-blue-600"
                />
                <span className="text-slate-700 font-medium">全数据集 ({totalSamples} 项)</span>
              </label>
            </div>
          </div>

          {/* Action 1: Status */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <label className="block text-slate-700 font-semibold">1. 批量更新标注状态</label>
            <select
              value={updateStatus}
              onChange={(e) => setUpdateStatus(e.target.value as AnnotationStatus | '')}
              className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 text-xs"
            >
              <option value="">保持原状态不变</option>
              <option value="待标注">设为「待标注」</option>
              <option value="已标注">设为「已标注」</option>
              <option value="已审核">设为「已审核」</option>
            </select>
          </div>

          {/* Action 2: Add Tags */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">2. 批量追加标签 (Tags)</span>
              <span className="text-[10px] text-slate-400">已选 {selectedTagsToAdd.length} 个</span>
            </div>
            
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1 bg-white rounded border border-slate-200">
              {ALL_PRESET_TAGS.slice(0, 16).map((tag) => {
                const isSelected = selectedTagsToAdd.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-0.5 rounded text-[11px] transition flex items-center space-x-1 cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 text-white font-medium shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action 3: Environment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">3. 统一设置场景环境</label>
              <select
                value={updateEnv}
                onChange={(e) => setUpdateEnv(e.target.value as typeof updateEnv)}
                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 text-xs"
              >
                <option value="">不修改</option>
                <option value="室外">室外</option>
                <option value="室内">室内</option>
                <option value="城市">城市</option>
                <option value="郊区">郊区</option>
                <option value="野外">野外</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">4. 统一设置天线规格</label>
              <input
                type="text"
                placeholder="例如：全向双极化微带天线"
                value={updateAntenna}
                onChange={(e) => setUpdateAntenna(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 text-xs"
              />
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <span className="text-xs text-slate-500 font-mono">
            即将影响 <strong className="text-blue-700">{count} 条样本</strong>
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 transition font-medium cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleApply}
              disabled={count === 0}
              className="px-5 py-1.5 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              确认批量应用
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
