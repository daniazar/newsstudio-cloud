/**
 * workers/pipeline-worker/tasks/wardrobeInpaintTask.ts
 *
 * Standalone worker task for neural wardrobe video inpainting (GenerationJob type "wardrobe_inpaint").
 * Coordinates with ComfyUI running MiniMax H3 + SAM 3.1 + MVEx_SubjectCrop/Uncrop.
 */

import { executeWardrobeInpaint, WardrobeInpaintInputs } from "@/lib/ai/comfyClient";
import { reportProgress } from "../api";
import { createLogger } from "@/lib/logger";

const log = createLogger("worker:tasks:wardrobeInpaintTask");

export async function stepWardrobeInpaint(
  job: Record<string, unknown>,
  jobId: string
): Promise<{ outputPublicUrl: string; outputPath: string }> {
  log.info(`\n👗 [WardrobeInpaintTask] Starting neural outfit inpainting for job ${jobId}...`);

  const rawConfig = job.config ? (typeof job.config === "string" ? JSON.parse(job.config) : job.config) : {};
  const config = rawConfig as Partial<WardrobeInpaintInputs>;

  if (!config.sourceVideoPath || !config.outfitImagePath || !config.outfitName) {
    throw new Error(
      "Missing required wardrobe inpaint parameters: sourceVideoPath, outfitImagePath, outfitName"
    );
  }

  await reportProgress(jobId, {
    step: "init",
    status: "IN_PROGRESS",
    doneSteps: 5,
  });

  const inputs: WardrobeInpaintInputs = {
    sourceVideoPath: config.sourceVideoPath,
    outfitImagePath: config.outfitImagePath,
    personaName: config.personaName || "Ruby Vance",
    sourceGarment: config.sourceGarment || "burgundy dress",
    outfitName: config.outfitName,
    outfitDescription: config.outfitDescription || config.outfitName,
    trackPrompt: config.trackPrompt,
    customMiniMaxPrompt: config.customMiniMaxPrompt,
    frameCount: config.frameCount ?? 0,
    seed: config.seed ?? 20261002,
    outputPrefix: `worker_wardrobe_${jobId}`,
  };

  const result = await executeWardrobeInpaint(inputs, async (progress) => {
    log.info(`  [WardrobeInpaintTask] ${progress.percent}% — ${progress.message}`);
    await reportProgress(jobId, {
      step: progress.phase,
      status: "IN_PROGRESS",
      doneSteps: progress.percent,
    }).catch(() => {});
  });

  log.info(`✅ [WardrobeInpaintTask] Completed: ${result.outputPublicUrl}`);

  await reportProgress(jobId, {
    step: "done",
    status: "DONE",
    doneSteps: 100,
    result: {
      outputPublicUrl: result.outputPublicUrl,
      outputPath: result.outputPath,
      outputFilename: result.outputFilename,
    },
  });

  return {
    outputPublicUrl: result.outputPublicUrl,
    outputPath: result.outputPath,
  };
}
