/**
 * scripts/veo-cli/flowCharacterRegistry.ts
 *
 * Resolves persona identity, reference image assets, and attire configurations
 * for Google Flow (flow.google.com) Characters integration.
 */

import fs from "fs";
import path from "path";
import {
  Persona,
  PERSONAS,
  getPersonaById,
  getAllPersonas,
  compileFlowCharacterInfo,
  resolveFlowVoice,
} from "../../src/lib/tts/personas";

/**
 * Computes Google Flow character short name convention:
 * Name + first letter of last name (e.g. "Ruby Vance" -> "RubyV", "Mateo Beltrán" -> "MateoB")
 */
export function getFlowCharacterShortName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]}${parts[parts.length - 1].charAt(0).toUpperCase()}`;
  }
  return parts[0];
}

export interface FlowCharacterConfig {
  personaId: string;
  characterName: string;
  shortName: string;
  fullName: string;
  aliases: string[];
  tag: string;
  description: string;
  defaultAttire: string;
  hairDescription: string;
  voiceName: string;
  voicePerformance: string;
  sampleDialogue: string;
  headshotPath?: string;
  bodyRefPath?: string;
  chromaMasterPath?: string;
  allReferenceImages: string[];
  wardrobePresets: { id: string; name: string; prompt: string }[];
}

export const WARDROBE_PRESETS: { id: string; name: string; prompt: string }[] = [
  {
    id: "look_01_prime_blazer",
    name: "Executive Prime-Time Blazer",
    prompt: "Structured double-breasted navy blue crepe blazer with peaked lapels, gold crest buttons, and crisp white silk camisole",
  },
  {
    id: "look_02_crimson_sheath",
    name: "Crimson Red Asymmetric Sheath",
    prompt: "Structured crimson-red tailored crepe sheath dress with architectural asymmetric neckline and gold cuff bracelet",
  },
  {
    id: "look_03_cobalt_sweetheart",
    name: "Cobalt Blue Sweetheart Gown",
    prompt: "Form-fitting royal cobalt blue sweetheart neckline dress with gold waist belt and delicate gold chain necklace",
  },
  {
    id: "look_04_velvet_tuxedo",
    name: "Midnight Black Velvet Tuxedo",
    prompt: "High-fashion tailored black velvet tuxedo jacket with silk satin lapels and black tailored trousers",
  },
  {
    id: "look_05_moto_leather",
    name: "Cropped Biker Leather Jacket",
    prompt: "Black moto leather cropped biker jacket with silver asymmetric zippers over tight black cutout bandeau and leather pants",
  },
  {
    id: "look_06_cyber_neon",
    name: "Cyberpunk Neon-Lined Streetwear",
    prompt: "Metallic silver bomber jacket with glowing purple-lined collar over neon crop top and high-waisted cargo pants",
  },
  {
    id: "look_07_cashmere_knit",
    name: "Oversized Cashmere Chunky Knit",
    prompt: "Cozy oversized mustard-yellow chunky knit cashmere sweater over white collared shirt and tailored dark trousers",
  },
  {
    id: "look_08_italian_linen",
    name: "Crisp Sand-Colored Italian Linen",
    prompt: "Relaxed sand-colored Italian linen suit jacket worn over an open-collar white linen shirt, effortless summer sophistication",
  },
  {
    id: "look_09_tech_bomber",
    name: "Weatherproof Tactical Tech Bomber",
    prompt: "Matte black tactical techwear bomber jacket with magnetic chest buckles and modular utility strap pockets",
  },
  {
    id: "look_10_salesman_dress_shirt",
    name: "Crisp Oxford Dress Shirt (Sales Closer, No Suit)",
    prompt: "Crisp pressed white tailored Oxford dress shirt with open spread collar and sleeves rolled to mid-forearm, flat-front charcoal trousers, black leather belt, luxury steel watch, no jacket, no blazer, no suit coat",
  },
  {
    id: "look_11_tactical_track",
    name: "Tactical Athletic Track Jacket (Volt)",
    prompt: "Modern matte black and electric cobalt athletic tracksuit jacket with zipped high collar over athletic compression top",
  },
  {
    id: "look_12_navy_tailored",
    name: "Navy Tailored Italian Blazer (Diego)",
    prompt: "Classic navy blue tailored Italian wool blazer over crisp light blue dress shirt with open collar and dark trousers",
  },
  {
    id: "look_13_emerald_crepe",
    name: "Emerald Crepe Anchor Blazer (Camila)",
    prompt: "Tailored emerald-green crepe blazer with sharp peaked lapels over ivory silk camisole and delicate gold pendant",
  },
  {
    id: "look_14_crimson_anchor",
    name: "Crimson Executive Anchor Suit (Atlas)",
    prompt: "Tailored deep crimson executive anchor suit jacket with black satin lapels over black silk dress shirt",
  },
  {
    id: "look_15_storm_weather",
    name: "High-Visibility Storm Weather Jacket (Storm)",
    prompt: "High-visibility red all-weather storm broadcast field jacket with waterproof zips over dark grey technical knit",
  },
  {
    id: "look_16_plum_velvet",
    name: "Deep Plum Velvet Tuxedo (Luna)",
    prompt: "Sophisticated deep plum-purple velvet tuxedo jacket with black satin shawl collar over black silk v-neck blouse",
  },
  {
    id: "look_17_charcoal_bomber",
    name: "Charcoal Tech Startup Bomber (Austin)",
    prompt: "Matte charcoal technical techwear bomber jacket over branded dark tech-startup crewneck tee and dark slim denim",
  },
  {
    id: "look_18_sapphire_asymmetric",
    name: "Royal Sapphire Asymmetric Blazer (Sofia)",
    prompt: "Architectural royal sapphire blue tailored asymmetric blazer over minimalist black mock-neck top",
  },
  {
    id: "look_19_graphite_pinstripe",
    name: "Graphite Pinstripe Executive Suit (Hawk)",
    prompt: "Sharp graphite grey pinstripe three-piece suit with white spread collar shirt and dark silk tie",
  },
  {
    id: "look_20_cream_cashmere",
    name: "Luxury Cream Cashmere Blazer (Jade)",
    prompt: "Luxurious cream ivory tailored cashmere blazer over champagne satin blouse with delicate gold chain",
  },
];

/**
 * Resolves full Flow character profile for any NewsStudio persona
 */
export function getFlowCharacterConfig(personaSlug: string): FlowCharacterConfig {
  const persona = getPersonaById(personaSlug) || PERSONAS[0];
  const avatarsDir = path.resolve(process.cwd(), "public", "avatars");

  // 1. Resolve headshot
  const headshotCandidates = [
    path.join(avatarsDir, `${persona.id}.png`),
    path.join(avatarsDir, `${persona.id}_ref.png`),
    path.join(avatarsDir, `${persona.id}.jpg`),
  ];
  const headshotPath = headshotCandidates.find((p) => fs.existsSync(p));

  // 2. Resolve body reference (prioritize 4-angle/360 turnaround sheets, then standing chroma master)
  const compositedDir = path.resolve(process.cwd(), "public", "studio_environments", "composited_scenes");

  // 3. Resolve master chroma pose (e.g. master_mateo_archive/domain_chroma_wall_standing_default_trait or master_ruby_archive)
  let chromaMasterPath: string | undefined;
  const personaArchiveDir = path.join(avatarsDir, `master_${persona.id}_archive`);
  if (fs.existsSync(personaArchiveDir)) {
    try {
      const subdirs = fs.readdirSync(personaArchiveDir).filter((d) => {
        const full = path.join(personaArchiveDir, d);
        return fs.statSync(full).isDirectory() && (d.includes("chroma") || d.includes("standing") || d.includes("poses")) && !d.includes("backup") && !d.includes("1x1") && !d.includes("_old");
      }).sort((a, b) => {
        if (persona.id === "volt" && a.includes("tactical_track_jacket")) return -1;
        if (persona.id === "ruby" && a.includes("burgundy")) return -1;
        if (persona.id === "blaze" && a.includes("silver_blazer")) return -1;
        return 0;
      });
      for (const sub of subdirs) {
        const subPath = path.join(personaArchiveDir, sub);
        const files = fs.readdirSync(subPath).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));
        const m1 = files.find((f) => f.includes("01_M1") || f.includes("m1") || f.includes("stand_base"));
        if (m1) {
          chromaMasterPath = path.join(subPath, m1);
          break;
        }
        if (files.length > 0 && !chromaMasterPath) {
          chromaMasterPath = path.join(subPath, files[0]);
        }
      }
    } catch {}
  }

  const bodyCandidates = [
    path.join(compositedDir, `${persona.id}_4view_turntable_master.jpg`),
    path.join(compositedDir, `${persona.id}_4view_turntable_master.png`),
    path.join(compositedDir, `${persona.id}_360_turntable_master.jpg`),
    path.join(compositedDir, `${persona.id}_360_turntable_master.png`),
    path.join(compositedDir, `${persona.id}_9panel_master_blueprint.jpg`),
    ...(chromaMasterPath ? [chromaMasterPath] : []),
    path.join(avatarsDir, `${persona.id}_body_ref.png`),
    path.join(avatarsDir, `${persona.id}_ref.png`),
  ];
  const bodyRefPath = bodyCandidates.find((p) => fs.existsSync(p));

  const allImages: string[] = [];
  if (headshotPath) allImages.push(headshotPath);
  if (bodyRefPath && !allImages.includes(bodyRefPath)) allImages.push(bodyRefPath);
  if (chromaMasterPath && !allImages.includes(chromaMasterPath)) allImages.push(chromaMasterPath);

  // Fallback: search avatarsDir for any matching files
  if (allImages.length === 0) {
    const fallback = path.join(avatarsDir, `${persona.id}.png`);
    if (fs.existsSync(fallback)) allImages.push(fallback);
  }

  const traits = persona.traits || ({} as any);
  const defaultAttire = traits.defaultAttire || "Tailored executive broadcast blazer over crisp silk top";
  const hair = traits.hair || "Professional broadcast hairstyle";

  const shortName = getFlowCharacterShortName(persona.name);
  const fullName = persona.name;
  const tag = `@${shortName}`;
  const aliases = Array.from(
    new Set([
      shortName,
      fullName,
      persona.name,
      persona.id,
      persona.name.split(/\s+/)[0],
      `${shortName}Character`,
    ])
  );

  const voiceInfo = resolveFlowVoice(persona);
  const compiledDescription = compileFlowCharacterInfo(persona);

  return {
    personaId: persona.id,
    characterName: shortName,
    shortName,
    fullName,
    aliases,
    tag,
    description: compiledDescription,
    defaultAttire,
    hairDescription: hair,
    voiceName: voiceInfo.voiceName,
    voicePerformance: voiceInfo.voicePerformance,
    sampleDialogue: voiceInfo.sampleDialogue,
    headshotPath,
    bodyRefPath,
    chromaMasterPath,
    allReferenceImages: allImages,
    wardrobePresets: WARDROBE_PRESETS,
  };
}

/**
 * Returns list of all available Flow-ready persona profiles
 */
export function listAllFlowCharacters(): FlowCharacterConfig[] {
  return getAllPersonas().map((p) => getFlowCharacterConfig(p.id));
}
