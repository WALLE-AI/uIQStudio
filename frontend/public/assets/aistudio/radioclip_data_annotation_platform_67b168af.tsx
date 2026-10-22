import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, Settings, BookOpen, User, Upload, Search, Filter, 
  ChevronLeft, ChevronRight, Play, Pause, Maximize2, RotateCcw, 
  Sparkles, FileText, Check, Plus, Trash2, ArrowLeft, Save, Layers,
  BarChart2, Cpu, Database, Tag, Sliders, Info, HardDrive, CheckCircle2, Clock
} from 'lucide-react';

// --- MOCK DATA ---
const INITIAL_DATASET = [
  { id: '1', name: 'drone_001_00001.npy', status: '待标注', device: 'DJI Mavic 3', type: '无人机 (UAV)', freq: 2437, bw: 20, mod: 'OFDM (Wi-Fi)', snr: 20, dist: 100 },
  { id: '2', name: 'drone_001_00002.npy', status: '待标注', device: 'DJI Mavic 3', type: '无人机 (UAV)', freq: 2437, bw: 20, mod: 'OFDM (Wi-Fi)', snr: 18, dist: 120 },
  { id: '3', name: 'drone_002_00001.npy', status: '已标注', device: 'DJI Air 2S', type: '无人机 (UAV)', freq: 5745, bw: 40, mod: 'OcuSync 3.0', snr: 25, dist: 80 },
  { id: '4', name: 'drone_002_00002.npy', status: '待标注', device: 'DJI Air 2S', type: '无人机 (UAV)', freq: 5745, bw: 40, mod: 'OcuSync 3.0', snr: 22, dist: 90 },
  { id: '5', name: 'aircraft_001_00001.npy', status: '待标注', device: 'ADS-B Transponder', type: '民航客机', freq: 1090, bw: 2, mod: 'PPM', snr: 15, dist: 5000 },
  { id: '6', name: 'aircraft_001_00002.npy', status: '待标注', device: 'ADS-B Transponder', type: '民航客机', freq: 1090, bw: 2, mod: 'PPM', snr: 14, dist: 5200 },
  { id: '7', name: 'wifi_001_00001.npy', status: '待标注', device: 'TP-Link Router', type: 'Wi-Fi设备', freq: 2412, bw: 20, mod: 'OFDM', snr: 30, dist: 15 },
  { id: '8', name: 'wifi_001_00002.npy', status: '待标注', device: 'TP-Link Router', type: 'Wi-Fi设备', freq: 2412, bw: 20, mod: 'OFDM', snr: 28, dist: 18 },
  { id: '9', name: 'lora_001_00001.npy', status: '待标注', device: 'SX1276 Node', type: 'LoRa终端', freq: 433, bw: 0.125, mod: 'CSS', snr: 10, dist: 800 },
  { id: '10', name: 'sdr_001_00001.npy', status: '待标注', device: 'HackRF One', type: 'SDR信号源', freq: 915, bw: 10, mod: 'FSK', snr: 12, dist: 50 },
];

const PRESET_TAGS = [
  '无人机', 'DJI', 'Wi-Fi', 'LoRa', '蓝牙', '航拍',
  '视频传输', '2.4GHz', 'OFDM', '室外', '悬停', '低空',
  '同型号', '个体指纹', '天线特征', '瞬态', '频偏'
];

