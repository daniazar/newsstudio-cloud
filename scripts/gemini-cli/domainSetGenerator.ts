/**
 * scripts/gemini-cli/domainSetGenerator.ts
 *
 * Domain-Specific Master Keyframe Image Set Generator.
 * Synthesizes the exact set of cohesive master keyframe images (M1..MK) required for any
 * of the 6 Broadcast Scenario Domains, ensuring 100% identical persona identity, hairstyle,
 * and wardrobe attire (either cloned from an existing reference image or selected from wardrobe catalog).
 */

import fs from "fs";
import path from "path";
import { resolvePersonaAvatarPath, resolvePersonaBodyRefPath } from "./personaAttires";
import { Persona } from "../../src/lib/tts/personas";


// (Inside generateDomainMasterImageSet)

import { BroadcastDomainType, ImageAuditResult } from "../veo-cli/types";
import { auditSingleMasterImage, auditMasterImageSet, printSetAuditReport } from "../veo-cli/auditors/imageSetAuditor";
import { detectOptimalChroma } from "./chromaDetector";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { outputToolJson } from "./engines/jsonRunner";
import { CompositeSceneConfig, PersonaAttire } from "./types";

export interface DomainShotDefinition {
  id: string;
  nameSuffix: string;
  label: string;
  postureDescription: string;
  gestureDescription: string;
  expressionDescription: string;
  furniturePrompt: string;
  cameraPresetKey: string;
  isBridgeBase?: boolean;
}

/**
 * Exact Keyframe Blueprints for each of the 6 Broadcast Scenario Domains
 */
