// Tone.js is loaded via CDN and available as window.Tone

export interface AudioConfig {
  synth: {
    type: string;
    options: {
      oscillator: {
        type: string;
      };
      envelope: {
        attack: number;
        decay: number;
        sustain: number;
        release: number;
      };
    };
  };
  filter: {
    type: string;
    frequency: number;
    Q: number;
  };
  mappings: {
    frequency: {
      min: number;
      max: number;
    };
    filterCutoff: {
      min: number;
      max: number;
    };
    volume: {
      min: number;
      max: number;
    };
    pan: {
      min: number;
      max: number;
    };
    modulationDepth: {
      min: number;
      max: number;
    };
    distortion: {
      min: number;
      max: number;
    };
    reverb: {
      min: number;
      max: number;
    };
    pluckThreshold: number;
  };
  curves: {
    volume: number; // Power curve exponent for volume (0.6 = less aggressive, 1.0 = linear)
    frequency: number; // Power curve exponent for frequency (1.0 = linear)
    filterCutoff: number; // Power curve exponent for filter cutoff (2.0 = exponential)
    distortion: number; // Power curve exponent for distortion (1.5 = moderate curve)
    reverb: number; // Power curve exponent for reverb (1.0 = linear)
  };
  rampTime: number;
}

/**
 * Custom Tone.js audio configuration
 */
export const audioConfig: AudioConfig = {
  // Synth configuration
  synth: {
    type: 'Synth', // Can be 'Synth', 'AMSynth', 'FMSynth', etc.
    options: {
      oscillator: {
        type: 'sine',
      },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.5,
        release: 0.5,
      },
    },
  },

  // Filter configuration
  filter: {
    type: 'lowpass',
    frequency: 200,
    Q: 1,
  },

  // Parameter mappings (tension is normalized to [0, 1])
  mappings: {
    // Frequency range: 220Hz to 880Hz (wider range, will be affected by both position and tension)
    frequency: {
      min: 220,
      max: 880,
    },
    // Filter cutoff range: 200Hz to 8000Hz (wider range, responds to tension)
    filterCutoff: {
      min: 200,
      max: 8000,
    },
    // Volume mapping: -30dB to 0dB (much wider dynamic range)
    volume: {
      min: -30, // dB
      max: 0,   // dB
    },
    // Stereo pan range: -1 (left) to 1 (right)
    pan: {
      min: -1,
      max: 1,
    },
    // Modulation depth (for LFO or vibrato)
    modulationDepth: {
      min: 0,
      max: 10, // Hz
    },
    // Distortion amount (0 to 0.8)
    distortion: {
      min: 0,
      max: 0.8,
    },
    // Reverb wet level (0 to 0.5)
    reverb: {
      min: 0,
      max: 0.5,
    },
    // Pluck velocity threshold (change per second)
    pluckThreshold: 0.1,
  },

  // Curve parameters for different mappings
  curves: {
    volume: 0.8, // Slightly less aggressive than before for better sensitivity
    frequency: 1.0, // Linear mapping
    filterCutoff: 2.0, // Exponential for more dramatic brightness changes
    distortion: 1.5, // Moderate curve
    reverb: 1.0, // Linear mapping
  },

  // Ramp time for smooth parameter transitions (in seconds)
  rampTime: 0.05,
};

export interface AudioObjects {
  synth: Tone.Synth;
  filter: Tone.Filter;
  distortion?: Tone.Distortion;
  reverb?: Tone.Reverb;
  lfo?: Tone.LFO;
  panNode?: Tone.Panner;
  destination: AudioDestinationNode;
  modulationDepth?: number;
}

/**
 * Initialize audio system with custom configuration
 */
