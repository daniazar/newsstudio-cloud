#!/usr/bin/env tsx
/**
 * scripts/veo-cli.ts
 *
 * UNIFIED MASTER CLI for Google Veo 3.1 & Flow Action Beat Video Generation Studio.
 *
 * Capabilities:
 *   • Completely Autonomous Chrome CDP Auto-Launching (Port 9222)
 *   • Full-Mesh 37-Clip Action Matrix Generation for ANY Master Image Set (--mode=action_matrix)
 *   • Forensic Video Quality & Persona Continuity Gate (SSIM >= 0.75)
 *   • Autonomous Sub-Second Precision Trimming for Peak End-Pose SSIM
 *   • Automated Prisma SQLite Database Registration (PersonaMasterImage & PersonaActionLoop)
 *   • Dual-Anchor, Field Reporter, Product Showcase, E-Commerce UGC Video Ads & Multi-Cam Suites
 *
 * Usage:
 *   npx tsx scripts/veo-cli.ts
 *   npm run veo:cli
 *   npm run veo:video
 *   npx tsx scripts/veo-cli.ts --mode=action_matrix --persona=ruby --attire=burgundy_velvet_corset --dry-run
 *   npx tsx scripts/veo-cli.ts --mode=action_matrix --input-dir=public/avatars/master_ruby_archive/domain_chroma_wall_standing_burgundy_velvet_corset
 */

import fs from "fs";
import path from "path";
// @ts-expect-error - minimist untyped import
import minimist from "minimist";
import { runVeoInteractiveWizard } from "./veo-cli/wizard";
import { runSubtleBeatGenerator } from "./veo-cli/generators/subtleBeatGenerator";
import { runPoseTransitionGenerator } from "./veo-cli/generators/poseTransitionGenerator";
import { runCameraArrayGenerator } from "./veo-cli/generators/cameraArrayGenerator";
import { runFSMOrchestrator } from "./veo-cli/generators/fsmSequenceBuilder";
import { runCinematicBrollGenerator } from "./veo-cli/generators/cinematicBrollGenerator";
import { runLivingStudioGenerator } from "./veo-cli/generators/livingStudioGenerator";
import { runAutonomousActionMatrix } from "./veo-cli/generators/actionMatrixGenerator";
import { ensureChromeDebugRunning } from "./veo-cli/engines/chromeBootstrapper";
import { ACTION_POSE_STATES } from "./veo-cli/actionStateCatalog";
import { VeoEngineType, VeoAspectRatio, VeoDurationSeconds } from "./veo-cli/types";
import { initJobLogging, cliLogger } from "./common/cliTelemetry";

