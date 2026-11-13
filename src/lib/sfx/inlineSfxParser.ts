/**
 * NewsStudio — Inline SFX Tag Parser & Remotion Track Splitter
 * 
 * Parses inline sound effects ([sfx:whoosh], [sfx:stinger], [sfx:pop]) and pause tags ([pause: 0.5s]),
 * produces clean text for TTS synthesis without speaking raw tags, computes timeline cue timestamps,
 * and splits sound effects across multi-track Remotion audio layers to prevent sound collision.
 */

import { SFX_LIBRARY, SoundEffect } from "./sfxRegistry";

export interface SfxCue {
  id: string;
  sfxId: string;
  name: string;
  tag: string;
  url: string;
  defaultVolume: number;
  volume: number;
  durationSeconds: number;
  rawCharIndex: number;
  cleanCharIndex: number;
  wordIndex: number;
  timestampSeconds: number;
}

export interface PauseCue {
  id: string;
  tag: string;
  durationSeconds: number;
  rawCharIndex: number;
  cleanCharIndex: number;
  wordIndex: number;
  timestampSeconds: number;
}

export interface RemotionSfxTrackItem {
  id: string;
  sfxId: string;
  name: string;
  src: string;
  startFrame: number;
  durationInFrames: number;
  volume: number;
  timestampSeconds: number;
  durationSeconds: number;
  label: string;
}

export interface RemotionSfxTrack {
  trackId: string;
  name: string;
  items: RemotionSfxTrackItem[];
}

export interface InlineParserOptions {
  wpm?: number; // Base words per minute (default 150)
  fps?: number; // Remotion frames per second (default 30)
  speedFactor?: number; // Cadence speed multiplier (e.g. 1.15x)
  maxTracks?: number; // Max parallel audio tracks for Remotion (default 4)
  defaultSfxVolume?: number;
  customSfxLibrary?: Record<string, Partial<SoundEffect>>;
}

export interface InlineParseResult {
  rawText: string;
  cleanText: string;
  sfxCues: SfxCue[];
  pauseCues: PauseCue[];
  totalPauseDurationSeconds: number;
  totalEstimatedDurationSeconds: number;
  sfxTracks: RemotionSfxTrack[];
}

/**
 * Parses pause duration strings like "0.5s", "500ms", "1.2", "2s" into seconds.
 */
export function parsePauseDuration(str: string): number {
  if (!str) return 0.5;
  const trimmed = str.trim().toLowerCase();

  if (trimmed.endsWith("ms")) {
    const val = parseFloat(trimmed.slice(0, -2));
    return isNaN(val) ? 0.5 : Math.max(0.05, val / 1000);
  }

  if (trimmed.endsWith("s")) {
    const val = parseFloat(trimmed.slice(0, -1));
    return isNaN(val) ? 0.5 : Math.max(0.05, val);
  }

  const val = parseFloat(trimmed);
  return isNaN(val) ? 0.5 : Math.max(0.05, val);
}

/**
 * Strips all inline metadata tags from text so TTS voice models never speak them.
 */
