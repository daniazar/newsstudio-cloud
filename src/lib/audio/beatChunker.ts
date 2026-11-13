/**
 * src/lib/audio/beatChunker.ts
 *
 * High-Precision 4.0-Second Audio Slicer & Pad Normalizer Utility.
 * Slices continuous master TTS speech audio into exact 4.000-second chunks
 * aligned to video motion beats (96 frames @ 24fps / 120 frames @ 30fps)
 * with 10ms sub-millisecond anti-click raised-cosine crossfade windows.
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { getFFmpegPath, getFFprobePath } from "../ai/comfy/utils";

export interface BeatChunkerOptions {
  beatDurationSec?: number; // Default 4.0s
  outputDir?: string;
  sampleRate?: number; // Default 24000 (Piper/Modern-TTS) or 44100 / 48000
  applyAntiClickFade?: boolean; // Default true (10ms cosine window)
  fadeDurationMs?: number; // Default 10ms
}

export interface AudioBeatChunk {
  chunkIndex: number;
  chunkPath: string;
  startTimeSec: number;
  endTimeSec: number;
  durationSec: number;
  isPadded: boolean;
  speechEndsAtSec: number;
}

export interface AudioSliceResult {
  totalBeats: number;
  originalDurationSec: number;
  paddedDurationSec: number;
  chunks: AudioBeatChunk[];
}

export interface WavHeaderInfo {
  audioFormat: number;
  numChannels: number;
  sampleRate: number;
  byteRate: number;
  blockAlign: number;
  bitsPerSample: number;
  dataOffset: number;
  dataSize: number;
  durationSec: number;
}

/**
 * Builds a standard 44-byte RIFF WAVE header for PCM audio.
 */
export function buildWavHeader(
  dataLength: number,
  sampleRate: number,
  numChannels: number = 1,
  bitsPerSample: number = 16
): Buffer {
  const buffer = Buffer.alloc(44);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const byteRate = sampleRate * blockAlign;

  // RIFF Chunk Descriptor
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);

  // fmt Subchunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data Subchunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}

/**
 * Parses RIFF WAV header and finds fmt and data subchunks.
 */
export function parseWavHeader(buffer: Buffer): WavHeaderInfo | null {
  if (
    buffer.length < 44 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WAVE"
  ) {
    return null;
  }

  let offset = 12;
  let audioFormat = 1;
  let numChannels = 1;
  let sampleRate = 24000;
  let byteRate = 48000;
  let blockAlign = 2;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = -1;

  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString("ascii", offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);

    if (chunkId === "fmt ") {
      audioFormat = buffer.readUInt16LE(offset + 8);
      numChannels = buffer.readUInt16LE(offset + 10);
      sampleRate = buffer.readUInt32LE(offset + 12);
      byteRate = buffer.readUInt32LE(offset + 16);
      blockAlign = buffer.readUInt16LE(offset + 20);
      bitsPerSample = buffer.readUInt16LE(offset + 22);
    } else if (chunkId === "data") {
      dataOffset = offset + 8;
      dataSize = Math.min(chunkSize, buffer.length - dataOffset);
      break;
    }

    // RIFF chunk sizes are word-aligned (2 bytes)
    offset += 8 + chunkSize + (chunkSize % 2);
  }

  if (dataOffset !== -1 && dataSize > 0 && byteRate > 0) {
    const durationSec = dataSize / byteRate;
    return {
      audioFormat,
      numChannels,
      sampleRate,
      byteRate,
      blockAlign,
      bitsPerSample,
      dataOffset,
      dataSize,
      durationSec,
    };
  }

  return null;
}

/**
 * Creates a synthetic WAV buffer with a pure tone (useful for tests and synthetic audio).
 */
export function createSyntheticWav(
  durationSec: number,
  sampleRate: number = 24000,
  frequency: number = 440,
  amplitude: number = 0.5
): Buffer {
  const numSamples = Math.round(durationSec * sampleRate);
  const dataLength = numSamples * 2; // 16-bit mono = 2 bytes/sample
  const header = buildWavHeader(dataLength, sampleRate, 1, 16);
  const data = Buffer.alloc(dataLength);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const sampleVal = Math.sin(2 * Math.PI * frequency * t) * amplitude;
    const intSample = Math.max(-32768, Math.min(32767, Math.round(sampleVal * 32767)));
    data.writeInt16LE(intSample, i * 2);
  }

  return Buffer.concat([header, data]);
}

