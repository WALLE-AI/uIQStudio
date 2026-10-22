import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, ChevronLeft, ChevronRight, Maximize2, RotateCcw, 
  Crosshair, SlidersHorizontal, Activity, ZoomIn, ZoomOut, Move,
  Target, AlertTriangle, Copy, Check, X, PanelLeftClose, PanelLeftOpen,
  PanelRightClose, PanelRightOpen, LayoutGrid, Rows, Square, ChevronDown, ChevronUp
} from 'lucide-react';
import { SignalSample, VizParams } from '../types/radio';
import { 
  generateSyntheticIQ, computeFFTSpectrum, computeSTFT, getColorFromMap, IQData 
} from '../utils/dsp';
import { radioAudio } from '../utils/soundSynthesizer';

interface VisualizationPanelProps {
  currentFile: SignalSample;
  currentIndex: number;
  totalFiles: number;
  onPrev: () => void;
  onNext: () => void;
  isDatasetCollapsed?: boolean;
  onToggleDatasetCollapse?: () => void;
  isAnnotationCollapsed?: boolean;
  onToggleAnnotationCollapse?: () => void;
}

export interface InterferenceBox {
  timeStartUs: number;
  timeEndUs: number;
  freqStartMHz: number;
  freqEndMHz: number;
  deltaFkHz: number;
  deltaTus: number;
  centerFreqMHz: number;
  peakPowerDb: number;
}

export type ViewLayoutMode = 'stacked' | 'stft_max' | 'iq_max' | 'feature';

