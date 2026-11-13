/**
 * scripts/veo-cli/promptCompiler.ts
 *
 * Cinematic prompt compilation engine for Google Veo Video Diffusion & Google Flow.
 * Implements dynamic duration equations, secondary physical dynamics (hair inertia,
 * garment drape), broadcast gesticulation in front of torso, ocular emotional modeling,
 * and strict closed-mouth lip-sync readiness contracts.
 */

import { ActionPoseState, FlowMotionMode, FlowEmotionType, DualAnchorParticipant, AspectRatioType } from "./types";
import { CameraMotionPreset, CAMERA_MOTION_PRESETS } from "./cameraMotionPresets";
import { filterPromptForSafety } from "../../src/lib/ecommerce/promptSafetyFilter";
import path from "path";

export interface IdleBeatCompileOptions {
  pose: ActionPoseState;
  personaName?: string;
  cameraPreset?: CameraMotionPreset;
  chromaMode?: "green" | "blue" | "studio";
  durationSeconds?: number;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  characterTag?: string;
  attire?: string;
  hairStyle?: string;
  motionMode?: FlowMotionMode;
  emotion?: FlowEmotionType | string;
  variationIndex?: number;
  identityClause?: string;
}

export interface PoseTransitionCompileOptions {
  fromPose: ActionPoseState;
  toPose: ActionPoseState;
  personaName?: string;
  motionPacing?: "natural_deliberate" | "dynamic_emphasis" | "subtle_recovery";
  cameraPreset?: CameraMotionPreset;
  durationSeconds?: number;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  characterTag?: string;
  attire?: string;
  hairStyle?: string;
}

/**
 * Auto-detects whether an image or outfit uses green chroma, blue chroma, or studio background.
 */
export function detectImageChromaMode(imagePath?: string): "green" | "blue" | "studio" {
  if (!imagePath) return "green";
  const lower = path.basename(imagePath).toLowerCase();
  if (lower.includes("blue") || lower.includes("chroma_blue")) return "blue";
  if (lower.includes("green") || lower.includes("chroma_green") || lower.includes("chroma_wall")) return "green";
  if (lower.includes("studio") || lower.includes("desk") || lower.includes("living_studio")) return "studio";
  return "green";
}

/**
 * Helper: Builds secondary long hair dynamics
 */
export function buildHairDynamicsClause(hairStyle?: string): string {
  const desc = hairStyle ? hairStyle.toLowerCase() : "";
  const isLongOrWavy = desc.includes("long") || desc.includes("wavy") || desc.includes("shoulder") || desc.includes("locks") || desc.includes("curls");
  
  if (isLongOrWavy) {
    return "Natural kinetic hair dynamics: hair strands and locks gently sway and bounce with realistic soft inertia in response to head turns and body weight shifts, reacting to subtle studio airflow.";
  }
  return "Natural hair stability with organic micro-movement and crisp separation.";
}

/**
 * Helper: Builds realistic garment and fabric kinematics
 */
export function buildAttireDynamicsClause(attire?: string): string {
  const outfit = attire || "tailored executive broadcast blazer over crisp top";
  return `Realistic garment and fabric kinematics: Wearing ${outfit}. Fabric drape, blazer lapels, and collar tension react organically to shoulder movement and arm gestures with realistic natural micro-creasing.`;
}

/**
 * Helper: The Universal Silent Lip-Sync Readiness Contract
 */
export function buildSilentLipSyncClause(): string {
  return "Mouth completely shut, lips tightly sealed together and motionless throughout, still jaw, neutral motionless facial expression, motionless lips pressed closed, non-speaking silent subject. Pure non-speaking broadcast template ready for downstream neural audio lip-sync.";
}

/**
 * Helper: Universal Negative Constraints
 */
export function buildNegativeConstraints(allowSpeaking: boolean = false): string {
  return "Negative Constraints: (no extra fingers:1.6), (no hand warping:1.6), (no deformed hands:1.6), (no missing fingers:1.6), (no background color shifts:1.5), (no moving shadows:1.5), (no lighting flicker:1.5).";
}

/**
 * Helper: Format clause based on aspect ratio
 */
function getFormatClause(ratio: string = "9:16"): string {
  if (ratio === "16:9") {
    return "Widescreen 16:9 broadcast landscape format (1920x1080). Maintain exact 16:9 aspect ratio.";
  }
  if (ratio === "1:1") {
    return "Square 1:1 video format (1080x1080). Maintain exact 1:1 aspect ratio.";
  }
  return "Vertical 9:16 portrait format (1080x1920). Maintain exact 9:16 aspect ratio matching reference framing with zero distortion.";
}

/**
 * Helper: Backdrop clause
 */
function getBackdropClause(chroma: "green" | "blue" | "studio" = "green", duration: number = 8): string {
  if (chroma === "blue") {
    return `Solid pure chroma blue screen studio background (#0000FF / flat chromakey blue). CHROMA WALL CONSTANCY: The chroma blue background color, luminance, and saturation must remain 100% CONSTANT, UNIFORM, and TIME-INVARIANT across every single frame from 0.0s to ${duration}.0s with zero color shifting, zero lighting flicker, and no moving shadows.`;
  }
  if (chroma === "studio") {
    return "High-end television news broadcast studio set with soft blurred blue twilight skyline and subtle desk reflections.";
  }
  return `Solid pure chroma green screen studio background (#00FF00 / #00B140 / flat chromakey green). CHROMA WALL CONSTANCY: The chroma green background color, luminance, and saturation must remain 100% CONSTANT, UNIFORM, and TIME-INVARIANT across every single frame from 0.0s to ${duration}.0s with zero color shifting, zero lighting flicker, and no moving shadows on the green backdrop.`;
}

/**
 * Compiles a Subtle Idle Beat Video Prompt (P_A -> P_A)
 * Dynamic timing: 4s or 8s self-closing seamless loop
 */
