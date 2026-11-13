import fs from 'fs';
import path from 'path';
import { submitPrompt, waitForCompletion, downloadOutput, uploadFileToComfyUI } from './comfy/api';
import { buildWorkflowPrompt } from './comfy/workflowBuilder';
import { generateMuseTalkLipSync } from './musetalkClient';
import { createLogger } from "@/lib/logger";

const log = createLogger("ai:presenterLipSyncClient");

export interface PresenterLipSyncOptions {
  videoPath: string;
  audioPath: string;
  outputPath: string;
  provider?: 'sadtalker' | 'latentsync' | 'ltx_audio' | 'musetalk' | 'presenter_api';
}

/**
 * Audio-Driven Lip-Sync Client supporting LTX Audio, SadTalker, LatentSync & MuseTalk.
 */
export async function generatePresenterLipSync(options: PresenterLipSyncOptions): Promise<string> {
  const { videoPath, audioPath, outputPath, provider = 'ltx_audio' } = options;

  if (!fs.existsSync(videoPath)) throw new Error(`Video file missing: ${videoPath}`);
  if (!fs.existsSync(audioPath)) throw new Error(`Audio file missing: ${audioPath}`);

  log.info(`🎤 [PresenterLipSync] Synthesizing lip-sync using provider: ${provider}...`);

  if (provider === 'musetalk') {
    const res = await generateMuseTalkLipSync({ videoPath, audioPath, outputPath });
    if (res.success && res.outputPath) {
      return res.outputPath;
    }
    console.warn(`⚠️ [PresenterLipSync] MuseTalk server offline/failed (${res.error}). Falling back to LTX Audio...`);
  }

  const uploadedVideo = await uploadFileToComfyUI(videoPath);
  const uploadedAudio = await uploadFileToComfyUI(audioPath);

  const ltxWfPath = path.join(process.cwd(), 'comfy_workflows', 'video', 'ltx_video_unified.json');
  const rawWf = JSON.parse(fs.readFileSync(ltxWfPath, 'utf8'));

  const promptWf = buildWorkflowPrompt(rawWf, uploadedVideo, uploadedAudio, {
    model: 'ltx',
    imagePath: videoPath,
    audioPath: audioPath,
    isSilent: false,
    filenamePrefix: 'presenter_lipsync_output',
  });

  const promptId = await submitPrompt(promptWf, 'presenter_lipsync_client');
  const history = await waitForCompletion(promptId, 'presenter_lipsync_client');
  const buf = await downloadOutput(history);

  const dir = path.dirname(outputPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, buf);

  log.info(`✅ [PresenterLipSync] Lip-synced presenter video saved: ${outputPath}`);
  return outputPath;
}
