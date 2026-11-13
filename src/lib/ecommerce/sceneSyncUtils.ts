import { AdScene } from "@/lib/types/ecommerce";

export function estimateSceneDurationFromScript(
  scriptText: string,
  wordsPerMinute: number = 150,
  fps: number = 30
): { durationSeconds: number; durationFrames: number } {
  if (!scriptText || !scriptText.trim()) {
    return { durationSeconds: 3.0, durationFrames: Math.round(3.0 * fps) };
  }
  const words = scriptText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  // WPM to seconds per word
  const secondsPerWord = 60 / wordsPerMinute;
  const rawDuration = Math.max(2.5, wordCount * secondsPerWord + 0.5); // Add 0.5s breathing padding
  const durationSeconds = Math.round(rawDuration * 10) / 10;
  const durationFrames = Math.round(durationSeconds * fps);
  return { durationSeconds, durationFrames };
}

export function normalizeSpokenText(rawText: string): string {
  if (!rawText) return "";
  let text = rawText.trim();
  // Expand symbols for natural speech synthesis
  text = text.replace(/\$/g, " dollars ");
  text = text.replace(/%/g, " percent ");
  text = text.replace(/&/g, " and ");
  text = text.replace(/@/g, " at ");
  text = text.replace(/#/g, " number ");
  // Clean up duplicate spaces
  return text.replace(/\s+/g, " ").trim();
}

export function calibrateSceneDurations(scenes: AdScene[], fps: number = 30): AdScene[] {
  return scenes.map((scene) => {
    const spoken = scene.spokenVoiceoverScript || scene.voiceoverScript || scene.headline || "";
    const { durationFrames } = estimateSceneDurationFromScript(spoken, 150, fps);
    const existingFrames = scene.durationFrames && scene.durationFrames > 0 ? scene.durationFrames : durationFrames;
    return {
      ...scene,
      durationFrames: existingFrames,
    };
  });
}

export function calculateTotalDuration(
  scenes: AdScene[],
  fps: number = 30
): { totalSeconds: number; totalFrames: number } {
  const totalFrames = (scenes || []).reduce((acc, scene) => acc + (scene.durationFrames || 90), 0);
  const totalSeconds = Math.round((totalFrames / fps) * 10) / 10;
  return { totalSeconds, totalFrames };
}
