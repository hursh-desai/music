// Type definitions for Tone.js loaded via CDN
// This file makes Tone namespace available globally

declare global {
  namespace Tone {
    interface Signal {
      value: number;
      rampTo(value: number, rampTime: number): void;
    }

    interface Synth {
      frequency: Signal;
      volume: Signal;
      triggerAttack(note: string, time?: number): void;
      triggerRelease(time?: number): void;
      dispose(): void;
      connect(destination: any): Synth;
    }

    interface Filter {
      frequency: Signal;
      dispose(): void;
      connect(destination: any): Filter;
    }

    interface Panner {
      pan: Signal;
      dispose(): void;
      toDestination(): Panner;
      connect(destination: any): Panner;
    }

    interface Distortion {
      distortion: Signal;
      dispose(): void;
      connect(destination: any): Distortion;
    }

    interface Reverb {
      roomSize: Signal;
      wet: Signal;
      generate(): Promise<void>;
      dispose(): void;
      connect(destination: any): Reverb;
    }

    interface LFO {
      frequency: Signal;
      min: Signal;
      max: Signal;
      start(): void;
      stop(): void;
      dispose(): void;
      connect(destination: any): LFO;
    }

  interface FilterConstructor {
    new (options?: { type?: string; frequency?: number; Q?: number }): Filter;
  }

  interface SynthConstructor {
    new (options?: {
      oscillator?: { type?: string };
      envelope?: { attack?: number; decay?: number; sustain?: number; release?: number };
    }): Synth;
  }

  interface PannerConstructor {
    new (): Panner;
  }

  interface DistortionConstructor {
    new (distortion?: number): Distortion;
  }

  interface ReverbConstructor {
    new (options?: { roomSize?: number; wet?: number }): Reverb;
  }

  interface LFOConstructor {
    new (options?: { frequency?: number; min?: number; max?: number }): LFO;
  }

  const Filter: FilterConstructor;
  const Synth: SynthConstructor;
  const Panner: PannerConstructor;
  const Distortion: DistortionConstructor;
  const Reverb: ReverbConstructor;
  const LFO: LFOConstructor;
  const Destination: AudioDestinationNode;
  const context: AudioContext;

    function start(): Promise<void>;
    function now(): number;
  }

  interface Window {
    Tone: typeof Tone;
  }
}

export {};