export function compileSubtleIdlePrompt(opts: IdleBeatCompileOptions): string {
  const name = opts.personaName || "news presenter";
  const chroma = opts.chromaMode || "green";
  const duration = opts.durationSeconds || 8;
  const ratio = opts.aspectRatio || "9:16";
  const tagPrefix = opts.characterTag ? `${opts.characterTag} ` : "";

  // Dynamic time bracket calculation
  const tStartLock = duration >= 8 ? "1.0" : "0.5";
  const tMid = duration >= 8 ? "5.0" : "2.5";
  const tReturn = duration >= 8 ? "7.0" : "3.5";

  const backdropClause = getBackdropClause(chroma, duration);
  const backdropShort = chroma === "blue" ? "flat blue chroma backdrop" : chroma === "studio" ? "broadcast newsroom studio set" : "flat green chroma backdrop";
  const hasDesk = opts.pose.requiresDesk;
  const deskClause = hasDesk
    ? (chroma === "studio"
        ? "Seated upright behind a modern newsroom glass broadcast desk with silver laptop, resting hands naturally on the desk surface."
        : "Seated upright behind a flat seamless chroma desk plate against the solid chroma backdrop with zero floor shadows, resting hands naturally on the desk surface.")
    : `Standing against a ${backdropShort} with no desk or furniture.`;

  const vIndex = opts.variationIndex || 1;
  let motionTrajectory = opts.pose.motionPrompt;
  if (vIndex === 2) {
    motionTrajectory = "Subtle analytical head tilt with attentive eye gaze shift, deep natural chest breathing, and confident anchor composure.";
  } else if (vIndex === 3) {
    motionTrajectory = "Calm posture settle with gentle eye crinkle, subtle weight transfer, and relaxed shoulder breathing rhythm.";
  }

  const idText = opts.identityClause ? `(${opts.identityClause}) ` : "";
  const prompt = [
    `${tagPrefix}Cinematic video of ${name} ${idText}in a ${duration}-second seamless idle loop.`,
    `CRITICAL ZERO-DRIFT SEAMLESS LOOP: Initial frame (0.0s) and final frame (${duration}.0s) must be 100% IDENTICAL in posture, head tilt, eye gaze direction, closed-lip pleasant smile, arm and hand placement, wardrobe drape, and background tone. ${deskClause}`,
    `Kinematic Motion Trajectory:`,
    `- [0.0s - ${tStartLock}s]: Locked motionless in starting reference image pose and closed-lip expression.`,
    `- [${tStartLock}s - ${tMid}s]: Natural subtle chest breathing, gentle weight shift, ${motionTrajectory}.`,
    `- [${tMid}s - ${tReturn}s]: Fluidly and smoothly returns arms, head, and posture along exact trajectory back toward starting frame.`,
    `- [${tReturn}s - ${duration}.0s]: Settles completely and locks motionless into EXACT starting frame with closed lips and identical smile for a seamless zero jump-cut infinite loop.`,
    `Format & Framing: ${getFormatClause(ratio)}`,
    buildAttireDynamicsClause(opts.attire),
    buildHairDynamicsClause(opts.hairStyle),
    buildSilentLipSyncClause(),
    `NATURAL FACIAL EXPRESSION & GAZE: Articulates gentle engaging eye gaze, soft blinks, and subtle eyebrow poises, returning smoothly to exact gaze and closed-lip smile by ${duration}.0s.`,
    `Lighting & Exposure: Locked professional studio lighting with zero flicker. 100% CONSTANT exposure and color temperature across all frames from 0.0s to ${duration}.0s.`,
    buildNegativeConstraints(),
    `Background: ${backdropClause}`,
    `Quality: Professional studio lighting, sharp portrait focus, clean frame with zero text and no watermarks, smooth 30fps.`,
  ].join(" ");

  return prompt;
}

/**
 * Compiles an Active Articulation Video Prompt (8s)
 * Presenter performs conversational hand/arm gestures in front of the chest/torso,
 * acting like talking passionately with mouth closed.
 */
export function compileActiveDeliveryPrompt(opts: IdleBeatCompileOptions): string {
  const name = opts.personaName || "news presenter";
  const chroma = opts.chromaMode || "green";
  const duration = opts.durationSeconds || 8;
  const ratio = opts.aspectRatio || "9:16";
  const tagPrefix = opts.characterTag ? `${opts.characterTag} ` : "";

  const tStartLock = duration >= 8 ? "1.0" : "0.5";
  const tMid = duration >= 8 ? "5.5" : "2.5";
  const tReturn = duration >= 8 ? "7.2" : "3.5";

  const backdropClause = getBackdropClause(chroma, duration);
  const backdropShort = chroma === "blue" ? "flat blue chroma backdrop" : chroma === "studio" ? "broadcast studio" : "flat green chroma backdrop";
  const hasDesk = opts.pose.requiresDesk;
  const deskClause = hasDesk
    ? (chroma === "studio"
        ? "Seated behind a modern curved glass broadcast desk with laptop and microphone, one hand resting naturally on the desk surface while the other emphasizes key points."
        : "Seated behind a seamless flat chroma desk plate against the solid chroma backdrop with zero floor shadows, hands resting naturally on the desk surface.")
    : `Standing against a ${backdropShort} with zero props and no desk.`;

  const vIndex = opts.variationIndex || 1;
  let gesticulationDesc = "The presenter performs dynamic, natural conversational hand and arm gestures held comfortably in front of the chest and torso—open palms, explanatory hand emphasis, rhythmic cadence—acting as though delivering an authoritative, compelling news story.";
  if (vIndex === 2) {
    gesticulationDesc = "The presenter performs an expansive two-handed dimensional framing gesture in front of the chest, open palms gently separating and gesturing outward in balanced rhythmic presentation cadence.";
  } else if (vIndex === 3) {
    gesticulationDesc = "The presenter performs a subtle clasped-to-expressive shift: starting with hands clasped, right hand lifts into a delicate explanatory counting gesture with finger articulation, while head nods with warm affirmative emphasis.";
  }

  const idText = opts.identityClause ? `(${opts.identityClause}) ` : "";
  return [
    `${tagPrefix}Cinematic broadcast video of ${name} ${idText}delivering an active, high-impact presentation in a ${duration}-second seamless loop.`,
    `ACTIVE BROADCAST GESTICULATION (VARIATION ${vIndex}): ${gesticulationDesc}`,
    `Kinematic Motion Trajectory:`,
    `- [0.0s - ${tStartLock}s]: Begins from resting reference pose and engaging closed-lip smile.`,
    `- [${tStartLock}s - ${tMid}s]: Hands smoothly rise in front of torso into active presentation delivery. Natural head nods emphasize key points, torso exhibits realistic weight transfer, ${opts.pose.motionPrompt}.`,
    `- [${tMid}s - ${tReturn}s]: Fluidly decelerates and transitions hands and posture back along the identical arc toward the starting position.`,
    `- [${tReturn}s - ${duration}.0s]: Settles completely and locks motionless into the exact starting frame with closed lips for zero jump-cut infinite looping.`,
    `Format & Framing: ${getFormatClause(ratio)}`,
    buildAttireDynamicsClause(opts.attire),
    buildHairDynamicsClause(opts.hairStyle),
    buildSilentLipSyncClause(),
    `Environment: ${deskClause}`,
    `Lighting & Exposure: Locked professional studio lighting with zero temporal flicker from 0.0s to ${duration}.0s.`,
    buildNegativeConstraints(),
    `Background: ${backdropClause}`,
    `Quality: Crisp 1080p, sharp hands, defined fingers with zero anatomical distortion, smooth 30fps.`,
  ].join(" ");
}

/**
 * Compiles a Forward-Only Articulation Video Prompt (8s)
 * Progressive unidirectional motion from rest into full expansive delivery,
 * optimized for post-process Palindromic Concatenation (0s -> 8s -> 0s = 16s seamless loop).
 */
export function compileForwardArticulationPrompt(opts: IdleBeatCompileOptions): string {
  const name = opts.personaName || "news presenter";
  const chroma = opts.chromaMode || "green";
  const duration = opts.durationSeconds || 8;
  const ratio = opts.aspectRatio || "9:16";
  const tagPrefix = opts.characterTag ? `${opts.characterTag} ` : "";
  const idText = opts.identityClause ? `(${opts.identityClause}) ` : "";

  const backdropClause = getBackdropClause(chroma, duration);

  return [
    `${tagPrefix}Cinematic broadcast video of ${name} ${idText}executing a continuous, progressive forward gesture articulation over ${duration} seconds.`,
    `UNIDIRECTIONAL FORWARD ARTICULATION (REVERSIBLE CYCLE): The motion progresses continuously forward without returning or snapping back during the clip.`,
    `Kinematic Progression:`,
    `- [0.0s - 1.0s]: Presenter starts in calm resting stance, neutral hands, closed-lip pleasant expression.`,
    `- [1.0s - 4.5s]: Hands smoothly elevate in front of the torso into active conversational broadcast gestures, open palms presenting and explaining. Natural head tilt and subtle posture lean.`,
    `- [4.5s - ${duration}.0s]: Expands into full confident presentation posture, expressive hand emphasis at mid-chest height, authoritative head nod, settling into an open explanatory pose at ${duration}.0s.`,
    `Format & Framing: ${getFormatClause(ratio)}`,
    buildAttireDynamicsClause(opts.attire),
    buildHairDynamicsClause(opts.hairStyle),
    buildSilentLipSyncClause(),
    `Lighting & Studio: 100% constant illumination, zero flicker, static exposure.`,
    buildNegativeConstraints(),
    `Background: ${backdropClause}`,
    `Quality: Hyper-photorealistic broadcast quality, clear fingers, crisp textures, smooth 30fps.`,
  ].join(" ");
}

