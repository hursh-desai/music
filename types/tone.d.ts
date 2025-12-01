// Type definitions for Tone.js loaded via CDN
declare global {
  interface Window {
    Tone: typeof Tone;
  }
}

declare namespace Tone {
  interface Synth {
    frequency: Signal;
    triggerAttack(note: string, time?: number): void;
    triggerRelease(time?: number): void;
    dispose(): void;
    connect(destination: AudioNode | AudioParam): Synth;
  }

  interface Filter {
    frequency: Signal;
    dispose(): void;
    connect(destination: AudioNode | AudioParam): Filter;
  }

  interface Panner {
    pan: Signal;
    dispose(): void;
    toDestination(): Panner;
  }

  interface Signal {
    rampTo(value: number, rampTime: number): void;
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

  const Filter: FilterConstructor;
  const Synth: SynthConstructor;
  const Panner: PannerConstructor;
  const Destination: AudioDestinationNode;
  const context: AudioContext;

  function start(): Promise<void>;
  function now(): number;
}

export {};

