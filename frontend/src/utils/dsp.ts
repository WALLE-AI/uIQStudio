import { SignalSample, VizParams } from '../types/radio';

export interface IQData {
  i: Float32Array;
  q: Float32Array;
  length: number;
}

export interface FFTResult {
  frequencies: Float32Array; // Relative or absolute MHz
  magnitudes: Float32Array;   // Power in dB
  peakFreq: number;
  peakPower: number;
}

export interface STFTResult {
  spectrogram: Float32Array[]; // [timeFrames][freqBins] in dB
  numFrames: number;
  numBins: number;
}

// Generate realistic IQ synthetic data for demonstration and interactive exploration
export function generateSyntheticIQ(sample: SignalSample, numPoints: number = 2048): IQData {
  const i = new Float32Array(numPoints);
  const q = new Float32Array(numPoints);
  
  const snrLinear = Math.pow(10, sample.snr / 20);
  const noiseScale = 0.15 / (snrLinear + 0.1);
  const seed = (sample.freq % 100) + sample.bw;

  for (let idx = 0; idx < numPoints; idx++) {
    const t = idx / numPoints;
    let sigI = 0;
    let sigQ = 0;

    switch (sample.profileType) {
      case 'ofdm': {
        // Multi-carrier OFDM burst with preamble and subcarriers
        const numSubcarriers = 8;
        const burstWindow = (Math.sin(t * Math.PI * 4) > -0.2) ? 1.0 : 0.05;
        for (let k = 1; k <= numSubcarriers; k++) {
          const f_k = (k - numSubcarriers / 2) * 12;
          const phase = idx * 0.05 * f_k + (seed * k * 0.1);
          sigI += Math.cos(phase) / numSubcarriers;
          sigQ += Math.sin(phase) / numSubcarriers;
        }
        sigI *= burstWindow;
        sigQ *= burstWindow;
        break;
      }
      case 'chirp': {
        // LoRa CSS: linear chirp sweep
        const chirpPeriod = 0.25;
        const phaseInChirp = (t % chirpPeriod) / chirpPeriod;
        const instFreq = 10 + 60 * phaseInChirp;
        const phase = 2 * Math.PI * instFreq * t;
        sigI = Math.cos(phase) * 0.85;
        sigQ = Math.sin(phase) * 0.85;
        break;
      }
      case 'pulse': {
        // ADS-B PPM: pulse position modulation bursts
        const pulseCycle = (idx % 180);
        const inPulse = pulseCycle < 25 || (pulseCycle > 50 && pulseCycle < 75);
        if (inPulse) {
          const carrier = idx * 0.4;
          sigI = Math.cos(carrier) * 0.9;
          sigQ = Math.sin(carrier) * 0.9;
        } else {
          sigI = 0;
          sigQ = 0;
        }
        break;
      }
      case 'fsk': {
        // 2-FSK / 4-FSK frequency hopping symbols
        const symbol = Math.floor(idx / 128) % 4;
        const freqOffset = (symbol - 1.5) * 8;
        const phase = idx * (0.15 + freqOffset * 0.02);
        sigI = Math.cos(phase) * 0.8;
        sigQ = Math.sin(phase) * 0.8;
        break;
      }
      case 'radar': {
        // FMCW Radar triangular wave chirp
        const ramp = Math.abs((t * 6) % 2 - 1); // 0 -> 1 -> 0
        const freqOffset = 5 + ramp * 45;
        const phase = 2 * Math.PI * freqOffset * t;
        sigI = Math.cos(phase) * 0.9;
        sigQ = Math.sin(phase) * 0.9;
        break;
      }
      case 'qam':
      default: {
        // QPSK / 16-QAM symbol sequence with pulse shaping
        const symbolIdx = Math.floor(idx / 64);
        const randI = ((symbolIdx * 37) % 4) - 1.5;
        const randQ = ((symbolIdx * 73) % 4) - 1.5;
        const carrier = idx * 0.2;
        sigI = randI * Math.cos(carrier) * 0.5;
        sigQ = randQ * Math.sin(carrier) * 0.5;
        break;
      }
    }

    // Add AWGN Gaussian noise
    const u1 = Math.max(1e-6, Math.random());
    const u2 = Math.random();
    const noiseI = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2) * noiseScale;
    const noiseQ = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2) * noiseScale;

    i[idx] = Math.max(-1.5, Math.min(1.5, sigI + noiseI));
    q[idx] = Math.max(-1.5, Math.min(1.5, sigQ + noiseQ));
  }

  return { i, q, length: numPoints };
}

// Windowing functions
export function applyWindow(data: Float32Array, windowType: VizParams['windowType']): Float32Array {
  const n = data.length;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let w = 1.0;
    if (windowType === 'Hann') {
      w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
    } else if (windowType === 'Hamming') {
      w = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (n - 1));
    } else if (windowType === 'Blackman') {
      w = 0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)) + 0.08 * Math.cos((4 * Math.PI * i) / (n - 1));
    }
    out[i] = data[i] * w;
  }
  return out;
}

