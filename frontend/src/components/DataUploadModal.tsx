import React, { useState } from 'react';
import { 
  X, Upload, FileUp, CheckCircle, AlertCircle, HardDrive, 
  Settings2, Sparkles, Plus, Trash2
} from 'lucide-react';
import { SignalSample } from '../types/radio';

interface DataUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSamples: (newSamples: SignalSample[]) => void;
}

export const DataUploadModal: React.FC<DataUploadModalProps> = ({
  isOpen,
  onClose,
  onAddSamples,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<'uav' | 'radar' | 'iot'>('uav');
  const [defaultSampleRate, setDefaultSampleRate] = useState('10.0');
  const [defaultFreq, setDefaultFreq] = useState('2437');
  const [uploadFiles, setUploadFiles] = useState<Array<{ name: string; size: string; type: string }>>([
    { name: 'drone_dji_fpv_001.npy', size: '12.4 MB', type: 'NumPy Array' },
    { name: 'drone_dji_fpv_002.npy', size: '12.4 MB', type: 'NumPy Array' },
    { name: 'adsb_airbus_a350_01.sigmf-data', size: '8.2 MB', type: 'SigMF Archive' },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).map(f => ({
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
        type: f.name.endsWith('.npy') ? 'NumPy Array' : f.name.endsWith('.sigmf') ? 'SigMF' : 'Binary IQ'
      }));
      setUploadFiles(prev => [...prev, ...files]);
    }
  };

  const handleStartUpload = () => {
    setIsUploading(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 20;
      setUploadProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          // Construct new SignalSample items
          const newSamples: SignalSample[] = uploadFiles.map((file, idx) => {
            const isDrone = file.name.includes('drone');
            const isAdsb = file.name.includes('adsb');
            return {
              id: `upload_${Date.now()}_${idx}`,
              name: file.name,
              status: '待标注',
              device: isDrone ? 'DJI FPV Drone' : isAdsb ? 'ADS-B Transponder' : 'SDR Transmitter',
              type: isDrone ? '无人机 (UAV)' : isAdsb ? '民航客机' : 'SDR信号源',
              freq: parseFloat(defaultFreq) || 2437,
              bw: isDrone ? 20 : isAdsb ? 2 : 10,
              mod: isDrone ? 'OFDM (Wi-Fi)' : isAdsb ? 'PPM' : 'FSK',
              snr: 22.0,
              dist: 100,
              sampleRate: parseFloat(defaultSampleRate) || 10.0,
              sampleLength: 2048000,
              duration: 0.205,
              fileSize: file.size,
              format: '.npy',
              individualId: `fpv_${idx + 1}`,
              description: `Batch imported sample ${file.name}. Preliminary IQ signal waiting for comprehensive annotation.`,
              tags: isDrone ? ['无人机', 'DJI', '2.4GHz', 'OFDM', '新增上传'] : ['民航客机', 'ADS-B', '新增上传'],
              environment: '室外',
              distance: 100,
              flightStatus: '巡航',
              sceneDesc: '新导入样本，待详细补充',
              antenna: '全向天线',
              losCondition: 'LOS (视距)',
              cfo: 45.0,
              papr: 8.5,
              kurtosis: 3.1,
              skewness: 0.05,
              spectralCentroid: parseFloat(defaultFreq) || 2437,
              spectralEntropy: 0.82,
              profileType: isDrone ? 'ofdm' : isAdsb ? 'pulse' : 'fsk',
              updatedAt: new Date().toLocaleTimeString(),
            };
          });

          onAddSamples(newSamples);
          setIsUploading(false);
          onClose();
        }, 400);
      }
    }, 120);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">数据上传与解析 (Step 1)</h2>
              <p className="text-xs text-slate-500">支持 .npy、.sigmf、.mat、.bin 格式 IQ 基带采样数据</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs">
          
          {/* Preset Selection Strip */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">预设射频场景模版</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'uav', title: '无人机图传/遥控', desc: '2.4G/5.8GHz OFDM · 20MHz' },
                { id: 'radar', title: '民航与雷达', desc: '1090MHz PPM · X波段 FMCW' },
                { id: 'iot', title: '物联网无线电', desc: '433MHz LoRa CSS · 915M FSK' },
              ].map(preset => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset.id as typeof selectedPreset)}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                    selectedPreset === preset.id
                      ? 'border-blue-600 bg-blue-50/70 text-blue-900 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="font-semibold text-xs">{preset.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center transition ${
              dragActive ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
            }`}
          >
            <FileUp className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <div className="font-semibold text-slate-800 text-xs">拖拽 IQ 数据文件到此处，或点击浏览本地文件</div>
            <p className="text-[11px] text-slate-400 mt-1">
              支持 NumPy 矩阵 (.npy, 复数 complex64/complex128) 与 SigMF 规范数据集
            </p>
            <button 
              onClick={() => {
                const sampleName = `signal_rec_${Date.now().toString().slice(-4)}.npy`;
                setUploadFiles(prev => [...prev, { name: sampleName, size: '12.4 MB', type: 'NumPy Array' }]);
              }}
              className="mt-3 px-3 py-1 bg-white border border-slate-300 rounded text-slate-700 font-medium hover:bg-slate-50 transition shadow-xs cursor-pointer inline-flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>模拟选择本地样本</span>
            </button>
          </div>

          {/* Acquisition Parameters Config */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label className="block text-slate-500 mb-1 text-[11px]">默认采样率 (MSps)</label>
              <input
                type="number"
                value={defaultSampleRate}
                onChange={(e) => setDefaultSampleRate(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-700 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-500 mb-1 text-[11px]">预估中心频点 (MHz)</label>
              <input
                type="number"
                value={defaultFreq}
                onChange={(e) => setDefaultFreq(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded px-2.5 py-1 text-slate-700 font-mono text-xs"
              />
            </div>
          </div>

          {/* File Queue List */}
          <div>
            <div className="flex items-center justify-between font-semibold text-slate-700 mb-1.5">
              <span>待上传队列 ({uploadFiles.length})</span>
              <button 
                onClick={() => setUploadFiles([])}
                className="text-[11px] text-slate-400 hover:text-red-600 cursor-pointer"
              >
                清空队列
              </button>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2 bg-slate-50">
              {uploadFiles.map((file, i) => (
                <div key={i} className="flex items-center justify-between p-1.5 bg-white rounded border border-slate-200 text-xs">
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <HardDrive className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="font-mono text-[11px] truncate">{file.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({file.size})</span>
                  </div>
                  <button
                    onClick={() => setUploadFiles(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-red-500 cursor-pointer p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Progress Bar when uploading */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-600 font-mono">
                <span>正在校验文件校验和与抽取IQ样本...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-600 h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }} />
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 transition font-medium cursor-pointer"
          >
            取消
          </button>
          
          <button
            onClick={handleStartUpload}
            disabled={isUploading || uploadFiles.length === 0}
            className="px-5 py-1.5 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition shadow-xs disabled:opacity-50 flex items-center space-x-1.5 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isUploading ? '正在导入...' : '开始导入数据集'}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
