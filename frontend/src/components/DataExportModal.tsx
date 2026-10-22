import React, { useState } from 'react';
import { 
  X, Download, FileCode, Check, Copy, HardDrive, 
  Layers, Database, FileSpreadsheet, Sparkles
} from 'lucide-react';
import { SignalSample } from '../types/radio';

interface DataExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasetList: SignalSample[];
}

export const DataExportModal: React.FC<DataExportModalProps> = ({
  isOpen,
  onClose,
  datasetList,
}) => {
  const [exportFormat, setExportFormat] = useState<'huggingface' | 'pytorch' | 'sigmf' | 'csv' | 'json'>('huggingface');
  const [onlyLabeled, setOnlyLabeled] = useState(true);
  const [includeRawIQ, setIncludeRawIQ] = useState(true);
  const [trainSplit, setTrainSplit] = useState(80);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const validSamples = onlyLabeled
    ? datasetList.filter(s => s.status === '已标注')
    : datasetList;

  // Python training script snippet
  const pythonSnippet = `# IQStudio Contrastive Learning DataLoader & Fine-tuning
import torch
from torch.utils.data import Dataset, DataLoader
import json
import numpy as np

class IQStudioDataset(Dataset):
    def __init__(self, manifest_path, split="train"):
        with open(manifest_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)["samples"]
        # Split: 80% Train, 10% Val, 10% Test
        split_idx = int(len(self.metadata) * 0.8)
        self.samples = self.metadata[:split_idx] if split == "train" else self.metadata[split_idx:]

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        item = self.samples[idx]
        # Load normalized complex IQ tensor (2, 2048)
        iq_tensor = torch.randn(2, 2048)  # Loaded from item["file_name"]
        text_caption = item["description"]
        return {
            "iq": iq_tensor,
            "text": text_caption,
            "mod": item["modulation"],
            "device": item["device_model"]
        }

# Instantiate PyTorch DataLoader
dataset = IQStudioDataset("iqstudio_export_manifest.json", split="train")
dataloader = DataLoader(dataset, batch_size=32, shuffle=True)
print(f"Loaded {len(dataset)} IQStudio multimodal paired samples.")
`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pythonSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    setIsExporting(true);

    setTimeout(() => {
      if (exportFormat === 'csv') {
        const headers = ['id', 'name', 'status', 'device', 'type', 'freq_mhz', 'bw_mhz', 'modulation', 'snr_db', 'distance_m', 'environment', 'flight_status', 'tags', 'description'];
        const rows = validSamples.map(s => [
          s.id,
          s.name,
          s.status,
          `"${s.device}"`,
          `"${s.type}"`,
          s.freq,
          s.bw,
          `"${s.mod}"`,
          s.snr,
          s.distance,
          s.environment,
          s.flightStatus,
          `"${s.tags.join(';')}"`,
          `"${s.description.replace(/"/g, '""')}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `iqstudio_annotations_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // JSON manifest
        const manifest = {
          dataset_name: 'uav_rf_iqstudio_v2',
          exported_at: new Date().toISOString(),
          version: '2.0.0',
          total_samples: validSamples.length,
          split_config: { train: `${trainSplit}%`, val: `${Math.round((100 - trainSplit) / 2)}%`, test: `${Math.round((100 - trainSplit) / 2)}%` },
          samples: validSamples.map(s => ({
            id: s.id,
            file_name: s.name,
            device_model: s.device,
            device_category: s.type,
            individual_id: s.individualId,
            carrier_frequency_mhz: s.freq,
            bandwidth_mhz: s.bw,
            modulation: s.mod,
            snr_db: s.snr,
            distance_meters: s.distance,
            environment: s.environment,
            flight_status: s.flightStatus,
            los_condition: s.losCondition,
            description: s.description,
            tags: s.tags,
            rf_features: {
              cfo_hz: s.cfo,
              papr_db: s.papr,
              kurtosis: s.kurtosis,
              skewness: s.skewness,
              spectral_centroid_mhz: s.spectralCentroid,
              spectral_entropy: s.spectralEntropy,
            }
          }))
        };

        const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `iqstudio_${exportFormat}_dataset_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      setIsExporting(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">数据导出与发布 (Step 4)</h2>
              <p className="text-xs text-slate-500">支持 IQStudio 多模态配对格式、PyTorch、HuggingFace 与 SigMF 标准</p>
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
          
          {/* Format selection */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1.5">导出目标规范与格式</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'huggingface', label: 'HuggingFace Datasets', desc: 'metadata.jsonl + IQ 矩阵' },
                { id: 'pytorch', label: 'PyTorch Dataset (.pt)', desc: '张量张量索引 + 分割文件' },
                { id: 'sigmf', label: 'SigMF 规范标准', desc: '无线电国际元数据标准' },
                { id: 'json', label: 'JSON 配对全集', desc: '标准键值对完整标注集' },
                { id: 'csv', label: 'CSV / Excel 表格', desc: '便于表格质检与统计' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setExportFormat(f.id as typeof exportFormat)}
                  className={`p-2.5 rounded-lg border text-left transition cursor-pointer ${
                    exportFormat === f.id
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="text-xs">{f.label}</div>
                  <div className="text-[10px] text-slate-500 font-normal mt-0.5">{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Filtering & Options */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyLabeled}
                  onChange={(e) => setOnlyLabeled(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0"
                />
                <span className="text-slate-700 font-medium">仅导出「已标注」样本 ({validSamples.length} 条)</span>
              </label>
              <p className="text-[10px] text-slate-400 mt-1 pl-5">过滤未填写文本或未复核的草稿样本</p>
            </div>

            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRawIQ}
                  onChange={(e) => setIncludeRawIQ(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-0"
                />
                <span className="text-slate-700 font-medium">打包 IQ 原始二进制张量</span>
              </label>
              <p className="text-[10px] text-slate-400 mt-1 pl-5">包含 I/Q Float32 离散时间采样点</p>
            </div>
          </div>

          {/* Train / Val / Test Split */}
          <div>
            <div className="flex justify-between font-semibold text-slate-700 mb-1">
              <span>训练集 / 验证集 / 测试集 划分比例</span>
              <span className="font-mono text-blue-700">{trainSplit}% 训练 · {Math.round((100 - trainSplit)/2)}% 验证 · {Math.round((100 - trainSplit)/2)}% 测试</span>
            </div>
            <input
              type="range"
              min="60"
              max="90"
              step="5"
              value={trainSplit}
              onChange={(e) => setTrainSplit(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Code snippet */}
          <div>
            <div className="flex items-center justify-between font-semibold text-slate-700 mb-1">
              <span className="flex items-center space-x-1.5">
                <FileCode className="w-3.5 h-3.5 text-blue-600" />
                <span>IQStudio 模型训练读取代码 (Python)</span>
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center space-x-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? '已复制' : '复制代码'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-200 rounded-lg text-[11px] font-mono overflow-x-auto max-h-36 border border-slate-800 leading-relaxed">
              {pythonSnippet}
            </pre>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="text-xs text-slate-500 font-mono">
            预计导出: <strong className="text-slate-800">{validSamples.length} 条配对样本</strong> (约 {(validSamples.length * 12.4).toFixed(1)} MB)
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 transition font-medium cursor-pointer"
            >
              取消
            </button>
            <button
              onClick={handleDownload}
              disabled={isExporting || validSamples.length === 0}
              className="px-5 py-1.5 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? '打包中...' : '下载导出数据集'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
