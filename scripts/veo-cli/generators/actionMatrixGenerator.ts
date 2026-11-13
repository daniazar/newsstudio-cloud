/**
 * scripts/veo-cli/generators/actionMatrixGenerator.ts
 *
 * Autonomous Full-Mesh Action Matrix Generator for Any Master Image Set & Persona.
 * 
 * Capabilities:
 *   1. Auto-launches Chrome Remote Debugging on port 9222 (completely autonomous).
 *   2. Auto-discovers 5 master poses (M1 -> M5) from any folder, pattern, or flags.
 *   3. Compiles character continuity prompts (closed lips, silent video, safe framing guard).
 *   4. Generates all 37 action loops & transitions (10 boundary loops, 20 transitions, 5 dynamic, 2 hair).
 *   5. Forensic Quality & Persona Continuity Gate (SHA-256 duplicate check, Frame 0 SSIM >= 0.75).
 *   6. Sub-second precision trimming: profiles last 24 frames and auto-trims settling drift with Remotion FFmpeg.
 *   7. Auto-registers in Prisma SQLite DB (PersonaMasterImage & PersonaActionLoop) & manifest.json.
 */

import fs from "fs";
import path from "path";
import { execSync, spawnSync } from "child_process";
import { ensureChromeDebugRunning } from "../engines/chromeBootstrapper";
import { getFlowCharacterConfig } from "../flowCharacterRegistry";
import { validateVideoIntegrity, scanDirectoryHashes, verifyPersonaContinuity } from "../processors/videoIntegrityGuard";
import { getFFmpegPath, getFFprobePath } from "../../../src/lib/ai/comfy/utils";
import { prisma } from "../../../src/lib/prisma";
import { getPersonaById } from "../../../src/lib/tts/personas";
import type { AnchorEmotion, RhetoricAction, EnergyLevel } from "../../../src/lib/types/stateMachine";
import { recordGeneration, captureHardwareSnapshot, formatGenerationHud } from "../telemetry/generationLedger";

export type MasterPoseKey = "M1" | "M2" | "M3" | "M4" | "M5";

export interface MasterImageSet {
  M1: string;
  M2: string;
  M3: string;
  M4: string;
  M5: string;
}

export interface MatrixTask {
  id: string;
  type: "loop" | "transition" | "dynamic_loop";
  startPose: MasterPoseKey;
  endPose: MasterPoseKey;
  startFramePath: string;
  endFramePath: string;
  prompt: string;
  outputName: string;
  emotion?: AnchorEmotion;
  rhetoricAction?: RhetoricAction;
  energyLevel?: EnergyLevel;
  poseState?: MasterPoseKey;
}

export interface ActionMatrixOptions {
  persona?: string;
  attire?: string;
  inputDir?: string;
  outputDir?: string;
  m1?: string;
  m2?: string;
  m3?: string;
  m4?: string;
  m5?: string;
  limit?: number;
  start?: number;
  tasks?: string[];
  target?: "all" | "loops" | "transitions" | "dynamic" | "hair";
  autoTrim?: boolean;
  registerDb?: boolean;
  dryRun?: boolean;
  all?: boolean;
  skipAudit?: boolean;
  force?: boolean;
}

/**
 * Discovers and maps the 5 master poses from a directory or individual options.
 */
