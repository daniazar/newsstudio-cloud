/**
 * scripts/veo-cli/processors/videoChainer.ts
 *
 * Recursive Video Chaining & Optical Flow Stitching Processor.
 * Extracts terminal boundary frames (F_end -> F_init), normalizes chroma backdrops,
 * audits seam continuity (SSIM/PSNR/MAE), and stitches multi-clip sequences into
 * seamless long-form broadcast video.
 */

import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { printClickablePath } from "../artifactManager";

export interface SeamAuditScorecard {
  ssim: number;
  psnr: number;
  mae: number;
  seamless: boolean;
  message: string;
}

export interface StitchOptions {
  transitions?: Array<"cut" | "optical_flow">;
  blendFrames?: number;
  fps?: number;
  outputDir?: string;
  outBaseName?: string;
}

function getPythonPath(): string {
  const pyExeCandidates = [
    "C:\\Users\\danie\\AppData\\Local\\Comfy-Desktop\\ComfyUI-Installs\\ComfyUI\\ComfyUI\\.venv\\Scripts\\python.exe",
    "python",
    "python3",
  ];
  return pyExeCandidates.find((p) => p === "python" || fs.existsSync(p)) || "python";
}

/**
 * Extracts the exact terminal boundary frame of a video clip.
 * Optionally stabilizes the chroma background color so background lighting does not drift across chained clips.
 */