export function initAudio(config: AudioConfig = audioConfig): AudioObjects {
  if (typeof window === 'undefined' || !window.Tone) {
    throw new Error('Tone.js is not loaded. Make sure the CDN script is included.');
  }

  const Tone = window.Tone;

  // Create synth based on config
  let synth: Tone.Synth;
  try {
    synth = new Tone[config.synth.type as 'Synth'](config.synth.options) as Tone.Synth;
  } catch (error) {
    // Fallback to default Synth if specified type doesn't exist
    console.warn(`Failed to create synth type "${config.synth.type}", using default Synth:`, error);
    synth = new Tone.Synth(config.synth.options) as Tone.Synth;
  }

  // Set explicit min/max for frequency signal to prevent range errors
  // Tone.js Signals need valid ranges, especially when connected to LFOs
  try {
    if ('min' in synth.frequency && 'max' in synth.frequency) {
      (synth.frequency as any).min = config.mappings.frequency.min;
      (synth.frequency as any).max = config.mappings.frequency.max;
    }
  } catch (error) {
    // Silently handle if min/max properties can't be set (they might be read-only)
    console.warn('Could not set frequency signal min/max:', error);
  }
  
  // Set initial frequency value to ensure signal is in valid state
  try {
    synth.frequency.value = config.mappings.frequency.min;
  } catch (error) {
    // Fallback: try using rampTo or setValueAtTime if direct assignment fails
    console.warn('Could not set initial frequency value:', error);
  }

  // Create filter
  const filter = new Tone.Filter(config.filter);

  // Create distortion
  const distortion = new Tone.Distortion(0);
  
  // Create reverb
  const reverb = new Tone.Reverb({
    roomSize: 0.7,
    wet: 0,
  });
  // Generate reverb impulse response (async)
  reverb.generate().catch(() => {
    // Silently handle reverb generation failures
  });

  // Create LFO for vibrato/modulation
  // LFO will modulate frequency by adding/subtracting from base frequency
  // Set initial range to allow full frequency range (will be adjusted dynamically)
  let lfo: Tone.LFO | undefined;
  try {
    lfo = new Tone.LFO({
      frequency: 5, // Base vibrato rate (Hz)
      min: -config.mappings.frequency.max * 0.1, // Allow modulation up to 10% of max frequency
      max: config.mappings.frequency.max * 0.1, // Allow modulation up to 10% of max frequency
    });
    lfo.start();
  } catch (error) {
    // If LFO creation fails, continue without vibrato
    console.warn('Failed to create LFO, continuing without vibrato:', error);
  }

  // Create pan node for stereo panning
  const panNode = new Tone.Panner();
  // Initialize pan to center (0) so audio comes out of both speakers
  panNode.pan.value = 0;

  // Connect: synth -> filter -> distortion -> reverb -> panNode -> destination
  synth.connect(filter);
  filter.connect(distortion);
  distortion.connect(reverb);
  reverb.connect(panNode);
  panNode.toDestination();

  // Connect LFO to synth frequency for vibrato
  // The LFO will add/subtract Hz from the base frequency
  // Note: This connection happens after setting frequency signal range
  if (lfo) {
    try {
      lfo.connect(synth.frequency);
    } catch (error) {
      // If LFO connection fails, continue without vibrato
      console.warn('Failed to connect LFO to frequency, continuing without vibrato:', error);
    }
  }

  return { 
    synth, 
    filter, 
    distortion, 
    reverb, 
    lfo, 
    panNode, 
    destination: Tone.Destination 
  };
}

import { StringControls } from './utils';

/**
 * Apply curve to normalized value (0-1)
 */
function applyCurve(value: number, curve: number): number {
  const clamped = Math.max(0, Math.min(1, value));
  if (curve === 1.0) {
    return clamped; // Linear
  }
  return Math.pow(clamped, curve);
}

/**
 * Update audio parameters based on enhanced string controls
 * @param controls - String control values
 * @param audio - Audio objects
 * @param midpointX - X position of midpoint between endpoints (for pitch calculation)
 * @param canvasWidth - Width of canvas (for normalizing midpoint X position)
 * @param config - Audio configuration
 */