// Compute FFT Power Spectrum (dB)
export function computeFFTSpectrum(iq: IQData, fftSize: number = 512, centerFreqMHz: number = 2437, bandwidthMHz: number = 20): FFTResult {
  const halfSize = fftSize / 2;
  const magnitudes = new Float32Array(fftSize);
  const frequencies = new Float32Array(fftSize);

  // Compute power spectral density approximation based on IQ components
  let peakPower = -120;
  let peakIdx = 0;

  for (let k = 0; k < fftSize; k++) {
    // Frequency axis centered at centerFreqMHz
    const relOffset = ((k - halfSize) / halfSize) * (bandwidthMHz / 2);
    frequencies[k] = centerFreqMHz + relOffset;

    let realSum = 0;
    let imagSum = 0;

    // DFT summation over a subset of samples for responsive UI performance
    const step = 2;
    for (let n = 0; n < Math.min(iq.length, 256); n += step) {
      const angle = (2 * Math.PI * k * n) / fftSize;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      
      const sampleI = iq.i[n] || 0;
      const sampleQ = iq.q[n] || 0;

      // Complex multiplication: (I + jQ) * (cos - j*sin)
      realSum += sampleI * cosA + sampleQ * sinA;
      imagSum += sampleQ * cosA - sampleI * sinA;
    }

    const powerLinear = (realSum * realSum + imagSum * imagSum) / 256 + 1e-10;
    const powerDb = 10 * Math.log10(powerLinear) - 10;
    magnitudes[k] = powerDb;

    if (powerDb > peakPower) {
      peakPower = powerDb;
      peakIdx = k;
    }
  }

  return {
    frequencies,
    magnitudes,
    peakFreq: frequencies[peakIdx],
    peakPower,
  };
}

// Compute STFT matrix for Spectrogram (frames x bins)
export function computeSTFT(
  iq: IQData, 
  fftSize: number = 128, 
  stepSize: number = 32, 
  windowType: VizParams['windowType'] = 'Hann'
): STFTResult {
  const numFrames = Math.floor((iq.length - fftSize) / stepSize);
  const numBins = fftSize;
  const spectrogram: Float32Array[] = [];

  for (let f = 0; f < numFrames; f++) {
    const frameData = new Float32Array(numBins);
    const startIdx = f * stepSize;

    for (let k = 0; k < numBins; k++) {
      let rSum = 0;
      let iSum = 0;
      for (let n = 0; n < 64; n++) {
        const iqIdx = startIdx + n;
        if (iqIdx >= iq.length) break;

        let w = 1.0;
        if (windowType === 'Hann') {
          w = 0.5 * (1 - Math.cos((2 * Math.PI * n) / 63));
        }

        const angle = (2 * Math.PI * k * n) / numBins;
        const sampleI = iq.i[iqIdx] * w;
        const sampleQ = iq.q[iqIdx] * w;

        rSum += sampleI * Math.cos(angle) + sampleQ * Math.sin(angle);
        iSum += sampleQ * Math.cos(angle) - sampleI * Math.sin(angle);
      }

      const pLinear = (rSum * rSum + iSum * iSum) + 1e-8;
      const pDb = 10 * Math.log10(pLinear);
      frameData[k] = pDb;
    }
    spectrogram.push(frameData);
  }

  return {
    spectrogram,
    numFrames,
    numBins,
  };
}

// Colormap color interpolation: normalized value 0.0 to 1.0 -> [R, G, B]
export function getColorFromMap(val: number, map: VizParams['colorMap']): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, val));

  switch (map) {
    case 'viridis': {
      // Perceptually uniform Viridis ramp
      const r = Math.floor(255 * (clamped > 0.6 ? (clamped - 0.6) * 2.5 : 0.2 * clamped));
      const g = Math.floor(255 * (clamped < 0.8 ? clamped * 1.2 : 0.96));
      const b = Math.floor(255 * (clamped < 0.3 ? 0.3 + clamped * 2 : 0.9 - clamped * 0.7));
      return [r, g, b];
    }
    case 'plasma': {
      const r = Math.floor(255 * (0.05 + clamped * 0.95));
      const g = Math.floor(255 * Math.sin(clamped * Math.PI * 0.85));
      const b = Math.floor(255 * (1 - clamped * 0.8));
      return [r, g, b];
    }
    case 'inferno': {
      const r = Math.floor(255 * (clamped < 0.5 ? clamped * 1.8 : 0.9 + clamped * 0.1));
      const g = Math.floor(255 * (clamped < 0.4 ? 0 : (clamped - 0.4) * 1.6));
      const b = Math.floor(255 * (clamped < 0.7 ? clamped * 0.3 : (clamped - 0.7) * 2.5));
      return [r, g, b];
    }
    case 'turbo': {
      // Google Turbo Colormap approximation
      const r = Math.floor(255 * Math.max(0, Math.sin((clamped - 0.25) * Math.PI)));
      const g = Math.floor(255 * Math.max(0, Math.sin((clamped - 0.5) * Math.PI)));
      const b = Math.floor(255 * Math.max(0, Math.cos(clamped * Math.PI * 0.5)));
      return [r, g, b];
    }
    case 'jet':
    default: {
      let r = 0, g = 0, b = 0;
      if (clamped < 0.25) {
        r = 0;
        g = Math.floor(4 * clamped * 255);
        b = 255;
      } else if (clamped < 0.5) {
        r = 0;
        g = 255;
        b = Math.floor((1 - 4 * (clamped - 0.25)) * 255);
      } else if (clamped < 0.75) {
        r = Math.floor(4 * (clamped - 0.5) * 255);
        g = 255;
        b = 0;
      } else {
        r = 255;
        g = Math.floor((1 - 4 * (clamped - 0.75)) * 255);
        b = 0;
      }
      return [r, g, b];
    }
  }
}