/**
 * Compiles an Emotional Expression Video Prompt (8s)
 * Targets ocular micro-expressions and brow articulators (warm, breaking, skeptical, empathetic).
 */
export function compileEmotionalExpressionPrompt(opts: IdleBeatCompileOptions): string {
  const name = opts.personaName || "news presenter";
  const chroma = opts.chromaMode || "green";
  const duration = opts.durationSeconds || 8;
  const ratio = opts.aspectRatio || "9:16";
  const tagPrefix = opts.characterTag ? `${opts.characterTag} ` : "";
  const emotion = opts.emotion || "warm_approachable";

  let emotionClause = "Warm approachable demeanor, subtle Duchenne crinkling at the outer eye corners, friendly head tilt, closed-lip warm smile.";
  if (emotion === "authoritative_breaking" || emotion === "breaking") {
    emotionClause = "High-alert breaking news demeanor, intense focused gaze, subtle brow furrow conveying gravity and urgency, resolute broadcast posture.";
  } else if (emotion === "skeptical_investigative" || emotion === "skeptical") {
    emotionClause = "Discerning investigative demeanor, subtle one-sided eyebrow raise, analytical eye squint, slight head tilt conveying journalistic skepticism.";
  } else if (emotion === "empathetic_serious" || emotion === "empathetic") {
    emotionClause = "Empathetic, compassionate expression, softened brow, slight forward lean, caring and reassuring gaze.";
  } else if (emotion === "confident_anchor" || emotion === "confident") {
    emotionClause = "Unshakeable executive confidence, direct assertive eye contact, elevated chin posture, poised charismatic authority.";
  }

  const backdropClause = getBackdropClause(chroma, duration);

  return [
    `${tagPrefix}Cinematic close/medium portrait of ${name} in a ${duration}-second seamless emotional expression loop.`,
    `OCULAR & FACIAL MICRO-EXPRESSION FOCUS: ${emotionClause}`,
    `Kinematic Motion Trajectory:`,
    `- [0.0s - 1.0s]: Neutral poised starting expression.`,
    `- [1.0s - 5.0s]: Subtle, authentic facial micro-expressions emerge across the eyes, eyebrows, and cheek muscles. Subtle head tilt and chest breathing, ${opts.pose.motionPrompt}.`,
    `- [5.0s - 7.0s]: Gracefully softens expression, eyes and brow smoothly returning toward starting baseline.`,
    `- [7.0s - ${duration}.0s]: Settles completely into starting expression and closed-lip smile for a seamless loop.`,
    `Format & Framing: ${getFormatClause(ratio)}`,
    buildAttireDynamicsClause(opts.attire),
    buildHairDynamicsClause(opts.hairStyle),
    buildSilentLipSyncClause(),
    `Lighting: High-definition beauty lighting capturing natural eye catchlights, skin subsurface scattering, and locked exposure.`,
    buildNegativeConstraints(),
    `Background: ${backdropClause}`,
    `Quality: 8k portrait clarity, sharp iris detail, zero blur, smooth 30fps.`,
  ].join(" ");
}

/**
 * Compiles a Character Turnaround Sheet Prompt (Front, 45° Left, 45° Right, Profile)
 */
export function compileTurnaroundSheetPrompt(opts: {
  personaName: string;
  characterTag?: string;
  attire?: string;
  hairStyle?: string;
  aspectRatio?: "16:9" | "9:16" | "1:1";
  chromaMode?: "green" | "blue";
}): string {
  const tagPrefix = opts.characterTag ? `${opts.characterTag} ` : "";
  const chroma = opts.chromaMode || "green";
  const bg = chroma === "blue" ? "solid pure chroma blue #0000FF background" : "solid pure chroma green #00FF00 background";
  const ratio = opts.aspectRatio || "16:9";

  return [
    `${tagPrefix}Professional multi-angle character turnaround reference sheet of ${opts.personaName}.`,
    `Framing: 4 distinct full-body views arranged horizontally side-by-side in a single frame: 1) Full-body direct front view, 2) 45-degree three-quarter left turn, 3) 45-degree three-quarter right turn, 4) Pure side profile view.`,
    `Wardrobe: ${opts.attire || "Tailored executive broadcast blazer over crisp top"}.`,
    `Hair & Identity: ${opts.hairStyle || "Professional broadcast hairstyle"}. Identical facial features, height, and proportions across all 4 angles.`,
    `Pose & Expression: Professional standing broadcast stance, hands resting comfortably at sides, pleasant closed-lip neutral expression.`,
    `Format: ${getFormatClause(ratio)}`,
    `Background: Flat uniform ${bg} with zero floor shadows and no furniture.`,
    `Lighting: Flat, even 360-degree studio illumination with clean edges, sharp contour separation, and no watermarks.`,
  ].join(" ");
}

/**
 * Compiles a 4-second or 8-second First-Last Frame (FLF) pose transition prompt (P_A -> P_B)
 */
export function compilePoseTransitionPrompt(opts: PoseTransitionCompileOptions): string {
  const name = opts.personaName || "professional presenter";
  const chroma = (opts as any).chromaMode || "green";
  const duration = opts.durationSeconds || 8;
  const ratio = opts.aspectRatio || "9:16";
  const tagPrefix = opts.characterTag ? `${opts.characterTag} ` : "";

  const pacingDesc = opts.motionPacing === "dynamic_emphasis"
    ? "confident, decisive gesture with deliberate hand acceleration"
    : opts.motionPacing === "subtle_recovery"
    ? "gentle, relaxed return transition smoothly settling back into position"
    : "fluid, natural delivery pacing with realistic skeletal kinematics";

  const backdropClause = getBackdropClause(chroma, duration);

  const tStart = duration >= 8 ? "1.5" : "1.0";
  const tEnd = duration >= 8 ? "6.5" : "2.5";

  return [
    `${tagPrefix}Cinematic video of a smooth ${duration}-second kinematic pose transition connecting the two attached reference images.`,
    `First & Last Frame Image Locks:`,
    `- Image 1 (Starting Frame at 0.0s): Must begin in the exact pose, posture, and expression shown in the first attached image (${opts.fromPose.label} — ${opts.fromPose.description}).`,
    `- Image 2 (Final Target Frame at ${duration}.0s): Must end completely settled in the exact pose, posture, and hand position shown in the second attached image (${opts.toPose.label} — ${opts.toPose.description}).`,
    `Kinematic Motion Trajectory:`,
    `- [0.0s - ${tStart}s]: Begins in Image 1 pose. Presenter initiates natural arm, wrist, and shoulder movement with realistic anatomical acceleration.`,
    `- [${tStart}s - ${tEnd}s]: Fluidly articulates arms and fingers in front of torso, transitioning smoothly toward Image 2 gesture with ${pacingDesc}. Natural head orientation and gaze shift accompany the motion without warping.`,
    `- [${tEnd}s - ${duration}.0s]: Gracefully decelerates and locks firmly into Image 2 pose. Posture and fingers settle into place with zero overshoot or vibration.`,
    `Format & Framing: ${getFormatClause(ratio)}`,
    buildAttireDynamicsClause(opts.attire),
    buildHairDynamicsClause(opts.hairStyle),
    buildSilentLipSyncClause(),
    `Environment & Studio: Standing in place against ${backdropClause} with no desk or furniture.`,
    `Lighting & Exposure: Locked studio lighting with zero flicker across all frames from 0.0s to ${duration}.0s.`,
    buildNegativeConstraints(),
    `Quality: Professional studio lighting, sharp portrait focus, clean frame with zero text and no watermarks, smooth 30fps.`,
  ].join(" ");
}

