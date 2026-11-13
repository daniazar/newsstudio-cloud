/**
 * scripts/veo-cli/wizard.ts
 *
 * Comprehensive Interactive TUI Wizard for Google Veo Video Generation Studio.
 * Supports dynamic persona selection, master set discovery, 4s idle beats, 3-camera array suites,
 * pose transitions, and Markov FSM orchestration.
 */

import prompts from "prompts";
import { PERSONAS, Persona, getPersonaById } from "../../src/lib/tts/personas";
import { ACTION_POSE_STATES } from "./actionStateCatalog";
import { CAMERA_MOTION_PRESETS } from "./cameraMotionPresets";
import { runSubtleBeatGenerator } from "./generators/subtleBeatGenerator";
import { runPoseTransitionGenerator } from "./generators/poseTransitionGenerator";
import { runCameraArrayGenerator } from "./generators/cameraArrayGenerator";
import { runFSMOrchestrator } from "./generators/fsmSequenceBuilder";
import { runCinematicBrollGenerator } from "./generators/cinematicBrollGenerator";
import { runLivingStudioGenerator } from "./generators/livingStudioGenerator";
import { promptMasterSetSelection, promptSingleImageFromSet } from "./masterSetSelector";
import { VeoEngineType, VeoModelType } from "./types";
import path from "path";
import fs from "fs";

