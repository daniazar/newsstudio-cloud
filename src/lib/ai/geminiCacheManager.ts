/**
 * src/lib/ai/geminiCacheManager.ts
 *
 * Targeted Gemini Context Caching & Batch API Manager.
 * 
 * Capabilities:
 *   1. Targeted Persona Caching: Caches only the active personas currently in use
 *      (e.g., Ruby & Storm, or Blaze & Isabel) rather than bloating the cache with all 48 personas.
 *   2. Studio Photoshoot Session Caching: Caches the fixed Anchor Identity + Exact Wardrobe Fabric +
 *      Studio Set Room Geometry + Lighting Color Temperature for multi-angle studio shoots.
 *      Locks environment and attire continuity across all camera shots while slashing input tokens by up to 85%.
 *   3. Batch API: Dispatches large volume, asynchronous requests at a 50% token discount.
 */

import { PERSONAS, Persona } from "../tts/personas";
import { STUDIO_PLATES_CATALOG } from "../../../scripts/gemini-cli/studioCatalog";
import type { GoogleGenAI } from "@google/genai";
import { getSystemGeminiApiKeySync } from "../tenant/credentials";
import { createLogger } from "@/lib/logger";

const log = createLogger("ai:geminiCacheManager");

export type GeminiClientLike = GoogleGenAI | {
  caches?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (params: any) => Promise<{ name?: string }>;
  };
  batches?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    create: (params: any) => Promise<{ name?: string }>;
  };
};

export interface ContextCacheInfo {
  name: string;
  model: string;
  displayName: string;
  expireTime?: string;
  ttlSeconds: number;
}

// In-memory pointer to avoid repeated lookups within the same process with strict LRU/TTL bound
const MAX_ACTIVE_CACHES = 50;
const activeCacheMap: Map<string, { cacheName: string; expiresAt: number }> = new Map();

function setCacheWithEviction(key: string, value: { cacheName: string; expiresAt: number }) {
  const now = Date.now();
  // Prune expired entries
  for (const [k, v] of activeCacheMap.entries()) {
    if (v.expiresAt <= now) {
      activeCacheMap.delete(k);
    }
  }
  // If still above limit, evict oldest entry
  if (activeCacheMap.size >= MAX_ACTIVE_CACHES) {
    const oldestKey = activeCacheMap.keys().next().value;
    if (oldestKey) activeCacheMap.delete(oldestKey);
  }
  activeCacheMap.set(key, value);
}

/**
 * Builds a lean, targeted NewsStudio Context Document containing ONLY the active personas in use.
 */
export function buildTargetedPersonaContextDocument(activePersonaIds: string[] = ["ruby"]): string {
  const selectedPersonas = PERSONAS.filter((p) => activePersonaIds.includes(p.id));
  const activeList = selectedPersonas.length > 0 ? selectedPersonas : [PERSONAS[0]];

  let doc = `# RUBY NEWSSTUDIO TARGETED BROADCAST CONTEXT\n\n`;
  doc += `## Active Anchor Personas (${activeList.length})\n`;
  for (const p of activeList) {
    doc += `### Persona: ${p.name} [ID: ${p.id}] (${p.gender}, Age: ${p.traits.age})\n`;
    doc += `- Title: ${p.title}\n`;
    doc += `- Facial Anatomy & Landmark Features: ${p.traits.face}\n`;
    doc += `- Skin Tone: ${p.traits.skinTone || "natural"}\n`;
    doc += `- Hair: ${p.traits.hair || "natural"}\n`;
    doc += `- Build: ${p.traits.build || "athletic broadcast anchor physique"}\n`;
    doc += `- Default Attire: ${p.traits.defaultAttire || "Professional Broadcast Suit"}\n\n`;
  }

  doc += `## Broadcast Production Standards\n`;
  doc += `- Cam 1: Center Wide (35mm lens, 0° dead-center waist-up establishing shot).\n`;
  doc += `- Cam 2: Left Tight (50mm lens, 20° left angle, focused medium close-up).\n`;
  doc += `- Cam 3: Right Closeup (85mm portrait lens, 20° right angle, macro catchlights).\n`;
  doc += `- Fact-Checking: 0-100% veracity scoring based on multi-source wire verification.\n`;
  doc += `- Tickers: High-impact lower-third headlines under 75 characters.\n`;

  return doc;
}

