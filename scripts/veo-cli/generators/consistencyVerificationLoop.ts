/**
 * scripts/veo-cli/generators/consistencyVerificationLoop.ts
 *
 * Automated Set Consistency & Self-Healing Verification Loop.
 * Integrates `setConsistencyAuditor` into an iterative convergence loop across
 * agy, veo-cli, and gemini-image-cli.
 * 
 * Automatically audits candidate suites and synthesizes targeted corrective prompts
 * for any images that fail identity, attire, curvature, waistband, or navel integrity gates,
 * then regenerates the failing shots until 100% consistent (default: always fixes, zero flags needed).
 */

import path from "path";
import fs from "fs";
import {
  auditSetConsistency,
  printConsistencyReport,
  ConsistencyAuditReport,
  ConsistencyImageResult,
} from "../auditors/setConsistencyAuditor";
import { BroadcastDomainType } from "../types";
import { getPersonaById, PERSONAS } from "../../../src/lib/tts/personas";

export interface CorrectivePromptDirective {
  filename: string;
  poseCode: string;
  violations: string[];
  correctivePromptAdditions: string[];
}

export interface AutoHealOptions {
  dirPath: string;
  persona: string;
  baselinePath?: string;
  pattern?: string;
  maxRetries?: number;
  engine?: "agy" | "api" | "tool_json";
  aspectRatio?: "16:9" | "9:16" | "1:1";
  domain?: BroadcastDomainType;
  toleranceFace?: number;
  toleranceJacket?: number;
  toleranceHourglass?: number;
}

/**
 * Translates low-level audit violations into targeted AI prompt corrections.
 * Persona-agnostic by default, enriched with specific persona traits and measurements when available.
 */
export function compileCorrectiveDirectives(
  failedImages: ConsistencyImageResult[],
  options?: { personaSlug?: string; baselineMetrics?: any }
): CorrectivePromptDirective[] {
  const personaSlug = (options?.personaSlug || "ruby").toLowerCase();
  const persona = getPersonaById(personaSlug) || PERSONAS[0];
  const isBlaze = personaSlug.includes("blaze");

  return failedImages.map((img) => {
    const corrections: string[] = [];

    for (const reason of img.reasons) {
      // 1. Face Likeness Drift
      if (reason.includes("Face likeness drift") || reason.includes("Face not detected")) {
        corrections.push(
          `STRICT IDENTICAL FACIAL STRUCTURE to Reference 1: copy identical eyes, nose bridge, cheekbones, jawline, lips, and hairstyle of ${persona.name} exactly with zero facial drift or aging.`
        );
      }

      // 2. Outer Garment / Jacket Length Ratio
      if (reason.includes("Jacket length mismatch")) {
        corrections.push(
          "LOCKED JACKET / HEM LENGTH: The outer garment / jacket hem must terminate at the EXACT vertical torso level shown in Reference 1 (under-bust cropped length terminating at lower ribcage, NOT reaching down to the waist or hips), matching baseline proportions identically."
        );
      }

      // 3. Exposed Midriff & Navel / Bellybutton Integrity
      if (reason.includes("Missing bellybutton/navel") || reason.includes("artificially smoothed")) {
        corrections.push(
          "ANATOMICAL DETAIL (MANDATORY): Clearly visible, realistically rendered and naturally indented belly button (navel) centered vertically on the exposed abdominal midriff between the crop top hem and pants waistband. Absolutely DO NOT smooth, airbrush, or omit the navel on bare midriff skin."
        );
      }

      // 4. Hourglass & Body Curvature Silhouette (BWH / 34DD / 90-60-90)
      if (reason.includes("Hourglass curvature") || reason.includes("bust volume loss")) {
        if (isBlaze) {
          corrections.push(
            "VOLUPTUOUS FITNESS HOURGLASS FIGURE: Maintain prominent, full, voluptuous 34DD bust filling out the form-fitting top with visible cleavage above the curved neckline, sharply contrasted with a tiny, tapered 23-inch waist with athletic abdominal definition, and shapely 36-inch hips creating a true, dramatic fitness hourglass silhouette (34DD-23-36)."
          );
        } else {
          corrections.push(
            `VOLUPTUOUS HOURGLASS FIGURE CONTINUITY: Strictly preserve the full hourglass silhouette identical to Reference 1. Maintain prominent bust volume, narrow tapered waist, and shapely hips (90-60-90 proportion) defined for ${persona.name} with zero compression of feminine curves.`
          );
        }
      }

      // 5. Waistband Construction Mismatch (Seamless vs Belt Loops)
      if (reason.includes("Waistband construction mismatch")) {
        if (reason.includes("candidate has belt loops")) {
          corrections.push(
            "SEAMLESS WAISTBAND: Clean tailored high-waisted pants with a sleek seamless waistband, completely free of belt loops, NO belt loops, with smooth tailored lines matching Reference 1."
          );
        } else {
          corrections.push(
            "WAISTBAND LOOPS: Tailored waistband with defined belt loops matching Reference 1."
          );
        }
      }

      // 6. Jewelry Continuity (Choker / Necklace)
      if (reason.includes("Necklace mismatch")) {
        if (reason.includes("missing choker")) {
          corrections.push(
            "JEWELRY CONTINUITY: Delicate silver choker necklace snug around the base of her neck matching Reference 1."
          );
        } else {
          corrections.push(
            "NO NECKLACE: Clean bare neck without necklace or choker, matching Reference 1."
          );
        }
      }

      // 7. Framing / Border Clearance
      if (reason.includes("FRAMING ERROR") || reason.includes("Waist-up") || reason.includes("Hands too close")) {
        corrections.push(
          "KNEE-UP COWBOY FRAMING: Pull camera back 9-10 meters with 24mm wide lens. Show from just above the knees to top of head. Maintain at least 15% clear solid green floor below hands and thighs. Centered horizontally."
        );
      }
    }

    // Determine pose code from filename (e.g. M1, M2, M3, M4, M5)
    const match = img.filename.match(/M([1-5])/i) || img.filename.match(/P0?([1-5])/i) || img.filename.match(/0([1-5])_/);
    const poseCode = match ? `M${match[1]}` : "UNKNOWN_POSE";

    return {
      filename: img.filename,
      poseCode,
      violations: img.reasons,
      correctivePromptAdditions: corrections,
    };
  });
}

