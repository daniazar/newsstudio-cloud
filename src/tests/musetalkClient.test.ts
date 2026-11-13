import { describe, it, expect } from 'vitest';
import { generateMuseTalkLipSync } from '../lib/ai/musetalkClient';

describe('MuseTalk Real-Time Lip-Sync Client', () => {
  it('should handle offline server gracefully with error state', async () => {
    const res = await generateMuseTalkLipSync({
      videoPath: 'public/avatars/master_ruby/ruby_standing_bg.jpg',
      audioPath: 'storage/cache/silent_3s.wav',
      outputPath: 'storage/cache/musetalk_test_out.mp4',
      serverUrl: 'http://localhost:9999', // Intentionally unreachable port
    });

    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