export async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: [
      "mode", "persona", "personas", "co-persona", "pose", "to-pose", "cam", "engine", "model", "tier",
      "topic", "studio", "attire", "emotion", "ratio", "variations", "pause", "image",
      "prompt", "prompt-file", "ref-images",
      "dir", "set-dir", "input-dir", "filter", "match", "set", "output-dir",
      "beats", "script", "text", "pip-side", "total-duration", "chroma",
      "env-image", "product-image", "product-name", "product-action", "product-category",
      "bgm", "sfx", "talking-mode", "location", "moderator", "debater-left", "debater-right", "speaker-role",
      "project", "flow-project", "flow-project-id", "flow-project-url",
      "m1", "m2", "m3", "m4", "m5", "limit", "start", "tasks", "target", "wardrobe", "body-mode"
    ],
    boolean: [
      "dry-run", "non-interactive", "help", "palindrome", "reverse", "qc",
      "pre-vectorize", "slice-turnaround", "auto-cut-cameras", "stitch", "desk",
      "with-audio", "holding-mic", "umbrella", "rack-focus", "fuse",
      "list-projects", "select-project", "refresh-projects", "open-flow", "sync-settings", "show-costs",
      "auto-trim", "register-db", "all", "skip-audit", "force"
    ],
    default: {
      persona: "ruby",
      engine: "flow_web",
      model: "veo-3.1-lite",
      duration: 8,
      qc: true,
      stitch: true,
      "slice-turnaround": true,
      "holding-mic": true,
      "auto-trim": true,
      "register-db": true,
      "flow-project": "https://flow.google.com/project/065b7352-6e4f-4aa9-b420-eab8beeebcdd",
    },
  });

  const jobIdentifier = argv.job || argv["job-id"] || argv.name || argv["output-name"] || `veo_${Date.now()}`;
  initJobLogging(String(jobIdentifier), "veo");
  cliLogger.info(`Veo CLI Session initialized: mode=${argv.mode || "interactive"}, engine=${argv.engine || "flow_web"}, model=${argv.model || "veo-3.1-lite"}`);

  if (argv.help) {
    console.log(`
🎬 NEWSSTUDIO — UNIFIED GOOGLE VEO 3.1 & FLOW VIDEO CLI

Usage:
  npx tsx scripts/veo-cli.ts [options]
  npm run veo:cli
  npm run veo:video

Primary Autonomous Workflow Modes (--mode):
  action_matrix          Generate complete 37-clip Full-Mesh Action Matrix for ANY master image set
                         (10 boundary loops, 20 transitions, 5 dynamic motions, 2 hair adjustments)
  dual_anchor            Dual-Anchor News Desk (@Ruby & @Blaze co-anchoring, speaker vs active listener)
  satellite_toss         Anchor-to-Field Live Toss (Studio Anchor -> Outdoor Field Reporter holding mic)
  product_showcase       E-Commerce UGC Video Ad & Product Demo (Holding, unboxing, demo, audio & SFX)
  ledger                 Display video generation observability, hardware telemetry & cost breakdown
  crossfire_debate       3-Way Crossfire Debate Matrix (Moderator Center + Left/Right Debaters)
  ots_director           Over-The-Shoulder (OTS) Cinematic Multi-Cam (Shallow bokeh & rack focus)
  chained_sequence       Generate recursive chained presenter video (16s, 24s, 32s, 64s)
  script_driven_story    End-to-end news script director (TTS -> Multi-Beat Chaining -> Stitch)
  multicam_sequence      3-Camera broadcast sequence switching across Cam 1, 2, and 3
  subtle_idle_loop       Generate 8s subtle idle beat loop (breathing, micro-sway)
  active_delivery        Generate 8s high-energy conversational gestures in front of torso
  forward_articulation   Generate 8s progressive forward gestures (reversible / palindromic)
  emotional_expression   Generate 8s ocular & facial micro-expressions (eyes, brow, gaze)
  character_turnaround   Generate 4-angle character turnaround reference sheet on chroma green
  slice_turnaround       Slice 4-in-1 turnaround sheet into 4 master camera angle stills
  register_flow_persona  Register persona & upload assets to Google Flow Characters library
  pose_transition        Generate First-Last Frame kinematic transition (P_A -> P_B)
  batch_suite            Generate all motion beats sequentially in batch
  batch_compatible_suite Audit set and batch generate ONLY compatible beats & transitions
  audit_image_set        Audit entire Master Image Set for Cohesion & Scenario Domain
  inspect_image          Inspect single image geometry, props, and list compatible beats
  camera_array_suite     Generate 3-Camera broadcast array video suite (Cam 1, 2, 3)
  fsm_orchestrator       Simulate and sequence Markov State Machine for speech script
  cinematic_broll        Generate 1080p Text-to-Video B-roll footage
  living_studio          Generate ambient living studio room video loop (I2V)

Action Matrix (--mode=action_matrix) Autonomous Flags:
  --input-dir=<path>     Directory containing 5 master images (M1..M5)
  --persona=<slug>       Persona slug (e.g. "ruby", "blaze", "camila", "diego")
  --attire=<slug>        Attire slug (e.g. "burgundy_velvet_corset", "navy_suit")
  --m1..m5=<path>        Explicit path overrides for master poses M1 through M5
  --output-dir=<path>    Output directory (default: public/assets/action_loops/veo/<persona>_<attire>)
  --target=<type>        Filter tasks: "all", "loops", "transitions", "dynamic", "hair"
  --limit=<N>            Limit batch count (default: 4, or all if --all specified)
  --start=<N>            Start index in matrix task queue (0-indexed)
  --all                  Run entire 37-task queue in a single batch
  --auto-trim            Profile last 24 frames & precision-trim settling drift (default: true)
  --register-db          Auto-register master images & loops into Prisma SQLite DB (default: true)
  --dry-run              Preview image discovery, prompts, and planned tasks without spending credits

Google Flow Project & Browser Flags:
  --flow-project=<url>   Google Flow project URL / ID / Name (default: News Studio)
  --list-projects        List all registered Google Flow projects from cache/browser
  --select-project       Interactively select active Google Flow project and optionally save to .env
  --refresh-projects     Force live browser scrape of Google Flow projects
  --sync-settings        Calibrate Google Flow settings (Confirm: Never, 720p, 8s, 16:9, Model)
  --open-flow            Launch/focus Google Flow in a dedicated interactive new Chrome window
  --show-costs           Display full Google Flow credit breakdown and Ultra subscriber rates
  --flow-model=<model>   Target video model: "veo-3.1-lite" (5 cr), "veo-3.1-fast" (10 cr), "veo-3.1-quality" (100 cr)

General Flags:
  --qc / --no-qc         Run forensic loop quality gate (SSIM >= 0.75) & duplicate check (default: true)
  --pre-vectorize        Pre-vectorize clip for MuseTalk / KeySync (latents.pt, landmarks.npy)
  --desk                 Enable broadcast desk & laptop/tablet continuity
  --attire=<desc>        Wardrobe / attire description (e.g. "tailored emerald-green blazer")
  --duration=<sec>       Clip duration in seconds (8, 4, 2)
  --engine=<type>        Execution engine: 'flow_web', 'gemini_web', 'api', 'agy' (default: flow_web)
  --dry-run              Simulate compilation and state transitions without API spend
  --non-interactive      Run directly with flags without opening the TUI wizard
    `);
    return;
  }

  // Handle --list-projects
  if (argv["list-projects"]) {
    const { scrapeFlowProjectsFromBrowser, getCachedFlowProjects } = await import("./veo-cli/engines/flowProjectManager");
    const projects = argv["refresh-projects"]
      ? await scrapeFlowProjectsFromBrowser()
      : getCachedFlowProjects();

    console.log("\n==================================================================");
    console.log("📁 REGISTERED GOOGLE FLOW PROJECTS");
    console.log("==================================================================");
    projects.forEach((p, idx) => {
      console.log(`  ${idx + 1}. ${p.isDefault ? "🌟 " : "📁 "}[${p.id}] ${p.name}${p.isDefault ? " (Default / Current .env)" : ""}`);
      console.log(`     🔗 ${p.url}`);
    });
    console.log("==================================================================\n");
    return;
  }

  // Handle --show-costs
  if (argv["show-costs"] || argv.credits) {
    console.log(`
==================================================================
💰 GOOGLE FLOW (VEO 3.1 & OMNI 1.1) CREDIT PRICING & ECONOMICS
==================================================================
Model               Resolution   4s     6s     8s     10s    Ultra Cost
------------------------------------------------------------------
Omni 1.1 Flash      720p         7 cr   10 cr  12 cr  15 cr  12 cr / 8s
Omni 1.1 Flash      360p         4 cr   5 cr   6 cr   7 cr   6 cr / 8s
Veo 3.1 - Lite      720p         5 cr*  5 cr*  5 cr*  N/A    5 cr flat
Veo 3.1 - Fast      720p         10 cr* 10 cr* 10 cr* N/A    10 cr flat (Standard)
Veo 3.1 - Quality   720p         100 cr 100 cr 100 cr N/A    100 cr flat (Hero Master)
------------------------------------------------------------------
* Note: Veo Lite and Fast costs shown are for Ultra subscribers.
✨ 1080p Upscaling: FREE (0 credits) for Ultra members!
✨ Daily Free Allowance: 50 credits/day (resets every 24 hours).
==================================================================
    `);
    return;
  }

  // Handle --sync-settings
  if (argv["sync-settings"]) {
    await ensureChromeDebugRunning();
    const { syncFlowProjectEnvironment } = await import("./veo-cli/engines/flowWebRunner");
    await syncFlowProjectEnvironment({
      flowModel: argv["flow-model"],
      confirmPolicy: argv["flow-confirm"],
      projectId: argv["flow-project"],
    });
    return;
  }

  // Handle --open-flow
  if (argv["open-flow"]) {
    await ensureChromeDebugRunning();
    const { bringChromeWindowToForeground } = await import("./veo-cli/engines/flowWebRunner");
    bringChromeWindowToForeground();
    console.log("✔ Google Flow is open in a dedicated interactive new Chrome window!\n");
    return;
  }

  // Handle --select-project
  if (argv["select-project"]) {
    await ensureChromeDebugRunning();
    const { promptSelectFlowProject } = await import("./veo-cli/engines/flowProjectManager");
    const selected = await promptSelectFlowProject();
    process.env.FLOW_PROJECT_ID = selected.projectId;
    process.env.FLOW_PROJECT_URL = selected.projectUrl;
    process.env.FLOW_PROJECT_NAME = selected.projectName;
    console.log(`✔ Switched to Google Flow Project: [${selected.projectName}] (${selected.projectUrl})\n`);
  }

  // If specific project passed via flag, resolve and apply
  if (argv["flow-project"] || argv.project) {
    const { resolveFlowProjectConfig } = await import("./veo-cli/engines/flowWebRunner");
    const resolved = resolveFlowProjectConfig({ projectUrl: argv["flow-project"] || argv.project });
    process.env.FLOW_PROJECT_ID = resolved.projectId;
    process.env.FLOW_PROJECT_URL = resolved.projectUrl;
    process.env.FLOW_PROJECT_NAME = resolved.projectName;
  }

  // Handle audit_consistency mode
  if (argv.mode === "audit_consistency" || argv.mode === "audit-consistency" || argv["audit-set"]) {
    const { auditSetConsistency, printConsistencyReport } = await import("./veo-cli/auditors/setConsistencyAuditor");
    const targetDir = argv.dir || argv["input-dir"] || argv["set-dir"] || argv._[0];
    if (!targetDir) {
      console.error("❌ Error: Must specify directory via --dir=<path>");
      process.exit(1);
    }
    const report = auditSetConsistency(targetDir, {
      baselinePath: argv.baseline || argv.m1,
      personaReferencePath: argv["persona-ref"] || argv["persona-reference"] || (argv.persona ? `public/avatars/${argv.persona}.png` : undefined),
      pattern: argv.pattern,
      toleranceJacket: argv["tolerance-jacket"] ? Number(argv["tolerance-jacket"]) : undefined,
      toleranceFace: argv["tolerance-face"] ? Number(argv["tolerance-face"]) : undefined,
      toleranceHourglass: argv["tolerance-hourglass"] ? Number(argv["tolerance-hourglass"]) : undefined,
    });
    printConsistencyReport(report);

    if (!report.all_passed && !argv["no-heal"]) {
      console.log("\n🛠️ Consistency violations detected. Running Autonomous Self-Healing Loop to repair images...");
      const { autoHealInconsistentImageSet } = await import("./veo-cli/generators/consistencyVerificationLoop");
      const healResult = await autoHealInconsistentImageSet({
        dirPath: targetDir,
        persona: argv.persona || "ruby",
        baselinePath: argv.baseline || argv.m1,
        pattern: argv.pattern,
        engine: (argv["image-engine"] || (argv.engine === "api" ? "api" : "agy")) as any,
        maxRetries: argv.retries ? Number(argv.retries) : 3,
        toleranceFace: argv["tolerance-face"] ? Number(argv["tolerance-face"]) : undefined,
        toleranceJacket: argv["tolerance-jacket"] ? Number(argv["tolerance-jacket"]) : undefined,
        toleranceHourglass: argv["tolerance-hourglass"] ? Number(argv["tolerance-hourglass"]) : undefined,
      });
      process.exit(healResult.success ? 0 : 1);
    }

    process.exit(report.all_passed ? 0 : 1);
  }

  // Handle ledger / cost_report mode
  if (argv.mode === "ledger" || argv.mode === "cost_report" || argv.mode === "costs") {
    const { execSync } = await import("child_process");
    const forwardedArgs = process.argv.slice(2).filter((a) => !a.startsWith("--mode=")).join(" ");
    execSync(`npx tsx scripts/cost-cli.ts ${forwardedArgs}`, { stdio: "inherit" });
    process.exit(0);
  }

  const mode = argv.mode || "subtle_idle_loop";
  const engine: VeoEngineType = (argv.engine as VeoEngineType) || "flow_web";
  const modelTier = argv.model || argv.tier || "veo-3.1-lite";
  const rawDuration = Number(argv.duration) || (engine === "flow_web" ? 8 : 4);
  const duration: VeoDurationSeconds = (rawDuration === 2 || rawDuration === 4 || rawDuration === 8) ? rawDuration : 8;
  const isDryRun = !!argv["dry-run"];
  const pose = ACTION_POSE_STATES[argv.pose || "P01_NEUTRAL_CLASPED"] || ACTION_POSE_STATES.P01_NEUTRAL_CLASPED;
  const aspectRatio: VeoAspectRatio = (argv.ratio || argv["aspect-ratio"] || "9:16") as VeoAspectRatio;
  const variations = Number(argv.variations) || 1;
  const qc = argv.qc !== false;
  const prevectorize = !!argv["pre-vectorize"];

  // Autonomous Chrome check for any Flow Web or Action Matrix operations
  const requiresFlowChrome = engine === "flow_web" || mode.includes("matrix") || mode === "action_matrix";
  if (requiresFlowChrome && !isDryRun) {
    await ensureChromeDebugRunning();
  }

  // Resolve target personas (single slug or comma-separated list)
  let rawPersonas = argv.personas || argv.persona;
  if (
    argv["no-persona"] ||
    rawPersonas === false ||
    rawPersonas === "none" ||
    (Array.isArray(rawPersonas) && (rawPersonas.includes("none") || rawPersonas.includes(false)))
  ) {
    rawPersonas = "none";
  } else if (!rawPersonas) {
    rawPersonas = "ruby";
  }
  const personaList = String(rawPersonas)
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);

  // Helper: Execute selected mode for a single persona
  async function executeForPersona(targetPersona: string) {
    if (mode === "action_matrix" || mode === "matrix" || mode === "full_mesh_matrix") {
      await runAutonomousActionMatrix({
        persona: targetPersona,
        attire: argv.attire,
        inputDir: argv["input-dir"] || argv["set-dir"] || argv.dir,
        outputDir: argv["output-dir"],
        m1: argv.m1,
        m2: argv.m2,
        m3: argv.m3,
        m4: argv.m4,
        m5: argv.m5,
        limit: argv.limit ? Number(argv.limit) : undefined,
        start: argv.start ? Number(argv.start) : undefined,
        tasks: argv.tasks ? String(argv.tasks).split(",").map((s) => s.trim()) : undefined,
        target: argv.target,
        autoTrim: argv["auto-trim"] !== false,
        registerDb: argv["register-db"] !== false,
        dryRun: isDryRun,
        all: !!argv.all,
        skipAudit: !!argv["skip-audit"],
        force: !!argv.force,
      });
      return;
    } else if (mode === "slice_turnaround") {
      const { sliceTurnaroundSheet } = await import("./veo-cli/processors/turnaroundSlicer");
      let mediaPath = argv.image;
      if (!mediaPath) {
        const { getFlowCharacterConfig } = await import("./veo-cli/flowCharacterRegistry");
        const cfg = getFlowCharacterConfig(targetPersona);
        mediaPath = cfg.chromaMasterPath || cfg.headshotPath;
      }
      if (!mediaPath || !fs.existsSync(mediaPath)) {
        console.error(`❌ Turnaround media not found for [${targetPersona}]. Please pass --image=<path>`);
        return;
      }
      await sliceTurnaroundSheet(mediaPath, targetPersona);
      return;
    } else if (mode === "audit_image_set") {
      const { auditMasterImageSet, printSetAuditReport } = await import("./veo-cli/auditors/imageSetAuditor");
      const rawDir = argv.dir || argv["set-dir"] || argv["input-dir"] || "public/avatars/master_ruby_archive/chroma_master_poses";
      const setDir = path.resolve(process.cwd(), rawDir);
      const filterPattern = argv.filter || argv.match || argv.set;
      let files = fs.readdirSync(setDir).filter((f) => f.endsWith(".jpg") || f.endsWith(".png")).map((f) => path.join(setDir, f));
      if (filterPattern) {
        const regex = new RegExp(filterPattern);
        files = files.filter((f) => regex.test(path.basename(f)));
      }
      const report = await auditMasterImageSet(files, targetPersona);
      printSetAuditReport(report);
      return;
    } else if (mode === "inspect_image") {
      const { auditSingleMasterImage } = await import("./veo-cli/auditors/imageSetAuditor");
      const { validateBeatCompatibility } = await import("./veo-cli/compatibilityMatcher");
      const targetImage = argv.image || path.resolve(process.cwd(), "public/avatars/master_ruby_archive/chroma_master_poses/ruby_08a_cobalt_sweetheart_default_clasped.jpg");
      const audit = await auditSingleMasterImage(targetImage, targetPersona);

      console.log("\n==================================================================");
      console.log(`🔍 IMAGE PRE-FLIGHT INSPECTION: [${audit.filename}]`);
      console.log("==================================================================");
      console.log(`Persona:         ${audit.personaSlug}`);
      console.log(`Domain:          ${audit.domain}`);
      console.log(`Environment:     ${audit.environmentGroup}`);
      console.log(`Posture:         ${audit.posture}`);
      console.log(`Has Desk:        ${audit.hasDesk ? "Yes (Desk Present)" : "No (Pure Chroma/Standing)"}`);
      console.log(`Attire:          ${audit.attireDescription} (${audit.attireColorHex})`);
      console.log(`Dimensions:      ${audit.dimensions.width}x${audit.dimensions.height} (${audit.aspectRatio})`);
      console.log("------------------------------------------------------------------");

      console.log("\n🎭 Compatible Motion Beats:");
      const allPoses = Object.values(ACTION_POSE_STATES);
      let compatCount = 0;
      allPoses.forEach((p) => {
        const check = validateBeatCompatibility(audit, p, allPoses);
        if (check.permitted) {
          compatCount++;
          console.log(`  ✔ [${p.poseCode.padEnd(8)}] ${p.label}`);
        }
      });

      console.log("\n🚫 Incompatible / Filtered Out Beats:");
      allPoses.forEach((p) => {
        const check = validateBeatCompatibility(audit, p, allPoses);
        if (!check.permitted) {
          console.log(`  ❌ [${p.poseCode.padEnd(8)}] ${check.reason}`);
        }
      });
      console.log(`\nTotal Compatible Beats: ${compatCount}/${allPoses.length}`);
      console.log("==================================================================\n");
      return;
    } else if (mode === "batch_compatible_suite") {
      const { auditMasterImageSet, printSetAuditReport } = await import("./veo-cli/auditors/imageSetAuditor");
      const { runBatchSuiteGenerator } = await import("./veo-cli/generators/batchSuiteGenerator");
      const rawDir = argv.dir || argv["set-dir"] || argv["input-dir"] || "public/avatars/master_ruby_archive/chroma_master_poses";
      const setDir = path.resolve(process.cwd(), rawDir);
      const filterPattern = argv.filter || argv.match || argv.set;
      let files = fs.readdirSync(setDir).filter((f) => f.endsWith(".jpg") || f.endsWith(".png")).map((f) => path.join(setDir, f));
      if (filterPattern) {
        const regex = new RegExp(filterPattern);
        files = files.filter((f) => regex.test(path.basename(f)));
      }
      const report = await auditMasterImageSet(files, targetPersona);
      printSetAuditReport(report);

      if (!report.isCohesive) {
        console.error(`❌ Batch generation cancelled: Set cohesion score (${report.cohesionScore}%) failed safety gate.`);
        return;
      }

      const targetImage = argv.image || (files.length > 0 ? files[0] : undefined);

      await runBatchSuiteGenerator({
        personaSlug: targetPersona,
        model: modelTier,
        durationSeconds: duration,
        aspectRatio,
        engine,
        imagePath: targetImage,
        imageFiles: files,
        poses: report.permittedBeats,
        pauseSecBetweenRuns: Number(argv.pause) || 10,
        saveToDb: true,
        dryRun: isDryRun,
      });
      return;
    } else if (mode === "batch_suite" || mode === "batch" || mode === "all_poses") {
      const { runBatchSuiteGenerator } = await import("./veo-cli/generators/batchSuiteGenerator");
      const requestedPoses = argv.poses
        ? (argv.poses as string).split(",").map((p) => ACTION_POSE_STATES[p.trim()]).filter(Boolean)
        : undefined;

      await runBatchSuiteGenerator({
        personaSlug: targetPersona,
        model: modelTier,
        durationSeconds: duration,
        aspectRatio,
        engine,
        poses: requestedPoses,
        pauseSecBetweenRuns: Number(argv.pause) || 10,
        saveToDb: true,
        dryRun: isDryRun,
      });
    } else if (mode === "dual_anchor" || mode === "co_anchor" || mode === "dual") {
      const { runDualAnchorGenerator } = await import("./veo-cli/generators/dualAnchorGenerator");
      await runDualAnchorGenerator({
        personaSlug: targetPersona,
        coPersonaSlug: argv["co-persona"] || "blaze",
        speakerRole: argv["speaker-role"] || "alternating",
        totalDurationSeconds: Number(argv["total-duration"]) || Number(argv.duration) * 2 || 16,
        envImage: argv["env-image"] ? path.resolve(process.cwd(), argv["env-image"]) : undefined,
        engine,
        model: modelTier,
        aspectRatio,
        chromaMode: argv.chroma,
        qc: argv.qc !== false,
        stitch: argv.stitch !== false,
        dryRun: isDryRun,
      });
      return;
    } else if (mode === "satellite_toss" || mode === "field_toss" || mode === "satellite") {
      const { runSatelliteTossGenerator } = await import("./veo-cli/generators/satelliteTossGenerator");
      await runSatelliteTossGenerator({
        studioPersonaSlug: targetPersona,
        fieldPersonaSlug: argv["co-persona"] || "camila",
        locationType: argv.location || "financial_street",
        holdingMic: argv["holding-mic"] !== false,
        hasUmbrella: !!argv.umbrella,
        envImage: argv["env-image"] ? path.resolve(process.cwd(), argv["env-image"]) : undefined,
        engine,
        model: modelTier,
        aspectRatio,
        chromaMode: argv.chroma,
        qc: argv.qc !== false,
        stitch: argv.stitch !== false,
        dryRun: isDryRun,
      });
      return;
    } else if (mode === "product_showcase" || mode === "product_ad" || mode === "ugc_ad" || mode === "product") {
      const { runProductPresenterGenerator } = await import("./veo-cli/generators/productPresenterGenerator");
      await runProductPresenterGenerator({
        personaSlug: targetPersona,
        productName: argv["product-name"],
        productImage: argv["product-image"],
        productCategory: argv["product-category"],
        productAction: argv["product-action"],
        fuseBeats: !!argv.fuse,
        stitch: argv.stitch !== false,
        scriptText: argv.text,
        scriptFilePath: argv.script ? path.resolve(process.cwd(), argv.script) : undefined,
        withAudio: !!argv["with-audio"],
        bgmGenre: argv.bgm,
        sfxCue: argv.sfx,
        envImage: argv["env-image"] ? path.resolve(process.cwd(), argv["env-image"]) : undefined,
        talkingMode: argv["talking-mode"],
        engine,
        model: modelTier,
        aspectRatio,
        chromaMode: argv.chroma,
        durationSeconds: duration,
        dryRun: isDryRun,
      });
      return;
    } else if (mode === "crossfire_debate" || mode === "debate") {
      const { runCrossfireDebateGenerator } = await import("./veo-cli/generators/debateMatrixGenerator");
      await runCrossfireDebateGenerator({
        moderatorSlug: argv.moderator || targetPersona,
        debaterLeftSlug: argv["debater-left"] || argv["co-persona"] || "blaze",
        debaterRightSlug: argv["debater-right"] || "marcus",
        activeSpeaker: argv["active-speaker"] || "moderator",
        envImage: argv["env-image"] ? path.resolve(process.cwd(), argv["env-image"]) : undefined,
        engine,
        model: modelTier,
        aspectRatio,
        dryRun: isDryRun,
      });
      return;
    } else if (mode === "ots_director" || mode === "ots") {
      const { runOtsDirectorGenerator } = await import("./veo-cli/generators/debateMatrixGenerator");
      await runOtsDirectorGenerator({
        personaSlug: targetPersona,
        coPersonaSlug: argv["co-persona"] || "blaze",
        angle: argv.angle || "ots_left",
        depthOfField: argv["rack-focus"] ? undefined : "shallow_f1.8",
        envImage: argv["env-image"] ? path.resolve(process.cwd(), argv["env-image"]) : undefined,
        engine,
        model: modelTier,
        aspectRatio,
        chromaMode: argv.chroma,
        dryRun: isDryRun,
      });
      return;
    } else if (mode === "chained_sequence" || mode === "chained") {
      const { runChainedSequenceGenerator, parseBeatsString } = await import("./veo-cli/generators/chainedSequenceGenerator");
      const parsedBeats = argv.beats ? parseBeatsString(String(argv.beats)) : undefined;
      await runChainedSequenceGenerator({
        personaSlug: targetPersona,
        beats: parsedBeats,
        totalDurationSeconds: Number(argv["total-duration"]) || duration * (parsedBeats ? parsedBeats.length : 3),
        engine,
        model: modelTier,
        aspectRatio,
        chromaMode: argv.chroma,
        attire: argv.attire,
        hasDesk: !!argv.desk,
        qc: argv.qc !== false,
        stitch: argv.stitch !== false,
        prevectorize: !!argv["pre-vectorize"],
        dryRun: isDryRun,
      });
      return;
    } else if (mode === "script_driven_story" || mode === "script_director" || mode === "director") {
      const { runScriptDirectorGenerator } = await import("./veo-cli/generators/scriptDirectorGenerator");
      await runScriptDirectorGenerator({
        scriptText: argv.text,
        scriptFilePath: argv.script ? path.resolve(process.cwd(), argv.script) : undefined,
        personaSlug: targetPersona,
        autoCutCameras: !!argv["auto-cut-cameras"],
        engine,
        model: modelTier,
        aspectRatio,
        chromaMode: argv.chroma,
        hasDesk: !!argv.desk,
        pipSide: argv["pip-side"] === "left" ? "left" : "right",
        qc: argv.qc !== false,
        prevectorize: !!argv["pre-vectorize"],
        dryRun: isDryRun,
      });
      return;
    } else if (mode === "multicam_sequence" || mode === "multicam") {
      const { runChainedSequenceGenerator } = await import("./veo-cli/generators/chainedSequenceGenerator");
      await runChainedSequenceGenerator({
        personaSlug: targetPersona,
        beats: [
          { beatType: "intro_hook", cameraAngle: "cam1", emotion: "confident_anchor" },
          { beatType: "data_explanation", cameraAngle: "cam2", emotion: "analytical_focused" },
          { beatType: "conclusion_outro", cameraAngle: "cam3", emotion: "warm_approachable" },
        ],
        totalDurationSeconds: 24,
        engine,
        model: modelTier,
        aspectRatio,
        chromaMode: argv.chroma,
        attire: argv.attire,
        hasDesk: !!argv.desk,
        qc: argv.qc !== false,
        stitch: argv.stitch !== false,
        prevectorize: !!argv["pre-vectorize"],
        dryRun: isDryRun,
      });
      return;
    } else if (mode === "register_flow_persona" || mode === "register_persona") {
      const { registerPersonaInFlow } = await import("./veo-cli/engines/flowWebRunner");
      await registerPersonaInFlow(targetPersona, {
        headless: isDryRun,
        projectUrl: argv["flow-project-url"] || argv["flow-project"] || argv.project,
        projectId: argv["flow-project-id"],
        wardrobe: argv.wardrobe || argv.attire,
        bodyMode: argv["body-mode"] as any,
      });
      return;
    } else if (mode === "character_turnaround" || mode === "turnaround") {
      const { runCharacterTurnaroundGenerator } = await import("./veo-cli/generators/characterTurnaroundGenerator");
      await runCharacterTurnaroundGenerator({
        personaSlug: targetPersona,
        attire: argv.attire,
        engine,
        aspectRatio,
        durationSeconds: duration,
        slice: argv["slice-turnaround"] !== false,
        dryRun: isDryRun,
      });
      return;
    } else if (mode === "active_delivery" || mode === "forward_articulation" || mode === "emotional_expression") {
      await runSubtleBeatGenerator({
        pose,
        personaSlug: targetPersona,
        model: modelTier,
        durationSeconds: duration,
        aspectRatio,
        engine,
        attire: argv.attire,
        emotion: argv.emotion,
        chromaMode: (argv.chroma as any) || "green",
        motionMode: mode as "active_delivery" | "forward_articulation" | "emotional_expression",
        createPalindrome: !!(argv.palindrome || argv.reverse),
        variations,
        qc,
        prevectorize,
        imagePath: argv.image ? path.resolve(process.cwd(), argv.image) : undefined,
        saveToDb: true,
        dryRun: isDryRun,
      });
    } else if (mode === "subtle_idle_loop" || mode === "subtle_idle") {
      await runSubtleBeatGenerator({
        pose,
        personaSlug: targetPersona,
        model: modelTier,
        durationSeconds: duration,
        aspectRatio,
        engine,
        attire: argv.attire,
        emotion: argv.emotion,
        chromaMode: (argv.chroma as any) || "green",
        motionMode: "subtle_idle",
        createPalindrome: !!(argv.palindrome || argv.reverse),
        variations,
        qc,
        prevectorize,
        imagePath: argv.image ? path.resolve(process.cwd(), argv.image) : undefined,
        saveToDb: true,
        dryRun: isDryRun,
      });
    } else if (mode === "cyclic_physical_loop") {
      const { runCyclicLoopGenerator } = await import("./veo-cli/generators/cyclicLoopGenerator");
      await runCyclicLoopGenerator({
        pose,
        personaSlug: targetPersona,
        model: modelTier,
        durationSeconds: duration,
        aspectRatio,
        engine,
        imagePath: argv.image ? path.resolve(process.cwd(), argv.image) : undefined,
        outputDir: argv["output-dir"] ? path.resolve(process.cwd(), argv["output-dir"]) : undefined,
        dryRun: isDryRun,
      });
    } else if (mode === "pose_transition") {
      const toPose = ACTION_POSE_STATES[argv["to-pose"] || "P02_RAISED_EXPLANATORY"] || ACTION_POSE_STATES.P02_RAISED_EXPLANATORY;
      await runPoseTransitionGenerator({
        fromPose: pose,
        toPose: toPose || ACTION_POSE_STATES.P02_RAISED_EXPLANATORY,
        personaSlug: targetPersona,
        model: modelTier,
        durationSeconds: duration,
        aspectRatio,
        engine,
        saveToDb: true,
        dryRun: isDryRun,
      });
    } else if (mode === "camera_array_suite") {
      await runCameraArrayGenerator({
        pose,
        personaSlug: targetPersona,
        durationSeconds: duration,
        engine,
        saveToDb: true,
        dryRun: isDryRun,
      });
    } else if (mode === "fsm_orchestrator") {
      await runFSMOrchestrator({
        totalDurationSeconds: duration * 10 || 20,
        stepBeatSeconds: 2.0,
        personaSlug: targetPersona,
        engine,
        dryRun: isDryRun,
      });
    } else if (mode === "cinematic_broll" || mode === "ecommerce_hero" || mode === "hero_scene") {
      const refImagesRaw = argv["ref-images"] || argv["product-images"];
      let refPaths: string[] | undefined = undefined;
      if (refImagesRaw) {
        const splitList = typeof refImagesRaw === "string" ? refImagesRaw.split(",") : Array.isArray(refImagesRaw) ? refImagesRaw : [refImagesRaw];
        refPaths = splitList
          .map((p: string) => path.resolve(process.cwd(), String(p).trim()))
          .filter((p: string) => fs.existsSync(p));
      }

      let resolvedPrompt: string | undefined = undefined;
      const promptFileCandidate = argv["prompt-file"] || (argv.prompt && fs.existsSync(argv.prompt) ? argv.prompt : undefined);
      if (promptFileCandidate && fs.existsSync(promptFileCandidate)) {
        try {
          resolvedPrompt = fs.readFileSync(path.resolve(process.cwd(), promptFileCandidate), "utf8").trim();
        } catch {}
      }
      if (!resolvedPrompt) {
        resolvedPrompt = argv.prompt || argv.text;
      }

      await runCinematicBrollGenerator({
        topic: argv.topic || "Wall Street stock exchange trading floor with rushing brokers",
        prompt: resolvedPrompt,
        cameraPresetKey: argv.cam || argv["camera-preset"],
        aspectRatio: argv.ratio || argv.aspect || "9:16",
        durationSeconds: (rawDuration === 4 || rawDuration === 5 || rawDuration === 8 || rawDuration === 10) ? rawDuration : 8,
        engine,
        model: argv.model || "veo-3.1-lite",
        imagePath: argv.image ? path.resolve(process.cwd(), argv.image) : (refPaths && refPaths.length > 0 ? refPaths[0] : undefined),
        referenceImagePaths: refPaths,
        personaSlug: (targetPersona && targetPersona !== "none" && targetPersona !== "false") ? targetPersona : undefined,
        characterTag: argv.character ? `@${argv.character.replace(/^@/, "")}` : (targetPersona && targetPersona !== "none" && targetPersona !== "false" ? `@${targetPersona}` : undefined),
        attire: argv.attire,
        outputDir: argv["output-dir"] ? path.resolve(process.cwd(), argv["output-dir"]) : undefined,
        baseName: argv.name || argv["output-name"] || argv["base-name"],
        dryRun: isDryRun,
      });

    } else if (mode === "living_studio") {
      await runLivingStudioGenerator({
        studioName: argv.studio || "modern_twilight_desk",
        durationSeconds: (rawDuration === 5 || rawDuration === 8) ? rawDuration : 4,
        engine,
        dryRun: isDryRun,
      });
    } else {
      console.error(`❌ Unknown mode: ${mode}. Use --help to view available modes.`);
    }
  }

  // Cross-Persona Batch Loop
  if (personaList.length > 1) {
    console.log("\n==================================================================");
    console.log(`🚀 CROSS-PERSONA MATRIX BATCH: [${personaList.join(", ")}]`);
    console.log(`==================================================================`);
    for (let i = 0; i < personaList.length; i++) {
      const currentPersona = personaList[i];
      console.log(`\n▶️ [${i + 1}/${personaList.length}] EXECUTING FOR PERSONA: [${currentPersona.toUpperCase()}]`);
      await executeForPersona(currentPersona);
      if (i < personaList.length - 1 && !isDryRun) {
        const pauseSec = Number(argv.pause) || 10;
        console.log(`⏳ Cooldown pause (${pauseSec}s) before next persona...`);
        await new Promise((r) => setTimeout(r, pauseSec * 1000));
      }
    }
    console.log(`\n🎉 Cross-Persona Matrix Batch Completed for [${personaList.join(", ")}]!`);
  } else {
    await executeForPersona(personaList[0] || "ruby");
  }
}

// Execute CLI when invoked directly or via `npx tsx scripts/veo-cli`
const isInvokedAsCli =
  process.argv[1]?.endsWith("veo-cli.ts") ||
  process.argv[1]?.endsWith("veo-cli");

if (isInvokedAsCli) {
  main()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Veo CLI Error:", err);
      process.exit(1);
    });
}
