/**
 * src/lib/ai/comfy/image/personaKnowledgeGraph.ts
 *
 * Task OB-3 (IMAGE_ROADMAP.md Part 19).
 * Persona Knowledge Graph Engine.
 * Manages structured identity knowledge graphs (canonical ground truth features, skin textures,
 * uncensored anatomical details, wardrobe by context, relationship dynamics, golden seeds)
 * derived dynamically from PERSONAS in personas.ts without code duplication.
 */

import fs from "fs";
import path from "path";
import { PERSONAS,getPersonaById,getPersonaNudeBase } from "../../../tts/personas";
import { comfyLog } from "../api";

export interface UncensoredAnatomicDetails {
  bareTorso?: string;
  breasts?: string;
  vulva?: string;
  phallus?: string;
}

export interface CanonicalIdentity {
  hairColor: string;
  eyeColor: string;
  skinTone: string;
  skinTexture?: string;
  build: string;
  distinctiveFeatures: string[];
  bestCameraAngle: string;
  knownFailureTriggers: string[];
  uncensoredAnatomy?: UncensoredAnatomicDetails;
}

export interface PersonaKnowledgeGraph {
  personaId: string;
  canonical: CanonicalIdentity;
  wardrobeByContext: Record<string, string[]>;
  relationships: Record<string, { type: string; dynamicTags: string }>;
  generationPreferences: {
    goldenSeedsByScene: Record<string, number>;
    bestLoraStrength: number;
  };
}

/**
 * Task OB-3: Dynamically builds baseline knowledge graph for a persona from PERSONAS registry in personas.ts.
 */
export function buildDefaultKnowledgeGraph(personaId: string): PersonaKnowledgeGraph {
  const p = getPersonaById(personaId) || PERSONAS.find(item => item.id.toLowerCase() === personaId.toLowerCase()) || PERSONAS[0];
  const t = p.traits || {};

  const broadcastAttire = t.defaultAttire
    ? [t.defaultAttire]
    : ["dark navy formal news anchor blazer", "charcoal grey suit jacket"];

  const uncensoredAnatomy: UncensoredAnatomicDetails | undefined = t.nudeDetails ? {
    bareTorso: t.nudeDetails.bareTorso,
    breasts: t.nudeDetails.breasts,
    vulva: t.nudeDetails.vulva,
    phallus: typeof t.nudeDetails.phallus === "object"
      ? `${t.nudeDetails.phallus.type ? t.nudeDetails.phallus.type + " " : ""}${t.nudeDetails.phallus.flaccid} (erect: ${t.nudeDetails.phallus.erect})`
      : t.nudeDetails.phallus
  } : undefined;

  const uncensoredAttire = getPersonaNudeBase(p);

  // Find co-anchor dynamically (opposite gender or complement persona)
  const coAnchor = PERSONAS.find(item => item.id !== p.id && item.gender !== p.gender) || PERSONAS.find(item => item.id !== p.id);
  const relationships: Record<string, { type: string; dynamicTags: string }> = {};
  if (coAnchor) {
    relationships[coAnchor.id.toLowerCase()] = {
      type: "co-anchor",
      dynamicTags: "professional studio rapport, balanced broadcast chemistry"
    };
  }

  return {
    personaId: p.id.toLowerCase(),
    canonical: {
      hairColor: t.hair || "chestnut brown hair",
      eyeColor: t.face || "expressive eyes",
      skinTone: t.skinTone || "fair, natural skin tone",
      skinTexture: t.skinTexture,
      build: `${t.build || "hourglass"}, ${t.heightFeet || "5'7\""}`,
      distinctiveFeatures: [p.title || p.description || "news anchor profile"],
      bestCameraAngle: "3/4 view, eye-level broadcast angle",
      knownFailureTriggers: ["harsh direct overhead light"],
      uncensoredAnatomy
    },
    wardrobeByContext: {
      broadcast: broadcastAttire,
      intimate: ["silk blouse", "boudoir attire"],
      casual: ["smart casual blazer and denim", "lounge wear"],
      uncensored: [uncensoredAttire]
    },
    relationships,
    generationPreferences: {
      goldenSeedsByScene: { studio_desk: 871930697 },
      bestLoraStrength: 0.82
    }
  };
}

/**
 * Task OB-3: Loads or resolves persona knowledge graph.
 */
export function getPersonaKnowledgeGraph(
  personaId: string,
  baseDir: string = path.join(process.cwd(), "public", "avatars")
): PersonaKnowledgeGraph {
  const file = path.join(baseDir, `${personaId.toLowerCase()}_knowledge_graph.json`);
  let graph = buildDefaultKnowledgeGraph(personaId);

  if (fs.existsSync(file)) {
    try {
      const diskGraph = JSON.parse(fs.readFileSync(file, "utf-8"));
      graph = {
        ...graph,
        ...diskGraph,
        canonical: {
          ...graph.canonical,
          ...(diskGraph.canonical || {})
        },
        wardrobeByContext: {
          ...graph.wardrobeByContext,
          ...(diskGraph.wardrobeByContext || {})
        },
        relationships: {
          ...graph.relationships,
          ...(diskGraph.relationships || {})
        }
      };
    } catch {}
  }

  comfyLog(`[PersonaKnowledgeGraph] 🧠 Loaded Knowledge Graph for persona "${personaId}" (${graph.canonical.hairColor}, ${graph.canonical.eyeColor})`);
  return graph;
}

/**
 * Returns knowledge graphs for all registered personas in personas.ts.
 */
export function getAllPersonaKnowledgeGraphs(
  baseDir: string = path.join(process.cwd(), "public", "avatars")
): Record<string, PersonaKnowledgeGraph> {
  const result: Record<string, PersonaKnowledgeGraph> = {};
  for (const p of PERSONAS) {
    result[p.id.toLowerCase()] = getPersonaKnowledgeGraph(p.id, baseDir);
  }
  return result;
}
