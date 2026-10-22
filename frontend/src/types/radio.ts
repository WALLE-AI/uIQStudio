export type AnnotationStatus = '待标注' | '已标注' | '已审核';

export type SignalCategory = 
  | '无人机 (UAV)' 
  | '民航客机' 
  | 'Wi-Fi设备' 
  | 'LoRa终端' 
  | 'SDR信号源' 
  | '5G基站' 
  | '雷达' 
  | '蓝牙设备';

export type ModulationType = 
  | 'OFDM (Wi-Fi)' 
  | 'OcuSync 3.0' 
  | 'PPM' 
  | 'CSS' 
  | 'FSK' 
  | 'QPSK' 
  | '16-QAM' 
  | '64-QAM' 
  | 'GFSK' 
  | 'FMCW' 
  | 'CW';

export interface SignalSample {
  id: string;
  name: string;
  status: AnnotationStatus;
  device: string;
  type: SignalCategory;
  freq: number;          // Center Frequency in MHz
  bw: number;            // Bandwidth in MHz
  mod: ModulationType;   // Modulation scheme
  snr: number;           // Estimated SNR in dB
  dist: number;          // Distance in meters
  sampleRate: number;    // Sampling rate in MSps (e.g. 10.0, 20.0, 50.0)
  sampleLength: number;  // Number of complex IQ samples
  duration: number;      // Duration in seconds
  fileSize: string;      // Formatted size
  format: '.npy' | '.sigmf' | '.mat' | '.bin';
  
  // Metadata & Annotations
  individualId: string;
  description: string;
  tags: string[];
  environment: '室内' | '室外' | '城市' | '郊区' | '野外';
  distance: number;
  flightStatus: '悬停' | '巡航' | '起飞/降落' | '固定' | '高速机动';
  sceneDesc: string;
  antenna: string;
  losCondition: 'LOS (视距)' | 'NLOS (非视距)';
  
  // RF Physical & Statistical Features
  cfo: number;           // Carrier Frequency Offset in Hz
  papr: number;          // Peak-to-Average Power Ratio in dB
  kurtosis: number;      // Kurtosis value
  skewness: number;      // Skewness value
  spectralCentroid: number; // in MHz
  spectralEntropy: number;
  
  // Synthetic generator profile for realistic DSP calculation
  profileType: 'ofdm' | 'chirp' | 'pulse' | 'fsk' | 'qam' | 'radar';
  updatedAt?: string;
  annotator?: string;
}

export type VizTabType = 'IQ' | 'STFT' | 'FFT' | 'Wigner' | 'Constellation' | 'Feature';
export type ActiveNavType = '数据标注' | '数据管理' | '数据统计' | '标签体系' | '关于';
export type WorkflowStepType = 1 | 2 | 3 | 4; // 1: 上传, 2: 预处理, 3: 标注, 4: 导出

export interface VizParams {
  fftSize: number;       // 256, 512, 1024, 2048
  windowType: 'Hann' | 'Hamming' | 'Blackman' | 'Rectangular';
  stepLength: number;    // 64, 128, 256, 512
  colorMap: 'viridis' | 'plasma' | 'inferno' | 'turbo' | 'jet';
  dynamicRange: number;  // dB (e.g., 80 to 140)
  timeWindowMicroSec: number;
}
