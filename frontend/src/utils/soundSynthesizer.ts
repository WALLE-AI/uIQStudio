// Web Audio API baseband downconversion sound simulator for radio signals
import { SignalSample } from '../types/radio';

class RadioSoundSynthesizer {
  private ctx: AudioContext | null = null;
  private osc: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private isPlaying = false;
  private animFrameId: number | null = null;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public play(sample: SignalSample, onProgress?: (p: number) => void, onEnd?: () => void) {
    this.stop();
    this.initContext();
    if (!this.ctx) return;

    this.isPlaying = true;
    const duration = 2.0; // Play preview segment 2s
    const startTime = this.ctx.currentTime;

    // Master gain
    this.gainNode = this.ctx.createGain();
    this.gainNode.gain.setValueAtTime(0.18, startTime);
    this.gainNode.connect(this.ctx.destination);

    // Filter to simulate radio receiver passband
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, startTime);
    filter.Q.setValueAtTime(3.0, startTime);
    filter.connect(this.gainNode);

    // Oscillator setup based on signal profile
    this.osc = this.ctx.createOscillator();

    if (sample.profileType === 'chirp') {
      // LoRa sweep: 400Hz -> 2400Hz repeating
      this.osc.type = 'sine';
      for (let t = 0; t < duration; t += 0.25) {
        this.osc.frequency.setValueAtTime(350, startTime + t);
        this.osc.frequency.exponentialRampToValueAtTime(2200, startTime + t + 0.22);
      }
    } else if (sample.profileType === 'ofdm') {
      // UAV / Wi-Fi burst: modulated pulse tone + buzzing
      this.osc.type = 'sawtooth';
      this.osc.frequency.setValueAtTime(650, startTime);
      // Burst amplitude gating
      const burstGain = this.ctx.createGain();
      for (let t = 0; t < duration; t += 0.08) {
        burstGain.gain.setValueAtTime(0.3, startTime + t);
        burstGain.gain.exponentialRampToValueAtTime(0.01, startTime + t + 0.06);
      }
      this.osc.connect(burstGain);
      burstGain.connect(filter);
    } else if (sample.profileType === 'pulse') {
      // ADS-B PPM: sharp beeps
      this.osc.type = 'sine';
      this.osc.frequency.setValueAtTime(1800, startTime);
      const pulseGain = this.ctx.createGain();
      for (let t = 0; t < duration; t += 0.15) {
        pulseGain.gain.setValueAtTime(0.4, startTime + t);
        pulseGain.gain.setValueAtTime(0, startTime + t + 0.02);
        pulseGain.gain.setValueAtTime(0.4, startTime + t + 0.04);
        pulseGain.gain.setValueAtTime(0, startTime + t + 0.06);
      }
      this.osc.connect(pulseGain);
      pulseGain.connect(filter);
    } else if (sample.profileType === 'fsk') {
      // FSK dual-tone: 800Hz / 1400Hz
      this.osc.type = 'square';
      for (let t = 0; t < duration; t += 0.06) {
        const f = ((Math.sin(t * 30) > 0) ? 880 : 1480);
        this.osc.frequency.setValueAtTime(f, startTime + t);
      }
      this.osc.connect(filter);
    } else {
      // Default / QAM: smooth carrier with white noise
      this.osc.type = 'triangle';
      this.osc.frequency.setValueAtTime(920, startTime);
      this.osc.connect(filter);
    }

    if (sample.profileType !== 'ofdm' && sample.profileType !== 'pulse') {
      this.osc.connect(filter);
    }

    this.osc.start(startTime);
    this.osc.stop(startTime + duration);

    // Animate progress
    const updateProgress = () => {
      if (!this.isPlaying || !this.ctx) return;
      const elapsed = this.ctx.currentTime - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      if (onProgress) onProgress(pct);

      if (elapsed < duration) {
        this.animFrameId = requestAnimationFrame(updateProgress);
      } else {
        this.isPlaying = false;
        if (onEnd) onEnd();
      }
    };
    this.animFrameId = requestAnimationFrame(updateProgress);
  }

  public stop() {
    this.isPlaying = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.osc) {
      try {
        this.osc.stop();
        this.osc.disconnect();
      } catch {
        // Ignored
      }
      this.osc = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {
        // Ignored
      }
      this.gainNode = null;
    }
  }
}

export const radioAudio = new RadioSoundSynthesizer();