/**
 * Autonomous Self-Healing Execution Loop.
 * Automatically audits candidate image sets and iterates generation on failing shots
 * with compiled corrective directives until 100% consistent or maxRetries is reached.
 */
export async function autoHealInconsistentImageSet(options: AutoHealOptions): Promise<{
  success: boolean;
  report: ConsistencyAuditReport;
  healedFiles: string[];
  attempts: number;
}> {
  const {
    dirPath,
    persona: personaSlug,
    baselinePath: explicitBaseline,
    pattern = "*.jpg",
    maxRetries = 3,
    engine = "agy",
    aspectRatio = "16:9",
  } = options;

  const targetDir = path.resolve(process.cwd(), dirPath);
  if (!fs.existsSync(targetDir)) {
    throw new Error(`Target directory not found for self-healing: ${targetDir}`);
  }

  const personaRef = path.resolve(process.cwd(), `public/avatars/${personaSlug}.png`);
  const personaReferencePath = fs.existsSync(personaRef) ? personaRef : undefined;

  // Resolve baseline (M1 or explicit)
  let baselinePath = explicitBaseline;
  if (!baselinePath || !fs.existsSync(baselinePath)) {
    const dirFiles = fs.readdirSync(targetDir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
    const m1Candidate = dirFiles.find((f) => /01|m1|base|clasped/i.test(f)) || dirFiles[0];
    if (m1Candidate) {
      baselinePath = path.join(targetDir, m1Candidate);
    }
  }

  console.log(`\n==================================================================`);
  console.log(`🔄 LAUNCHING AUTONOMOUS SELF-HEALING CONSISTENCY LOOP`);
  console.log(`==================================================================`);
  console.log(`Directory:   ${targetDir}`);
  console.log(`Persona:     ${personaSlug} (${personaReferencePath ? path.basename(personaReferencePath) : "No external avatar ref"})`);
  console.log(`Baseline M1: ${baselinePath ? path.basename(baselinePath) : "Auto-detected"}`);
  console.log(`Engine:      ${engine.toUpperCase()}`);
  console.log(`Max Retries: ${maxRetries}`);
  console.log(`==================================================================\n`);

  let currentReport = auditSetConsistency(targetDir, {
    baselinePath,
    personaReferencePath,
    pattern,
    toleranceFace: options.toleranceFace,
    toleranceJacket: options.toleranceJacket,
    toleranceHourglass: options.toleranceHourglass,
  });

  if (currentReport.all_passed) {
    console.log("🎉 Master Image Set is already 100% consistent! No healing required.\n");
    return {
      success: true,
      report: currentReport,
      healedFiles: [],
      attempts: 0,
    };
  }

  printConsistencyReport(currentReport);

  let attempt = 1;
  const healedFiles: string[] = [];

  // Dynamic runner imports to avoid startup overhead
  const { runWithAgy } = await import("../../gemini-cli/engines/agyRunner");
  const { runWithApi } = await import("../../gemini-cli/engines/apiRunner");
  const { DOMAIN_SHOT_BLUEPRINTS } = await import("../../gemini-cli/domainSetGenerator");

  while (attempt <= maxRetries && !currentReport.all_passed) {
    const failedResults = currentReport.results.filter((r) => !r.passed);
    console.log(`\n🔄 [SELF-HEALING ATTEMPT ${attempt}/${maxRetries}]: ${failedResults.length} keyframe(s) require consistency correction.`);

    const directives = compileCorrectiveDirectives(failedResults, { personaSlug });

    for (const d of directives) {
      const targetFilePath = path.join(targetDir, d.filename);
      const baseName = path.basename(d.filename, path.extname(d.filename));

      console.log(`\n🛠️ Regenerating Inconsistent Pose [${d.poseCode}] (${d.filename})...`);
      d.correctivePromptAdditions.forEach((c) => console.log(`   + ${c}`));

      // Infer domain and shot blueprint
      let domain: BroadcastDomainType = "chroma_wall_standing";
      if (targetDir.includes("seated_broadcast_desk") || d.filename.includes("desk_sit")) {
        domain = "seated_broadcast_desk";
      } else if (targetDir.includes("standing_broadcast_desk") || d.filename.includes("desk_stand")) {
        domain = "standing_broadcast_desk";
      } else if (targetDir.includes("chroma_wall_seated_desk")) {
        domain = "chroma_wall_seated_desk";
      } else if (targetDir.includes("interview_lounge_seated_sofa")) {
        domain = "interview_lounge_seated_sofa";
      } else if (targetDir.includes("interview_lounge_standing")) {
        domain = "interview_lounge_standing";
      }

      const domainShots = DOMAIN_SHOT_BLUEPRINTS[domain] || DOMAIN_SHOT_BLUEPRINTS.chroma_wall_standing;
      const poseIdx = parseInt(d.poseCode.replace(/\D/g, "") || "2", 10) - 1;
      const shotBlueprint = domainShots[Math.min(Math.max(0, poseIdx), domainShots.length - 1)];

      const isChroma = domain === "chroma_wall_standing" || domain === "chroma_wall_seated_desk";
      const shotHeader = aspectRatio === "16:9"
        ? `A wide-angle 16:9 broadcast cowboy shot of news anchor ${personaSlug} standing against a solid flat green chroma screen:`
        : `Ultra hyper-photorealistic 8k vertical 9:16 standing broadcast shot of news anchor ${personaSlug}:`;

      const framingInstruction = aspectRatio === "16:9"
        ? `FRAMING & COMPOSITION (CRITICAL MANDATORY REQUIREMENT): Widescreen 16:9 landscape framing (1920x1080). Wide cowboy shot / American shot (plan américain). The camera is pulled 9 to 10 meters far back with a 24mm wide-angle lens, capturing the entire person from mid-shin and knees up to above head. The anchor's head, shoulders, torso, narrow waist, hips, entire thighs, kneecaps, and upper shins are ALL completely visible inside the frame. Headroom above hair is kept around 6-8%, with hips positioned near the vertical midpoint (Y=510-530px). Both knees are positioned well above the bottom border with at least 50-60 pixels of empty solid green floor visible BELOW the kneecaps. All hand and wrist gestures (clasped, raised, open, or resting beside thighs) are held safely inside the frame with at least 15-20% clearance above the bottom border and >= 25% lateral margins on left and right sides so downward arm movement never touches or exits the frame during action loops. DO NOT zoom in. DO NOT frame waist-up or chest-up. DO NOT crop out the thighs or knees. Centered horizontally with vast green space on left and right. Professional studio lighting with crystalline eye catchlights. Completely flat, solid #00FF00 chroma green backdrop wall and floor with zero shadows, zero gradients, zero furniture, zero desks, and zero props. Clean frame with no text, no captions, and no watermarks.`
        : `Camera & Framing: Full-body standing vertical 9:16 framing (1080x1920). The anchor's entire head, shoulders, chest, arms, hands, narrow waist, and hips MUST be completely framed and visible in the center of the vertical canvas against the flat green backdrop.`;

      // Assemble active reference images (Reference 1 = M1 Baseline, Reference 2 = Avatar Portrait)
      const activeReferenceImages: string[] = [];
      if (baselinePath && fs.existsSync(baselinePath)) {
        activeReferenceImages.push(baselinePath);
      }
      if (personaReferencePath && fs.existsSync(personaReferencePath) && !activeReferenceImages.includes(personaReferencePath)) {
        activeReferenceImages.push(personaReferencePath);
      }

      const prompt = `
${shotHeader}

MASTER KEYFRAME GROUND-TRUTH ANCHOR LOCK (CRITICAL):
• Reference 1 is the Master Keyframe Base (M1) for this scenario.
• Face & Likeness Continuity: Match the EXACT facial features, skin tone, eye catchlights, hairstyle, hair color, and authentic likeness of ${personaSlug} from Reference 1.
• Wardrobe Continuity: The clothing, wardrobe fabric, color, neckline, zippers, cuts, and fit MUST be 100% IDENTICAL to what ${personaSlug} is wearing in Reference 1. DO NOT change or alter the outfit.
• Background & Studio Continuity: The background MUST be 100% IDENTICAL to Reference 1 (${isChroma ? "pure solid flat #00FF00 Chroma Green infinity wall with zero furniture, zero props, zero shadows" : "broadcast studio set"}).

CRITICAL CONSISTENCY SELF-HEALING CORRECTIONS (MANDATORY):
${d.correctivePromptAdditions.map((c) => `• ${c}`).join("\n")}

POSTURE & GESTURE TRANSITION:
${shotBlueprint.postureDescription}.
Hands & Gesture: ${shotBlueprint.gestureDescription}.

FACIAL EXPRESSION & LIP-SYNC READY STATE:
${shotBlueprint.expressionDescription}. Mouth completely shut, lips tightly sealed together and motionless, still jaw, neutral motionless facial expression, ready for audio lip-sync.

${framingInstruction}
`.trim();

      const compiledPayload = {
        prompt,
        outputPath: targetFilePath,
        aspectRatio,
        baseName,
        imagePaths: activeReferenceImages,
      };

      const targetEngine = engine === "api" ? "api" : "agy";
      if (targetEngine === "agy") {
        await runWithAgy(compiledPayload);
      } else if (targetEngine === "api") {
        await runWithApi(compiledPayload);
      }

      if (!healedFiles.includes(targetFilePath)) {
        healedFiles.push(targetFilePath);
      }
    }

    // Re-audit the entire set
    console.log("\n🔍 Re-auditing image set consistency following repairs...");
    currentReport = auditSetConsistency(targetDir, {
      baselinePath,
      personaReferencePath,
      pattern,
      toleranceFace: options.toleranceFace,
      toleranceJacket: options.toleranceJacket,
      toleranceHourglass: options.toleranceHourglass,
    });

    printConsistencyReport(currentReport);

    if (currentReport.all_passed) {
      console.log(`\n🎉 SUCCESS: All keyframes healed and 100% verified after ${attempt} iteration(s)!\n`);
      break;
    }

    attempt++;
  }

  return {
    success: currentReport.all_passed,
    report: currentReport,
    healedFiles,
    attempts: attempt - 1,
  };
}

/**
 * Runs the consistency verification loop and returns actionable report.
 * Automatically performs self-healing if any violations are detected.
 */
export async function runConsistencyVerificationLoop(options: {
  dirPath: string;
  persona: string;
  baselinePath?: string;
  pattern?: string;
  toleranceFace?: number;
  toleranceJacket?: number;
  toleranceHourglass?: number;
  autoHeal?: boolean; // Defaults to true (always fix)
  engine?: "agy" | "api" | "tool_json";
  maxRetries?: number;
}): Promise<{
  report: ConsistencyAuditReport;
  allPassed: boolean;
  directives: CorrectivePromptDirective[];
  healedFiles: string[];
}> {
  const personaRef = path.resolve(process.cwd(), `public/avatars/${options.persona}.png`);
  const personaReferencePath = fs.existsSync(personaRef) ? personaRef : undefined;

  console.log(`\n🔍 Initiating Consistency Verification on: ${options.dirPath}`);
  console.log(`   Persona Standard: ${options.persona} (${personaReferencePath || "Internal First Image"})`);

  let report = auditSetConsistency(options.dirPath, {
    baselinePath: options.baselinePath,
    personaReferencePath,
    pattern: options.pattern,
    toleranceFace: options.toleranceFace,
    toleranceJacket: options.toleranceJacket,
    toleranceHourglass: options.toleranceHourglass,
  });

  printConsistencyReport(report);

  let healedFiles: string[] = [];

  // Default to always heal (autoHeal !== false)
  if (!report.all_passed && options.autoHeal !== false) {
    console.log("🛠️ Automatically initiating Self-Healing Loop on failing images...");
    const healRes = await autoHealInconsistentImageSet({
      dirPath: options.dirPath,
      persona: options.persona,
      baselinePath: options.baselinePath,
      pattern: options.pattern,
      engine: options.engine || "agy",
      maxRetries: options.maxRetries || 3,
      toleranceFace: options.toleranceFace,
      toleranceJacket: options.toleranceJacket,
      toleranceHourglass: options.toleranceHourglass,
    });
    report = healRes.report;
    healedFiles = healRes.healedFiles;
  }

  const failedImages = report.results.filter((r) => !r.passed);
  const directives = compileCorrectiveDirectives(failedImages, { personaSlug: options.persona });

  return {
    report,
    allPassed: report.all_passed,
    directives,
    healedFiles,
  };
}