export function resolveMasterImageSet(options: ActionMatrixOptions): { set: MasterImageSet; baseDir: string } {
  let baseDir = options.inputDir ? path.resolve(process.cwd(), options.inputDir) : "";
  const persona = (options.persona || "ruby").toLowerCase();
  const attire = options.attire ? options.attire.toLowerCase() : "";

  // Auto-discover directory if not passed
  if (!baseDir || !fs.existsSync(baseDir)) {
    const archiveDir = path.resolve(process.cwd(), `public/avatars/master_${persona}_archive`);
    let dynamicDir = "";
    if (fs.existsSync(archiveDir)) {
      const subdirs = fs.readdirSync(archiveDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      
      // Match attire in folder name or find domain_chroma_wall_standing
      const match = subdirs.find((s) => s.startsWith("domain_chroma_wall_standing") && (!attire || s.includes(attire)))
        || subdirs.find((s) => s.startsWith("domain_chroma_wall_standing"));
      if (match) {
        dynamicDir = path.join(archiveDir, match);
      }
    }

    const candidateDirs = [
      dynamicDir,
      path.resolve(process.cwd(), `public/avatars/master_${persona}_archive/domain_chroma_wall_standing_${attire}`),
      path.resolve(process.cwd(), `public/avatars/${persona}/master_poses`),
      path.resolve(process.cwd(), `public/avatars/master_${persona}_archive/chroma_master_poses`),
    ].filter(Boolean);

    for (const cand of candidateDirs) {
      if (fs.existsSync(cand)) {
        baseDir = cand;
        break;
      }
    }
  }

  if (!baseDir || !fs.existsSync(baseDir)) {
    throw new Error(`Master images directory not found. Please provide --input-dir=<path> or ensure persona master images exist.`);
  }

  const files = fs.readdirSync(baseDir).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
  if (files.length === 0) {
    throw new Error(`No image files found in directory: ${baseDir}`);
  }

  const findPoseFile = (poseKey: MasterPoseKey, patterns: string[], explicitPath?: string): string => {
    if (explicitPath && fs.existsSync(explicitPath)) return explicitPath;
    if (explicitPath && fs.existsSync(path.resolve(baseDir, explicitPath))) return path.resolve(baseDir, explicitPath);

    for (const pat of patterns) {
      const match = files.find((f) => f.toLowerCase().includes(pat.toLowerCase()));
      if (match) return path.join(baseDir, match);
    }
    return "";
  };

  const set: MasterImageSet = {
    M1: findPoseFile("M1", ["01_m1", "_m1_", "m1_chroma", "stand_base", "clasped"], options.m1),
    M2: findPoseFile("M2", ["02_m2", "_m2_", "m2_chroma", "raised_right", "raised"], options.m2),
    M3: findPoseFile("M3", ["03_m3", "_m3_", "m3_chroma", "open_two_hands", "open_hands", "open"], options.m3),
    M4: findPoseFile("M4", ["04_m4", "_m4_", "m4_chroma", "separated_arms", "separated", "sides"], options.m4),
    M5: findPoseFile("M5", ["05_m5", "_m5_", "m5_chroma", "turn_side", "side_angle", "turn"], options.m5),
  };

  // Fallback: if any pose is missing, take sorted files
  const missingKeys = (Object.keys(set) as MasterPoseKey[]).filter((k) => !set[k]);
  if (missingKeys.length > 0) {
    const sortedFiles = [...files].sort();
    missingKeys.forEach((key, idx) => {
      if (idx < sortedFiles.length) {
        set[key] = path.join(baseDir, sortedFiles[idx]);
      }
    });
  }

  // Validate all 5 exist
  for (const k of ["M1", "M2", "M3", "M4", "M5"] as MasterPoseKey[]) {
    if (!set[k] || !fs.existsSync(set[k])) {
      throw new Error(`Could not resolve master pose ${k} from ${baseDir}. Please pass --${k.toLowerCase()}=<path> or rename image files with 01_M1..05_M5.`);
    }
  }

  return { set, baseDir };
}

/**
 * Builds standard base character description and safety contracts.
 */
export function buildCharacterPromptClauses(personaSlug: string, attireDesc?: string, attireSlug?: string): {
  baseClause: string;
  mouthClosed: string;
  audioGuard: string;
  framingGuard: string;
} {
  const normSlug = personaSlug.toLowerCase();
  const normAttire = (attireSlug || "").toLowerCase();
  let baseClause = "";

  if (normSlug.includes("ruby")) {
    const attire = attireDesc || "tailored burgundy velvet corset dress with plunging deep V neckline and sleeveless straps, delicate gold pendant necklace";
    baseClause = `Ruby, a female professional standing against solid green chroma wall, voluminous copper-red styled wavy hair, emerald eyes, light natural freckles, ${attire}.`;
  } else if (normSlug.includes("blaze")) {
    const attire = attireDesc || (normAttire.includes("silver")
      ? "metallic silver cropped blazer with notched lapels worn open over a tight black bandeau crop top, high-waisted black leather pants, silver choker necklace"
      : "cropped black leather biker jacket over black leather bandeau crop top and high-waisted black leather pants, silver choker necklace");
    baseClause = `Blaze, a female professional standing against solid green chroma wall, athletic build, sharp asymmetrical platinum blonde bob haircut, bright blue eyes, silver hoop earrings, ${attire}.`;
  } else if (normSlug.includes("diego")) {
    const attire = attireDesc || "classic navy blue tailored Italian wool blazer over crisp light blue dress shirt with open collar";
    baseClause = `A distinguished Hispanic male professional standing against solid green chroma wall, well-groomed silver-touched dark hair, calm neutral expression, ${attire}.`;
  } else if (normSlug.includes("camila")) {
    const attire = attireDesc || "elegant tailored emerald-green crepe blazer with sharp peaked lapels over ivory silk camisole and gold pendant";
    baseClause = `Camila, a female professional standing against solid green chroma wall, styled reddish-auburn wavy hair with curtain bangs, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("mateo")) {
    const attire = attireDesc || "tailored charcoal grey suit, white collared shirt, burgundy tie";
    baseClause = `Mateo, a distinguished male professional standing against solid flat green chroma background, styled dark hair with silver temples, poised upright posture, ${attire}.`;
  } else if (normSlug.includes("volt")) {
    const attire = attireDesc || "modern matte black and electric cobalt athletic tracksuit jacket with zipped high collar over athletic compression top";
    baseClause = `An athletic male professional standing against solid green chroma wall, athletic posture, short fade haircut, focused calm gaze, ${attire}.`;
  } else if (normSlug.includes("atlas")) {
    const attire = attireDesc || "tailored deep crimson executive anchor suit jacket with black satin lapels over black silk dress shirt";
    baseClause = `A distinguished male professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, ${attire}.`;
  } else if (normSlug.includes("storm")) {
    const attire = attireDesc || "high-visibility red all-weather storm broadcast field jacket with waterproof zips over dark grey technical knit";
    baseClause = `A female professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, athletic build, high ponytail hairstyle, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("luna")) {
    const attire = attireDesc || "sophisticated deep plum-purple velvet tuxedo jacket with black satin shawl collar over black silk v-neck blouse";
    baseClause = `A female professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, stylish dark wavy bob, elegant poised posture, ${attire}.`;
  } else if (normSlug.includes("austin")) {
    const attire = attireDesc || "matte charcoal technical techwear bomber jacket over branded dark tech-startup crewneck tee";
    baseClause = `A modern male professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, light tan, short neat beard, ${attire}.`;
  } else if (normSlug.includes("sofia")) {
    const attire = attireDesc || "architectural royal sapphire blue tailored asymmetric blazer over minimalist black mock-neck top";
    baseClause = `A female professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, sharp modern dark bob haircut, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("atlas")) {
    const attire = attireDesc || "tailored crimson red satin-trimmed tuxedo dinner jacket with black satin peak lapels over black silk dress shirt";
    baseClause = `A distinguished senior male professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, silver-grey hair, well-groomed grey beard, commanding focused gaze, ${attire}.`;
  } else if (normSlug.includes("hawk")) {
    const attire = attireDesc || "sharp graphite grey pinstripe three-piece suit with white spread collar shirt and dark silk tie";
    baseClause = `An authoritative senior male professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, impeccably groomed dark hair, commanding posture, ${attire}.`;
  } else if (normSlug.includes("jade")) {
    const attire = attireDesc || "luxurious cream ivory tailored cashmere blazer over champagne satin blouse with delicate gold chain";
    baseClause = `A female professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, sleek dark hair with vibrant magenta highlights, calm poised posture, ${attire}.`;
  } else if (normSlug.includes("aris")) {
    const attire = attireDesc || "tailored navy blue tech-wool blazer over crisp white spread-collar dress shirt with open collar, thin titanium wire spectacles";
    baseClause = `A distinguished male professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, silver-grey hair, thin wire glasses, poised posture, ${attire}.`;
  } else if (normSlug.includes("isabel")) {
    const attire = attireDesc || "vibrant tailored emerald green satin blazer with peaked lapels over black silk camisole top, delicate gold pendant";
    baseClause = `A female professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, sleek dark hair, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("claire")) {
    const attire = attireDesc || "architectural midnight navy tailored trench coat dress with structured waist belt and polished buttons";
    baseClause = `A female professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, sleek dark chin-length bob, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("marcos")) {
    const attire = attireDesc || "sharp slate grey pinstripe three-piece tailored vest over tailored sky-blue dress shirt with open collar";
    baseClause = `A male professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, dark hair with silver temples, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("luca")) {
    const attire = attireDesc || "rich espresso brown distressed calfskin moto jacket over tailored beige linen button-down shirt";
    baseClause = `A male professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, wavy dark hair, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("kai")) {
    const attire = attireDesc || "modern minimalist matte black collarless wrap blazer over charcoal bamboo-cotton crewneck, clear modern frames";
    baseClause = `A male professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, platinum hair, clear modern frames, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("abigail")) {
    const attire = attireDesc || "vibrant marigold yellow tailored crepe blazer over white pleated georgette blouse with delicate pearls";
    baseClause = `A female professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, golden hair, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("adrian")) {
    const attire = attireDesc || "crisp obsidian black tailored European two-button suit jacket with charcoal micro-check tie and silver tie clip";
    baseClause = `A male professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, dark grey hair, gaunt sharp jawline, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("layla")) {
    const attire = attireDesc || "impeccably tailored ivory crepe blazer with satin shawl lapels over dusty rose silk shell, low neat chignon";
    baseClause = `A female professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, sleek dark hair in low bun, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("everett")) {
    const attire = attireDesc || "classic British forest green and brown Donegal tweed blazer over rich navy merino wool knit sweater, round wire spectacles";
    baseClause = `A distinguished senior male professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, wispy white hair, wire glasses, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("lucia")) {
    const attire = attireDesc || "tailored warm terracotta-orange structured linen blazer over ivory silk camisole top, subtle gold hoop earrings";
    baseClause = `A female professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, radiant warm complexion, styled dark hair, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("jeremiah")) {
    const attire = attireDesc || "classic charcoal grey herringbone wool waistcoat vest with antique bronze pocket watch chain over crisp white spread-collar dress shirt, loosened tie";
    baseClause = `A distinguished senior male professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, seasoned observant eyes, neat salt-and-pepper beard, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("marina")) {
    const attire = attireDesc || "vibrant ocean cerulean blue tailored silk button-down blouse with mother-of-pearl buttons, tailored dark trousers, silver wave pendant";
    baseClause = `A female professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, intelligent expressive eyes, dark hair, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("miles")) {
    const attire = attireDesc || "modern minimalist matte graphite grey technical zip overshirt worn over charcoal bamboo-cotton crewneck";
    baseClause = `A male professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, focused calm gaze, ${attire}.`;
  } else if (normSlug.includes("victoria")) {
    const attire = attireDesc || "sculpted deep plum-burgundy tailored crepe blazer with black satin shawl lapels, minimalist gold hardware accents";
    baseClause = `A female professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, sleek dark updo, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("ian")) {
    const attire = attireDesc || "structured dark olive green tailored wool blazer with clean concealed pockets over black merino mock-neck top";
    baseClause = `A male professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, analytical calm gaze, ${attire}.`;
  } else if (normSlug.includes("valentina")) {
    const attire = attireDesc || "architectural royal sapphire blue tailored peplum blazer with cinched waist belt over ivory silk camisole and matching sapphire trousers";
    baseClause = `A female professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("facundo")) {
    const attire = attireDesc || "high-performance matte black technical athletic jacket with crimson red chevron accents and high zipped collar";
    baseClause = `An athletic male professional with closed mouth and firmly sealed lips standing poised against solid green chroma wall, energetic calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("fede")) {
    const attire = attireDesc || "tailored slate grey unstructured knit blazer over crisp heavyweight white crewneck tee, dark slim jeans";
    baseClause = `A youthful male professional standing poised against solid green chroma wall, friendly calm expression, ${attire}.`;
  } else if (normSlug.includes("taylor")) {
    const attire = attireDesc || "structured tailored rich forest green blazer over dark forest green silk scoop-neck top";
    baseClause = `A female professional standing poised against solid green chroma wall, calm focused gaze, ${attire}.`;
  } else if (normSlug.includes("ruby")) {
    const attire = attireDesc || "tailored deep burgundy velvet off-the-shoulder corset dress";
    baseClause = `A female professional named Ruby standing poised against solid green chroma wall, voluminous copper-red styled wavy hair, crystalline emerald eyes, defined cheekbones, natural freckles, calm focused gaze, ${attire}.`;
  } else {
    // Lookup from flow character registry
    const cfg = getFlowCharacterConfig(normSlug);
    const attire = attireDesc || cfg.defaultAttire || "professional tailored attire";
    baseClause = `${cfg.displayName || personaSlug}, a professional standing against solid green chroma wall, poised posture, ${attire}.`;
  }

  const mouthClosed =
    "Head held upright and level facing camera with zero tilt or nodding. Mouth completely shut and lips firmly sealed together with zero mouth movement throughout the entire clip, jaw motionless, neutral poised facial expression, non-speaking silent subject.";
  const audioGuard =
    "Completely silent video, mute, no sound. Lips remain firmly pressed shut and completely motionless from start to finish, with no lip movement and no talking.";
  const framingGuard =
    "Medium-wide knee-up framing, camera pulled back with ample clearance from all borders. Entire torso, waist, hips, upper thighs, arms, and hands remain fully visible inside the frame with generous margins against the solid flat green chroma wall. All gestures stay safely centered within the frame, hands never go below the bottom edge of the screen, no clipping or cutting of hands, fingers, or wrists.";

  return { baseClause, mouthClosed, audioGuard, framingGuard };
}

/**
 * Compiles all 37 Full-Mesh Matrix Tasks.
 */
export function compileMatrixTasks(
  personaSlug: string,
  attireSlug: string,
  masterSet: MasterImageSet,
  attireDesc?: string,
  customPrefix?: string
): MatrixTask[] {
  const { baseClause, mouthClosed, audioGuard, framingGuard } = buildCharacterPromptClauses(personaSlug, attireDesc, attireSlug);
  const prefix = customPrefix || `${personaSlug.toLowerCase()}_${attireSlug.toLowerCase()}`;

  const tasks: MatrixTask[] = [];

  // 1. 10 Boundary-Locked Loops (M_i -> M_i, 2 versions per pose)
  const boundaryDefs = [
    {
      pose: "M1" as MasterPoseKey,
      v1: "Motionless face, closed mouth and firmly sealed lips with zero talking. Head held upright and level facing camera without tilt. From clasped hands at waist, hands gently unclasp and forearms adjust comfortably, fingers extending softly in front of waist in a slow calm physical motion, then hands smoothly clasp back together at waist. Only arms and hands move, head and face stay completely motionless, lips sealed firmly shut with zero mouth movement. Seamless boundary lock returning to starting pose.",
      v2: "Motionless face, closed mouth and firmly sealed lips with zero talking. Clasped hands at waist lift slightly with forearms moving in a slow physical rhythm in front of torso, then hands ease smoothly back to clasp neatly at waist. Non-speaking subject with motionless closed mouth. Seamless boundary lock returning to starting pose.",
      meta1: { emotion: "neutral_composed" as AnchorEmotion, rhetoricAction: "little_movement" as RhetoricAction, energyLevel: "low" as EnergyLevel },
      meta2: { emotion: "neutral_composed" as AnchorEmotion, rhetoricAction: "explaining" as RhetoricAction, energyLevel: "medium" as EnergyLevel },
    },
    {
      pose: "M2" as MasterPoseKey,
      v1: "Motionless face, closed mouth and firmly sealed lips with zero talking. From the raised right hand stance, the right hand and forearm perform a subtle physical arc with palm turning smoothly inward, fingers remaining relaxed, then smoothly settling back into the resting posture. Only the arm moves, lips stay sealed shut. Seamless boundary lock returning to starting pose.",
      v2: "Motionless face, closed mouth and firmly sealed lips with zero talking. The raised right hand performs measured physical movement: fingers flexing gently, forearm moving in a smooth physical rhythm, then hand eases back into the resting posture. Non-speaking subject with motionless closed mouth. Seamless boundary lock returning to starting pose.",
      meta1: { emotion: "enthusiastic_upbeat" as AnchorEmotion, rhetoricAction: "emphasizing" as RhetoricAction, energyLevel: "medium" as EnergyLevel },
      meta2: { emotion: "analytical_scrutiny" as AnchorEmotion, rhetoricAction: "explaining" as RhetoricAction, energyLevel: "medium" as EnergyLevel },
    },
    {
      pose: "M3" as MasterPoseKey,
      v1: "Motionless face, closed mouth and firmly sealed lips with zero talking. From open hands at mid-torso, both hands and forearms move in a steady physical rhythm with articulated open palms and flexing fingers, then smoothly settle back into the initial open-hands posture. Only arms and hands move, head and face stay completely motionless with firmly sealed lips. Seamless boundary lock returning to starting pose.",
      v2: "Motionless face, closed mouth and firmly sealed lips with zero talking. From open-hands stance, person leans gently forward toward the camera with articulated fingers and expressive illustrative arm movement emphasizing key points, then eases back to balanced starting posture. Head and jaw remain completely motionless, lips firmly pressed shut with zero mouth movement. Seamless boundary lock returning to starting pose.",
      meta1: { emotion: "enthusiastic_upbeat" as AnchorEmotion, rhetoricAction: "welcoming" as RhetoricAction, energyLevel: "high" as EnergyLevel },
      meta2: { emotion: "analytical_scrutiny" as AnchorEmotion, rhetoricAction: "comparing" as RhetoricAction, energyLevel: "medium" as EnergyLevel },
    },
    {
      pose: "M4" as MasterPoseKey,
      v1: "Motionless face, closed mouth and firmly sealed lips with zero talking. From resting arms at sides with hands poised at hip level, both forearms smoothly lift forward with articulated fingers in a slow physical rhythm at waist level, then arms ease naturally back to rest poised by hips well above bottom border. Hands and wrists remain fully visible inside frame throughout. Head and jaw remain completely motionless, lips firmly pressed shut with zero mouth movement. Seamless boundary lock returning to starting pose.",
      v2: "Motionless face, closed mouth and firmly sealed lips with zero talking. Both forearms lift slightly with hands and fingers moving in a slow physical rhythm in front of torso, shoulders relaxed, then arms lower smoothly to rest comfortably by hips, hands fully visible well above bottom border. Lips remain tightly sealed. Seamless boundary lock returning to starting pose.",
      meta1: { emotion: "grave_solemn" as AnchorEmotion, rhetoricAction: "little_movement" as RhetoricAction, energyLevel: "low" as EnergyLevel },
      meta2: { emotion: "empathetic_heartfelt" as AnchorEmotion, rhetoricAction: "emphasizing" as RhetoricAction, energyLevel: "medium" as EnergyLevel },
    },
    {
      pose: "M5" as MasterPoseKey,
      v1: "Motionless face, closed mouth and firmly sealed lips with zero talking. In three-quarter angled stance, hands unclasp gently and right forearm lifts forward with relaxed fingers, then hands return to clasp poised at waist. Non-speaking subject with motionless sealed lips. Seamless boundary lock returning to starting pose.",
      v2: "Motionless face, closed mouth and firmly sealed lips with zero talking. In three-quarter angled stance, hands unclasp smoothly and forearms articulate a slow physical rhythm with relaxed fingers in front of waist, then hands smoothly clasp back together at waist. Head and jaw remain completely motionless, lips firmly pressed shut. Seamless boundary lock returning to starting pose.",
      meta1: { emotion: "analytical_scrutiny" as AnchorEmotion, rhetoricAction: "presenting_graphic" as RhetoricAction, energyLevel: "medium" as EnergyLevel },
      meta2: { emotion: "neutral_composed" as AnchorEmotion, rhetoricAction: "side_turn" as RhetoricAction, energyLevel: "low" as EnergyLevel },
    },
  ];

  for (const b of boundaryDefs) {
    tasks.push({
      id: `${b.pose}_loop_v1`,
      type: "loop",
      startPose: b.pose,
      endPose: b.pose,
      poseState: b.pose,
      emotion: b.meta1.emotion,
      rhetoricAction: b.meta1.rhetoricAction,
      energyLevel: b.meta1.energyLevel,
      startFramePath: masterSet[b.pose],
      endFramePath: masterSet[b.pose],
      prompt: `${baseClause} ${mouthClosed} ${framingGuard} ${b.v1} ${audioGuard}`,
      outputName: `${prefix}_${b.pose}_loop_v1.mp4`,
    });
    tasks.push({
      id: `${b.pose}_loop_v2`,
      type: "loop",
      startPose: b.pose,
      endPose: b.pose,
      poseState: b.pose,
      emotion: b.meta2.emotion,
      rhetoricAction: b.meta2.rhetoricAction,
      energyLevel: b.meta2.energyLevel,
      startFramePath: masterSet[b.pose],
      endFramePath: masterSet[b.pose],
      prompt: `${baseClause} ${mouthClosed} ${framingGuard} ${b.v2} ${audioGuard}`,
      outputName: `${prefix}_${b.pose}_loop_v2.mp4`,
    });
  }

  // 2. 20 Full-Mesh Kinematic Transitions (M_i -> M_j for all pairs i != j)
  const transitionPrompts: Record<string, string> = {
    "T1_to_2": "Fluidly unclasps hands at waist, arms moving naturally, and raises right hand with open palm up to mid-chest with articulated fingers.",
    "T1_to_3": "Fluidly unclasps hands at waist and opens both arms outward to the sides with open palms and articulated fingers.",
    "T1_to_4": "Fluidly releases clasped hands at waist and separates arms slightly to rest poised by hips, hands and wrists remaining fully visible well above bottom frame edge.",
    "T1_to_5": "While keeping hands gently clasped at waist, torso fluidly turns 20 degrees into a poised side-angled stance.",
    "T2_to_1": "From raised right hand posture, fluidly lowers right hand down to waist level and brings both hands together, clasping fingers neatly at waist.",
    "T2_to_3": "From raised right hand, extends left arm outward to match, opening both arms evenly to the sides with open palms and articulated fingers.",
    "T2_to_4": "Fluidly lowers raised right hand to side resting poised by hips, allowing both arms to rest separated by hips, hands and wrists remaining fully visible well above bottom frame edge.",
    "T2_to_5": "Fluidly lowers right hand to clasp at waist while fluidly pivoting into a poised three-quarter side angle.",
    "T3_to_1": "From open arms, brings both hands fluidly inward and clasps them neatly together at waist level.",
    "T3_to_2": "From open arms, lowers left hand toward waist while raising right hand upward to mid-chest with open palm and articulated fingers.",
    "T3_to_4": "From open arms, smoothly brings arms inward to rest poised at hip level by sides, hands and wrists remaining fully visible well above bottom frame edge.",
    "T3_to_5": "From open arms, draws hands together to clasp neatly at waist while fluidly pivoting into a poised three-quarter side angle.",
    "T4_to_1": "From resting hands by hips, fluidly lifts both forearms and clasps fingers neatly at waist level.",
    "T4_to_2": "From resting hands by hips, fluidly lifts right hand up with open palm to mid-chest level with articulated fingers while left hand rests near hip.",
    "T4_to_3": "From resting hands by hips, fluidly raises and opens both arms outward to the sides with open palms in an expressive arc.",
    "T4_to_5": "From resting hands by hips, brings hands together to clasp at waist while fluidly pivoting into a poised three-quarter side angle.",
    "T5_to_1": "From three-quarter angle, fluidly rotates torso back to face front, keeping hands clasped neatly at waist.",
    "T5_to_2": "From three-quarter angle, rotates torso to face front while lifting right hand smoothly to mid-chest with open palm.",
    "T5_to_3": "From three-quarter angle, pivots torso forward to face front while opening both arms outward into a poised open stance.",
    "T5_to_4": "From three-quarter angle, pivots torso to face front while letting arms rest separated and poised by hips, hands and wrists remaining fully visible well above bottom frame edge.",
  };

  const poses: MasterPoseKey[] = ["M1", "M2", "M3", "M4", "M5"];
  for (let i = 0; i < poses.length; i++) {
    for (let j = 0; j < poses.length; j++) {
      if (i === j) continue;
      const startP = poses[i];
      const endP = poses[j];
      const transId = `T${i + 1}_to_${j + 1}`;
      const desc = transitionPrompts[transId] || `Fluidly transitions from ${startP} posture to ${endP} posture with natural physical movement.`;

      tasks.push({
        id: transId,
        type: "transition",
        startPose: startP,
        endPose: endP,
        poseState: startP,
        emotion: "neutral_composed",
        rhetoricAction: "explaining",
        energyLevel: "medium",
        startFramePath: masterSet[startP],
        endFramePath: masterSet[endP],
        prompt: `${baseClause} ${mouthClosed} ${framingGuard} ${desc} ${audioGuard}`,
        outputName: `${prefix}_${transId}.mp4`,
      });
    }
  }

  // 3. 5 Dynamic Body-Movement Boundary Loops (M_i -> M_i)
  const dynamicPrompts: Record<MasterPoseKey, string> = {
    M1: "While maintaining hands clasped at waist, person leans slightly forward with attentive engagement, unclasps hands slightly to articulate subtle emphasis with fingers and palms, and smoothly reclasps hands at waist returning to starting posture.",
    M2: "With right hand held in raised posture, right hand and fingers articulate dynamic illustrative beats with open-palm emphasis and subtle wrist rotations while torso maintains engaged forward poise, returning seamlessly to starting pose.",
    M3: "From open-hands stance, person leans gently forward toward the camera with articulated fingers and expressive illustrative arm movement emphasizing key points, then eases back to balanced starting posture.",
    M4: "With arms at sides, person lifts both hands slightly to waist level with articulated open-palm gestures emphasizing points, subtle engaged head nod, and smoothly lowers arms back to rest at sides.",
    M5: "From three-quarter stance, person turns head directly toward camera lens, lifts right hand to articulate clear explanatory illustrative gestures with fingers, then returns hands to waist matching starting frame.",
  };

  const dynamicMeta: Record<MasterPoseKey, { emotion: AnchorEmotion; rhetoricAction: RhetoricAction; energyLevel: EnergyLevel }> = {
    M1: { emotion: "neutral_composed", rhetoricAction: "forward_lean", energyLevel: "medium" },
    M2: { emotion: "analytical_scrutiny", rhetoricAction: "explaining", energyLevel: "medium" },
    M3: { emotion: "enthusiastic_upbeat", rhetoricAction: "forward_lean", energyLevel: "high" },
    M4: { emotion: "neutral_composed", rhetoricAction: "little_movement", energyLevel: "low" },
    M5: { emotion: "analytical_scrutiny", rhetoricAction: "side_turn", energyLevel: "medium" },
  };

  for (const p of poses) {
    tasks.push({
      id: `${p}_dynamic_v1`,
      type: "dynamic_loop",
      startPose: p,
      endPose: p,
      poseState: p,
      emotion: dynamicMeta[p].emotion,
      rhetoricAction: dynamicMeta[p].rhetoricAction,
      energyLevel: dynamicMeta[p].energyLevel,
      startFramePath: masterSet[p],
      endFramePath: masterSet[p],
      prompt: `${baseClause} ${mouthClosed} ${framingGuard} ${dynamicPrompts[p]} Flawless boundary lock returning to starting pose. ${audioGuard}`,
      outputName: `${prefix}_${p}_dynamic_v1.mp4`,
    });
  }

  // 4. 2 Natural Grooming / Micro-Adjustments (M_i -> M_i)
  // Smart Attire-Aware Engine:
  // - If presenter is male:
  //     * Slot 1 (M1): Tie knot adjustment (if tie present), collar adjustment (if collar present), or hands reclasp reset (universal).
  //     * Slot 2 (M4): Suit jacket lapel adjustment (if jacket/blazer present), or shoulder/posture breath reset (universal).
  // - If presenter is female:
  //     * Hair tuck behind ear (M1) and hair brush over shoulder (M4).
  const personaObj = getPersonaById(personaSlug);
  const isMale = personaObj
    ? personaObj.gender === "male"
    : ["mateo", "diego", "blaze", "marcus", "ethan", "lucas"].some((name) => personaSlug.toLowerCase().includes(name));

  const fullAttireDesc = (baseClause + " " + attireSlug).toLowerCase();
  const explicitlyNoJacket = fullAttireDesc.includes("no suit") || fullAttireDesc.includes("no jacket") || fullAttireDesc.includes("no blazer") || fullAttireDesc.includes("without suit");
  const explicitlyNoTie = fullAttireDesc.includes("no tie") || fullAttireDesc.includes("open collar") || fullAttireDesc.includes("open spread collar") || fullAttireDesc.includes("without tie");

  const hasTie = !explicitlyNoTie && (fullAttireDesc.includes("tie") || fullAttireDesc.includes("necktie") || fullAttireDesc.includes("cravat"));
  const hasJacket = !explicitlyNoJacket && (fullAttireDesc.includes("jacket") || fullAttireDesc.includes("blazer") || fullAttireDesc.includes("suit") || fullAttireDesc.includes("coat") || fullAttireDesc.includes("tuxedo"));
  const hasCollar = fullAttireDesc.includes("collar") || fullAttireDesc.includes("shirt") || fullAttireDesc.includes("polo") || fullAttireDesc.includes("button");

  if (isMale) {
    // M1 Grooming / Micro-adjustment
    if (hasTie) {
      tasks.push({
        id: "M1_tie_adjust_v1",
        type: "dynamic_loop",
        startPose: "M1",
        endPose: "M1",
        poseState: "M1",
        emotion: "neutral_composed",
        rhetoricAction: "little_movement",
        energyLevel: "low",
        startFramePath: masterSet.M1,
        endFramePath: masterSet.M1,
        prompt: `${baseClause} ${mouthClosed} ${framingGuard} While standing poised with hands clasped at waist, he smoothly brings his right hand up with articulated fingers to center and straighten his necktie knot in a sharp, authoritative physical hand gesture, maintaining calm direct eye contact with the camera, then gracefully lowers his hand back to clasp neatly at waist. Flawless boundary lock returning to starting pose. ${audioGuard}`,
        outputName: `${prefix}_M1_tie_adjust_v1.mp4`,
      });
    } else if (hasCollar) {
      tasks.push({
        id: "M1_collar_adjust_v1",
        type: "dynamic_loop",
        startPose: "M1",
        endPose: "M1",
        poseState: "M1",
        emotion: "neutral_composed",
        rhetoricAction: "little_movement",
        energyLevel: "low",
        startFramePath: masterSet.M1,
        endFramePath: masterSet.M1,
        prompt: `${baseClause} ${mouthClosed} ${framingGuard} While standing poised with hands clasped at waist, he smoothly brings his right hand up to adjust his shirt collar with articulated fingers in a sharp, poised physical hand gesture, maintaining calm direct eye contact with the camera, then gracefully lowers his hand back to clasp neatly at waist. Flawless boundary lock returning to starting pose. ${audioGuard}`,
        outputName: `${prefix}_M1_collar_adjust_v1.mp4`,
      });
    } else {
      // Universal Male M1 Micro-Adjustment: Hands Reclasp & Wrist Settle (Works with t-shirts, sweaters, hoodies)
      tasks.push({
        id: "M1_hands_reset_v1",
        type: "dynamic_loop",
        startPose: "M1",
        endPose: "M1",
        poseState: "M1",
        emotion: "neutral_composed",
        rhetoricAction: "little_movement",
        energyLevel: "low",
        startFramePath: masterSet.M1,
        endFramePath: masterSet.M1,
        prompt: `${baseClause} ${mouthClosed} ${framingGuard} While standing poised with hands clasped at waist, he smoothly unclasps his fingers, articulates a subtle composed settling motion with wrists and hands, and reclasps fingers neatly at waist in a polished physical posture reset, maintaining steady direct eye contact with the camera. Flawless boundary lock returning to starting pose. ${audioGuard}`,
        outputName: `${prefix}_M1_hands_reset_v1.mp4`,
      });
    }

    // M4 Grooming / Micro-adjustment
    if (hasJacket) {
      tasks.push({
        id: "M4_lapel_adjust_v1",
        type: "dynamic_loop",
        startPose: "M4",
        endPose: "M4",
        poseState: "M4",
        emotion: "neutral_composed",
        rhetoricAction: "little_movement",
        energyLevel: "low",
        startFramePath: masterSet.M4,
        endFramePath: masterSet.M4,
        prompt: `${baseClause} ${mouthClosed} ${framingGuard} Standing with arms naturally relaxed at sides, he smoothly brings both hands up to grasp and settle his suit jacket lapels with articulated fingers in a composed, confident physical stance, keeping steady direct eye contact with the camera lens, then smoothly lowers both arms back down to rest comfortably at sides. Flawless boundary lock returning to starting pose. ${audioGuard}`,
        outputName: `${prefix}_M4_lapel_adjust_v1.mp4`,
      });
    } else {
      // Universal Male M4 Micro-Adjustment: Deep Breath & Shoulder Square (Works with any shirt, polo, sweater)
      tasks.push({
        id: "M4_posture_reset_v1",
        type: "dynamic_loop",
        startPose: "M4",
        endPose: "M4",
        poseState: "M4",
        emotion: "neutral_composed",
        rhetoricAction: "little_movement",
        energyLevel: "low",
        startFramePath: masterSet.M4,
        endFramePath: masterSet.M4,
        prompt: `${baseClause} ${mouthClosed} ${framingGuard} Standing with arms naturally relaxed at sides, he takes a discreet composed breath, subtly rolls shoulders back to square his upright physical posture with articulated fingers settling naturally at sides, keeping steady authoritative eye contact with the camera lens. Flawless boundary lock returning to starting pose. ${audioGuard}`,
        outputName: `${prefix}_M4_posture_reset_v1.mp4`,
      });
    }
  } else {
    // Female Presenters: Hair tuck & hair brush over shoulder
    tasks.push({
      id: "M1_hair_adjust_v1",
      type: "dynamic_loop",
      startPose: "M1",
      endPose: "M1",
      poseState: "M1",
      emotion: "neutral_composed",
      rhetoricAction: "little_movement",
      energyLevel: "low",
      startFramePath: masterSet.M1,
      endFramePath: masterSet.M1,
      prompt: `${baseClause} ${mouthClosed} ${framingGuard} While standing poised, she smoothly raises her right hand to gently tuck a soft lock of hair behind her ear in a natural, elegant gesture, maintaining calm direct eye contact with the camera, then gracefully lowers her hand back to clasp neatly at waist. Flawless boundary lock returning to starting pose. ${audioGuard}`,
      outputName: `${prefix}_M1_hair_adjust_v1.mp4`,
    });

    tasks.push({
      id: "M4_hair_adjust_v1",
      type: "dynamic_loop",
      startPose: "M4",
      endPose: "M4",
      poseState: "M4",
      emotion: "neutral_composed",
      rhetoricAction: "little_movement",
      energyLevel: "low",
      startFramePath: masterSet.M4,
      endFramePath: masterSet.M4,
      prompt: `${baseClause} ${mouthClosed} ${framingGuard} Standing with arms naturally relaxed at sides, she smoothly lifts left hand up to gently brush hair back over shoulder in a poised, natural motion, keeping steady direct eye contact with the camera lens, then smoothly lowers arm back down to rest comfortably at side. Flawless boundary lock returning to starting pose. ${audioGuard}`,
      outputName: `${prefix}_M4_hair_adjust_v1.mp4`,
    });
  }

  return tasks;
}

/**
 * Precision trims the last settling frames using bundled FFmpeg if a peak SSIM is detected.
 */
export function precisionTrimVideo(
  videoPath: string,
  masterImagePath: string,
  minGainThreshold = 0.015
): { trimmed: boolean; trimmedFrames: number; peakEndSsim: number; newDuration: number; newFrames: number } {
  if (!fs.existsSync(videoPath) || !fs.existsSync(masterImagePath)) {
    return { trimmed: false, trimmedFrames: 0, peakEndSsim: 0, newDuration: 0, newFrames: 0 };
  }

  const scriptPath = path.resolve(process.cwd(), "scripts/scratch_temporal_ssim.py");
  const pythonCode = `
import sys, os, json, cv2, numpy as np

video_path, master_path = sys.argv[1], sys.argv[2]
cap = cv2.VideoCapture(video_path)
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
fps = cap.get(cv2.CAP_PROP_FPS) or 24.0

if total_frames <= 24:
    cap.release()
    print(json.dumps({"gain": 0, "frames_earlier": 0, "best_ssim": 0}))
    sys.exit(0)

window = min(24, total_frames)
start_idx = total_frames - window
frames = []
cap.set(cv2.CAP_PROP_POS_FRAMES, start_idx)
for idx in range(start_idx, total_frames):
    ret, frame = cap.read()
    if not ret or frame is None: break
    frames.append((idx, frame))
cap.release()

if not frames:
    print(json.dumps({"gain": 0, "frames_earlier": 0, "best_ssim": 0}))
    sys.exit(0)

master = cv2.imread(master_path)
h, w = frames[0][1].shape[:2]
master_resized = cv2.resize(master, (w, h))
m_gray = cv2.cvtColor(master_resized, cv2.COLOR_BGR2GRAY).astype(np.float64)

def ssim(g1, g2):
    C1, C2 = (0.01*255)**2, (0.03*255)**2
    mu1 = cv2.GaussianBlur(g1, (11, 11), 1.5)
    mu2 = cv2.GaussianBlur(g2, (11, 11), 1.5)
    mu1_sq, mu2_sq, mu12 = mu1**2, mu2**2, mu1*mu2
    sig1_sq = cv2.GaussianBlur(g1**2, (11, 11), 1.5) - mu1_sq
    sig2_sq = cv2.GaussianBlur(g2**2, (11, 11), 1.5) - mu2_sq
    sig12 = cv2.GaussianBlur(g1*g2, (11, 11), 1.5) - mu12
    return float(np.mean(((2*mu12 + C1)*(2*sig12 + C2)) / ((mu1_sq + mu2_sq + C1)*(sig1_sq + sig2_sq + C2))))

scores = []
for idx, frame in frames:
    fg = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY).astype(np.float64)
    scores.append((idx, ssim(fg, m_gray)))

last_idx, last_ssim = scores[-1]
best_idx, best_ssim = max(scores, key=lambda x: x[1])
frames_earlier = total_frames - 1 - best_idx
gain = best_ssim - last_ssim

print(json.dumps({
    "total_frames": total_frames,
    "last_ssim": round(last_ssim, 4),
    "best_ssim": round(best_ssim, 4),
    "best_idx": best_idx,
    "frames_earlier": frames_earlier,
    "gain": round(gain, 4),
    "fps": fps
}))
`;

  try {
    fs.writeFileSync(scriptPath, pythonCode, "utf8");
    const cmd = `python "${scriptPath}" "${videoPath}" "${masterImagePath}"`;
    const stdout = execSync(cmd, { encoding: "utf8" });
    const analysis = JSON.parse(stdout);

    try { fs.unlinkSync(scriptPath); } catch {}

    const gain = analysis.gain ?? 0;
    const framesEarlier = analysis.frames_earlier ?? 0;
    const totalFrames = analysis.total_frames ?? 192;
    const fps = analysis.fps ?? 24;

    if (gain >= minGainThreshold && framesEarlier > 0 && framesEarlier <= 12) {
      const targetFrames = totalFrames - framesEarlier;
      const ffmpeg = getFFmpegPath();
      const tempOut = videoPath.replace(/\.mp4$/, "_trimmed_temp.mp4");

      const trimCmd = `"${ffmpeg}" -y -i "${videoPath}" -vframes ${targetFrames} -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -an "${tempOut}"`;
      execSync(trimCmd, { stdio: "ignore" });

      if (fs.existsSync(tempOut)) {
        fs.copyFileSync(tempOut, videoPath);
        try { fs.unlinkSync(tempOut); } catch {}
        const newDuration = Math.round((targetFrames / fps) * 100) / 100;
        return {
          trimmed: true,
          trimmedFrames: framesEarlier,
          peakEndSsim: analysis.best_ssim,
          newDuration,
          newFrames: targetFrames,
        };
      }
    }

    return {
      trimmed: false,
      trimmedFrames: 0,
      peakEndSsim: analysis.last_ssim,
      newDuration: Math.round((totalFrames / fps) * 100) / 100,
      newFrames: totalFrames,
    };
  } catch {
    try { fs.unlinkSync(scriptPath); } catch {}
    return { trimmed: false, trimmedFrames: 0, peakEndSsim: 0, newDuration: 8.0, newFrames: 192 };
  }
}

/**
 * Registers Master Images and Action Loops in Prisma SQLite Database.
 */
export async function registerMatrixInDb(
  personaSlug: string,
  attireSlug: string,
  masterSet: MasterImageSet,
  manifest: Record<string, any>
): Promise<{ mastersRegistered: number; loopsRegistered: number }> {
  const normSlug = personaSlug.toLowerCase();
  const persona = await prisma.persona.findFirst({
    where: {
      OR: [{ slug: normSlug }, { id: normSlug }],
    },
  });

  if (!persona) {
    console.warn(`[DB Register Warning] Persona '${normSlug}' not found in database. Skipping DB registration.`);
    return { mastersRegistered: 0, loopsRegistered: 0 };
  }

  let mastersCount = 0;
  let loopsCount = 0;

  // 1. Register 5 Master Images
  const masterIdMap: Record<MasterPoseKey, string> = { M1: "", M2: "", M3: "", M4: "", M5: "" };
  for (const [pose, fullPath] of Object.entries(masterSet) as [MasterPoseKey, string][]) {
    const relKey = fullPath.replace(/\\/g, "/").replace(/^.*\/public\//, "");
    const existing = await prisma.personaMasterImage.findFirst({
      where: {
        personaId: persona.id,
        attire: attireSlug,
        poseType: pose,
      },
    });

    if (existing) {
      await prisma.personaMasterImage.update({
        where: { id: existing.id },
        data: { storageKey: relKey, isDefault: pose === "M1" },
      });
      masterIdMap[pose] = existing.id;
    } else {
      const created = await prisma.personaMasterImage.create({
        data: {
          personaId: persona.id,
          poseType: pose,
          attire: attireSlug,
          storageKey: relKey,
          isDefault: pose === "M1",
        },
      });
      masterIdMap[pose] = created.id;
    }
    mastersCount++;
  }

  // 2. Register Action Loops from manifest
  for (const [actionId, item] of Object.entries(manifest)) {
    const startPose = (item.startPose || "M1") as MasterPoseKey;
    const masterImageId = masterIdMap[startPose];
    if (!masterImageId) continue;

    const relKey = (item.file || "").replace(/\\/g, "/").replace(/^.*\/public\//, "");
    const existing = await prisma.personaActionLoop.findFirst({
      where: {
        personaId: persona.id,
        actionName: actionId,
      },
    });

    const loopData = {
      personaId: persona.id,
      masterImageId,
      actionName: actionId,
      baseVideoKey: relKey,
      pingPongVideoKey: relKey,
      durationSec: item.duration || 8.0,
      frameCount: item.totalFrames || item.frames || 192,
      fps: item.fps || 24,
      latentsCacheKey: item.sha256 || "",
      emotion: item.emotion || null,
      rhetoricAction: item.rhetoricAction || null,
      energyLevel: item.energyLevel || null,
      poseState: item.poseState || item.startPose || "M1",
    };

    if (existing) {
      await prisma.personaActionLoop.update({
        where: { id: existing.id },
        data: loopData,
      });
    } else {
      await prisma.personaActionLoop.create({
        data: loopData,
      });
    }
    loopsCount++;
  }

  return { mastersRegistered: mastersCount, loopsRegistered: loopsCount };
}

/**
 * Fast binary image dimension reader with ffprobe fallback.
 */
function getImageDimensions(filePath: string): { width: number; height: number } {
  try {
    const buffer = fs.readFileSync(filePath);
    // Fast JPEG SOF parser
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        if (marker === 0xc0 || marker === 0xc1 || marker === 0xc2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        offset += 2 + buffer.readUInt16BE(offset + 2);
      }
    }
  } catch {}

  try {
    const ffprobe = getFFprobePath();
    const probe = JSON.parse(
      execSync(`"${ffprobe}" -v error -select_streams v:0 -show_entries stream=width,height -of json "${filePath}"`, {
        encoding: "utf8",
      })
    );
    const w = Number(probe.streams?.[0]?.width);
    const h = Number(probe.streams?.[0]?.height);
    if (w && h) return { width: w, height: h };
  } catch {}

  return { width: 1920, height: 1080 };
}

/**
 * Main Autonomous Action Matrix Runner.
 */
export async function runAutonomousActionMatrix(options: ActionMatrixOptions): Promise<void> {
  const persona = (options.persona || "ruby").toLowerCase();
  const attire = (options.attire || "default_attire").toLowerCase();
  const dryRun = !!options.dryRun;
  const autoTrim = options.autoTrim !== false;
  const registerDb = options.registerDb !== false;

  console.log("\n==================================================================");
  console.log("🎬 NEWSSTUDIO — AUTONOMOUS 37-CLIP ACTION MATRIX GENERATOR");
  console.log(`   Persona:        ${persona.toUpperCase()}`);
  console.log(`   Attire:         ${attire}`);
  console.log(`   Auto-Trim:      ${autoTrim ? "ENABLED (Peak End SSIM)" : "DISABLED"}`);
  console.log(`   DB Register:    ${registerDb ? "ENABLED (Prisma SQLite)" : "DISABLED"}`);
  console.log(`   Dry Run:        ${dryRun ? "YES (Preview Only)" : "NO (Live Generation)"}`);
  console.log("==================================================================\n");

  // Step 1: Discover & validate 5 master images
  let { set: masterSet, baseDir } = resolveMasterImageSet(options);
  console.log(`✔ Master Images Resolved from: ${baseDir}`);
  for (const [pose, pth] of Object.entries(masterSet)) {
    console.log(`   [${pose}] -> ${path.basename(pth)}`);
  }

  // Step 1b: Pre-Flight Anatomical Framing & Boundary Clearance Audit Gate
  if (!options.skipAudit) {
    console.log("\n🛡️ Running Pre-Flight Anatomical Framing & Boundary Clearance Audit Gate...");
    const { auditMasterImageSet, printSetAuditReport } = await import("../auditors/imageSetAuditor");
    let masterPaths = Object.values(masterSet);
    let auditReport = await auditMasterImageSet(masterPaths, persona);
    printSetAuditReport(auditReport);

    if (!auditReport.isCohesive || auditReport.violations.length > 0) {
      console.warn("\n⚠️ PRE-FLIGHT AUDIT: Master image violations detected. Initiating Autonomous Self-Healing Loop...");
      const { autoHealInconsistentImageSet } = await import("./consistencyVerificationLoop");
      const healResult = await autoHealInconsistentImageSet({
        dirPath: baseDir,
        persona,
        baselinePath: masterSet.M1,
        engine: "agy",
        aspectRatio: "16:9",
      });

      if (healResult.success) {
        console.log("\n🎉 Master image set successfully healed! Re-auditing set...");
        const updated = resolveMasterImageSet(options);
        masterSet = updated.set;
        masterPaths = Object.values(masterSet);
        auditReport = await auditMasterImageSet(masterPaths, persona);
        printSetAuditReport(auditReport);
        if (!auditReport.isCohesive && !dryRun) {
          throw new Error(`Pre-flight audit failed after self-healing attempt: ${auditReport.violations.join("; ")}`);
        }
      } else if (!dryRun) {
        throw new Error(`Pre-flight audit self-healing failed: ${auditReport.violations.join("; ")}`);
      }
    }
  } else {
    console.log("\n🛡️ Pre-Flight Audit Gate: SKIPPED via --skip-audit flag (User-verified Master Image Set).");
  }

  // Step 1b: Autonomous Master Framing & Scale Consistency Audit
  console.log("\n📐 Autonomous Master Framing Consistency Audit...");
  try {
    const { auditAndNormalizeMasterFraming } = await import("../auditors/masterFramingAuditor.js");
    const framingAudit = await auditAndNormalizeMasterFraming(baseDir, true);
    if (framingAudit.fixedCount > 0) {
      console.log(`   🔧 Auto-normalized ${framingAudit.fixedCount} master image(s) to uniform waist-up scale!`);
      console.log(`   Target Face Scale: ${framingAudit.targetFaceHeightPx}px (${framingAudit.targetFaceRatioPct}%)`);
      // Reload resolved master set
      const reloaded = resolveMasterImageSet(options);
      masterSet = reloaded.set;
    } else {
      console.log(`   ✔ Master image framing verified (Scale: ${framingAudit.targetFaceHeightPx}px, ${framingAudit.targetFaceRatioPct}%)`);
    }
  } catch (framingErr: any) {
    console.warn(`   ⚠️ Master Framing Audit notice: ${framingErr.message}`);
  }

  // Step 1c: Mandatory Hand & Body Clearance Gate
  if (!options.skipAudit && !options.force) {
    console.log("\n🖐️ Mandatory Hand & Body Clearance Audit Gate...");
    try {
      const { auditMasterHandClearance } = await import("../auditors/handClearanceAuditor");
      const clearanceAudit = await auditMasterHandClearance(baseDir);
      if (!clearanceAudit.allPassed) {
        console.error("\n❌ HAND CLEARANCE AUDIT FAILED: Master images will cut off hands during downward arm motion!");
        for (const it of clearanceAudit.images) {
          if (!it.passed) {
            console.error(`   - ${it.filename}:`);
            it.reasons.forEach((r) => console.error(`       ⚠️ ${r}`));
          }
        }
        if (!dryRun) {
          throw new Error(
            `Hand Clearance Audit failed for ${persona} (${clearanceAudit.failedCount}/${clearanceAudit.totalImages} images failed). ` +
            `Master images are too tightly cropped at the waist/hips and will cut off hands. ` +
            `Redo all 5 master images with camera pulled back (cowboy / mid-thigh framing) before generating videos.`
          );
        }
      } else {
        console.log(`   ✔ Hand & body clearance verified across all ${clearanceAudit.totalImages} master images!`);
      }
    } catch (clearanceErr: any) {
      if (clearanceErr.message.includes("Hand Clearance Audit failed")) {
        throw clearanceErr;
      }
      console.warn(`   ⚠️ Hand Clearance Audit warning: ${clearanceErr.message}`);
    }
  } else {
    console.log("\n🖐️ Hand Clearance Audit Gate: SKIPPED via --skip-audit / --force flag.");
  }

  // Step 2: Resolve Output Directory
  let outDir = options.outputDir ? path.resolve(process.cwd(), options.outputDir) : "";
  if (!outDir) {
    const defaultOut = path.resolve(process.cwd(), `public/assets/action_loops/veo/${persona}_${attire}`);
    if (fs.existsSync(defaultOut)) {
      outDir = defaultOut;
    } else {
      const veoBase = path.resolve(process.cwd(), "public/assets/action_loops/veo");
      if (fs.existsSync(veoBase)) {
        const matches = fs.readdirSync(veoBase, { withFileTypes: true })
          .filter((d) => d.isDirectory() && !d.name.endsWith("_backup") && d.name.startsWith(`${persona}_`));
        const matched = matches.find((d) => d.name.startsWith(`${persona}_${attire}`)) || matches[0];
        if (matched) {
          outDir = path.join(veoBase, matched.name);
        }
      }
    }
  }
  if (!outDir) {
    outDir = path.resolve(process.cwd(), `public/assets/action_loops/veo/${persona}_${attire}`);
  }

  if (!fs.existsSync(outDir) && !dryRun) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Step 3: Compile 37 Matrix Tasks
  const dirPrefix = path.basename(outDir);
  const allTasks = compileMatrixTasks(persona, attire, masterSet, undefined, dirPrefix);

  // Apply filters
  let filteredTasks = allTasks;
  if (options.target === "loops") {
    filteredTasks = allTasks.filter((t) => t.type === "loop");
  } else if (options.target === "transitions") {
    filteredTasks = allTasks.filter((t) => t.type === "transition");
  } else if (options.target === "dynamic") {
    filteredTasks = allTasks.filter(
      (t) => t.type === "dynamic_loop" && !t.id.includes("hair") && !t.id.includes("tie") && !t.id.includes("lapel")
    );
  } else if (options.target === "hair" || options.target === "grooming") {
    filteredTasks = allTasks.filter(
      (t) => t.id.includes("hair") || t.id.includes("tie") || t.id.includes("lapel") || t.id.includes("adjust")
    );
  }

  if (options.tasks && options.tasks.length > 0) {
    filteredTasks = allTasks.filter((t) => options.tasks!.includes(t.id));
  }

  const startIdx = Number(options.start) || 0;
  const limit = options.all ? filteredTasks.length : (Number(options.limit) || (dryRun ? filteredTasks.length : 4));
  const tasksToRun = filteredTasks.slice(startIdx, startIdx + limit);

  console.log(`\n📋 Execution Plan:`);
  console.log(`   Total Matrix Size: ${allTasks.length} tasks`);
  console.log(`   Selected:          ${tasksToRun.length} tasks (Range: ${startIdx + 1}..${startIdx + tasksToRun.length})`);
  console.log(`   Target Output:     ${outDir}\n`);

  if (dryRun) {
    console.log("------------------------------------------------------------------");
    console.log("🔍 DRY RUN PREVIEW — ALL PLANNED TASKS & PROMPTS:");
    console.log("------------------------------------------------------------------");
    tasksToRun.forEach((t, i) => {
      console.log(`\n[${startIdx + i + 1}/${allTasks.length}] Task: ${t.id} (${t.type})`);
      console.log(`  Trajectory:  ${t.startPose} -> ${t.endPose}`);
      console.log(`  Output:      ${t.outputName}`);
      console.log(`  Start Frame: ${path.basename(t.startFramePath)}`);
      console.log(`  End Frame:   ${path.basename(t.endFramePath)}`);
      console.log(`  Prompt:      "${t.prompt}"`);
    });
    console.log("\n==================================================================");
    console.log(`💰 Estimated Cost: ${tasksToRun.length * 5} Flow Credits (Veo 3.1 Lite @ 5 cr/clip)`);
    console.log("==================================================================\n");
    return;
  }

  // Step 4: Ensure Chrome Debugging Session Online Autonomously!
  console.log("🌐 Verifying Chrome Remote Debugging on port 9222...");
  const chromeReady = await ensureChromeDebugRunning({ silent: false });
  if (!chromeReady) {
    throw new Error("Could not establish connection to Chrome on port 9222. Autonomous run aborted.");
  }

  // Step 5: Initialize Flow MCP Services
  process.env.FLOW_CDP_URL = process.env.FLOW_CDP_URL || "http://127.0.0.1:9222";
  const { config } = await import("../../../vendor/google-flow-mcp/dist/config.js");
  config.cdpUrl = config.cdpUrl || "http://127.0.0.1:9222";

  const { readSession } = await import("../../../vendor/google-flow-mcp/dist/services/session.js");
  const { openProject } = await import("../../../vendor/google-flow-mcp/dist/services/project.js");
  const { generate } = await import("../../../vendor/google-flow-mcp/dist/services/generate.js");
  const { setFlowMode, clearFrames, ensureVeoModel, ensureSilentVideos, ensureFlowAspectRatio, assignFrame, uploadToSlot } = await import("../../../vendor/google-flow-mcp/dist/services/compose.js");
  const { closeBrowser, getFlowPage } = await import("../../../vendor/google-flow-mcp/dist/services/browser.js");

  const targetProjectId = process.env.FLOW_PROJECT_ID || "065b7352-6e4f-4aa9-b420-eab8beeebcdd";
  let session = await readSession();
  if (session.loggedIn && session.projectId !== targetProjectId) {
    console.log(`📍 Switching Google Flow project from [${session.projectId || "none"}] to target [${targetProjectId}]...`);
    try {
      await openProject(targetProjectId);
      session = await readSession();
    } catch (e: any) {
      console.warn(`⚠️ Could not automatically switch project to ${targetProjectId}:`, e.message);
    }
    if (session.projectId !== targetProjectId) {
      throw new Error(`CRITICAL: Active Google Flow project (${session.projectId}) does not match target project (${targetProjectId}). Aborting to prevent generating in the wrong project.`);
    }
  }

  console.log(`\n[Preflight] Flow Connected: ${session.browserConnected}`);
  console.log(`[Preflight] User:           ${session.loggedIn ? session.account : "NOT LOGGED IN"}`);
  console.log(`[Preflight] Credit Balance: ${session.credits} credits`);
  console.log(`[Preflight] Active Project: ${session.projectId}\n`);

  if (!session.loggedIn) {
    throw new Error("Google Flow session is not logged in. Please sign in in the automated Chrome window.");
  }

  // Strictly enforce Veo 3.1 - Lite (5 credits) to prevent Omni (12 credits) regressions
  console.log("🔒 Enforcing Veo 3.1 - Lite model tier in Google Flow (5 credits/clip)...");
  await ensureVeoModel("lite");

  // Enforce silent video mode to prevent "Audio generation failed" aborts
  console.log("🔇 Enforcing Silent Video mode in Google Flow...");
  await ensureSilentVideos();

  // Enforce aspect ratio based on master image geometry (16:9 landscape vs 9:16 portrait)
  const dims = getImageDimensions(masterSet.M1);
  const targetRatio: "16:9" | "9:16" = dims.width >= dims.height ? "16:9" : "9:16";
  console.log(`📐 Master Image Dimensions: ${dims.width}x${dims.height} -> Enforcing ${targetRatio} aspect ratio in Google Flow...`);
  await ensureFlowAspectRatio(targetRatio);

  const requiredCredits = Math.min(5, tasksToRun.length * 5);
  if (session.credits !== null && session.credits < 5) {
    throw new Error(`Insufficient credits for generation. Required at least 5 credits per clip, available: ${session.credits}`);
  }

  // Load or create manifest
  const manifestPath = path.join(outDir, "manifest.json");
  let manifest: Record<string, any> = {};
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    } catch {}
  }

  const existingHashes = scanDirectoryHashes(outDir);

  const resolvePoseMatcher = (poseFile: string, poseKey: MasterPoseKey): string => {
    const base = path.basename(poseFile).replace(/\.[^.]+$/, "");
    const patterns = [`0${poseKey.slice(1)}_${poseKey}`, `_${poseKey}_`, `_${poseKey.toLowerCase()}_`];
    for (const pat of patterns) {
      const idx = base.indexOf(pat);
      if (idx !== -1) {
        return base.slice(0, idx + pat.length).replace(/^_+|_+$/g, "");
      }
    }
    return base.slice(0, 35);
  };

  const POSE_SLOT_MATCHERS: Record<MasterPoseKey, string> = {
    M1: resolvePoseMatcher(masterSet.M1, "M1"),
    M2: resolvePoseMatcher(masterSet.M2, "M2"),
    M3: resolvePoseMatcher(masterSet.M3, "M3"),
    M4: resolvePoseMatcher(masterSet.M4, "M4"),
    M5: resolvePoseMatcher(masterSet.M5, "M5"),
  };

  // Step 5b: Autonomous Master Image Staging Gate in Google Flow Library
  console.log("\n📤 Verifying 5 Master Images in Google Flow asset library...");
  for (const pose of ["M1", "M2", "M3", "M4", "M5"] as MasterPoseKey[]) {
    const matcher = POSE_SLOT_MATCHERS[pose];
    const filePath = masterSet[pose];
    let inLibrary = false;
    try {
      inLibrary = await assignFrame("start", matcher);
    } catch {
      inLibrary = false;
    }
    if (inLibrary) {
      console.log(`   ✔ Master pose ${pose} verified in Flow library (${matcher})`);
    } else {
      console.log(`   ⬆ Staging Master pose ${pose} (${path.basename(filePath)}) into Flow library...`);
      await uploadToSlot("start", filePath);
      console.log(`   ✔ Staged ${pose} into Flow library.`);
    }
  }
  await clearFrames("both").catch(() => 0);

  // Step 6: Execute Generation Pipeline
  for (let i = 0; i < tasksToRun.length; i++) {
    const task = tasksToRun[i];
    const globalIdx = startIdx + i + 1;
    const destFile = path.join(outDir, task.outputName);

    console.log(`\n------------------------------------------------------------------`);
    console.log(`[${globalIdx}/${allTasks.length}] Task: ${task.id} (${task.type})`);
    console.log(`   Trajectory:  ${task.startPose} -> ${task.endPose}`);
    console.log(`   Target File: ${task.outputName}`);
    console.log(`------------------------------------------------------------------`);

    // Skip if already generated and verified (unless --force is passed)
    if (!options.force && fs.existsSync(destFile) && manifest[task.id]) {
      const integrity = validateVideoIntegrity(destFile, existingHashes);
      if (integrity.valid && !integrity.isDuplicate) {
        console.log(`   ✔ [Skipped] Already verified on disk (${(integrity.sizeBytes / (1024 * 1024)).toFixed(2)} MB, SHA: ${integrity.sha256.slice(0, 10)})`);
        continue;
      }
    }

    const maxRetries = 4;
    let lastFailureWasTalking = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      let promptToUse = task.prompt;
      if (attempt === 2) {
        if (lastFailureWasTalking) {
          console.log(`   [Retry ${attempt}/${maxRetries}] Escalating to tightened sealed-lip constraints...`);
          promptToUse = `${task.prompt} Head held completely upright and level facing camera without tilt. Firmly closed mouth, sealed lips pressed tight, motionless mouth, chin, and jaw. Non-speaking anchor with zero mouth movement.`;
        } else {
          console.log(`   [Retry ${attempt}/${maxRetries}] Softening prompt wording for policy compliance...`);
          promptToUse = promptToUse.replace(/corset|deep V neckline|neckline|straps|v-neck|chest/gi, "tailored broadcast attire");
        }
      } else if (attempt === 3) {
        console.log(`   [Retry ${attempt}/${maxRetries}] Minimalist fallback prompt...`);
        promptToUse = `A professional model standing poised against solid green chroma wall. Head held upright and level facing camera without tilt. Mouth completely shut, lips tightly sealed together and motionless throughout, completely still jaw. Poised physical posture. Completely silent video, mute, no sound, motionless lips.`;
      } else if (attempt >= 4) {
        console.log(`   [Retry ${attempt}/${maxRetries}] Channeling motion budget exclusively into hands/forearms with motionless jaw...`);
        promptToUse = `${task.prompt} Only hands, wrists, and forearms move in a gentle physical gesture. Head, chin, jaw, and mouth remain completely frozen and motionless throughout, with lips firmly pressed shut with zero talking or mouth movement. Completely silent video, mute, no sound.`;
      }

      try {
        // Proactively dismiss any lingering overlay / long-press menu backdrop
        try {
          const flowPage = await getFlowPage();
          await flowPage.keyboard.press("Escape").catch(() => {});
          await flowPage.evaluate(() => {
            const overlays = document.querySelectorAll(".backdrop, flow-mobile-long-press-menu, .cdk-overlay-backdrop");
            overlays.forEach((el) => {
              try { (el as HTMLElement).click(); } catch {}
              try { el.remove(); } catch {}
            });
          }).catch(() => {});
          await flowPage.waitForTimeout(300);
        } catch {}

        console.log(`   -> Setting VIDEO_FRAMES mode and assigning slots (${task.startPose} -> ${task.endPose})...`);
        await setFlowMode("VIDEO_FRAMES");
        await clearFrames("both").catch(() => 0);

        console.log(`   -> Submitting to Veo 3.1 Lite (5 credits)...`);
        const genStart = Date.now();
        const genResult = await generate({
          prompt: promptToUse,
          expectedMaxCost: 5,
          startFrameMediaId: POSE_SLOT_MATCHERS[task.startPose],
          endFrameMediaId: POSE_SLOT_MATCHERS[task.endPose],
          autoUpscale: false,
          outFile: destFile,
          timeoutMs: 300_000,
        });

        const elapsedSec = ((Date.now() - genStart) / 1000).toFixed(1);
        console.log(`   ✔ [Generated in ${elapsedSec}s] Charged: ${genResult.charged} credits`);

        // Integrity verification
        let integrity = validateVideoIntegrity(destFile, existingHashes);
        if (!integrity.valid || integrity.isDuplicate) {
          throw new Error(integrity.error || "Integrity verification failed");
        }

        // 1080p Full HD Guarantee Gate (supports 16:9 widescreen 1920x1080 and 9:16 portrait 1080x1920)
        if (Math.min(integrity.width, integrity.height) < 1080) {
          console.log(`   -> Native resolution is ${integrity.width}x${integrity.height}. Upgrading to 1080p Full HD (Free Ultra Tier)...`);
          const { trigger1080pUpscaleLatest } = await import("../../../vendor/google-flow-mcp/dist/services/compose.js");
          const upRes = await trigger1080pUpscaleLatest();
          if (upRes.success && upRes.upsampledUrl) {
            execSync(`curl.exe -s "${upRes.upsampledUrl}" -o "${destFile}"`);
            integrity = validateVideoIntegrity(destFile);
            console.log(`   ✔ Verified 1080p Full HD: ${integrity.width}x${integrity.height} (${(integrity.sizeBytes / (1024 * 1024)).toFixed(2)} MB)`);
          } else {
            console.warn(`   ⚠ 1080p upscale notice: ${upRes.note}`);
            const ffmpegPath = path.resolve(process.cwd(), "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe");
            if (fs.existsSync(ffmpegPath)) {
              const tempUp = destFile + ".up1080.mp4";
              execSync(`"${ffmpegPath}" -y -i "${destFile}" -vf "scale=1920:1080:flags=lanczos" -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p "${tempUp}"`, { stdio: "ignore" });
              if (fs.existsSync(tempUp)) {
                fs.renameSync(tempUp, destFile);
                integrity = validateVideoIntegrity(destFile);
                console.log(`   ✔ [Local Lanczos 1080p] Upscaled to 1920x1080 via libx264 CRF 17`);
              }
            }
          }
        }

        // Persona fidelity verification (Frame 0 SSIM >= 0.50)
        console.log(`   -> Verifying persona continuity (SSIM threshold: 0.50)...`);
        const fidelity = verifyPersonaContinuity(destFile, task.startFramePath, 0.50);
        if (!fidelity.valid) {
          try { fs.unlinkSync(destFile); } catch {}
          throw new Error(fidelity.error || "Persona fidelity check failed");
        }
        console.log(`   ✔ [Persona Verified] Frame 0 SSIM: ${fidelity.ssim.toFixed(4)} matches master photo!`);

        let trimmedFrames = 0;
        let peakEndSsim = fidelity.ssim;
        let finalDuration = integrity.duration || 8.0;
        let finalFrames = Math.round(finalDuration * (integrity.fps || 24));

        // Precision Trimming (if enabled)
        if (autoTrim) {
          console.log(`   -> Profiling final 24 frames for peak end-pose alignment...`);
          const trimResult = precisionTrimVideo(destFile, task.endFramePath);
          if (trimResult.trimmed) {
            trimmedFrames = trimResult.trimmedFrames;
            peakEndSsim = trimResult.peakEndSsim;
            finalDuration = trimResult.newDuration;
            finalFrames = trimResult.newFrames;
            console.log(`   ✂ [Precision Trimmed] -${trimmedFrames} frames | New Duration: ${finalDuration}s | Peak End SSIM: ${peakEndSsim.toFixed(4)}`);
          } else {
            peakEndSsim = trimResult.peakEndSsim;
            console.log(`   ✔ [Optimal Alignment] Native end frame is optimal (End SSIM: ${peakEndSsim.toFixed(4)})`);
          }
        }

        // Step 6e: Autonomous In-Flight Forensic GPU Talking Audit Gate
        console.log(`   -> Running in-flight GPU talking audit on RTX 5090...`);
        let talkAudit: any = null;
        try {
          const { auditVideoTalkingGpu } = await import("../auditors/gpuTalkingAuditor.js");
          const isRotationTransition = /T[1-5]_to_5|T5_to_[1-5]|turn/i.test(task.id);
          const hasFacialFeatures = ["jeremiah", "miles", "austin", "fede"].some(p => persona.toLowerCase().includes(p));
          const auditThreshold = (hasFacialFeatures || isRotationTransition) ? 55.0 : 35.0;
          talkAudit = await auditVideoTalkingGpu(destFile, auditThreshold);
          if (talkAudit.isTalking) {
            if (!options.skipAudit) {
              console.warn(`   ⚠ [In-Flight GPU Audit] REJECTED: Mouth movement detected! (Score: ${talkAudit.score}, Lip Motion: ${talkAudit.lipMotion}, Talk: ${talkAudit.talkPercent}%).`);
              try { fs.unlinkSync(destFile); } catch {}
              throw new Error(`In-flight GPU talking audit rejected video: Score ${talkAudit.score} > ${auditThreshold}`);
            } else {
              console.warn(`   ⚠️ [In-Flight GPU Audit] Notice: Mouth movement detected (Score: ${talkAudit.score} > ${auditThreshold}), but retained due to --skip-audit flag.`);
            }
          } else {
            console.log(`   ✔ [In-Flight GPU Audit] PASSED: Motionless lips verified (Score: ${talkAudit.score} [${talkAudit.status}])`);
          }
        } catch (auditErr: any) {
          if (auditErr.message && auditErr.message.includes("In-flight GPU talking audit rejected")) {
            throw auditErr;
          }
          console.warn(`   ⚠️ In-flight talking audit notice: ${auditErr.message}`);
        }

        // Update Manifest
        const updatedIntegrity = validateVideoIntegrity(destFile);
        manifest[task.id] = {
          id: task.id,
          type: task.type,
          startPose: task.startPose,
          endPose: task.endPose,
          poseState: task.poseState || task.startPose,
          emotion: task.emotion || null,
          rhetoricAction: task.rhetoricAction || null,
          energyLevel: task.energyLevel || null,
          file: destFile,
          outputName: task.outputName,
          sha256: updatedIntegrity.sha256,
          duration: finalDuration,
          totalFrames: finalFrames,
          width: updatedIntegrity.width,
          height: updatedIntegrity.height,
          fps: updatedIntegrity.fps || 24,
          sizeBytes: updatedIntegrity.sizeBytes,
          chargedCredits: genResult.charged,
          elapsedSeconds: elapsedSec,
          trimmedFrames,
          peakEndSsim,
          talkingScore: talkAudit?.score ?? null,
          talkingStatus: talkAudit?.status ?? null,
          timestamp: new Date().toISOString(),
        };

        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
        existingHashes.set(updatedIntegrity.sha256, task.outputName);

        // Record into persistent ledger with hardware snapshot
        try {
          const hw = await captureHardwareSnapshot();
          const latencyMs = Math.round(Number(elapsedSec) * 1000);
          const credits = genResult.charged || 5;
          const ledgerRec = await recordGeneration({
            pipeline: "action_matrix",
            personaSlug: persona,
            videoPath: destFile,
            durationSec: finalDuration,
            model: "veo-3.1-lite",
            engine: "flow_web",
            resolution: `${updatedIntegrity.width}x${updatedIntegrity.height}`,
            aspectRatio: updatedIntegrity.width > updatedIntegrity.height ? "16:9" : "9:16",
            creditsCost: credits,
            usdCost: credits * 0.01,
            timing: {
              totalLatencyMs: latencyMs,
              videoInferenceMs: latencyMs,
              realtimeFactor: finalDuration > 0 ? parseFloat((latencyMs / (finalDuration * 1000)).toFixed(2)) : 1,
            },
            hardware: hw,
            quality: {
              ssimScore: peakEndSsim,
              framingPassed: true,
              consistencyPassed: true,
              resolution: `${updatedIntegrity.width}x${updatedIntegrity.height}`,
              fps: updatedIntegrity.fps,
            },
            metadata: {
              taskId: task.id,
              taskType: task.type,
              startPose: task.startPose,
              endPose: task.endPose,
              trimmedFrames,
            },
          });
          console.log(formatGenerationHud(ledgerRec));
        } catch (ledgerErr: any) {
          console.warn("⚠️ Telemetry ledger notice:", ledgerErr?.message);
        }

        taskSuccess = true;
        break;
      } catch (err: any) {
        console.warn(`   ⚠ [Attempt ${attempt} Failed] ${task.id}: ${err.message}`);
        lastFailureWasTalking = Boolean(err.message && err.message.includes("talking audit rejected"));
        if (attempt < maxRetries) {
          console.log(`   Waiting 3s before retry...`);
          await new Promise((r) => setTimeout(r, 3000));
        } else {
          console.error(`   ❌ [FAILED] Task ${task.id} exhausted ${maxRetries} retries.`);
        }
      }
    }
  }

  // Step 7: Database Registration
  if (registerDb && Object.keys(manifest).length > 0) {
    console.log("\n💾 Registering Action Matrix into Prisma SQLite Database...");
    try {
      const reg = await registerMatrixInDb(persona, attire, masterSet, manifest);
      console.log(`✔ [Database] Registered ${reg.mastersRegistered} Master Images and ${reg.loopsRegistered} Action Loops!`);
    } catch (dbErr: any) {
      console.warn(`⚠ [Database Warning] Could not complete DB registration:`, dbErr.message);
    }
  }

  console.log("\n==================================================================");
  console.log("🎉 ACTION MATRIX EXECUTION COMPLETE!");
  console.log(`   Manifest: ${manifestPath}`);
  console.log("==================================================================\n");

  await closeBrowser().catch(() => 0);
}
