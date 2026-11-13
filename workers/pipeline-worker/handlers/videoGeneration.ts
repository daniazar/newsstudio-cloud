/**
 * workers/pipeline-worker/handlers/videoGeneration.ts
 *
 * Video generation handler orchestrating FSM action sequences, MuseTalk neural lip-sync,
 * and ComfyUI diffusion for pipeline worker jobs.
 */

import fs from "fs";
import path from "path";
import os from "os";
import { storage, generateKey } from "@/lib/storage";
import { reportProgress, updateSegment } from "../api";
import { stitchFsmStoryVideo, FsmStitchResult } from "@/lib/video/fsmStitcher";
import { PRICING } from "@/lib/constants/pricing";
import { getFFprobePath } from "@/lib/ai/comfy/utils";
import { spawnSync } from "child_process";
import { createLogger } from "@/lib/logger";

const log = createLogger("worker:handlers:videoGeneration");

export interface FsmVideoGenerationPayload {
  jobId: string;
  companyId: string;
  storyId: string;
  segment: {
    id: string;
    index: number;
    personaId?: string;
    audioPath?: string;
    text?: string;
    startTime?: number | null;
    endTime?: number | null;
    sceneStrategy?: string;
  };
  musetalkServerUrl?: string;
}

/**
 * Handles FSM video generation for a story segment using 4.0s beat chunking,
 * Markov action planning, parallel MuseTalk lip-sync, and FFmpeg concatenation.
 */
export async function handleFsmVideoGeneration(
  payload: FsmVideoGenerationPayload
): Promise<FsmStitchResult> {
  const { jobId, companyId, storyId, segment, musetalkServerUrl } = payload;
  const personaId = (segment.personaId || "ruby").toLowerCase();

  if (!segment.audioPath) {
    throw new Error(`Audio path missing for segment ${segment.id}`);
  }

  const tmpDir = os.tmpdir();
  const localAudioPath = path.join(tmpDir, `audio-fsm-${segment.id}.wav`);
  const localVideoOut = path.join(tmpDir, `video-fsm-${segment.id}.mp4`);

  try {
    // 1. Download master audio from S3/local storage
    const audioBuffer = await storage.download(segment.audioPath);
    if (!audioBuffer) {
      throw new Error(`Failed to download audio from storage key: ${segment.audioPath}`);
    }
    fs.writeFileSync(localAudioPath, audioBuffer);

    // 2. Dispatch FSM Sequence Stitcher
    log.info(`🎬 [Video Handler] Synthesizing FSM video for Segment ${segment.id} (Persona: ${personaId})...`);
    const stitchResult = await stitchFsmStoryVideo({
      masterAudioPath: localAudioPath,
      personaId,
      scriptText: segment.text,
      outputVideoPath: localVideoOut,
      musetalkServerUrl,
      onProgress: (prog) => {
        reportProgress(jobId, {
          step: `fsm_video_seg_${segment.index}_${prog.phase}`,
          status: "VIDEO_IN_PROGRESS",
          doneSteps: prog.progress / 100,
        }).catch(() => {});
      },
    });

    if (!stitchResult.success || !fs.existsSync(stitchResult.finalVideoPath)) {
      throw new Error(`FSM Video stitching failed: ${stitchResult.error || "Output missing"}`);
    }

    // 3. Probe duration of the final generated video
    let duration = stitchResult.durationSeconds;
    try {
      const probeRes = spawnSync(
        getFFprobePath(),
        [
          "-v",
          "error",
          "-show_entries",
          "format=duration",
          "-of",
          "default=noprint_wrappers=1:nokey=1",
          stitchResult.finalVideoPath,
        ],
        { encoding: "utf8", windowsHide: true }
      );
      if (probeRes.status === 0 && probeRes.stdout && probeRes.stdout.trim()) {
        const probedDur = parseFloat(probeRes.stdout.trim());
        if (!isNaN(probedDur) && probedDur > 0) {
          duration = probedDur;
        }
      }
    } catch {}

    // 4. Upload generated video to S3 storage
    const videoBuffer = fs.readFileSync(stitchResult.finalVideoPath);
    const videoFilename = `seg_${segment.index}_${personaId}_fsm.mp4`;
    const objectKey = generateKey({
      companyId,
      type: "video",
      id: storyId,
      filename: videoFilename,
    });

    await storage.upload(objectKey, videoBuffer, "video/mp4");

    // 5. Update segment in database
    const updateData: Record<string, unknown> = { presenterVideoPath: objectKey };
    if (segment.startTime !== null && segment.startTime !== undefined) {
      updateData.endTime = segment.startTime + duration;
    }
    await updateSegment(jobId, segment.id, updateData);

    const creditsUsed = duration * PRICING.COST_PER_VIDEO_SEC;
    await reportProgress(jobId, {
      step: `video_fsm_seg_${segment.index}_complete`,
      status: "VIDEO_IN_PROGRESS",
      doneSteps: segment.index + 1,
      creditsUsed,
    });

    return stitchResult;
  } finally {
    try {
      if (fs.existsSync(localAudioPath)) fs.unlinkSync(localAudioPath);
    } catch {}
    try {
      if (fs.existsSync(localVideoOut)) fs.unlinkSync(localVideoOut);
    } catch {}
  }
}