export function stripAllInlineTags(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Remove [sfx:...] and <sfx ...>
  cleaned = cleaned.replace(/\[sfx:\s*[a-z0-9_-]+\s*\]/gi, " ");
  cleaned = cleaned.replace(/<sfx\s+id=["']?[a-z0-9_-]+["']?\s*\/?>/gi, " ");

  // 2. Remove [pause:...] and <pause ...>
  cleaned = cleaned.replace(/\[pause:\s*[\d.]+\s*(?:s|ms)?\s*\]/gi, " ");
  cleaned = cleaned.replace(/<pause\s+(?:time=)?["']?[\d.]+\s*(?:s|ms)?["']?\s*\/?>/gi, " ");

  // 3. Remove emotion prosody bracket tags: [urgent], [solemn], [casual], [excited], etc.
  cleaned = cleaned.replace(/\[(urgent|solemn|casual|standard|excited|whisper|calm|serious|breaking|storyteller)\]/gi, " ");
  cleaned = cleaned.replace(/<(urgent|solemn|casual|standard|excited|whisper|calm|serious|breaking|storyteller)>/gi, " ");

  // 4. Remove camera / graphics director tags & on-the-fly animation tags
  cleaned = cleaned.replace(/\[(camera|graphic|speaker|visual|music|stat|counter|entity|alert|badge|fx):[^\]]+\]/gi, " ");

  // 5. Clean whitespace before punctuation (e.g. "momento ." -> "momento.")
  cleaned = cleaned.replace(/\s+([.,!?;:])/g, "$1");

  // 6. Normalize whitespace
  return cleaned.replace(/\s+/g, " ").trim();
}

/**
 * Comprehensive parser that scans text for inline SFX and pause markers,
 * computes speech timing, and produces structured SFX cue points and Remotion tracks.
 */
export function parseInlineSfxAndPauses(text: string, options: InlineParserOptions = {}): InlineParseResult {
  if (!text || typeof text !== "string") {
    return {
      rawText: "",
      cleanText: "",
      sfxCues: [],
      pauseCues: [],
      totalPauseDurationSeconds: 0,
      totalEstimatedDurationSeconds: 0,
      sfxTracks: [],
    };
  }

  const wpm = options.wpm || 150;
  const fps = options.fps || 30;
  const speedFactor = options.speedFactor || 1.0;
  const maxTracks = options.maxTracks || 4;
  const sfxLib = { ...SFX_LIBRARY, ...(options.customSfxLibrary || {}) };

  // Effective words per second
  const effectiveWps = (wpm / 60) * speedFactor;

  // Regex pattern matching [sfx:...], [pause:...], <pause...>, <sfx...>
  const tagRegex = /(?:\[sfx:\s*([a-z0-9_-]+)\s*\]|<sfx\s+id=["']?([a-z0-9_-]+)["']?\s*\/?>)|(?:\[pause:\s*([\d.]+\s*(?:s|ms)?)\s*\]|<pause\s+(?:time=)?["']?([\d.]+\s*(?:s|ms)?|\d+)["']?\s*\/?>)|(?:\[(urgent|solemn|casual|standard|excited|whisper|calm|serious|breaking|storyteller)\]|<(urgent|solemn|casual|standard|excited|whisper|calm|serious|breaking|storyteller)>)|(?:\[(?:camera|graphic|speaker|visual|music):[^\]]+\])/gi;

  const rawText = text;
  const sfxCues: SfxCue[] = [];
  const pauseCues: PauseCue[] = [];

  let cleanTextAccumulator = "";
  let lastIndex = 0;
  let runningPauseSeconds = 0;
  let wordCounter = 0;
  let cueIdCounter = 0;

  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(rawText)) !== null) {
    const matchIndex = match.index;
    const matchedTag = match[0];

    // Text between previous match and this tag
    const textSegment = rawText.substring(lastIndex, matchIndex);
    if (textSegment) {
      cleanTextAccumulator += textSegment;
      const wordsInSegment = textSegment.trim().split(/\s+/).filter(Boolean).length;
      wordCounter += wordsInSegment;
    }

    const currentCleanCharIndex = cleanTextAccumulator.length;
    // Estimated speech time elapsed based on words spoken so far + pauses elapsed
    const currentSpeechTimeSeconds = (wordCounter / effectiveWps) + runningPauseSeconds;

    // Check if match is SFX tag
    const sfxId = match[1] || match[2];
    if (sfxId) {
      const normalizedSfxId = sfxId.toLowerCase();
      const sfxDef = sfxLib[normalizedSfxId] || {
        id: normalizedSfxId,
        name: `Sound Effect (${normalizedSfxId})`,
        tag: `[sfx:${normalizedSfxId}]`,
        icon: "🔊",
        url: `/sfx/${normalizedSfxId}.mp3`,
        defaultVolume: options.defaultSfxVolume || 0.7,
        durationSeconds: 1.0,
      };

      sfxCues.push({
        id: `sfx_cue_${cueIdCounter++}_${normalizedSfxId}`,
        sfxId: normalizedSfxId,
        name: sfxDef.name || normalizedSfxId,
        tag: matchedTag,
        url: sfxDef.url || `/sfx/${normalizedSfxId}.mp3`,
        defaultVolume: sfxDef.defaultVolume ?? 0.7,
        volume: sfxDef.defaultVolume ?? 0.7,
        durationSeconds: sfxDef.durationSeconds ?? 1.0,
        rawCharIndex: matchIndex,
        cleanCharIndex: currentCleanCharIndex,
        wordIndex: wordCounter,
        timestampSeconds: Math.round(currentSpeechTimeSeconds * 100) / 100,
      });
    }

    // Check if match is Pause tag
    const pauseDurStr = match[3] || match[4];
    if (pauseDurStr !== undefined) {
      const pauseDuration = parsePauseDuration(pauseDurStr);
      pauseCues.push({
        id: `pause_cue_${cueIdCounter++}`,
        tag: matchedTag,
        durationSeconds: pauseDuration,
        rawCharIndex: matchIndex,
        cleanCharIndex: currentCleanCharIndex,
        wordIndex: wordCounter,
        timestampSeconds: Math.round(currentSpeechTimeSeconds * 100) / 100,
      });
      runningPauseSeconds += pauseDuration;
    }

    lastIndex = tagRegex.lastIndex;
  }

  // Trailing text after last match
  const trailingText = rawText.substring(lastIndex);
  if (trailingText) {
    cleanTextAccumulator += trailingText;
    const wordsInTrailing = trailingText.trim().split(/\s+/).filter(Boolean).length;
    wordCounter += wordsInTrailing;
  }

  // Final clean text
  const cleanText = cleanTextAccumulator.replace(/\s+([.,!?;:])/g, "$1").replace(/\s+/g, " ").trim();

  // Total estimated speech duration
  const wordsInClean = cleanText ? cleanText.split(/\s+/).length : 0;
  const speechDurationSeconds = wordsInClean / effectiveWps;
  const totalEstimatedDurationSeconds = Math.round((speechDurationSeconds + runningPauseSeconds) * 100) / 100;

  // Build Remotion multi-track layout
  const sfxTracks = splitIntoRemotionTracks(sfxCues, fps, maxTracks);

  return {
    rawText,
    cleanText,
    sfxCues,
    pauseCues,
    totalPauseDurationSeconds: Math.round(runningPauseSeconds * 100) / 100,
    totalEstimatedDurationSeconds,
    sfxTracks,
  };
}

/**
 * Allocates sound effect cues into parallel Remotion audio tracks so overlapping
 * sound effects play cleanly without audio cutoff.
 */
export function splitIntoRemotionTracks(
  cues: SfxCue[],
  fps = 30,
  maxTracks = 4
): RemotionSfxTrack[] {
  if (!cues || cues.length === 0) return [];

  // Initialize track buckets
  const tracks: { trackId: string; name: string; items: RemotionSfxTrackItem[]; nextFreeSecond: number }[] = [];

  for (let i = 0; i < maxTracks; i++) {
    tracks.push({
      trackId: `sfx-track-${i + 1}`,
      name: `SFX Audio Track ${i + 1}`,
      items: [],
      nextFreeSecond: 0,
    });
  }

  // Sort cues chronologically
  const sortedCues = [...cues].sort((a, b) => a.timestampSeconds - b.timestampSeconds);

  for (const cue of sortedCues) {
    const cueStart = cue.timestampSeconds;
    const cueDuration = cue.durationSeconds;
    const startFrame = Math.round(cueStart * fps);
    const durationInFrames = Math.max(1, Math.round(cueDuration * fps));

    const item: RemotionSfxTrackItem = {
      id: cue.id,
      sfxId: cue.sfxId,
      name: cue.name,
      src: cue.url,
      startFrame,
      durationInFrames,
      volume: cue.volume,
      timestampSeconds: cue.timestampSeconds,
      durationSeconds: cue.durationSeconds,
      label: cue.name,
    };

    // Find the first track that is free at cueStart
    let assigned = false;
    for (const track of tracks) {
      if (track.nextFreeSecond <= cueStart) {
        track.items.push(item);
        track.nextFreeSecond = cueStart + cueDuration;
        assigned = true;
        break;
      }
    }

    // If all tracks are busy, assign to the track with the earliest free time
    if (!assigned) {
      tracks.sort((a, b) => a.nextFreeSecond - b.nextFreeSecond);
      tracks[0].items.push(item);
      tracks[0].nextFreeSecond = Math.max(tracks[0].nextFreeSecond, cueStart + cueDuration);
    }
  }

  // Filter out completely empty tracks unless track 1
  return tracks
    .filter((t, idx) => idx === 0 || t.items.length > 0)
    .map((t) => ({
      trackId: t.trackId,
      name: t.name,
      items: t.items,
    }));
}