export const DOMAIN_SHOT_BLUEPRINTS: Record<BroadcastDomainType, DomainShotDefinition[]> = {
  // -------------------------------------------------------------------------
  // DOMAIN 1: SEATED BROADCAST DESK (Newsroom Studio Set with Laptop & Props)
  // -------------------------------------------------------------------------
  seated_broadcast_desk: [
    {
      id: "M1_desk_sit_base",
      nameSuffix: "01_M1_desk_sit_base",
      label: "M1: Seated Clasped Master Base (Designated Bridge Base)",
      postureDescription: "Seated upright with perfect posture behind modern broadcast glass newsroom desk",
      gestureDescription: "Both hands resting neatly clasped on glass desk surface in front of open silver laptop, natural composed poise",
      expressionDescription: "Pleasant confident closed-lip smile, crystalline direct eye contact with camera lens",
      furniturePrompt: "Modern high-tech newsroom broadcast studio desk with sleek silver laptop open, printed script stack, subtle ambient studio background",
      cameraPresetKey: "cam1_center_wide",
      isBridgeBase: true,
    },
    {
      id: "M2_desk_laptop_typing",
      nameSuffix: "02_M2_desk_laptop_typing",
      label: "M2: Seated Laptop Keyboard Reference",
      postureDescription: "Seated behind broadcast news desk with engaged forward poise",
      gestureDescription: "Right hand resting lightly on the open silver laptop keyboard, left hand steady on desk, subtle natural glance referencing screen data",
      expressionDescription: "Focused authoritative expression with closed lips, direct camera delivery",
      furniturePrompt: "Modern newsroom broadcast glass desk with open laptop keyboard, news studio lighting",
      cameraPresetKey: "cam2_left_tight",
    },
    {
      id: "M3_desk_script_review",
      nameSuffix: "03_M3_desk_script_review",
      label: "M3: Seated Script Papers Review",
      postureDescription: "Seated behind broadcast news desk with authoritative composure",
      gestureDescription: "Both hands holding printed news script document pages on the desk surface, ready to present key facts",
      expressionDescription: "Intelligent serious anchor expression, closed mouth, confident camera focus",
      furniturePrompt: "Modern broadcast glass desk with paper script stack and studio microphone",
      cameraPresetKey: "cam1_center_wide",
    },
    {
      id: "M4_desk_explanatory_right",
      nameSuffix: "04_M4_desk_explanatory_right",
      label: "M4: Seated Explanatory Hand Gesture",
      postureDescription: "Seated behind broadcast news desk",
      gestureDescription: "Right hand lifted smoothly from desk surface in an open-palm conversational explanatory gesture, left hand resting steady on desk",
      expressionDescription: "Engaged warm communicative closed-lip smile, animated expressive delivery",
      furniturePrompt: "Modern broadcast newsroom desk with laptop and studio background",
      cameraPresetKey: "cam2_left_tight",
    },
    {
      id: "M5_desk_active_listen",
      nameSuffix: "05_M5_desk_active_listen",
      label: "M5: Seated Active Listening & Panel Engagement",
      postureDescription: "Seated at broadcast news desk with arms resting comfortably",
      gestureDescription: "Elbows resting gently on glass desk with hands lightly touching, head tilted 10 degrees in active attentive listening mode",
      expressionDescription: "Receptive appreciative closed-lip smile, intelligent eye gaze engaging co-anchor or guest",
      furniturePrompt: "Modern broadcast news desk with ambient studio lighting",
      cameraPresetKey: "cam3_right_closeup",
    },
  ],

  // -------------------------------------------------------------------------
  // DOMAIN 2: STANDING BROADCAST DESK / PODIUM (Studio Set beside Desk)
  // -------------------------------------------------------------------------
  standing_broadcast_desk: [
    {
      id: "M1_desk_stand_base",
      nameSuffix: "01_M1_desk_stand_base",
      label: "M1: Standing Beside Desk Master Base (Designated Bridge Base)",
      postureDescription: "Standing upright with commanding confident posture beside the modern newsroom anchor desk",
      gestureDescription: "Hands resting lightly and comfortably on the desk corner, upright shoulders, composed presentation stance",
      expressionDescription: "Warm authoritative closed-lip smile, direct engaging gaze at camera lens",
      furniturePrompt: "Modern architectural broadcast studio set with illuminated anchor desk corner and ambient video wall",
      cameraPresetKey: "standup_videowall",
      isBridgeBase: true,
    },
    {
      id: "M2_podium_tablet_tap",
      nameSuffix: "02_M2_podium_tablet_tap",
      label: "M2: Standing at Podium Tapping Tablet",
      postureDescription: "Standing upright behind modern sleek studio podium",
      gestureDescription: "Right hand tapping digital touchscreen tablet mounted on podium, left hand resting steady on podium edge",
      expressionDescription: "Focused engaging expression with closed lips, direct camera contact",
      furniturePrompt: "Sleek glass and brushed metal broadcast podium with digital tablet display",
      cameraPresetKey: "standup_videowall",
    },
    {
      id: "M3_desk_stand_explain",
      nameSuffix: "03_M3_desk_stand_explain",
      label: "M3: Standing Beside Desk Explanatory Gesture",
      postureDescription: "Standing upright beside newsroom desk",
      gestureDescription: "Right hand raised in dynamic open-palm presentation gesture emphasizing a key broadcast point, left hand near desk corner",
      expressionDescription: "Dynamic communicative closed-lip smile, engaging presence",
      furniturePrompt: "Broadcast studio set with anchor desk corner and soft studio lighting",
      cameraPresetKey: "standup_videowall",
    },
    {
      id: "M4_desk_stand_open_hands",
      nameSuffix: "04_M4_desk_stand_open_hands",
      label: "M4: Standing Beside Desk Open Hands Presentation",
      postureDescription: "Standing confident and centered beside studio desk",
      gestureDescription: "Both hands open wide in balanced welcoming overview gesture, addressing the audience",
      expressionDescription: "Bright welcoming closed-lip smile, poised delivery",
      furniturePrompt: "Modern broadcast news studio set with ambient architectural lighting",
      cameraPresetKey: "standup_videowall",
    },
  ],

  // -------------------------------------------------------------------------
  // DOMAIN 3: CHROMA WALL STANDING (Pure Chroma Green/Blue — Zero Furniture)
  // -------------------------------------------------------------------------
  chroma_wall_standing: [
    {
      id: "M1_chroma_stand_base",
      nameSuffix: "01_M1_chroma_stand_base",
      label: "M1: Standing Clasped Master Base (Chroma Home Base)",
      postureDescription: "Standing upright with commanding poise, centered against solid flat Chroma green backdrop with NO desk and NO furniture, camera framed as a strict knee-up cowboy shot showing from just above the knees up to top of head",
      gestureDescription: "Hands clasped gracefully in front of lower torso at waist level, calm stable standing posture, natural relaxed shoulders, at least 15% clear green background below hands and thighs",
      expressionDescription: "Composed authoritative professional news anchor expression, STRICTLY CLOSED MOUTH, lips motionless and pressed shut, relaxed jaw, absolutely zero teeth showing, crystalline direct eye contact with camera lens",
      furniturePrompt: "Completely empty studio with pure flat solid green screen background (#00FF00), zero desk, zero furniture, zero props",
      cameraPresetKey: "widescreen_standing_chroma_knee_up",
      isBridgeBase: true,
    },
    {
      id: "M2_chroma_raised_right",
      nameSuffix: "02_M2_chroma_raised_right",
      label: "M2: Standing Raised Right Hand Explanatory",
      postureDescription: "Standing upright with commanding poise against solid flat green screen with NO desk and NO furniture, camera framed as a strict knee-up cowboy shot showing from just above knees to top of head",
      gestureDescription: "Right hand raised smoothly to mid-chest level in open-palm conversational explanatory gesture, left hand clasped comfortably near waist, all gestures contained safely within frame with generous side margins and lower clearance",
      expressionDescription: "Engaging focused professional news anchor expression, STRICTLY CLOSED MOUTH, lips motionless and pressed shut, relaxed jaw, absolutely zero teeth showing, direct eye contact",
      furniturePrompt: "Solid pure chroma green background (#00FF00) with zero furniture or props",
      cameraPresetKey: "widescreen_standing_chroma_knee_up",
    },
    {
      id: "M3_chroma_open_two_hands",
      nameSuffix: "03_M3_chroma_open_two_hands",
      label: "M3: Standing Open Two Hands Presentation",
      postureDescription: "Standing poised with commanding presence against solid flat green screen with NO desk and NO furniture, camera framed as a strict knee-up cowboy shot showing from just above knees to top of head",
      gestureDescription: "Both hands opened outward at chest level in balanced welcoming presentation gesture, hands and elbows comfortably clear of frame edges with generous lateral margin and lower clearance",
      expressionDescription: "Welcoming composed professional news anchor expression, STRICTLY CLOSED MOUTH, lips motionless and pressed shut, relaxed jaw, absolutely zero teeth showing, direct eye contact",
      furniturePrompt: "Solid pure chroma green background (#00FF00) with zero furniture",
      cameraPresetKey: "widescreen_standing_chroma_knee_up",
    },
    {
      id: "M4_chroma_separated_arms",
      nameSuffix: "04_M4_chroma_separated_arms",
      label: "M4: Standing Separated Relaxed Arms",
      postureDescription: "Standing upright in relaxed conversational stance against solid flat green screen with NO desk and NO furniture, camera framed as a strict knee-up cowboy shot showing from just above knees to top of head",
      gestureDescription: "Arms relaxed and separated naturally at sides, hands resting comfortably at hip and upper thigh level, composed posture with generous clear green space below hands down to knees",
      expressionDescription: "Calm poised professional news anchor expression, STRICTLY CLOSED MOUTH, lips motionless and pressed shut, relaxed jaw, absolutely zero teeth showing, natural direct gaze",
      furniturePrompt: "Solid pure chroma green background (#00FF00) with zero furniture",
      cameraPresetKey: "widescreen_standing_chroma_knee_up",
    },
    {
      id: "M5_chroma_turn_side",
      nameSuffix: "05_M5_chroma_turn_side",
      label: "M5: Standing Angled 20° Body Turn",
      postureDescription: "Standing against solid flat green screen with body angled 15-20 degrees, weight balanced, NO desk and NO furniture, camera framed as a strict knee-up cowboy shot showing from just above knees to top of head",
      gestureDescription: "Torso turned slightly 15-20 degrees to side to acknowledge side graphics screen, head and face turned forward engaging the viewer directly, hands poised at waist with ample lower clearance",
      expressionDescription: "Alert intelligent professional news anchor expression, STRICTLY CLOSED MOUTH, lips motionless and pressed shut, relaxed jaw, absolutely zero teeth showing, dynamic news delivery stance",
      furniturePrompt: "Solid pure chroma green background (#00FF00) with zero furniture",
      cameraPresetKey: "widescreen_standing_chroma_knee_up",
    },
  ],

  // -------------------------------------------------------------------------
  // DOMAIN 4: CHROMA WALL SEATED AT DESK (Chroma Desk for 3D Virtual Set)
  // -------------------------------------------------------------------------
  chroma_wall_seated_desk: [
    {
      id: "M1_chroma_desk_base",
      nameSuffix: "01_M1_chroma_desk_base",
      label: "M1: Chroma Desk Seated Clasped Base",
      postureDescription: "Seated upright behind a green chroma desk against a solid green chroma wall",
      gestureDescription: "Hands resting clasped neatly on the green chroma desk surface, composed posture",
      expressionDescription: "Pleasant confident closed-lip smile, direct camera contact",
      furniturePrompt: "Green chroma desk surface seamlessly blending with green chroma wall background (#00FF00)",
      cameraPresetKey: "cam1_center_wide",
      isBridgeBase: true,
    },
    {
      id: "M2_chroma_desk_explain",
      nameSuffix: "02_M2_chroma_desk_explain",
      label: "M2: Chroma Desk Explanatory Gesture",
      postureDescription: "Seated behind green chroma desk",
      gestureDescription: "Right hand lifted from chroma desk surface in open conversational explanatory gesture, left hand on desk",
      expressionDescription: "Engaged authoritative closed-lip smile, direct delivery",
      furniturePrompt: "Green chroma desk surface seamlessly blending with green chroma wall",
      cameraPresetKey: "cam2_left_tight",
    },
    {
      id: "M3_chroma_desk_nod",
      nameSuffix: "03_M3_chroma_desk_nod",
      label: "M3: Chroma Desk Affirmative Nod",
      postureDescription: "Seated at green chroma desk with firm poise",
      gestureDescription: "Hands resting comfortably on chroma desk, firm affirmative head nod delivering key takeaway",
      expressionDescription: "Authoritative assured closed-lip expression, crystalline catchlights",
      furniturePrompt: "Green chroma desk surface on solid green chroma background",
      cameraPresetKey: "cam1_center_wide",
    },
  ],

  // -------------------------------------------------------------------------
  // DOMAIN 5: INTERVIEW LOUNGE STANDING (Modern Lounge Set / Standing)
  // -------------------------------------------------------------------------
  interview_lounge_standing: [
    {
      id: "M1_lounge_stand_base",
      nameSuffix: "01_M1_lounge_stand_base",
      label: "M1: Lounge Standing Wireless Mic Base (Designated Bridge Base)",
      postureDescription: "Standing upright in a luxury broadcast interview lounge set with warm wood and glass architecture",
      gestureDescription: "Right hand holding sleek silver wireless broadcast microphone near chest, left hand resting naturally at side",
      expressionDescription: "Warm welcoming conversational closed-lip smile, direct camera gaze",
      furniturePrompt: "Contemporary architectural broadcast lounge with warm wood slat paneling, ambient designer lighting, luxury armchair in background",
      cameraPresetKey: "standup_videowall",
      isBridgeBase: true,
    },
    {
      id: "M2_lounge_cue_card",
      nameSuffix: "02_M2_lounge_cue_card",
      label: "M2: Lounge Standing Holding Cue Card",
      postureDescription: "Standing upright in interview lounge set",
      gestureDescription: "Left hand holding printed luxury cue card, right hand gesturing openly to introduce segment",
      expressionDescription: "Engaged intelligent closed-lip smile, direct eye contact",
      furniturePrompt: "Modern broadcast interview lounge setting with warm soft lighting",
      cameraPresetKey: "standup_videowall",
    },
    {
      id: "M3_lounge_welcoming",
      nameSuffix: "03_M3_lounge_welcoming",
      label: "M3: Lounge Standing Welcoming Gesture",
      postureDescription: "Standing in interview lounge set",
      gestureDescription: "Both hands open in warm welcoming gesture greeting in-studio guest or viewer",
      expressionDescription: "Bright radiant closed-lip smile, inviting conversational presence",
      furniturePrompt: "Modern architectural interview lounge set with warm ambient lighting",
      cameraPresetKey: "standup_videowall",
    },
  ],

  // -------------------------------------------------------------------------
  // DOMAIN 6: INTERVIEW LOUNGE SEATED SOFA (Designer Armchair / Sofa)
  // -------------------------------------------------------------------------
  interview_lounge_seated_sofa: [
    {
      id: "M1_sofa_sit_base",
      nameSuffix: "01_M1_sofa_sit_base",
      label: "M1: Lounge Sofa Armchair Master Base (Designated Bridge Base)",
      postureDescription: "Seated upright and relaxed in a designer modern single sofa armchair in interview lounge set",
      gestureDescription: "Arms resting comfortably on sofa armrests, relaxed shoulders, conversational poise",
      expressionDescription: "Friendly engaging closed-lip smile, bright direct eye contact with camera lens",
      furniturePrompt: "Modern architectural broadcast interview lounge with luxury single armchair, warm wood slats, soft ambient lamp lighting",
      cameraPresetKey: "cam1_center_wide",
      isBridgeBase: true,
    },
    {
      id: "M2_sofa_casual_explain",
      nameSuffix: "02_M2_sofa_casual_explain",
      label: "M2: Lounge Sofa Casual Hand Gesture",
      postureDescription: "Seated in single sofa armchair in interview lounge",
      gestureDescription: "Right hand lifted naturally from armrest in an open conversational explanatory gesture, left arm resting on armrest",
      expressionDescription: "Insightful warm closed-lip smile, engaging dialogue presence",
      furniturePrompt: "Contemporary broadcast lounge set with designer sofa armchair and warm background",
      cameraPresetKey: "cam2_left_tight",
    },
    {
      id: "M3_sofa_receptive_listen",
      nameSuffix: "03_M3_sofa_receptive_listen",
      label: "M3: Lounge Sofa Receptive Listening",
      postureDescription: "Seated in sofa armchair with attentive posture",
      gestureDescription: "Arms resting on armrests, head tilted slightly in active interview listening mode, nodding receptively",
      expressionDescription: "Appreciative attentive closed-lip smile, intelligent focused gaze",
      furniturePrompt: "Modern broadcast interview lounge with luxury armchair",
      cameraPresetKey: "cam3_right_closeup",
    },
  ],
};

