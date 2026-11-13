/**
 * lib/ai/microBehaviorEngine.ts
 *
 * Sub-pixel Vocal Micro-Behavior Engine
 *
 * Computes frame-level micro-animation offsets driven by TTS pitch contour data.
 * These values are applied as subtle CSS/canvas transforms on the presenter video
 * to make AI-generated anchors feel more alive during speech.
 *
 * Two systems:
 *  1. Head tilt (±1.2°) — driven by pitch derivative (vocal stress)
 *  2. Lip-sync intensity (0–1) — driven by pitch magnitude (loudness proxy)
 */

export interface VocalMicroTilt {
  /** Frame index (matches the TTS audio frame at the given fps) */
  frameIndex: number;
  /** Head rotation in degrees — positive = right tilt, negative = left tilt */
  rotationDegrees: number;
}

export interface LipSyncIntensity {
  /** Frame index */
  frameIndex: number;
  /**
   * Mouth opening intensity 0.0 (closed) → 1.0 (fully open).
   * Used to drive morph target blend weights when available.
   */
  intensity: number;
}

export interface MicroBehaviorFrame {
  frameIndex: number;
  rotationDegrees: number;
  lipIntensity: number;
  /** True if this frame is during a natural pause (pitch near-zero) */
  isPause: boolean;
}

/**
 * Synthesizes sub-pixel vocal stress micro-tilts from a pitch contour array.
 *
 * @param pitchContour - Array of pitch values in Hz (one per frame). 0 = unvoiced/silence.
 * @param maxTiltDeg - Maximum allowed head rotation in degrees (default ±1.2°)
 */
export function calculateVocalMicroTilts(
  pitchContour: number[],
  maxTiltDeg = 1.2
): VocalMicroTilt[] {
  if (pitchContour.length < 2) return [];

  const tilts: VocalMicroTilt[] = [];

  for (let i = 1; i < pitchContour.length; i++) {
    const delta = pitchContour[i] - pitchContour[i - 1];
    // Normalize derivative — ±50 Hz/frame is considered max expression
    const normalized = Math.max(-1, Math.min(1, delta / 50.0));
    const rotationDegrees = parseFloat((normalized * maxTiltDeg).toFixed(3));
    tilts.push({ frameIndex: i, rotationDegrees });
  }

  return tilts;
}

/**
 * Derives lip-sync intensity (0–1) from pitch magnitude.
 * Silence / unvoiced frames → 0.0, strong voiced speech → near 1.0.
 *
 * @param pitchContour - Array of pitch values in Hz (0 = silence)
 * @param maxPitch - Expected pitch ceiling in Hz for this voice (default 400 Hz)
 */
export function calculateLipSyncIntensity(
  pitchContour: number[],
  maxPitch = 400
): LipSyncIntensity[] {
  return pitchContour.map((pitch, frameIndex) => {
    const intensity = pitch <= 0
      ? 0 // unvoiced / silence
      : parseFloat(Math.min(1.0, pitch / maxPitch).toFixed(3));
    return { frameIndex, intensity };
  });
}

/**
 * Combines tilt and lip-sync data into a single per-frame micro-behavior stream.
 * Adds pause detection (pitch < 20 Hz for ≥3 consecutive frames).
 *
 * @param pitchContour - Array of pitch values in Hz
 * @param maxTiltDeg - Maximum head tilt in degrees
 * @param maxPitch - Expected pitch ceiling for this voice
 */
export function buildMicroBehaviorStream(
  pitchContour: number[],
  maxTiltDeg = 1.2,
  maxPitch = 400
): MicroBehaviorFrame[] {
  if (pitchContour.length === 0) return [];

  const tilts = calculateVocalMicroTilts(pitchContour, maxTiltDeg);
  const lips = calculateLipSyncIntensity(pitchContour, maxPitch);

  // Detect pause windows (pitch < 20 Hz for ≥3 consecutive frames)
  const PAUSE_THRESHOLD = 20;
  const MIN_PAUSE_FRAMES = 3;
  const isPauseFrame = new Array(pitchContour.length).fill(false);

  let pauseRun = 0;
  for (let i = 0; i < pitchContour.length; i++) {
    if (pitchContour[i] < PAUSE_THRESHOLD) {
      pauseRun++;
      if (pauseRun >= MIN_PAUSE_FRAMES) {
        // Mark the whole run as a pause
        for (let j = i - pauseRun + 1; j <= i; j++) {
          isPauseFrame[j] = true;
        }
      }
    } else {
      pauseRun = 0;
    }
  }

  return pitchContour.map((_, frameIndex) => ({
    frameIndex,
    rotationDegrees: tilts[frameIndex]?.rotationDegrees ?? 0,
    lipIntensity: lips[frameIndex]?.intensity ?? 0,
    isPause: isPauseFrame[frameIndex],
  }));
}

/**
 * Generates a synthetic pitch contour from a TTS audio file's RMS envelope.
 * Used when a real F0 extractor (e.g. pyworld) is unavailable.
 *
 * @param rmsEnvelope - Per-frame RMS energy values (0–1) extracted from TTS audio
 * @param basePitch - Estimated base pitch for the voice in Hz
 */
export function syntheticPitchFromRms(
  rmsEnvelope: number[],
  basePitch = 180
): number[] {
  return rmsEnvelope.map((rms) => {
    if (rms < 0.01) return 0; // silence
    // Modulate pitch around base by ±20% based on energy
    const jitter = (rms - 0.5) * 0.4 * basePitch;
    return Math.max(0, basePitch + jitter);
  });
}
