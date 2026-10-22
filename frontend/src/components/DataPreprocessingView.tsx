import React, { useState, useEffect, useRef } from 'react';
import { 
  Sliders, Check, ArrowRight, Play, RotateCcw, ShieldCheck, 
  Layers, Terminal, CheckCircle2, Cpu
} from 'lucide-react';
import { SignalSample } from '../types/radio';

interface DataPreprocessingViewProps {
  datasetList: SignalSample[];
  onCompletePreprocessing: () => void;
}

export const DataPreprocessingView: React.FC<DataPreprocessingViewProps> = ({
  datasetList,
  onCompletePreprocessing,
}) => {
  // Processing Pipeline Configuration
  const [removeDCOffset, setRemoveDCOffset] = useState(true);
  const [filterType, setFilterType] = useState<'none' | 'fir_lowpass' | 'fir_bandpass'>('fir_bandpass');
  const [sliceLength, setSliceLength] = useState<'1024' | '2048' | '4096'>('2048');
  const [normalizePower, setNormalizePower] = useState(true);
  const [addAugmentation, setAddAugmentation] = useState(false);
  const [snrJitter, setSnrJitter] = useState(2.0);

  // Execution state
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    '待命: 预处理流水线已配置完毕，准备批处理输入序列...',
  ]);

  const canvasBeforeRef = useRef<HTMLCanvasElement | null>(null);
  const canvasAfterRef = useRef<HTMLCanvasElement | null>(null);

  // Draw comparison waveforms
  useEffect(() => {
    // Before canvas (with noisy DC offset & irregular power)
    if (canvasBeforeRef.current) {
      const canvas = canvasBeforeRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        
        ctx.strokeStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
        ctx.stroke();

        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const t = x / 15;
          // Offset upwards by 20px to show DC bias
          const val = Math.sin(t) * 25 + Math.cos(t * 3) * 10 + (Math.random() * 12 - 6);
          const y = h / 2 - 20 - val;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // After canvas (clean, centered, normalized)
    if (canvasAfterRef.current) {
      const canvas = canvasAfterRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        ctx.strokeStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
        ctx.stroke();

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let x = 0; x < w; x++) {
          const t = x / 15;
          // Zero centered, clean envelope
          const val = Math.sin(t) * 35 + Math.cos(t * 3) * 8;
          const y = h / 2 - val;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }
  }, [removeDCOffset, filterType, normalizePower]);

  const handleRunPipeline = () => {
    setIsRunning(true);
    setIsFinished(false);
    setProgress(0);
    setLogs(['[00:00:01] 启动 IQStudio 预处理引擎...']);

    const steps = [
      '[00:00:02] 加载 IQ 数据流: 12 条原始序列，总计 24,576,000 复数采样点',
      '[00:00:03] 执行 I/Q 直流偏置消除 (DC Offset Cancellation): 均值调整完成',
      '[00:00:04] FIR 64阶带通滤波: 衰减带外杂散与镜像频率 (-52 dB 阻带抑制)',
      `[00:00:05] 定长切片重采样: 帧长 ${sliceLength} 点，滑动步长 512 点`,
      '[00:00:06] 单位能量归一化: E[|I|^2 + |Q|^2] = 1.0',
      '[00:00:07] 质量校验: SNR 阈值过滤完成，全部样本验证通过！',
    ];

    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < steps.length) {
        const line = steps[currentStep];
        setLogs(prev => [...prev, line]);
        currentStep++;
        setProgress(Math.round((currentStep / steps.length) * 100));
      } else {
        clearInterval(interval);
        setIsRunning(false);
        setIsFinished(true);
      }
    }, 400);
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col p-6 overflow-y-auto select-none">
      
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              STEP 2
            </span>
            <h1 className="text-lg font-bold text-slate-900">数据预处理与特征工程流水线</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            对采集的射频 IQ 原始数据进行去偏置、带通滤波、切片切帧、功率归一化，以满足 IQStudio 模型训练输入标准
          </p>
        </div>

        <button
          onClick={onCompletePreprocessing}
          className="flex items-center space-x-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition shadow-xs text-xs cursor-pointer"
        >
          <span>进入数据标注 (Step 3)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Main Grid: Left Config / Right Visual Comparison & Console */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Pipeline Modules (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="font-bold text-xs text-slate-800 flex items-center space-x-1.5">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span>流水线算子配置</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">已激活 4 个算子</span>
            </div>

            {/* Operator 1: DC Offset */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-semibold text-xs text-slate-800">1. I/Q 直流偏置去除 (DC Offset Removal)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">消除混频器本振泄漏 (LO Leakage) 造成的零频尖峰</div>
                </div>
                <input
                  type="checkbox"
                  checked={removeDCOffset}
                  onChange={(e) => setRemoveDCOffset(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0 w-4 h-4"
                />
              </label>
            </div>

            {/* Operator 2: Digital Filtering */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-xs text-slate-800">2. 数字带通滤波 (Bandpass Filter)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">衰减带外干扰及镜像杂散</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {[
                  { id: 'none', label: '直通 (无滤波)' },
                  { id: 'fir_lowpass', label: 'FIR 低通' },
                  { id: 'fir_bandpass', label: 'FIR 64阶带通' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setFilterType(opt.id as typeof filterType)}
                    className={`py-1 px-2 rounded border text-[11px] font-medium transition cursor-pointer ${
                      filterType === opt.id
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Operator 3: Slicing & Windowing */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="font-semibold text-xs text-slate-800">3. 定长切片与分帧 (IQ Slicing)</div>
              <div className="text-[11px] text-slate-500">将长序列基带切分为统一模型输入张量</div>
              <div className="flex items-center space-x-2">
                {(['1024', '2048', '4096'] as const).map(len => (
                  <button
                    key={len}
                    onClick={() => setSliceLength(len)}
                    className={`flex-1 py-1 text-center rounded border text-xs font-mono transition cursor-pointer ${
                      sliceLength === len
                        ? 'bg-blue-600 text-white border-blue-600 font-bold'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {len} 点
                  </button>
                ))}
              </div>
            </div>

            {/* Operator 4: Normalization */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-semibold text-xs text-slate-800">4. 单位功率归一化 (Unit Energy Normalization)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">确保不同接收距离与增益信号具有一致方差</div>
                </div>
                <input
                  type="checkbox"
                  checked={normalizePower}
                  onChange={(e) => setNormalizePower(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0 w-4 h-4"
                />
              </label>
            </div>

            {/* Operator 5: Data Augmentation */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-semibold text-xs text-slate-800">5. 射频信道仿真增强 (AWGN + 多径扰动)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">注入高斯白噪声与小范围频偏漂移模拟泛化</div>
                </div>
                <input
                  type="checkbox"
                  checked={addAugmentation}
                  onChange={(e) => setAddAugmentation(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0 w-4 h-4"
                />
              </label>
              {addAugmentation && (
                <div className="pt-2 border-t border-slate-200 text-xs">
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                    <span>信噪比扰动范围 (±dB): {snrJitter}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="0.5"
                    value={snrJitter}
                    onChange={(e) => setSnrJitter(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={handleRunPipeline}
              disabled={isRunning}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700 transition shadow-xs flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <Cpu className="w-4 h-4" />
              <span>{isRunning ? '正在处理中...' : '运行预处理流水线 (Batch Run)'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Visual Comparison & Execution Logs (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Comparison Dual Canvas */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <span className="font-bold text-xs text-slate-800">时域波形滤波与归一化效果对比</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Before */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                  <span>预处理前: 原始信号 (含直流偏置)</span>
                  <span className="text-red-500 font-mono">DC Offset = +0.18</span>
                </div>
                <div className="w-full h-32 bg-white rounded border border-slate-100 overflow-hidden">
                  <canvas ref={canvasBeforeRef} width={320} height={128} className="w-full h-full" />
                </div>
              </div>

              {/* After */}
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex justify-between text-[11px] font-semibold text-slate-600 mb-1">
                  <span>预处理后: 归一化 & 滤波输出</span>
                  <span className="text-emerald-600 font-mono">E = 1.000</span>
                </div>
                <div className="w-full h-32 bg-white rounded border border-slate-100 overflow-hidden">
                  <canvas ref={canvasAfterRef} width={320} height={128} className="w-full h-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Terminal Console Output */}
          <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 text-slate-300 font-mono text-xs flex flex-col h-72">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2 shrink-0">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-200 text-xs">流水线控制台执行日志</span>
              </div>
              {isRunning && (
                <span className="text-[10px] text-yellow-400 animate-pulse">PROCESSING {progress}%</span>
              )}
              {isFinished && (
                <span className="text-[10px] text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>SUCCESS 100%</span>
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 text-[11px] leading-relaxed text-slate-300">
              {logs.map((log, i) => (
                <div key={i} className="flex items-start space-x-1.5">
                  <span className="text-slate-600 shrink-0">&gt;</span>
                  <span className={log.includes('通过') || log.includes('完成') ? 'text-emerald-400' : 'text-slate-300'}>
                    {log}
                  </span>
                </div>
              ))}
            </div>

            {/* Quick Completion Footer */}
            {isFinished && (
              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
                <span className="text-slate-400">已处理 {datasetList.length} 条样本并生成切片缓存</span>
                <button
                  onClick={onCompletePreprocessing}
                  className="px-3 py-1 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-700 transition cursor-pointer text-xs"
                >
                  确认并进入标注界面 &rarr;
                </button>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
