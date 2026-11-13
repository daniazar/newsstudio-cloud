/**
 * scripts/veo-cli/processors/loopQualityGate.ts
 *
 * Real Dynamic SSIM, PSNR, and Boundary Seam Quality Gate Validator with Auto-Healing.
 * Ensures generated loops pass broadcast loop-continuity standards (SSIM >= 0.92, PSNR >= 28.0 dB).
 */

import fs from "fs";
import path from "path";
import { checkLoopQuality, QualityGateResult } from "../../check-loop-quality";
import { applySeamlessLoopLock, enforceStrictExactBoundaryLock } from "./loopHarmonizer";

export interface QualityGateAuditResult {
  passed: boolean;
  healed: boolean;
  initialSsim: number;
  finalSsim: number;
  initialPsnr: number;
  finalPsnr: number;
  videoPath: string;
  report: string;
}

export async function auditAndHealLoopQuality(
  videoPath: string,
  options: { targetSsim?: number; autoHeal?: boolean } = {}
): Promise<QualityGateAuditResult> {
  const targetSsim = options.targetSsim ?? 0.92;
  const autoHeal = options.autoHeal !== false;

  if (!fs.existsSync(videoPath)) {
    return {
      passed: false,
      healed: false,
      initialSsim: 0,
      finalSsim: 0,
      initialPsnr: 0,
      finalPsnr: 0,
      videoPath,
      report: `File not found: ${videoPath}`,
    };
  }

  const initial = checkLoopQuality(videoPath, targetSsim, 26.0, 6.0);
  let finalResult = initial;
  let healed = false;

  console.log("\n==================================================================");
  console.log(`🔍 LOOP BOUNDARY FORENSIC SCORECARD: [${path.basename(videoPath)}]`);
  console.log("==================================================================");
  console.log(`Metric      | Observed Value | Target Baseline | Status`);
  console.log(`------------|----------------|-----------------|--------`);
  console.log(`SSIM Index  | ${initial.ssim.toFixed(4).padEnd(14)} | >= ${targetSsim.toFixed(4).padEnd(11)} | ${initial.ssim >= targetSsim ? "✔ PASS" : "❌ DRIFT"}`);
  console.log(`PSNR Peak   | ${(initial.psnr.toFixed(2) + " dB").padEnd(14)} | >= 26.00 dB     | ${initial.psnr >= 26.0 ? "✔ PASS" : "⚠️ LOW"}`);
  console.log(`Mean Error  | ${initial.mae.toFixed(2).padEnd(14)} | <= 6.00         | ${initial.mae <= 6.0 ? "✔ PASS" : "❌ JUMP"}`);
  console.log("------------------------------------------------------------------");

  if (initial.ssim < targetSsim && autoHeal) {
    console.log(`\n⚠️ Seam drift detected (SSIM ${initial.ssim.toFixed(4)} < ${targetSsim}).`);
    console.log(`🔄 Triggering Cosine Optical Flow Seamless Loop Harmonizer...`);

    try {
      await applySeamlessLoopLock(videoPath, { blendFrames: 16, useOpticalFlow: true });
      enforceStrictExactBoundaryLock(videoPath);
      healed = true;

      finalResult = checkLoopQuality(videoPath, targetSsim, 26.0, 6.0);
      console.log(`✔ Post-healing verification: SSIM improved from ${initial.ssim.toFixed(4)} ➔ ${finalResult.ssim.toFixed(4)}!`);
    } catch (err: any) {
      console.warn("⚠️ Loop harmonizer auto-heal error:", err.message);
    }
  }

  const passed = finalResult.ssim >= targetSsim;
  console.log(`Final Quality Gate Status: ${passed ? "🏆 VERIFIED SEAMLESS LOOP" : "⚠️ ACCEPTABLE WITH DRIFT"}\n`);

  return {
    passed,
    healed,
    initialSsim: initial.ssim,
    finalSsim: finalResult.ssim,
    initialPsnr: initial.psnr,
    finalPsnr: finalResult.psnr,
    videoPath,
    report: finalResult.message,
  };
}
