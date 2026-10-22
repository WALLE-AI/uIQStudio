import React, { useState } from 'react';
import { X, Settings, Save, CheckCircle2, RotateCcw } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetToDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onResetToDefaults,
}) => {
  const [annotatorName, setAnnotatorName] = useState('engineer_radio_01');
  const [defaultFft, setDefaultFft] = useState('1024');
  const [defaultWindow, setDefaultWindow] = useState('Hann');
  const [defaultColormap, setDefaultColormap] = useState('viridis');
  const [autoNext, setAutoNext] = useState(true);
  const [soundVolume, setSoundVolume] = useState('0.2');
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">平台系统偏好设置</h2>
              <p className="text-xs text-slate-500">标注者身份、DSP 时频变换默认值与音频合成</p>
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
          
          <div>
            <label className="block text-slate-700 font-semibold mb-1">标注工程师代号 (Annotator ID)</label>
            <input
              type="text"
              value={annotatorName}
              onChange={(e) => setAnnotatorName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-slate-800 font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">默认 FFT 变换点数</label>
              <select
                value={defaultFft}
                onChange={(e) => setDefaultFft(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-mono text-xs"
              >
                <option value="512">512</option>
                <option value="1024">1024</option>
                <option value="2048">2048</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">默认窗函数</label>
              <select
                value={defaultWindow}
                onChange={(e) => setDefaultWindow(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 text-xs"
              >
                <option value="Hann">Hann</option>
                <option value="Hamming">Hamming</option>
                <option value="Blackman">Blackman</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">默认时频热力图色板 (Colormap)</label>
            <select
              value={defaultColormap}
              onChange={(e) => setDefaultColormap(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-slate-700 font-mono text-xs"
            >
              <option value="viridis">viridis (科学感知均匀)</option>
              <option value="plasma">plasma (高动态对比)</option>
              <option value="inferno">inferno (辐射热力)</option>
              <option value="turbo">turbo (Google Turbo 彩虹)</option>
              <option value="jet">jet (经典七色)</option>
            </select>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
            <label className="flex items-center justify-between cursor-pointer">
              <span className="text-slate-800 font-semibold">保存标注后自动跳至下一条</span>
              <input
                type="checkbox"
                checked={autoNext}
                onChange={(e) => setAutoNext(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-0"
              />
            </label>
          </div>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <span className="text-slate-500 text-[11px]">重置所有样本数据至出厂状态</span>
            <button
              onClick={() => {
                onResetToDefaults();
                onClose();
              }}
              className="flex items-center space-x-1 text-[11px] text-red-600 hover:text-red-800 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>重置模拟数据集</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 transition font-medium cursor-pointer"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-1.5 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition shadow-xs flex items-center space-x-1.5 cursor-pointer"
          >
            {saved ? <CheckCircle2 className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
            <span>{saved ? '已保存设置' : '保存设置'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