export default function App() {
  // Navigation & Step state
  const [activeStep, setActiveStep] = useState(3);
  const [activeNav, setActiveNav] = useState('数据标注');

  // File list & search state
  const [datasetList, setDatasetList] = useState(INITIAL_DATASET);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileId, setSelectedFileId] = useState('1');
  const [checkedFiles, setCheckedFiles] = useState({});

  // Visualization Tab & Controls state
  const [vizTab, setVizTab] = useState('STFT'); // 'IQ', 'STFT', 'FFT', 'Wigner', 'Feature'
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [fftSize, setFftSize] = useState('1024');
  const [windowType, setWindowType] = useState('Hann');
  const [stepLength, setStepLength] = useState('256');
  const [colorMap, setColorMap] = useState('viridis');
  const [dynamicRange, setDynamicRange] = useState('120');

  // Annotation Panel state
  const [annoTab, setAnnoTab] = useState('text'); // 'text', 'tag', 'param', 'info'
  const [description, setDescription] = useState(
    'This is a DJI Mavic 3 drone signal. The signal is transmitted at 2.437 GHz with 20 MHz bandwidth. The waveform shows a stable carrier with clear RF transient characteristics, including unique oscillator drift and hardware fingerprints. The signal contains typical Wi-Fi OFDM structure from the drone\'s video transmission module.'
  );
  const [deviceType, setDeviceType] = useState('无人机 (UAV)');
  const [deviceModel, setDeviceModel] = useState('DJI Mavic 3');
  const [individualId, setIndividualId] = useState('drone_001');
  const [freq, setFreq] = useState('2437');
  const [bandwidth, setBandwidth] = useState('20');
  const [modulation, setModulation] = useState('OFDM (Wi-Fi)');
  
  // Scene info
  const [environment, setEnvironment] = useState('室外');
  const [distance, setDistance] = useState('100');
  const [flightStatus, setFlightStatus] = useState('悬停');
  const [snr, setSnr] = useState('20');
  const [sceneDesc, setSceneDesc] = useState('晴天，低空悬停，无遮挡');

  // Tags state
  const [selectedTags, setSelectedTags] = useState([
    '无人机', 'DJI', 'Wi-Fi', '2.4GHz', 'OFDM', '室外', '悬停', '个体指纹', '瞬态'
  ]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [showCustomTagInput, setShowCustomTagInput] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // References for HTML Canvas rendering
  const iqCanvasRef = useRef(null);
  const fftCanvasRef = useRef(null);
  const stftCanvasRef = useRef(null);

  // Current selected file details
  const currentFile = datasetList.find(f => f.id === selectedFileId) || datasetList[0];
  const currentIndex = datasetList.findIndex(f => f.id === selectedFileId);

  // Synchronize dynamic updates when selected file changes
  useEffect(() => {
    if (currentFile) {
      setDeviceModel(currentFile.device);
      setDeviceType(currentFile.type);
      setFreq(currentFile.freq.toString());
      setBandwidth(currentFile.bw.toString());
      setModulation(currentFile.mod);
      setSnr(currentFile.snr.toString());
      setDistance(currentFile.dist.toString());
      setIndividualId(currentFile.name.split('_')[0] + '_' + currentFile.name.split('_')[1]);
    }
  }, [selectedFileId]);

  // Audio/Playback Animation simulation
  useEffect(() => {
    let interval = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlaybackProgress((prev) => {
          if (prev >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1.5;
        });
      }, 50);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Render Charts on Canvas
  useEffect(() => {
    // Render I/Q Signal
    if (iqCanvasRef.current) {
      const ctx = iqCanvasRef.current.getContext('2d');
      const width = iqCanvasRef.current.width;
      const height = iqCanvasRef.current.height;
      ctx.clearRect(0, 0, width, height);
      
      // Grid lines
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Center baseline
      ctx.strokeStyle = '#94a3b8';
      ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke();

      // Plot I Waveform (Blue)
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const t = x / 15;
        const amp = Math.sin(t) * Math.cos(t * 0.3) * (height / 3.2) * (0.8 + Math.random() * 0.2);
        const y = height / 2 + amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Plot Q Waveform (Orange/Red)
      ctx.strokeStyle = '#f97316';
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const t = x / 15 + Math.PI / 2;
        const amp = Math.sin(t) * Math.cos(t * 0.25) * (height / 3.5) * (0.8 + Math.random() * 0.2);
        const y = height / 2 + amp;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Render FFT Chart
    if (fftCanvasRef.current) {
      const ctx = fftCanvasRef.current.getContext('2d');
      const width = fftCanvasRef.current.width;
      const height = fftCanvasRef.current.height;
      ctx.clearRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.5;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (let y = 0; y < height; y += 25) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Waveform Spectrum Peak
      ctx.strokeStyle = '#0284c7';
      ctx.fillStyle = 'rgba(2, 132, 199, 0.15)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, height - 10);
      for (let x = 0; x < width; x++) {
        const distFromCenter = Math.abs(x - width / 2);
        let val = Math.exp(-Math.pow(distFromCenter / 35, 2)) * (height - 30);
        val += (Math.random() * 15 - 7);
        const y = Math.max(10, height - 15 - val);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height - 10);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Render STFT Spectrogram Heatmap
    if (stftCanvasRef.current) {
      const ctx = stftCanvasRef.current.getContext('2d');
      const width = stftCanvasRef.current.width;
      const height = stftCanvasRef.current.height;
      
      const imgData = ctx.createImageData(width, height);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          
          // Pattern logic for drone burst spectrum
          const centerY = height / 2;
          const distY = Math.abs(y - centerY);
          const timeSegment = Math.floor(x / 40) % 2 === 0;
          
          let intensity = 0;
          if (distY < 18 && timeSegment) {
            intensity = 0.8 + Math.random() * 0.2;
          } else if (distY < 35) {
            intensity = Math.max(0, 0.4 - distY / 80) + Math.random() * 0.15;
          } else {
            intensity = Math.random() * 0.12;
          }

          // Viridis-like spectrum map
          let r = 0, g = 0, b = 0;
          if (colorMap === 'viridis') {
            r = Math.floor(intensity * 255 * (intensity > 0.5 ? 1 : 0.2));
            g = Math.floor(intensity * 220);
            b = Math.floor((1 - intensity) * 180 + intensity * 50);
          } else {
            // Plasma option
            r = Math.floor(intensity * 255);
            g = Math.floor(Math.sin(intensity * Math.PI) * 180);
            b = Math.floor((1 - intensity) * 200);
          }

          imgData.data[index] = r;
          imgData.data[index + 1] = g;
          imgData.data[index + 2] = b;
          imgData.data[index + 3] = 255;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }
  }, [selectedFileId, vizTab, colorMap]);

  // Handler functions
  const handleTagToggle = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    if (customTagInput.trim() && !selectedTags.includes(customTagInput.trim())) {
      setSelectedTags([...selectedTags, customTagInput.trim()]);
      setCustomTagInput('');
      setShowCustomTagInput(false);
    }
  };

  const handleAiGenerate = () => {
    setIsGeneratingAI(true);
    setTimeout(() => {
      setDescription(
        `[AI Generated Annotation]\nDetected Signal Type: ${deviceType}\nModel: ${deviceModel} (${individualId})\nFrequency: ${freq} MHz | Bandwidth: ${bandwidth} MHz\nModulation: ${modulation}\nSNR: ${snr} dB | Distance: ${distance} m\nEnvironment: ${environment}, Status: ${flightStatus}.\nWaveform Overview: Shows clear carrier bursts and cyclic prefix traits characteristic of IEEE 802.11 Wi-Fi standard. RF hardware transient features remain consistent.`
      );
      setIsGeneratingAI(false);
    }, 800);
  };

  const handleSaveAndNext = () => {
    // Update current file status to '已标注'
    setDatasetList((prev) =>
      prev.map((f) => (f.id === selectedFileId ? { ...f, status: '已标注' } : f))
    );
    // Move to next file if available
    if (currentIndex < datasetList.length - 1) {
      setSelectedFileId(datasetList[currentIndex + 1].id);
    }
  };

  const handlePrevFile = () => {
    if (currentIndex > 0) {
      setSelectedFileId(datasetList[currentIndex - 1].id);
    }
  };

  const toggleSelectAll = (e) => {
    const isChecked = e.target.checked;
    const newChecked = {};
    datasetList.forEach((f) => {
      newChecked[f.id] = isChecked;
    });
    setCheckedFiles(newChecked);
  };

  const filteredFiles = datasetList.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const completedCount = datasetList.filter((f) => f.status === '已标注').length;
  const progressPercent = ((completedCount / datasetList.length) * 100).toFixed(1);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-100 text-slate-800 font-sans overflow-hidden select-none">
      
      {/* 1. TOP NAVBAR */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-20 shrink-0 shadow-sm">
        {/* Logo & Title */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white shadow">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">RadioCLIP</span>
              <span className="text-sm font-semibold text-slate-700">数据标注工具</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-none">IQ + Text Dataset Annotation for Radio Foundation Model</p>
          </div>
        </div>

        {/* Workflow Stepper */}
        <div className="hidden lg:flex items-center space-x-2 text-xs font-medium">
          {[
            { num: 1, label: '数据上传' },
            { num: 2, label: '数据预处理' },
            { num: 3, label: '数据浏览与标注' },
            { num: 4, label: '数据导出' },
          ].map((step, idx) => {
            const isActive = activeStep === step.num;
            const isPast = activeStep > step.num;
            return (
              <React.Fragment key={step.num}>
                {idx > 0 && <div className={`w-8 h-[2px] ${isPast ? 'bg-blue-600' : 'bg-slate-200'}`} />}
                <button
                  onClick={() => setActiveStep(step.num)}
                  className={`flex items-center space-x-1.5 px-3 py-1 rounded-full transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm font-semibold'
                      : isPast
                      ? 'text-blue-600 hover:bg-blue-50'
                      : 'text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                      isActive ? 'bg-white text-blue-600 font-bold' : isPast ? 'bg-blue-100 text-blue-600' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {step.num}
                  </span>
                  <span>{step.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Actions & User Info */}
        <div className="flex items-center space-x-3 text-xs">
          <button className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
            <Settings className="w-4 h-4 text-slate-500" />
            <span>设置</span>
          </button>
          <button className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
            <BookOpen className="w-4 h-4 text-slate-500" />
            <span>使用帮助</span>
          </button>
          <div className="h-4 w-[1px] bg-slate-200" />
          <div className="flex items-center space-x-2 pl-1 cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              <User className="w-4 h-4" />
            </div>
            <span className="font-medium text-slate-700">admin</span>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* 2. LEFT NAVIGATION SIDEBAR */}
        <aside className="w-48 bg-slate-900 text-slate-300 flex flex-col shrink-0 z-10">
          <div className="py-3 px-2 space-y-1">
            {[
              { label: '数据标注', icon: Layers },
              { label: '数据管理', icon: Database },
              { label: '数据统计', icon: BarChart2 },
              { label: '标签体系', icon: Tag },
              { label: '批量处理', icon: Sliders },
              { label: '模型训练', icon: Cpu },
              { label: '关于', icon: Info },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.label;
              return (
                <button
                  key={item.label}
                  onClick={() => setActiveNav(item.label)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? 'bg-blue-600 text-white shadow'
                      : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* 3. LEFT PANEL (DATASET & FILE BROWSER) */}
        <section className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
          {/* Dataset Header Card */}
          <div className="p-3 border-b border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">数据集</span>
              <button className="flex items-center space-x-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition shadow-sm font-medium">
                <Plus className="w-3.5 h-3.5" />
                <span>上传数据</span>
              </button>
            </div>
            
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-100 text-blue-600 rounded">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">uav_iq_dataset</div>
                  <div className="text-[10px] text-slate-500">.npy | 12.5 GB | 3,216 条</div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Search Input */}
          <div className="p-2.5 border-b border-slate-100 flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索文件名或标签..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-500">
              <Filter className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* File Table Header */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] font-semibold text-slate-500">
            <div className="flex items-center space-x-2">
              <input type="checkbox" onChange={toggleSelectAll} className="rounded border-slate-300 text-blue-600 focus:ring-0" />
              <span>文件名</span>
            </div>
            <span>状态</span>
          </div>

          {/* Scrollable File List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredFiles.map((file) => {
              const isSelected = selectedFileId === file.id;
              return (
                <div
                  key={file.id}
                  onClick={() => setSelectedFileId(file.id)}
                  className={`px-3 py-2 flex items-center justify-between text-xs cursor-pointer transition ${
                    isSelected ? 'bg-blue-50/80 font-medium' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-2 overflow-hidden pr-2">
                    <input
                      type="checkbox"
                      checked={!!checkedFiles[file.id]}
                      onChange={(e) => {
                        e.stopPropagation();
                        setCheckedFiles({ ...checkedFiles, [file.id]: e.target.checked });
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-0"
                    />
                    <span className={`truncate ${isSelected ? 'text-blue-700 font-semibold' : 'text-slate-700'}`}>
                      {file.name}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] shrink-0 font-medium ${
                      file.status === '已标注'
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${file.status === '已标注' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                    <span>{file.status}</span>
                  </span>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="p-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
            <button className="p-1 hover:bg-slate-200 rounded"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <div className="space-x-1 text-[11px]">
              <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded font-medium">1</span>
              <span className="px-1.5 py-0.5 hover:bg-slate-200 rounded cursor-pointer">2</span>
              <span className="px-1.5 py-0.5 hover:bg-slate-200 rounded cursor-pointer">3</span>
              <span className="px-1.5 py-0.5 hover:bg-slate-200 rounded cursor-pointer">4</span>
              <span>...</span>
              <span className="px-1.5 py-0.5 hover:bg-slate-200 rounded cursor-pointer">322</span>
            </div>
            <button className="p-1 hover:bg-slate-200 rounded"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>

          {/* Annotation Progress */}
          <div className="p-3 border-t border-slate-200 bg-white">
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
              <span>标注进度</span>
              <span className="text-blue-600 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>{completedCount + 1023} / 3,216</span>
              <span>已标注条数</span>
            </div>
          </div>
        </section>

        {/* 4. CENTER AREA (VISUALIZATION CANVAS & SPECTRUM ANALYSIS) */}
        <main className="flex-1 bg-slate-50 flex flex-col overflow-y-auto min-w-0">
          
          {/* Top Header Sample Info Bar */}
          <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center space-x-3">
              <span className="text-sm font-bold text-slate-800">当前样本:</span>
              <span className="text-sm font-mono font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-blue-700">
                {currentFile.name}
              </span>
              <div className="flex items-center space-x-1">
                <button onClick={handlePrevFile} className="p-1 border border-slate-200 rounded hover:bg-slate-100 text-slate-600">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-500 px-2">{currentIndex + 1} / {datasetList.length}</span>
                <button onClick={handleSaveAndNext} className="p-1 border border-slate-200 rounded hover:bg-slate-100 text-slate-600">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* File Info Specs */}
            <div className="flex items-center space-x-4 text-xs text-slate-500 font-medium">
              <span>文件信息</span>
              <span>大小: <strong className="text-slate-700">12.4 MB</strong></span>
              <span>采样率: <strong className="text-slate-700">10.0 MHz</strong></span>
              <span>样本长度: <strong className="text-slate-700">2,048,000</strong></span>
              <span>时长: <strong className="text-slate-700">0.205 s</strong></span>
            </div>
          </div>

          {/* View Tab Selector Bar */}
          <div className="bg-white px-4 border-b border-slate-200 flex space-x-6 text-xs font-medium">
            {[
              { id: 'IQ', label: '时域波形' },
              { id: 'STFT', label: '频谱图 (STFT)' },
              { id: 'FFT', label: '频谱 (FFT)' },
              { id: 'Wigner', label: '时频图 (Wigner)' },
              { id: 'Feature', label: '信号特征' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setVizTab(tab.id)}
                className={`py-2.5 border-b-2 transition ${
                  vizTab === tab.id
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Visualization Content Area */}
          <div className="p-4 flex-1 flex flex-col space-y-4">
            
            {/* Upper Section: Dual Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Chart 1: I/Q Waveform */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center space-x-2">
                    <span>I/Q 时域波形</span>
                  </span>
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-0.5 bg-blue-600 inline-block" />
                      <span className="text-slate-500">I (In-phase)</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-0.5 bg-orange-500 inline-block" />
                      <span className="text-slate-500">Q (Quadrature)</span>
                    </span>
                  </div>
                </div>
                <div className="relative w-full h-44 bg-slate-50 rounded border border-slate-100 overflow-hidden">
                  <canvas ref={iqCanvasRef} width={450} height={176} className="w-full h-full" />
                  <div className="absolute left-1 top-1 text-[9px] text-slate-400">幅度</div>
                  <div className="absolute right-2 bottom-1 text-[9px] text-slate-400">时间 (µs)</div>
                </div>
              </div>

              {/* Chart 2: FFT Spectrum */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700">频谱 (FFT)</span>
                  <span className="text-[11px] text-slate-400">峰值中心: 2.437 GHz</span>
                </div>
                <div className="relative w-full h-44 bg-slate-50 rounded border border-slate-100 overflow-hidden">
                  <canvas ref={fftCanvasRef} width={450} height={176} className="w-full h-full" />
                  <div className="absolute left-1 top-1 text-[9px] text-slate-400">功率 (dB)</div>
                  <div className="absolute right-2 bottom-1 text-[9px] text-slate-400">频率 (MHz)</div>
                </div>
              </div>

            </div>

            {/* Lower Section: STFT Heatmap Spectrogram */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col min-h-[220px]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">时频图 (STFT)</span>
                <span className="text-[11px] text-slate-400">采样率 10.0 MHz | Window: Hann</span>
              </div>
              
              <div className="relative flex-1 bg-slate-900 rounded border border-slate-800 overflow-hidden flex">
                {/* Heatmap Canvas */}
                <div className="relative flex-1 h-full">
                  <canvas ref={stftCanvasRef} width={600} height={200} className="w-full h-full object-cover" />
                  <div className="absolute left-2 top-2 text-[10px] text-slate-300 font-mono bg-slate-900/60 px-1 rounded">频率 (MHz)</div>
                  <div className="absolute right-2 bottom-2 text-[10px] text-slate-300 font-mono bg-slate-900/60 px-1 rounded">时间 (µs)</div>
                </div>

                {/* Colorbar Indicator */}
                <div className="w-8 h-full bg-gradient-to-t from-blue-900 via-emerald-400 to-yellow-300 border-l border-slate-700 flex flex-col justify-between items-center py-2 text-[9px] text-white font-mono shrink-0">
                  <span>0 dB</span>
                  <span>-40</span>
                  <span>-80</span>
                  <span>-120</span>
                </div>
              </div>
            </div>

            {/* Playback Audio / Signal Control Bar */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition shadow"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <div className="flex-1 flex items-center space-x-3">
                <span className="text-xs font-mono text-slate-600 w-20">
                  {((playbackProgress / 100) * 0.205).toFixed(3)} / 0.205 s
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={playbackProgress}
                  onChange={(e) => setPlaybackProgress(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <select className="bg-slate-100 border border-slate-200 rounded px-2 py-1 font-medium text-slate-700 focus:outline-none">
                  <option>1x</option>
                  <option>0.5x</option>
                  <option>2x</option>
                </select>
                <button className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Visual Parameter Control Form */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-bold text-slate-700 mb-2">可视化参数</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px]">FFT 点数</label>
                  <select value={fftSize} onChange={(e) => setFftSize(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700">
                    <option>512</option>
                    <option>1024</option>
                    <option>2048</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px]">窗口类型</label>
                  <select value={windowType} onChange={(e) => setWindowType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700">
                    <option>Hann</option>
                    <option>Hamming</option>
                    <option>Rectangular</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px]">步长</label>
                  <select value={stepLength} onChange={(e) => setStepLength(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700">
                    <option>128</option>
                    <option>256</option>
                    <option>512</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px]">色彩映射</label>
                  <select value={colorMap} onChange={(e) => setColorMap(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700">
                    <option value="viridis">viridis</option>
                    <option value="plasma">plasma</option>
                    <option value="jet">jet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px]">动态范围 (dB)</label>
                  <input type="number" value={dynamicRange} onChange={(e) => setDynamicRange(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700" />
                </div>
                <div className="flex items-end">
                  <button className="w-full py-1 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition shadow-sm text-xs">
                    应用
                  </button>
                </div>
              </div>
            </div>

          </div>
        </main>

        {/* 5. RIGHT SIDEBAR (ANNOTATION FORMS & INSPECTOR) */}
        <aside className="w-96 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-y-auto">
          
          {/* Header Tabs */}
          <div className="border-b border-slate-200 flex text-xs font-semibold bg-slate-50">
            {[
              { id: 'text', label: '文本标注' },
              { id: 'tag', label: '标签标注' },
              { id: 'param', label: '物理参数' },
              { id: 'info', label: '其他信息' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setAnnoTab(tab.id)}
                className={`flex-1 py-3 text-center border-b-2 transition ${
                  annoTab === tab.id
                    ? 'border-blue-600 bg-white text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="p-4 space-y-5 flex-1 text-xs">
            
            {/* Section 1: Text Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-800 border-l-2 border-blue-600 pl-2">
                  文本描述 <span className="text-red-500">*</span>
                </span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleAiGenerate}
                    disabled={isGeneratingAI}
                    className="flex items-center space-x-1 px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 transition font-medium"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{isGeneratingAI ? '生成中...' : 'AI 生成'}</span>
                  </button>
                  <button className="text-slate-400 hover:text-slate-600">
                    <FileText className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans text-xs resize-y"
                  placeholder="请输入对该射频信号的详细描述..."
                />
                <span className="absolute right-2 bottom-2 text-[10px] text-slate-400">
                  {description.length} / 2000
                </span>
              </div>
            </div>

            {/* Section 2: Device Information */}
            <div>
              <div className="font-bold text-slate-800 border-l-2 border-blue-600 pl-2 mb-2">
                设备信息
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px]">设备类型</label>
                  <select value={deviceType} onChange={(e) => setDeviceType(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700">
                    <option>无人机 (UAV)</option>
                    <option>民航客机</option>
                    <option>Wi-Fi设备</option>
                    <option>LoRa终端</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px]">设备型号</label>
                  <input
                    type="text"
                    value={deviceModel}
                    onChange={(e) => setDeviceModel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px]">个体ID</label>
                  <input
                    type="text"
                    value={individualId}
                    onChange={(e) => setIndividualId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px]">工作频率 (MHz)</label>
                  <input
                    type="text"
                    value={freq}
                    onChange={(e) => setFreq(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px]">带宽 (MHz)</label>
                  <input
                    type="text"
                    value={bandwidth}
                    onChange={(e) => setBandwidth(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px]">调制类型</label>
                  <select value={modulation} onChange={(e) => setModulation(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700">
                    <option>OFDM (Wi-Fi)</option>
                    <option>OcuSync 3.0</option>
                    <option>PPM</option>
                    <option>CSS</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Scene Info */}
            <div>
              <div className="font-bold text-slate-800 border-l-2 border-blue-600 pl-2 mb-2">
                场景信息
              </div>
              
              {/* Radio Group for Environment */}
              <div className="flex items-center space-x-3 mb-2.5">
                <span className="text-slate-500 text-[11px]">场景环境</span>
                {['室内', '室外', '城市', '郊区', '其他'].map((env) => (
                  <label key={env} className="flex items-center space-x-1 cursor-pointer">
                    <input
                      type="radio"
                      name="environment"
                      checked={environment === env}
                      onChange={() => setEnvironment(env)}
                      className="text-blue-600 focus:ring-0"
                    />
                    <span className="text-slate-700">{env}</span>
                  </label>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2.5 mb-2.5">
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px]">距离 (米)</label>
                  <input
                    type="text"
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px]">飞行状态</label>
                  <select value={flightStatus} onChange={(e) => setFlightStatus(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700">
                    <option>悬停</option>
                    <option>巡航</option>
                    <option>起飞/降落</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-500 mb-1 text-[11px]">SNR (dB)</label>
                  <input
                    type="text"
                    value={snr}
                    onChange={(e) => setSnr(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 mb-1 text-[11px]">场景描述 (可选)</label>
                <input
                  type="text"
                  value={sceneDesc}
                  onChange={(e) => setSceneDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700"
                />
              </div>
            </div>

            {/* Section 4: Interactive Tags */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-800 border-l-2 border-blue-600 pl-2">
                  标签 (可多选)
                </span>
                <span className="text-[10px] text-slate-400">已选 {selectedTags.length} 个</span>
              </div>

              {/* Tag Chips Grid */}
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => handleTagToggle(tag)}
                      className={`px-2 py-1 rounded text-[11px] font-medium transition flex items-center space-x-1 ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      <span>{tag}</span>
                    </button>
                  );
                })}

                {/* Custom Tag Input Toggle */}
                {showCustomTagInput ? (
                  <div className="flex items-center space-x-1">
                    <input
                      type="text"
                      autoFocus
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                      placeholder="自定义标签"
                      className="px-2 py-0.5 border border-blue-400 rounded text-[11px] outline-none w-24"
                    />
                    <button onClick={handleAddCustomTag} className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[10px]">确认</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCustomTagInput(true)}
                    className="px-2 py-1 rounded text-[11px] border border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 transition flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>自定义标签</span>
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Bottom Action Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
            <button
              onClick={() => {
                setDescription('');
                setSelectedTags([]);
              }}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition"
              title="清空"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevFile}
                disabled={currentIndex === 0}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded text-slate-700 hover:bg-slate-100 disabled:opacity-50 font-medium transition"
              >
                上一条
              </button>
              <button
                onClick={handleSaveAndNext}
                className="px-4 py-1.5 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition shadow flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存并下一条</span>
              </button>
              <button className="px-2.5 py-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 font-medium transition">
                批量标注
              </button>
            </div>
          </div>

        </aside>

      </div>
    </div>
  );
}