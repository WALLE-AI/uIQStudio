import React from 'react';
import { X, BookOpen, Keyboard, FileText, CheckCircle2, Radio } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">IQStudio 标注操作指南与数据集规范</h2>
              <p className="text-xs text-slate-500">面向无线电多模态大模型的配对标注规范与快捷键</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 text-xs overflow-y-auto flex-1 leading-relaxed text-slate-700">
          
          {/* Section 1: IQStudio Core Mission */}
          <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2">
            <div className="font-bold text-blue-900 text-sm flex items-center space-x-1.5">
              <Radio className="w-4 h-4 text-blue-600" />
              <span>什么是 IQStudio 无线电大模型标注？</span>
            </div>
            <p className="text-slate-600">
              传统的无线电调制识别（AMC）仅输出单个分类标签（如 "OFDM" 或 "QPSK"），无法表述发射机个体硬件指纹、传输场景、天线极化、信道多径以及无人机巡航等丰富的上下文语义。
              <strong>IQStudio</strong> 采用对比学习范式（Contrastive Learning），将 <strong>IQ 时域波形 / 时频图谱</strong> 与 <strong>自然语言叙述文本</strong> 进行跨模态对齐投影，实现类似视觉大模型的零样本开放式无线电语义理解与检索。
            </p>
          </div>

          {/* Section 2: Standard Caption Recipe */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm">标准文本配对 (Caption) 撰写范式</h3>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 font-mono text-[11px]">
              <div className="text-blue-700 font-semibold">
                [设备具体型号] + [中心频点与带宽] + [物理调制与协议] + [工作动态与传输距离] + [硬件指纹与信道瞬态]
              </div>
              <div className="text-slate-600 text-xs font-sans leading-relaxed">
                <strong>推荐范例：</strong> "This is a DJI Mavic 3 drone signal recorded at 2.437 GHz with 20 MHz bandwidth. Modulation is OFDM (Wi-Fi). The drone is hovering in an outdoor open field at 100m distance (LOS). The spectrum exhibits distinct cyclic prefix headers and power amplifier rise-time transients."
              </div>
            </div>
          </div>

          {/* Section 3: Keyboard Shortcuts */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-1.5">
              <Keyboard className="w-4 h-4 text-blue-600" />
              <span>效率快捷键指南</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { key: 'Ctrl + S / ⌘ + S', desc: '保存当前样本并自动进入下一条' },
                { key: '← (左箭头)', desc: '切换至上一条样本' },
                { key: '→ (右箭头)', desc: '保存/切换至下一条样本' },
                { key: '空格键 (Space)', desc: '播放 / 暂停基带下变频音频合成' },
                { key: '数字键 1 ~ 4', desc: '快速切换顶部 1~4 级工作流步骤' },
                { key: 'ESC', desc: '关闭当前弹出的模态框或全屏视图' },
              ].map((item, i) => (
                <div key={i} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-800 font-semibold text-[11px] shadow-2xs">
                    {item.key}
                  </span>
                  <span className="text-slate-600 text-[11px]">{item.desc}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end bg-slate-50 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-1.5 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition shadow-xs cursor-pointer text-xs"
          >
            我已知晓
          </button>
        </div>

      </div>
    </div>
  );
};
