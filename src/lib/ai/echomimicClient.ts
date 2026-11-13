import fs from 'fs';
import path from 'path';
import { createLogger } from "@/lib/logger";

const log = createLogger("ai:echomimicClient");

export interface EchoMimicGenerateOptions {
  videoPath?: string; // Input loop video (.mp4)
  imagePath?: string; // Input bust-portrait reference image (.png, .jpg)
  audioPath: string; // Input speech audio (.wav)
  outputPath: string; // Desired output path (.mp4)
  fps?: number; // Default 30
  serverUrl?: string; // Default process.env.ECHOMIMIC_SERVER_URL || 'http://localhost:8006'
  motionScale?: number; // 0.8 to 1.5, default 1.0
}

export interface EchoMimicGenerateResult {
  success: boolean;
  outputPath: string;
  durationSeconds?: number;
  error?: string;
}

/**
 * Checks whether the EchoMimic V3 server (Port 8006) is online and reachable.
 */
export async function checkEchoMimicHealth(serverUrl?: string): Promise<boolean> {
  const url = serverUrl || process.env.ECHOMIMIC_SERVER_URL || 'http://localhost:8006';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${url}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Standalone HTTP Client for EchoMimic V3 Lip-Sync Microservice
 * 
 * Connects to a decoupled Python microservice or Docker container (Port 8006).
 */
export async function generateEchoMimicLipSync(
  options: EchoMimicGenerateOptions
): Promise<EchoMimicGenerateResult> {
  const { videoPath, imagePath, audioPath, outputPath, fps = 30, motionScale = 1.0 } = options;
  const serverUrl = options.serverUrl || process.env.ECHOMIMIC_SERVER_URL || 'http://localhost:8006';

  log.info(`🗣️ [EchoMimic V3 Client] Initiating half-body generation...`);
  if (videoPath) log.info(`   Video: ${videoPath}`);
  if (imagePath) log.info(`   Image: ${imagePath}`);
  log.info(`   Audio: ${audioPath}`);
  log.info(`   Server: ${serverUrl}`);

  if (!videoPath && !imagePath) {
    throw new Error(`[EchoMimic V3 Client] Must provide either videoPath or imagePath`);
  }
  if (videoPath && !fs.existsSync(videoPath)) {
    throw new Error(`[EchoMimic V3 Client] Input video not found: ${videoPath}`);
  }
  if (imagePath && !fs.existsSync(imagePath)) {
    throw new Error(`[EchoMimic V3 Client] Input image not found: ${imagePath}`);
  }
  if (!fs.existsSync(audioPath)) {
    throw new Error(`[EchoMimic V3 Client] Input audio not found: ${audioPath}`);
  }

  try {
    const audioBuffer = await fs.promises.readFile(audioPath);
    const formData = new FormData();
    formData.append('audio', new Blob([audioBuffer], { type: 'audio/wav' }), path.basename(audioPath));
    formData.append('fps', String(fps));
    formData.append('motion_scale', String(motionScale));

    if (videoPath) {
      const videoBuffer = await fs.promises.readFile(videoPath);
      formData.append('video', new Blob([videoBuffer], { type: 'video/mp4' }), path.basename(videoPath));
    } else if (imagePath) {
      const imageBuffer = await fs.promises.readFile(imagePath);
      const ext = path.extname(imagePath).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      formData.append('image', new Blob([imageBuffer], { type: mime }), path.basename(imagePath));
    }

    const response = await fetch(`${serverUrl}/generate`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Server returned HTTP ${response.status}: ${errText}`);
    }

    // Server streams back the generated .mp4 file or JSON response with download URL
    const contentType = response.headers.get('content-type') || '';
    
    // Ensure output directory exists
    const outDir = path.dirname(outputPath);
    if (!fs.existsSync(outDir)) {
      await fs.promises.mkdir(outDir, { recursive: true });
    }

    if (contentType.includes('video/mp4') || contentType.includes('application/octet-stream')) {
      const arrayBuffer = await response.arrayBuffer();
      await fs.promises.writeFile(outputPath, Buffer.from(arrayBuffer));
    } else {
      const json = await response.json();
      if (json.outputUrl) {
        const fileRes = await fetch(json.outputUrl);
        const arrayBuffer = await fileRes.arrayBuffer();
        await fs.promises.writeFile(outputPath, Buffer.from(arrayBuffer));
      } else if (json.error) {
        throw new Error(json.error);
      }
    }

    log.info(`✅ [EchoMimic V3 Client] Generation complete: ${outputPath}`);
    return {
      success: true,
      outputPath,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ [EchoMimic V3 Client] Failed: ${msg}`);
    return {
      success: false,
      outputPath: '',
      error: msg,
    };
  }
}
