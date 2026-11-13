/**
 * scripts/veo-cli/auditors/setConsistencyAuditor.ts
 *
 * TypeScript Wrapper & Programmatic Loop API for the Multi-Modal Set Consistency Auditor.
 * Executes python-based InsightFace + YOLOv8 + Silhouette computer vision engine,
 * enforcing facial identity, 34DD/hourglass curvature, attire geometry, and navel integrity.
 */

import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

const PYTHON_PATH = "C:\\Users\\danie\\AppData\\Local\\Comfy-Desktop\\ComfyUI-Installs\\ComfyUI\\ComfyUI\\.venv\\Scripts\\python.exe";

export interface ConsistencyImageMetric {
  face_similarity: number;
  jacket_ratio: number;
  bust_to_waist_ratio: number;
  exposed_midriff: boolean;
  midriff_gap_px: number;
  navel_status: "detected" | "occluded_by_hands" | "missing" | "no_exposed_midriff";
  belt_loops: boolean;
  choker: boolean;
}

export interface ConsistencyImageResult {
  filename: string;
  passed: boolean;
  reasons: string[];
  metrics: ConsistencyImageMetric;
}

export interface ConsistencyAuditReport {
  all_passed: boolean;
  error?: string;
  baseline: {
    path: string;
    filename: string;
    identity_reference: string;
    jacket_ratio: number;
    bust_to_waist_ratio: number;
    has_exposed_midriff: boolean;
    navel_status: string;
    belt_loops_detected: boolean;
    choker_detected: boolean;
  };
  results: ConsistencyImageResult[];
}

export interface SetConsistencyOptions {
  baselinePath?: string;
  personaReferencePath?: string;
  pattern?: string;
  gender?: "auto" | "male" | "female";
  toleranceJacket?: number;
  toleranceFace?: number;
  toleranceRef?: number;
  toleranceHourglass?: number;
}

/**
 * Runs the Multi-Modal Set Consistency Auditor on an image folder.
 */
export function auditSetConsistency(
  dirPath: string,
  options: SetConsistencyOptions = {}
): ConsistencyAuditReport {
  const pythonScript = path.resolve(__dirname, "setConsistencyAuditor.py");
  if (!fs.existsSync(pythonScript)) {
    throw new Error(`Auditor script not found: ${pythonScript}`);
  }

  const args = [pythonScript, "--dir", dirPath, "--json"];

  if (options.baselinePath) {
    args.push("--baseline", options.baselinePath);
  }
  if (options.personaReferencePath) {
    args.push("--persona-reference", options.personaReferencePath);
  }
  if (options.pattern) {
    args.push("--pattern", options.pattern);
  }
  if (options.gender) {
    args.push("--gender", options.gender);
  }
  if (options.toleranceJacket !== undefined) {
    args.push("--tolerance-jacket", options.toleranceJacket.toString());
  }
  if (options.toleranceFace !== undefined) {
    args.push("--tolerance-face", options.toleranceFace.toString());
  }
  if (options.toleranceRef !== undefined) {
    args.push("--tolerance-ref", options.toleranceRef.toString());
  }
  if (options.toleranceHourglass !== undefined) {
    args.push("--tolerance-hourglass", options.toleranceHourglass.toString());
  }

  const res = spawnSync(PYTHON_PATH, args, {
    encoding: "utf-8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 60000,
  });

  if (res.error) {
    throw new Error(`Failed to execute Set Consistency Auditor: ${res.error.message}`);
  }

  if (!res.stdout) {
    throw new Error(`Auditor returned empty stdout. Stderr: ${res.stderr}`);
  }

  try {
    const startTag = "__CONSISTENCY_AUDIT_JSON_START__";
    const endTag = "__CONSISTENCY_AUDIT_JSON_END__";
    const startIdx = res.stdout.indexOf(startTag);
    const endIdx = res.stdout.indexOf(endTag);

    if (startIdx === -1 || endIdx === -1) {
      throw new Error(`Sentinel markers not found in output: ${res.stdout}`);
    }

    const jsonStr = res.stdout.substring(startIdx + startTag.length, endIdx).trim();
    return JSON.parse(jsonStr) as ConsistencyAuditReport;
  } catch (err: any) {
    throw new Error(`Failed to parse auditor JSON: ${err.message}. Output was: ${res.stdout}`);
  }
}

/**
 * Pretty-prints a consistency audit report to console
 */
export function printConsistencyReport(report: ConsistencyAuditReport): void {
  console.log("\n==================================================================");
  console.log("🛡️ MULTI-MODAL SET CONSISTENCY AUDITOR REPORT");
  console.log("==================================================================");
  console.log(`Baseline Image:   ${report.baseline.filename}`);
  console.log(`Identity Standard:${report.baseline.identity_reference}`);
  console.log(`Total Images:     ${report.results.length}`);
  console.log(`Set Status:       ${report.all_passed ? "🟢 PASSED (100% Continuity)" : "🔴 FAILED (Continuity Drift Detected)"}`);
  console.log("------------------------------------------------------------------");

  for (const res of report.results) {
    const mark = res.passed ? "✔ PASSED" : "❌ FAILED";
    console.log(`\n  [${mark}] ${res.filename}`);
    const m = res.metrics;
    console.log(
      `     Face Sim: ${m.face_similarity.toFixed(3)} | Jacket: ${(m.jacket_ratio * 100).toFixed(1)}% | B-W Ratio: ${m.bust_to_waist_ratio.toFixed(2)} | Navel: ${m.navel_status} | Loops: ${m.belt_loops ? "Yes" : "No"} | Choker: ${m.choker ? "Yes" : "No"}`
    );
    if (!res.passed) {
      for (const r of res.reasons) {
        console.log(`     ⚠️ ${r}`);
      }
    }
  }
  console.log("==================================================================\n");
}

// CLI direct entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log("Usage: npx tsx scripts/veo-cli/auditors/setConsistencyAuditor.ts <dirPath> [--baseline <path>] [--persona-ref <path>]");
    process.exit(1);
  }

  const targetDir = args[0];
  const baselineIdx = args.indexOf("--baseline");
  const personaRefIdx = args.indexOf("--persona-ref");

  const baselinePath = baselineIdx !== -1 ? args[baselineIdx + 1] : undefined;
  const personaReferencePath = personaRefIdx !== -1 ? args[personaRefIdx + 1] : undefined;

  const report = auditSetConsistency(targetDir, {
    baselinePath,
    personaReferencePath,
  });

  printConsistencyReport(report);
  process.exit(report.all_passed ? 0 : 1);
}
