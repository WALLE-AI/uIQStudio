import React, { useState, useEffect } from 'react';
import { 
  Sparkles, FileText, Check, Plus, Trash2, Save, Download,
  Layers, Tag as TagIcon, Radio, Compass, Clock, CheckCircle2,
  PanelRightClose, PanelRightOpen, Sliders, Info, ShieldCheck
} from 'lucide-react';
import { SignalSample, SignalCategory, ModulationType } from '../types/radio';
import { PRESET_TAG_CATEGORIES, ALL_PRESET_TAGS } from '../data/mockSignals';

interface AnnotationPanelProps {
  currentFile: SignalSample;
  onUpdateSample: (updated: Partial<SignalSample>) => void;
  onSaveAndNext: () => void;
  onPrev: () => void;
  canPrev: boolean;
  onOpenBatchModal: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const AnnotationPanel: React.FC<AnnotationPanelProps> = ({
  currentFile,
  onUpdateSample,
  onSaveAndNext,
  onPrev,
  canPrev,
  onOpenBatchModal,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [annoTab, setAnnoTab] = useState<'text' | 'tag' | 'param' | 'info'>('text');

  // Local form state
  const [description, setDescription] = useState(currentFile.description);
  const [deviceType, setDeviceType] = useState<SignalCategory>(currentFile.type);
  const [deviceModel, setDeviceModel] = useState(currentFile.device);
  const [individualId, setIndividualId] = useState(currentFile.individualId);
  const [freq, setFreq] = useState(currentFile.freq.toString());
  const [bandwidth, setBandwidth] = useState(currentFile.bw.toString());
  const [modulation, setModulation] = useState<ModulationType>(currentFile.mod);

  // Scene State
  const [environment, setEnvironment] = useState(currentFile.environment);
  const [distance, setDistance] = useState(currentFile.distance.toString());
  const [flightStatus, setFlightStatus] = useState(currentFile.flightStatus);
  const [snr, setSnr] = useState(currentFile.snr.toString());
  const [sceneDesc, setSceneDesc] = useState(currentFile.sceneDesc);
  const [losCondition, setLosCondition] = useState(currentFile.losCondition);
  const [antenna, setAntenna] = useState(currentFile.antenna);

  // Tags State
  const [selectedTags, setSelectedTags] = useState<string[]>(currentFile.tags || []);
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiTemplate, setAiTemplate] = useState<'standard' | 'fingerprint' | 'retrieval'>('standard');
  const [showSavedToast, setShowSavedToast] = useState(false);

  // Sync state when file changes
  useEffect(() => {
    setDescription(currentFile.description);
    setDeviceType(currentFile.type);
    setDeviceModel(currentFile.device);
    setIndividualId(currentFile.individualId);
    setFreq(currentFile.freq.toString());
    setBandwidth(currentFile.bw.toString());
    setModulation(currentFile.mod);
    setEnvironment(currentFile.environment);
    setDistance(currentFile.distance.toString());
    setFlightStatus(currentFile.flightStatus);
    setSnr(currentFile.snr.toString());
    setSceneDesc(currentFile.sceneDesc);
    setLosCondition(currentFile.losCondition);
    setAntenna(currentFile.antenna);
    setSelectedTags(currentFile.tags || []);
  }, [currentFile.id]);

  // Handle Save
  const handleSave = () => {
    onUpdateSample({
      description,
      type: deviceType,
      device: deviceModel,
      individualId,
      freq: parseFloat(freq) || currentFile.freq,
      bw: parseFloat(bandwidth) || currentFile.bw,
      mod: modulation,
      environment,
      distance: parseFloat(distance) || currentFile.distance,
      flightStatus,
      snr: parseFloat(snr) || currentFile.snr,
      sceneDesc,
      losCondition,
      antenna,
      tags: selectedTags,
      status: '已标注',
      updatedAt: new Date().toLocaleTimeString(),
    });

    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
    onSaveAndNext();
  };

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
      setCustomTagInput('');
      setShowCustomTagInput(false);
    }
  };

  const handleAiGenerate = () => {
    setIsGeneratingAI(true);
    setTimeout(() => {
      let generatedText = '';
      if (aiTemplate === 'standard') {
        generatedText = `[IQStudio Ground Truth Caption]\nThis is a calibrated RF transmission from ${deviceModel} (${deviceType}).\nCarrier Frequency: ${freq} MHz | Channel Bandwidth: ${bandwidth} MHz | Modulation: ${modulation}.\nOperation state is ${flightStatus} in an ${environment} setting at ${distance}m distance (${losCondition}).\nSNR measured at ${snr} dB. Spectrum envelope exhibits distinct cyclic prefix headers, pilot subcarriers, and clean baseband correlation traits.`;
      } else if (aiTemplate === 'fingerprint') {
        generatedText = `[Specific Emitter Hardware Fingerprint]\nDevice Identifier: ${individualId} (${deviceModel})\nCarrier Offset: ${currentFile.cfo} Hz | PAPR: ${currentFile.papr} dB | Kurtosis: ${currentFile.kurtosis.toFixed(2)}.\nPower amplifier transient demonstrates characteristic rise-time overshoot (~3.2 µs) and reproducible local oscillator phase drift. Suitable for SEI classification benchmark.`;
      } else {
        generatedText = `${deviceModel} ${deviceType} signal operating at ${freq} MHz with ${bandwidth} MHz ${modulation} modulation, distance ${distance}m in ${environment} scenario, flight state ${flightStatus}.`;
      }

      setDescription(generatedText);
      setIsGeneratingAI(false);
    }, 600);
  };

  // Export single sample annotation JSON
  const handleExportJSON = () => {
    const exportData = {
      sample_id: currentFile.id,
      file_name: currentFile.name,
      device_model: deviceModel,
      device_category: deviceType,
      individual_id: individualId,
      carrier_frequency_mhz: parseFloat(freq),
      bandwidth_mhz: parseFloat(bandwidth),
      modulation: modulation,
      environment,
      distance_meters: parseFloat(distance),
      flight_status: flightStatus,
      snr_db: parseFloat(snr),
      los_condition: losCondition,
      antenna_spec: antenna,
      description,
      tags: selectedTags,
      rf_features: {
        cfo_hz: currentFile.cfo,
        papr_db: currentFile.papr,
        kurtosis: currentFile.kurtosis,
        skewness: currentFile.skewness,
        spectral_centroid_mhz: currentFile.spectralCentroid,
        spectral_entropy: currentFile.spectralEntropy,
      },
      annotator: 'engineer_radio_01',
      exported_at: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentFile.name.replace(/\.[^/.]+$/, '')}_annotation.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // If collapsed: slim right icon strip
  if (isCollapsed) {
    return (
      <aside className="w-12 bg-white border-l border-slate-200 flex flex-col items-center py-3 select-none shrink-0 justify-between">
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
            title="展开标注面板"
          >
            <PanelRightOpen className="w-4 h-4" />
          </button>

          <button
            onClick={() => { onToggleCollapse?.(); setAnnoTab('text'); }}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
            title="文本标注"
          >
            <FileText className="w-4 h-4" />
          </button>

          <button
            onClick={() => { onToggleCollapse?.(); setAnnoTab('tag'); }}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
            title="标签体系"
          >
            <TagIcon className="w-4 h-4" />
          </button>

          <button
            onClick={() => { onToggleCollapse?.(); setAnnoTab('param'); }}
            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
            title="物理参数"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <div className="w-6 h-[1px] bg-slate-200" />

          <div 
            onClick={onToggleCollapse}
            className="text-[11px] font-mono font-bold text-slate-500 rotate-90 whitespace-nowrap cursor-pointer tracking-wider hover:text-blue-600 transition mt-6"
          >
            标注表单
          </div>
        </div>

        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={handleSave}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-xs cursor-pointer"
            title="快速保存当前标注"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  // Expanded View: comfortable width w-80 (320px)
  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden select-none transition-all duration-200">
      
      {/* 1. Header Tabs with Collapse Button */}
      <div className="border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0 pr-2">
        <div className="flex text-xs font-semibold flex-1">
          {[
            { id: 'text', label: '文本' },
            { id: 'tag', label: '标签' },
            { id: 'param', label: '参数' },
            { id: 'info', label: '场景' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAnnoTab(tab.id as typeof annoTab)}
              className={`flex-1 py-2.5 text-center border-b-2 transition cursor-pointer text-xs ${
                annoTab === tab.id
                  ? 'border-blue-600 bg-white text-blue-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded transition cursor-pointer shrink-0 ml-1"
            title="收起右侧栏，全幅显示时频图"
          >
            <PanelRightClose className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. Scrollable Form Content */}
      <div className="p-3.5 space-y-3.5 flex-1 text-xs overflow-y-auto">
        
        {/* TAB 1: TEXT ANNOTATION */}
        {annoTab === 'text' && (
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-800 text-[11px]">
                  描述 (Caption) <span className="text-red-500">*</span>
                </span>
                
                {/* AI Generation Menu */}
                <div className="flex items-center space-x-1">
                  <select
                    value={aiTemplate}
                    onChange={(e) => setAiTemplate(e.target.value as typeof aiTemplate)}
                    className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[10px] text-slate-600 outline-none"
                  >
                    <option value="standard">标准叙述</option>
                    <option value="fingerprint">个体指纹</option>
                    <option value="retrieval">简明Prompt</option>
                  </select>
                  <button
                    onClick={handleAiGenerate}
                    disabled={isGeneratingAI}
                    className="flex items-center space-x-0.5 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 transition font-medium cursor-pointer text-[10px]"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>{isGeneratingAI ? '生成中' : 'AI生成'}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans text-xs resize-y"
                  placeholder="输入射频信号的时频特征、物理层特征与场景描述..."
                />
                <span className="absolute right-2 bottom-1.5 text-[9px] font-mono text-slate-400">
                  {description.length}/2000
                </span>
              </div>
            </div>

            {/* Quick Annotation Snippets */}
            <div>
              <div className="text-[10px] font-semibold text-slate-500 mb-1">快捷短语插入</div>
              <div className="flex flex-wrap gap-1">
                {[
                  '包络平稳',
                  '典型OFDM循环前缀',
                  '存在近地多径',
                  '瞬态上升沿显著',
                  '导频信标稳定',
                  '无明显杂散',
                  '频偏漂移微弱',
                ].map((phrase, i) => (
                  <button
                    key={i}
                    onClick={() => setDescription(prev => prev ? `${prev} ${phrase}。` : `${phrase}。`)}
                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] transition cursor-pointer"
                  >
                    +{phrase}
                  </button>
                ))}
              </div>
            </div>

            {/* Metadata Summary Tile */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800 text-xs">当前配对概要</div>
              <div className="flex justify-between">
                <span>设备:</span>
                <span className="font-medium text-slate-900">{deviceModel}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>载频/带宽:</span>
                <span className="text-slate-900">{freq}MHz / {bandwidth}MHz</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>调制方案:</span>
                <span className="text-slate-900">{modulation}</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TAG SYSTEM ANNOTATION */}
        {annoTab === 'tag' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-[11px]">已选标签 ({selectedTags.length})</span>
              <button
                onClick={() => setSelectedTags([])}
                className="text-[10px] text-slate-400 hover:text-red-600 cursor-pointer"
              >
                清空全部
              </button>
            </div>

            {/* Selected Tags Ribbon */}
            <div className="flex flex-wrap gap-1 p-2 bg-slate-50 rounded-lg border border-slate-200 min-h-[32px]">
              {selectedTags.length === 0 ? (
                <span className="text-[10px] text-slate-400">点击下方标签库添加</span>
              ) : (
                selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-600 text-white font-medium shadow-xs"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => handleTagToggle(tag)}
                      className="hover:text-red-200 cursor-pointer text-xs leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>

            {/* Categorized Tag Chips */}
            <div className="space-y-2.5">
              {Object.entries(PRESET_TAG_CATEGORIES).map(([catName, tagList]) => (
                <div key={catName}>
                  <div className="text-[10px] font-bold text-slate-600 mb-1 flex items-center space-x-1">
                    <TagIcon className="w-2.5 h-2.5 text-blue-600" />
                    <span>{catName}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tagList.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition flex items-center space-x-0.5 cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          <span>{tag}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Tag Input */}
            <div className="pt-2 border-t border-slate-200">
              {showCustomTagInput ? (
                <div className="flex items-center space-x-1.5">
                  <input
                    type="text"
                    autoFocus
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                    placeholder="输入标签名..."
                    className="flex-1 px-2 py-1 border border-blue-400 rounded text-[11px] outline-none"
                  />
                  <button
                    onClick={handleAddCustomTag}
                    className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-medium cursor-pointer"
                  >
                    添加
                  </button>
                  <button
                    onClick={() => setShowCustomTagInput(false)}
                    className="px-1.5 py-1 bg-slate-200 text-slate-700 rounded text-[10px] cursor-pointer"
                  >
                    取消
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowCustomTagInput(true)}
                  className="w-full py-1 rounded text-[11px] border border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 transition flex items-center justify-center space-x-1 cursor-pointer font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>新建自定义标签</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PHYSICAL PARAMETERS */}
        {annoTab === 'param' && (
          <div className="space-y-3">
            <div className="font-bold text-slate-800 text-[11px]">
              发射机与物理层参数
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-slate-500 mb-0.5 text-[10px]">设备大类</label>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value as SignalCategory)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 text-xs"
                >
                  <option value="无人机 (UAV)">无人机 (UAV)</option>
                  <option value="民航客机">民航客机</option>
                  <option value="Wi-Fi设备">Wi-Fi设备</option>
                  <option value="LoRa终端">LoRa终端</option>
                  <option value="SDR信号源">SDR信号源</option>
                  <option value="5G基站">5G基站</option>
                  <option value="雷达">雷达</option>
                  <option value="蓝牙设备">蓝牙设备</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-0.5 text-[10px]">设备型号</label>
                  <input
                    type="text"
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-0.5 text-[10px]">个体ID (SEI)</label>
                  <input
                    type="text"
                    value={individualId}
                    onChange={(e) => setIndividualId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-mono text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 mb-0.5 text-[10px]">中心频点 (MHz)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={freq}
                    onChange={(e) => setFreq(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-0.5 text-[10px]">射频带宽 (MHz)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bandwidth}
                    onChange={(e) => setBandwidth(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-0.5 text-[10px]">调制体制</label>
                <select
                  value={modulation}
                  onChange={(e) => setModulation(e.target.value as ModulationType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-mono text-xs"
                >
                  <option value="OFDM (Wi-Fi)">OFDM (Wi-Fi 802.11)</option>
                  <option value="OcuSync 3.0">OcuSync 3.0 (DJI图传)</option>
                  <option value="PPM">PPM (脉冲位置调制)</option>
                  <option value="CSS">CSS (扩频调制 LoRa)</option>
                  <option value="FSK">FSK (频移键控)</option>
                  <option value="GFSK">GFSK (高斯频移键控)</option>
                  <option value="QPSK">QPSK (正交相移键控)</option>
                  <option value="16-QAM">16-QAM (16阶QAM)</option>
                  <option value="FMCW">FMCW (调频连续波雷达)</option>
                </select>
              </div>

              <div className="p-2 bg-slate-50 rounded border border-slate-200 space-y-1 text-[10px] font-mono text-slate-600">
                <div className="flex justify-between">
                  <span>采样率: {currentFile.sampleRate} MSps</span>
                  <span>点数: {currentFile.sampleLength}</span>
                </div>
                <div className="flex justify-between">
                  <span>CFO: {currentFile.cfo} Hz</span>
                  <span>PAPR: {currentFile.papr} dB</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SCENE & CHANNEL INFO */}
        {annoTab === 'info' && (
          <div className="space-y-3">
            <div className="font-bold text-slate-800 text-[11px]">
              采集场景与无线信道
            </div>

            {/* Environment Radio */}
            <div>
              <span className="block text-slate-500 mb-1 text-[10px]">场景环境分类</span>
              <div className="flex items-center gap-2">
                {(['室内', '室外', '城市', '郊区', '野外'] as const).map((env) => (
                  <label key={env} className="flex items-center space-x-1 cursor-pointer text-[11px]">
                    <input
                      type="radio"
                      name="envSelection"
                      checked={environment === env}
                      onChange={() => setEnvironment(env)}
                      className="text-blue-600"
                    />
                    <span className="text-slate-700">{env}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-500 mb-0.5 text-[10px]">传输距离 (米)</label>
                <input
                  type="number"
                  value={distance}
                  onChange={(e) => setDistance(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-0.5 text-[10px]">信噪比 SNR (dB)</label>
                <input
                  type="number"
                  step="0.1"
                  value={snr}
                  onChange={(e) => setSnr(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-500 mb-0.5 text-[10px]">目标运动状态</label>
                <select
                  value={flightStatus}
                  onChange={(e) => setFlightStatus(e.target.value as SignalSample['flightStatus'])}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 text-xs"
                >
                  <option value="悬停">悬停</option>
                  <option value="巡航">巡航</option>
                  <option value="起飞/降落">起飞/降落</option>
                  <option value="固定">固定</option>
                  <option value="高速机动">高速机动</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-0.5 text-[10px]">视距条件</label>
                <select
                  value={losCondition}
                  onChange={(e) => setLosCondition(e.target.value as SignalSample['losCondition'])}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 text-xs"
                >
                  <option value="LOS (视距)">LOS (视距)</option>
                  <option value="NLOS (非视距)">NLOS (非视距)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-500 mb-0.5 text-[10px]">天线极化与类型</label>
              <input
                type="text"
                value={antenna}
                onChange={(e) => setAntenna(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-500 mb-0.5 text-[10px]">场景细节描述</label>
              <textarea
                rows={2}
                value={sceneDesc}
                onChange={(e) => setSceneDesc(e.target.value)}
                className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-700 text-xs"
                placeholder="晴天无风，草地，天线高1.5米..."
              />
            </div>
          </div>
        )}

      </div>

      {/* 3. Bottom Action Footer */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              setDescription('');
              setSelectedTags([]);
            }}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-slate-200 rounded transition cursor-pointer"
            title="清空当前表单"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleExportJSON}
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-200 rounded transition cursor-pointer"
            title="导出当前样本JSON"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={onPrev}
            disabled={!canPrev}
            className="px-2 py-1 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-40 font-medium transition cursor-pointer text-xs"
          >
            上一条
          </button>
          
          <button
            onClick={handleSave}
            className="px-3 py-1 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition shadow-xs flex items-center space-x-1 cursor-pointer text-xs"
          >
            <Save className="w-3 h-3" />
            <span>保存并下一条</span>
          </button>
        </div>
      </div>

      {/* Saved Toast Notification */}
      {showSavedToast && (
        <div className="absolute bottom-14 right-6 bg-slate-900 text-white px-3 py-1.5 rounded-lg shadow-lg text-xs flex items-center space-x-1.5 z-50 animate-bounce">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>已保存！</span>
        </div>
      )}

    </aside>
  );
};
