/**
 * NewsStudio Acoustic Environment Simulation & Broadcast DSP Filters
 * Applies realistic room acoustics, frequency filtering, and broadcast mastering.
 */

export type AcousticEnvironmentId = 
  | 'none'
  | 'studio_desk'
  | 'field_reporter'
  | 'phone_patch'
  | 'podcast_booth'
  | 'press_conference';

export interface AcousticEnvironmentPreset {
  id: AcousticEnvironmentId;
  name: string;
  tagline: string;
  icon: string;
  description: string;
  badgeColor: string;
  params: {
    highpassHz: number;
    lowpassHz: number;
    presenceBoostDb: number;
    presenceFreqHz: number;
    compressionThresholdDb: number;
    compressionRatio: number;
    reverbWet: number;
    reverbDurationSec: number;
  };
}

export const ACOUSTIC_PRESETS: AcousticEnvironmentPreset[] = [
  {
    id: 'none',
    name: 'Raw Studio Master',
    tagline: 'Unfiltered Dry Signal',
    icon: '🎙️',
    description: 'Direct dry neural output without room modeling or acoustic filtering.',
    badgeColor: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    params: {
      highpassHz: 20,
      lowpassHz: 20000,
      presenceBoostDb: 0,
      presenceFreqHz: 3000,
      compressionThresholdDb: -12,
      compressionRatio: 2,
      reverbWet: 0,
      reverbDurationSec: 0,
    },
  },
  {
    id: 'studio_desk',
    name: 'Main Studio Desk',
    tagline: 'EBU R128 Mastered Warmth',
    icon: '🏢',
    description: 'High-pass 80Hz rumble cut, 3.5kHz broadcast clarity boost, tight dynamic compression.',
    badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    params: {
      highpassHz: 80,
      lowpassHz: 18000,
      presenceBoostDb: 3.5,
      presenceFreqHz: 3500,
      compressionThresholdDb: -18,
      compressionRatio: 4,
      reverbWet: 0.05,
      reverbDurationSec: 0.4,
    },
  },
  {
    id: 'field_reporter',
    name: 'Outdoor Field Reporter',
    tagline: 'Live Shotgun Mic & Wind Filter',
    icon: '🌧️',
    description: '120Hz wind barrier filter, shotgun polar focus, and subtle atmospheric open-air acoustic reflection.',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    params: {
      highpassHz: 120,
      lowpassHz: 12000,
      presenceBoostDb: 4.0,
      presenceFreqHz: 4500,
      compressionThresholdDb: -22,
      compressionRatio: 5,
      reverbWet: 0.15,
      reverbDurationSec: 0.6,
    },
  },
  {
    id: 'phone_patch',
    name: 'Phone Patch / Remote Call',
    tagline: '300Hz–3400Hz Bandpass Telephone',
    icon: '📞',
    description: 'Strict telecom bandpass curve with harmonic saturation and subtle GSM artifacting.',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    params: {
      highpassHz: 300,
      lowpassHz: 3400,
      presenceBoostDb: 2.0,
      presenceFreqHz: 2000,
      compressionThresholdDb: -26,
      compressionRatio: 8,
      reverbWet: 0,
      reverbDurationSec: 0,
    },
  },
  {
    id: 'podcast_booth',
    name: 'Acoustic Foam Podcast',
    tagline: 'Warm Proximity Pro Booth',
    icon: '🎧',
    description: 'Deep 150Hz proximity effect, steep room reflection absorption, and silky vocal air.',
    badgeColor: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    params: {
      highpassHz: 60,
      lowpassHz: 19000,
      presenceBoostDb: 2.5,
      presenceFreqHz: 2800,
      compressionThresholdDb: -16,
      compressionRatio: 3.5,
      reverbWet: 0.02,
      reverbDurationSec: 0.2,
    },
  },
  {
    id: 'press_conference',
    name: 'Press Conference / Auditorium',
    tagline: '1.2s RT60 Room Slapback',
    icon: '🏟️',
    description: 'Auditorium acoustics with public address podium microphone projection and room slapback.',
    badgeColor: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    params: {
      highpassHz: 100,
      lowpassHz: 14000,
      presenceBoostDb: 3.0,
      presenceFreqHz: 3200,
      compressionThresholdDb: -15,
      compressionRatio: 3,
      reverbWet: 0.35,
      reverbDurationSec: 1.2,
    },
  },
];

export function getAcousticPreset(id: AcousticEnvironmentId | string): AcousticEnvironmentPreset {
  return ACOUSTIC_PRESETS.find((p) => p.id === id) || ACOUSTIC_PRESETS[0];
}

/**
 * Attaches Web Audio API DSP nodes to transform live audio in browser.
 */
export function createAcousticEnvironmentNode(
  ctx: AudioContext,
  presetId: AcousticEnvironmentId
): { input: AudioNode; output: AudioNode } {
  const preset = getAcousticPreset(presetId);
  const { params } = preset;

  // 1. High-pass filter
  const hpFilter = ctx.createBiquadFilter();
  hpFilter.type = 'highpass';
  hpFilter.frequency.value = params.highpassHz;

  // 2. Low-pass filter
  const lpFilter = ctx.createBiquadFilter();
  lpFilter.type = 'lowpass';
  lpFilter.frequency.value = params.lowpassHz;

  // 3. Presence / Peaking filter
  const presenceFilter = ctx.createBiquadFilter();
  presenceFilter.type = 'peaking';
  presenceFilter.frequency.value = params.presenceFreqHz;
  presenceFilter.gain.value = params.presenceBoostDb;
  presenceFilter.Q.value = 1.0;

  // 4. Dynamics Compressor
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = params.compressionThresholdDb;
  compressor.ratio.value = params.compressionRatio;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.25;

  // Connect chain: hp -> lp -> presence -> compressor
  hpFilter.connect(lpFilter);
  lpFilter.connect(presenceFilter);
  presenceFilter.connect(compressor);

  // If reverb is needed, blend with simple synthetic convolver or wet gain
  if (params.reverbWet > 0) {
    const wetGain = ctx.createGain();
    wetGain.gain.value = params.reverbWet;
    const dryGain = ctx.createGain();
    dryGain.gain.value = 1.0 - params.reverbWet;

    // Create synthetic impulse response
    const sampleRate = ctx.sampleRate;
    const length = Math.max(1, Math.floor(sampleRate * params.reverbDurationSec));
    const impulse = ctx.createBuffer(2, length, sampleRate);
    for (let c = 0; c < 2; c++) {
      const channelData = impulse.getChannelData(c);
      for (let i = 0; i < length; i++) {
        const decay = Math.exp(-i / (sampleRate * (params.reverbDurationSec / 3)));
        channelData[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;

    const outGain = ctx.createGain();
    compressor.connect(dryGain);
    compressor.connect(convolver);
    convolver.connect(wetGain);

    dryGain.connect(outGain);
    wetGain.connect(outGain);

    return { input: hpFilter, output: outGain };
  }

  return { input: hpFilter, output: compressor };
}
