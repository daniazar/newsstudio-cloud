/**
 * lib/ai/dyadicStudioEngine.ts
 *
 * Smart Director AI — calculates dynamic camera switching for multi-anchor
 * interview and roundtable productions.
 *
 * Analyses a speaker turn timeline and applies broadcast-standard camera grammar:
 *   - New speaker entrance  → Wide establishing shot (2-shot)
 *   - Short turn (<6s)      → Medium shot (waist up)
 *   - Long turn (>12s)      → Rotate through medium → closeup → medium
 *   - Transition / handoff  → Brief wide re-establishing cut
 */

export type CameraAngle = "wide" | "medium" | "closeup";

export interface SpeakerTurn {
  /** Frame index where this speaker starts talking */
  frame: number;
  speakerId: "anchor_a" | "anchor_b";
  /** Duration in frames (optional — used for long-turn closeup rotation) */
  durationFrames?: number;
}

export interface SpeakerCut {
  frame: number;
  speakerId: "anchor_a" | "anchor_b";
  cameraAngle: CameraAngle;
  /** Human-readable rationale for debugging */
  reason: string;
}

/**
 * Broadcast camera grammar constants (at 30 fps).
 */
const FPS = 30;
const _SHORT_TURN_FRAMES = 6 * FPS;   // < 6s → medium only
const _LONG_TURN_FRAMES  = 12 * FPS;  // > 12s → rotate medium→closeup→medium

/**
 * Smart Director AI: Calculates dynamic camera switching cuts based on speaker timestamps.
 *
 * @param speakerTimeline - Array of speaker turns with frame positions
 * @param fps - Frame rate (default: 30)
 * @returns Array of SpeakerCut directives for the Remotion composition
 */
export function calculateDirectorCuts(
  speakerTimeline: SpeakerTurn[],
  fps: number = FPS
): SpeakerCut[] {
  const cuts: SpeakerCut[] = [];
  const shortTurn = 6 * fps;
  const longTurn = 12 * fps;

  for (let i = 0; i < speakerTimeline.length; i++) {
    const turn = speakerTimeline[i];
    const nextTurn = speakerTimeline[i + 1];
    const duration = turn.durationFrames
      ?? (nextTurn ? nextTurn.frame - turn.frame : shortTurn);

    const isFirstTurn = i === 0;
    const isSpeakerSwitch = i > 0 && speakerTimeline[i - 1].speakerId !== turn.speakerId;

    if (isFirstTurn || isSpeakerSwitch) {
      // Always open with a wide establishing shot on speaker entrance / handoff
      cuts.push({
        frame: turn.frame,
        speakerId: turn.speakerId,
        cameraAngle: "wide",
        reason: isFirstTurn ? "opening establishing shot" : "speaker handoff re-establish",
      });

      // If turn is long enough, cut to medium 1s after the wide
      if (duration > shortTurn) {
        cuts.push({
          frame: turn.frame + fps,
          speakerId: turn.speakerId,
          cameraAngle: "medium",
          reason: "settle after establishing",
        });
      }
    } else {
      // Same speaker continuing
      cuts.push({
        frame: turn.frame,
        speakerId: turn.speakerId,
        cameraAngle: "medium",
        reason: "continuing speaker medium hold",
      });
    }

    // For very long turns, inject a closeup mid-turn then return to medium
    if (duration > longTurn) {
      const midPoint = turn.frame + Math.floor(duration / 2);
      cuts.push({
        frame: midPoint,
        speakerId: turn.speakerId,
        cameraAngle: "closeup",
        reason: "long turn emphasis closeup",
      });

      cuts.push({
        frame: midPoint + 4 * fps,
        speakerId: turn.speakerId,
        cameraAngle: "medium",
        reason: "return from closeup to medium",
      });
    }
  }

  // Deduplicate consecutive cuts at the same frame (keep last)
  const deduped = cuts.reduce<SpeakerCut[]>((acc, cut) => {
    if (acc.length > 0 && acc[acc.length - 1].frame === cut.frame) {
      acc[acc.length - 1] = cut; // replace with later cut
    } else {
      acc.push(cut);
    }
    return acc;
  }, []);

  return deduped;
}

/**
 * Converts a simple flat speaker list (without duration info) to SpeakerTurn[]
 * by inferring durations from the gap to the next turn.
 */
export function inferSpeakerTurnDurations(
  flatTimeline: { frame: number; speakerId: "anchor_a" | "anchor_b" }[]
): SpeakerTurn[] {
  return flatTimeline.map((turn, i) => ({
    ...turn,
    durationFrames: i < flatTimeline.length - 1
      ? flatTimeline[i + 1].frame - turn.frame
      : 6 * FPS, // default 6s for last turn
  }));
}
