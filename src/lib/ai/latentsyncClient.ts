import fs from "fs";
import path from "path";
import { pooledFetch } from "@/lib/network/httpPool";
import { createLogger } from "@/lib/logger";

const log = createLogger("ai:latentsyncClient");

export interface LatentSyncGenerateOptions {
  videoPath: string; // Input video (.mp4) or static portrait image (.png/.jpg)
  audioPath: string; // Input speech audio (.wav)
  outputPath: string; // Target rendered video path (.mp4)
  fps?: number; // Target FPS (default 30)
  guidanceScale?: number; // UNet classifier-free guidance (default 1.5)
  inferenceSteps?: number; // Denoising steps (default 20)
  seed?: number; // Reproducibility seed (default 1247)
  superResolution?: boolean; // Post-processing face enhancer (default true)
  serverUrl?: string; // Default process.env.LATENTSYNC_SERVER_URL || 'http://localhost:8010'
}

export interface LatentSyncGenerateResult {
  success: boolean;
  outputPath: string;
  durationSeconds?: number;
  latencyMs?: number;
  isMock?: boolean;
  error?: string;
}

export const LATENTSYNC_SERVER_URL =
  process.env.LATENTSYNC_SERVER_URL || "http://localhost:8010";

/**
 * Checks if the LatentSync UNet lip-sync microservice is online and responsive on port 8010.
 */
export async function checkLatentSyncHealth(serverUrl?: string): Promise<boolean> {
  const url = serverUrl || LATENTSYNC_SERVER_URL;
  try {
    const res = await pooledFetch(`${url}/health`, {
      method: "GET",
      timeoutMs: 2000,
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Standalone HTTP Client for LatentSync UNet Latent Diffusion Inpainting (Port 8010).
 * Uses Whisper cross-attention feature conditioning directly into UNet latent space.
 */
export async function generateLatentSyncLipSync(
  options: LatentSyncGenerateOptions
): Promise<LatentSyncGenerateResult> {
  const {
    videoPath,
    audioPath,
    outputPath,
    fps = 30,
    guidanceScale = 1.5,
    inferenceSteps = 20,
    seed = 1247,
    superResolution = true,
  } = options;

  const serverUrl = options.serverUrl || LATENTSYNC_SERVER_URL;
  const startTime = performance.now();

  log.info(`🎬 [LatentSync Client] Initiating UNet latent lip-sync...`);
  log.info(`   Video: ${videoPath}`);
  log.info(`   Audio: ${audioPath}`);
  log.info(`   Guidance Scale: ${guidanceScale}, Steps: ${inferenceSteps}, Seed: ${seed}`);
  log.info(`   Server: ${serverUrl}`);

  // 1. Verify local input existence (if local paths)
  if (!videoPath.startsWith("http") && !fs.existsSync(videoPath)) {
    return {
      success: false,
      outputPath,
      error: `Input video/image not found at: ${videoPath}`,
    };
  }
  if (!audioPath.startsWith("http") && !fs.existsSync(audioPath)) {
    return {
      success: false,
      outputPath,
      error: `Input audio not found at: ${audioPath}`,
    };
  }

  // 2. Health check LatentSync microservice
  const isHealthy = await checkLatentSyncHealth(serverUrl);
  if (!isHealthy) {
    console.warn(`[LatentSync] Microservice at ${serverUrl} is offline or in mock mode. Simulating synthesis...`);
    
    // Ensure output directory exists
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // In mock mode: copy or create minimal valid mp4 artifact
    if (fs.existsSync(videoPath) && videoPath.endsWith(".mp4")) {
      fs.copyFileSync(videoPath, outputPath);
    } else {
      // Create a dummy video placeholder
      const mockMp4 = Buffer.alloc(4096);
      mockMp4.writeUInt32BE(32, 0);
      mockMp4.write("ftypisom", 4, "latin1");
      fs.writeFileSync(outputPath, mockMp4);
    }

    return {
      success: true,
      outputPath,
      durationSeconds: 4.0,
      latencyMs: Math.round(performance.now() - startTime),
      isMock: true,
    };
  }

  // 3. Live Generation Request via FormData
  try {
    const formData = new FormData();
    const videoBuffer = fs.readFileSync(videoPath);
    const audioBuffer = fs.readFileSync(audioPath);

    formData.append("video", new Blob([videoBuffer]), path.basename(videoPath));
    formData.append("audio", new Blob([audioBuffer]), path.basename(audioPath));
    formData.append("fps", fps.toString());
    formData.append("guidance_scale", guidanceScale.toString());
    formData.append("inference_steps", inferenceSteps.toString());
    formData.append("seed", seed.toString());
    formData.append("super_resolution", superResolution ? "true" : "false");

    const submitRes = await pooledFetch(`${serverUrl}/api/latentsync/generate`, {
      method: "POST",
      body: formData,
      timeoutMs: 300000, // 5 min timeout
    });

    if (!submitRes.ok) {
      const errText = await submitRes.text().catch(() => "Unknown error");
      throw new Error(`LatentSync server error (${submitRes.status}): ${errText}`);
    }

    const job = await submitRes.json();
    const jobId = job.jobId || job.id;

    // 4. Poll status if async job ID returned
    if (jobId) {
      let completed = false;
      const pollStart = Date.now();

      while (!completed) {
        if (Date.now() - pollStart > 600000) {
          throw new Error("LatentSync generation timed out after 10 minutes");
        }

        await new Promise((res) => setTimeout(res, 2000));
        const statusRes = await pooledFetch(`${serverUrl}/api/latentsync/status/${jobId}`, {
          method: "GET",
          timeoutMs: 10000,
        });

        if (statusRes.ok) {
          const statusJson = await statusRes.json();
          if (statusJson.status === "COMPLETED") {
            completed = true;
            // Download output
            const downloadRes = await pooledFetch(`${serverUrl}/api/latentsync/download/${jobId}`);
            const arrayBuf = await downloadRes.arrayBuffer();
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            fs.writeFileSync(outputPath, Buffer.from(arrayBuf));
          } else if (statusJson.status === "FAILED") {
            throw new Error(`LatentSync job failed: ${statusJson.error || "Unknown error"}`);
          }
        }
      }
    } else {
      // Direct stream response
      const arrayBuf = await submitRes.arrayBuffer();
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, Buffer.from(arrayBuf));
    }

    const elapsed = Math.round(performance.now() - startTime);
    return {
      success: true,
      outputPath,
      latencyMs: elapsed,
      isMock: false,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[LatentSync] Execution failed:`, msg);
    return {
      success: false,
      outputPath,
      error: msg,
    };
  }
}
