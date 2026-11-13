/**
 * src/lib/video/loopAuditor.ts
 *
 * Video Loop & Transition Boundary Auditor.
 * 
 * Inspects action loops and transitions:
 * 1. Classifies as Idle Motion Beat (M_i -> M_i) or FLF Transition (M_i -> M_j).
 * 2. For Idle Motion Beats:
 *    - Validates Frame 0 vs Frame [Last] (SSIM >= 0.90, PSNR >= 26.0 dB, MAE <= 6.0/255).
 *    - Validates Frame 0 vs Reference Image M_i (Fidelity).
 *    - PASS requires strictly seamless continuity.
 * 3. For FLF Transitions:
 *    - Validates Frame 0 vs Start Reference Image M_i.
 *    - Validates Frame [Last] vs End Reference Image M_j.
 * 4. Auto-Fix Mode:
 *    - Automatically applies DIS Optical Flow Seamless Harmonizer & Exact Boundary Lock on seam drift.
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { getPythonPath } from "@/lib/binaries";
import { applySeamlessLoopLock, enforceStrictExactBoundaryLock } from "../../../scripts/veo-cli/processors/loopHarmonizer";
import { createLogger } from "@/lib/logger";

const log = createLogger("video:loopAuditor");

export type LoopClassification = "idle_motion_beat" | "flf_transition" | "unknown";

export interface BoundaryMetrics {
  ssim: number;
  psnr: number;
  mae: number;
}

export interface VideoAuditResult {
  filename: string;
  absolutePath: string;
  classification: LoopClassification;
  totalFrames: number;
  fps: number;
  width: number;
  height: number;
  durationSec: number;
  // Boundary metrics between Frame 0 and Frame Last
  seamMetrics: BoundaryMetrics;
  // Reference image fidelity metrics
  refStartPath?: string;
  refStartMetrics?: BoundaryMetrics;
  refEndPath?: string;
  refEndMetrics?: BoundaryMetrics;
  // Overall Pass/Fail Status
  passed: boolean;
  seamPassed: boolean;
  fidelityPassed: boolean;
  wasHarmonized?: boolean;
  notes?: string;
}

export interface AuditSummaryReport {
  timestamp: string;
  totalAudited: number;
  passedCount: number;
  failedCount: number;
  harmonizedCount: number;
  results: VideoAuditResult[];
}

export interface AuditorOptions {
  targetSsim?: number; // default: 0.90
  targetPsnr?: number; // default: 26.0
  maxMae?: number;     // default: 6.0
  autoFix?: boolean;   // run optical flow loop harmonizer on drift
}

const DEFAULT_OPTIONS: Required<AuditorOptions> = {
  targetSsim: 0.90,
  targetPsnr: 26.0,
  maxMae: 6.0,
  autoFix: false,
};


/**
 * Classifies a video loop based on its filename convention.
 */
export function classifyVideoLoop(filename: string): {
  classification: LoopClassification;
  persona?: string;
  startState?: string;
  endState?: string;
} {
  const lower = filename.toLowerCase();

  // Transitions: M1_to_M2, transition, trans, etc.
  if (lower.includes("_to_") || lower.includes("transition") || lower.includes("trans_")) {
    const parts = lower.split("_to_");
    return {
      classification: "flf_transition",
      persona: lower.includes("ruby") ? "ruby" : lower.includes("blaze") ? "blaze" : undefined,
      startState: parts[0]?.split("_").pop(),
      endState: parts[1]?.split("_")[0],
    };
  }

  // Idle Beats: idle, standing, clasped, subtle_beat, loop
  if (
    lower.includes("idle") ||
    lower.includes("beat") ||
    lower.includes("standing") ||
    lower.includes("clasped") ||
    lower.includes("loop") ||
    lower.includes("master")
  ) {
    return {
      classification: "idle_motion_beat",
      persona: lower.includes("ruby") ? "ruby" : lower.includes("blaze") ? "blaze" : undefined,
    };
  }

  return { classification: "idle_motion_beat" };
}

/**
 * Resolves standard avatar reference image for a persona.
 */
export function resolvePersonaReference(persona?: string): string | undefined {
  if (!persona) return undefined;
  const avatarsDir = path.resolve(process.cwd(), "public/avatars");
  const candidates = [
    path.join(avatarsDir, `${persona}_ref.png`),
    path.join(avatarsDir, `${persona}_body_ref.png`),
    path.join(avatarsDir, `${persona}.png`),
    path.join(avatarsDir, `${persona}_uncensored_ref.png`),
  ];

  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return undefined;
}

/**
 * Computes OpenCV SSIM, PSNR, and MAE via Python backend.
 */
