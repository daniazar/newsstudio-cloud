/**
 * src/lib/ecommerce/turntablePromptCompiler.ts
 *
 * Prompt Synthesis & Kinematics Engine for Neural Product Turntable Studio.
 * Generates tailored diffusion prompts supporting both:
 * 1. MiniMax H3 + TaoMate (ComfyUI) with monolithic rigid body constraints and dry studio rules.
 * 2. Google Veo 3.1 (Flow) with cinematic 360° orbital camera movement.
 *
 * Supports 6 Staging Archetypes (including AI Persona 360° Orbit, Material Swatch Easel, Ghost Mannequin)
 * and 24+ contextual environment backdrops.
 */

import {
ProductSpec,
TurntableCameraElevation,
TurntableCompilationParams,
TurntableLightingStyle,
TurntableMotionPreset,
TurntablePedestalStyle,
TurntableStagingArchetype
} from "@/lib/types/ecommerce";
import { getEnvironmentById } from "./turntableEnvironmentEngine";

export interface TurntableCameraElevationConfig {
  id: TurntableCameraElevation;
  label: string;
  icon: string;
  pitchDeg: string;
  description: string;
  promptDescription: string;
}

export const TURNTABLE_CAMERA_ELEVATIONS: TurntableCameraElevationConfig[] = [
  {
    id: "eye_level",
    label: "Eye-Level Frontal",
    icon: "Eye",
    pitchDeg: "0°",
    description: "Straight-on commercial hero packshot angle",
    promptDescription: "eye-level 0-degree straight-on commercial hero packshot angle, keeping the horizon level with the product center",
  },
  {
    id: "high_angle_35",
    label: "35° High-Angle",
    icon: "ArrowDownRight",
    pitchDeg: "35°",
    description: "Elevated downward view showing top surface, laces, and depth",
    promptDescription: "elevated 35-degree high-angle downward perspective displaying upper contours, interior cavity, laces, and top surface depth",
  },
  {
    id: "low_angle_hero",
    label: "Low-Angle Hero",
    icon: "ArrowUpRight",
    pitchDeg: "-15°",
    description: "Upward heroic angle providing imposing, athletic presence",
    promptDescription: "low-angle -15-degree upward hero perspective giving the product an imposing, majestic, and athletic commercial stature",
  },
  {
    id: "macro_detail_orbit",
    label: "Macro Detail Close-Up",
    icon: "Search",
    pitchDeg: "15°",
    description: "Tight macro orbit focusing on micro-textures and bevels",
    promptDescription: "tight close-up macro focal length capturing fine surface micro-textures, typography, stitching, and material craftsmanship",
  },
];

export interface TurntableMotionConfig {
  id: TurntableMotionPreset;
  label: string;
  angularExtent: string;
  badge: string;
  description: string;
  promptDescription: string;
}

export interface TurntablePedestalConfig {
  id: TurntablePedestalStyle;
  label: string;
  icon: string;
  description: string;
  promptDescription: string;
}

export interface TurntableLightingConfig {
  id: TurntableLightingStyle;
  label: string;
  icon: string;
  description: string;
  promptDescription: string;
}

export interface TurntableStagingArchetypeConfig {
  id: TurntableStagingArchetype;
  label: string;
  icon: string;
  tagline: string;
  description: string;
  recommendedFor: string[];
}

export const TURNTABLE_MOTION_PRESETS: TurntableMotionConfig[] = [
  {
    id: "hero_arc_60",
    label: "Commercial Hero Arc",
    angularExtent: "-30° to +30°",
    badge: "Recommended",
    description: "Oscillating smooth 60° sweep keeping brand typography facing camera",
    promptDescription:
      "smooth 60-degree commercial hero arc, oscillating smoothly from left three-quarter angle through direct center front view to right three-quarter angle, keeping primary brand typography and logos forward-facing at all times while dynamic studio light reflections sweep across facets",
  },
  {
    id: "turnaround_180",
    label: "180° Half Turnaround",
    angularExtent: "0° to 180°",
    badge: "Full Profile",
    description: "Smooth unidirectional half-rotation revealing front, side, and rear",
    promptDescription:
      "smooth controlled 180-degree turnaround rotation from left profile through direct center front face to right profile, revealing side contours and rear architectural detailing with continuous fluid velocity",
  },
  {
    id: "loop_360",
    label: "Seamless 360° Loop",
    angularExtent: "0° to 360°",
    badge: "Infinite",
    description: "Full circular turnaround designed for continuous video looping",
    promptDescription:
      "smooth continuous full 360-degree circular turnaround rotation, perfectly boundary-locked for seamless infinite looping without visible seams or velocity hitches",
  },
];

