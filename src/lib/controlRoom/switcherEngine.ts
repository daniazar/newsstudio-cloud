/**
 * src/lib/controlRoom/switcherEngine.ts
 *
 * Broadcast Switcher State Engine & Multi-Camera Video Mixer.
 * Simulates professional television control room operations (Blackmagic ATEM / TriCaster style)
 * with 4-camera multi-view routing, T-Bar crossfading, DSK graphics keyers, and audio VU metering.
 */

export type CameraSourceId = "cam1_wide" | "cam2_tight" | "cam3_dataviz" | "cam4_broll";
export type TransitionType = "cut" | "dissolve" | "wipe_left" | "wipe_right" | "stinger";

export interface CameraFeed {
  id: CameraSourceId;
  name: string;
  shortLabel: string;
  category: "studio_wide" | "anchor_closeup" | "data_wall" | "satellite_broll";
  previewSrc: string;
  videoSrc?: string;
  tally: "program" | "preview" | "standby";
  activePersonaId?: string;
  description: string;
}

export interface DownstreamKeyerState {
  dsk1BreakingAlert: boolean;
  dsk2LowerThird: boolean;
  dsk3TickerTape: boolean;
  dsk4StreamChat: boolean;
  breakingText: string;
  lowerThirdTitle: string;
  lowerThirdSubtitle: string;
}

export interface AudioChannelState {
  id: string;
  label: string;
  volumeDb: number;        // -60dB to +6dB
  volumeLinear: number;    // 0.0 to 1.5 (1.0 = 0dB)
  isMuted: boolean;
  isSolo: boolean;
  peakDb: number;
}

export interface SwitcherState {
  programSource: CameraSourceId;
  previewSource: CameraSourceId;
  transitionType: TransitionType;
  transitionDurationFrames: number;
  tBarPosition: number;    // 0.0 (Preview) to 1.0 (Program)
  isTransitioning: boolean;
  dsk: DownstreamKeyerState;
  audioChannels: Record<string, AudioChannelState>;
  masterVolumeDb: number;
  isRecording: boolean;
  isLiveStreaming: boolean;
  streamDurationSeconds: number;
}

export const INITIAL_CAMERA_FEEDS: CameraFeed[] = [
  {
    id: "cam1_wide",
    name: "CAM 1: Master Studio Center",
    shortLabel: "CAM 1",
    category: "studio_wide",
    previewSrc: "/avatars/ruby.png",
    tally: "program",
    activePersonaId: "ruby",
    description: "Wide master desk angle with twilight skyline background.",
  },
  {
    id: "cam2_tight",
    name: "CAM 2: Anchor Tight Close-Up",
    shortLabel: "CAM 2",
    category: "anchor_closeup",
    previewSrc: "/avatars/tomas.png",
    tally: "preview",
    activePersonaId: "tomas",
    description: "50mm telephoto close-up for direct eye-contact storytelling.",
  },
  {
    id: "cam3_dataviz",
    name: "CAM 3: 8K Data Infographic Wall",
    shortLabel: "CAM 3",
    category: "data_wall",
    previewSrc: "/placeholder_ruby.png",
    tally: "standby",
    description: "Live financial candlestick chart & market telemetry wall.",
  },
  {
    id: "cam4_broll",
    name: "CAM 4: Satellite Feed & B-Roll",
    shortLabel: "CAM 4",
    category: "satellite_broll",
    previewSrc: "/avatars/isabel.png",
    tally: "standby",
    description: "Remote live satellite field correspondent & external video.",
  },
];

export const INITIAL_SWITCHER_STATE: SwitcherState = {
  programSource: "cam1_wide",
  previewSource: "cam2_tight",
  transitionType: "dissolve",
  transitionDurationFrames: 15,
  tBarPosition: 0.0,
  isTransitioning: false,
  dsk: {
    dsk1BreakingAlert: false,
    dsk2LowerThird: true,
    dsk3TickerTape: true,
    dsk4StreamChat: false,
    breakingText: "EMERGENCY MARKET BULLETIN",
    lowerThirdTitle: "RUBY VANCE",
    lowerThirdSubtitle: "LEAD NEWS ANCHOR • TECH BROADCAST NETWORK",
  },
  audioChannels: {
    anchorMic: {
      id: "anchorMic",
      label: "Anchor Mic",
      volumeDb: 0,
      volumeLinear: 1.0,
      isMuted: false,
      isSolo: false,
      peakDb: -3.2,
    },
    satelliteAudio: {
      id: "satelliteAudio",
      label: "Satellite Feed",
      volumeDb: -4,
      volumeLinear: 0.63,
      isMuted: false,
      isSolo: false,
      peakDb: -12.0,
    },
    sfxSoundboard: {
      id: "sfxSoundboard",
      label: "SFX Pad",
      volumeDb: -2,
      volumeLinear: 0.8,
      isMuted: false,
      isSolo: false,
      peakDb: -6.0,
    },
    bgMusic: {
      id: "bgMusic",
      label: "Background Music",
      volumeDb: -14,
      volumeLinear: 0.2,
      isMuted: false,
      isSolo: false,
      peakDb: -18.5,
    },
  },
  masterVolumeDb: 0,
  isRecording: false,
  isLiveStreaming: false,
  streamDurationSeconds: 0,
};

/**
 * Executes a Cut transition: instantly swaps Program and Preview sources.
 */
export function executeCut(state: SwitcherState): SwitcherState {
  const oldProgram = state.programSource;
  const newProgram = state.previewSource;

  return {
    ...state,
    programSource: newProgram,
    previewSource: oldProgram,
    tBarPosition: 0.0,
    isTransitioning: false,
  };
}

/**
 * Updates T-Bar position and auto-completes transition when reaching 1.0.
 */
export function setTBar(state: SwitcherState, position: number): SwitcherState {
  const clamped = Math.max(0, Math.min(1, position));

  if (clamped >= 1.0) {
    // Transition completed: swap Program & Preview and reset T-Bar to 0
    return {
      ...state,
      programSource: state.previewSource,
      previewSource: state.programSource,
      tBarPosition: 0.0,
      isTransitioning: false,
    };
  }

  return {
    ...state,
    tBarPosition: clamped,
    isTransitioning: clamped > 0,
  };
}

/**
 * Toggles a Downstream Keyer (DSK) overlay on/off.
 */
export function toggleDsk(
  state: SwitcherState,
  keyer: keyof DownstreamKeyerState
): SwitcherState {
  if (typeof state.dsk[keyer] === "boolean") {
    return {
      ...state,
      dsk: {
        ...state.dsk,
        [keyer]: !state.dsk[keyer],
      },
    };
  }
  return state;
}

/**
 * Updates channel volume in decibels (-60 to +6).
 */
export function setChannelVolumeDb(
  state: SwitcherState,
  channelId: string,
  volumeDb: number
): SwitcherState {
  const ch = state.audioChannels[channelId];
  if (!ch) return state;

  const clampedDb = Math.max(-60, Math.min(6, volumeDb));
  const linear = Math.pow(10, clampedDb / 20);

  return {
    ...state,
    audioChannels: {
      ...state.audioChannels,
      [channelId]: {
        ...ch,
        volumeDb: clampedDb,
        volumeLinear: linear,
      },
    },
  };
}