/**
 * Compiles a 3-Camera Array Video Shot prompt
 */
export function compileCameraArrayPrompt(opts: {
  camNumber: 1 | 2 | 3;
  pose: ActionPoseState;
  personaName?: string;
  isChroma?: boolean;
}): string {
  const name = opts.personaName || "news presenter";
  const camConfigs = {
    1: {
      angle: "Center 0° Dead Center Wide",
      framing: "Medium-wide waist-up master shot showing center desk width (35mm lens)",
      lens: "35mm broadcast studio camera lens",
      role: "A-camera master anchor shot",
      motion: "Addressing full audience, calm authoritative delivery, hands clasped neatly at center desk",
    },
    2: {
      angle: "Left 20° Perspective Tight Medium",
      framing: "Waist-up framing from a distinct 20-degree left perspective angle (50mm lens)",
      lens: "50mm portrait broadcast camera with realistic parallax depth",
      role: "B-camera core story delivery and rundown",
      motion: "Turned smoothly to Camera 2, delivering core story, right hand active near laptop keyboard referencing notes, left hand resting on glass desk",
    },
    3: {
      angle: "Right Slash 35° Dramatic Close-Up",
      framing: "True tight chest-up close-up framing with hands strictly below frame (85mm telephoto lens)",
      lens: "85mm f/1.4 prime telephoto lens with shallow depth of field cinematic bokeh",
      role: "C-camera breaking news punchlines and reveals",
      motion: "Turned to Camera 3 with dramatic 35-degree right slash perspective, dimensional profile lighting and golden rim lighting, delivering high-impact punchline with lips parted speaking, hands resting completely below frame",
    },
  };

  const cfg = camConfigs[opts.camNumber];
  const bg = opts.isChroma
    ? "Solid pure chroma green screen studio background (#00FF00)."
    : "Panoramic broadcast newsroom studio set with curved glass desk and twilight skyline.";

  return [
    `Hyper-photorealistic 1080p television broadcast shot of ${name} at Camera ${opts.camNumber} (${cfg.angle}).`,
    `Framing & Optics: Shot on ${cfg.lens}, ${cfg.framing}.`,
    `Action: ${cfg.motion}.`,
    `Background: ${bg}`,
    `Quality: Professional 3-point studio lighting, crisp hair separation, natural skin pores, 30fps fluid broadcast video.`,
  ].join(" ");
}

/**
 * Compiles a Cinematic B-Roll video prompt
 */
export function compileCinematicBrollPrompt(opts: {
  topic: string;
  cameraMotion: CameraMotionPreset;
  lightingStyle?: string;
}): string {
  const lighting = opts.lightingStyle || "cinematic golden hour with volumetric atmosphere";
  return [
    `Cinematic 1080p broadcast television B-roll footage of ${opts.topic}.`,
    `Camera Cinematography: ${opts.cameraMotion.promptPhrase}`,
    `Lighting & Atmosphere: ${lighting}.`,
    `Style & Optics: 8k resolution, raw photo quality, shot on 35mm master prime lens, natural motion blur, hyper-detailed realism, 30fps.`,
  ].join(" ");
}

export interface ChainedBeatCompileOptions {
  personaName: string;
  characterTag?: string;
  attire?: string;
  hairStyle?: string;
  aspectRatio?: AspectRatioType;
  chromaMode?: "green" | "blue" | "studio";
  durationSeconds?: number;
  beatIndex: number;
  totalBeats: number;
  beatType: "intro_hook" | "active_speech" | "data_explanation" | "graphic_reference" | "seated_desk" | "conclusion_outro";
  emotion?: string;
  pipSide?: "right" | "left";
  cameraAngle?: "cam1" | "cam2" | "cam3";
  isFirstBeat?: boolean;
  isFinalBeat?: boolean;
  hasDesk?: boolean;
}

/**
 * Compiles a Chained Sequence Beat Prompt with Kinematic Seam Hand-off
 */
export function compileChainedBeatPrompt(opts: ChainedBeatCompileOptions): string {
  const name = opts.personaName || "news anchor";
  const tagPrefix = opts.characterTag ? `${opts.characterTag} ` : "";
  const chroma = opts.chromaMode || "green";
  const duration = opts.durationSeconds || 8;
  const ratio = opts.aspectRatio || "9:16";
  const pipSide = opts.pipSide || "right";

  let trajectoryDescription = "";
  if (opts.beatType === "intro_hook") {
    trajectoryDescription = "Presenter delivers high-impact opening hook. Hands rise smoothly from rest to mid-chest in an open welcoming gesture, head nod on key words, direct commanding eye contact.";
  } else if (opts.beatType === "data_explanation") {
    trajectoryDescription = "Presenter articulates analytical explanation. Right hand gestures in precise counting and dimensional framing motions, head tilted slightly in thoughtful emphasis.";
  } else if (opts.beatType === "graphic_reference") {
    trajectoryDescription = `Presenter gestures toward virtual on-screen graphics. Turns head 15 degrees toward the upper-${pipSide} quadrant, smoothly lifts ${pipSide === "right" ? "right" : "left"} hand in an open-palm presentation gesture referencing the virtual screen zone for 2.5 seconds, then smoothly returns direct eye gaze forward to the camera lens.`;
  } else if (opts.beatType === "seated_desk") {
    trajectoryDescription = "Seated behind the broadcast desk, right hand lifts from the desk surface to emphasize key metrics while left hand rests steady near laptop, returning hand gently to desk.";
  } else if (opts.beatType === "conclusion_outro") {
    trajectoryDescription = "Presenter concludes story. Hands smoothly guide back to a centered resting position, expression blooming into a gracious closed-lip sign-off smile with an affirmative parting head nod.";
  } else {
    trajectoryDescription = "Active presentation delivery. Dynamic, conversational hand gestures held comfortably in front of the chest and torso, expressive wrist articulation, head nods keeping broadcast cadence.";
  }

  const startClause = opts.isFirstBeat
    ? `- [0.0s - 1.0s]: Starts from resting reference image pose and warm closed-lip smile.`
    : `- [0.0s - 0.6s]: Starts directly and seamlessly from the exact posture, hand height, and closed-lip gaze of the previous clip's ending frame with ZERO jump cut.`;

  const endClause = opts.isFinalBeat
    ? `- [${duration - 1.0}s - ${duration}.0s]: Settles completely and locks motionless in final resting stance with closed lips for clean completion.`
    : `- [${duration - 1.0}s - ${duration}.0s]: Decelerates smoothly into a stable conversational hold at mid-chest height, holding coordinates motionless for seamless recursive handoff into the next clip.`;

  const emotionClause = opts.emotion
    ? `EMOTION & FACIAL PROSODY: ${opts.emotion.replace(/_/g, " ")}. Communicates emotional weight through attentive eye gaze, subtle eyebrow poise, and composed expression.`
    : `FACIAL PROSODY: Engaging, authoritative anchor composure with pleasant closed-lip expression.`;

  const deskClause = opts.hasDesk
    ? (chroma === "studio"
        ? "Seated behind a modern curved glass newsroom broadcast desk with silver laptop."
        : "Seated behind a flat seamless chroma desk plate against the solid chroma backdrop with zero floor shadows.")
    : "Standing against solid chroma backdrop with no furniture or props.";

  return [
    `${tagPrefix}Cinematic broadcast video of ${name} (Part ${opts.beatIndex} of ${opts.totalBeats}).`,
    `CONTINUOUS SEQUENCE BEAT: ${trajectoryDescription}`,
    `Seam & Motion Trajectory:`,
    startClause,
    `- [${opts.isFirstBeat ? "1.0" : "0.6"}s - ${duration - 1.0}s]: ${trajectoryDescription}`,
    endClause,
    `Format & Framing: ${getFormatClause(ratio)}`,
    buildAttireDynamicsClause(opts.attire),
    buildHairDynamicsClause(opts.hairStyle),
    buildSilentLipSyncClause(),
    emotionClause,
    `Environment: ${deskClause}`,
    `Lighting & Exposure: Locked professional studio lighting with zero temporal flicker from 0.0s to ${duration}.0s.`,
    buildNegativeConstraints(),
    `Background: ${getBackdropClause(chroma, duration)}`,
    `Quality: Crisp 1080p broadcast television quality, clear hands, distinct fingers, smooth 30fps.`,
  ].join(" ");
}