export const TURNTABLE_PEDESTALS: TurntablePedestalConfig[] = [
  {
    id: "obsidian_black",
    label: "Matte Black Obsidian",
    icon: "Square",
    description: "Luxury dark obsidian plinth with warm amber vignette",
    promptDescription:
      "circular minimalist matte black obsidian display plinth with subtle satin surface reflection",
  },
  {
    id: "brushed_titanium",
    label: "Brushed Titanium",
    icon: "Shield",
    description: "Sleek aerospace aluminum stand with metallic rim chamfers",
    promptDescription:
      "precision-machined circular brushed aerospace titanium platform with cool silver edge chamfers",
  },
  {
    id: "pure_white",
    label: "Pristine High-Key White",
    icon: "Circle",
    description: "Shadowless clean catalog aesthetic for Amazon / Shopify PDP",
    promptDescription:
      "pristine high-key pure white circular catalog pedestal with soft diffuse contact shadow",
  },
  {
    id: "warm_wood",
    label: "Organic American Walnut",
    icon: "TreePine",
    description: "Natural handcrafted hardwood platform with warm organic grain",
    promptDescription:
      "handcrafted circular American walnut hardwood platform with natural warm horizontal grain",
  },
];

export const TURNTABLE_LIGHTING_STYLES: TurntableLightingConfig[] = [
  {
    id: "luxury_gold",
    label: "Luxury Gold & Amber",
    icon: "Sunset",
    description: "Warm golden backlight highlighting liquid clarity and facets",
    promptDescription:
      "Cinematic luxury studio lighting with warm golden backlight highlighting translucent contours, with a sleek vertical studio softbox light reflection travelling smoothly across front facets.",
  },
  {
    id: "tech_cyan",
    label: "Tech Cyan & Silver",
    icon: "Zap",
    description: "High-contrast edge rim lighting with crisp specular glints",
    promptDescription:
      "High-contrast commercial lighting with crisp cool cyan and silver rim highlights tracing edges and sharp specular accents.",
  },
  {
    id: "high_key_white",
    label: "Commercial Studio 5600K",
    icon: "Sun",
    description: "Neutral daylight balanced key and fill for pristine catalog packshots",
    promptDescription:
      "Neutral 5600K balanced daylight studio lighting, soft diffused key and fill illumination, and clean commercial packshot reflections.",
  },
];