export async function runVeoInteractiveWizard() {
  console.clear();
  console.log(`
==================================================================
🎬 NEWSSTUDIO — GOOGLE VEO 3.1 ACTION BEAT & VIDEO CLI
==================================================================
Generate 4-second master idle loops, 3-camera transitions, FLF pose
shifts, and Probabilistic Markov State Machine video sequences.
`);

  // Step 1: Select Main Workflow Mode
  const modeRes = await prompts({
    type: "select",
    name: "mode",
    message: "🎬 Select Veo Video Generation Workflow Mode:",
    choices: [
      {
        title: "👥 Dual-Anchor News Desk (@Ruby & @Blaze co-anchoring, active speaker vs listener)",
        value: "dual_anchor",
      },
      {
        title: "📡 Anchor-to-Field Live Satellite Toss (Studio Anchor ➔ Outdoor Field Reporter holding mic)",
        value: "satellite_toss",
      },
      {
        title: "🛍️ E-Commerce UGC Video Ad & Product Showcase (Demonstration, unboxing, audio & SFX)",
        value: "product_showcase",
      },
      {
        title: "⚔️ 3-Way Crossfire Debate Matrix (Moderator Center + Left/Right Opposing Debaters)",
        value: "crossfire_debate",
      },
      {
        title: "🎥 Over-The-Shoulder (OTS) Cinematic Multi-Cam (Foreground shoulder bokeh & rack focus)",
        value: "ots_director",
      },
      {
        title: "🎙️ Script-Driven News Story Arc Director (TTS ➔ Multi-Beat Chaining ➔ Stitch)",
        value: "script_driven_story",
      },
      {
        title: "🔗 Recursive Chained Presenter Sequence (Multi-clip seamless 16s/24s/32s)",
        value: "chained_sequence",
      },
      {
        title: "🎥 Virtual 3-Camera Broadcast Studio Sequence (Cam 1 ➔ Cam 2 ➔ Cam 3)",
        value: "multicam_sequence",
      },
      {
        title: "🗣️ Active Delivery (8s broadcast gesticulation in front of torso, closed lips)",
        value: "active_delivery",
      },
      {
        title: "🔄 Forward Articulation (8s progressive motion, reversible / palindromic 16s cycle)",
        value: "forward_articulation",
      },
      {
        title: "👁️ Emotional Expression (8s ocular micro-expressions: warm, breaking, skeptical, empathetic)",
        value: "emotional_expression",
      },
      {
        title: "👤 Register Persona in Google Flow Characters Library",
        value: "register_flow_persona",
      },
      {
        title: "📐 Character Turnaround Reference Sheet (4-angle panoramic strip on chroma green)",
        value: "character_turnaround",
      },
      {
        title: "✂️ Slice Turnaround Sheet into 4 Master Angle Stills (Front, 45°L, 45°R, Profile)",
        value: "slice_turnaround",
      },
      {
        title: "🚀 Batch Generate ONLY Verified Compatible Beats (4s/8s Motion Suite)",
        value: "batch_compatible_suite",
      },
      {
        title: "🛡️ Pre-Flight Audit Master Image Set (Validate Cohesion, Attire, Hair & Domain)",
        value: "audit_image_set",
      },
      {
        title: "🔍 Inspect Single Master Image (Extract Posture, Props & Compatible Beats)",
        value: "inspect_image",
      },
      {
        title: "📦 4-Second Full Motion Suite (Batch Generate All Gestures Sequentially)",
        value: "batch_suite",
      },
      {
        title: "🔁 Single Gesture Idle Loop (P_A ➔ P_A) — Breathing, smile & subtle arm motion",
        value: "subtle_idle_loop",
      },
      {
        title: "🔀 Pose-to-Pose Kinematic Transition (P_A ➔ P_B) — FLF gesture trajectory",
        value: "pose_transition",
      },
      {
        title: "🎥 3-Camera Broadcast Array Video Suite (4s) — Cam 1 (0°), Cam 2 (20°), Cam 3 (35°)",
        value: "camera_array_suite",
      },
      {
        title: "🤖 Probabilistic Markov State Machine Sequence — Multi-beat script orchestrator",
        value: "fsm_orchestrator",
      },
      {
        title: "🎬 Cinematic Text-to-Video B-Roll Footage — Drone, crane, storms, trading floors",
        value: "cinematic_broll",
      },
      {
        title: "🏛️ Living Studio Plate Animator — Ambient room reflections & skyline motion",
        value: "living_studio",
      },
    ],
  });

  if (!modeRes.mode) return;

  // Step 2: Select Anchor Persona (for all persona-driven workflows)
  let selectedPersona: Persona = PERSONAS[0];
  const personaDrivenModes = [
    "dual_anchor",
    "satellite_toss",
    "product_showcase",
    "crossfire_debate",
    "ots_director",
    "script_driven_story",
    "chained_sequence",
    "multicam_sequence",
    "active_delivery",
    "forward_articulation",
    "emotional_expression",
    "register_flow_persona",
    "character_turnaround",
    "batch_compatible_suite",
    "audit_image_set",
    "inspect_image",
    "batch_suite",
    "subtle_idle_loop",
    "pose_transition",
    "camera_array_suite",
    "fsm_orchestrator",
  ];

  if (personaDrivenModes.includes(modeRes.mode)) {
    const personaRes = await prompts({
      type: "select",
      name: "personaSlug",
      message: "👤 Select Anchor Persona:",
      choices: PERSONAS.map((p) => ({
        title: `${p.name.padEnd(20)} [${p.language}/${p.gender}] — ${p.title || "Anchor"}`,
        value: p.id,
      })),
      initial: 0,
    });

    if (!personaRes.personaSlug) return;
    selectedPersona = getPersonaById(personaRes.personaSlug) || PERSONAS[0];
  }

  // Quick dispatch for register_flow_persona
  if (modeRes.mode === "register_flow_persona") {
    const { registerPersonaInFlow } = await import("./engines/flowWebRunner");
    await registerPersonaInFlow(selectedPersona.id);
    return;
  }

  // Step 3: Master Image Set Selection (for set-based workflows)
  let selectedMasterSet: { dirPath: string; files: string[]; filter?: string; label: string } | null = null;
  const setDrivenModes = [
    "active_delivery",
    "forward_articulation",
    "emotional_expression",
    "batch_compatible_suite",
    "audit_image_set",
    "inspect_image",
    "batch_suite",
    "subtle_idle_loop",
    "pose_transition",
  ];

  if (setDrivenModes.includes(modeRes.mode)) {
    selectedMasterSet = await promptMasterSetSelection(selectedPersona);
    if (!selectedMasterSet || selectedMasterSet.files.length === 0) {
      console.log("⚠️ No master image set selected. Exiting wizard.\n");
      return;
    }
  }

  // Step 4: Engine Selection
  const engineRes = await prompts({
    type: "select",
    name: "engine",
    message: "🚀 Select Execution Dispatch Engine:",
    choices: [
      {
        title: "🌐 Google Flow (flow.google.com) — 8s Veo 3.1 & Characters Automation (Recommended)",
        value: "flow_web",
      },
      {
        title: "✨ Google Gemini Advanced (gemini.google.com/app) — Automated Web Chat ($0 Extra)",
        value: "gemini_web",
      },
      {
        title: "🎬 Google Vids Video Studio (docs.google.com/videos) — Automated Document Studio ($0 Extra)",
        value: "google_vids",
      },
      {
        title: "⚡ Google GenAI API SDK (Direct @google/genai) — Developer API (Requires Cloud Billing)",
        value: "api",
      },
      {
        title: "🚀 Antigravity CLI (agy -p) — Autonomous background execution via AGY Agent",
        value: "agy",
      },
      {
        title: "📋 Tool Payload JSON (Dry-Run / Inspection) — Output exact payload for chat/tooling",
        value: "tool_json",
      },
    ],
    initial: 0,
  });

  if (!engineRes.engine) return;
  const engine: VeoEngineType = engineRes.engine;

  // Step 4.1: Flow Project Selection (if using Google Flow)
  if (engine === "flow_web") {
    const { promptSelectFlowProject } = await import("./engines/flowProjectManager");
    const selectedFlowProject = await promptSelectFlowProject();
    process.env.FLOW_PROJECT_ID = selectedFlowProject.projectId;
    process.env.FLOW_PROJECT_URL = selectedFlowProject.projectUrl;
    process.env.FLOW_PROJECT_NAME = selectedFlowProject.projectName;
    console.log(`✔ Active Google Flow Project: [${selectedFlowProject.projectName}] (${selectedFlowProject.projectUrl})\n`);
  }

  // Step 5: Model Quality & Credit Tier Selection
  let selectedModel: VeoModelType = "veo-3.1-lite";
  if (["batch_compatible_suite", "batch_suite", "subtle_idle_loop", "pose_transition", "camera_array_suite"].includes(modeRes.mode)) {
    const tierRes = await prompts({
      type: "select",
      name: "model",
      message: "🪙 Select Veo Model Tier & Credit Cost:",
      choices: [
        {
          title: "🟢 Veo 3.1 Lite — 5 Credits (Recommended: 2,000 videos/mo on Ultra Plan)",
          value: "veo-3.1-lite",
        },
        {
          title: "🟡 Veo 3.1 Fast — 10 Credits (Balanced Speed & Quality — 1,000 videos/mo)",
          value: "veo-3.1-fast",
        },
        {
          title: "🟣 Veo 3.1 Quality — 100 Credits (Final Master Broadcast 4K)",
          value: "veo-3.1-quality",
        },
      ],
      initial: 0,
    });
    if (tierRes.model) selectedModel = tierRes.model;
  }

  // ============================================================
  // WORKFLOW: BATCH COMPATIBLE SUITE (AUDIT-GATED BATCH)
  // ============================================================
  if (modeRes.mode === "batch_compatible_suite" && selectedMasterSet) {
    const { auditMasterImageSet, printSetAuditReport } = await import("./auditors/imageSetAuditor");
    const { runBatchSuiteGenerator } = await import("./generators/batchSuiteGenerator");

    console.log(`\nAuditing selected master set: [${selectedMasterSet.label}]...`);
    const report = await auditMasterImageSet(selectedMasterSet.files, selectedPersona.id);
    printSetAuditReport(report);

    if (!report.isCohesive) {
      const forceRes = await prompts({
        type: "confirm",
        name: "force",
        message: `⚠️ Cohesion score (${report.cohesionScore}%) failed. Proceed with permitted beats anyway?`,
        initial: false,
      });
      if (!forceRes.force) return;
    }

    const batchOpts = await prompts([
      {
        type: "select",
        name: "duration",
        message: "⏱️ Select Beat Duration per Clip:",
        choices: [
          { title: "4.0 Seconds (Master Loop Native Block — Breathing, Smile & Settle)", value: 4 },
          { title: "8.0 Seconds (Extended Dynamic Cycle)", value: 8 },
          { title: "2.0 Seconds (Fast Gesture Beat)", value: 2 },
        ],
        initial: 0,
      },
      {
        type: "select",
        name: "aspectRatio",
        message: "Select Aspect Ratio:",
        choices: [
          { title: "📱 9:16 Vertical Portrait (1080x1920) — Standard Anchor Feed", value: "9:16" },
          { title: "📺 16:9 Widescreen Broadcast (1920x1080) — Studio Set Wide", value: "16:9" },
        ],
        initial: 0,
      },
      {
        type: "number",
        name: "pause",
        message: "⏳ Pause / Cooldown interval between video requests (seconds):",
        initial: 10,
        min: 2,
        max: 60,
      },
      {
        type: "confirm",
        name: "dryRun",
        message: "Run in Dry-Run mode first (preview prompts without spending credits)?",
        initial: false,
      },
    ]);

    await runBatchSuiteGenerator({
      personaSlug: selectedPersona.id,
      model: selectedModel,
      durationSeconds: batchOpts.duration || 4,
      aspectRatio: batchOpts.aspectRatio || "9:16",
      engine,
      imagePath: selectedMasterSet.files[0],
      poses: report.permittedBeats,
      pauseSecBetweenRuns: batchOpts.pause || 10,
      saveToDb: true,
      dryRun: batchOpts.dryRun,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: AUDIT MASTER IMAGE SET
  // ============================================================
  if (modeRes.mode === "audit_image_set" && selectedMasterSet) {
    const { auditMasterImageSet, printSetAuditReport } = await import("./auditors/imageSetAuditor");
    const report = await auditMasterImageSet(selectedMasterSet.files, selectedPersona.id);
    printSetAuditReport(report);
    return;
  }

  // ============================================================
  // WORKFLOW: INSPECT SINGLE MASTER IMAGE
  // ============================================================
  if (modeRes.mode === "inspect_image" && selectedMasterSet) {
    const targetImage = await promptSingleImageFromSet(selectedMasterSet.files);
    if (!targetImage) return;

    const { auditSingleMasterImage } = await import("./auditors/imageSetAuditor");
    const { validateBeatCompatibility } = await import("./compatibilityMatcher");
    const audit = await auditSingleMasterImage(targetImage, selectedPersona.id);

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

    const allPoses = Object.values(ACTION_POSE_STATES);
    console.log("\n🎭 Compatible Motion Beats:");
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
    console.log("==================================================================\n");
    return;
  }

  // ============================================================
  // WORKFLOW: 4-SECOND FULL MOTION SUITE
  // ============================================================
  if (modeRes.mode === "batch_suite" && selectedMasterSet) {
    const { runBatchSuiteGenerator } = await import("./generators/batchSuiteGenerator");
    const batchRes = await prompts([
      {
        type: "select",
        name: "duration",
        message: "⏱️ Select Beat Duration per Clip:",
        choices: [
          { title: "4.0 Seconds (Master Loop Native Block — Breathing, Smile & Settle)", value: 4 },
          { title: "8.0 Seconds (Extended Dynamic Cycle)", value: 8 },
          { title: "2.0 Seconds (Fast Gesture Beat)", value: 2 },
        ],
        initial: 0,
      },
      {
        type: "number",
        name: "pause",
        message: "⏳ Pause / Cooldown interval between video requests (seconds):",
        initial: 10,
        min: 2,
        max: 60,
      },
      {
        type: "confirm",
        name: "dryRun",
        message: "Run in Dry-Run mode?",
        initial: false,
      },
    ]);

    await runBatchSuiteGenerator({
      personaSlug: selectedPersona.id,
      model: selectedModel,
      durationSeconds: batchRes.duration || 4,
      aspectRatio: "9:16",
      engine,
      imagePath: selectedMasterSet.files[0],
      pauseSecBetweenRuns: batchRes.pause || 10,
      saveToDb: true,
      dryRun: batchRes.dryRun,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: SCRIPT-DRIVEN STORY ARC DIRECTOR
  // ============================================================
  if (modeRes.mode === "script_driven_story") {
    const { runScriptDirectorGenerator } = await import("./generators/scriptDirectorGenerator");

    const directorOpts = await prompts([
      {
        type: "text",
        name: "scriptText",
        message: "📜 Enter News Script Text (or press Enter to use default broadcast script):",
        initial: "Good evening. Welcome to NewsStudio. Major economic metrics were published earlier today, revealing resilient growth in domestic technology manufacturing. Our financial analysis team has broken down the figures on the main index. We will continue tracking these developments throughout the night.",
      },
      {
        type: "confirm",
        name: "autoCutCameras",
        message: "🎥 Automatically cut cameras across narrative beats (Cam 1 ➔ Cam 2 ➔ Cam 3)?",
        initial: true,
      },
      {
        type: "select",
        name: "pipSide",
        message: "📺 Select Virtual Graphics Screen Quadrant for Infographic Reference:",
        choices: [
          { title: "Upper Right (Screen right of anchor)", value: "right" },
          { title: "Upper Left (Screen left of anchor)", value: "left" },
        ],
        initial: 0,
      },
      {
        type: "confirm",
        name: "hasDesk",
        message: "🪑 Include Broadcast News Desk & Laptop?",
        initial: false,
      },
      {
        type: "confirm",
        name: "prevectorize",
        message: "⚡ Pre-vectorize master video for instant 350+ FPS MuseTalk / KeySync lip-sync?",
        initial: true,
      },
      {
        type: "confirm",
        name: "dryRun",
        message: "Run in Dry-Run mode (preview timeline without spending credits)?",
        initial: false,
      },
    ]);

    await runScriptDirectorGenerator({
      scriptText: directorOpts.scriptText,
      personaSlug: selectedPersona.id,
      autoCutCameras: directorOpts.autoCutCameras,
      engine,
      model: selectedModel,
      aspectRatio: "9:16",
      hasDesk: directorOpts.hasDesk,
      pipSide: directorOpts.pipSide,
      prevectorize: directorOpts.prevectorize,
      dryRun: directorOpts.dryRun,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: RECURSIVE CHAINED PRESENTER SEQUENCE
  // ============================================================
  if (modeRes.mode === "chained_sequence") {
    const { runChainedSequenceGenerator, parseBeatsString } = await import("./generators/chainedSequenceGenerator");

    const chainOpts = await prompts([
      {
        type: "select",
        name: "preset",
        message: "🔗 Select Narrative Beat Architecture:",
        choices: [
          { title: "3-Beat Standard Broadcast (24s: Hook ➔ Graphic Ref ➔ Outro)", value: "hook,graphic_right,outro" },
          { title: "2-Beat Quick Rundown (16s: Active Speech ➔ Outro)", value: "active,outro" },
          { title: "4-Beat Deep Dive (32s: Hook ➔ Speech ➔ Graphic Ref ➔ Outro)", value: "hook,active,graphic_right,outro" },
          { title: "Desk-Seated 3-Beat Analysis (24s: Desk Intro ➔ Laptop Glance ➔ Outro)", value: "desk,data,outro" },
          { title: "Custom Comma-Separated Beat String", value: "custom" },
        ],
        initial: 0,
      },
    ]);

    let beatString = chainOpts.preset;
    if (chainOpts.preset === "custom") {
      const customRes = await prompts({
        type: "text",
        name: "customBeats",
        message: "Enter comma-separated beats (e.g. hook,graphic_right,data,outro):",
        initial: "hook,graphic_right,outro",
      });
      beatString = customRes.customBeats;
    }

    const execOpts = await prompts([
      {
        type: "confirm",
        name: "hasDesk",
        message: "🪑 Include Broadcast News Desk?",
        initial: beatString.includes("desk"),
      },
      {
        type: "confirm",
        name: "qc",
        message: "🔍 Run Forensic Seam Continuity Audit & DIS Optical Flow Healing?",
        initial: true,
      },
      {
        type: "confirm",
        name: "prevectorize",
        message: "⚡ Pre-vectorize master video for instant lip-sync?",
        initial: false,
      },
      {
        type: "confirm",
        name: "dryRun",
        message: "Run in Dry-Run mode?",
        initial: false,
      },
    ]);

    const parsedBeats = parseBeatsString(beatString);
    await runChainedSequenceGenerator({
      personaSlug: selectedPersona.id,
      beats: parsedBeats,
      totalDurationSeconds: parsedBeats.length * 8,
      engine,
      model: selectedModel,
      aspectRatio: "9:16",
      hasDesk: execOpts.hasDesk,
      qc: execOpts.qc,
      stitch: true,
      prevectorize: execOpts.prevectorize,
      dryRun: execOpts.dryRun,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: VIRTUAL 3-CAMERA BROADCAST STUDIO SEQUENCE
  // ============================================================
  if (modeRes.mode === "multicam_sequence") {
    const { runChainedSequenceGenerator } = await import("./generators/chainedSequenceGenerator");

    const multiOpts = await prompts([
      {
        type: "confirm",
        name: "hasDesk",
        message: "🪑 Broadcast Studio News Desk?",
        initial: true,
      },
      {
        type: "confirm",
        name: "dryRun",
        message: "Run in Dry-Run mode?",
        initial: false,
      },
    ]);

    await runChainedSequenceGenerator({
      personaSlug: selectedPersona.id,
      beats: [
        { beatType: "intro_hook", cameraAngle: "cam1", emotion: "confident_anchor" },
        { beatType: "data_explanation", cameraAngle: "cam2", emotion: "analytical_focused" },
        { beatType: "conclusion_outro", cameraAngle: "cam3", emotion: "warm_approachable" },
      ],
      totalDurationSeconds: 24,
      engine,
      model: selectedModel,
      aspectRatio: "9:16",
      hasDesk: multiOpts.hasDesk,
      stitch: true,
      qc: true,
      dryRun: multiOpts.dryRun,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: CHARACTER TURNAROUND REFERENCE SHEET
  // ============================================================
  if (modeRes.mode === "character_turnaround") {
    const { runCharacterTurnaroundGenerator } = await import("./generators/characterTurnaroundGenerator");
    const { getFlowCharacterConfig } = await import("./flowCharacterRegistry");
    const flowConfig = getFlowCharacterConfig(selectedPersona.id);

    const attirePrompt = await prompts({
      type: "text",
      name: "attire",
      message: "👔 Confirm / Customize Attire Description:",
      initial: flowConfig.defaultAttire,
    });

    const turnaroundOpts = await prompts([
      {
        type: "select",
        name: "aspectRatio",
        message: "📐 Select Turnaround Sheet Aspect Ratio:",
        choices: [
          { title: "16:9 Widescreen (Panoramic 4-in-1 Side-by-Side Strip)", value: "16:9" },
          { title: "9:16 Vertical Portrait", value: "9:16" },
        ],
        initial: 0,
      },
      {
        type: "confirm",
        name: "slice",
        message: "✂️ Automatically slice output into 4 discrete angle images (01_front, 02_angle_45_left, etc.)?",
        initial: true,
      },
      {
        type: "confirm",
        name: "dryRun",
        message: "Run in Dry-Run mode (preview prompt without executing)?",
        initial: false,
      },
    ]);

    await runCharacterTurnaroundGenerator({
      personaSlug: selectedPersona.id,
      attire: attirePrompt.attire,
      engine,
      aspectRatio: turnaroundOpts.aspectRatio,
      durationSeconds: 8,
      slice: turnaroundOpts.slice,
      dryRun: turnaroundOpts.dryRun,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: SLICE TURNAROUND SHEET INTO MASTER ANGLES
  // ============================================================
  if (modeRes.mode === "slice_turnaround") {
    const { sliceTurnaroundSheet } = await import("./processors/turnaroundSlicer");
    const { getFlowCharacterConfig } = await import("./flowCharacterRegistry");
    const cfg = getFlowCharacterConfig(selectedPersona.id);

    const slicePrompt = await prompts({
      type: "text",
      name: "mediaPath",
      message: "📁 Enter path to 4-in-1 turnaround sheet (image or video):",
      initial: cfg.chromaMasterPath || cfg.headshotPath || "",
    });

    if (!slicePrompt.mediaPath || !fs.existsSync(slicePrompt.mediaPath)) {
      console.error(`❌ File not found: ${slicePrompt.mediaPath}`);
      return;
    }

    await sliceTurnaroundSheet(slicePrompt.mediaPath, selectedPersona.id);
    return;
  }

  // ============================================================
  // WORKFLOW: MOTION MODES (IDLE, ACTIVE, FORWARD, EMOTIONAL)
  // ============================================================
  if (
    ["subtle_idle_loop", "active_delivery", "forward_articulation", "emotional_expression"].includes(modeRes.mode) &&
    selectedMasterSet
  ) {
    const targetImage = await promptSingleImageFromSet(selectedMasterSet.files);
    if (!targetImage) return;

    const { getFlowCharacterConfig } = await import("./flowCharacterRegistry");
    const flowConfig = getFlowCharacterConfig(selectedPersona.id);

    const commonPrompts: any[] = [
      {
        type: "select",
        name: "poseId",
        message: "🧘 Select Action Pose State:",
        choices: Object.values(ACTION_POSE_STATES).map((pose) => ({
          title: `${pose.label} — ${pose.description}`,
          value: pose.id,
        })),
        initial: 0,
      },
      {
        type: "text",
        name: "attire",
        message: "👔 Confirm Attire Description:",
        initial: flowConfig.defaultAttire,
      },
      {
        type: "select",
        name: "duration",
        message: "⏱️ Select Clip Duration:",
        choices: [
          { title: "8.0 Seconds (Veo 3.1 Extended Kinematic Block — Recommended)", value: 8 },
          { title: "4.0 Seconds (Master Loop Standard Block)", value: 4 },
          { title: "2.0 Seconds (Fast Cut Beat)", value: 2 },
        ],
        initial: 0,
      },
    ];

    if (modeRes.mode === "emotional_expression") {
      commonPrompts.push({
        type: "select",
        name: "emotion",
        message: "👁️ Select Ocular & Facial Micro-Expression Focus:",
        choices: [
          { title: "Warm & Approachable (Duchenne eye crinkles, friendly smile)", value: "warm_approachable" },
          { title: "Authoritative & Breaking News (Focused gaze, brow furrow, urgency)", value: "authoritative_breaking" },
          { title: "Skeptical & Investigative (Single-brow raise, discerning squint)", value: "skeptical_investigative" },
          { title: "Empathetic & Serious (Softened brow, compassionate gaze)", value: "empathetic_serious" },
          { title: "Confident Anchor (Direct assertive eye contact, elevated poise)", value: "confident_anchor" },
        ],
        initial: 0,
      });
    }

    if (modeRes.mode === "forward_articulation") {
      commonPrompts.push({
        type: "confirm",
        name: "createPalindrome",
        message: "🔄 Automatically generate 16s Palindromic (Forward + Reverse) Seamless Cycle?",
        initial: true,
      });
    }

    commonPrompts.push(
      {
        type: "select",
        name: "chroma",
        message: "🟩 Select Studio Background / Chroma Mode:",
        choices: [
          { title: "Chroma Green Screen (#00FF00 / #00B140)", value: "green" },
          { title: "Chroma Blue Screen (#0000FF)", value: "blue" },
          { title: "Integrated Broadcast News Studio Set", value: "studio" },
        ],
        initial: 0,
      },
      {
        type: "number",
        name: "variations",
        message: "🔢 Number of gesture variations to generate (1-5):",
        initial: 1,
        min: 1,
        max: 5,
      },
      {
        type: "confirm",
        name: "qc",
        message: "🔍 Run Forensic Loop Quality Gate & Auto-Heal Seam Drift?",
        initial: true,
      },
      {
        type: "confirm",
        name: "prevectorize",
        message: "⚡ Pre-vectorize clip for MuseTalk / KeySync (latents.pt, landmarks.npy)?",
        initial: false,
      },
      {
        type: "confirm",
        name: "dryRun",
        message: "Run in Dry-Run mode?",
        initial: false,
      }
    );

    const res = await prompts(commonPrompts);
    if (!res.poseId) return;
    const pose = ACTION_POSE_STATES[res.poseId];

    await runSubtleBeatGenerator({
      pose,
      personaSlug: selectedPersona.id,
      imagePath: targetImage,
      model: selectedModel,
      durationSeconds: res.duration,
      chromaMode: res.chroma,
      engine,
      attire: res.attire,
      emotion: res.emotion,
      motionMode: modeRes.mode as any,
      createPalindrome: res.createPalindrome,
      variations: res.variations || 1,
      qc: res.qc !== false,
      prevectorize: !!res.prevectorize,
      saveToDb: true,
      dryRun: res.dryRun,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: POSE-TO-POSE KINEMATIC TRANSITION (FLF)
  // ============================================================
  if (modeRes.mode === "pose_transition" && selectedMasterSet) {
    const fromImage = await promptSingleImageFromSet(selectedMasterSet.files, "🏁 Select Initial Pose Image (Frame 0):");
    const toImage = await promptSingleImageFromSet(selectedMasterSet.files, "🎯 Select Target Pose Image (End Frame):");

    const transRes = await prompts([
      {
        type: "select",
        name: "fromPoseId",
        message: "🏁 Select Initial Pose Label:",
        choices: Object.values(ACTION_POSE_STATES).map((pose) => ({
          title: `${pose.label}`,
          value: pose.id,
        })),
        initial: 0,
      },
      {
        type: "select",
        name: "toPoseId",
        message: "🎯 Select Target Pose Label:",
        choices: Object.values(ACTION_POSE_STATES).map((pose) => ({
          title: `${pose.label}`,
          value: pose.id,
        })),
        initial: 1,
      },
      {
        type: "select",
        name: "pacing",
        message: "🏃 Select Kinematic Motion Pacing:",
        choices: [
          { title: "Natural Deliberate (Standard News Delivery)", value: "natural_deliberate" },
          { title: "Dynamic Emphasis (Decisive Gestural Accent)", value: "dynamic_emphasis" },
          { title: "Subtle Recovery (Gentle Return to Neutral)", value: "subtle_recovery" },
        ],
        initial: 0,
      },
    ]);

    if (!transRes.fromPoseId || !transRes.toPoseId) return;

    await runPoseTransitionGenerator({
      fromPose: ACTION_POSE_STATES[transRes.fromPoseId],
      toPose: ACTION_POSE_STATES[transRes.toPoseId],
      personaSlug: selectedPersona.id,
      model: selectedModel,
      motionPacing: transRes.pacing,
      durationSeconds: 4,
      engine,
      saveToDb: true,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: 3-CAMERA ARRAY SUITE
  // ============================================================
  if (modeRes.mode === "camera_array_suite") {
    const camRes = await prompts({
      type: "select",
      name: "poseId",
      message: "🧘 Select Base Pose State for 3-Camera Suite:",
      choices: Object.values(ACTION_POSE_STATES).map((pose) => ({
        title: `${pose.label}`,
        value: pose.id,
      })),
      initial: 0,
    });

    if (!camRes.poseId) return;

    await runCameraArrayGenerator({
      pose: ACTION_POSE_STATES[camRes.poseId],
      personaSlug: selectedPersona.id,
      durationSeconds: 4,
      isChroma: true,
      engine,
      saveToDb: true,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: FSM MARKOV SEQUENCE ORCHESTRATOR
  // ============================================================
  if (modeRes.mode === "fsm_orchestrator") {
    const fsmRes = await prompts([
      {
        type: "number",
        name: "duration",
        message: "⏱️ Target Speech Audio Total Duration (Seconds):",
        initial: 24,
        min: 4,
        max: 300,
      },
      {
        type: "confirm",
        name: "dryRun",
        message: "Simulate Markov Sequence Plan only (Dry-Run)?",
        initial: false,
      },
    ]);

    if (!fsmRes.duration) return;

    await runFSMOrchestrator({
      totalDurationSeconds: fsmRes.duration,
      stepBeatSeconds: 4.0,
      personaSlug: selectedPersona.id,
      engine,
      dryRun: fsmRes.dryRun,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: CINEMATIC B-ROLL
  // ============================================================
  if (modeRes.mode === "cinematic_broll") {
    const brollRes = await prompts([
      {
        type: "text",
        name: "topic",
        message: "📝 Enter B-Roll Scene Topic / Description:",
        initial: "Wall Street stock exchange trading floor with rushing brokers and holographic tickers",
      },
      {
        type: "select",
        name: "cameraPresetKey",
        message: "🎥 Select Camera Cinematography Motion:",
        choices: Object.values(CAMERA_MOTION_PRESETS).map((c) => ({
          title: `${c.label} — ${c.description}`,
          value: c.id,
        })),
        initial: 0,
      },
      {
        type: "select",
        name: "duration",
        message: "⏱️ Duration (Seconds):",
        choices: [
          { title: "5 Seconds (Standard)", value: 5 },
          { title: "8 Seconds (Extended)", value: 8 },
          { title: "10 Seconds (Full Shot)", value: 10 },
        ],
        initial: 0,
      },
    ]);

    if (!brollRes.topic) return;

    await runCinematicBrollGenerator({
      topic: brollRes.topic,
      cameraPresetKey: brollRes.cameraPresetKey,
      durationSeconds: brollRes.duration,
      engine,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: LIVING STUDIO PLATE
  // ============================================================
  if (modeRes.mode === "living_studio") {
    const studioRes = await prompts([
      {
        type: "text",
        name: "studioName",
        message: "🏛️ Studio Set Name:",
        initial: "modern_twilight_desk",
      },
      {
        type: "select",
        name: "cameraPresetKey",
        message: "🎥 Select Ambient Camera Movement:",
        choices: Object.values(CAMERA_MOTION_PRESETS).map((c) => ({
          title: `${c.label}`,
          value: c.id,
        })),
        initial: 0,
      },
    ]);

    if (!studioRes.studioName) return;

    await runLivingStudioGenerator({
      studioName: studioRes.studioName,
      cameraPresetKey: studioRes.cameraPresetKey,
      durationSeconds: 5,
      engine,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: DUAL-ANCHOR BROADCAST NEWSROOM DESK
  // ============================================================
  if (modeRes.mode === "dual_anchor") {
    const dualRes = await prompts([
      {
        type: "select",
        name: "coPersonaSlug",
        message: "👥 Select Co-Anchor (Screen Right):",
        choices: PERSONAS.filter((p) => p.id !== selectedPersona.id).map((p) => ({
          title: `${p.name.padEnd(20)} [${p.language}] — ${p.title || "Anchor"}`,
          value: p.id,
        })),
        initial: 0,
      },
      {
        type: "select",
        name: "speakerRole",
        message: "🗣️ Speaker vs. Active Listener Pattern:",
        choices: [
          { title: "Alternating (Beat 1: Left Anchor speaks, Beat 2: Right Anchor speaks)", value: "alternating" },
          { title: "Left Anchor leads speech (Right Anchor active listening micro-nods)", value: "left" },
          { title: "Right Anchor leads speech (Left Anchor active listening micro-nods)", value: "right" },
          { title: "Both Co-Anchors actively communicating simultaneously", value: "both" },
        ],
        initial: 0,
      },
      {
        type: "select",
        name: "beatsCount",
        message: "⏱️ Sequence Length:",
        choices: [
          { title: "2 Beats (~16 Seconds) — 1 Turn Each", value: 2 },
          { title: "3 Beats (~24 Seconds) — Lead-in + Counter-Point + Wrap-up", value: 3 },
          { title: "1 Beat (8 Seconds) — Single Broadcast Clip", value: 1 },
        ],
        initial: 0,
      },
      {
        type: "text",
        name: "envImage",
        message: "🖼️ Optional Environment Set Plate / Desk Image Path (leave empty for studio default):",
      },
      {
        type: "confirm",
        name: "dryRun",
        message: "Preview prompts in Dry-Run mode without spending credits?",
        initial: false,
      },
    ]);

    if (!dualRes.coPersonaSlug) return;

    const { runDualAnchorGenerator } = await import("./generators/dualAnchorGenerator");
    await runDualAnchorGenerator({
      personaSlug: selectedPersona.id,
      coPersonaSlug: dualRes.coPersonaSlug,
      speakerRole: dualRes.speakerRole,
      beatsCount: dualRes.beatsCount,
      envImage: dualRes.envImage ? path.resolve(process.cwd(), dualRes.envImage) : undefined,
      engine,
      model: selectedModel,
      aspectRatio: "16:9",
      dryRun: dualRes.dryRun,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: ANCHOR-TO-FIELD LIVE SATELLITE TOSS
  // ============================================================
  if (modeRes.mode === "satellite_toss") {
    const tossRes = await prompts([
      {
        type: "select",
        name: "fieldPersonaSlug",
        message: "📡 Select Outdoor Live Field Reporter:",
        choices: PERSONAS.filter((p) => p.id !== selectedPersona.id).map((p) => ({
          title: `${p.name.padEnd(20)} [${p.language}] — ${p.title || "Reporter"}`,
          value: p.id,
        })),
        initial: 0,
      },
      {
        type: "select",
        name: "locationType",
        message: "📍 Outdoor Live Location Environment:",
        choices: [
          { title: "🏙️ Financial District Street (Bustling traffic, glass skyscrapers bokeh)", value: "financial_street" },
          { title: "🌧️ Outdoor Breaking Storm (Wind, rain droplets, weather atmosphere)", value: "outdoor_storm" },
          { title: "🏛️ Capitol Government Lawn (Press briefing lawn, classical columns)", value: "capitol_building" },
          { title: "🚨 Breaking News Incident Scene (Subtle emergency flashers in distant bokeh)", value: "breaking_scene" },
        ],
        initial: 0,
      },
      {
        type: "confirm",
        name: "umbrella",
        message: "Should field reporter hold an umbrella against rain?",
        initial: false,
      },
      {
        type: "text",
        name: "envImage",
        message: "🖼️ Optional Studio Desk Environment Plate (for studio toss phase):",
      },
      {
        type: "confirm",
        name: "dryRun",
        message: "Preview prompts in Dry-Run mode without spending credits?",
        initial: false,
      },
    ]);

    if (!tossRes.fieldPersonaSlug) return;

    const { runSatelliteTossGenerator } = await import("./generators/satelliteTossGenerator");
    await runSatelliteTossGenerator({
      studioPersonaSlug: selectedPersona.id,
      fieldPersonaSlug: tossRes.fieldPersonaSlug,
      locationType: tossRes.locationType,
      holdingMic: true,
      hasUmbrella: tossRes.umbrella,
      envImage: tossRes.envImage ? path.resolve(process.cwd(), tossRes.envImage) : undefined,
      engine,
      model: selectedModel,
      aspectRatio: "16:9",
      dryRun: tossRes.dryRun,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: E-COMMERCE UGC VIDEO AD & PRODUCT SHOWCASE
  // ============================================================
  if (modeRes.mode === "product_showcase") {
    const prodRes = await prompts([
      {
        type: "text",
        name: "productImage",
        message: "📸 Path to Product Reference Photo (e.g. public/logo.png or product image):",
        initial: "public/logo.png",
      },
      {
        type: "text",
        name: "productName",
        message: "🏷️ Product Name / Brand Title:",
        initial: "Signature Product",
      },
      {
        type: "select",
        name: "productAction",
        message: "🎬 Persona Interaction with Product:",
        choices: [
          { title: "🤖 Auto-Detect from Name / Typology (Flooring, Paint, SaaS, or Gadget)", value: undefined },
          { title: "🤲 Hold and Present (Two-handed chest-level showcase, label facing lens)", value: "hold_and_present" },
          { title: "🪵 Room Walkthrough & Floor Showcase (Flooring, tiles, rugs installed in styled interior)", value: "room_walkthrough" },
          { title: "💧 Durability & Torture Test (Water beading, scratch-proof surface demo)", value: "torture_test" },
          { title: "🎨 Paint / Finish Application (Smooth coat with roller on accent wall in work apron)", value: "paint_application" },
          { title: "📐 Material Swatch Presentation (Holding sample plank, tile swatch, or fan deck)", value: "swatch_presentation" },
          { title: "📱 Digital / SaaS Dashboard Demo (Holding tablet/phone, tapping UI features)", value: "tablet_demo" },
          { title: "🌐 Futuristic Holographic HUD (Interacting with floating charts & metrics)", value: "holographic_data" },
          { title: "🗣️ SaaS / Platform Pitch (Dynamic investor/customer explanation with gestures)", value: "saas_pitch_explainer" },
          { title: "🛋️ Furniture & Living Space (Sitting on sofa, testing comfort & upholstery)", value: "furniture_interaction" },
          { title: "🛠️ Certified Service Expert (Professional with clipboard explaining service/warranty)", value: "service_expert" },
          { title: "📦 Luxury Unboxing (Lifting out of luxury packaging on broadcast desk)", value: "unbox" },
          { title: "✨ Feature Demonstration (Interacting with controls / finish)", value: "demo" },
          { title: "🧴 Application / Sampling (Gentle dispensing / testing on hand)", value: "apply" },
          { title: "👗 Wear and Showcase (Displaying fashion, watch, or wearable tech)", value: "wear" },
          { title: "👉 Side-by-Side Desk Endorsement (Pointing to product on desk)", value: "side_by_side" },
        ],
        initial: 0,
      },
      {
        type: "confirm",
        name: "withAudio",
        message: "🔊 Generate Commercial Voiceover Audio (Modern-TTS) with Music & SFX?",
        initial: true,
      },
      {
        type: "select",
        name: "aspectRatio",
        message: "Select Video Format:",
        choices: [
          { title: "📱 9:16 Vertical Portrait (TikTok / Reels / Shorts UGC)", value: "9:16" },
          { title: "📺 16:9 Broadcast Landscape (Web / TV / YouTube Ad)", value: "16:9" },
          { title: "⏹️ 1:1 Square (Feed Post / Catalog Showcase)", value: "1:1" },
        ],
        initial: 0,
      },
      {
        type: "confirm",
        name: "dryRun",
        message: "Preview prompts and generate Ad Manifest in Dry-Run mode?",
        initial: false,
      },
    ]);

    if (!prodRes.productName) return;

    const { runProductPresenterGenerator } = await import("./generators/productPresenterGenerator");
    await runProductPresenterGenerator({
      personaSlug: selectedPersona.id,
      productName: prodRes.productName,
      productImage: prodRes.productImage ? path.resolve(process.cwd(), prodRes.productImage) : undefined,
      productAction: prodRes.productAction,
      withAudio: prodRes.withAudio,
      aspectRatio: prodRes.aspectRatio,
      engine,
      model: selectedModel,
      dryRun: prodRes.dryRun,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: 3-WAY CROSSFIRE DEBATE MATRIX
  // ============================================================
  if (modeRes.mode === "crossfire_debate") {
    const debateRes = await prompts([
      {
        type: "select",
        name: "leftDebater",
        message: "🥊 Select Screen-Left Debater:",
        choices: PERSONAS.filter((p) => p.id !== selectedPersona.id).map((p) => ({
          title: `${p.name} [${p.language}]`,
          value: p.id,
        })),
        initial: 0,
      },
      {
        type: "select",
        name: "rightDebater",
        message: "🥊 Select Screen-Right Debater:",
        choices: PERSONAS.filter((p) => p.id !== selectedPersona.id).map((p) => ({
          title: `${p.name} [${p.language}]`,
          value: p.id,
        })),
        initial: 1,
      },
      {
        type: "select",
        name: "activeSpeaker",
        message: "🗣️ Active Primary Speaker:",
        choices: [
          { title: "Moderator Center (Posing key question)", value: "moderator" },
          { title: "Left Debater (Advancing passionate argument)", value: "debater_left" },
          { title: "Right Debater (Delivering energetic rebuttal)", value: "debater_right" },
        ],
        initial: 0,
      },
      {
        type: "confirm",
        name: "dryRun",
        message: "Preview prompt in Dry-Run mode without spending credits?",
        initial: false,
      },
    ]);

    if (!debateRes.leftDebater) return;

    const { runCrossfireDebateGenerator } = await import("./generators/debateMatrixGenerator");
    await runCrossfireDebateGenerator({
      moderatorSlug: selectedPersona.id,
      debaterLeftSlug: debateRes.leftDebater,
      debaterRightSlug: debateRes.rightDebater,
      activeSpeaker: debateRes.activeSpeaker,
      engine,
      model: selectedModel,
      aspectRatio: "16:9",
      dryRun: debateRes.dryRun,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: OVER-THE-SHOULDER (OTS) CINEMATIC MULTI-CAM
  // ============================================================
  if (modeRes.mode === "ots_director") {
    const otsRes = await prompts([
      {
        type: "select",
        name: "coPersonaSlug",
        message: "🎥 Select Speaker across desk (Sharp Mid-Ground):",
        choices: PERSONAS.filter((p) => p.id !== selectedPersona.id).map((p) => ({
          title: `${p.name} [${p.language}]`,
          value: p.id,
        })),
        initial: 0,
      },
      {
        type: "select",
        name: "angle",
        message: "📐 Camera Angle & Focus Strategy:",
        choices: [
          { title: "OTS Left (Foreground Left Shoulder Bokeh ➔ Sharp Right Co-Host)", value: "ots_left" },
          { title: "OTS Right (Foreground Right Shoulder Bokeh ➔ Sharp Left Co-Host)", value: "ots_right" },
          { title: "Alternating Rack Focus (Smooth focus rack across desk mid-shot)", value: "alternating_rack" },
        ],
        initial: 0,
      },
      {
        type: "confirm",
        name: "dryRun",
        message: "Preview prompt in Dry-Run mode without spending credits?",
        initial: false,
      },
    ]);

    if (!otsRes.coPersonaSlug) return;

    const { runOtsDirectorGenerator } = await import("./generators/debateMatrixGenerator");
    await runOtsDirectorGenerator({
      personaSlug: selectedPersona.id,
      coPersonaSlug: otsRes.coPersonaSlug,
      angle: otsRes.angle,
      engine,
      model: selectedModel,
      aspectRatio: "16:9",
      dryRun: otsRes.dryRun,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: SCRIPT-DRIVEN NEWS STORY ARC DIRECTOR
  // ============================================================
  if (modeRes.mode === "script_driven_story") {
    const scriptRes = await prompts([
      {
        type: "text",
        name: "scriptText",
        message: "📝 Enter News Script Text (or leave blank for default news bulletin):",
        initial: "Good evening. Welcome to NewsStudio. Major economic indicators were published today, revealing resilient growth in domestic technology manufacturing. Our financial analysis team has broken down the figures on the main index.",
      },
      {
        type: "confirm",
        name: "autoCutCameras",
        message: "🎥 Enable Automatic Multi-Camera Switching across narrative beats (Cam 1 ➔ Cam 2 ➔ Cam 3)?",
        initial: true,
      },
      {
        type: "select",
        name: "pipSide",
        message: "📊 Virtual Graphic Screen (PIP) Side:",
        choices: [
          { title: "Screen Right (Standard)", value: "right" },
          { title: "Screen Left", value: "left" },
        ],
        initial: 0,
      },
      {
        type: "confirm",
        name: "hasDesk",
        message: "Seated behind Broadcast News Desk with laptop?",
        initial: true,
      },
      {
        type: "confirm",
        name: "dryRun",
        message: "Simulate story arc director in Dry-Run mode?",
        initial: false,
      },
    ]);

    const { runScriptDirectorGenerator } = await import("./generators/scriptDirectorGenerator");
    await runScriptDirectorGenerator({
      scriptText: scriptRes.scriptText,
      personaSlug: selectedPersona.id,
      autoCutCameras: scriptRes.autoCutCameras,
      pipSide: scriptRes.pipSide,
      hasDesk: scriptRes.hasDesk,
      engine,
      model: selectedModel,
      aspectRatio: "16:9",
      dryRun: scriptRes.dryRun,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: RECURSIVE CHAINED PRESENTER SEQUENCE
  // ============================================================
  if (modeRes.mode === "chained_sequence") {
    const chainRes = await prompts([
      {
        type: "select",
        name: "duration",
        message: "⏱️ Total Chained Sequence Duration:",
        choices: [
          { title: "16 Seconds (2 Recursive Beats)", value: 16 },
          { title: "24 Seconds (3 Recursive Beats: Hook ➔ Explanation ➔ Outro)", value: 24 },
          { title: "32 Seconds (4 Recursive Beats: Hook ➔ Data ➔ Graphic ➔ Outro)", value: 32 },
        ],
        initial: 1,
      },
      {
        type: "confirm",
        name: "hasDesk",
        message: "Seated behind Broadcast News Desk?",
        initial: true,
      },
      {
        type: "confirm",
        name: "dryRun",
        message: "Run in Dry-Run mode (generate chained prompts and test stitching)?",
        initial: false,
      },
    ]);

    const { runChainedSequenceGenerator } = await import("./generators/chainedSequenceGenerator");
    await runChainedSequenceGenerator({
      personaSlug: selectedPersona.id,
      totalDurationSeconds: chainRes.duration || 24,
      hasDesk: chainRes.hasDesk,
      engine,
      model: selectedModel,
      aspectRatio: "16:9",
      dryRun: chainRes.dryRun,
    });
    return;
  }

  // ============================================================
  // WORKFLOW: VIRTUAL 3-CAMERA BROADCAST SEQUENCE
  // ============================================================
  if (modeRes.mode === "multicam_sequence") {
    const { runChainedSequenceGenerator } = await import("./generators/chainedSequenceGenerator");
    await runChainedSequenceGenerator({
      personaSlug: selectedPersona.id,
      beats: [
        { beatType: "intro_hook", cameraAngle: "cam1", emotion: "confident_anchor" },
        { beatType: "data_explanation", cameraAngle: "cam2", emotion: "analytical_focused" },
        { beatType: "conclusion_outro", cameraAngle: "cam3", emotion: "warm_approachable" },
      ],
      totalDurationSeconds: 24,
      engine,
      model: selectedModel,
      aspectRatio: "16:9",
      hasDesk: true,
      qc: true,
      stitch: true,
      dryRun: false,
    });
    return;
  }
}
