/**
 * src/lib/ai/liveportraitClient.ts
 *
 * Standalone TypeScript Client for LivePortrait & Inverted MuseTalk -> LivePortrait
 * Real-Time Digital Human Pipeline.
 * Connects to LivePortrait Microservice (Port 8009) with transparent fallback
 * to local Python execution. Supports Extreme 3D Motion and Dynamic Idle Animation.
 */

import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { pooledFetch } from "@/lib/network/httpPool";
import { getPythonPath } from "@/lib/binaries";
import { createLogger } from "@/lib/logger";
import { resolveLocalActionLoopVideo, resolveLocalVeoDir } from "@/lib/storage/localAssets";

const log = createLogger("ai:liveportraitClient");

const execFileAsync = promisify(execFile);

export interface InvertedAvatarOptions {
  audioPath?: string; // Speech audio (.wav) for talking mode
  outputPath: string; // Final composited video (.mp4)
  bodyLoopPath?: string; // Action loop video (.mp4)
  personaId?: string; // 'ruby' | 'blaze' | 'mateo'
  gestureState?: string; // 'talking' | 'listening' | 'deep_thought' | 'breaking' | 'idle_anchor_presence'
  motionIntensity?: number; // 1.0 to 3.5 (default: 1.6)
  fps?: number; // Default: 30
  serverUrl?: string; // LivePortrait server url (default: http://localhost:8009)
}

export interface IdleAvatarOptions {
  outputPath: string;
  bodyLoopPath?: string;
  personaId?: string;
  idlePreset?: "intense_anchor" | "deep_analyst" | "attentive_listener" | "breaking_urgent" | "relaxed_sway";
  motionIntensity?: number; // 1.0 to 3.5 (default: 2.0)
  durationSec?: number; // Default: 4.0
  fps?: number;
  serverUrl?: string;
}

export interface LivePortraitResult {
  success: boolean;
  outputPath: string;
  durationSeconds?: number;
  error?: string;
}

/**
 * Checks if LivePortrait microservice or Python environment is ready.
 */
export async function checkLivePortraitHealth(serverUrl?: string): Promise<boolean> {
  const url = serverUrl || process.env.LIVEPORTRAIT_SERVER_URL || "http://localhost:8009";
  try {
    const res = await pooledFetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    const scriptPath = path.join(process.cwd(), "scripts", "musetalk", "inverted_realtime_pipeline.py");
    return fs.existsSync(scriptPath);
  }
}

/**
 * Generates speech-driven lip-sync scene with extreme 3D rotational puppeteering.
 */
