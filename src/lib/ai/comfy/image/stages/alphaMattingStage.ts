/**
 * src/lib/ai/comfy/image/stages/alphaMattingStage.ts
 *
 * Stage 7 Strategy — ComfyUI Native Neural Background Removal (ImageRemoveBackgroundRembg / BRIA / u2net_human_seg).
 * Submits Stage 6 image to ComfyUI's ImageRemoveBackgroundRembg node, generating true 32-bit RGBA alpha images
 * directly in ComfyUI's native output directory.
 */

import fs from "fs";
import path from "path";
import { StageConfig, StageResult } from "../../types";
import { PipelineContext, PipelineStage } from "./baseStage";
import { uploadFileToComfyUI, submitPrompt, waitForCompletion, downloadOutput, CLIENT_ID } from "../../../comfyClient";
import { getPythonPath, getComfyModelsDir } from "@/lib/binaries";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:image:stages:alphaMattingStage");

export class AlphaMattingStage implements PipelineStage {
  readonly stageIndex = 7;
  readonly stageName = "BRIA / LayerDiffusion Alpha Matting & Background Isolation";

  async execute(context: PipelineContext, stageConfig: StageConfig): Promise<StageResult> {
    const isStanding = /\b(standing|podium|lectern|upright|standing_bg|standing_isolated|full standing|standing_mic)\b/i.test(`${context.sceneModifiers || ""} ${context.promptText || ""}`);
    const poseTag = isStanding ? "standing" : "seated";

    const stageCacheFile = path.join(
      context.cacheDir,
      `${context.personaKey.toLowerCase()}_stage_7_seed_${stageConfig.seed}.png`
    );

    if (fs.existsSync(stageCacheFile)) {
      log.info(`⚡ [Stage 7: ComfyUI Rembg Neural Isolation] Cache Hit: ${path.basename(stageCacheFile)}`);
      context.currentInputImagePath = stageCacheFile;
      return {
        stageIndex: 7,
        stageName: this.stageName,
        imageBuffer: fs.readFileSync(stageCacheFile),
        imagePath: stageCacheFile,
        executionTimeMs: 0,
        cached: true,
        seed: stageConfig.seed
      };
    }

    const startTime = Date.now();
    const inputImagePath = context.currentInputImagePath;

    if (!inputImagePath || !fs.existsSync(inputImagePath)) {
      throw new Error(`[Stage 7: Alpha Matting] No input image found from previous stage.`);
    }

    const { makeTransparentPng } = await import("../makeTransparentPng");

    log.info(`🔄 [Stage 7: ComfyUI Rembg Neural Isolation] Submitting image to ComfyUI ImageRemoveBackgroundRembg node...`);

    let generatedBuffer: Buffer | undefined = undefined;

    if (isStanding) {
      try {
        // 1. Upload input image to ComfyUI input directory
        const uploadedFilename = await uploadFileToComfyUI(inputImagePath);
        log.info(`⬆️ [Stage 7: ComfyUI] Uploaded input image: ${uploadedFilename}`);

        // 2. Load rembg_api.json workflow template
        const rembgWorkflowPath = path.join(process.cwd(), "comfy_workflows", "image", "rembg_api.json");
        if (fs.existsSync(rembgWorkflowPath)) {
          const workflowJson = JSON.parse(fs.readFileSync(rembgWorkflowPath, "utf-8"));
          const filenamePrefix = `luna_stage_7_${poseTag}_seed_${stageConfig.seed}`;

          // Configure nodes
          if (workflowJson["1"]) workflowJson["1"].inputs.image = uploadedFilename;
          if (workflowJson["2"]) workflowJson["2"].inputs.model = "u2net_human_seg"; // Neural human segmentation model
          if (workflowJson["3"]) workflowJson["3"].inputs.filename_prefix = filenamePrefix;

          // Submit prompt to ComfyUI engine
          const promptId = await submitPrompt(workflowJson, CLIENT_ID);
          log.info(`🚀 [Stage 7: ComfyUI Engine] Prompt submitted (ID: ${promptId}) — processing neural background removal...`);
          
          const outputFilename = await waitForCompletion(promptId, CLIENT_ID);
          generatedBuffer = await downloadOutput(outputFilename);
        }
      } catch (comfyErr: unknown) {
        const message = comfyErr instanceof Error ? comfyErr.message : String(comfyErr);
        log.info(`⚠️ [Stage 7: ComfyUI Rembg Notice] (${message}) — executing 3D depth alpha matting fallback...`);
      }
    } else {
      log.info(`🛋️ [Stage 7: Seated Scene] Executing 3D Depth Map & Solid White Studio Backdrop Matting (Preserving Desk + Chair + Laptops + Mic)...`);
    }

    if (generatedBuffer) {
      fs.writeFileSync(stageCacheFile, generatedBuffer);
      log.info(`✅ [Stage 7: ComfyUI Rembg Neural Isolation] Native ComfyUI Background Removal Complete: ${path.basename(stageCacheFile)}`);
    } else {
      // Execute SAM / Bria Prompt-based Neural Image Segmentation
      const pythonExe = getPythonPath();
      const samScript = path.join(process.cwd(), 'scripts', 'sam_image_segmenter.py');
      let samSuccess = false;

      if (fs.existsSync(pythonExe) && fs.existsSync(samScript)) {
        try {
          const promptText = `${context.personaKey} news anchor presenter, torso, clothing`;
          log.info(`🎯 [Stage 7: SAM / Bria Prompt Neural Segmentation] Segmenting image with prompt '${promptText}'...`);
          const { execFileSync } = await import('child_process');
          execFileSync(pythonExe, [samScript, inputImagePath, stageCacheFile, promptText], { stdio: 'inherit' });
          if (fs.existsSync(stageCacheFile)) {
            samSuccess = true;
            log.info(`✅ [Stage 7: SAM / Bria Prompt Segmentation] Complete: ${path.basename(stageCacheFile)}`);
          }
        } catch (samErr: unknown) {
          const message = samErr instanceof Error ? samErr.message : String(samErr);
          log.info(`⚠️ [Stage 7: SAM Notice] (${message}) — executing 3D depth alpha matting fallback...`);
        }
      }

      if (!samSuccess) {
        // 3D Depth Map & Solid White Studio Backdrop Matting Fallback
        let depthMapPath: string | undefined = undefined;
        if (fs.existsSync(context.cacheDir)) {
          const files = fs.readdirSync(context.cacheDir);
          const depthFile = files.find(f => f.toLowerCase().includes("depth_map") && f.toLowerCase().startsWith(context.personaKey.toLowerCase()));
          if (depthFile) depthMapPath = path.join(context.cacheDir, depthFile);
        }
        await makeTransparentPng(inputImagePath, stageCacheFile, depthMapPath, isStanding);
        log.info(`✅ [Stage 7: Precision Depth & Studio Matting] Complete: ${path.basename(stageCacheFile)}`);
      }
    }

    // Save explicit Stage 7 Output Image to public review dir AND ComfyUI Desktop output dir
    const publicReviewDir = path.join(process.cwd(), "public", "avatars", "persona_vault_review");
    if (!fs.existsSync(publicReviewDir)) {
      fs.mkdirSync(publicReviewDir, { recursive: true });
    }
    const publicStage7Path = path.join(publicReviewDir, `master_image_${context.personaKey.toLowerCase()}_stage_7_${poseTag}.png`);
    fs.copyFileSync(stageCacheFile, publicStage7Path);

    const comfyDesktopOutputDir = path.join(path.dirname(getComfyModelsDir()), "output");
    if (fs.existsSync(comfyDesktopOutputDir)) {
      const comfyStage7Path = path.join(comfyDesktopOutputDir, `luna_stage_7_${poseTag}_seed_${stageConfig.seed}.png`);
      fs.copyFileSync(stageCacheFile, comfyStage7Path);
      log.info(`🖼️ [Stage 7: Output Image] Saved to ComfyUI Desktop Output Dir: ${comfyStage7Path}`);
    }

    const buffer = fs.readFileSync(stageCacheFile);
    context.currentInputImagePath = stageCacheFile;
    const elapsed = Date.now() - startTime;

    return {
      stageIndex: 7,
      stageName: this.stageName,
      imageBuffer: buffer,
      imagePath: stageCacheFile,
      executionTimeMs: elapsed,
      cached: false,
      seed: stageConfig.seed
    };
  }
}