/**
 * Helper: Universal Environment & Custom Set Clause Resolver
 * Seamlessly integrates user-supplied studio plates, virtual news desks, and outdoor locations.
 */
export function resolveEnvironmentClause(
  envImage?: string,
  hasDesk?: boolean,
  defaultChroma: "green" | "blue" | "studio" = "green",
  duration: number = 8
): string {
  if (envImage) {
    const envBase = path.basename(envImage);
    const deskNote = hasDesk
      ? "seated directly behind the foreground broadcast news desk plate shown in the environment reference image, with hands resting cleanly on desk surface"
      : "standing naturally positioned within the environment space, with accurate perspective and shadows cast onto the floor";
    return `ENVIRONMENT REFERENCE IMAGE: Anchors are composed precisely into the real-world broadcast studio set from attached reference image [${envBase}]. ${deskNote}. Matched camera perspective, natural desk surface reflections, rim lighting, and atmospheric depth from the reference plate.`;
  }
  if (hasDesk) {
    if (defaultChroma === "studio") {
      return "Seated behind a modern curved glass newsroom broadcast desk with silver laptop and studio twilight skyline.";
    }
    return "Seated behind a flat seamless chroma desk plate against the solid chroma backdrop with zero floor shadows.";
  }
  return defaultChroma === "studio"
    ? "Standing in modern television broadcast studio with warm ambient set lighting."
    : `Standing against ${getBackdropClause(defaultChroma, duration)} with no furniture or props.`;
}

export interface DualAnchorCompileOptions {
  anchorLeft: DualAnchorParticipant;
  anchorRight: DualAnchorParticipant;
  deskType?: "curved_glass" | "modern_wood" | "sleek_white" | "chroma_desk";
  envImage?: string;
  beatIndex?: number;
  totalBeats?: number;
  chromaMode?: "green" | "blue" | "studio";
  durationSeconds?: number;
  aspectRatio?: "16:9" | "9:16";
  isFirstBeat?: boolean;
  isFinalBeat?: boolean;
}

/**
 * Compiles a Dual-Anchor Broadcast Newsroom Prompt
 * Coordinates active speaker vs active listener micro-dynamics across screen-left and screen-right.
 */
export function compileDualAnchorPrompt(opts: DualAnchorCompileOptions): string {
  const duration = opts.durationSeconds || 8;
  const ratio = opts.aspectRatio || "16:9";
  const chroma = opts.chromaMode || "studio";
  const leftTag = opts.anchorLeft.characterTag || `@${opts.anchorLeft.name}`;
  const rightTag = opts.anchorRight.characterTag || `@${opts.anchorRight.name}`;

  const leftRoleDesc = opts.anchorLeft.role === "speaker"
    ? `ACTIVE CO-ANCHOR SPEAKER: ${leftTag} leads the story delivery with expressive, authoritative chest-height hand gestures, rhythmic head tilts punctuating vocal cadences, and direct camera eye contact with occasional communicative side glances toward co-anchor ${rightTag}. STRICT CLOSED-LIP CONTRACT: lips remain closed throughout entire video, acting like talking with active upper-face prosody.`
    : `ACTIVE LISTENER CO-ANCHOR: ${leftTag} sits in attentive broadcast composure with hands gently clasped on desk. Displays organic active listening micro-nods (5°-8° cadence), head tilted 10° toward speaking partner ${rightTag}, attentive warm eye gaze locked onto ${rightTag}, completely silent with closed lips, zero speaking, no interruption.`;

  const rightRoleDesc = opts.anchorRight.role === "speaker"
    ? `ACTIVE CO-ANCHOR SPEAKER: ${rightTag} leads the story delivery with dynamic, communicative chest-height hand gestures, rhythmic head nods matching broadcast cadence, and engaging direct eye contact with the camera lens, occasionally turning head 15° to engage co-anchor ${leftTag}. STRICT CLOSED-LIP CONTRACT: lips remain closed throughout entire video, acting like talking with active upper-face prosody.`
    : `ACTIVE LISTENER CO-ANCHOR: ${rightTag} sits in attentive broadcast composure with hands resting on desk. Displays realistic active listening micro-nods (5°-8° cadence), upper body angled 10° inward toward speaking partner ${leftTag}, eyes fixed warmly and attentively on ${leftTag}, completely silent with closed lips, zero speaking, no interruption.`;

  const deskClause = resolveEnvironmentClause(opts.envImage, true, chroma, duration);

  const beatLabel = opts.beatIndex && opts.totalBeats ? `(Part ${opts.beatIndex} of ${opts.totalBeats})` : "";

  return [
    `Broadcast television dual-anchor newsroom scene ${beatLabel} featuring ${leftTag} and ${rightTag} seated side by side at the broadcast desk.`,
    `SPATIAL QUADRANT ANCHORING:`,
    `- Screen Left: ${leftTag} (${opts.anchorLeft.name}) wearing ${opts.anchorLeft.attire || "tailored broadcast blazer"}. ${leftRoleDesc}`,
    `- Screen Right: ${rightTag} (${opts.anchorRight.name}) wearing ${opts.anchorRight.attire || "professional dark blazer"}. ${rightRoleDesc}`,
    `CO-ANCHOR DYNAMICS & CHEMISTRY: Natural broadcast turn-taking rapport between the two anchors. Distinct physical separation behind the desk with zero overlapping or clipping.`,
    `Kinematic Seam & Motion Trajectory:`,
    opts.isFirstBeat
      ? `- [0.0s - 1.0s]: Both anchors start from pristine broadcast posture, smiling warmly with closed lips.`
      : `- [0.0s - 0.6s]: Starts seamlessly from previous frame's exact posture and head positions with zero jump cut.`,
    `- [${opts.isFirstBeat ? "1.0" : "0.6"}s - ${duration - 1.0}s]: Active speaker articulates core news point while active listener provides continuous subtle non-verbal agreement and micro-nodding.`,
    opts.isFinalBeat
      ? `- [${duration - 1.0}s - ${duration}.0s]: Both anchors settle in poised, symmetrical broadcast sign-off stance with closed lips.`
      : `- [${duration - 1.0}s - ${duration}.0s]: Decelerates smoothly into a conversational hold for seamless transition to next beat.`,
    `Format & Framing: ${getFormatClause(ratio)}`,
    buildSilentLipSyncClause(),
    `Environment & Studio: ${deskClause}`,
    `Lighting & Exposure: Broadcast studio key and fill lighting balanced across both anchors with zero temporal flicker.`,
    buildNegativeConstraints(),
    `Background: ${opts.envImage ? "Matched to reference environment image plate" : getBackdropClause(chroma, duration)}`,
    `Quality: Ultra-photorealistic 1080p broadcast television quality, clear natural hands and distinct fingers on both anchors, smooth 30fps.`,
  ].join(" ");
}

