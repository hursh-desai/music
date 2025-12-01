'use client';

import { useState, useEffect } from 'react';
import { type AudioConfig } from '@/lib/audioConfig';

interface AudioConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AudioConfig;
  onConfigChange: (config: AudioConfig) => void;
}

export default function AudioConfigModal({
  isOpen,
  onClose,
  config,
  onConfigChange,
}: AudioConfigModalProps) {
  const [localConfig, setLocalConfig] = useState<AudioConfig>(config);

  // Update local config when prop changes
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  if (!isOpen) return null;

  // Deep clone config to avoid mutating the original
  const deepCloneConfig = (config: AudioConfig): AudioConfig => {
    return {
      synth: {
        type: config.synth.type,
        options: {
          oscillator: {
            type: config.synth.options.oscillator.type,
          },
          envelope: {
            attack: config.synth.options.envelope.attack,
            decay: config.synth.options.envelope.decay,
            sustain: config.synth.options.envelope.sustain,
            release: config.synth.options.envelope.release,
          },
        },
      },
      filter: {
        type: config.filter.type,
        frequency: config.filter.frequency,
        Q: config.filter.Q,
      },
      mappings: {
        frequency: {
          min: config.mappings.frequency.min,
          max: config.mappings.frequency.max,
        },
        filterCutoff: {
          min: config.mappings.filterCutoff.min,
          max: config.mappings.filterCutoff.max,
        },
        volume: {
          min: config.mappings.volume.min,
          max: config.mappings.volume.max,
        },
        pan: {
          min: config.mappings.pan.min,
          max: config.mappings.pan.max,
        },
        modulationDepth: {
          min: config.mappings.modulationDepth.min,
          max: config.mappings.modulationDepth.max,
        },
        distortion: {
          min: config.mappings.distortion.min,
          max: config.mappings.distortion.max,
        },
        reverb: {
          min: config.mappings.reverb.min,
          max: config.mappings.reverb.max,
        },
        pluckThreshold: config.mappings.pluckThreshold,
      },
      curves: {
        volume: config.curves.volume,
        frequency: config.curves.frequency,
        filterCutoff: config.curves.filterCutoff,
        distortion: config.curves.distortion,
        reverb: config.curves.reverb,
      },
      rampTime: config.rampTime,
    };
  };

  const handleChange = (path: string[], value: string | number) => {
    const newConfig = deepCloneConfig(localConfig);
    let current: any = newConfig;
    
    // Navigate to the nested property
    for (let i = 0; i < path.length - 1; i++) {
      current = current[path[i]];
    }
    
    // Set the value
    const lastKey = path[path.length - 1];
    if (typeof value === 'number') {
      current[lastKey] = Number(value);
    } else {
      current[lastKey] = value;
    }
    
    setLocalConfig(newConfig);
    // Apply changes immediately
    onConfigChange(newConfig);
  };

  const handleRangeChange = (
    category: string,
    range: 'min' | 'max',
    value: number
  ) => {
    const newConfig = deepCloneConfig(localConfig);
    (newConfig.mappings as any)[category][range] = Number(value);
    setLocalConfig(newConfig);
    onConfigChange(newConfig);
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          maxWidth: '600px',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#666',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f0f0f0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          ×
        </button>

        <h2 style={{ marginTop: 0, marginBottom: '24px', fontSize: '24px' }}>
          Audio Configuration
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Synth Configuration */}
          <section>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>
              Synth
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                  Synth Type
                </label>
                <select
                  value={localConfig.synth.type}
                  onChange={(e) => handleChange(['synth', 'type'], e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                  }}
                >
                  <option value="Synth">Synth</option>
                  <option value="AMSynth">AMSynth</option>
                  <option value="FMSynth">FMSynth</option>
                  <option value="MonoSynth">MonoSynth</option>
                  <option value="DuoSynth">DuoSynth</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                  Oscillator Type
                </label>
                <select
                  value={localConfig.synth.options.oscillator.type}
                  onChange={(e) =>
                    handleChange(['synth', 'options', 'oscillator', 'type'], e.target.value)
                  }
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                  }}
                >
                  <option value="sine">Sine</option>
                  <option value="square">Square</option>
                  <option value="sawtooth">Sawtooth</option>
                  <option value="triangle">Triangle</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Envelope
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Attack
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={localConfig.synth.options.envelope.attack}
                      onChange={(e) =>
                        handleChange(
                          ['synth', 'options', 'envelope', 'attack'],
                          e.target.value
                        )
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Decay
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={localConfig.synth.options.envelope.decay}
                      onChange={(e) =>
                        handleChange(
                          ['synth', 'options', 'envelope', 'decay'],
                          e.target.value
                        )
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Sustain
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={localConfig.synth.options.envelope.sustain}
                      onChange={(e) =>
                        handleChange(
                          ['synth', 'options', 'envelope', 'sustain'],
                          e.target.value
                        )
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Release
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={localConfig.synth.options.envelope.release}
                      onChange={(e) =>
                        handleChange(
                          ['synth', 'options', 'envelope', 'release'],
                          e.target.value
                        )
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Filter Configuration */}
          <section>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>
              Filter
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                  Filter Type
                </label>
                <select
                  value={localConfig.filter.type}
                  onChange={(e) => handleChange(['filter', 'type'], e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                  }}
                >
                  <option value="lowpass">Lowpass</option>
                  <option value="highpass">Highpass</option>
                  <option value="bandpass">Bandpass</option>
                  <option value="lowshelf">Lowshelf</option>
                  <option value="highshelf">Highshelf</option>
                  <option value="notch">Notch</option>
                  <option value="allpass">Allpass</option>
                </select>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                }}
              >
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                    Frequency (Hz)
                  </label>
                  <input
                    type="number"
                    value={localConfig.filter.frequency}
                    onChange={(e) =>
                      handleChange(['filter', 'frequency'], e.target.value)
                    }
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                    Q
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={localConfig.filter.Q}
                    onChange={(e) => handleChange(['filter', 'Q'], e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Parameter Mappings */}
          <section>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>
              Parameter Mappings
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Frequency Range */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Frequency Range (Hz)
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Min
                    </label>
                    <input
                      type="number"
                      value={localConfig.mappings.frequency.min}
                      onChange={(e) =>
                        handleRangeChange('frequency', 'min', Number(e.target.value))
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Max
                    </label>
                    <input
                      type="number"
                      value={localConfig.mappings.frequency.max}
                      onChange={(e) =>
                        handleRangeChange('frequency', 'max', Number(e.target.value))
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Filter Cutoff Range */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Filter Cutoff Range (Hz)
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Min
                    </label>
                    <input
                      type="number"
                      value={localConfig.mappings.filterCutoff.min}
                      onChange={(e) =>
                        handleRangeChange('filterCutoff', 'min', Number(e.target.value))
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Max
                    </label>
                    <input
                      type="number"
                      value={localConfig.mappings.filterCutoff.max}
                      onChange={(e) =>
                        handleRangeChange('filterCutoff', 'max', Number(e.target.value))
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Volume Range */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Volume Range (dB)
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Min
                    </label>
                    <input
                      type="number"
                      value={localConfig.mappings.volume.min}
                      onChange={(e) =>
                        handleRangeChange('volume', 'min', Number(e.target.value))
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Max
                    </label>
                    <input
                      type="number"
                      value={localConfig.mappings.volume.max}
                      onChange={(e) =>
                        handleRangeChange('volume', 'max', Number(e.target.value))
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Pan Range */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Pan Range
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Min
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={localConfig.mappings.pan.min}
                      onChange={(e) =>
                        handleRangeChange('pan', 'min', Number(e.target.value))
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Max
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={localConfig.mappings.pan.max}
                      onChange={(e) =>
                        handleRangeChange('pan', 'max', Number(e.target.value))
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Modulation Depth Range */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Modulation Depth Range (Hz)
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Min
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={localConfig.mappings.modulationDepth.min}
                      onChange={(e) =>
                        handleRangeChange('modulationDepth', 'min', Number(e.target.value))
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Max
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={localConfig.mappings.modulationDepth.max}
                      onChange={(e) =>
                        handleRangeChange('modulationDepth', 'max', Number(e.target.value))
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Distortion Range */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Distortion Range
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Min
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={localConfig.mappings.distortion.min}
                      onChange={(e) =>
                        handleRangeChange('distortion', 'min', Number(e.target.value))
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Max
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={localConfig.mappings.distortion.max}
                      onChange={(e) =>
                        handleRangeChange('distortion', 'max', Number(e.target.value))
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Reverb Range */}
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
                  Reverb Range (Wet Level)
                </label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                  }}
                >
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Min
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={localConfig.mappings.reverb.min}
                      onChange={(e) =>
                        handleRangeChange('reverb', 'min', Number(e.target.value))
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px' }}>
                      Max
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={localConfig.mappings.reverb.max}
                      onChange={(e) =>
                        handleRangeChange('reverb', 'max', Number(e.target.value))
                      }
                      style={{
                        width: '100%',
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #ddd',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Pluck Threshold */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                  Pluck Threshold
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={localConfig.mappings.pluckThreshold}
                  onChange={(e) =>
                    handleChange(['mappings', 'pluckThreshold'], e.target.value)
                  }
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                  }}
                />
              </div>

              {/* Ramp Time */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                  Ramp Time (seconds)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={localConfig.rampTime}
                  onChange={(e) => handleChange(['rampTime'], e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          </section>

          {/* Sensitivity Curves */}
          <section>
            <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '18px' }}>
              Sensitivity Curves
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                  Volume Curve (1.0 = linear, &lt;1.0 = less sensitive, &gt;1.0 = more sensitive)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={localConfig.curves.volume}
                  onChange={(e) => handleChange(['curves', 'volume'], e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                  Frequency Curve
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={localConfig.curves.frequency}
                  onChange={(e) => handleChange(['curves', 'frequency'], e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                  Filter Cutoff Curve
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={localConfig.curves.filterCutoff}
                  onChange={(e) => handleChange(['curves', 'filterCutoff'], e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                  Distortion Curve
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={localConfig.curves.distortion}
                  onChange={(e) => handleChange(['curves', 'distortion'], e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>
                  Reverb Curve
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={localConfig.curves.reverb}
                  onChange={(e) => handleChange(['curves', 'reverb'], e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px',
                    borderRadius: '4px',
                    border: '1px solid #ddd',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

