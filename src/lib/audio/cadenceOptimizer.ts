/**
 * src/lib/audio/cadenceOptimizer.ts
 *
 * News Broadcast Cadence & Breathing Pause Optimizer.
 * Aligns script delivery pacing, breath punctuation (ellipses, em-dashes),
 * and paragraph timings to fit cleanly within 4.0-second video motion beat windows.
 */

export interface ScriptCadenceAnalysis {
  wordCount: number;
  estimatedSpeechDurationSec: number;
  recommendedBeats: number;
  optimizedText: string;
  detectedCues: Array<{ timeSec: number; tag: string; description: string }>;
  pacingScore: number; // 0.0 to 1.0 (1.0 = optimal beat boundary fit)
  breathingPausesInjected: number;
}

export interface CadenceOptions {
  wordsPerMinute?: number; // Default 150 WPM (2.5 words/sec)
  targetBeatSeconds?: number; // Default 4.0s
  targetDurationSec?: number; // Optional overall story target
}

/**
 * Optimizes script text punctuation, breathing pauses, and calculates estimated beat count.
 */
export function optimizeScriptCadence(
  rawText: string,
  options: CadenceOptions = {}
): ScriptCadenceAnalysis {
  const wpm = options.wordsPerMinute ?? 150;
  const beatSec = options.targetBeatSeconds ?? 4.0;
  const wordsPerSec = wpm / 60.0;

  // Extract explicit tags like [BREAKING], [DATA], [EXPLAIN], [CONCLUSION], [SUMMARY], [FOCUS], [NEUTRAL]
  const detectedCues: Array<{ timeSec: number; tag: string; description: string }> = [];

  // Track words prior to each tag to compute cue timestamps
  const words = rawText.split(/\s+/).filter(Boolean);
  let accumulatedWords = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const tagMatch = word.match(/\[([A-Z_]+)\]/);
    if (tagMatch) {
      const tag = tagMatch[1]; // Tag without brackets
      const approxTimeSec = Math.floor(accumulatedWords / wordsPerSec);
      detectedCues.push({
        timeSec: approxTimeSec,
        tag,
        description: `Script cue [${tag}] at ~${approxTimeSec}s`,
      });
    } else {
      accumulatedWords++;
    }
  }

  // Optimize sentence boundaries with natural breathing pauses:
  // - Replace hard abrupt periods with subtle pause markers
  // - Ensure comma pauses and parenthetical em-dashes
  let pausesInjected = 0;
  const optimized = rawText
    .replace(/\s+/g, " ")
    .replace(/,\s*/g, () => {
      pausesInjected++;
      return ", ";
    })
    .replace(/\.\s+/g, () => {
      pausesInjected++;
      return "... ";
    })
    .replace(/--|—/g, () => {
      pausesInjected++;
      return " — ";
    })
    .trim();

  const totalWords = words.filter((w) => !w.match(/\[([A-Z_]+)\]/)).length;
  const estimatedDuration = totalWords / wordsPerSec;
  const recommendedBeats = Math.max(1, Math.ceil(estimatedDuration / beatSec));
  const expectedPaddedDuration = recommendedBeats * beatSec;

  // Pacing score: how well the speech tail fits the beat boundary (ideal tail is 0.5s - 1.0s before boundary)
  const remainingBeatTail = expectedPaddedDuration - estimatedDuration;
  const pacingScore = remainingBeatTail >= 0.3 && remainingBeatTail <= 1.5 ? 1.0 : Math.max(0.2, 1.0 - Math.abs(remainingBeatTail - 0.8) / 3.0);

  return {
    wordCount: totalWords,
    estimatedSpeechDurationSec: Math.round(estimatedDuration * 10) / 10,
    recommendedBeats,
    optimizedText: optimized,
    detectedCues,
    pacingScore: Math.round(pacingScore * 100) / 100,
    breathingPausesInjected: pausesInjected,
  };
}

/**
 * Convenience alias matching the implementation plan specification.
 */
export function optimizeScriptPacingForBeats(
  scriptText: string,
  targetDurationSec?: number,
  options?: CadenceOptions
): ScriptCadenceAnalysis {
  return optimizeScriptCadence(scriptText, {
    ...options,
    targetDurationSec,
  });
}
