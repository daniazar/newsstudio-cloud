import React from "react";
import { Audio, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { SFX_LIBRARY } from "@/lib/sfx/sfxRegistry";
import type { RemotionSegment } from "@/lib/types";

export interface AudioDuckingLayerProps {
  bgMusicPath?: string;
  speechActive?: boolean;
  baseMusicVolume?: number;
  speechVolume?: number;
  /** Active speech dialogue attenuation in decibels (default: -14dB) */
  duckingDb?: number;
  /** Breath pause / scene transition swell attenuation in decibels (default: -2dB when swell enabled, or 0dB for full unity) */
  swellDb?: number;
  /** Attack smoothing in frames (default: 8 frames) */
  attackFrames?: number;
  /** Release smoothing in frames (default: 12 frames) */
  releaseFrames?: number;
  /** Segments containing speech startFrame and endFrame */
  segments?: RemotionSegment[];
  /** Inline speech activity intervals */
  speechIntervals?: Array<{ startFrame: number; endFrame: number }>;
  /** Explicit breath pause / transition swell intervals */
  breathPauses?: Array<{ startFrame: number; endFrame: number }>;
  /** Sound effect triggers */
  sfxTriggers?: Array<{
    sfxId: string;
    triggerFrame: number;
    volume?: number;
  }>;
  /** Ambient room tone / studio chatter sound effect */
  ambienceTrackPath?: string;
  ambienceVolume?: number;
}

import { resolveSrc } from "../utils/resolveSrc";

/**
 * Clamps volume strictly within [0.0, 1.0] and guards against NaN or Infinite values.
 */
export function clampVolume(vol: number): number {
  if (isNaN(vol) || !isFinite(vol)) return 0;
  return Math.max(0, Math.min(1, vol));
}

/**
 * Calculates linear gain multiplier for a given decibel value.
 * e.g. -14dB -> 10^(-14/20) ~= 0.199526 (approx -14dB attenuation)
 * e.g. -2dB  -> 10^(-2/20)  ~= 0.794328 (approx -2dB breath pause swell)
 * e.g. 0dB   -> 10^(0/20)   = 1.0 (unity gain)
 */
const DUCKING_MULTIPLIER_CACHE: Record<number, number> = {
  [-14]: Math.pow(10, -14 / 20),
  [-2]: Math.pow(10, -2 / 20),
  [0]: 1.0,
};

export function calculateDuckingMultiplier(duckingDb = -14): number {
  if (DUCKING_MULTIPLIER_CACHE[duckingDb] !== undefined) {
    return DUCKING_MULTIPLIER_CACHE[duckingDb];
  }
  const result = Math.pow(10, duckingDb / 20);
  DUCKING_MULTIPLIER_CACHE[duckingDb] = result;
  return result;
}

/**
 * Calculates ducked volume from base volume and decibel attenuation.
 * In active speech: attenuates to duckingDb (e.g. -14dB)
 * In inactive speech / pause: attenuates to swellDb (default 0dB / unity, or -2dB when specified)
 */
export function getDuckedVolume(
  baseVolume: number,
  speechActive: boolean,
  duckingDb = -14,
  swellDb = 0
): number {
  if (!speechActive) {
    const swellMultiplier = calculateDuckingMultiplier(swellDb);
    return baseVolume * swellMultiplier;
  }
  const duckMultiplier = calculateDuckingMultiplier(duckingDb);
  return baseVolume * duckMultiplier;
}

/**
 * Fast lookup for finding an interval that covers `frame` or its release tail.
 * Returns null if the frame is completely outside any intervals.
 */
export function findActiveInterval(
  frame: number,
  intervals: Array<{ startFrame: number; endFrame: number }>,
  releaseFrames = 0
): { startFrame: number; endFrame: number } | null {
  if (!intervals || intervals.length === 0) return null;

  // For small arrays, direct iteration has zero overhead
  if (intervals.length <= 4) {
    for (let i = 0; i < intervals.length; i++) {
      const it = intervals[i];
      if (frame >= it.startFrame && frame <= it.endFrame + releaseFrames) {
        return it;
      }
    }
    return null;
  }

  // Fast binary search
  let low = 0;
  let high = intervals.length - 1;

  while (low <= high) {
    const mid = (low + high) >> 1;
    const it = intervals[mid];

    if (frame < it.startFrame) {
      high = mid - 1;
    } else if (frame > it.endFrame + releaseFrames) {
      low = mid + 1;
    } else {
      // Prioritize active speech in subsequent interval if overlapping with release tail
      if (
        frame > it.endFrame &&
        mid + 1 < intervals.length &&
        frame >= intervals[mid + 1].startFrame
      ) {
        return intervals[mid + 1];
      }
      return it;
    }
  }

  return null;
}

/**
 * Broadcast Dynamic Volume Calculator
 * Generates an accurate gain envelope across timeline frames:
 * - Dips to -14dB during active dialogue
 * - Smoothly swells to -2dB (or baseVolume) during breath pauses and scene transitions
 * - Applies smooth attack/release ramps at utterance boundaries
 */
export function calculateDynamicMusicVolume(
  frame: number,
  options: {
    baseVolume?: number;
    duckingDb?: number;
    swellDb?: number;
    speechActive?: boolean;
    speechIntervals?: Array<{ startFrame: number; endFrame: number }>;
    breathPauses?: Array<{ startFrame: number; endFrame: number }>;
    attackFrames?: number;
    releaseFrames?: number;
  }
): number {
  const {
    baseVolume = 0.35,
    duckingDb = -14,
    swellDb = 0,
    speechActive,
    speechIntervals = [],
    breathPauses = [],
    attackFrames = 8,
    releaseFrames = 12,
  } = options;

  const duckMultiplier = calculateDuckingMultiplier(duckingDb);   // ~0.1995 for -14dB
  const swellMultiplier = calculateDuckingMultiplier(swellDb);     // ~0.7943 for -2dB, 1.0 for 0dB
  const minVolume = baseVolume * duckMultiplier;
  const maxSwellVolume = baseVolume * swellMultiplier;

  // 1. Explicit breath pauses take immediate precedence (swell to -2dB / maxSwellVolume)
  if (breathPauses.length > 0) {
    const pause = findActiveInterval(frame, breathPauses, 0);
    if (pause && frame >= pause.startFrame && frame <= pause.endFrame) {
      // Check if entering breath pause (smooth swell up)
      if (frame < pause.startFrame + releaseFrames) {
        return interpolate(
          frame,
          [pause.startFrame, pause.startFrame + releaseFrames],
          [minVolume, maxSwellVolume],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
      }
      // Check if exiting breath pause into dialogue (smooth attack down)
      if (frame > pause.endFrame - attackFrames) {
        return interpolate(
          frame,
          [pause.endFrame - attackFrames, pause.endFrame],
          [maxSwellVolume, minVolume],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
      }
      return maxSwellVolume;
    }
  }

  // 2. If explicit speech intervals are provided:
  if (speechIntervals.length > 0) {
    const interval = findActiveInterval(frame, speechIntervals, releaseFrames);
    if (interval) {
      if (frame >= interval.startFrame && frame <= interval.endFrame) {
        // Attack envelope at start of speech: smooth dip from swell to -14dB
        if (frame < interval.startFrame + attackFrames) {
          return interpolate(
            frame,
            [interval.startFrame, interval.startFrame + attackFrames],
            [maxSwellVolume, minVolume],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
        }
        // Fully ducked during speech
        return minVolume;
      }

      // Release envelope after speech ends: smooth swell from -14dB up to swell level
      if (frame > interval.endFrame && frame <= interval.endFrame + releaseFrames) {
        return interpolate(
          frame,
          [interval.endFrame, interval.endFrame + releaseFrames],
          [minVolume, maxSwellVolume],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
      }
    }
    // Outside any speech intervals (e.g. breath pause / scene transitions): return swell volume
    return maxSwellVolume;
  }

  // 3. If boolean speechActive flag is provided:
  if (speechActive !== undefined) {
    return speechActive ? minVolume : maxSwellVolume;
  }

  // Default: return ducked volume (-14dB)
  return minVolume;
}

/**
 * Calculates broadcast gain curve specifically calibrated for television news roundups.
 * Attenuation: -14dB dips during active dialogue, -2dB swells during pauses/transitions.
 */
export function calculateBroadcastGainCurve(
  frame: number,
  segments: RemotionSegment[],
  baseVolume = 0.35
): number {
  const speechIntervals = segments.map((s) => ({
    startFrame: s.startFrame,
    endFrame: s.endFrame,
  }));

  return calculateDynamicMusicVolume(frame, {
    baseVolume,
    duckingDb: -14,
    swellDb: -2,
    speechIntervals,
    attackFrames: 8,
    releaseFrames: 12,
  });
}

/**
 * Dynamic Audio Ducking & Inline SFX Layer
 * Lowers background music volume by -14dB during presenter speech dialogue,
 * smoothly swells to -2dB during breath pauses and scene transitions,
 * and triggers synchronized sound effects at exact frame timestamps.
 */
export const AudioDuckingLayer: React.FC<AudioDuckingLayerProps> = ({
  bgMusicPath,
  speechActive = true,
  baseMusicVolume = 0.35,
  duckingDb = -14,
  swellDb = -2,
  attackFrames = 8,
  releaseFrames = 12,
  segments,
  speechIntervals: explicitIntervals,
  breathPauses,
  sfxTriggers = [],
  ambienceTrackPath,
  ambienceVolume = 0.12,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Extract speech intervals from segments if available (memoized & sorted across frames)
  const derivedIntervals = React.useMemo(() => {
    const raw = explicitIntervals || (segments && segments.length > 0
      ? segments.map((s) => ({ startFrame: s.startFrame, endFrame: s.endFrame }))
      : undefined);
    if (!raw) return undefined;
    return [...raw].sort((a, b) => a.startFrame - b.startFrame);
  }, [explicitIntervals, segments]);

  const sortedBreathPauses = React.useMemo(() => {
    if (!breathPauses || breathPauses.length === 0) return undefined;
    return [...breathPauses].sort((a, b) => a.startFrame - b.startFrame);
  }, [breathPauses]);

  const resolvedBgMusicSrc = React.useMemo(() => resolveSrc(bgMusicPath), [bgMusicPath]);
  const resolvedAmbienceSrc = React.useMemo(() => resolveSrc(ambienceTrackPath), [ambienceTrackPath]);

  // Precompute volume envelope once for the entire composition duration (O(1) frame lookup)
  const volumeEnvelope = React.useMemo(() => {
    if (!durationInFrames || durationInFrames <= 0) return null;
    const env = new Float32Array(durationInFrames);
    for (let f = 0; f < durationInFrames; f++) {
      env[f] = clampVolume(
        calculateDynamicMusicVolume(f, {
          baseVolume: baseMusicVolume,
          duckingDb,
          swellDb,
          speechActive: derivedIntervals ? undefined : speechActive,
          speechIntervals: derivedIntervals,
          breathPauses: sortedBreathPauses,
          attackFrames,
          releaseFrames,
        })
      );
    }
    return env;
  }, [
    durationInFrames,
    baseMusicVolume,
    duckingDb,
    swellDb,
    derivedIntervals,
    speechActive,
    sortedBreathPauses,
    attackFrames,
    releaseFrames,
  ]);

  // Compute frame-accurate volume curve via precomputed envelope, falling back to direct calculation
  const currentVolume =
    volumeEnvelope && frame >= 0 && frame < volumeEnvelope.length
      ? volumeEnvelope[frame]
      : clampVolume(
          calculateDynamicMusicVolume(frame, {
            baseVolume: baseMusicVolume,
            duckingDb,
            swellDb,
            speechActive: derivedIntervals ? undefined : speechActive,
            speechIntervals: derivedIntervals,
            breathPauses: sortedBreathPauses,
            attackFrames,
            releaseFrames,
          })
        );

  return (
    <>
      {/* Background Music with dynamic -14dB ducking and -2dB swell */}
      {bgMusicPath && bgMusicPath.trim() !== "" && (
        <Audio
          src={resolvedBgMusicSrc}
          volume={currentVolume}
          loop
        />
      )}

      {/* Broadcast Studio Ambience Room Tone */}
      {Boolean(ambienceTrackPath && ambienceTrackPath.trim() !== "" && resolvedAmbienceSrc) && (
        <Audio
          src={resolvedAmbienceSrc}
          volume={clampVolume(ambienceVolume ?? 0.12)}
          loop
        />
      )}

      {/* Triggered SFX Audio Clips */}
      {sfxTriggers.map((sfx, idx) => {
        const effect = SFX_LIBRARY[sfx.sfxId];
        if (!effect || !effect.url) return null;

        // Render SFX audio if current frame matches or starts trigger
        if (frame < sfx.triggerFrame) return null;

        const resolved = resolveSrc(effect.url);
        // Guard: Only mount if data URI or external URL to prevent 404 stalls during local development
        if (
          !resolved ||
          (!resolved.startsWith("data:") &&
            !resolved.startsWith("http://") &&
            !resolved.startsWith("https://"))
        ) {
          return null;
        }

        return (
          <Audio
            key={`${sfx.sfxId}-${sfx.triggerFrame}-${idx}`}
            src={resolved}
            volume={sfx.volume ?? effect.defaultVolume}
            startFrom={0}
          />
        );
      })}
    </>
  );
};