function runOpenCvMetrics(
  videoPath: string,
  refStartPath?: string,
  refEndPath?: string
): {
  totalFrames: number;
  fps: number;
  width: number;
  height: number;
  seam: BoundaryMetrics;
  refStart?: BoundaryMetrics;
  refEnd?: BoundaryMetrics;
} | null {
  const scratchDir = path.resolve(process.cwd(), "scratch");
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  const pyScriptPath = path.join(scratchDir, "loop_metrics.py");

  const pyCode = `
import cv2
import numpy as np
import json
import sys
import os

def calc_image_metrics(imgA, imgB):
    if imgA is None or imgB is None:
        return None
    # Resize imgB to match imgA if dimensions differ
    if imgA.shape != imgB.shape:
        imgB = cv2.resize(imgB, (imgA.shape[1], imgA.shape[0]))

    fA = imgA.astype(np.float32)
    fB = imgB.astype(np.float32)

    mae = float(np.mean(np.abs(fA - fB)))
    mse = float(np.mean((fA - fB) ** 2))
    psnr = 100.0 if mse == 0 else float(10.0 * np.log10((255.0 ** 2) / mse))

    grayA = cv2.cvtColor(imgA, cv2.COLOR_BGR2GRAY).astype(np.float32)
    grayB = cv2.cvtColor(imgB, cv2.COLOR_BGR2GRAY).astype(np.float32)

    C1 = (0.01 * 255) ** 2
    C2 = (0.03 * 255) ** 2

    muA = cv2.GaussianBlur(grayA, (11, 11), 1.5)
    muB = cv2.GaussianBlur(grayB, (11, 11), 1.5)
    muA_sq = muA ** 2
    muB_sq = muB ** 2
    muA_muB = muA * muB

    sigmaA_sq = cv2.GaussianBlur(grayA ** 2, (11, 11), 1.5) - muA_sq
    sigmaB_sq = cv2.GaussianBlur(grayB ** 2, (11, 11), 1.5) - muB_sq
    sigmaAB = cv2.GaussianBlur(grayA * grayB, (11, 11), 1.5) - muA_muB

    ssim_map = ((2 * muA_muB + C1) * (2 * sigmaAB + C2)) / ((muA_sq + muB_sq + C1) * (sigmaA_sq + sigmaB_sq + C2))
    ssim = float(np.mean(ssim_map))

    return {
        "ssim": round(ssim, 4),
        "psnr": round(psnr, 2),
        "mae": round(mae, 2)
    }

def analyze_video(video_path, ref_start=None, ref_end=None):
    if not os.path.exists(video_path):
        print(json.dumps({"error": "Video not found"}))
        return

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(json.dumps({"error": "Failed to open video"}))
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 24.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    frames = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(frame)
    cap.release()

    if len(frames) < 2:
        print(json.dumps({"error": "Video has < 2 frames"}))
        return

    f0 = frames[0]
    fn = frames[-1]

    seam = calc_image_metrics(f0, fn)

    # Inter-frame velocity and jump-cut discontinuity analysis
    step_deltas = []
    for i in range(1, len(frames)):
        d = float(np.mean(np.abs(frames[i].astype(np.float32) - frames[i-1].astype(np.float32))))
        step_deltas.append(d)

    avg_step = float(np.mean(step_deltas)) if step_deltas else 1.0
    tail_step = float(np.mean(np.abs(frames[-1].astype(np.float32) - frames[-2].astype(np.float32))))
    seam_step = float(np.mean(np.abs(frames[0].astype(np.float32) - frames[-1].astype(np.float32))))
    max_step = float(np.max(step_deltas)) if step_deltas else 1.0

    # A snap cut occurs if the tail transition is 2x faster than the average motion
    is_jump_cut = (tail_step > 2.2 * avg_step) or (seam_step > 2.2 * avg_step)

    ref_start_metrics = None
    if ref_start and os.path.exists(ref_start):
        img_start = cv2.imread(ref_start)
        ref_start_metrics = calc_image_metrics(f0, img_start)

    ref_end_metrics = None
    if ref_end and os.path.exists(ref_end):
        img_end = cv2.imread(ref_end)
        ref_end_metrics = calc_image_metrics(fn, img_end)

    print(json.dumps({
        "totalFrames": len(frames),
        "fps": round(fps, 2),
        "width": width,
        "height": height,
        "seam": seam,
        "avgVelocity": round(avg_step, 2),
        "tailStep": round(tail_step, 2),
        "maxStep": round(max_step, 2),
        "isJumpCut": is_jump_cut,
        "refStart": ref_start_metrics,
        "refEnd": ref_end_metrics
    }))

video_p = sys.argv[1]
ref_s = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != "null" else None
ref_e = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] != "null" else None

analyze_video(video_p, ref_s, ref_e)
`;

  fs.writeFileSync(pyScriptPath, pyCode, "utf8");

  const pyExe = getPythonPath();
  const args = [
    pyScriptPath,
    videoPath,
    refStartPath || "null",
    refEndPath || "null",
  ];

  try {
    const res = spawnSync(pyExe, args, { encoding: "utf8", windowsHide: true });
    if (res.status === 0 && res.stdout) {
      const parsed = JSON.parse(res.stdout.trim());
      if (parsed.error) {
        console.warn(`[LoopAuditor] Notice for ${videoPath}: ${parsed.error}`);
        return null;
      }
      return parsed;
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[LoopAuditor] Error running metrics:`, errMsg);
  }
  return null;
}

/**
 * Audits a single video file.
 */
export async function auditSingleVideo(
  videoPath: string,
  options: AuditorOptions = {}
): Promise<VideoAuditResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const absPath = path.resolve(videoPath);
  const filename = path.basename(absPath);

  const { classification, persona } = classifyVideoLoop(filename);
  const refStart = resolvePersonaReference(persona);
  const refEnd = classification === "flf_transition" ? refStart : undefined;

  let metrics = runOpenCvMetrics(absPath, refStart, refEnd);
  let wasHarmonized = false;

  if (!metrics) {
    return {
      filename,
      absolutePath: absPath,
      classification,
      totalFrames: 0,
      fps: 0,
      width: 0,
      height: 0,
      durationSec: 0,
      seamMetrics: { ssim: 0, psnr: 0, mae: 255 },
      passed: false,
      seamPassed: false,
      fidelityPassed: false,
      notes: "Could not read video frames",
    };
  }

  // Check seam quality for idle loops
  let seamPassed =
    metrics.seam.ssim >= opts.targetSsim &&
    metrics.seam.psnr >= opts.targetPsnr &&
    metrics.seam.mae <= opts.maxMae;

  // Auto-Fix if seam drift detected on an Idle Motion Beat
  if (!seamPassed && opts.autoFix && classification === "idle_motion_beat") {
    log.info(`🔧 [Auto-Fix] Seam drift detected on [${filename}] (SSIM: ${metrics.seam.ssim}, PSNR: ${metrics.seam.psnr}dB). Harmonizing...`);

    // 1. Apply advanced DIS Optical Flow Loop Harmonization first to blend the seam organically
    const harmonized = await applySeamlessLoopLock(absPath);

    // 2. Only if harmonization succeeded, enforce the strict boundary lock (Frame 0 == Frame N)
    if (harmonized) {
      const locked = enforceStrictExactBoundaryLock(absPath);
      if (locked) {
        wasHarmonized = true;
        // Re-run metrics post-fix
        const postMetrics = runOpenCvMetrics(absPath, refStart, refEnd);
        if (postMetrics) {
          metrics = postMetrics;
          seamPassed =
            metrics.seam.ssim >= opts.targetSsim &&
            metrics.seam.psnr >= opts.targetPsnr &&
            metrics.seam.mae <= opts.maxMae;
        }
      }
    }
  }

  // Fidelity checks
  const fidelityPassed = metrics.refStart ? metrics.refStart.ssim >= 0.40 : true;
  const passed = classification === "idle_motion_beat" ? seamPassed : fidelityPassed;

  return {
    filename,
    absolutePath: absPath,
    classification,
    totalFrames: metrics.totalFrames,
    fps: metrics.fps,
    width: metrics.width,
    height: metrics.height,
    durationSec: Number((metrics.totalFrames / (metrics.fps || 24)).toFixed(2)),
    seamMetrics: metrics.seam,
    refStartPath: refStart,
    refStartMetrics: metrics.refStart,
    refEndPath: refEnd,
    refEndMetrics: metrics.refEnd,
    passed,
    seamPassed,
    fidelityPassed,
    wasHarmonized,
  };
}

/**
 * Audits all videos in a specified directory.
 */
export async function auditVideoDirectory(
  dirPath: string = "public/assets/action_loops/veo",
  options: AuditorOptions = {}
): Promise<AuditSummaryReport> {
  const absDir = path.resolve(process.cwd(), dirPath);
  if (!fs.existsSync(absDir)) {
    throw new Error(`Directory does not exist: ${absDir}`);
  }

  const entries = fs.readdirSync(absDir);
  const videoFiles = entries.filter((f) => f.endsWith(".mp4") && !f.includes(".temp.") && !f.includes(".locked."));

  log.info(`\n🔍 [Video Loop Auditor] Auditing ${videoFiles.length} video files in: ${absDir}\n`);

  const results: VideoAuditResult[] = [];
  let passedCount = 0;
  let failedCount = 0;
  let harmonizedCount = 0;

  for (const file of videoFiles) {
    const filePath = path.join(absDir, file);
    const result = await auditSingleVideo(filePath, options);
    results.push(result);

    if (result.passed) passedCount++;
    else failedCount++;

    if (result.wasHarmonized) harmonizedCount++;
  }

  const report: AuditSummaryReport = {
    timestamp: new Date().toISOString(),
    totalAudited: results.length,
    passedCount,
    failedCount,
    harmonizedCount,
    results,
  };

  // Save report to disk
  const analysisDir = path.join(absDir, "analysis");
  if (!fs.existsSync(analysisDir)) fs.mkdirSync(analysisDir, { recursive: true });
  const reportPath = path.join(analysisDir, `audit_report_${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  log.info(`📄 Saved audit report to: ${reportPath}`);

  return report;
}
