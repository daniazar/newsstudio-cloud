import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { generateMuseTalkLipSync } from '../lib/ai/musetalkClient';

describe('MuseTalk Real-Time Lip-Sync Client', () => {
  it('should handle offline server gracefully with error state', async () => {
    const tmpImg = path.join(os.tmpdir(), `musetalk_test_${Date.now()}.mp4`);
    const tmpWav = path.join(os.tmpdir(), `musetalk_test_${Date.now()}.wav`);
    fs.writeFileSync(tmpImg, Buffer.from('fake-mp4'));
    fs.writeFileSync(tmpWav, Buffer.from('RIFF'));
    try {
      const res = await generateMuseTalkLipSync({
        videoPath: tmpImg,
        audioPath: tmpWav,
        outputPath: path.join(os.tmpdir(), `musetalk_out_${Date.now()}.mp4`),
        serverUrl: 'http://localhost:9999', // Intentionally unreachable port
      });

      expect(res.success).toBe(false);
      expect(res.error).toBeDefined();
    } finally {
      if (fs.existsSync(tmpImg)) fs.unlinkSync(tmpImg);
      if (fs.existsSync(tmpWav)) fs.unlinkSync(tmpWav);
    }
  });
});
