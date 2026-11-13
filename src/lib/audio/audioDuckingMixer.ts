/**
 * NewsStudio Audio Ducking Mixer
 * Overlays speech audio onto background music beds with automated dynamic sidechain ducking.
 */

export interface MusicTrackOption {
  id: string;
  name: string;
  category: "breaking" | "tech" | "investigative" | "ambient" | "stinger";
  icon: string;
  url: string;
  defaultVolume: number;
}

export const BROADCAST_MUSIC_TRACKS: MusicTrackOption[] = [
  {
    id: "breaking_stinger",
    name: "Breaking News Orchestral Theme",
    category: "breaking",
    icon: "🚨",
    url: "/presets/samples/api_acestep_stinger_verified.wav",
    defaultVolume: 0.7,
  },
  {
    id: "tech_synthwave",
    name: "Cyber Pulse Tech Bed",
    category: "tech",
    icon: "⚡",
    url: "/presets/samples/api_step_audio_final_verified.wav",
    defaultVolume: 0.5,
  },
  {
    id: "investigative_suspense",
    name: "Investigative Documentary Bed",
    category: "investigative",
    icon: "🕵️",
    url: "/presets/samples/alt_3_f5_natural_phrasing_male.wav",
    defaultVolume: 0.6,
  },
  {
    id: "ambient_newsroom",
    name: "Morning Broadcast Neutral Ambience",
    category: "ambient",
    icon: "☕",
    url: "/presets/samples/alt_4_f5_natural_phrasing_female.wav",
    defaultVolume: 0.45,
  },
];

export interface DuckingOptions {
  duckingDb?: number;
  voiceLeadSec?: number;
  musicTailSec?: number;
  musicVolume?: number;
  voiceVolume?: number;
}

export function setupWebAudioDucking(
  ctx: AudioContext,
  voiceAudioElement: HTMLAudioElement,
  musicAudioElement: HTMLAudioElement,
  options: DuckingOptions = {}
): {
  voiceGain: GainNode;
  musicGain: GainNode;
  duckingGain: GainNode;
  masterGain: GainNode;
} {
  const {
    duckingDb = -14,
    musicVolume = 0.6,
    voiceVolume = 1.0,
  } = options;

  const voiceSource = ctx.createMediaElementSource(voiceAudioElement);
  const musicSource = ctx.createMediaElementSource(musicAudioElement);

  const voiceGain = ctx.createGain();
  voiceGain.gain.value = voiceVolume;

  const musicGain = ctx.createGain();
  musicGain.gain.value = musicVolume;

  const duckingGain = ctx.createGain();
  duckingGain.gain.value = 1.0;

  const masterGain = ctx.createGain();
  masterGain.gain.value = 1.0;

  voiceSource.connect(voiceGain);
  voiceGain.connect(masterGain);

  musicSource.connect(musicGain);
  musicGain.connect(duckingGain);
  duckingGain.connect(masterGain);

  masterGain.connect(ctx.destination);

  const duckMultiplier = Math.pow(10, duckingDb / 20);

  voiceAudioElement.onplay = () => {
    const now = ctx.currentTime;
    duckingGain.gain.cancelScheduledValues(now);
    duckingGain.gain.setValueAtTime(duckingGain.gain.value, now);
    duckingGain.gain.linearRampToValueAtTime(duckMultiplier, now + 0.25);
  };

  voiceAudioElement.onpause = voiceAudioElement.onended = () => {
    const now = ctx.currentTime;
    duckingGain.gain.cancelScheduledValues(now);
    duckingGain.gain.setValueAtTime(duckingGain.gain.value, now);
    duckingGain.gain.linearRampToValueAtTime(1.0, now + 0.4);
  };

  return { voiceGain, musicGain, duckingGain, masterGain };
}
