/**
 * Sound Effects (SFX) Registry & Catalog
 * Defines standard broadcast audio effects, metadata, default durations, and volume levels.
 */

export interface SoundEffect {
  id: string;
  name: string;
  tag: string;
  icon: string;
  url: string;
  defaultVolume: number;
  durationSeconds: number;
  category?: "transition" | "alert" | "foley" | "ambient" | "reaction" | "impact";
}

export const SFX_LIBRARY: Record<string, SoundEffect> = {
  whoosh: {
    id: "whoosh",
    name: "Transition Whoosh",
    tag: "[sfx:whoosh]",
    icon: "💨",
    url: "/sfx/whoosh.mp3",
    defaultVolume: 0.7,
    durationSeconds: 1.0,
    category: "transition",
  },
  stinger: {
    id: "stinger",
    name: "News Stinger",
    tag: "[sfx:stinger]",
    icon: "🚨",
    url: "/sfx/news_stinger.mp3",
    defaultVolume: 0.8,
    durationSeconds: 2.5,
    category: "alert",
  },
  camera: {
    id: "camera",
    name: "Camera Shutter",
    tag: "[sfx:camera]",
    icon: "📸",
    url: "/sfx/camera_shutter.mp3",
    defaultVolume: 0.6,
    durationSeconds: 0.5,
    category: "foley",
  },
  pop: {
    id: "pop",
    name: "Pop Notification",
    tag: "[sfx:pop]",
    icon: "✨",
    url: "/sfx/pop.mp3",
    defaultVolume: 0.65,
    durationSeconds: 0.35,
    category: "reaction",
  },
  applause: {
    id: "applause",
    name: "Audience Applause",
    tag: "[sfx:applause]",
    icon: "👏",
    url: "/sfx/applause.mp3",
    defaultVolume: 0.5,
    durationSeconds: 3.5,
    category: "ambient",
  },
  ding: {
    id: "ding",
    name: "Subtle Chime",
    tag: "[sfx:ding]",
    icon: "🔔",
    url: "/sfx/ding.mp3",
    defaultVolume: 0.6,
    durationSeconds: 0.8,
    category: "alert",
  },
  glitch: {
    id: "glitch",
    name: "Digital Glitch",
    tag: "[sfx:glitch]",
    icon: "⚡",
    url: "/sfx/glitch.mp3",
    defaultVolume: 0.65,
    durationSeconds: 0.75,
    category: "impact",
  },
  riser: {
    id: "riser",
    name: "Tension Riser",
    tag: "[sfx:riser]",
    icon: "📈",
    url: "/sfx/riser.mp3",
    defaultVolume: 0.6,
    durationSeconds: 3.0,
    category: "transition",
  },
  sub_drop: {
    id: "sub_drop",
    name: "Sub Bass Impact",
    tag: "[sfx:sub_drop]",
    icon: "💥",
    url: "/sfx/sub_drop.mp3",
    defaultVolume: 0.75,
    durationSeconds: 2.0,
    category: "impact",
  },
  typing: {
    id: "typing",
    name: "Keyboard Ticker",
    tag: "[sfx:typing]",
    icon: "⌨️",
    url: "/sfx/typing.mp3",
    defaultVolume: 0.45,
    durationSeconds: 1.8,
    category: "foley",
  },
  breaking_alert: {
    id: "breaking_alert",
    name: "Breaking News Alert",
    tag: "[sfx:breaking_alert]",
    icon: "🔴",
    url: "/sfx/breaking_alert.mp3",
    defaultVolume: 0.85,
    durationSeconds: 2.2,
    category: "alert",
  },
  transition: {
    id: "transition",
    name: "Broadcast Swish",
    tag: "[sfx:transition]",
    icon: "🔄",
    url: "/sfx/transition.mp3",
    defaultVolume: 0.7,
    durationSeconds: 1.2,
    category: "transition",
  },
  rimshot: {
    id: "rimshot",
    name: "Comedic Rimshot (Ba-dum-tss)",
    tag: "[sfx:rimshot]",
    icon: "🥁",
    url: "/sfx/rimshot.mp3",
    defaultVolume: 0.8,
    durationSeconds: 1.8,
    category: "reaction",
  },
  laugh_track: {
    id: "laugh_track",
    name: "Studio Audience Laughter",
    tag: "[sfx:laugh_track]",
    icon: "😂",
    url: "/sfx/applause.mp3",
    defaultVolume: 0.65,
    durationSeconds: 3.2,
    category: "ambient",
  },
  crickets: {
    id: "crickets",
    name: "Awkward Silence Crickets",
    tag: "[sfx:crickets]",
    icon: "🦗",
    url: "/sfx/ding.mp3",
    defaultVolume: 0.5,
    durationSeconds: 2.0,
    category: "ambient",
  },
  sarcastic_stinger: {
    id: "sarcastic_stinger",
    name: "Late-Night Brass Stinger",
    tag: "[sfx:sarcastic_stinger]",
    icon: "🎷",
    url: "/sfx/news_stinger.mp3",
    defaultVolume: 0.75,
    durationSeconds: 2.4,
    category: "alert",
  },
  servo_spin: {
    id: "servo_spin",
    name: "Turntable Servo Motor",
    tag: "[sfx:servo_spin]",
    icon: "⚙️",
    url: "/sfx/camera_shutter.mp3",
    defaultVolume: 0.35,
    durationSeconds: 3.0,
    category: "foley",
  },
  radar_blip: {
    id: "radar_blip",
    name: "Feature Radar Ping",
    tag: "[sfx:radar_blip]",
    icon: "📡",
    url: "/sfx/pop.mp3",
    defaultVolume: 0.45,
    durationSeconds: 0.4,
    category: "alert",
  },
  shimmer: {
    id: "shimmer",
    name: "Specular Light Shimmer",
    tag: "[sfx:shimmer]",
    icon: "✨",
    url: "/sfx/ding.mp3",
    defaultVolume: 0.4,
    durationSeconds: 0.8,
    category: "reaction",
  },
};

export interface ParsedSfxTrigger {
  sfxId: string;
  tag: string;
  positionInText: number;
  estimatedTimeSeconds?: number;
}

/**
 * Extract SFX tags from script text
 */
export function extractSfxTags(text: string): ParsedSfxTrigger[] {
  const triggers: ParsedSfxTrigger[] = [];
  const regex = /\[sfx:([a-z0-9_-]+)\]/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const sfxId = match[1].toLowerCase();
    triggers.push({
      sfxId,
      tag: match[0],
      positionInText: match.index,
    });
  }

  return triggers;
}

/**
 * Strip SFX tags from script text for TTS audio synthesis
 */
export function stripSfxTags(text: string): string {
  return text.replace(/\[sfx:([a-z0-9_-]+)\]/gi, "").trim();
}
