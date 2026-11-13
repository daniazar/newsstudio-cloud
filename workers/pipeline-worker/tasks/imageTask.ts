import { handleImageGeneration } from "../handlers/imageGeneration";
import { reportProgress } from "../api";
import { JobCancelledError } from "./audioTask";
import { createLogger } from "@/lib/logger";

const log = createLogger("worker:tasks:imageTask");

export async function stepImage(
  job: Record<string, unknown>,
  jobId: string
): Promise<void> {
  const companyId = job.companyId as string;
  const configObj = job.config ? (typeof job.config === "string" ? JSON.parse(job.config) : job.config) : {};
  const { prompt, referenceImageKey, loras, personaId, aspectRatio, width, height, denoise, seed, negativePrompt } = configObj as {
    prompt: string;
    referenceImageKey?: string;
    loras?: { name: string; strength: number }[];
    personaId?: string;
    aspectRatio?: "16:9" | "9:16" | "1:1";
    width?: number;
    height?: number;
    denoise?: number;
    seed?: number;
    negativePrompt?: string;
  };

  if (!prompt) {
    throw new Error("No prompt found in image generation job config");
  }

  log.info(`  🎨 Image: Generating decoupled starting frame via ComfyUI...`);

  const ok = await reportProgress(jobId, {
    step: "generating_image",
    status: "IMAGE_IN_PROGRESS",
    doneSteps: 0,
  });
  if (!ok) throw new JobCancelledError();

  await handleImageGeneration({
    jobId,
    companyId,
    storyId: (job.storyId as string) || "images",
    prompt,
    referenceImageKey,
    personaId,
    aspectRatio,
    width,
    height,
    denoise,
    seed,
    negativePrompt,
    loras,
  });
}