export interface SatelliteTossCompileOptions {
  studioAnchor: {
    slug: string;
    name: string;
    characterTag?: string;
    attire?: string;
  };
  fieldReporter: {
    slug: string;
    name: string;
    characterTag?: string;
    attire?: string;
    hairStyle?: string;
    locationType?: "outdoor_storm" | "capitol_building" | "financial_street" | "press_conference" | "breaking_scene";
    holdingMic?: boolean;
    hasUmbrella?: boolean;
  };
  phase: "studio_toss" | "split_screen_dve" | "field_report";
  envImage?: string;
  durationSeconds?: number;
  aspectRatio?: "16:9" | "9:16";
  chromaMode?: "green" | "blue" | "studio";
}

/**
 * Compiles an Anchor-to-Field Live Satellite Toss Prompt
 * Handles Studio Anchor tossing to Outdoor Field Reporter with handheld stick mic and weather/street atmosphere.
 */
export function compileSatelliteTossPrompt(opts: SatelliteTossCompileOptions): string {
  const duration = opts.durationSeconds || 8;
  const ratio = opts.aspectRatio || "16:9";
  const anchorTag = opts.studioAnchor.characterTag || `@${opts.studioAnchor.name}`;
  const reporterTag = opts.fieldReporter.characterTag || `@${opts.fieldReporter.name}`;

  if (opts.phase === "studio_toss") {
    const deskClause = resolveEnvironmentClause(opts.envImage, true, "studio", duration);
    return [
      `Television broadcast studio anchor toss scene featuring ${anchorTag} seated at the news desk.`,
      `ACTION TRAJECTORY:`,
      `- [0.0s - 3.5s]: ${anchorTag} looks directly into camera lens delivering high-urgency breaking news introduction with crisp chest-height hand gestures.`,
      `- [3.5s - 5.5s]: ${anchorTag} smoothly turns head and upper body 25 degrees toward the on-screen DVE graphic monitor on screen right, gesturing toward the screen to introduce field reporter ${reporterTag}.`,
      `- [5.5s - ${duration}.0s]: Holds communicative glance toward the DVE monitor zone with an expectant welcoming closed-lip smile.`,
      `Attire & Style: Wearing ${opts.studioAnchor.attire || "tailored executive broadcast blazer"}.`,
      buildSilentLipSyncClause(),
      `Environment: ${deskClause}`,
      `Format & Framing: ${getFormatClause(ratio)}`,
      buildNegativeConstraints(),
      `Quality: 1080p crisp television broadcast, sharp focus, 30fps.`,
    ].join(" ");
  }

  if (opts.phase === "split_screen_dve") {
    return [
      `Broadcast television dual-box DVE split-screen satellite toss composition.`,
      `Left Box (50% frame width): Main studio anchor ${anchorTag} seated in warm studio set, angled 15 degrees right watching the live satellite return monitor.`,
      `Right Box (50% frame width): Live outdoor on-location field reporter ${reporterTag} holding a black broadcast stick microphone at chest level, looking slightly left toward the studio anchor with a professional ready nod.`,
      `Subtle satellite latency dynamic: 0.5-second transmission pause before field reporter begins expressive nodding.`,
      buildSilentLipSyncClause(),
      `Format & Framing: ${getFormatClause(ratio)}`,
      buildNegativeConstraints(),
      `Quality: Broadcast television dual DVE box graphics, sharp separation, clean 30fps.`,
    ].join(" ");
  }

  // Phase: field_report
  let locationAtmosphere = "bustling outdoor metropolitan city street with soft blurred traffic and architectural depth";
  let propClause = "holding a professional black handheld broadcast stick microphone with foam windscreen firmly in right hand at chest height";
  if (opts.fieldReporter.locationType === "outdoor_storm") {
    locationAtmosphere = "outdoor storm location with gusting wind blowing rain droplets and swaying background trees";
    if (opts.fieldReporter.hasUmbrella) {
      propClause += ", left hand holding a large sturdy black weather umbrella shielding from rain";
    }
  } else if (opts.fieldReporter.locationType === "capitol_building") {
    locationAtmosphere = "outdoor press briefing lawn in front of government capitol building columns with soft sunlight";
  } else if (opts.fieldReporter.locationType === "financial_street") {
    locationAtmosphere = "financial district plaza with towering glass skyscrapers and moving pedestrians in soft bokeh";
  }

  const envClause = opts.envImage
    ? `ENVIRONMENT: On-location background matched to attached environment plate [${path.basename(opts.envImage)}].`
    : `ENVIRONMENT: Authentic live outdoor location: ${locationAtmosphere}.`;

  return [
    `Live on-location broadcast field report featuring ${reporterTag} reporting from the field.`,
    `PRESENTER & PROPS: ${reporterTag} standing outdoors, ${propClause}. Wearing ${opts.fieldReporter.attire || "weatherproof dark field reporter trench coat with collar popped"}.`,
    `PHYSICAL DYNAMICS: ${buildHairDynamicsClause(opts.fieldReporter.hairStyle)} Natural outdoor breeze gently rustling coat fabric and hair locks.`,
    `REPORTER GESTURES & CADENCE: Free left hand articulates expressive, urgent field journalism gestures emphasizing facts and developments, while right hand holds microphone steady 4 inches below chin. Confident direct gaze into the camera lens.`,
    buildSilentLipSyncClause(),
    envClause,
    `Format & Framing: ${getFormatClause(ratio)}`,
    buildNegativeConstraints(),
    `Lighting: Natural daylight exterior lighting with subtle battery-powered camera headlamp fill light on reporter face.`,
    `Quality: Premium broadcast ENG field camera footage, realistic rain/wind physics, sharp 1080p, 30fps.`,
  ].join(" ");
}

