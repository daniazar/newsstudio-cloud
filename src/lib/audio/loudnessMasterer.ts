/**
 * NewsStudio Broadcast Loudness Normalizer (EBU R128 / ITU-R BS.1770)
 * Masters audio to industry standard LUFS targets and True Peak limits.
 */

export type LoudnessTargetId = "ebu_r128" | "youtube_streaming" | "podcast_spotify";

export interface LoudnessProfile {
  id: LoudnessTargetId;
  name: string;
  targetLufs: number;
  truePeakLimitDb: number;
  lraToleranceDb: number;
  icon: string;
  badgeColor: string;
  description: string;
}

export const LOUDNESS_PROFILES: Record<LoudnessTargetId, LoudnessProfile> = {
  ebu_r128: {
    id: "ebu_r128",
    name: "EBU R128 TV Broadcast",
    targetLufs: -23.0,
    truePeakLimitDb: -1.0,
    lraToleranceDb: 0.5,
    icon: "📺",
    badgeColor: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    description: "Strict European & International Television broadcast standard (-23.0 LUFS, -1.0 dBTP).",
  },
  youtube_streaming: {
    id: "youtube_streaming",
    name: "YouTube & Social Streaming",
    targetLufs: -14.0,
    truePeakLimitDb: -1.0,
    lraToleranceDb: 1.0,
    icon: "📱",
    badgeColor: "bg-red-500/20 text-red-400 border-red-500/30",
    description: "Modern internet and streaming video standard with punchy dynamics (-14.0 LUFS).",
  },
  podcast_spotify: {
    id: "podcast_spotify",
    name: "Spotify & Apple Podcasts",
    targetLufs: -16.0,
    truePeakLimitDb: -1.0,
    lraToleranceDb: 1.0,
    icon: "🎙️",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    description: "Industry standard for voice podcasts, audiobooks, and on-demand audio (-16.0 LUFS).",
  },
};

export function getLoudnessProfile(id: LoudnessTargetId | string): LoudnessProfile {
  return LOUDNESS_PROFILES[id as LoudnessTargetId] || LOUDNESS_PROFILES.ebu_r128;
}
