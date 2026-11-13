/**
 * scripts/veo-cli/engines/veoDispatcher.ts
 *
 * Unified execution dispatcher for Google Veo video generation engines
 * (Google Flow Web, Gemini Web, Google Vids, Direct API, AGY CLI, or JSON payload).
 */

import { CompiledVeoPrompt, VeoEngineType, VeoGenerationResult, VeoModelType, AspectRatioType } from "../types";
import { runVeoWithApi } from "./apiRunner";
import { runVeoWithAgy } from "./agyRunner";
import { outputVeoJson } from "./jsonRunner";
import {
  recordGeneration,
  captureHardwareSnapshot,
  calculateVideoCost,
  formatGenerationHud,
} from "../telemetry/generationLedger";

export interface DispatchVeoOptions {
  prompt: string;
  imagePath?: string;
  endImagePath?: string;
  referenceImagePaths?: string[];
  aspectRatio?: AspectRatioType;
  durationSeconds?: 2 | 4 | 5 | 8 | 10 | 16;
  baseName: string;
  model?: VeoModelType;
  engine?: VeoEngineType;
  outputDirectory?: string;
  flowProjectId?: string;
  flowProjectUrl?: string;
  flowProjectName?: string;
  skipLedger?: boolean;
  personaSlug?: string;
  pipeline?: "product_showcase" | "action_matrix" | "subtle_idle" | "fused_commercial" | "veo_general" | "loop_suite" | "custom";
}

export async function dispatchVeoGeneration(opts: DispatchVeoOptions): Promise<VeoGenerationResult> {
  const engine = opts.engine || "flow_web";
  const model = opts.model || "veo-3.1-lite";
  const durationSeconds = (opts.durationSeconds || 8) as any;
  const aspectRatio = opts.aspectRatio || "16:9";

  const compiled: CompiledVeoPrompt = {
    prompt: opts.prompt,
    imagePath: opts.imagePath,
    endImagePath: opts.endImagePath,
    referenceImagePaths: opts.referenceImagePaths,
    aspectRatio,
    durationSeconds,
    fps: 30,
    resolution: "1080p",
    baseName: opts.baseName,
    model,
    engine,
    outputDirectory: opts.outputDirectory,

    flowProjectId: opts.flowProjectId,
    flowProjectUrl: opts.flowProjectUrl,
    flowProjectName: opts.flowProjectName,
  };

  const t0 = performance.now();
  let result: VeoGenerationResult;

  if (engine === "flow_web") {
    const { runVeoWithFlowWeb } = await import("./flowWebRunner");
    result = await runVeoWithFlowWeb(compiled);
  } else if (engine === "gemini_web") {
    const { runVeoWithGeminiWeb } = await import("./geminiWebRunner");
    result = await runVeoWithGeminiWeb(compiled);
  } else if (engine === "web_portal" || engine === "google_vids") {
    const { runVeoWithWebPortal } = await import("./webPortalRunner");
    result = await runVeoWithWebPortal(compiled);
  } else if (engine === "api") {
    result = await runVeoWithApi(compiled);
  } else if (engine === "agy") {
    result = await runVeoWithAgy(compiled);
  } else {
    result = outputVeoJson(compiled);
  }

  // Automatic Ledger & Telemetry Logging (if not delegated to higher-level orchestrator)
  if (!opts.skipLedger && result.success && result.videoPath) {
    try {
      const totalLatencyMs = Math.round(performance.now() - t0);
      const hw = await captureHardwareSnapshot();
      const cost = calculateVideoCost(model, durationSeconds, 1, true);
      const realtimeFactor = durationSeconds > 0
        ? parseFloat((totalLatencyMs / (durationSeconds * 1000)).toFixed(2))
        : 1;

      const record = await recordGeneration({
        pipeline: opts.pipeline || "veo_general",
        personaSlug: opts.personaSlug || "ruby",
        videoPath: result.videoPath,
        durationSec: durationSeconds,
        model,
        engine,
        resolution: compiled.resolution || "1080p",
        aspectRatio,
        creditsCost: cost.credits,
        usdCost: cost.usd,
        timing: {
          totalLatencyMs,
          videoInferenceMs: totalLatencyMs,
          realtimeFactor,
        },
        hardware: hw,
        metadata: {
          baseName: opts.baseName,
        },
      });
      console.log(formatGenerationHud(record));
    } catch (ledgerErr: any) {
      console.warn("⚠️ Telemetry ledger notice in dispatchVeoGeneration:", ledgerErr?.message);
    }
  }

  return result;
}