export interface OtsCompileOptions {
  foregroundHost: {
    slug: string;
    name: string;
    characterTag?: string;
    position: "left" | "right";
  };
  backgroundSpeaker: {
    slug: string;
    name: string;
    characterTag?: string;
    position: "right" | "left";
    attire?: string;
    hairStyle?: string;
    emotion?: string;
  };
  depthOfField?: "shallow_f1.8" | "cinematic_bokeh";
  rackFocus?: boolean;
  envImage?: string;
  durationSeconds?: number;
  aspectRatio?: "16:9" | "9:16";
  chromaMode?: "studio" | "green";
}

/**
 * Compiles an Over-The-Shoulder (OTS) Cinematic Multi-Cam Director Prompt
 * Renders high-end depth framing with foreground shoulder bokeh and sharp mid-ground co-host.
 */
export function compileOtsPrompt(opts: OtsCompileOptions): string {
  const duration = opts.durationSeconds || 8;
  const ratio = opts.aspectRatio || "16:9";
  const fgTag = opts.foregroundHost.characterTag || `@${opts.foregroundHost.name}`;
  const bgTag = opts.backgroundSpeaker.characterTag || `@${opts.backgroundSpeaker.name}`;
  const fgSide = opts.foregroundHost.position;
  const bgSide = opts.backgroundSpeaker.position;

  const focusDesc = opts.rackFocus
    ? `RACK FOCUS TRANSITION: [0.0s - 3.0s] Foreground ${fgTag} shoulder is soft bokeh while background ${bgTag} is sharp. At [3.0s - 4.5s], camera focus racks across the desk to foreground ${fgTag} who turns head, then racks back to ${bgTag} by [6.0s].`
    : `SHALLOW DEPTH OF FIELD (f/1.8): Foreground ${fgTag} shoulder remains in soft creamy bokeh throughout, while ${bgTag} across the desk remains in tack-sharp crisp focus.`;

  const envDesc = resolveEnvironmentClause(opts.envImage, true, opts.chromaMode || "studio", duration);

  return [
    `Cinematic Over-The-Shoulder (OTS) broadcast studio shot featuring ${fgTag} and ${bgTag}.`,
    `FRAMING & DEPTH LAYERING:`,
    `- Foreground Screen ${fgSide.toUpperCase()}: The silhouette and shoulder of ${fgTag} frames the shot in soft, elegant bokeh blur (shallow depth of field f/1.8).`,
    `- Mid-ground Screen ${bgSide.toUpperCase()}: In sharp, crystal-clear focus, ${bgTag} is seated across the modern broadcast desk delivering engaging, animated commentary.`,
    `- Gaze & Engagement: ${bgTag} directs communicative eye contact and expressive hand gestures toward ${fgTag} and the camera, smiling and emphasizing key points with composed head nods.`,
    focusDesc,
    buildAttireDynamicsClause(opts.backgroundSpeaker.attire),
    buildHairDynamicsClause(opts.backgroundSpeaker.hairStyle),
    buildSilentLipSyncClause(),
    `Environment: ${envDesc}`,
    `Format & Framing: ${getFormatClause(ratio)}`,
    buildNegativeConstraints(),
    `Quality: High-end broadcast cinema camera, ARRI Alexa LF aesthetic, shallow 35mm depth of field, 1080p, 30fps.`,
  ].join(" ");
}

export interface CrossfireCompileOptions {
  moderator: { slug: string; name: string; characterTag?: string; attire?: string };
  debaterLeft: { slug: string; name: string; characterTag?: string; attire?: string; stance?: string };
  debaterRight: { slug: string; name: string; characterTag?: string; attire?: string; stance?: string };
  activeSpeaker: "moderator" | "debater_left" | "debater_right";
  envImage?: string;
  durationSeconds?: number;
  aspectRatio?: "16:9";
}

/**
 * Compiles a 3-Way Crossfire Debate Matrix Prompt
 * Triangulates Moderator Center with opposing Left and Right debaters.
 */
export function compileCrossfirePrompt(opts: CrossfireCompileOptions): string {
  const duration = opts.durationSeconds || 8;
  const modTag = opts.moderator.characterTag || `@${opts.moderator.name}`;
  const leftTag = opts.debaterLeft.characterTag || `@${opts.debaterLeft.name}`;
  const rightTag = opts.debaterRight.characterTag || `@${opts.debaterRight.name}`;

  let dynamicsDesc = "";
  if (opts.activeSpeaker === "moderator") {
    dynamicsDesc = `MODERATOR IN COMMAND: At center desk, ${modTag} gestures with open palms moderating the debate, framing the core question and looking back and forth between ${leftTag} and ${rightTag}. Both debaters listen intently with focused debate postures.`;
  } else if (opts.activeSpeaker === "debater_left") {
    dynamicsDesc = `LEFT DEBATER ADVANCING ARGUMENT: On screen left, ${leftTag} leans forward over desk with passionate, assertive hand gestures articulating their case, glancing between moderator ${modTag} and opposing debater ${rightTag}. Opposing debater ${rightTag} reacts with skeptical eyebrow raise and arms clasped.`;
  } else {
    dynamicsDesc = `RIGHT DEBATER COUNTER-ARGUMENT: On screen right, ${rightTag} delivers energetic rebuttal, counting points with right hand and leaning forward. Moderator ${modTag} watches attentively, taking notes on desk tablet. Debater ${leftTag} listens with analytical composure.`;
  }

  const envDesc = resolveEnvironmentClause(opts.envImage, true, "studio", duration);

  return [
    `High-stakes television broadcast 3-way debate crossfire scene featuring Moderator ${modTag}, Debater ${leftTag}, and Debater ${rightTag}.`,
    `TRIANGULAR STUDIO STAGING:`,
    `- Center: Moderator ${modTag} seated at center of circular curved glass panel desk.`,
    `- Screen Left: Debater ${leftTag} wearing ${opts.debaterLeft.attire || "sharp dark suit"}.`,
    `- Screen Right: Debater ${rightTag} wearing ${opts.debaterRight.attire || "tailored executive blazer"}.`,
    `DEBATE DYNAMICS: ${dynamicsDesc}`,
    buildSilentLipSyncClause(),
    `Environment: ${envDesc}`,
    `Format & Framing: ${getFormatClause("16:9")}`,
    buildNegativeConstraints(),
    `Lighting: Dramatic broadcast debate lighting with high-contrast warm key lights and cool blue rim backlighting.`,
    `Quality: 1080p premium news network broadcast quality, crisp anatomical hand details, smooth 30fps.`,
  ].join(" ");
}

export interface ProductInteractionCompileOptions {
  persona: {
    slug: string;
    name: string;
    characterTag?: string;
    attire?: string;
    hairStyle?: string;
  };
  productName: string;
  productImage?: string;
  productCategory?: "cosmetics" | "gadget" | "beverage" | "fashion" | "cpg" | "tech" | "general" | string;
  action: import("./types").ProductActionType | string;
  presentationLevel?: "chest_height" | "macro_insert" | "desk_surface";
  talkingMode?: "silent_lipsync" | "natural_speech";
  hasAudio?: boolean;
  bgmGenre?: string;
  sfxCue?: string;
  envImage?: string;
  chromaMode?: "green" | "blue" | "studio";
  durationSeconds?: number;
  aspectRatio?: "9:16" | "16:9" | "1:1";
}

/**
 * Compiles an E-Commerce Product Showcase & UGC Video Ad Prompt
 * Combines persona presentation with product holding, demonstration, unboxing, or usage.
 * Fully supports physical products, surfaces (flooring/paint/tiles), SaaS/apps, and professional services.
 */