export const TURNTABLE_STAGING_ARCHETYPES: TurntableStagingArchetypeConfig[] = [
  {
    id: "podium_pedestal",
    label: "Classic Podium Pedestal",
    icon: "Trophy",
    tagline: "Tabletop rotating plinth",
    description: "Product centered upon a rotating circular display pedestal",
    recommendedFor: ["discrete_object", "sensory_consumable", "watches", "perfumes", "cosmetics", "gadgets"],
  },
  {
    id: "persona_orbit",
    label: "AI Persona 360° Orbit",
    icon: "User",
    tagline: "Anchor wearing/presenting item with camera arc",
    description: "AI anchor actively wears or presents the product with an orbital 360° camera sweep",
    recommendedFor: ["apparel_wearable", "suitcases", "sunglasses", "handbags", "jewelry"],
  },
  {
    id: "material_swatch",
    label: "Material Swatch Easel",
    icon: "Layers",
    tagline: "45° angled architectural display with raking light",
    description: "Sample slab mounted on a display easel with dynamic grazing light sweeps",
    recommendedFor: ["surface_material", "flooring", "tiles", "marble", "countertops"],
  },
  {
    id: "paint_finish",
    label: "Paint & Finish Plinth",
    icon: "Palette",
    tagline: "Workshop plinth with dipped test paddle",
    description: "Paint container with test swatch board and dipped paddle showing sheen luster",
    recommendedFor: ["paints", "stains", "coatings", "primers", "sealers"],
  },
  {
    id: "apparel_mannequin",
    label: "Ghost Mannequin / Hanger",
    icon: "Shirt",
    tagline: "Invisible dress form or floating brass hanger",
    description: "Garment tailored onto an invisible mannequin on a showroom floor turntable",
    recommendedFor: ["apparel_wearable", "jackets", "dresses", "blazers", "shirts"],
  },
  {
    id: "showroom_floor",
    label: "Showroom Floor Platform",
    icon: "Armchair",
    tagline: "Large 2-meter floor turntable in loft",
    description: "Expansive floor-level revolving stage in a spacious modern architectural loft",
    recommendedFor: ["bulky_furniture", "sofas", "desks", "chairs", "large equipment"],
  },
  {
    id: "exploded_view",
    label: "Exploded Engineering Assembly",
    icon: "Atom",
    tagline: "Component separation breakdown for tech & hardware",
    description: "2-stage cinematic deconstruction: separates into floating internal parts, then snaps together while rotating 360°",
    recommendedFor: ["discrete_object", "electronics", "headphones", "smartwatches", "gadgets", "running shoes", "blenders", "hardware"],
  },
];

/**
 * Automatically detects the best staging archetype based on product typology and keywords.
 */
export function detectStagingArchetype(
  productSpec?: ProductSpec,
  productName?: string
): TurntableStagingArchetype {
  const text = [
    productName || "",
    productSpec?.title || "",
    productSpec?.category || "",
    productSpec?.typology || "",
    productSpec?.description || "",
    ...(productSpec?.bulletPoints || []),
    ...(productSpec?.tags || []),
  ]
    .join(" ")
    .toLowerCase();

  // 0. Exploded View (Explicit teardown, internal components, deconstructed engineering)
  if (
    text.includes("exploded view") ||
    text.includes("exploded") ||
    text.includes("deconstructed") ||
    text.includes("teardown") ||
    text.includes("disassembled")
  ) {
    return "exploded_view";
  }

  // 1. Flooring / Surface materials
  if (
    productSpec?.typology === "surface_material" ||
    text.includes("flooring") ||
    text.includes("hardwood") ||
    text.includes("plank") ||
    text.includes("laminate") ||
    text.includes("vinyl") ||
    text.includes("tile") ||
    text.includes("tiles") ||
    text.includes("porcelain") ||
    text.includes("marble") ||
    text.includes("granite") ||
    text.includes("slab") ||
    text.includes("swatch") ||
    text.includes("wallpaper") ||
    text.includes("piso") ||
    text.includes("revestimiento")
  ) {
    return "material_swatch";
  }

  // 2. Paint / Finishes
  if (
    text.includes("paint") ||
    text.includes("primer") ||
    text.includes("stain") ||
    text.includes("varnish") ||
    text.includes("lacquer") ||
    text.includes("coating") ||
    text.includes("sealer") ||
    text.includes("pintura")
  ) {
    return "paint_finish";
  }

  // 3. Bulky furniture
  if (
    productSpec?.typology === "bulky_furniture" ||
    text.includes("sofa") ||
    text.includes("couch") ||
    text.includes("standing desk") ||
    text.includes("mattress") ||
    text.includes("dining table") ||
    text.includes("coffee table") ||
    text.includes("bed frame")
  ) {
    return "showroom_floor";
  }

  // 4. Apparel / Wearable (Default to Ghost Mannequin, though user can choose Persona Orbit)
  if (
    productSpec?.typology === "apparel_wearable" ||
    text.includes("jacket") ||
    text.includes("hoodie") ||
    text.includes("fleece") ||
    text.includes("sweater") ||
    text.includes("coat") ||
    text.includes("dress") ||
    text.includes("shirt") ||
    text.includes("trousers") ||
    text.includes("pants") ||
    text.includes("suit") ||
    text.includes("blazer")
  ) {
    if (
      !text.includes("shoe") &&
      !text.includes("sneaker") &&
      !text.includes("boot") &&
      !text.includes("watch") &&
      !text.includes("jewelry")
    ) {
      return "apparel_mannequin";
    }
  }

  // Default: Classic Podium Pedestal (ideal for watches, sneakers, tech gadgets, perfumes, cosmetics)
  return "podium_pedestal";
}