/**
 * Gets exact duration in seconds of an audio file using WAV header, ffprobe, or ffmpeg.
 */
export async function getAudioDuration(audioPath: string): Promise<number> {
  try {
    await fs.promises.access(audioPath);
  } catch {
    throw new Error(`Audio file not found: ${audioPath}`);
  }
  // 1. Fast path: parse raw WAV header if standard RIFF PCM
  try {
    const buffer = await fs.promises.readFile(audioPath);
    const wavInfo = parseWavHeader(buffer);
    if (wavInfo && wavInfo.durationSec > 0) {
      return wavInfo.durationSec;
    }
  } catch {}

  // 2. Attempt ffprobe
  try {
    const ffprobeBin = getFFprobePath();
    const res = spawnSync(
      ffprobeBin,
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", audioPath],
      { encoding: "utf8", windowsHide: true }
    );
    if (res.status === 0 && res.stdout && res.stdout.trim()) {
      const dur = parseFloat(res.stdout.trim());
      if (!isNaN(dur) && dur > 0) return dur;
    }
  } catch {}

  // 3. Attempt ffmpeg fallback
  try {
    const ffmpegBin = getFFmpegPath();
    const res = spawnSync(ffmpegBin, ["-i", audioPath], { encoding: "utf8", windowsHide: true });
    const output = res.stderr || res.stdout || "";
    const match = output.match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
    if (match) {
      const hours = parseFloat(match[1]);
      const mins = parseFloat(match[2]);
      const secs = parseFloat(match[3]);
      return hours * 3600 + mins * 60 + secs;
    }
  } catch {}

  throw new Error(`Unable to determine audio duration for: ${audioPath}`);
}

/**
 * Applies a 10ms raised-cosine fade-in and fade-out to 16-bit PCM samples in place.
 */
export function applyCosineFade16Bit(
  pcmBuffer: Buffer,
  sampleRate: number,
  numChannels: number,
  fadeDurationMs: number = 10
): void {
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const totalSamples = Math.floor(pcmBuffer.length / blockAlign);
  const fadeSamples = Math.min(
    Math.round((fadeDurationMs / 1000) * sampleRate),
    Math.floor(totalSamples / 2)
  );

  if (fadeSamples <= 0) return;

  // 1. Fade-in at start
  for (let s = 0; s < fadeSamples; s++) {
    // Half-sine / raised-cosine window: sin((pi/2) * (s / (fadeSamples - 1)))
    const gain = fadeSamples > 1 ? Math.sin((Math.PI / 2) * (s / (fadeSamples - 1))) : 0;
    for (let c = 0; c < numChannels; c++) {
      const offset = s * blockAlign + c * bytesPerSample;
      const sample = pcmBuffer.readInt16LE(offset);
      const faded = Math.round(sample * gain);
      pcmBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, faded)), offset);
    }
  }

  // 2. Fade-out at end
  for (let s = 0; s < fadeSamples; s++) {
    const gain = Math.cos((Math.PI / 2) * ((s + 1) / fadeSamples));
    const sampleIdx = totalSamples - fadeSamples + s;
    for (let c = 0; c < numChannels; c++) {
      const offset = sampleIdx * blockAlign + c * bytesPerSample;
      const sample = pcmBuffer.readInt16LE(offset);
      const faded = Math.round(sample * gain);
      pcmBuffer.writeInt16LE(Math.max(-32768, Math.min(32767, faded)), offset);
    }
  }
}

/**
 * Slices a master speech .wav audio file into exact 4.0-second beat chunks.
 * Uses high-precision in-memory PCM slicing with raised-cosine anti-click fades,
 * with zero dependency on external audio filters.
 */
