import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { buildPingPongLoop } from '../../scripts/loop-clip-builder';

describe('Sprint L-1: Ping-Pong Loop Builder', () => {
  it('should export buildPingPongLoop function', () => {
    expect(typeof buildPingPongLoop).toBe('function');
  });

  it('should throw error when input video file does not exist', () => {
    expect(() => {
      buildPingPongLoop({
        inputMp4Path: 'non_existent_video_123.mp4',
        outputMp4Path: 'storage/cache/test_out.mp4',
      });
    }).toThrow(/Input MP4 file not found/);
  });
});