/**
 * Builds a locked Studio Photoshoot Session Context Document caching:
 * - Specific Anchor Persona & Physical Landmarks
 * - Exact Wardrobe Design & Fabric Textures
 * - Specific Studio Set Architecture & Environment Materials
 * - Consistent Lighting Mood & Color Temperature
 */
export function buildStudioPhotoshootContextDocument(
  persona: Persona,
  attireDesc: string,
  studioPlateKey: string = "section_01_anchor_desk"
): string {
  const plate = STUDIO_PLATES_CATALOG[studioPlateKey] || STUDIO_PLATES_CATALOG.section_01_anchor_desk;

  let doc = `# STUDIO PHOTOSHOOT MASTER CONTINUITY CACHE: ${persona.name.toUpperCase()}\n\n`;
  doc += `## 1. Locked Anchor Subject Likeness\n`;
  doc += `- Name: ${persona.name} (${persona.id})\n`;
  doc += `- Age & Build: ${persona.traits.age}-year-old ${persona.gender}, athletic broadcast anchor physique.\n`;
  doc += `- Facial Landmarks: ${persona.traits.face}\n`;
  doc += `- Skin Tone: ${persona.traits.skinTone || "smooth natural skin with realistic pores and specular catchlights"}\n\n`;

  doc += `## 2. Locked Wardrobe Specification\n`;
  doc += `- Attire Description: ${attireDesc}\n`;
  doc += `- Directive: Keep this EXACT wardrobe design, fabrics, color palette, and accessories across all photoshoot camera angles and poses.\n\n`;

  doc += `## 3. Locked Studio Set & Environment\n`;
  doc += `- Studio Plate: ${plate.label}\n`;
  doc += `- Architecture & Materials: ${plate.description}\n`;
  doc += `- Room Consistency: Maintain identical physical room geometry, textures, desk materials, and backdrop elements in all shots.\n\n`;

  doc += `## 4. Locked Lighting & Optical Atmosphere\n`;
  doc += `- Lighting: Professional broadcast studio lighting with soft natural illumination and 3-point key/fill/rim balance.\n`;
  doc += `- Optics: Sharp broadcast studio lenses with matched specular reflections.\n`;

  return doc;
}

/**
 * Retrieves an active Context Cache or creates a new one for specific active personas.
 */
export async function getOrCreateContextCache(
  ai: GeminiClientLike,
  modelName: string = "gemini-2.5-flash",
  activePersonaIds: string[] = ["ruby"],
  ttlSeconds: number = 3600 // Default: 1 Hour for active session
): Promise<string | null> {
  const sortedIds = [...activePersonaIds].sort().join("_");
  const cacheKey = `${modelName}_cache_${sortedIds}`;
  const cached = activeCacheMap.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.cacheName;
  }

  try {
    log.info(`⚡ [Context Caching] Checking/Creating lean context cache for personas: [${activePersonaIds.join(", ")}]...`);

    // Check if ai.caches is available in SDK
    if (!ai.caches || typeof ai.caches.create !== "function") {
      log.info(`ℹ️ [Context Caching] ai.caches API not present on SDK client. Proceeding with inline context.`);
      return null;
    }

    const targetedDoc = buildTargetedPersonaContextDocument(activePersonaIds);

    const cacheResult = await ai.caches.create({
      model: modelName,
      config: {
        displayName: `newsstudio_cache_${sortedIds.slice(0, 30)}`,
        ttl: `${ttlSeconds}s`,
        systemInstruction: {
          parts: [
            {
              text: `You are the Executive Producer & Visual Director for Ruby NewsStudio. You possess full knowledge of active anchor personas: ${activePersonaIds.join(", ")}.`,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: targetedDoc }],
          },
        ],
      },
    });

    if (cacheResult && cacheResult.name) {
      log.info(`🎉 [Context Caching] Lean Cache Created! Name: ${cacheResult.name} (Personas: ${activePersonaIds.join(", ")}, TTL: ${ttlSeconds}s)`);
      setCacheWithEviction(cacheKey, {
        cacheName: cacheResult.name,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return cacheResult.name;
    }

    return null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️ [Context Caching] Cache creation skipped (${message}). Falling back to standard inline prompt execution.`);
    return null;
  }
}

/**
 * Retrieves or creates a dedicated Studio Photoshoot Session Cache
 * locking the anchor likeness + wardrobe + studio environment + lighting.
 */
export async function getOrCreateStudioPhotoshootCache(
  ai: GeminiClientLike,
  persona: Persona,
  attireDesc: string,
  studioPlateKey: string = "section_01",
  lightingKey: string = "default",
  modelName: string = "gemini-2.5-flash",
  ttlSeconds: number = 7200 // 2 Hours for complete photoshoot session
): Promise<string | null> {
  const cacheKey = `${modelName}_shoot_${persona.id}_${studioPlateKey}_${lightingKey}`;
  const cached = activeCacheMap.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.cacheName;
  }

  try {
    log.info(`⚡ [Photoshoot Caching] Locking Master Session Cache for ${persona.name} in ${studioPlateKey} (${lightingKey})...`);

    if (!ai.caches || typeof ai.caches.create !== "function") {
      return null;
    }

    const shootDoc = buildStudioPhotoshootContextDocument(persona, attireDesc, studioPlateKey);

    const cacheResult = await ai.caches.create({
      model: modelName,
      config: {
        displayName: `shoot_${persona.id}_${studioPlateKey.slice(0, 15)}`,
        ttl: `${ttlSeconds}s`,
        systemInstruction: {
          parts: [
            {
              text: `You are the Master Studio Photographer for NewsStudio. Lock the exact anchor likeness, wardrobe fabrics, and studio geometry described in the context.`,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: shootDoc }],
          },
        ],
      },
    });

    if (cacheResult && cacheResult.name) {
      log.info(`🎉 [Photoshoot Caching] Master Session Cache Locked! Name: ${cacheResult.name} (TTL: ${ttlSeconds}s)`);
      setCacheWithEviction(cacheKey, {
        cacheName: cacheResult.name,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return cacheResult.name;
    }

    return null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️ [Photoshoot Caching] Session cache creation skipped (${message}).`);
    return null;
  }
}