export function compileProductInteractionPrompt(opts: ProductInteractionCompileOptions): string {
  const duration = opts.durationSeconds || 8;
  const ratio = opts.aspectRatio || "9:16";
  const chroma = opts.chromaMode || "studio";
  const tagPrefix = opts.persona.characterTag ? `${opts.persona.characterTag} ` : "";
  const name = opts.persona.name || "presenter";
  const prodName = opts.productName || "featured product";

  let actionDescription = "";
  // 1. Discrete Physical Products
  if (opts.action === "hold_and_present") {
    actionDescription = `Presenter holds the ${prodName} steadily at mid-chest level in both hands, turning it smoothly 15 degrees left and right to allow the studio light to highlight its contours and premium packaging. The brand label faces directly toward the camera lens at all times without fingers obscuring the logo. Direct engaging eye contact, warm enthusiastic smile.`;
  } else if (opts.action === "unbox") {
    actionDescription = `Presenter stands behind desk unboxing the ${prodName}. Hands gently open the sleek packaging box lid, carefully lifting the product out into view at chest height, gazing down with genuine delight before looking up into camera lens with proud approval.`;
  } else if (opts.action === "demo") {
    actionDescription = `Presenter demonstrates the key functionality of ${prodName}. Holds product in left hand while using right index finger to interact with product features, tilting it toward camera to display craftsmanship and finish, smiling affirmatively.`;
  } else if (opts.action === "wear") {
    actionDescription = `Presenter showcases ${prodName} being worn. Gestures gracefully toward the item with open hand, turning slightly to show the fit and elegant design from multiple angles, radiating confidence and style.`;
  } else if (opts.action === "apply") {
    actionDescription = `Presenter demonstrates gentle application of ${prodName}. Dispenses a small drop onto back of hand or fingertips, gently smoothing it with delicate, refined movements while looking into camera with a satisfied, glowing expression.`;
  } else if (opts.action === "side_by_side") {
    actionDescription = `Presenter stands beside ${prodName} resting prominently on the broadcast desk. Gestures with open right palm toward the product in a high-end commercial endorsement, nodding enthusiastically to camera.`;
  }
  // 2. Surfaces, Materials & Flooring (Hardwood, LVP, Tiles, Marble)
  else if (opts.action === "swatch_presentation") {
    actionDescription = `Presenter holds an authentic, textured material sample plank/swatch of ${prodName} at chest level, tilting it 15 degrees to let the studio key light reveal the realistic wood grain texture, bevel craftsmanship, and ultra-matte protective finish with clear, distinct 5 fingers.`;
  } else if (opts.action === "room_walkthrough") {
    actionDescription = `Presenter walks and stands gracefully across a sunlit modern interior featuring the installed ${prodName} across the entire room floor. Gestures downward with an open welcoming palm highlighting the seamless, luxury finish underfoot, smiling warmly into the camera lens.`;
  } else if (opts.action === "torture_test") {
    actionDescription = `Presenter conducts a live durability test on a ${prodName} surface on the demonstration desk. Pours a liquid droplet onto the surface showing 100% waterproof liquid beading with zero absorption, then rubs a key or coin across it showing zero scratch marks, nodding to camera with supreme confidence.`;
  }
  // 3. Paint, Coatings & Wallpapers
  else if (opts.action === "paint_application") {
    actionDescription = `Presenter wearing a stylish designer work apron holds a paint roller smoothly applying a rich, velvety coat of ${prodName} onto an interior accent wall, demonstrating effortless one-coat coverage with zero roller streaks, turning to camera with an enthusiastic, proud smile.`;
  } else if (opts.action === "swatch_reveal") {
    actionDescription = `Presenter holds professional color fan deck swatch cards of ${prodName} against a freshly transformed wall, comparing the rich designer pigment undertones under natural daylight, nodding approvingly to camera.`;
  } else if (opts.action === "before_after_reveal") {
    actionDescription = `Presenter stands beside a striking room transformation showcasing ${prodName} on the walls and surfaces, gesturing with open arms in a dramatic reveal of the modern, elegant interior.`;
  }
  // 4. Abstract, SaaS, Digital & Apps
  else if (opts.action === "tablet_demo") {
    actionDescription = `Presenter holds a sleek modern tablet at mid-chest level showing the dynamic digital dashboard of ${prodName}. Taps the screen with right index finger to demonstrate real-time analytics and intuitive UI, direct engaging eye contact, explaining the software's speed and elegance.`;
  } else if (opts.action === "holographic_data") {
    actionDescription = `Presenter delivers a futuristic tech presentation for ${prodName}. Gestures with precision toward virtual floating data charts and digital UI elements beside them, direct commanding gaze, confident tech founder composure.`;
  } else if (opts.action === "saas_pitch_explainer") {
    actionDescription = `Presenter delivers an authoritative, high-energy commercial pitch for ${prodName}. Hands articulate precise conceptual frameworks, counting benefits and pointing forward, explaining how the platform saves time and accelerates growth.`;
  }
  // 5. Bulky Furniture & Home
  else if (opts.action === "furniture_interaction") {
    actionDescription = `Presenter sits comfortably on the ${prodName} in a styled luxury living room set, running hand across the tailored upholstery, leaning back with genuine relaxation and nodding approvingly to camera.`;
  }
  // 6. Professional Services & Trades
  else if (opts.action === "service_expert") {
    actionDescription = `Presenter dressed in professional consultant attire holds a digital clipboard explaining the premium ${prodName}. Communicates trust, certified expertise, and peace of mind with confident, reassuring gestures.`;
  } else {
    actionDescription = `Presenter presents ${prodName} with clear, professional broadcast delivery and engaging commercial presence.`;
  }

  const audioNote = opts.talkingMode === "natural_speech"
    ? "COMMERCIAL SPOKEN DELIVERY: Presenter speaks animatedly with natural, persuasive lip movement and commercial enthusiasm."
    : buildSilentLipSyncClause();

  const productInitClause = opts.productImage
    ? `PRODUCT REFERENCE ATTACHED: The exact product design, bottle shape, packaging colors, and brand identity from attached product image [${path.basename(opts.productImage)}] must be reproduced with 100% fidelity.`
    : `PRODUCT SPECIFICATION: High-end luxury ${prodName} with pristine modern industrial design.`;

  const envClause = resolveEnvironmentClause(opts.envImage, opts.action === "unbox" || opts.action === "side_by_side", chroma, duration);

  const rawCompiled = [
    `${tagPrefix}High-conversion commercial UGC product demonstration video presenting the ${prodName}.`,
    `PRODUCT DEMONSTRATION ACTION: ${actionDescription}`,
    productInitClause,
    `HAND ANATOMY CONSTANCY: Pristine natural hands with clear 5 distinct fingers, realistic natural grip without finger warping, melting, or artifacts around the product edges.`,
    `Format & Framing: ${getFormatClause(ratio)}`,
    buildAttireDynamicsClause(opts.persona.attire),
    buildHairDynamicsClause(opts.persona.hairStyle),
    audioNote,
    `Environment: ${envClause}`,
    `Commercial Lighting: High-end luxury product commercial lighting with soft specular highlights, clean key light, and glamorous rim light.`,
    buildNegativeConstraints(opts.talkingMode === "natural_speech"),
    `Quality: 4K UHD commercial video ad quality, ultra-sharp product texture, smooth 30fps.`,
  ].join(" ");

  return filterPromptForSafety(rawCompiled);
}