export async function extractTerminalFrame(
  videoPath: string,
  outPngPath: string,
  options: { offsetSecondsFromEnd?: number; stabilizeChroma?: boolean } = {}
): Promise<string | null> {
  if (!fs.existsSync(videoPath)) {
    console.error(`❌ Video file not found: ${videoPath}`);
    return null;
  }

  const outDir = path.dirname(outPngPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const scratchDir = path.resolve(process.cwd(), "scratch");
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  const scriptPath = path.resolve(scratchDir, "extract_boundary_frame.py");

  const pyCode = `
import cv2
import numpy as np
import sys
import os

def extract_boundary(video_path, out_path, offset_sec=0.04, stabilize_chroma=True):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return False
        
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    
    if total_frames <= 0:
        cap.release()
        return False
        
    offset_frames = max(1, int(offset_sec * fps))
    target_idx = max(0, total_frames - offset_frames)
    
    cap.set(cv2.CAP_PROP_POS_FRAMES, target_idx)
    ret, frame = cap.read()
    cap.release()
    
    if not ret or frame is None:
        return False
        
    if stabilize_chroma:
        h, w = frame.shape[:2]
        borders = np.concatenate([
            frame[0:int(h*0.1), :].reshape(-1, 3),
            frame[int(h*0.9):, :].reshape(-1, 3),
            frame[:, 0:int(w*0.1)].reshape(-1, 3),
            frame[:, int(w*0.9):].reshape(-1, 3),
        ])
        med_b = np.median(borders[:, 0])
        med_g = np.median(borders[:, 1])
        med_r = np.median(borders[:, 2])
        
        # Detect chroma green wall
        if (med_g > med_r + 30) and (med_g > med_b + 30):
            ref_green = np.array([0.0, 255.0, 0.0], dtype=np.float32) # Pure #00FF00
            f_float = frame.astype(np.float32)
            b, g, r = f_float[:, :, 0], f_float[:, :, 1], f_float[:, :, 2]
            diff = g - np.maximum(r, b)
            mask = np.clip((diff - 25.0) / 35.0, 0.0, 1.0)
            mask_blur = cv2.GaussianBlur(mask, (13, 13), 0)[:, :, np.newaxis]
            bg_target = np.zeros_like(f_float) + ref_green
            frame = (f_float * (1.0 - mask_blur) + bg_target * mask_blur).astype(np.uint8)
            
    cv2.imwrite(out_path, frame)
    return True

if __name__ == '__main__':
    video_path = sys.argv[1]
    out_path = sys.argv[2]
    offset = float(sys.argv[3]) if len(sys.argv) > 3 else 0.04
    stabilize = sys.argv[4].lower() == 'true' if len(sys.argv) > 4 else True
    success = extract_boundary(video_path, out_path, offset, stabilize)
    sys.exit(0 if success else 1)
`;

  fs.writeFileSync(scriptPath, pyCode, "utf8");
  const pythonPath = getPythonPath();

  try {
    const res = spawnSync(
      pythonPath,
      [
        scriptPath,
        videoPath,
        outPngPath,
        String(options.offsetSecondsFromEnd ?? 0.04),
        String(options.stabilizeChroma !== false),
      ],
      { stdio: "pipe", windowsHide: true, encoding: "utf8" }
    );

    if (res.status === 0 && fs.existsSync(outPngPath)) {
      return outPngPath;
    }
  } catch (err: any) {
    console.error("❌ Failed to extract boundary frame:", err.message);
  }

  return null;
}

/**
 * Audits seam continuity (SSIM, PSNR, MAE) between the terminal frame of Clip A and initial frame of Clip B.
 */
export async function auditSeamContinuity(
  clipAPath: string,
  clipBPath: string
): Promise<SeamAuditScorecard> {
  const scratchDir = path.resolve(process.cwd(), "scratch");
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  const scriptPath = path.resolve(scratchDir, "audit_seam.py");

  const pyCode = `
import cv2
import numpy as np
import sys
import json

def get_last_frame(path):
    cap = cv2.VideoCapture(path)
    count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    cap.set(cv2.CAP_PROP_POS_FRAMES, max(0, count - 2))
    ret, frame = cap.read()
    cap.release()
    return frame

def get_first_frame(path):
    cap = cv2.VideoCapture(path)
    cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
    ret, frame = cap.read()
    cap.release()
    return frame

def calculate_metrics(fA, fB):
    if fA is None or fB is None:
        return {"ssim": 0.0, "psnr": 0.0, "mae": 255.0, "seamless": False, "message": "Frame read error"}
    if fA.shape != fB.shape:
        fB = cv2.resize(fB, (fA.shape[1], fA.shape[0]))
        
    diff = np.abs(fA.astype(np.float32) - fB.astype(np.float32))
    mae = float(np.mean(diff))
    
    mse = float(np.mean(diff ** 2))
    psnr = float(10.0 * np.log10((255.0 ** 2) / max(1e-6, mse)))
    
    # Fast SSIM calculation
    grayA = cv2.cvtColor(fA, cv2.COLOR_BGR2GRAY).astype(np.float32)
    grayB = cv2.cvtColor(fB, cv2.COLOR_BGR2GRAY).astype(np.float32)
    
    muA = cv2.GaussianBlur(grayA, (11, 11), 1.5)
    muB = cv2.GaussianBlur(grayB, (11, 11), 1.5)
    
    sigmaA_sq = cv2.GaussianBlur(grayA ** 2, (11, 11), 1.5) - muA ** 2
    sigmaB_sq = cv2.GaussianBlur(grayB ** 2, (11, 11), 1.5) - muB ** 2
    sigmaAB = cv2.GaussianBlur(grayA * grayB, (11, 11), 1.5) - muA * muB
    
    C1 = (0.01 * 255) ** 2
    C2 = (0.03 * 255) ** 2
    
    ssim_map = ((2 * muA * muB + C1) * (2 * sigmaAB + C2)) / ((muA ** 2 + muB ** 2 + C1) * (sigmaA_sq + sigmaB_sq + C2))
    ssim = float(np.mean(ssim_map))
    
    seamless = ssim >= 0.92 and psnr >= 26.0 and mae <= 6.0
    msg = f"Seam Continuity: SSIM={ssim:.4f}, PSNR={psnr:.2f}dB, MAE={mae:.2f}/255 ({'PASS' if seamless else 'REQUIRES HEALING'})"
    return {"ssim": ssim, "psnr": psnr, "mae": mae, "seamless": seamless, "message": msg}

if __name__ == '__main__':
    fA = get_last_frame(sys.argv[1])
    fB = get_first_frame(sys.argv[2])
    res = calculate_metrics(fA, fB)
    print(json.dumps(res))
`;

  fs.writeFileSync(scriptPath, pyCode, "utf8");
  const pythonPath = getPythonPath();

  try {
    const res = spawnSync(pythonPath, [scriptPath, clipAPath, clipBPath], {
      stdio: "pipe",
      windowsHide: true,
      encoding: "utf8",
    });

    if (res.status === 0) {
      const parsed = JSON.parse(res.stdout.trim().split("\n").pop() || "{}");
      return parsed;
    }
  } catch (err: any) {
    console.error("❌ Failed to audit seam continuity:", err.message);
  }

  return { ssim: 0, psnr: 0, mae: 255, seamless: false, message: "Audit failed" };
}

/**
 * Stitches multiple video clips into a single master continuous MP4.
 * Applies optical flow morphing for continuous single-camera joints, and frame-exact cuts for multi-camera transitions.
 */
export async function stitchVideoClips(
  clipPaths: string[],
  outMp4Path: string,
  options: StitchOptions = {}
): Promise<string | null> {
  const validClips = clipPaths.filter((p) => fs.existsSync(p));
  if (validClips.length === 0) {
    console.error("❌ No valid clips provided for stitching.");
    return null;
  }

  if (validClips.length === 1) {
    fs.copyFileSync(validClips[0], outMp4Path);
    return outMp4Path;
  }

  const outDir = path.dirname(outMp4Path);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const scratchDir = path.resolve(process.cwd(), "scratch");
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
  const scriptPath = path.resolve(scratchDir, "stitch_clips.py");

  const pyCode = `
import cv2
import numpy as np
import sys
import json
import os

def warp_flow(img, flow):
    h, w = flow.shape[:2]
    flow_map = -flow
    flow_map[:, :, 0] += np.arange(w)
    flow_map[:, :, 1] += np.arange(h)[:, np.newaxis]
    res = cv2.remap(img, flow_map.astype(np.float32), None, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    return res

def read_all_frames(path):
    cap = cv2.VideoCapture(path)
    frames = []
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(frame)
    cap.release()
    return frames, fps

def stitch_sequences(clip_list, out_path, transitions, blend_frames=6):
    if not clip_list:
        return False
        
    master_frames = []
    base_fps = 30.0
    w, h = 0, 0
    
    for i, c_path in enumerate(clip_list):
        frames, fps = read_all_frames(c_path)
        if not frames:
            continue
            
        base_fps = fps
        h, w = frames[0].shape[:2]
        
        if i == 0:
            master_frames.extend(frames)
        else:
            trans_type = transitions[i-1] if i-1 < len(transitions) else "optical_flow"
            
            if trans_type == "cut":
                # Instant broadcast multi-camera cut
                master_frames.extend(frames)
            else:
                # Dense Optical Flow Blend across seam
                k = min(blend_frames, len(master_frames) // 2, len(frames) // 2)
                if k > 0:
                    tail_prev = master_frames[-k:]
                    head_next = frames[:k]
                    
                    f_dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
                    
                    blended = []
                    for t_idx in range(k):
                        alpha = float(t_idx + 1) / float(k + 1)
                        cos_alpha = 0.5 * (1.0 - np.cos(np.pi * alpha))
                        
                        prev_f = tail_prev[t_idx]
                        next_f = head_next[t_idx]
                        
                        g_prev = cv2.cvtColor(prev_f, cv2.COLOR_BGR2GRAY)
                        g_next = cv2.cvtColor(next_f, cv2.COLOR_BGR2GRAY)
                        
                        flow_fwd = f_dis.calc(g_prev, g_next, None)
                        flow_bwd = f_dis.calc(g_next, g_prev, None)
                        
                        w_fwd = warp_flow(prev_f, flow_fwd * cos_alpha)
                        w_bwd = warp_flow(next_f, flow_bwd * (1.0 - cos_alpha))
                        
                        b_frame = cv2.addWeighted(w_fwd, 1.0 - cos_alpha, w_bwd, cos_alpha, 0)
                        blended.append(b_frame)
                        
                    # Replace tail of previous clip and drop blended head of next clip
                    master_frames = master_frames[:-k] + blended + frames[k:]
                else:
                    master_frames.extend(frames)
                    
    if not master_frames:
        return False
        
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(out_path, fourcc, base_fps, (w, h))
    for f in master_frames:
        out.write(f)
    out.release()
    return True

if __name__ == '__main__':
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        cfg = json.load(f)
        
    clips = cfg.get("clips", [])
    out_path = cfg.get("outPath", "")
    trans = cfg.get("transitions", [])
    blend = cfg.get("blendFrames", 6)
    
    success = stitch_sequences(clips, out_path, trans, blend)
    sys.exit(0 if success else 1)
`;

  fs.writeFileSync(scriptPath, pyCode, "utf8");

  const configPath = path.resolve(scratchDir, "stitch_config.json");
  fs.writeFileSync(
    configPath,
    JSON.stringify({
      clips: validClips,
      outPath: outMp4Path,
      transitions: options.transitions || validClips.slice(1).map(() => "optical_flow"),
      blendFrames: options.blendFrames ?? 6,
    }),
    "utf8"
  );

  const pythonPath = getPythonPath();
  console.log(`\n🧵 Stitching ${validClips.length} video clips into: ${outMp4Path}`);

  try {
    const res = spawnSync(pythonPath, [scriptPath, configPath], {
      stdio: "pipe",
      windowsHide: true,
      encoding: "utf8",
    });

    if (res.status === 0 && fs.existsSync(outMp4Path)) {
      console.log(`✔ Master stitched video ready!`);
      printClickablePath(outMp4Path);
      return outMp4Path;
    } else {
      console.error("❌ Python stitcher returned error:", res.stderr);
    }
  } catch (err: any) {
    console.error("❌ Stitcher execution failed:", err.message);
  }

  return null;
}
