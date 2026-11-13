import { spawn, exec, execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { withTenant } from "@/lib/storage";
import { getRenderData } from "./api";
import {
  getRemotionEntryPoint,
  getRemotionBinPath,
  getOptimalRemotionConcurrency,
} from "@/lib/video/remotionUtils";
import { getFFmpegPath, getFFprobePath } from "@/lib/binaries";
import { createLogger } from "@/lib/logger";

const log = createLogger("worker:render-task");

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

export type ProgressCallback = (data: { step: string; status: string; doneSteps?: number; creditsUsed?: number }) => Promise<boolean>;

export async function executeRenderTask(
  jobId: string,
  onProgress: ProgressCallback
): Promise<{ outputPath: string; duration: number; thumbnailStorageKey?: string | null; thumbnailPath?: string | null }> {
  
  await onProgress({ step: "render_init", status: "RENDER_IN_PROGRESS", doneSteps: 1 });

  // 1. Fetch all data needed for rendering over HTTP
  const renderData = await getRenderData(jobId);
  const { videoId, companyId, compositionId, inputProps } = renderData;

  await onProgress({ step: "render_executing", status: "RENDER_IN_PROGRESS", doneSteps: 2 });

  const outputDir = path.resolve(process.cwd(), "public/assets/completed");
  const outputFile = path.join(outputDir, `${videoId}.mp4`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const tempPropsFile = path.join(process.cwd(), `tmp-props-${videoId}.json`);
  fs.writeFileSync(tempPropsFile, JSON.stringify(inputProps));

  const { entryPoint } = getRemotionEntryPoint();
  const remotionBin = getRemotionBinPath();
  const concurrency = getOptimalRemotionConcurrency(false);
  const isWin = process.platform === "win32";

  // Dynamic OpenGL backend: ANGLE for Windows host, swangle (software GL) for headless Linux containers
  const glFlag = process.env.REMOTION_GL || (isWin ? "angle" : "swangle");
  const browserExecutable = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;
  const chromiumOptions = process.env.CHROMIUM_FLAGS || (!isWin ? "--no-sandbox --disable-setuid-sandbox --disable-dev-shm-usage" : undefined);

  const baseArgs = remotionBin.endsWith("npx") || remotionBin.endsWith("npx.cmd")
    ? ["remotion", "render"]
    : ["render"];

  const renderArgs: string[] = [
    ...baseArgs,
    entryPoint,
    compositionId,
    outputFile,
    `--props=${tempPropsFile}`,
    `--concurrency=${concurrency}`,
    `--gl=${glFlag}`,
    "--pixel-format=yuv420p",
    "--crf=18",
    "--jpeg-quality=95",
    "--bundle-cache=true",
  ];

  if (browserExecutable) {
    renderArgs.push(`--browser-executable=${browserExecutable}`);
  }
  if (chromiumOptions) {
    renderArgs.push(`--chromium-options=${chromiumOptions}`);
  }

  log.info(`  ⚙️  Running Remotion CLI (${compositionId} via ${entryPoint}, concurrency=${concurrency})...`);
  
  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(remotionBin, renderArgs, {
        cwd: process.cwd(),
        shell: isWin,
      });

      let lastProgressPercent = 0;

      child.stdout?.on("data", (chunk: Buffer) => {
        const text = chunk.toString();
        const matchPct = text.match(/(\d+)%/);
        const matchFrames = text.match(/Rendering frame (\d+) of (\d+)/i) || text.match(/Rendered\s+(\d+)\/(\d+)/i);

        let progress = 0;
        if (matchPct) {
          progress = parseInt(matchPct[1], 10);
        } else if (matchFrames) {
          const cur = parseInt(matchFrames[1], 10);
          const tot = parseInt(matchFrames[2], 10);
          progress = Math.round((cur / tot) * 100);
        }

        if (progress > lastProgressPercent + 4) {
          lastProgressPercent = progress;
          onProgress({
            step: "render_executing",
            status: "RENDER_IN_PROGRESS",
            doneSteps: 2,
          }).catch(() => {});
        }
      });

      child.stderr?.on("data", (chunk: Buffer) => {
        const errText = chunk.toString().trim();
        if (errText && !errText.includes("Debugger attached")) {
          console.warn(`  [Remotion CLI]: ${errText}`);
        }
      });

      child.on("error", (err) => {
        if (fs.existsSync(tempPropsFile)) fs.unlinkSync(tempPropsFile);
        reject(new Error(`Remotion CLI spawn failed: ${err.message}`));
      });

      child.on("close", (code) => {
        if (fs.existsSync(tempPropsFile)) fs.unlinkSync(tempPropsFile);
        if (code === 0) resolve();
        else reject(new Error(`Remotion CLI exited with code ${code}`));
      });
    });
  } catch (error) {
    if (fs.existsSync(tempPropsFile)) fs.unlinkSync(tempPropsFile);
    throw new Error(`Remotion CLI failed: ${error}`);
  }

  if (fs.existsSync(tempPropsFile)) {
    fs.unlinkSync(tempPropsFile);
  }

  log.info(`  📸 Extracting thumbnail...`);
  await onProgress({ step: "render_thumbnail", status: "RENDER_IN_PROGRESS", doneSteps: 3 });

  const ffmpegBin = getFFmpegPath();
  const ffprobeBin = getFFprobePath();

  let duration = 60;
  try {
    const { stdout } = await execFileAsync(
      ffprobeBin,
      ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", outputFile],
      { timeout: 15000 }
    );
    const parsed = parseFloat(stdout.trim());
    if (Number.isFinite(parsed) && parsed > 0) duration = parsed;
  } catch (err) {
    console.error("  ⚠️  Failed to probe duration, defaulting to 60s:", err);
  }

  const candidates = [Math.min(1, duration / 2), duration / 2, Math.max(0, duration - 1)];

  const scoreFrame = async (framePath: string): Promise<number> => {
    try {
      const { stdout } = await execFileAsync(
        ffprobeBin,
        [
          "-v",
          "error",
          "-f",
          "lavfi",
          "-i",
          `movie='${framePath.replace(/'/g, "\\'")}',signalstats`,
          "-show_entries",
          "frame_tags=lavfi.signalstats.YAVG,lavfi.signalstats.YMIN,lavfi.signalstats.YMAX",
          "-of",
          "default=nw=1:nk=1"
        ],
        { timeout: 15000 }
      );
      const [yavg, ymin, ymax] = stdout.trim().split(/\s+/).map(Number);
      if (![yavg, ymin, ymax].every(Number.isFinite)) return 0;
      const range = ymax - ymin;
      const darkPenalty = yavg < 30 ? (30 - yavg) * 4 : 0;
      const brightPenalty = yavg > 225 ? (yavg - 225) * 4 : 0;
      return range - darkPenalty - brightPenalty;
    } catch {
      return 0;
    }
  };

  // Parallel extraction & scoring of candidate thumbnail frames
  const candidateResults = await Promise.all(
    candidates.map(async (ts, i) => {
      const framePath = outputFile.replace(".mp4", `-thumb-${i}.jpg`);
      try {
        await execFileAsync(
          ffmpegBin,
          ["-y", "-ss", ts.toFixed(3), "-i", outputFile, "-vframes", "1", framePath],
          { timeout: 30000 }
        );
        if (!fs.existsSync(framePath)) return null;
        const score = await scoreFrame(framePath);
        return { path: framePath, score };
      } catch (frameErr) {
        console.error(`  ⚠️  Failed to extract candidate frame at ${ts}s:`, frameErr);
        if (fs.existsSync(framePath)) fs.unlinkSync(framePath);
        return null;
      }
    })
  );

  const validCandidates = candidateResults.filter(
    (c): c is { path: string; score: number } => c !== null
  );

  let bestThumbnail: { path: string; score: number } | null = null;
  if (validCandidates.length > 0) {
    validCandidates.sort((a, b) => b.score - a.score);
    bestThumbnail = validCandidates[0];

    // Clean up unused candidate frame files
    for (let i = 1; i < validCandidates.length; i++) {
      if (fs.existsSync(validCandidates[i].path)) {
        fs.unlinkSync(validCandidates[i].path);
      }
    }
  }

  let thumbnailStorageKey: string | null = null;
  let thumbnailPath: string | null = null;

  if (bestThumbnail && fs.existsSync(bestThumbnail.path)) {
    const { storage } = await import("@/lib/storage");
    thumbnailStorageKey = withTenant(companyId, `thumbnails/${videoId}.jpg`);
    const fileBuffer = fs.readFileSync(bestThumbnail.path);
    thumbnailPath = await storage.upload(thumbnailStorageKey, fileBuffer, "image/jpeg");
    fs.unlinkSync(bestThumbnail.path);
  }

  // Upload final rendered video to Cloud Storage
  log.info(`  ☁️  Uploading rendered video to storage...`);
  await onProgress({ step: "render_upload", status: "RENDER_IN_PROGRESS", doneSteps: 4 });

  let uploadedVideoUrl = `/assets/completed/${videoId}.mp4`;
  if (fs.existsSync(outputFile)) {
    try {
      const { storage } = await import("@/lib/storage");
      const videoKey = withTenant(companyId, `renders/${videoId}.mp4`);
      const videoBuffer = fs.readFileSync(outputFile);
      uploadedVideoUrl = await storage.upload(videoKey, videoBuffer, "video/mp4");
      log.info(`  ☁️  Rendered video uploaded to storage: ${uploadedVideoUrl}`);
    } catch (uploadErr) {
      console.warn(`  ⚠️ Failed to upload rendered video to storage, falling back to local path:`, uploadErr);
    }
  }

  return { outputPath: uploadedVideoUrl, duration, thumbnailStorageKey, thumbnailPath };
}
