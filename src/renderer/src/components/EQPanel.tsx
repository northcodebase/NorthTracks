import React, { useState, useEffect } from 'react';
import { Sliders, X } from 'lucide-react';
import { AudioEngine, EQPresetName, AudioEngineState } from '../audio/AudioEngine';

interface EQPanelProps {
  isOpen: boolean;
  onClose: () => void;
  audioEngine: AudioEngine;
}

const EQ_BANDS_LABELS = ['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];

const PRESET_MAPPING: { name: string; key: EQPresetName }[] = [
  { name: 'Flat', key: 'FLAT' },
  { name: 'Bass Boost', key: 'BASS_BOOST' },
  { name: 'Treble Boost', key: 'TREBLE_BOOST' },
  { name: 'Rock', key: 'ROCK' },
  { name: 'Pop', key: 'POP' },
  { name: 'Classical', key: 'CLASSICAL' },
  { name: 'Hip-Hop', key: 'HIP_HOP' },
  { name: 'Electronic', key: 'ELECTRONIC' },
  { name: 'Acoustic', key: 'ACOUSTIC' },
  { name: 'Vocal', key: 'VOCAL' }
];

export const EQPanel: React.FC<EQPanelProps> = ({ isOpen, onClose, audioEngine }) => {
  const [engineState, setEngineState] = useState<AudioEngineState>(audioEngine.getState());
  const [isNormalizerOn, setIsNormalizerOn] = useState(() => {
    const saved = localStorage.getItem('eq-settings');
    if (saved) {
      try {
        return JSON.parse(saved).normalization || false;
      } catch (e) {
        return false;
      }
    }
    return false;
  });

  // Save settings on changes
  useEffect(() => {
    localStorage.setItem('eq-settings', JSON.stringify({
      preset: engineState.currentPreset,
      bands: engineState.eqBands,
      reverb: engineState.reverbWetMix,
      stereoWidth: engineState.stereoWidth,
      normalization: isNormalizerOn
    }));
  }, [
    engineState.currentPreset,
    engineState.eqBands,
    engineState.reverbWetMix,
    engineState.stereoWidth,
    isNormalizerOn
  ]);

  // Subscribe to changes in the Audio Engine state
  useEffect(() => {
    const unsubscribe = audioEngine.subscribe((state) => {
      setEngineState(state);
    });
    return unsubscribe;
  }, [audioEngine]);

  // Periodic volume normalization handling while enabled
  useEffect(() => {
    if (!isNormalizerOn) {
      audioEngine.setNormalizationGain(1.0);
      return;
    }

    const runNormalization = () => {
      const audioElement = document.querySelector('audio');
      if (audioElement && !audioElement.paused) {
        const suggestedGain = audioEngine.analyzeAndNormalize(audioElement);
        audioEngine.setNormalizationGain(suggestedGain);
      }
    };

    // Run once immediately when toggled on
    runNormalization();

    const interval = setInterval(runNormalization, 1500);
    return () => clearInterval(interval);
  }, [isNormalizerOn, audioEngine]);

  const formatStereoWidth = (val: number) => {
    if (val === 0) return 'Center';
    if (val === -1) return 'Left';
    if (val === 1) return 'Right';
    if (val < 0) return `${Math.round(Math.abs(val) * 100)}% Left`;
    return `${Math.round(val * 100)}% Right`;
  };

  return (
    <div className={`eq-panel ${isOpen ? 'eq-open' : 'eq-closed'}`}>
      {/* Header section */}
      <div className="eq-header">
        <div className="eq-title-section">
          <Sliders size={16} className="eq-title-icon" />
          <h3>Equalizer</h3>
        </div>

        <div className="eq-controls-right">
          <select
            value={engineState.currentPreset}
            onChange={(e) => {
              const val = e.target.value;
              if (val !== 'CUSTOM') {
                audioEngine.setPreset(val as EQPresetName);
              }
            }}
            className="eq-preset-select"
          >
            {engineState.currentPreset === 'CUSTOM' && (
              <option value="CUSTOM">Custom</option>
            )}
            {PRESET_MAPPING.map((preset) => (
              <option key={preset.key} value={preset.key}>
                {preset.name}
              </option>
            ))}
          </select>

          <button onClick={onClose} className="eq-close-btn" title="Close Panel">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Sliders container (10 vertical bands) */}
      <div className="eq-sliders-container">
        {engineState.eqBands.map((gainDb, index) => {
          const label = EQ_BANDS_LABELS[index];
          const displayGain = gainDb > 0 ? `+${gainDb.toFixed(1)}` : gainDb.toFixed(1);
          return (
            <div key={index} className="eq-slider-col">
              <span className="eq-slider-tooltip">{displayGain} dB</span>
              <div className="eq-slider-track-wrapper">
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={gainDb}
                  onChange={(e) => audioEngine.setEQBand(index, parseFloat(e.target.value))}
                  className="eq-vertical-slider"
                  style={{
                    background: `linear-gradient(to right, var(--primary) ${((gainDb + 12) / 24) * 100}%, var(--border-medium) ${((gainDb + 12) / 24) * 100}%)`
                  }}
                />
              </div>
              <span className="eq-slider-label">{label}</span>
            </div>
          );
        })}
      </div>

      {/* Bottom controls panel */}
      <div className="eq-bottom-controls">
        {/* Effects block */}
        <div className="eq-effects-section">
          <span className="eq-section-label">EFFECTS</span>
          <div className="eq-effects-grid">
            <div className="eq-effect-slider-group">
              <div className="eq-effect-meta">
                <span className="eq-effect-label">Reverb</span>
                <span className="eq-effect-value">
                  {Math.round(engineState.reverbWetMix * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(engineState.reverbWetMix * 100)}
                onChange={(e) => audioEngine.setReverb(parseFloat(e.target.value) / 100)}
                className="eq-horizontal-slider"
                style={{
                  background: `linear-gradient(to right, var(--primary) ${engineState.reverbWetMix * 100}%, var(--border-medium) ${engineState.reverbWetMix * 100}%)`
                }}
              />
            </div>

            <div className="eq-effect-slider-group">
              <div className="eq-effect-meta">
                <span className="eq-effect-label">Stereo</span>
                <span className="eq-effect-value">
                  {formatStereoWidth(engineState.stereoWidth)}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={Math.round(engineState.stereoWidth * 100)}
                onChange={(e) => audioEngine.setStereoWidth(parseFloat(e.target.value) / 100)}
                className="eq-horizontal-slider"
                style={{
                  background: `linear-gradient(to right, var(--primary) ${((engineState.stereoWidth + 1) / 2) * 100}%, var(--border-medium) ${((engineState.stereoWidth + 1) / 2) * 100}%)`
                }}
              />
            </div>
          </div>
        </div>

        {/* Volume Normalization block */}
        <div className="eq-normalization-section">
          <div className="eq-normalization-info">
            <span className="eq-section-label">VOLUME NORMALIZATION</span>
            <p className="eq-normalization-desc">
              Auto-adjusts level using dynamic RMS analysis.
            </p>
          </div>
          <label className="switch-toggle" title="Toggle Volume Normalization">
            <input
              type="checkbox"
              checked={isNormalizerOn}
              onChange={(e) => setIsNormalizerOn(e.target.checked)}
            />
            <span className="switch-slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
};