/**
 * Builds a Chroma Master Session Context Document for:
 * - 4-in-1 Multi-View Character Strips (Front, Left, Right, Macro)
 * - 10-Gesture Looping Master Reference Keyframes (P1 -> P2 -> P3)
 */
export function buildChromaLoopSessionContextDocument(
  persona: Persona,
  attireDesc: string,
  chromaColorHex: string = "#00B140",
  chromaName: string = "Chroma Green"
): string {
  let doc = `# MASTER CHROMA LOOP & MULTI-VIEW SESSION CACHE: ${persona.name.toUpperCase()}\n\n`;
  doc += `## 1. Locked Subject Anatomy & Permanent Landmarks\n`;
  doc += `- Name: ${persona.name} (${persona.id})\n`;
  doc += `- Age & Gender: ${persona.traits.age}-year-old ${persona.gender}\n`;
  doc += `- Facial Landmarks: ${persona.traits.face}\n`;
  doc += `- Skin Tone: ${persona.traits.skinTone || "natural skin tone with fine skin texture"}\n\n`;

  doc += `## 2. Locked Wardrobe Continuity\n`;
  doc += `- Attire Description: ${attireDesc}\n`;
  doc += `- Strict Continuity: Maintain identical clothing cuts, fabrics, colors, folds, and accessories across all angles and keyframe loops.\n\n`;

  doc += `## 3. Locked Chroma Backdrop & Lighting\n`;
  doc += `- Backdrop: Perfectly flat, solid, shadowless ${chromaName} (${chromaColorHex}) cyclorama backdrop.\n`;
  doc += `- Lighting: 5600K clean broadcast studio lighting, zero spill on skin, crisp hair rim light.\n\n`;

  doc += `## 4. Multi-Shot Continuity Protocol\n`;
  doc += `- Maintain 100% facial symmetry, eye catchlights, ear height, and shoulder width across all poses, camera angles, and action loop keyframes.\n`;

  return doc;
}

/**
 * Retrieves or creates a dedicated Chroma Loop & Multi-View Session Cache.
 */