/**
 * Compiles the complete production prompt for Neural Product Turntable.
 * Supports both MiniMax H3 (multimodal structured format) and Google Veo 3.1 (cinematic camera phrasing).
 */
export function compileTurntablePrompt(params: TurntableCompilationParams): string {
  const {
    productName,
    engine = "minimax_h3",
    stagingArchetype = "podium_pedestal",
    motionPreset = "hero_arc_60",
    pedestalStyle = "obsidian_black",
    lightingStyle = "luxury_gold",
    cameraElevation = "eye_level",
    variantTitle,
    variantColorHex,
    environmentId,
    environmentPrompt,
    personaId = "ruby",
    groundedFeatures = ["primary brand emblem", "front label", "outer contours"],
  } = params;

  const motionConfig =
    TURNTABLE_MOTION_PRESETS.find((m) => m.id === motionPreset) || TURNTABLE_MOTION_PRESETS[0];
  const pedestalConfig =
    TURNTABLE_PEDESTALS.find((p) => p.id === pedestalStyle) || TURNTABLE_PEDESTALS[0];
  const lightingConfig =
    TURNTABLE_LIGHTING_STYLES.find((l) => l.id === lightingStyle) || TURNTABLE_LIGHTING_STYLES[0];
  const elevationConfig =
    TURNTABLE_CAMERA_ELEVATIONS.find((e) => e.id === cameraElevation) || TURNTABLE_CAMERA_ELEVATIONS[0];

  const envPreset = environmentId ? getEnvironmentById(environmentId) : undefined;
  const effectiveEnvText = environmentPrompt?.trim()
    ? environmentPrompt.trim()
    : envPreset
    ? envPreset.promptDescription
    : "Clean, dry, dark luxury commercial studio backdrop with soft atmospheric vignette.";

  const personaCapitalized = personaId ? personaId.charAt(0).toUpperCase() + personaId.slice(1) : "Ruby";
  const variantClause = variantTitle
    ? `Product variant and colorway: ${variantTitle}${variantColorHex ? ` (${variantColorHex})` : ""}.`
    : "";

  // Build Staging Clause
  let stagingClause = "";
  switch (stagingArchetype) {
    case "persona_orbit":
      stagingClause = `Professional presenter ${personaCapitalized} is standing gracefully wearing and showcasing the ${productName}, posed naturally with authentic confidence while the camera performs a smooth continuous 360-degree orbital arc sweep around her.`;
      break;
    case "material_swatch":
      stagingClause = `The authentic sample slab of ${productName} rests elegantly on an angled 45-degree minimalist architectural display easel. Dynamic grazing raking light sweeps smoothly across the surface, highlighting micro-bevels, natural surface texture, authentic grain, and refined finish sheen with high optical fidelity.`;
      break;
    case "paint_finish":
      stagingClause = `The container of ${productName} stands proudly on an industrial-clean studio plinth beside an accompanying architectural test swatch board and dipped wooden paddle, with dynamic light glints showcasing liquid viscosity, rich color depth, and smooth uniform coverage.`;
      break;
    case "apparel_mannequin":
      stagingClause = `The ${productName} is tailored onto an elegant minimalist invisible ghost mannequin form on a full-height showroom floor turntable, smoothly rotating to display pristine fabric drape, collar architecture, structured shoulders, and back silhouette.`;
      break;
    case "showroom_floor":
      stagingClause = `The ${productName} sits centered upon an expansive low-profile 2-meter floor turntable in a spacious modern architectural loft showroom, rotating gently to showcase full scale, ergonomic proportions, and craftsmanship.`;
      break;
    case "exploded_view":
      stagingClause = `The ${productName} undergoes an engineering 2-stage deconstruction: the product begins fully assembled on a high-precision stage, smoothly separates along primary axes into exploded floating internal components (chassis, internal drivers, battery cell, precision circuitry, and outer shell) floating in stable zero-gravity alignment with holographic clarity, then magnetizes back together into the solid monolithic product while executing a continuous 360-degree rotation.`;
      break;
    case "podium_pedestal":
    default:
      stagingClause = `The ${productName} stands centered upon the ${pedestalConfig.promptDescription}.`;
      break;
  }

  // --- BRANCH 1: MiniMax H3 + TaoMate Engine ---
  if (engine === "minimax_h3") {
    const isPersona = stagingArchetype === "persona_orbit";

    return [
      `integrated_multimodal_description: [Shot 1] <Picture 1> (S1) Smooth controlled commercial product showcase of ${productName}.`,
      variantClause,
      isPersona
        ? `Stationary tripod camera with shallow depth of field performing a smooth orbital arc.`
        : `Fixed stationary macro tripod studio camera with shallow depth of field.`,
      stagingClause,
      `Camera framing and perspective: ${elevationConfig.promptDescription}.`,
      isPersona
        ? `The camera glides across a ${motionConfig.promptDescription}.`
        : `The turntable platform rotates gently across a ${motionConfig.promptDescription}.`,
      isPersona
        ? `The garment ${productName} fits naturally onto ${personaCapitalized} with zero fabric jitter and zero mesh deformation.`
        : `The entire ${productName} and its components (${groundedFeatures.join(
            ", "
          )}) form a single monolithic rigid solid body: all components are permanently locked and rotate in exact 100% synchronized unison with the platform at all times, with zero independent spinning, zero cap/sole/dial twisting, zero warping, and zero component decoupling.`,
      `All logos, brand emblems, typography, and surface details remain permanently sharp, crisp, completely legible, and uncorrupted throughout the sequence.`,
      lightingConfig.promptDescription,
      effectiveEnvText,
      `Zero water droplets, zero mist, zero water bubbles, zero condensation, zero spray, zero splashes, zero floating particles, completely dry studio environment, clean solid smooth background, perfectly rigid geometry, zero shape morphing, luxury commercial packshot cinematography.\n\n`,
      `overall_soundscape: Quiet luxury commercial studio room, pristine silence.\n\n`,
      `non_diegetic_music: N/A`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  // --- BRANCH 2: Google Veo 3.1 Cloud Diffusion Engine ---
  const isPersona = stagingArchetype === "persona_orbit";
  return [
    `Cinematic 8k commercial showcase of ${productName}.`,
    variantClause,
    isPersona
      ? `Featuring ${personaCapitalized} wearing and presenting ${productName}.`
      : "",
    stagingClause,
    `Framed from an ${elevationConfig.promptDescription}.`,
    `Camera executes a ${motionConfig.promptDescription}.`,
    lightingConfig.promptDescription,
    `Background setting: ${effectiveEnvText}.`,
    `Shallow depth of field, sharp crisp macro focus on product textures and logos, smooth motion, high-end television commercial cinematography, 30fps.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function getTurntableMotionPresets(): TurntableMotionConfig[] {
  return TURNTABLE_MOTION_PRESETS;
}

export function getTurntablePedestals(): TurntablePedestalConfig[] {
  return TURNTABLE_PEDESTALS;
}

export function getTurntableLightingStyles(): TurntableLightingConfig[] {
  return TURNTABLE_LIGHTING_STYLES;
}

export function getTurntableStagingArchetypes(): TurntableStagingArchetypeConfig[] {
  return TURNTABLE_STAGING_ARCHETYPES;
}

export function getTurntableCameraElevations(): TurntableCameraElevationConfig[] {
  return TURNTABLE_CAMERA_ELEVATIONS;
}