export async function generateInvertedAvatarScene(
  options: InvertedAvatarOptions
): Promise<LivePortraitResult> {
  const {
    audioPath,
    outputPath,
    bodyLoopPath,
    personaId = "ruby",
    gestureState = "talking",
    motionIntensity = 1.6,
    fps = 30,
    serverUrl = process.env.LIVEPORTRAIT_SERVER_URL || "http://localhost:8009",
  } = options;

  log.info(`🎭 [LivePortrait Client] Launching Inverted Digital Human Pipeline (Intensity: ${motionIntensity}x)...`);

  if (audioPath && !fs.existsSync(audioPath)) {
    throw new Error(`[LivePortrait Client] Input audio not found: ${audioPath}`);
  }

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    await fs.promises.mkdir(outDir, { recursive: true });
  }

  // 1. Attempt HTTP microservice dispatch (Port 8009)
  try {
    const isOnline = await checkLivePortraitHealth(serverUrl);
    if (isOnline && audioPath) {
      const audioBuffer = await fs.promises.readFile(audioPath);
      const formData = new FormData();
      formData.append("audio", new Blob([audioBuffer], { type: "audio/wav" }), path.basename(audioPath));
      formData.append("persona_id", personaId);
      formData.append("state", gestureState);
      formData.append("motion_intensity", String(motionIntensity));
      formData.append("fps", String(fps));
      if (bodyLoopPath) {
        formData.append("body_loop_id", path.basename(bodyLoopPath));
      }

      const response = await pooledFetch(`${serverUrl}/composite_scene`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(60000),
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        await fs.promises.writeFile(outputPath, Buffer.from(arrayBuffer));
        log.info(`✅ [LivePortrait Client] Microservice HTTP generation complete: ${outputPath}`);
        return {
          success: true,
          outputPath,
        };
      }
    }
  } catch (httpErr: unknown) {
    const httpMsg = httpErr instanceof Error ? httpErr.message : String(httpErr);
    console.warn(`⚠️ [LivePortrait Client] Microservice HTTP call skipped/failed (${httpMsg}), falling back to local Python...`);
  }

  // 2. Fallback: Local Python execution
  const pythonExe = getPythonPath();

  const scriptPath = path.join(process.cwd(), "scripts", "musetalk", "inverted_realtime_pipeline.py");
  const defaultBodyLoop =
    bodyLoopPath ||
    resolveLocalActionLoopVideo(personaId, "M1") ||
    path.join(resolveLocalVeoDir(), "ruby_burgundy", "ruby_burgundy_M1_loop_v1.mp4");

  const args = [
    scriptPath,
    "--mode", "speech",
    ...(audioPath ? ["--audio", audioPath] : []),
    "--output", outputPath,
    "--body-loop", defaultBodyLoop,
    "--persona", personaId,
    "--state", gestureState,
    "--intensity", String(motionIntensity)
  ];

  try {
    const { stdout, stderr } = await execFileAsync(pythonExe, args, { cwd: process.cwd() });
    if (stdout) log.info(`[LivePortrait stdout]: ${stdout.slice(-200)}`);
    if (stderr && !stderr.includes("HTTP")) console.warn(`[LivePortrait stderr]: ${stderr.slice(-200)}`);

    if (!fs.existsSync(outputPath) || (await fs.promises.stat(outputPath)).size === 0) {
      throw new Error(`Pipeline failed to generate output video file at ${outputPath}`);
    }

    log.info(`✅ [LivePortrait Client] Inverted Scene successfully generated: ${outputPath}`);
    return {
      success: true,
      outputPath,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ [LivePortrait Client] Inverted Pipeline error: ${msg}`);
    return {
      success: false,
      outputPath: "",
      error: msg,
    };
  }
}

/**
 * Generates dynamic 3D animated idle motion on action loops WITHOUT speech/MuseTalk.
 */
export async function generateIdleAvatarScene(
  options: IdleAvatarOptions
): Promise<LivePortraitResult> {
  const {
    outputPath,
    bodyLoopPath,
    personaId = "ruby",
    idlePreset = "intense_anchor",
    motionIntensity = 2.0,
    durationSec = 4.0,
    fps = 30,
    serverUrl = process.env.LIVEPORTRAIT_SERVER_URL || "http://localhost:8009",
  } = options;

  log.info(`🎬 [LivePortrait Client] Generating Dynamic Idle Avatar Loop (Preset: ${idlePreset}, Intensity: ${motionIntensity}x)...`);

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) {
    await fs.promises.mkdir(outDir, { recursive: true });
  }

  // 1. Attempt HTTP microservice dispatch
  try {
    const isOnline = await checkLivePortraitHealth(serverUrl);
    if (isOnline) {
      const formData = new FormData();
      formData.append("persona_id", personaId);
      formData.append("body_loop_id", bodyLoopPath ? path.basename(bodyLoopPath) : "ruby_idle");
      formData.append("idle_preset", idlePreset);
      formData.append("motion_intensity", String(motionIntensity));
      formData.append("fps", String(fps));
      formData.append("duration_sec", String(durationSec));

      const response = await pooledFetch(`${serverUrl}/generate_idle`, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(60000),
      });

      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        await fs.promises.writeFile(outputPath, Buffer.from(arrayBuffer));
        log.info(`✅ [LivePortrait Client] Microservice HTTP idle generation complete: ${outputPath}`);
        return {
          success: true,
          outputPath,
        };
      }
    }
  } catch (httpErr: unknown) {
    const httpMsg = httpErr instanceof Error ? httpErr.message : String(httpErr);
    console.warn(`⚠️ [LivePortrait Client] Microservice HTTP idle call failed (${httpMsg}), falling back to local Python...`);
  }

  // 2. Fallback: Local Python execution
  const pythonExe = getPythonPath();

  const scriptPath = path.join(process.cwd(), "scripts", "musetalk", "inverted_realtime_pipeline.py");
  const defaultBodyLoop =
    bodyLoopPath ||
    resolveLocalActionLoopVideo(personaId, "M1") ||
    path.join(resolveLocalVeoDir(), "ruby_burgundy", "ruby_burgundy_M1_loop_v1.mp4");

  const args = [
    scriptPath,
    "--mode", "idle",
    "--output", outputPath,
    "--body-loop", defaultBodyLoop,
    "--persona", personaId,
    "--idle-preset", idlePreset,
    "--intensity", String(motionIntensity)
  ];

  try {
    const { stdout, stderr } = await execFileAsync(pythonExe, args, { cwd: process.cwd() });
    if (stdout) log.info(`[LivePortrait stdout]: ${stdout.slice(-200)}`);
    if (stderr && !stderr.includes("HTTP")) console.warn(`[LivePortrait stderr]: ${stderr.slice(-200)}`);

    if (!fs.existsSync(outputPath) || (await fs.promises.stat(outputPath)).size === 0) {
      throw new Error(`Pipeline failed to generate idle video file at ${outputPath}`);
    }

    log.info(`✅ [LivePortrait Client] Dynamic Idle Scene successfully generated: ${outputPath}`);
    return {
      success: true,
      outputPath,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌ [LivePortrait Client] Idle Pipeline error: ${msg}`);
    return {
      success: false,
      outputPath: "",
      error: msg,
    };
  }
}