export const VisualizationPanel: React.FC<VisualizationPanelProps> = ({
  currentFile,
  currentIndex,
  totalFiles,
  onPrev,
  onNext,
  isDatasetCollapsed = false,
  onToggleDatasetCollapse,
  isAnnotationCollapsed = false,
  onToggleAnnotationCollapse,
}) => {
  // Layout mode: 'stacked' (STFT + IQ vertically stacked, spacious & default), 'stft_max', 'iq_max', 'feature'
  const [layoutMode, setLayoutMode] = useState<ViewLayoutMode>('stacked');
  const [showParamTray, setShowParamTray] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [playSpeed, setPlaySpeed] = useState('1x');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Crosshair HUD on Canvas
  const [cursorPos, setCursorPos] = useState<{ 
    x: number; 
    y: number; 
    timeUs: number; 
    freqMHz: number; 
    powerDb: number;
    sampleIdx?: number;
    ampI?: number;
    ampQ?: number;
  } | null>(null);

  // Visualization Parameters
  const [vizParams, setVizParams] = useState<VizParams>({
    fftSize: 1024,
    windowType: 'Hann',
    stepLength: 256,
    colorMap: 'viridis',
    dynamicRange: 120,
    timeWindowMicroSec: 205,
  });

  // Cached IQ and DSP Data
  const [iqData, setIqData] = useState<IQData | null>(null);

  // --- 1. IQ Time-Domain Zoom & Pan States ---
  const [iqZoom, setIqZoom] = useState<number>(1.0); // 1x to 32x
  const [iqPan, setIqPan] = useState<number>(0.0);   // 0.0 to 1.0 (fraction of total length)
  const [isIqDragging, setIsIqDragging] = useState<boolean>(false);
  const [iqDragStartX, setIqDragStartX] = useState<number>(0);
  const [iqDragStartPan, setIqDragStartPan] = useState<number>(0);
  const [iqInterferenceRange, setIqInterferenceRange] = useState<{ startUs: number; endUs: number; durationUs: number } | null>(null);

  // --- 2. STFT Spectrogram Zoom & Pan States ---
  const [stftZoomX, setStftZoomX] = useState<number>(1.0); // 1x to 20x (Time zoom)
  const [stftZoomY, setStftZoomY] = useState<number>(1.0); // 1x to 10x (Freq zoom)
  const [stftPanX, setStftPanX] = useState<number>(0.0);   // 0.0 to 1.0 (Time offset)
  const [stftPanY, setStftPanY] = useState<number>(0.0);   // 0.0 to 1.0 (Freq offset)
  
  // STFT Interaction Mode: 'panZoom' (pan/zoom navigation) or 'boxInterference' (box-select interference signal)
  const [stftInteractionMode, setStftInteractionMode] = useState<'panZoom' | 'boxInterference'>('panZoom');
  const [isStftDragging, setIsStftDragging] = useState<boolean>(false);
  const [stftDragStart, setStftDragStart] = useState<{ x: number; y: number; panX: number; panY: number }>({ x: 0, y: 0, panX: 0, panY: 0 });

  // STFT Interference Box Selection
  const [boxSelecting, setBoxSelecting] = useState<boolean>(false);
  const [boxStartNorm, setBoxStartNorm] = useState<{ u: number; v: number } | null>(null);
  const [boxCurrentNorm, setBoxCurrentNorm] = useState<{ u: number; v: number } | null>(null);
  const [interferenceBox, setInterferenceBox] = useState<InterferenceBox | null>(null);
  const [copiedInterference, setCopiedInterference] = useState<boolean>(false);

  // Canvas Refs
  const iqCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const constellCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Regenerate IQ data when currentFile changes
  useEffect(() => {
    const data = generateSyntheticIQ(currentFile, 2048);
    setIqData(data);
    setPlaybackProgress(0);
    setIqZoom(1.0);
    setIqPan(0.0);
    setStftZoomX(1.0);
    setStftZoomY(1.0);
    setStftPanX(0.0);
    setStftPanY(0.0);
    setInterferenceBox(null);
    setIqInterferenceRange(null);

    if (isPlaying) {
      radioAudio.stop();
      setIsPlaying(false);
    }
  }, [currentFile.id]);

  // Audio Playback
  const handleTogglePlay = () => {
    if (isPlaying) {
      radioAudio.stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      radioAudio.play(
        currentFile,
        (progress) => setPlaybackProgress(progress),
        () => {
          setIsPlaying(false);
          setPlaybackProgress(100);
        }
      );
    }
  };

  const handleResetIqZoom = () => {
    setIqZoom(1.0);
    setIqPan(0.0);
  };

  const handleResetStftZoom = () => {
    setStftZoomX(1.0);
    setStftZoomY(1.0);
    setStftPanX(0.0);
    setStftPanY(0.0);
  };

  // =========================================================================
  // 1. RENDER I/Q WAVEFORM (High-Fidelity 100% Width Canvas)
  // =========================================================================
  useEffect(() => {
    if (!iqCanvasRef.current || !iqData) return;
    const canvas = iqCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const totalPoints = iqData.length;
    const visiblePoints = Math.max(16, Math.floor(totalPoints / iqZoom));
    const maxPan = Math.max(0, 1 - 1 / iqZoom);
    const clampedPan = Math.max(0, Math.min(maxPan, iqPan));
    const startSample = Math.floor(clampedPan * totalPoints);
    const endSample = Math.min(totalPoints - 1, startSample + visiblePoints);

    // Subtle Grid
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 25) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    // Baseline
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, height / 2); ctx.lineTo(width, height / 2); ctx.stroke();

    // Interference Highlight Overlay
    if (iqInterferenceRange) {
      const fullDurUs = currentFile.duration * 1e6;
      const x1 = ((iqInterferenceRange.startUs / fullDurUs - clampedPan) * iqZoom) * width;
      const x2 = ((iqInterferenceRange.endUs / fullDurUs - clampedPan) * iqZoom) * width;
      const boxW = Math.max(4, x2 - x1);

      if (x2 >= 0 && x1 <= width) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fillRect(Math.max(0, x1), 0, Math.min(width, boxW), height);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 2]);
        ctx.strokeRect(Math.max(0, x1), 1, Math.min(width, boxW), height - 2);
        ctx.setLineDash([]);

        ctx.fillStyle = '#b91c1c';
        ctx.font = '10px monospace';
        ctx.fillText(`干扰段: Δt=${iqInterferenceRange.durationUs.toFixed(1)}µs`, Math.max(4, x1 + 4), 14);
      }
    }

    const sampleStep = (endSample - startSample) / width;

    // Plot I (Blue)
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = iqZoom > 4 ? 1.8 : 1.3;
    ctx.beginPath();
    for (let px = 0; px < width; px++) {
      const sIdx = Math.min(totalPoints - 1, Math.floor(startSample + px * sampleStep));
      const val = iqData.i[sIdx] || 0;
      const y = height / 2 - val * (height * 0.4);
      if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
    }
    ctx.stroke();

    // Plot Q (Orange)
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = iqZoom > 4 ? 1.8 : 1.3;
    ctx.beginPath();
    for (let px = 0; px < width; px++) {
      const sIdx = Math.min(totalPoints - 1, Math.floor(startSample + px * sampleStep));
      const val = iqData.q[sIdx] || 0;
      const y = height / 2 - val * (height * 0.4);
      if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
    }
    ctx.stroke();

    // Individual sample dots if zoomed in
    if (iqZoom >= 8) {
      for (let px = 0; px < width; px += Math.max(6, Math.floor(width / visiblePoints))) {
        const sIdx = Math.min(totalPoints - 1, Math.floor(startSample + px * sampleStep));
        const valI = iqData.i[sIdx] || 0;
        const yI = height / 2 - valI * (height * 0.4);
        ctx.fillStyle = '#1d4ed8';
        ctx.beginPath(); ctx.arc(px, yI, 2.5, 0, Math.PI * 2); ctx.fill();

        const valQ = iqData.q[sIdx] || 0;
        const yQ = height / 2 - valQ * (height * 0.4);
        ctx.fillStyle = '#ea580c';
        ctx.beginPath(); ctx.arc(px, yQ, 2.5, 0, Math.PI * 2); ctx.fill();
      }
    }
  }, [iqData, layoutMode, iqZoom, iqPan, iqInterferenceRange, currentFile.duration]);

  // I/Q Wheel Zoom
  const handleIqWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = iqCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cursorFraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));

    const zoomMultiplier = e.deltaY < 0 ? 1.25 : 0.8;
    const newZoom = Math.max(1.0, Math.min(32.0, iqZoom * zoomMultiplier));

    const globalPos = iqPan + cursorFraction * (1 / iqZoom);
    const newPan = Math.max(0, Math.min(1 - 1 / newZoom, globalPos - cursorFraction * (1 / newZoom)));

    setIqZoom(newZoom);
    setIqPan(newPan);
  };

  // I/Q Mouse Down
  const handleIqMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    setIsIqDragging(true);
    setIqDragStartX(e.clientX);
    setIqDragStartPan(iqPan);
  };

  // I/Q Mouse Move
  const handleIqMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = iqCanvasRef.current;
    if (!canvas || !iqData) return;
    const rect = canvas.getBoundingClientRect();

    if (isIqDragging && iqZoom > 1.0) {
      const deltaX = e.clientX - iqDragStartX;
      const deltaPan = -(deltaX / rect.width) * (1 / iqZoom);
      const maxPan = Math.max(0, 1 - 1 / iqZoom);
      setIqPan(Math.max(0, Math.min(maxPan, iqDragStartPan + deltaPan)));
    }

    const x = e.clientX - rect.left;
    const relX = Math.max(0, Math.min(1, x / rect.width));
    const globalFraction = iqPan + relX * (1 / iqZoom);
    const sampleIdx = Math.floor(globalFraction * (iqData.length - 1));
    const timeUs = Number((globalFraction * currentFile.duration * 1e6).toFixed(2));
    const ampI = Number((iqData.i[sampleIdx] || 0).toFixed(3));
    const ampQ = Number((iqData.q[sampleIdx] || 0).toFixed(3));

    setCursorPos({
      x,
      y: e.clientY - rect.top,
      timeUs,
      freqMHz: currentFile.freq,
      powerDb: Number((20 * Math.log10(Math.sqrt(ampI * ampI + ampQ * ampQ) + 1e-4)).toFixed(1)),
      sampleIdx,
      ampI,
      ampQ,
    });
  };

  const handleIqMouseUp = () => {
    setIsIqDragging(false);
  };

  // =========================================================================
  // 2. RENDER FFT SPECTRUM
  // =========================================================================
  useEffect(() => {
    if (!fftCanvasRef.current || !iqData) return;
    const canvas = fftCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const fft = computeFFTSpectrum(iqData, 256, currentFile.freq, currentFile.bw);

    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 25) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }

    const minDb = -80;
    const maxDb = 20;

    ctx.fillStyle = 'rgba(37, 99, 235, 0.08)';
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, height);

    for (let k = 0; k < fft.magnitudes.length; k++) {
      const x = (k / (fft.magnitudes.length - 1)) * width;
      const db = fft.magnitudes[k];
      const norm = (db - minDb) / (maxDb - minDb);
      const y = Math.max(5, Math.min(height - 5, height - norm * height));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#ef4444';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.stroke();
    ctx.setLineDash([]);
  }, [iqData, currentFile.freq, currentFile.bw, layoutMode]);

  // =========================================================================
  // 3. RENDER STFT SPECTROGRAM (High-Definition Heatmap with 2D Zoom & Box)
  // =========================================================================
  useEffect(() => {
    if (!stftCanvasRef.current || !iqData) return;
    const canvas = stftCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const stft = computeSTFT(iqData, 64, 16, vizParams.windowType);
    const imgData = ctx.createImageData(width, height);

    const numFrames = stft.spectrogram.length;
    const numBins = stft.numBins;

    const maxPanX = Math.max(0, 1 - 1 / stftZoomX);
    const maxPanY = Math.max(0, 1 - 1 / stftZoomY);
    const curPanX = Math.max(0, Math.min(maxPanX, stftPanX));
    const curPanY = Math.max(0, Math.min(maxPanY, stftPanY));

    for (let py = 0; py < height; py++) {
      const relY = 1 - py / height;
      const globalNormFreq = curPanY + relY * (1 / stftZoomY);
      const binIdx = Math.max(0, Math.min(numBins - 1, Math.floor(globalNormFreq * (numBins - 1))));

      for (let px = 0; px < width; px++) {
        const relX = px / width;
        const globalNormTime = curPanX + relX * (1 / stftZoomX);
        const frameIdx = Math.max(0, Math.min(numFrames - 1, Math.floor(globalNormTime * (numFrames - 1))));

        const powerVal = stft.spectrogram[frameIdx] ? stft.spectrogram[frameIdx][binIdx] : -90;
        const norm = Math.max(0, Math.min(1, (powerVal + 90) / 70));
        const [r, g, b] = getColorFromMap(norm, vizParams.colorMap);

        const pixelIdx = (py * width + px) * 4;
        imgData.data[pixelIdx] = r;
        imgData.data[pixelIdx + 1] = g;
        imgData.data[pixelIdx + 2] = b;
        imgData.data[pixelIdx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // Active Dragging Box
    if (boxSelecting && boxStartNorm && boxCurrentNorm) {
      const u1 = (Math.min(boxStartNorm.u, boxCurrentNorm.u) - curPanX) * stftZoomX * width;
      const u2 = (Math.max(boxStartNorm.u, boxCurrentNorm.u) - curPanX) * stftZoomX * width;
      const v1 = height - ((Math.max(boxStartNorm.v, boxCurrentNorm.v) - curPanY) * stftZoomY * height);
      const v2 = height - ((Math.min(boxStartNorm.v, boxCurrentNorm.v) - curPanY) * stftZoomY * height);

      const boxW = Math.max(2, u2 - u1);
      const boxH = Math.max(2, v2 - v1);

      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.fillRect(u1, v1, boxW, boxH);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(u1, v1, boxW, boxH);
      ctx.setLineDash([]);
    }

    // Finalized Interference Box Marker
    if (interferenceBox) {
      const fullDurUs = currentFile.duration * 1e6;
      const minFreq = currentFile.freq - currentFile.bw / 2;

      const normT1 = interferenceBox.timeStartUs / fullDurUs;
      const normT2 = interferenceBox.timeEndUs / fullDurUs;
      const normF1 = (interferenceBox.freqStartMHz - minFreq) / currentFile.bw;
      const normF2 = (interferenceBox.freqEndMHz - minFreq) / currentFile.bw;

      const u1 = (normT1 - curPanX) * stftZoomX * width;
      const u2 = (normT2 - curPanX) * stftZoomX * width;
      const v1 = height - ((normF2 - curPanY) * stftZoomY * height);
      const v2 = height - ((normF1 - curPanY) * stftZoomY * height);

      const boxW = Math.max(4, u2 - u1);
      const boxH = Math.max(4, v2 - v1);

      if (u1 <= width && u2 >= 0 && v1 <= height && v2 >= 0) {
        ctx.fillStyle = 'rgba(244, 63, 94, 0.2)';
        ctx.fillRect(u1, v1, boxW, boxH);

        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.strokeRect(u1, v1, boxW, boxH);

        const cornerLen = 6;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(u1, v1 + cornerLen); ctx.lineTo(u1, v1); ctx.lineTo(u1 + cornerLen, v1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(u2 - cornerLen, v1); ctx.lineTo(u2, v1); ctx.lineTo(u2, v1 + cornerLen); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(u1, v2 - cornerLen); ctx.lineTo(u1, v2); ctx.lineTo(u1 + cornerLen, v2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(u2 - cornerLen, v2); ctx.lineTo(u2, v2); ctx.lineTo(u2, v2 - cornerLen); ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.fillText(`干扰: ${interferenceBox.centerFreqMHz.toFixed(2)}MHz (Δf=${interferenceBox.deltaFkHz.toFixed(0)}kHz)`, Math.max(4, u1 + 4), Math.max(14, v1 - 4));
      }
    }
  }, [
    iqData, vizParams, layoutMode, stftZoomX, stftZoomY, stftPanX, stftPanY, 
    boxSelecting, boxStartNorm, boxCurrentNorm, interferenceBox, currentFile
  ]);

  // STFT Wheel Zoom
  const handleStftWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = stftCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const mouseRelX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const mouseRelY = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));

    const zoomMultiplier = e.deltaY < 0 ? 1.25 : 0.8;
    const newZoomX = Math.max(1.0, Math.min(20.0, stftZoomX * zoomMultiplier));
    const newZoomY = Math.max(1.0, Math.min(10.0, stftZoomY * zoomMultiplier));

    const globalX = stftPanX + mouseRelX * (1 / stftZoomX);
    const globalY = stftPanY + mouseRelY * (1 / stftZoomY);

    const newPanX = Math.max(0, Math.min(1 - 1 / newZoomX, globalX - mouseRelX * (1 / newZoomX)));
    const newPanY = Math.max(0, Math.min(1 - 1 / newZoomY, globalY - mouseRelY * (1 / newZoomY)));

    setStftZoomX(newZoomX);
    setStftZoomY(newZoomY);
    setStftPanX(newPanX);
    setStftPanY(newPanY);
  };

  // STFT Mouse Down
  const handleStftMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const canvas = stftCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));

    const globalU = stftPanX + relX * (1 / stftZoomX);
    const globalV = stftPanY + relY * (1 / stftZoomY);

    if (stftInteractionMode === 'boxInterference') {
      setBoxSelecting(true);
      setBoxStartNorm({ u: globalU, v: globalV });
      setBoxCurrentNorm({ u: globalU, v: globalV });
    } else {
      setIsStftDragging(true);
      setStftDragStart({
        x: e.clientX,
        y: e.clientY,
        panX: stftPanX,
        panY: stftPanY,
      });
    }
  };

  // STFT Mouse Move
  const handleStftMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = stftCanvasRef.current;
    if (!canvas || !iqData) return;
    const rect = canvas.getBoundingClientRect();

    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));

    const globalU = stftPanX + relX * (1 / stftZoomX);
    const globalV = stftPanY + relY * (1 / stftZoomY);

    if (isStftDragging && stftInteractionMode === 'panZoom' && (stftZoomX > 1.0 || stftZoomY > 1.0)) {
      const deltaX = e.clientX - stftDragStart.x;
      const deltaY = e.clientY - stftDragStart.y;
      const deltaPanX = -(deltaX / rect.width) * (1 / stftZoomX);
      const deltaPanY = (deltaY / rect.height) * (1 / stftZoomY);

      const maxPanX = Math.max(0, 1 - 1 / stftZoomX);
      const maxPanY = Math.max(0, 1 - 1 / stftZoomY);

      setStftPanX(Math.max(0, Math.min(maxPanX, stftDragStart.panX + deltaPanX)));
      setStftPanY(Math.max(0, Math.min(maxPanY, stftDragStart.panY + deltaPanY)));
    }

    if (boxSelecting && stftInteractionMode === 'boxInterference') {
      setBoxCurrentNorm({ u: globalU, v: globalV });
    }

    const timeUs = Number((globalU * currentFile.duration * 1e6).toFixed(1));
    const halfBw = currentFile.bw / 2;
    const freqMHz = Number((currentFile.freq - halfBw + globalV * currentFile.bw).toFixed(3));
    const powerDb = Number((-90 + globalV * 65 + (Math.sin(globalU * 10) * 10)).toFixed(1));

    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top, timeUs, freqMHz, powerDb });
  };

  // STFT Mouse Up
  const handleStftMouseUp = () => {
    if (isStftDragging) {
      setIsStftDragging(false);
    }

    if (boxSelecting && boxStartNorm && boxCurrentNorm) {
      setBoxSelecting(false);
      const u1 = Math.min(boxStartNorm.u, boxCurrentNorm.u);
      const u2 = Math.max(boxStartNorm.u, boxCurrentNorm.u);
      const v1 = Math.min(boxStartNorm.v, boxCurrentNorm.v);
      const v2 = Math.max(boxStartNorm.v, boxCurrentNorm.v);

      if (Math.abs(u2 - u1) > 0.01 && Math.abs(v2 - v1) > 0.01) {
        const fullDurUs = currentFile.duration * 1e6;
        const minFreq = currentFile.freq - currentFile.bw / 2;

        const timeStartUs = Number((u1 * fullDurUs).toFixed(1));
        const timeEndUs = Number((u2 * fullDurUs).toFixed(1));
        const freqStartMHz = Number((minFreq + v1 * currentFile.bw).toFixed(3));
        const freqEndMHz = Number((minFreq + v2 * currentFile.bw).toFixed(3));
        const deltaFkHz = Number(((freqEndMHz - freqStartMHz) * 1000).toFixed(1));
        const deltaTus = Number((timeEndUs - timeStartUs).toFixed(1));
        const centerFreqMHz = Number(((freqStartMHz + freqEndMHz) / 2).toFixed(3));

        setInterferenceBox({
          timeStartUs,
          timeEndUs,
          freqStartMHz,
          freqEndMHz,
          deltaFkHz,
          deltaTus,
          centerFreqMHz,
          peakPowerDb: -42.5,
        });

        setIqInterferenceRange({
          startUs: timeStartUs,
          endUs: timeEndUs,
          durationUs: deltaTus,
        });
      }

      setBoxStartNorm(null);
      setBoxCurrentNorm(null);
    }
  };

  // Zoom into marked interference box
  const handleZoomToInterference = () => {
    if (!interferenceBox) return;
    const fullDurUs = currentFile.duration * 1e6;
    const minFreq = currentFile.freq - currentFile.bw / 2;

    const u1 = interferenceBox.timeStartUs / fullDurUs;
    const u2 = interferenceBox.timeEndUs / fullDurUs;
    const v1 = (interferenceBox.freqStartMHz - minFreq) / currentFile.bw;
    const v2 = (interferenceBox.freqEndMHz - minFreq) / currentFile.bw;

    const boxSpanU = Math.max(0.02, u2 - u1);
    const boxSpanV = Math.max(0.04, v2 - v1);

    const targetZoomX = Math.min(16.0, 1 / (boxSpanU * 1.5));
    const targetZoomY = Math.min(8.0, 1 / (boxSpanV * 1.5));

    const targetPanX = Math.max(0, Math.min(1 - 1 / targetZoomX, u1 - (1 / targetZoomX - boxSpanU) / 2));
    const targetPanY = Math.max(0, Math.min(1 - 1 / targetZoomY, v1 - (1 / targetZoomY - boxSpanV) / 2));

    setStftZoomX(targetZoomX);
    setStftZoomY(targetZoomY);
    setStftPanX(targetPanX);
    setStftPanY(targetPanY);

    setIqZoom(Math.min(24.0, targetZoomX));
    setIqPan(Math.max(0, Math.min(1 - 1 / targetZoomX, u1 - 0.02)));
  };

  const handleCopyInterference = () => {
    if (!interferenceBox) return;
    const info = `【干扰信号定位参数】
中心频点: ${interferenceBox.centerFreqMHz} MHz
频带范围: ${interferenceBox.freqStartMHz} MHz ~ ${interferenceBox.freqEndMHz} MHz (带宽: ${interferenceBox.deltaFkHz} kHz)
持续时间: ${interferenceBox.timeStartUs} µs ~ ${interferenceBox.timeEndUs} µs (脉宽: ${interferenceBox.deltaTus} µs)
参考功率: ${interferenceBox.peakPowerDb} dBm`;
    navigator.clipboard.writeText(info);
    setCopiedInterference(true);
    setTimeout(() => setCopiedInterference(false), 2000);
  };

  const handleClearInterference = () => {
    setInterferenceBox(null);
    setIqInterferenceRange(null);
  };

  const minFullFreq = currentFile.freq - currentFile.bw / 2;
  const visibleFreqMin = (minFullFreq + stftPanY * currentFile.bw).toFixed(2);
  const visibleFreqMax = (minFullFreq + (stftPanY + 1 / stftZoomY) * currentFile.bw).toFixed(2);
  const visibleTimeStartMs = (stftPanX * currentFile.duration * 1000).toFixed(1);
  const visibleTimeEndMs = ((stftPanX + 1 / stftZoomX) * currentFile.duration * 1000).toFixed(1);

  return (
    <main 
      ref={containerRef}
      className={`flex-1 bg-slate-100/60 flex flex-col overflow-y-auto min-w-0 select-none ${
        isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 text-white p-4' : ''
      }`}
    >
      {/* 1. TOP CONTROL & TELEMETRY RIBBON */}
      <div className="bg-white border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        
        {/* Left: Quick Panel Collapse Toggles & Sample Navigator */}
        <div className="flex items-center space-x-2">
          {onToggleDatasetCollapse && (
            <button
              onClick={onToggleDatasetCollapse}
              className={`p-1.5 rounded transition cursor-pointer ${
                isDatasetCollapsed 
                  ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              title={isDatasetCollapsed ? '展开左侧样本目录' : '收起左侧样本目录，放大波形时频图'}
            >
              {isDatasetCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          )}

          <div className="flex items-center space-x-1 border-r border-slate-200 pr-2">
            <button
              onClick={onPrev}
              disabled={currentIndex === 0}
              className="p-1 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 text-slate-600 cursor-pointer"
              title="上一条 (←)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono font-semibold text-slate-700 px-1 tabular-nums">
              {currentIndex + 1}/{totalFiles}
            </span>
            <button
              onClick={onNext}
              disabled={currentIndex === totalFiles - 1}
              className="p-1 border border-slate-200 rounded hover:bg-slate-100 disabled:opacity-40 text-slate-600 cursor-pointer"
              title="下一条 (→)"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className="text-xs font-mono font-bold bg-slate-100 text-blue-700 px-2 py-0.5 rounded border border-slate-200">
            {currentFile.name}
          </span>
          <span className="text-[11px] text-slate-500 hidden md:inline">
            {currentFile.device} · {currentFile.mod}
          </span>
        </div>

        {/* Center: Quick File Specs */}
        <div className="hidden lg:flex items-center space-x-3 text-xs font-mono text-slate-500">
          <span>频点: <strong className="text-slate-800">{currentFile.freq} MHz</strong></span>
          <span>带宽: <strong className="text-slate-800">{currentFile.bw} MHz</strong></span>
          <span>SNR: <strong className="text-emerald-600">{currentFile.snr} dB</strong></span>
          <span>采样率: <strong className="text-slate-800">{currentFile.sampleRate} MSps</strong></span>
        </div>

        {/* Right: Layout Switcher & Right Panel Collapse */}
        <div className="flex items-center space-x-2">
          
          {/* View Layout Mode Buttons */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
            <button
              onClick={() => setLayoutMode('stacked')}
              className={`flex items-center space-x-1 px-2 py-1 rounded transition font-medium cursor-pointer ${
                layoutMode === 'stacked'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="时频图 + 时域波形 全宽堆叠（推荐标准布局）"
            >
              <Rows className="w-3.5 h-3.5" />
              <span className="text-[11px]">上下全宽</span>
            </button>

            <button
              onClick={() => setLayoutMode('stft_max')}
              className={`flex items-center space-x-1 px-2 py-1 rounded transition font-medium cursor-pointer ${
                layoutMode === 'stft_max'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="大画幅时频图专注模式"
            >
              <Square className="w-3.5 h-3.5" />
              <span className="text-[11px]">时频大图</span>
            </button>

            <button
              onClick={() => setLayoutMode('iq_max')}
              className={`flex items-center space-x-1 px-2 py-1 rounded transition font-medium cursor-pointer ${
                layoutMode === 'iq_max'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="时域波形与频谱"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="text-[11px]">时域波形</span>
            </button>

            <button
              onClick={() => setLayoutMode('feature')}
              className={`flex items-center space-x-1 px-2 py-1 rounded transition font-medium cursor-pointer ${
                layoutMode === 'feature'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="物理特征与个体指纹参数"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[11px]">特征</span>
            </button>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition cursor-pointer"
            title={isFullscreen ? '退出全屏' : '全屏分析'}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          {onToggleAnnotationCollapse && (
            <button
              onClick={onToggleAnnotationCollapse}
              className={`p-1.5 rounded transition cursor-pointer ${
                isAnnotationCollapsed 
                  ? 'bg-blue-50 text-blue-600 border border-blue-200' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              title={isAnnotationCollapsed ? '展开右侧标注面板' : '收起右侧标注面板，最大化时频分析区'}
            >
              {isAnnotationCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
            </button>
          )}
        </div>

      </div>

      {/* 2. MAIN VISUALIZATION WORKSPACE AREA (SPACIOUS & UNCLUTTERED) */}
      <div className="p-3 flex-1 flex flex-col space-y-3">
        
        {/* LAYOUT A: 'stacked' (Default: 100% Full-width STFT Spectrogram on top + 100% Full-width IQ Waveform below) */}
        {(layoutMode === 'stacked' || layoutMode === 'stft_max') && (
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col shrink-0">
            
            {/* STFT Header Strip with Zoom, Pan, Box Selection Mode and HUD */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800">
                  短时傅里叶变换时频图 (STFT Spectrogram)
                </span>
                
                {/* Mode Selector */}
                <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs">
                  <button
                    onClick={() => setStftInteractionMode('panZoom')}
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition cursor-pointer font-medium ${
                      stftInteractionMode === 'panZoom'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="视野漫游模式：滚轮缩放，按住左键拖拽视野"
                  >
                    <Move className="w-3 h-3" />
                    <span>视野漫游</span>
                  </button>

                  <button
                    onClick={() => setStftInteractionMode('boxInterference')}
                    className={`flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] transition cursor-pointer font-medium ${
                      stftInteractionMode === 'boxInterference'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-rose-600'
                    }`}
                    title="干扰信号框选模式：按住鼠标左键拉框，锁定干扰频段与时间范围"
                  >
                    <Target className="w-3 h-3" />
                    <span>框选干扰信号</span>
                  </button>
                </div>
              </div>

              {/* STFT Zoom Controls & Realtime Cursor Tooltip */}
              <div className="flex items-center space-x-2 text-xs">
                
                {/* Zoom Buttons */}
                <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
                  <button
                    onClick={() => {
                      setStftZoomX(zx => Math.min(20.0, zx * 1.3));
                      setStftZoomY(zy => Math.min(10.0, zy * 1.3));
                    }}
                    className="p-1 hover:bg-white rounded text-slate-600 cursor-pointer"
                    title="放慢/放宽时频图"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setStftZoomX(zx => Math.max(1.0, zx / 1.3));
                      setStftZoomY(zy => Math.max(1.0, zy / 1.3));
                    }}
                    disabled={stftZoomX <= 1.0 && stftZoomY <= 1.0}
                    className="p-1 hover:bg-white rounded text-slate-600 disabled:opacity-40 cursor-pointer"
                    title="缩小时频图"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleResetStftZoom}
                    disabled={stftZoomX <= 1.0 && stftZoomY <= 1.0 && stftPanX === 0 && stftPanY === 0}
                    className="px-1.5 py-0.5 hover:bg-white rounded text-slate-600 disabled:opacity-40 cursor-pointer text-[10px] font-mono"
                    title="重置全景"
                  >
                    全景
                  </button>
                </div>

                {/* Live Coordinate Crosshair Readout */}
                {cursorPos ? (
                  <div className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center space-x-2">
                    <Crosshair className="w-3 h-3 text-blue-600 animate-spin" />
                    <span>t: {cursorPos.timeUs} µs</span>
                    <span>f: {cursorPos.freqMHz} MHz</span>
                    <span>p: {cursorPos.powerDb} dB</span>
                  </div>
                ) : (
                  <span className="text-[10px] text-slate-400 font-mono hidden xl:inline">
                    滚轮缩放 / 拖拽平移 / 框选锁定干扰
                  </span>
                )}
              </div>
            </div>

            {/* STFT Spectrogram Canvas with Generous Height */}
            <div 
              className={`relative w-full bg-slate-950 rounded border border-slate-800 overflow-hidden flex ${
                layoutMode === 'stft_max' ? 'h-96' : 'h-64'
              }`}
            >
              <div className={`relative flex-1 h-full ${
                stftInteractionMode === 'boxInterference' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
              }`}>
                <canvas 
                  ref={stftCanvasRef} 
                  width={800} 
                  height={layoutMode === 'stft_max' ? 384 : 256} 
                  onWheel={handleStftWheel}
                  onMouseDown={handleStftMouseDown}
                  onMouseMove={handleStftMouseMove}
                  onMouseUp={handleStftMouseUp}
                  onMouseLeave={() => {
                    setIsStftDragging(false);
                    setBoxSelecting(false);
                    setCursorPos(null);
                  }}
                  className="w-full h-full object-cover" 
                />

                {/* Coordinate Markers */}
                <div className="absolute left-2 top-2 text-[10px] text-slate-200 font-mono bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700">
                  {visibleFreqMax} MHz
                </div>
                <div className="absolute left-2 bottom-2 text-[10px] text-slate-200 font-mono bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700">
                  {visibleFreqMin} MHz
                </div>
                <div className="absolute right-2 bottom-2 text-[10px] text-slate-200 font-mono bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700">
                  {visibleTimeStartMs} ~ {visibleTimeEndMs} ms
                </div>

                {/* Zoom badge */}
                {(stftZoomX > 1.0 || stftZoomY > 1.0) && (
                  <div className="absolute right-2 top-2 text-[10px] text-amber-300 font-mono bg-slate-900/80 px-2 py-0.5 rounded border border-amber-500/40">
                    时频缩放: {stftZoomX.toFixed(1)}x(时间) × {stftZoomY.toFixed(1)}x(频域)
                  </div>
                )}

                {/* Audio playback line */}
                {playbackProgress > 0 && playbackProgress < 100 && (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-yellow-400 shadow-sm pointer-events-none transition-all duration-75"
                    style={{ left: `${playbackProgress}%` }}
                  />
                )}
              </div>

              {/* Colorbar */}
              <div className="w-9 h-full bg-gradient-to-t from-blue-950 via-teal-500 to-yellow-300 border-l border-slate-700 flex flex-col justify-between items-center py-2 text-[9px] text-white font-mono shrink-0 select-none">
                <span className="bg-black/60 px-0.5 rounded">0dB</span>
                <span className="bg-black/60 px-0.5 rounded">-40</span>
                <span className="bg-black/60 px-0.5 rounded">-80</span>
                <span className="bg-black/60 px-0.5 rounded">-120</span>
              </div>
            </div>

            {/* Targeted Interference Box Floating Control Banner */}
            {interferenceBox && (
              <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs text-rose-900 animate-in fade-in duration-150">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <span className="font-bold text-rose-800">已定位干扰信号:</span>
                    <span className="ml-2 font-mono text-[11px] text-rose-700">
                      中心频点: <strong>{interferenceBox.centerFreqMHz} MHz</strong> · 
                      带宽: <strong>{interferenceBox.deltaFkHz} kHz</strong> · 
                      时间: <strong>{interferenceBox.timeStartUs} µs ~ {interferenceBox.timeEndUs} µs</strong> (脉宽: {interferenceBox.deltaTus} µs)
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0">
                  <button
                    onClick={handleZoomToInterference}
                    className="px-2 py-0.5 bg-white border border-rose-300 hover:bg-rose-100 rounded text-rose-800 font-medium transition cursor-pointer flex items-center space-x-1 text-[11px]"
                    title="居中放大聚焦此干扰区域"
                  >
                    <Target className="w-3 h-3 text-rose-600" />
                    <span>聚焦</span>
                  </button>

                  <button
                    onClick={handleCopyInterference}
                    className="px-2 py-0.5 bg-white border border-rose-300 hover:bg-rose-100 rounded text-rose-800 font-medium transition cursor-pointer flex items-center space-x-1 text-[11px]"
                    title="复制干扰特征参数"
                  >
                    {copiedInterference ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedInterference ? '已复制' : '复制'}</span>
                  </button>

                  <button
                    onClick={handleClearInterference}
                    className="p-1 text-rose-500 hover:text-rose-800 hover:bg-rose-100 rounded cursor-pointer"
                    title="清除选框"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* LAYOUT B: Full-width I/Q Waveform (Shown in 'stacked' and 'iq_max' modes) */}
        {(layoutMode === 'stacked' || layoutMode === 'iq_max') && (
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col shrink-0">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-800">I/Q 时域复数波形</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  缩放: {iqZoom.toFixed(1)}x
                </span>
                {iqZoom > 1.0 && (
                  <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                    (可视视窗: {(currentFile.duration * 1000 / iqZoom).toFixed(2)} ms)
                  </span>
                )}
              </div>

              {/* IQ Controls */}
              <div className="flex items-center space-x-2 text-xs">
                <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200">
                  <button
                    onClick={() => setIqZoom(z => Math.min(32.0, z * 1.4))}
                    className="p-1 hover:bg-white rounded text-slate-600 cursor-pointer"
                    title="放大波形 (滚轮向上)"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIqZoom(z => Math.max(1.0, z / 1.4))}
                    disabled={iqZoom <= 1.0}
                    className="p-1 hover:bg-white rounded text-slate-600 disabled:opacity-40 cursor-pointer"
                    title="缩小波形 (滚轮向下)"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleResetIqZoom}
                    disabled={iqZoom <= 1.0 && iqPan === 0}
                    className="p-1 hover:bg-white rounded text-slate-600 disabled:opacity-40 cursor-pointer text-[10px] font-mono px-1"
                    title="重置"
                  >
                    1x
                  </button>
                </div>

                <div className="flex items-center space-x-2 text-[11px] pl-1">
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-0.5 bg-blue-600 rounded-full inline-block" />
                    <span className="text-slate-500 font-mono text-[10px]">I (同相)</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2 h-0.5 bg-orange-500 rounded-full inline-block" />
                    <span className="text-slate-500 font-mono text-[10px]">Q (正交)</span>
                  </span>
                </div>
              </div>
            </div>

            {/* 100% Full-width Waveform Canvas */}
            <div className={`relative w-full bg-slate-50 rounded border border-slate-100 overflow-hidden cursor-grab active:cursor-grabbing ${
              layoutMode === 'iq_max' ? 'h-64' : 'h-32'
            }`}>
              <canvas 
                ref={iqCanvasRef} 
                width={800} 
                height={layoutMode === 'iq_max' ? 256 : 128} 
                onWheel={handleIqWheel}
                onMouseDown={handleIqMouseDown}
                onMouseMove={handleIqMouseMove}
                onMouseUp={handleIqMouseUp}
                onMouseLeave={() => { setIsIqDragging(false); setCursorPos(null); }}
                className="w-full h-full" 
              />
              <div className="absolute left-2 top-1 text-[9px] font-mono text-slate-400">幅度 (A)</div>
              <div className="absolute right-2 bottom-1 text-[9px] font-mono text-slate-400">
                滚轮缩放 / 拖拽漫游
              </div>

              {/* Viewport mini scrubber bar */}
              {iqZoom > 1.0 && (
                <div className="absolute bottom-1 left-16 right-20 h-1.5 bg-slate-300/80 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full"
                    style={{
                      marginLeft: `${iqPan * 100}%`,
                      width: `${(1 / iqZoom) * 100}%`
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Constellation & FFT in iq_max mode */}
        {layoutMode === 'iq_max' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-800 mb-2">功率谱密度 (FFT)</div>
              <div className="w-full h-40 bg-slate-50 rounded border border-slate-100 overflow-hidden">
                <canvas ref={fftCanvasRef} width={400} height={160} className="w-full h-full" />
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs font-bold text-slate-800 mb-2">I/Q 星座图 (Constellation)</div>
              <div className="w-full h-40 bg-slate-50 rounded border border-slate-100 flex items-center justify-center overflow-hidden">
                <canvas ref={constellCanvasRef} width={240} height={160} className="max-w-full" />
              </div>
            </div>
          </div>
        )}

        {/* Feature Dashboard Mode */}
        {layoutMode === 'feature' && (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 flex-1">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800">射频物理层统计与个体指纹参数 (RF Fingerprinting)</h3>
                <p className="text-xs text-slate-500 mt-0.5">面向 IQStudio 物理特征提取与对比学习多维特征</p>
              </div>
              <span className="px-2 py-1 bg-blue-50 text-blue-700 font-mono text-xs rounded border border-blue-200 font-semibold">
                SEI (Specific Emitter Identification)
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: '载波频偏 (CFO)', val: `${currentFile.cfo} Hz`, desc: '振荡器硬件频偏' },
                { label: '峰均比 (PAPR)', val: `${currentFile.papr} dB`, desc: '功放非线性特征' },
                { label: '峭度 (Kurtosis)', val: currentFile.kurtosis.toFixed(2), desc: '高阶矩统计分布' },
                { label: '偏度 (Skewness)', val: currentFile.skewness.toFixed(2), desc: '非对称能量偏度' },
                { label: '谱质心', val: `${currentFile.spectralCentroid} MHz`, desc: '能量重心分布' },
                { label: '谱熵 (Entropy)', val: currentFile.spectralEntropy.toFixed(2), desc: '频带信息复杂度' },
              ].map((m, i) => (
                <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="text-[11px] text-slate-500">{m.label}</div>
                  <div className="text-lg font-bold font-mono text-slate-900 mt-1">{m.val}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{m.desc}</div>
                </div>
              ))}
            </div>

            <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-slate-700 space-y-2">
              <div className="font-semibold text-blue-900 flex items-center space-x-1.5">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>个体指纹置信度分析</span>
              </div>
              <p className="leading-relaxed text-slate-600">
                该样本采集自 <strong className="text-slate-800">{currentFile.device}</strong> (个体标识: <strong className="font-mono text-blue-700">{currentFile.individualId}</strong>)。
                时域包络起始段具有显著的锁相环(PLL)启动瞬态震荡，相位噪声抖动在 -98 dBc/Hz 附近，符合 IEEE 802.11 物理层收发器指纹特征。
              </p>
            </div>
          </div>
        )}

        {/* 3. SLEEK INTEGRATED AUDIO PLAYBACK CONTROL STRIP */}
        <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs flex items-center space-x-3 shrink-0">
          <button
            onClick={handleTogglePlay}
            className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition shadow-xs cursor-pointer shrink-0"
            title={isPlaying ? '暂停音频解调' : '播放射频下变频音频仿真'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
          </button>

          <div className="flex-1 flex items-center space-x-2">
            <span className="text-[11px] font-mono text-slate-600 w-20 tabular-nums">
              {((playbackProgress / 100) * currentFile.duration).toFixed(3)}s
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="0.5"
              value={playbackProgress}
              onChange={(e) => setPlaybackProgress(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-[11px] font-mono text-slate-400 tabular-nums">
              {currentFile.duration}s
            </span>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <select
              value={playSpeed}
              onChange={(e) => setPlaySpeed(e.target.value)}
              className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-medium text-slate-700 text-[11px] outline-none"
            >
              <option value="0.5x">0.5x</option>
              <option value="1x">1.0x</option>
              <option value="2x">2.0x</option>
            </select>
          </div>
        </div>

        {/* 4. COMPACT COLLAPSIBLE VISUAL PARAMETERS TRAY */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden shrink-0">
          {/* Header Bar */}
          <div 
            onClick={() => setShowParamTray(!showParamTray)}
            className="px-3 py-1.5 flex items-center justify-between text-xs text-slate-600 bg-slate-50/60 cursor-pointer hover:bg-slate-100 transition"
          >
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-semibold text-slate-700 text-[11px]">时频参数:</span>
              <span className="font-mono text-[10px] text-slate-500">
                FFT: {vizParams.fftSize} · {vizParams.windowType}窗 · 步长:{vizParams.stepLength} · 色板:{vizParams.colorMap} · 动态范围:{vizParams.dynamicRange}dB
              </span>
            </div>

            <div className="flex items-center space-x-1 text-[11px] text-slate-500">
              <span>{showParamTray ? '收起配置' : '展开调节'}</span>
              {showParamTray ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </div>

          {/* Collapsible Form Content */}
          {showParamTray && (
            <div className="p-3 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 text-xs animate-in slide-in-from-top-1 duration-150">
              <div>
                <label className="block text-slate-500 mb-0.5 text-[10px]">FFT 点数</label>
                <select 
                  value={vizParams.fftSize} 
                  onChange={(e) => setVizParams(prev => ({ ...prev, fftSize: parseInt(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-mono text-xs"
                >
                  <option value="256">256</option>
                  <option value="512">512</option>
                  <option value="1024">1024</option>
                  <option value="2048">2048</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-0.5 text-[10px]">窗函数类型</label>
                <select 
                  value={vizParams.windowType} 
                  onChange={(e) => setVizParams(prev => ({ ...prev, windowType: e.target.value as VizParams['windowType'] }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 text-xs"
                >
                  <option value="Hann">Hann (汉宁窗)</option>
                  <option value="Hamming">Hamming (海明窗)</option>
                  <option value="Blackman">Blackman</option>
                  <option value="Rectangular">Rectangular</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-0.5 text-[10px]">步长 (Step)</label>
                <select 
                  value={vizParams.stepLength} 
                  onChange={(e) => setVizParams(prev => ({ ...prev, stepLength: parseInt(e.target.value) }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 font-mono text-xs"
                >
                  <option value="64">64</option>
                  <option value="128">128</option>
                  <option value="256">256</option>
                  <option value="512">512</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-0.5 text-[10px]">色彩映射 (Colormap)</label>
                <select 
                  value={vizParams.colorMap} 
                  onChange={(e) => setVizParams(prev => ({ ...prev, colorMap: e.target.value as VizParams['colorMap'] }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-700 text-xs font-mono"
                >
                  <option value="viridis">viridis (推荐)</option>
                  <option value="plasma">plasma (高动态)</option>
                  <option value="inferno">inferno (辐射)</option>
                  <option value="turbo">turbo (彩虹)</option>
                  <option value="jet">jet (经典)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-0.5 text-[10px]">动态范围 (dB): {vizParams.dynamicRange}</label>
                <input 
                  type="range"
                  min="60"
                  max="160"
                  value={vizParams.dynamicRange}
                  onChange={(e) => setVizParams(prev => ({ ...prev, dynamicRange: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600 mt-1" 
                />
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
};