export interface DomainSetOptions {
  persona: Persona;
  domain: BroadcastDomainType;
  attireSource: "reference_image" | "catalog_preset" | "custom";
  refImagePath?: string;
  attire?: PersonaAttire;
  customAttireText?: string;
  hairstyleKey?: string;
  aspectRatio?: "9:16" | "16:9" | "1:1";
  engine: "agy" | "api" | "tool_json";
  dryRun?: boolean;
  outputDir?: string;
}

/**
 * Main Orchestrator for Domain Master Image Set Generation
 */
export async function generateDomainMasterImageSet(options: DomainSetOptions): Promise<{
  success: boolean;
  generatedFiles: string[];
  report?: any;
}> {
  const {
    persona,
    domain,
    attireSource,
    refImagePath,
    attire,
    customAttireText,
    hairstyleKey,
    aspectRatio = "16:9",
    engine,
    dryRun = false,
  } = options;

  console.log("\n==================================================================");
  console.log(`🏛️ GENERATING DOMAIN MASTER IMAGE SET FOR: ${persona.name.toUpperCase()}`);
  console.log("==================================================================");
  console.log(`Persona:         ${persona.name} [${persona.id}]`);
  console.log(`Domain:          ${domain}`);
  console.log(`Attire Source:   ${attireSource}`);
  console.log(`Aspect Ratio:    ${aspectRatio}`);
  console.log(`Engine:          ${engine.toUpperCase()}`);

  // 1. Resolve Attire Description & Color Lock
  let resolvedAttireDesc = "";
  let attireSlug = "custom_attire";
  let attireRefImage: string | null = null;

  if (attireSource === "reference_image" && refImagePath) {
    const fullRefPath = path.resolve(process.cwd(), refImagePath);
    if (!fs.existsSync(fullRefPath)) {
      throw new Error(`Reference image not found: ${fullRefPath}`);
    }
    console.log(`🔍 Auditing reference image for attire replication: [${path.basename(fullRefPath)}]`);
    const refAudit = await auditSingleMasterImage(fullRefPath, persona.id);
    resolvedAttireDesc = `Exact wardrobe clothing cloned from reference image: ${refAudit.attireDescription} in solid color tone (${refAudit.attireColorHex || "matched color"}), exact neckline and fabric texture identical to reference image.`;
    attireSlug = path.basename(fullRefPath, path.extname(fullRefPath)).replace(/^[^_]+_[^_]+_/, "").slice(0, 24);
    attireRefImage = fullRefPath;
    console.log(`👗 Cloned Attire: ${refAudit.attireDescription} (${refAudit.attireColorHex})`);
  } else if (attireSource === "catalog_preset" && attire) {
    resolvedAttireDesc = attire.description;
    attireSlug = attire.id.replace(`${persona.id}_`, "");
    if (attire.relativePath && fs.existsSync(path.resolve(process.cwd(), attire.relativePath))) {
      attireRefImage = path.resolve(process.cwd(), attire.relativePath);
    }
    console.log(`👗 Catalog Wardrobe: ${attire.label}`);
  } else if (customAttireText) {
    resolvedAttireDesc = customAttireText;
    attireSlug = "custom_wardrobe";
    console.log(`👗 Custom Attire: ${customAttireText}`);
  } else {
    resolvedAttireDesc = "Professional high-end broadcast anchor attire with tailored cut and premium fabric.";
  }

  // Bind Persona Avatar as Reference 1 (ensuring 100% facial likeness)
  const isStanding = domain === "chroma_wall_standing" || domain === "standing_broadcast_desk" || domain === "interview_lounge_standing";
  const avatarPath = resolvePersonaAvatarPath(persona);
  const bodyRefPath = isStanding ? resolvePersonaBodyRefPath(persona) : null;

  const attachedReferenceImages: string[] = [];
  // Reference 1 is ALWAYS the primary face master avatar portrait
  if (avatarPath && fs.existsSync(avatarPath)) {
    attachedReferenceImages.push(avatarPath);
  } else if (bodyRefPath && fs.existsSync(bodyRefPath)) {
    attachedReferenceImages.push(bodyRefPath);
  }

  // Reference 2 can be attire or body reference (if distinct from Reference 1)
  if (attireRefImage && fs.existsSync(attireRefImage) && !attachedReferenceImages.includes(attireRefImage)) {
    attachedReferenceImages.push(attireRefImage);
  } else if (bodyRefPath && fs.existsSync(bodyRefPath) && !attachedReferenceImages.includes(bodyRefPath)) {
    attachedReferenceImages.push(bodyRefPath);
  }

  // 2. Setup Output Directory
  const targetDir = options.outputDir || path.resolve(
    process.cwd(),
    `public/avatars/master_${persona.id}_archive/domain_${domain}_${attireSlug}`
  );
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  console.log(`📁 Destination:  ${targetDir}`);
  console.log("==================================================================\n");

  // 3. Fetch Domain Keyframe Blueprints
  const shots = DOMAIN_SHOT_BLUEPRINTS[domain];
  if (!shots || shots.length === 0) {
    throw new Error(`No shot blueprints defined for domain: ${domain}`);
  }

  const generatedFiles: string[] = [];
  const totalShots = shots.length;
  let m1MasterImagePath: string | null = null;

  for (let i = 0; i < totalShots; i++) {
    const shot = shots[i];
    const isWidescreen = aspectRatio === "16:9";
    const isChromaStanding = domain === "chroma_wall_standing";

    let filename = `${persona.id}_${domain}_${attireSlug}_${shot.nameSuffix}.jpg`;
    if (isWidescreen && isChromaStanding) {
      // Mateo Option A convention: {persona}_169_widescreen_{suffix}.jpg
      const cleanSuffix = shot.nameSuffix.replace(/chroma_/, "");
      filename = `${persona.id}_169_widescreen_${cleanSuffix}.jpg`;
    } else if (isWidescreen) {
      filename = `${persona.id}_169_widescreen_${domain}_${attireSlug}_${shot.nameSuffix}.jpg`;
    }
    const outputPath = path.join(targetDir, filename);

    console.log(`------------------------------------------------------------------`);
    console.log(`📸 [${i + 1}/${totalShots}] Generating Master Keyframe: ${shot.label}`);
    console.log(`------------------------------------------------------------------`);

    const isChroma = domain === "chroma_wall_standing" || domain === "chroma_wall_seated_desk";
    const chromaSetting = isChroma
      ? "Studio Setting & Backdrop: Clean, flat, pure solid #00FF00 bright Chroma Green cyclorama infinity wall with zero shadows, zero gradients, zero studio props, zero desks, and zero background scenery. Crisp silhouette separation."
      : `Studio Setting & Backdrop: ${shot.furniturePrompt}.`;

    let shotHeader = "";
    let framingInstruction = "";

    if (isWidescreen) {
      if (isChromaStanding) {
        shotHeader = `A wide-angle 16:9 broadcast cowboy shot of news anchor ${persona.name} standing against a solid flat green chroma screen:`;
        framingInstruction = `FRAMING & COMPOSITION (CRITICAL MANDATORY REQUIREMENT): Widescreen 16:9 landscape framing (1920x1080). Wide cowboy shot / American shot (plan américain). The camera is pulled 9 to 10 meters far back with a 24mm wide-angle lens, capturing the entire person from mid-shin and knees up to above head. The anchor's head, shoulders, torso, narrow waist, hips, entire thighs, kneecaps, and upper shins are ALL completely visible inside the frame. Headroom above hair is kept around 6-8%, with hips positioned near the vertical midpoint (Y=510-530px). Both knees are positioned well above the bottom border with at least 50-60 pixels of empty solid green floor visible BELOW the kneecaps. All hand and wrist gestures (clasped, raised, open, or resting beside thighs) are held safely inside the frame with at least 15-20% clearance above the bottom border and >= 25% lateral margins on left and right sides so downward arm movement never touches or exits the frame during action loops. DO NOT zoom in. DO NOT frame waist-up or chest-up. DO NOT crop out the thighs or knees. Centered horizontally with vast green space on left and right. Professional studio lighting with crystalline eye catchlights. Completely flat, solid #00FF00 chroma green backdrop wall and floor with zero shadows, zero gradients, zero furniture, zero desks, and zero props. Clean frame with no text, no captions, and no watermarks.`;
      } else if (isStanding) {
        shotHeader = `Ultra hyper-photorealistic 8k widescreen 16:9 standing broadcast shot of news anchor ${persona.name} (three-quarters medium-long shot framing strictly from just above the knees up to the top of the head):`;
        framingInstruction = `Camera & Framing: Widescreen 16:9 horizontal landscape framing (1920x1080). Three-quarters medium-long shot framing from just above the knees up to the top of the head. Crisp optical focus, 50mm broadcast prime lens, professional studio lighting with crystalline eye catchlights, clean frame with no text, no captions, and no watermarks.`;
      } else {
        shotHeader = `Ultra hyper-photorealistic 8k widescreen 16:9 broadcast photograph of news anchor ${persona.name}:`;
        framingInstruction = `Camera & Framing: Widescreen 16:9 horizontal landscape framing (1920x1080). Crisp optical focus, 50mm broadcast studio lens, professional studio lighting with crystalline eye catchlights, clean frame with no text, no captions, and no watermarks.`;
      }
    } else {
      if (isStanding) {
        shotHeader = `Ultra hyper-photorealistic 8k vertical 9:16 standing broadcast shot of news anchor ${persona.name} (full upper and mid-torso framing from head to below the hips, standing upright on a flat chroma green studio stage):`;
        framingInstruction = `Camera & Framing: Full-body standing vertical 9:16 framing (1080x1920). DO NOT crop into a tight passport face or headshot. The anchor's entire head, shoulders, chest, arms, hands, narrow waist, and hips MUST be completely framed and visible in the center of the vertical canvas against the flat green backdrop. Crisp optical focus, 85mm portrait lens, professional broadcast key and fill lighting with crystalline eye catchlights, clean frame with no text, no captions, and no watermarks.`;
      } else {
        shotHeader = `Ultra hyper-photorealistic 8k broadcast photograph of news anchor ${persona.name}:`;
        framingInstruction = `Camera & Framing: Vertical 9:16 portrait format (1080x1920). Crisp optical focus, 85mm portrait lens, professional broadcast key and fill lighting with crystalline eye catchlights, clean frame with no text, no captions, and no watermarks.`;
      }
    }

    let activeReferenceImages: string[] = [];
    let fullPrompt = "";

    const isBlaze = persona.id.toLowerCase() === "blaze" || persona.name.toLowerCase().includes("blaze");
    const m1BodyProportionsPrompt = `BODY PROPORTIONS & ANATOMY CONTINUITY:
• Physical Form: ${persona.traits?.build || "Athletic broadcast build"}, Height: ${persona.traits?.heightCm || 170} cm (${persona.traits?.heightFeet || "5'7\""}), Weight: ${persona.traits?.weightKg || 56} kg (${persona.traits?.weightLbs || 123} lbs).
${
  isBlaze
    ? "• Precise Anatomical Proportions: Prominent, full, voluptuous 34DD bust that clearly fills out the form-fitting top, contrasted with a tiny, narrow 23-inch waist with flat, lean, toned fitness abdominal definition, and shapely 36-inch hips creating a true, dramatic fitness hourglass silhouette (34DD-23-36)."
    : `• Silhouette Lock: Strictly preserve the authentic waist, bust size, and hip curve proportions defined for ${persona.name} with zero distortion across all shots.`
}`;

    const chainedBodyProportionsPrompt = `BODY PROPORTIONS & SILHOUETTE:
• Strictly preserve the authentic waist, bust size, and hip curve proportions identical to Reference 1 with zero distortion.${
      isBlaze
        ? "\n• Maintain prominent 34DD bust, 23-inch waist with athletic abdominal definition, and 36-inch hips identically matching Reference 1."
        : ""
    }`;

    if (i === 0 || !m1MasterImagePath || !fs.existsSync(m1MasterImagePath)) {
      // -------------------------------------------------------------------------
      // M1 (Base Master Keyframe Generation): Anchor Identity + Selected Attire
      // -------------------------------------------------------------------------
      activeReferenceImages = [...attachedReferenceImages];

      const refInstruction = activeReferenceImages.length > 1
        ? `Use Reference 1 ONLY to match the facial features, eye color, skin tone, hairstyle, and authentic likeness of ${persona.name} (${persona.traits?.face || "anchor"}). DO NOT copy the clothing or pose of Reference 1.\nUse Reference 2 ONLY to clone the wardrobe clothing, neckline, fabric texture, and cut. DO NOT copy the face or background of Reference 2.`
        : `Use Reference 1 to match the authentic facial features, eye color, skin tone, hairstyle, body build, and likeness of ${persona.name} (${persona.traits?.face || "anchor"}).\nCRITICAL WARDROBE DIRECTIVE: DO NOT copy the outfit from Reference 1. The anchor MUST be dressed in the exact wardrobe specified below.`;

      const chromaOverrideInstruction = isChroma
        ? `\nCRITICAL CHROMA GREEN BACKDROP OVERRIDE:\nThe backdrop MUST be a solid, uniform, flat, pure #00FF00 Chroma Green cyclorama infinity wall with zero shadows, zero gradients, zero furniture, zero desks, and zero studio props. DO NOT copy the grey, dark, or studio background from Reference 1.`
        : "";

      fullPrompt = `
${shotHeader}

IDENTITY & REFERENCE LOCK:
${refInstruction}
${chromaOverrideInstruction}

${m1BodyProportionsPrompt}

WARDROBE & ATTIRE SPECIFICATION (MANDATORY):
${resolvedAttireDesc}
The attire must match the exact fabric, color, neckline, and tailoring identically across all shots with zero variation.

POSTURE & STUDIO SETTING:
${shot.postureDescription}.
${chromaSetting}

HANDS & GESTURE:
${shot.gestureDescription}.

FACIAL EXPRESSION & LIP-SYNC READY STATE:
${shot.expressionDescription}. Mouth completely shut, lips tightly sealed together and motionless, still jaw, neutral motionless facial expression, ready for audio lip-sync.

${framingInstruction}
`.trim();
    } else {
      // -------------------------------------------------------------------------
      // M2..MK (Subsequent Keyframe Generation): Ground-Truth M1 Chaining
      // -------------------------------------------------------------------------
      activeReferenceImages = [m1MasterImagePath];

      fullPrompt = `
${shotHeader}

MASTER KEYFRAME GROUND-TRUTH ANCHOR LOCK (CRITICAL):
• Reference 1 is the Master Keyframe Base (M1) for this scenario.
• Face & Likeness Continuity: Match the EXACT facial features, skin tone, eye catchlights, hairstyle, hair color, and authentic likeness of ${persona.name} from Reference 1.
• Wardrobe Continuity: The clothing, wardrobe fabric, color, neckline, zippers, cuts, and fit MUST be 100% IDENTICAL to what ${persona.name} is wearing in Reference 1 (${resolvedAttireDesc}). DO NOT change or alter the outfit.
• Background & Studio Continuity: The background MUST be 100% IDENTICAL to the backdrop in Reference 1 (${isChroma ? "pure solid flat #00FF00 Chroma Green infinity wall with zero furniture, zero props, zero shadows" : shot.furniturePrompt}).

${chainedBodyProportionsPrompt}

POSTURE & GESTURE TRANSITION:
${shot.postureDescription}.
Hands & Gesture: ${shot.gestureDescription}.

FACIAL EXPRESSION & LIP-SYNC READY STATE:
${shot.expressionDescription}. Mouth completely shut, lips tightly sealed together and motionless, still jaw, neutral motionless facial expression, ready for audio lip-sync.

${framingInstruction}
`.trim();
    }

    console.log(`[REFERENCES]: ${activeReferenceImages.map((p) => path.basename(p)).join(", ")}`);
    console.log(`[PROMPT]: ${fullPrompt.slice(0, 160)}...`);

    if (dryRun) {
      console.log(`[DRY RUN]: Simulated generation -> ${filename}`);
      generatedFiles.push(outputPath);
      if (i === 0) m1MasterImagePath = outputPath;
      continue;
    }

    const baseName = path.basename(filename, path.extname(filename));

    // Execute Generation with Anatomical Framing Audit & Auto-Redo Loop
    const MAX_RETRY_ATTEMPTS = 3;
    let attempt = 1;
    let framingPassed = false;

    while (attempt <= MAX_RETRY_ATTEMPTS && !framingPassed) {
      let currentPrompt = fullPrompt;
      if (attempt > 1) {
        console.warn(`\n🔄 [REDO KEYFRAME ATTEMPT ${attempt}/${MAX_RETRY_ATTEMPTS}]: Redoing ${filename} with enforced knee-up cowboy framing...`);
        currentPrompt += `\nCRITICAL FRAMING CORRECTION (MANDATORY): Previous attempt was cropped waist-up or had hands touching/cut off at the bottom border. You MUST frame this shot as a true knee-up medium-long cowboy shot. The camera MUST be positioned further back, showing from just above the knees to above the head. Ensure at least 15% clear green background below the hands and thighs so hands never touch the border or exit the frame during movement.`;
      }

      if (engine === "agy") {
        await runWithAgy({
          prompt: currentPrompt,
          outputPath,
          aspectRatio,
          baseName,
          imagePaths: activeReferenceImages,
        });
      } else if (engine === "api") {
        await runWithApi({
          prompt: currentPrompt,
          outputPath,
          aspectRatio,
          baseName,
          imagePaths: activeReferenceImages,
        });
      } else if (engine === "tool_json") {
        outputToolJson({
          prompt: currentPrompt,
          outputPath,
          aspectRatio,
          baseName,
          imagePaths: activeReferenceImages,
        });
        break; // In tool_json mode, execution is delegated
      }

      // Audit the generated master image immediately
      if (fs.existsSync(outputPath)) {
        const audit = await auditSingleMasterImage(outputPath, persona.id);
        if (audit.validationStatus === "FAILED") {
          console.warn(`❌ [FRAMING AUDIT FAILED for ${filename}]:`);
          audit.framingFailureReasons?.forEach((r) => console.warn(`   🛑 ${r}`));
          if (attempt < MAX_RETRY_ATTEMPTS) {
            console.log(`⏳ Auto-redoing image generation to satisfy broadcast framing requirements...`);
          } else {
            console.error(`💥 [MAX RETRIES REACHED]: ${filename} failed framing audit after ${MAX_RETRY_ATTEMPTS} attempts.`);
          }
        } else {
          framingPassed = true;
          console.log(`🛡️ [FRAMING AUDIT PASSED]: ${filename} verified as authentic ${audit.framingType || "knee_up"} framing with safe margins.`);
        }
      } else {
        break;
      }
      attempt++;
    }

    generatedFiles.push(outputPath);
    if (i === 0 && fs.existsSync(outputPath)) {
      m1MasterImagePath = outputPath;
      console.log(`🔑 [MASTER KEYFRAME BASE REGISTERED]: ${path.basename(outputPath)} will anchor M2..M${totalShots}`);
    }

    console.log(`✔ [${i + 1}/${totalShots}] SAVED: ${filename}`);
  }

  // 4. Run Automatic Set Cohesion Audit Gate on Generated Suite
  console.log("\n==================================================================");
  console.log("🛡️ RUNNING AUTOMATED SET COHESION AUDIT GATE ON GENERATED SUITE...");
  console.log("==================================================================");

  let auditReport: any = null;
  if (!dryRun && generatedFiles.length > 0) {
    auditReport = await auditMasterImageSet(generatedFiles, persona.id);
    printSetAuditReport(auditReport);

    if (!auditReport.isCohesive || (auditReport.consistencyReport && !auditReport.consistencyReport.all_passed)) {
      console.warn("\n⚠️ Set Cohesion Audit detected inconsistencies. Launching Autonomous Self-Healing Loop...");
      const { autoHealInconsistentImageSet } = await import("../veo-cli/generators/consistencyVerificationLoop");
      const healResult = await autoHealInconsistentImageSet({
        dirPath: targetDir,
        persona: persona.id,
        baselinePath: m1MasterImagePath || generatedFiles[0],
        engine: engine === "tool_json" ? "agy" : engine,
        aspectRatio,
        domain,
      });
      if (healResult.success) {
        console.log("\n🎉 Self-Healing Loop successfully repaired inconsistencies! Re-auditing set...");
        auditReport = await auditMasterImageSet(generatedFiles, persona.id);
        printSetAuditReport(auditReport);
      }
    }
  }

  return {
    success: true,
    generatedFiles,
    report: auditReport,
  };
}
