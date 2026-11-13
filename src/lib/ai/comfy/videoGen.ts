/**
 * src/lib/ai/comfy/videoGen.ts
 *
 * Video generation and post-processing pipelines for ComfyUI and FFmpeg.
 */

import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { ComfyWorkflow, ComfyWorkflowInputs } from "./types";
import { startKeepAwake, stopKeepAwake, getWavDuration, getFFmpegPath, getFFprobePath } from "./utils";
import { uploadFileToComfyUI, submitPrompt, waitForCompletion, downloadOutput, checkSupportedNodes, clearComfyUIMemory } from "./api";
import { buildWorkflowPrompt } from "./workflowBuilder";
import { comfyGenerationLock } from "./generationLock";
import { createLogger } from "@/lib/logger";

const log = createLogger("comfy:videoGen");

/**
 * Main entry point: submit an InfiniteTalk / LTX-Video / MiniMax / Hunyuan workflow to ComfyUI and wait for the output.
 * Enforces atomic single-job execution and automatic VRAM memory flushing.
 *
 * @param inputs - paths to local image and audio files, plus model selection
 * @param workflowJson - the parsed ComfyUI workflow JSON
 * @returns the generated video as a Buffer
 */
export async function generatePresenterVideo(
  inputs: ComfyWorkflowInputs,
  workflowJson: ComfyWorkflow,
  onProgress?: (pct: number) => void
): Promise<Buffer> {
  const jobId = `job-${inputs.model || 'video'}-${Date.now()}`;
  return comfyGenerationLock.withLock(jobId, async () => {
    const keepAwake = startKeepAwake();
    let tempResampledPath = "";
    try {
      // 0. Auto-flush lingering VRAM cache before model swap
      await clearComfyUIMemory();

      // 1. Upload input files to ComfyUI
      let uploadedImage = "";
    if (inputs.imagePath) {
      log.info(`[ComfyClient] Uploading image: ${inputs.imagePath}`);
      uploadedImage = await uploadFileToComfyUI(inputs.imagePath);
    }

    let uploadedLastImage = "";
    if (inputs.lastImagePath) {
      log.info(`[ComfyClient] Uploading last image: ${inputs.lastImagePath}`);
      uploadedLastImage = await uploadFileToComfyUI(inputs.lastImagePath);
    }

    const isUpscaler = inputs.model === "rtx_sr_upscale";
    let uploadAudioPath = inputs.audioPath;

    const isLtx = inputs.model?.startsWith("ltx") || ["eros", "sulphur"].includes(inputs.model || "");
    let _paddedVideoDuration = 10;
    let trimmedVideoDuration = 10.3;
    let extendedPaddedVideoDuration = 10.6;
    const isTransition = inputs.model === "wan_transition" || inputs.model === "ltx_transition";
    if (inputs.audioPath && !isTransition) {
      const audioDuration = getWavDuration(inputs.audioPath);
      _paddedVideoDuration = audioDuration;
      trimmedVideoDuration = audioDuration + 0.3;
      extendedPaddedVideoDuration = audioDuration + 0.6;
      if (isLtx) {
        // Original target duration for active speaking
        const totalFrames = Math.max(16, Math.round(audioDuration * 25.0));
        const paddedLatentLength = Math.ceil((totalFrames - 1) / 8) * 8 + 1;
        _paddedVideoDuration = ((paddedLatentLength * 2) - 1) / 50.0;

        // Target duration for trimming/output (adds 0.3s of silence)
        const trimmedTotalFrames = Math.max(16, Math.round((audioDuration + 0.3) * 25.0));
        const trimmedPaddedLatentLength = Math.ceil((trimmedTotalFrames - 1) / 8) * 8 + 1;
        trimmedVideoDuration = ((trimmedPaddedLatentLength * 2) - 1) / 50.0;

        // Extended target duration for generation (adds 0.6s of silence to push out temporal blur)
        const extendedTotalFrames = Math.max(16, Math.round((audioDuration + 0.6) * 25.0));
        const extendedPaddedLatentLength = Math.ceil((extendedTotalFrames - 1) / 8) * 8 + 1;
        extendedPaddedVideoDuration = ((extendedPaddedLatentLength * 2) - 1) / 50.0;
      }
    } else if (isTransition) {
      trimmedVideoDuration = 1000; // Will be set to full probed duration
    }

    if (inputs.audioPath && !isUpscaler) {
      try {
        const tempDir = path.join(process.cwd(), "scratch/temp_audio");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        tempResampledPath = path.join(tempDir, `resampled_16k_${Date.now()}.wav`);
        
        const ffmpegPath = getFFmpegPath();
        if (inputs.secondaryAudioPath && fs.existsSync(inputs.secondaryAudioPath)) {
          log.info(`[ComfyClient] Mixing two audio tracks for multi-persona mode: ${inputs.audioPath} + ${inputs.secondaryAudioPath} using ${ffmpegPath}`);
          execFileSync(ffmpegPath, ["-y", "-i", inputs.audioPath, "-i", inputs.secondaryAudioPath, "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=longest,apad[a]", "-map", "[a]", "-t", extendedPaddedVideoDuration.toString(), "-c:a", "pcm_s16le", "-map_metadata", "-1", "-fflags", "+bitexact", "-ar", "16000", "-ac", "1", tempResampledPath], { stdio: "ignore" });
        } else {
          log.info(`[ComfyClient] Resampling audio driver to 16kHz mono and padding to extended ${extendedPaddedVideoDuration.toFixed(2)}s: ${inputs.audioPath} using ${ffmpegPath}`);
          execFileSync(ffmpegPath, ["-y", "-i", inputs.audioPath, "-af", "apad", "-t", extendedPaddedVideoDuration.toString(), "-c:a", "pcm_s16le", "-map_metadata", "-1", "-fflags", "+bitexact", "-ar", "16000", "-ac", "1", tempResampledPath], { stdio: "ignore" });
        }
        
        if (fs.existsSync(tempResampledPath) && fs.statSync(tempResampledPath).size > 0) {
          uploadAudioPath = tempResampledPath;
          log.info(`[ComfyClient] Audio successfully resampled and extended to: ${tempResampledPath}`);
        }
      } catch (err: unknown) {
        console.warn("[ComfyClient] Failed to resample audio using FFmpeg, uploading original path:", err instanceof Error ? err.message : String(err));
      }
    }

    if (!uploadAudioPath && !isUpscaler) {
      try {
        const silentWavPath = path.join(process.cwd(), "scratch", "silent_2s.wav");
        if (!fs.existsSync(silentWavPath)) {
          fs.mkdirSync(path.dirname(silentWavPath), { recursive: true });
          const ffmpegPath = getFFmpegPath();
          execFileSync(ffmpegPath, ["-y", "-f", "lavfi", "-i", "anullsrc=r=16000:cl=mono", "-t", "2.0", "-c:a", "pcm_s16le", silentWavPath], { stdio: "ignore" });
        }
        uploadAudioPath = silentWavPath;
        log.info("[ComfyClient] No audio driver provided. Created and using silent 2.0s audio track for motion loop generation.");
      } catch (err: unknown) {
        console.warn("[ComfyClient] Could not create silent audio track:", err instanceof Error ? err.message : String(err));
      }
    }

    let uploadedAudio = "";
    if (uploadAudioPath) {
      log.info(`[ComfyClient] Uploading ${isUpscaler ? "video" : "audio"}: ${uploadAudioPath}`);
      uploadedAudio = await uploadFileToComfyUI(uploadAudioPath);
    }

    // Query ComfyUI capabilities to fallback gracefully on missing nodes (like DeepFilterNet or WanVideoModelLoader)
    const checkClasses = [
      "DeepFilterNet",
      "FaceDetailer",
      "RTXVideoSuperResolution",
      "RIFE VFI",
      "LatentUpscaleWithModel",
      "DiffusionModelLoaderKJ",
      "WanVideoModelLoader",
      "ColorMatchV2",
      "ColorMatch",
      "ModelMemoryRelease"
    ];
    let supportedNodes: Record<string, boolean> = {};
    try {
      supportedNodes = await checkSupportedNodes(checkClasses);
      log.info({ supportedNodes }, "[ComfyClient] Supported custom nodes detected");
    } catch (err: unknown) {
      console.warn("[ComfyClient] Failed to check supported nodes capabilities, falling back:", err instanceof Error ? err.message : String(err));
    }

    if (inputs.model === "wan_alpha" && supportedNodes["WanVideoModelLoader"] === false) {
      throw new Error(
        "Node 'WanVideoModelLoader' is not registered in the currently running ComfyUI server. " +
        "If ComfyUI Desktop GUI is open, please close the Desktop app so NewsStudio can auto-launch the background server with WanVideoWrapper custom nodes enabled."
      );
    }

    // 2. Build the workflow prompt with our inputs
    const prompt = buildWorkflowPrompt(workflowJson, uploadedImage, uploadedAudio, inputs, uploadedLastImage, supportedNodes);

    // Print explicit CLI generation banner with active engine, model, and prompts
    const activeModel = inputs.model || "ltx_2.5";
    const posPrompt = inputs.positivePrompt || prompt["4"]?.inputs?.text || prompt["positive_prompt"] || "N/A";
    const negPrompt = inputs.negativePrompt || prompt["5"]?.inputs?.text || prompt["negative_prompt"] || "N/A";
    
    log.info("\n==================================================");
    log.info("🎬 [ComfyClient] GENERATION SUBMISSION");
    log.info("==================================================");
    log.info(`  🤖 Engine / Model:   \x1b[1;33m${activeModel.toUpperCase()}\x1b[0m`);
    log.info(`  📜 Positive Prompt:  \x1b[32m"${posPrompt}"\x1b[0m`);
    log.info(`  🚫 Negative Prompt:  \x1b[90m"${negPrompt}"\x1b[0m`);
    log.info("==================================================\n");

    // 3. Submit to ComfyUI
    const clientId = `newsstudio-${Date.now()}`;
    log.info("[ComfyClient] Submitting workflow to ComfyUI...");
    const promptId = await submitPrompt(prompt, clientId);
    log.info(`[ComfyClient] Prompt ID: ${promptId}`);

    // 4. Wait for completion
    log.info("[ComfyClient] Waiting for generation to complete (this may take a while)...");
    const outputFilename = await waitForCompletion(promptId, clientId, 7_200_000, onProgress, prompt);
    log.info(`[ComfyClient] Generation complete! Output: ${outputFilename}`);

    // 5. Download the result
    const buffer = await downloadOutput(outputFilename);
    log.info(`[ComfyClient] Downloaded ${buffer.byteLength} bytes`);

    // Post-process the output buffer to enforce trimmedVideoDuration and clean audio alignment
    if (!isUpscaler) {
      const tempVideoIn = path.join(process.cwd(), `scratch/temp_video_in_${Date.now()}.mp4`);
      const tempVideoOut = path.join(process.cwd(), `scratch/temp_video_out_${Date.now()}.mp4`);
      const tempPaddedAudio = path.join(process.cwd(), `scratch/temp_padded_audio_${Date.now()}.wav`);
      
      try {
        fs.writeFileSync(tempVideoIn, buffer);
        const ffmpeg = getFFmpegPath();

        if (inputs.audioPath && fs.existsSync(inputs.audioPath) && inputs.model !== "ltx_flfv_generated" && inputs.model !== "minimax_h3" && inputs.model !== "minimax") {
          // Lossless clean audio track replacement and duration trim
          log.info(`[ComfyClient] Post-processing video: losslessly replacing with clean audio track and trimming to trimmed duration (${trimmedVideoDuration.toFixed(3)}s)...`);
          
          // 1. Probe actual duration
          const ffprobe = getFFprobePath();
          let finalDuration = trimmedVideoDuration;
          try {
            const stdout = execFileSync(ffprobe, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", tempVideoIn]).toString();
            const probed = parseFloat(stdout.trim());
            if (!isNaN(probed) && probed > 0) {
              finalDuration = probed;
              if (isTransition) trimmedVideoDuration = probed;
            }
          } catch {}

          // 2. Pad audio (mix if secondary exists)
          if (inputs.secondaryAudioPath && fs.existsSync(inputs.secondaryAudioPath)) {
            execFileSync(ffmpeg, ["-y", "-i", inputs.audioPath, "-i", inputs.secondaryAudioPath, "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=longest,apad[a]", "-map", "[a]", "-t", finalDuration.toString(), tempPaddedAudio], { stdio: "ignore" });
          } else {
            execFileSync(ffmpeg, ["-y", "-i", inputs.audioPath, "-af", "apad", "-t", finalDuration.toString(), tempPaddedAudio], { stdio: "ignore" });
          }

          // 3. Mux and trim
          execFileSync(ffmpeg, ["-y", "-i", tempVideoIn, "-i", tempPaddedAudio, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy", "-c:a", "aac", "-t", trimmedVideoDuration.toString(), tempVideoOut], { stdio: "ignore" });
        } else {
          // Simple duration trim
          log.info(`[ComfyClient] Post-processing video: trimming to planned trimmed duration ${trimmedVideoDuration.toFixed(3)}s...`);
          execFileSync(ffmpeg, ["-y", "-i", tempVideoIn, "-c", "copy", "-t", trimmedVideoDuration.toString(), tempVideoOut], { stdio: "ignore" });
        }

        if (fs.existsSync(tempVideoOut) && fs.statSync(tempVideoOut).size > 0) {
          const processedBuffer = fs.readFileSync(tempVideoOut);
          log.info("[ComfyClient] Post-processing trim complete.");
          return processedBuffer;
        }
      } catch (postErr: unknown) {
        console.error("[ComfyClient] FFmpeg post-processing failed, returning raw buffer:", postErr instanceof Error ? postErr.message : String(postErr));
      } finally {
        // Clean up temp files
        if (fs.existsSync(tempVideoIn)) {
          try { fs.unlinkSync(tempVideoIn); } catch {}
        }
        if (fs.existsSync(tempVideoOut)) {
          try { fs.unlinkSync(tempVideoOut); } catch {}
        }
        if (fs.existsSync(tempPaddedAudio)) {
          try { fs.unlinkSync(tempPaddedAudio); } catch {}
        }
      }
    }

    return buffer;
    } finally {
      stopKeepAwake(keepAwake);
      if (tempResampledPath && fs.existsSync(tempResampledPath)) {
        try {
          fs.unlinkSync(tempResampledPath);
        } catch {}
      }
    }
  });
}

/**
 * Post-processes an existing video:
 * 1. Interpolates frames using RIFE VFI to 50fps.
 * 2. Upscales the interpolated frames to 4K (2160x3840) using RTX Video Super Resolution.
 * 3. Losslessly merges/retains the audio track.
 *
 * @param inputVideoPath - local absolute path to the generated MP4 file
 * @param width - target width (default: 2160 for vertical 4K)
 * @param height - target height (default: 3840 for vertical 4K)
 * @returns the upscaled and interpolated video buffer
 */
export async function postProcessVideo(
  inputVideoPath: string,
  width: number = 2160,
  height: number = 3840
): Promise<Buffer> {
  const keepAwake = startKeepAwake();
  try {
    log.info(`[ComfyClient] Uploading input video for post-processing: ${inputVideoPath}`);
    const uploadedVideoName = await uploadFileToComfyUI(inputVideoPath);

    // Load the template
    const filename = "rtx_sr_upscale_rife.json";
    const workflowPath = path.join(process.cwd(), "comfy_workflows", "video", filename);
    if (!fs.existsSync(workflowPath)) {
      throw new Error(`Workflow template not found at ${workflowPath}`);
    }
    const workflow = JSON.parse(fs.readFileSync(workflowPath, "utf-8"));

    // Configure inputs
    workflow["2"].inputs.video = uploadedVideoName;
    workflow["1"].inputs["resize_type.width"] = width;
    workflow["1"].inputs["resize_type.height"] = height;

    const clientId = `postprocess-${Date.now()}`;
    log.info(`[ComfyClient] Submitting Video Post-Processing (Interpolation ➔ Upscale to ${width}x${height})...`);
    const promptId = await submitPrompt(workflow, clientId);
    log.info(`[ComfyClient] Post-processing Prompt ID: ${promptId}`);

    // Wait for completion (2 hour timeout maximum)
    const outputFilename = await waitForCompletion(promptId, clientId, 7_200_000, undefined, workflow);
    log.info(`[ComfyClient] Downloading post-processed output video: ${outputFilename}`);
    return await downloadOutput(outputFilename);
  } finally {
    stopKeepAwake(keepAwake);
  }
}
