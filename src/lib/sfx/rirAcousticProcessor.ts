import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { getFFmpegPath } from '../ai/comfy/utils';

export interface RIRProcessorOptions {
  inputWavPath: string;
  outputWavPath: string;
  roomPreset?: 'studio_small' | 'broadcast_hall' | 'newsroom_open';
}

/**
 * Applies Room Impulse Response (RIR) acoustic convolution reverb using FFmpeg dynamic audio filter.
 */
export function applyAcousticRIR(options: RIRProcessorOptions): string {
  const ffmpeg = getFFmpegPath();
  const { inputWavPath, outputWavPath, roomPreset = 'broadcast_hall' } = options;

  if (!fs.existsSync(inputWavPath)) {
    throw new Error(`Input WAV file missing: ${inputWavPath}`);
  }

  const dir = path.dirname(outputWavPath);
  fs.mkdirSync(dir, { recursive: true });

  const delayMs = roomPreset === 'broadcast_hall' ? 18 : roomPreset === 'newsroom_open' ? 25 : 8;
  const decayRatio = roomPreset === 'broadcast_hall' ? 0.25 : 0.15;

  execFileSync(ffmpeg, ["-y", "-i", inputWavPath, "-af", `aecho=0.8:0.88:${delayMs}:${decayRatio}`, outputWavPath], { stdio: 'ignore' });
  return outputWavPath;
}
