/**
 * NewsStudio Subtitle & Timecode Generator
 * Generates SRT, VTT, and word-level alignment timecodes from speech script and audio duration.
 */

export interface WordTimestamp {
  word: string;
  startSec: number;
  endSec: number;
}

export function getWordTimestamps(text: string, durationSec: number): WordTimestamp[] {
  if (!text || durationSec <= 0) return [];

  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  // Compute character-weighted time distribution for natural timing
  const totalChars = words.reduce((acc, w) => acc + w.length, 0);
  let accumulatedTime = 0.1; // 100ms initial breath buffer
  const effectiveDuration = Math.max(0.5, durationSec - 0.2);

  return words.map((word) => {
    const wordShare = (word.length / totalChars) * effectiveDuration;
    const startSec = Math.round(accumulatedTime * 100) / 100;
    accumulatedTime += wordShare;
    const endSec = Math.min(durationSec, Math.round(accumulatedTime * 100) / 100);

    return { word, startSec, endSec };
  });
}

function formatSrtTime(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
}

function formatVttTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms.toString().padStart(3, "0")}`;
}

export function generateSrt(text: string, durationSec: number): string {
  const timestamps = getWordTimestamps(text, durationSec);
  if (timestamps.length === 0) return "";

  // Group into chunks of 6-8 words per subtitle card
  const chunkSize = 7;
  let srtOutput = "";
  let index = 1;

  for (let i = 0; i < timestamps.length; i += chunkSize) {
    const chunk = timestamps.slice(i, i + chunkSize);
    const start = chunk[0].startSec;
    const end = chunk[chunk.length - 1].endSec;
    const chunkText = chunk.map((c) => c.word).join(" ");

    srtOutput += `${index}\n`;
    srtOutput += `${formatSrtTime(start)} --> ${formatSrtTime(end)}\n`;
    srtOutput += `${chunkText}\n\n`;
    index++;
  }

  return srtOutput.trim();
}

export function generateVtt(text: string, durationSec: number): string {
  const timestamps = getWordTimestamps(text, durationSec);
  if (timestamps.length === 0) return "WEBVTT\n\n";

  const chunkSize = 7;
  let vttOutput = "WEBVTT\n\n";

  for (let i = 0; i < timestamps.length; i += chunkSize) {
    const chunk = timestamps.slice(i, i + chunkSize);
    const start = chunk[0].startSec;
    const end = chunk[chunk.length - 1].endSec;
    const chunkText = chunk.map((c) => c.word).join(" ");

    vttOutput += `${formatVttTime(start)} --> ${formatVttTime(end)}\n`;
    vttOutput += `${chunkText}\n\n`;
  }

  return vttOutput.trim();
}