export function updateAudio(
  controls: StringControls,
  audio: AudioObjects,
  midpointX: number,
  canvasWidth: number,
  config: AudioConfig = audioConfig
): void {
  // Wrap entire function in try-catch to prevent crashes
  try {
    const { synth, filter, distortion, reverb, lfo } = audio;
    const { mappings, rampTime, curves } = config;
  const {
    tension,
    angle,
  } = controls;

  // Apply curves to tension for different parameters
  const tensionForVolume = applyCurve(tension, curves.volume);
  const tensionForFrequency = applyCurve(tension, curves.frequency);
  const tensionForFilter = applyCurve(tension, curves.filterCutoff);
  const tensionForDistortion = applyCurve(tension, curves.distortion);
  const tensionForReverb = applyCurve(tension, curves.reverb);

  // Map tension to volume with wider range (-30dB to 0dB)
  const volume =
    mappings.volume.min +
    tensionForVolume * (mappings.volume.max - mappings.volume.min);

  // Map frequency: hybrid approach - base frequency from position, tension adds range
  // Normalize midpoint X relative to canvas width
  // Guard against division by zero, invalid canvas width, NaN, or Infinity
  const safeCanvasWidth = isNaN(canvasWidth) || !isFinite(canvasWidth) || canvasWidth <= 0 
    ? 1 
    : Math.max(1, canvasWidth);
  const safeMidpointX = isNaN(midpointX) || !isFinite(midpointX) ? 0 : midpointX;
  const normalizedX = Math.max(0, Math.min(1, safeMidpointX / safeCanvasWidth));
  
  // Base frequency from position (220Hz to 660Hz)
  const baseFrequencyMin = mappings.frequency.min;
  const baseFrequencyMax = mappings.frequency.min + (mappings.frequency.max - mappings.frequency.min) * 0.75;
  const baseFrequency = baseFrequencyMin + normalizedX * (baseFrequencyMax - baseFrequencyMin);
  
  // Tension adds additional range on top (up to full max)
  const tensionFrequencyRange = mappings.frequency.max - baseFrequencyMax;
  let frequency = baseFrequency + tensionForFrequency * tensionFrequencyRange;
  
  // Clamp frequency to valid range (Tone.js requires positive frequency, typically 20Hz-20000Hz)
  // Use the configured min/max as bounds, but ensure it's never too small
  const minFrequency = Math.max(20, mappings.frequency.min); // At least 20Hz (human hearing range)
  const maxFrequency = Math.min(20000, mappings.frequency.max); // At most 20kHz (human hearing range)
  frequency = Math.max(minFrequency, Math.min(maxFrequency, frequency));
  
  // Final validation: ensure frequency is a valid number
  if (isNaN(frequency) || !isFinite(frequency) || frequency <= 0) {
    frequency = mappings.frequency.min; // Fallback to minimum configured frequency
  }

  // Map tension to filter cutoff (brighter as tension increases)
  let filterCutoff =
    mappings.filterCutoff.min +
    tensionForFilter * (mappings.filterCutoff.max - mappings.filterCutoff.min);
  // Clamp filter cutoff to valid range (20Hz to 20000Hz)
  filterCutoff = Math.max(20, Math.min(20000, filterCutoff));

  // Map tension to distortion amount
  const distortionAmount =
    mappings.distortion.min +
    tensionForDistortion * (mappings.distortion.max - mappings.distortion.min);

  // Map tension to reverb wet level
  const reverbWet =
    mappings.reverb.min +
    tensionForReverb * (mappings.reverb.max - mappings.reverb.min);

  // Map angle to modulation depth (normalized angle [-1, 1] → modulation depth in Hz)
  // This controls how much the LFO modulates the frequency
  let modulationDepth =
    mappings.modulationDepth.min +
    (Math.abs(angle) * (mappings.modulationDepth.max - mappings.modulationDepth.min));
  // Ensure modulation depth is non-negative and reasonable
  modulationDepth = Math.max(0, Math.min(50, modulationDepth)); // Clamp to 0-50Hz

  // Update synth frequency (pitch) - responds to both position and tension
  // Ensure frequency and rampTime are valid before ramping
  const safeRampTime = Math.max(0, Math.min(1, rampTime || 0.05)); // Clamp rampTime to 0-1 seconds
  if (!isNaN(frequency) && isFinite(frequency) && frequency > 0) {
    // Ensure frequency is within valid audio range
    const clampedFrequency = Math.max(20, Math.min(20000, frequency));
    try {
      synth.frequency.rampTo(clampedFrequency, safeRampTime);
    } catch (error) {
      // If rampTo fails, try setting value directly as fallback
      console.warn(`rampTo failed for frequency ${clampedFrequency}, using direct value assignment:`, error);
      synth.frequency.value = clampedFrequency;
    }
  } else {
    // Fallback: set to a safe default if calculation produced invalid value
    console.warn(`Invalid frequency value: ${frequency}, using default ${mappings.frequency.min}Hz`);
    synth.frequency.value = mappings.frequency.min;
  }

  // Update volume with wider dynamic range
  synth.volume.rampTo(volume, rampTime);

  // Update filter cutoff based on tension
  filter.frequency.rampTo(filterCutoff, rampTime);

  // Update distortion amount
  if (distortion) {
    distortion.distortion = distortionAmount;
  }

  // Update reverb wet level
  if (reverb) {
    reverb.wet.rampTo(reverbWet, rampTime);
  }

  // Update LFO depth for vibrato based on angle
  // LFO oscillates between -modulationDepth and +modulationDepth Hz
  // This adds/subtracts from the base frequency
  if (lfo) {
    lfo.min.rampTo(-modulationDepth, rampTime);
    lfo.max.rampTo(modulationDepth, rampTime);
  }

  // Center the pan (set to 0) so audio comes out of both speakers
  if (audio.panNode) {
    audio.panNode.pan.rampTo(0, rampTime);
  }

  // Store modulation depth for reference
  if (audio.modulationDepth !== undefined) {
    audio.modulationDepth = modulationDepth;
  }
  } catch (error) {
    // Log error but don't crash the component
    console.error('Error updating audio parameters:', error);
  }
}
