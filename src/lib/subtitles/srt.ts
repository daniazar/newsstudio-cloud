/**
 * SRT Subtitle Generation Utility
 * Generates SRT format subtitle files from segment timing data already in the database.
 * No Whisper needed — we already have the transcript text and timestamps.
 */

interface SubtitleSegment {
  index: number;
  startTime: number; // seconds
  endTime: number;   // seconds
  text: string;
}

/**
 * Format a time in seconds to SRT timestamp format: HH:MM:SS,mmm
 */
function formatSRTTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);

  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0"),
  ].join(":") + "," + String(ms).padStart(3, "0");
}

/**
 * Split long text into subtitle-friendly chunks (max ~42 chars per line, 2 lines max).
 * This follows broadcast captioning standards for readability.
 */
function splitTextForSubtitles(text: string, maxCharsPerLine: number = 42): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const word of words) {
    const testLine = currentChunk ? `${currentChunk} ${word}` : word;
    
    if (testLine.length > maxCharsPerLine * 2) {
      // Current chunk is full, push it and start new one
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = word;
    } else {
      currentChunk = testLine;
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

/**
 * Format a chunk for SRT display (wrap to 2 lines max).
 */
function formatChunkForSRT(text: string, maxCharsPerLine: number = 42): string {
  if (text.length <= maxCharsPerLine) return text;

  const words = text.split(/\s+/);
  const midpoint = Math.ceil(words.length / 2);
  const line1 = words.slice(0, midpoint).join(" ");
  const line2 = words.slice(midpoint).join(" ");

  return `${line1}\n${line2}`;
}

/**
 * Generate an SRT subtitle string from an array of segments.
 * Each segment becomes one or more subtitle entries depending on text length.
 */
export function generateSRT(segments: SubtitleSegment[]): string {
  const entries: string[] = [];
  let entryIndex = 1;

  for (const segment of segments) {
    const chunks = splitTextForSubtitles(segment.text);
    const totalDuration = segment.endTime - segment.startTime;
    const chunkDuration = totalDuration / chunks.length;

    for (let i = 0; i < chunks.length; i++) {
      const chunkStart = segment.startTime + (i * chunkDuration);
      const chunkEnd = segment.startTime + ((i + 1) * chunkDuration);

      const formattedText = formatChunkForSRT(chunks[i]);

      entries.push(
        `${entryIndex}\n` +
        `${formatSRTTimestamp(chunkStart)} --> ${formatSRTTimestamp(chunkEnd)}\n` +
        `${formattedText}\n`
      );

      entryIndex++;
    }
  }

  return entries.join("\n");
}

/**
 * Generate a VTT (WebVTT) subtitle string from segments.
 * VTT is the web-native subtitle format used by <video> elements.
 */
export function generateVTT(segments: SubtitleSegment[]): string {
  const entries: string[] = ["WEBVTT\n"];
  let entryIndex = 1;

  for (const segment of segments) {
    const chunks = splitTextForSubtitles(segment.text);
    const totalDuration = segment.endTime - segment.startTime;
    const chunkDuration = totalDuration / chunks.length;

    for (let i = 0; i < chunks.length; i++) {
      const chunkStart = segment.startTime + (i * chunkDuration);
      const chunkEnd = segment.startTime + ((i + 1) * chunkDuration);

      // VTT uses period instead of comma for milliseconds
      const startStr = formatSRTTimestamp(chunkStart).replace(",", ".");
      const endStr = formatSRTTimestamp(chunkEnd).replace(",", ".");
      const formattedText = formatChunkForSRT(chunks[i]);

      entries.push(
        `${entryIndex}\n` +
        `${startStr} --> ${endStr}\n` +
        `${formattedText}\n`
      );

      entryIndex++;
    }
  }

  return entries.join("\n");
}