export async function sliceAudioIntoBeats(
  masterAudioPath: string,
  options: BeatChunkerOptions = {}
): Promise<AudioSliceResult> {
  const beatDuration = options.beatDurationSec ?? 4.0;
  const applyFade = options.applyAntiClickFade !== false;
  const fadeMs = options.fadeDurationMs ?? 10;

  try {
    await fs.promises.access(masterAudioPath);
  } catch {
    throw new Error(`Master audio file not found: ${masterAudioPath}`);
  }

  const fileBuffer = await fs.promises.readFile(masterAudioPath);
  const wavInfo = parseWavHeader(fileBuffer);

  // If not standard PCM WAV, convert or probe
  let origDuration: number;
  let pcmData: Buffer;
  let sampleRate: number;
  let numChannels: number;
  let bitsPerSample: number;

  if (wavInfo && wavInfo.audioFormat === 1 && wavInfo.bitsPerSample === 16) {
    origDuration = wavInfo.durationSec;
    pcmData = fileBuffer.subarray(wavInfo.dataOffset, wavInfo.dataOffset + wavInfo.dataSize);
    sampleRate = wavInfo.sampleRate;
    numChannels = wavInfo.numChannels;
    bitsPerSample = wavInfo.bitsPerSample;
  } else {
    origDuration = await getAudioDuration(masterAudioPath);
    sampleRate = options.sampleRate || 24000;
    numChannels = 1;
    bitsPerSample = 16;

    // Use ffmpeg to decode to standard 16-bit PCM WAV in memory
    const ffmpegBin = getFFmpegPath();
    const decodeRes = spawnSync(
      ffmpegBin,
      ["-y", "-i", masterAudioPath, "-f", "wav", "-c:a", "pcm_s16le", "-ar", String(sampleRate), "-ac", String(numChannels), "pipe:1"],
      { maxBuffer: 100 * 1024 * 1024, windowsHide: true }
    );

    if (decodeRes.status === 0 && decodeRes.stdout && decodeRes.stdout.length > 44) {
      const decodedWav = parseWavHeader(decodeRes.stdout);
      if (decodedWav) {
        pcmData = decodeRes.stdout.subarray(decodedWav.dataOffset, decodedWav.dataOffset + decodedWav.dataSize);
        sampleRate = decodedWav.sampleRate;
        numChannels = decodedWav.numChannels;
        origDuration = decodedWav.durationSec;
      } else {
        pcmData = decodeRes.stdout.subarray(44);
      }
    } else {
      // Fallback: extract pcmData or pad buffer
      const totalSamples = Math.round(origDuration * sampleRate);
      pcmData = Buffer.alloc(totalSamples * numChannels * 2);
    }
  }

  const totalBeats = Math.max(1, Math.ceil(origDuration / beatDuration));
  const paddedDuration = totalBeats * beatDuration;

  const baseDir =
    options.outputDir ||
    path.join(
      path.dirname(masterAudioPath),
      `beats_${path.basename(masterAudioPath, path.extname(masterAudioPath))}`
    );

  try {
    await fs.promises.access(baseDir);
  } catch {
    await fs.promises.mkdir(baseDir, { recursive: true });
  }

  const chunks: AudioBeatChunk[] = [];
  const samplesPerBeat = Math.round(beatDuration * sampleRate);
  const bytesPerSample = (bitsPerSample / 8) * numChannels;
  const bytesPerBeat = samplesPerBeat * bytesPerSample;

  for (let i = 0; i < totalBeats; i++) {
    const startTimeSec = i * beatDuration;
    const endTimeSec = startTimeSec + beatDuration;
    const isLastBeat = i === totalBeats - 1;
    const isPadded = isLastBeat && origDuration < endTimeSec;

    const chunkFileName = `beat_chunk_${String(i).padStart(3, "0")}.wav`;
    const chunkPath = path.join(baseDir, chunkFileName);

    const startByte = i * bytesPerBeat;

    // Allocate exact 4.000s buffer initialized to 0 (silence padding)
    const chunkPcm = Buffer.alloc(bytesPerBeat);

    if (startByte < pcmData.length) {
      const availableBytes = Math.min(bytesPerBeat, pcmData.length - startByte);
      pcmData.copy(chunkPcm, 0, startByte, startByte + availableBytes);
    }

    // Apply 10ms anti-click raised-cosine fade
    if (applyFade) {
      applyCosineFade16Bit(chunkPcm, sampleRate, numChannels, fadeMs);
    }

    // Prepend 44-byte WAV header
    const wavHeader = buildWavHeader(chunkPcm.length, sampleRate, numChannels, bitsPerSample);
    const fullChunkWav = Buffer.concat([wavHeader, chunkPcm]);

    await fs.promises.writeFile(chunkPath, fullChunkWav);

    chunks.push({
      chunkIndex: i,
      chunkPath,
      startTimeSec,
      endTimeSec,
      durationSec: beatDuration,
      isPadded,
      speechEndsAtSec: Math.min(origDuration, endTimeSec),
    });
  }

  return {
    totalBeats,
    originalDurationSec: Math.round(origDuration * 1000) / 1000,
    paddedDurationSec: paddedDuration,
    chunks,
  };
}