export async function getOrCreateChromaLoopSessionCache(
  ai: GeminiClientLike,
  persona: Persona,
  attireDesc: string,
  chromaColorHex: string = "#00B140",
  chromaName: string = "Chroma Green",
  modelName: string = "gemini-2.5-flash",
  ttlSeconds: number = 7200 // 2 Hours for complete loop suite session
): Promise<string | null> {
  const cacheKey = `${modelName}_chromaloop_${persona.id}_${chromaName.toLowerCase().replace(/\s+/g, "_")}`;
  const cached = activeCacheMap.get(cacheKey);

  if (cached && cached.expiresAt > Date.now() + 60000) {
    return cached.cacheName;
  }

  try {
    log.info(`⚡ [Chroma Loop Caching] Locking Multi-View / Loop Session Cache for ${persona.name} (${chromaName})...`);

    if (!ai.caches || typeof ai.caches.create !== "function") {
      return null;
    }

    const chromaDoc = buildChromaLoopSessionContextDocument(persona, attireDesc, chromaColorHex, chromaName);

    const cacheResult = await ai.caches.create({
      model: modelName,
      config: {
        displayName: `chroma_${persona.id}_${chromaName.toLowerCase().replace(/\s+/g, "_")}`,
        ttl: `${ttlSeconds}s`,
        systemInstruction: {
          parts: [
            {
              text: `You are the Master Character Continuity Director for NewsStudio. Enforce strict 100% face and attire identity lock across all multi-angle views and looping keyframes.`,
            },
          ],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: chromaDoc }],
          },
        ],
      },
    });

    if (cacheResult && cacheResult.name) {
      log.info(`🎉 [Chroma Loop Caching] Master Session Cache Locked! Name: ${cacheResult.name} (TTL: ${ttlSeconds}s)`);
      setCacheWithEviction(cacheKey, {
        cacheName: cacheResult.name,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return cacheResult.name;
    }

    return null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️ [Chroma Loop Caching] Session cache creation skipped (${message}).`);
    return null;
  }
}


/**
 * Creates an asynchronous Batch API Job for 50% token cost reduction on large workloads.
 */
export async function submitGeminiBatchJob(
  ai: GeminiClientLike,
  requests: { customId: string; prompt: string; systemInstruction?: string }[],
  modelName: string = "gemini-2.5-flash"
): Promise<{ batchId: string; status: string } | null> {
  log.info(`\n📦 [Batch API] Submitting ${requests.length} asynchronous requests to Gemini Batch API (50% Cost Discount)...`);

  try {
    if (!ai.batches || typeof ai.batches.create !== "function") {
      log.info(`ℹ️ [Batch API] ai.batches API not supported in current environment. Executing synchronously.`);
      return null;
    }

    const batchRequest = {
      model: modelName,
      dataset: requests.map((r) => ({
        customId: r.customId,
        request: {
          contents: [{ role: "user", parts: [{ text: r.prompt }] }],
          systemInstruction: r.systemInstruction ? { parts: [{ text: r.systemInstruction }] } : undefined,
        },
      })),
    };

    const result = await (ai.batches.create as (params: unknown) => Promise<{ name?: string }>)(batchRequest);
    log.info(`✅ [Batch API] Batch Job Submitted! Batch ID: ${result.name || "BATCH_JOB_QUEUED"}`);
    return {
      batchId: result.name || "BATCH_JOB_QUEUED",
      status: "QUEUED",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️ [Batch API] Batch submission failed (${message}). Falling back to sequential execution.`);
    return null;
  }
}

/**
 * Clears in-memory active cache mappings (useful in unit testing).
 */
export function clearContextCacheMemory(): void {
  activeCacheMap.clear();
}

/**
 * Resolves a Google Gemini Context Cache resource name for use with the AI SDK Gateway
 * (providerOptions: { google: { cachedContent } }).
 *
 * Returns null gracefully if GEMINI_API_KEY is not configured or in offline/test environments.
 */
export async function resolveGatewayContextCache(
  activePersonaIds: string[] = ["ruby"],
  options?: {
    modelName?: string;
    ttlSeconds?: number;
    apiKey?: string;
    client?: GeminiClientLike;
  }
): Promise<string | null> {
  const apiKey =
    options?.apiKey ||
    getSystemGeminiApiKeySync() ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!apiKey && !options?.client) {
    return null;
  }

  const modelName = options?.modelName || "gemini-2.5-flash";
  const ttlSeconds = options?.ttlSeconds ?? 3600;

  try {
    let client = options?.client;
    if (!client) {
      const { GoogleGenAI } = await import("@google/genai");
      client = new GoogleGenAI({ apiKey });
    }
    return await getOrCreateContextCache(client, modelName, activePersonaIds, ttlSeconds);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`⚠️ [Context Caching] resolveGatewayContextCache skipped (${message}).`);
    return null;
  }
}
