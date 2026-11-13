/**
 * NewsStudio Voice Age & Formant Resonance Shifter
 * Models Vocal Tract Length (VTL) to shift perceived age and resonance.
 */

export interface FormantSettings {
  ageLabel: string;
  formantShiftRatio: number;
  f1PeakingFreqHz: number;
  f1GainDb: number;
  f2PeakingFreqHz: number;
  f2GainDb: number;
  airPresenceGainDb: number;
  description: string;
}

export function getFormantSettings(ageRatio: number): FormantSettings {
  if (ageRatio < -0.3) {
    return {
      ageLabel: "Youthful (18–25)",
      formantShiftRatio: 0.15,
      f1PeakingFreqHz: 750,
      f1GainDb: -1.5,
      f2PeakingFreqHz: 2400,
      f2GainDb: 2.5,
      airPresenceGainDb: 3.0,
      description: "Slightly shorter vocal tract, crisp airy brightness and youthfulness.",
    };
  } else if (ageRatio > 0.3) {
    return {
      ageLabel: "Senior Veteran (50–65)",
      formantShiftRatio: -0.15,
      f1PeakingFreqHz: 450,
      f1GainDb: 3.0,
      f2PeakingFreqHz: 1600,
      f2GainDb: -2.0,
      airPresenceGainDb: -1.0,
      description: "Elongated vocal tract, authoritative chest resonance and mature gravitas.",
    };
  }

  return {
    ageLabel: "Prime Anchor (30–45)",
    formantShiftRatio: 0.0,
    f1PeakingFreqHz: 600,
    f1GainDb: 0.0,
    f2PeakingFreqHz: 2000,
    f2GainDb: 0.0,
    airPresenceGainDb: 1.0,
    description: "Balanced natural vocal tract resonance, neutral broadcast clarity.",
  };
}

export function createFormantNode(
  ctx: AudioContext,
  ageRatio: number
): { input: AudioNode; output: AudioNode } {
  const settings = getFormantSettings(ageRatio);

  const f1Filter = ctx.createBiquadFilter();
  f1Filter.type = "peaking";
  f1Filter.frequency.value = settings.f1PeakingFreqHz;
  f1Filter.gain.value = settings.f1GainDb;
  f1Filter.Q.value = 1.2;

  const f2Filter = ctx.createBiquadFilter();
  f2Filter.type = "peaking";
  f2Filter.frequency.value = settings.f2PeakingFreqHz;
  f2Filter.gain.value = settings.f2GainDb;
  f2Filter.Q.value = 1.4;

  const airFilter = ctx.createBiquadFilter();
  airFilter.type = "highshelf";
  airFilter.frequency.value = 6000;
  airFilter.gain.value = settings.airPresenceGainDb;

  f1Filter.connect(f2Filter);
  f2Filter.connect(airFilter);

  return { input: f1Filter, output: airFilter };
}
