import { describe, it, expect } from 'vitest';
import { monitorComfyUIWatchdog } from '../lib/ai/comfy/comfyWatchdog';
import { getStudioPlate } from '../lib/ai/studioPlateSwapper';
import { indexActionClip } from '../../scripts/build_action_library';

describe('Invented Features: Comfy Watchdog, Studio Swapper & Action Library', () => {
  it('should return true for recent ComfyUI watchdog check', async () => {
    const isOk = await monitorComfyUIWatchdog(Date.now());
    expect(isOk).toBe(true);
  });

  it('should return valid studio plate by ID', () => {
    const plate = getStudioPlate('tech_hub');
    expect(plate.id).toBe('tech_hub');
    expect(plate.name).toBe('Tech Innovation Hub');
  });

  it('should attempt action clip indexing cleanly', async () => {
    const res = await indexActionClip({
      personaId: 'ruby',
      tier: 1,
      stanceArchetype: 'desk_anchor',
      actionType: 'clip_micro_idle_blink',
      clipStorageKey: 'sample.mp4',
    });
    expect(res === null || typeof res === 'object').toBe(true);
  });
});
