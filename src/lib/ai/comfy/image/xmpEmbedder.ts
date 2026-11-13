/**
 * src/lib/ai/comfy/image/xmpEmbedder.ts
 *
 * Task EX-10 (IMAGE_ROADMAP.md Part 14).
 * Generation Session State Embedding & XMP Reproducibility Engine.
 * Embeds complete pipeline parameters into PNG metadata for deterministic replay.
 */

import { comfyLog } from "../api";

export interface GenerationMetadataPayload {
  masterSeed: number;
  pipelineMode: string;
  contentMode?: string;
  stageCount: number;
  personaKey: string;
  prompts: Record<string, string>;
  loras: Array<{ name: string; strength: number }>;
  generatedAt: string;
}

/**
 * Task EX-10: Formats metadata payload into an XMP metadata XML string block.
 */
export function formatXMPMetadataString(payload: GenerationMetadataPayload): string {
  const jsonStr = JSON.stringify(payload);
  return `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"><rdf:Description xmlns:newsstudio="http://newsstudio.ai/ns/1.0/" newsstudio:GenerationState="${encodeURIComponent(jsonStr)}"/></rdf:RDF></x:xmpmeta>`;
}

/**
 * Task EX-10: Parses XMP metadata string back into GenerationMetadataPayload.
 */
export function parseXMPMetadataString(xmpString: string): GenerationMetadataPayload | null {
  try {
    const match = xmpString.match(/newsstudio:GenerationState="([^"]+)"/);
    if (!match) return null;

    const decoded = decodeURIComponent(match[1]);
    const payload: GenerationMetadataPayload = JSON.parse(decoded);
    comfyLog(`[XMPEmbedder] 📜 Parsed XMP generation metadata (Master Seed: ${payload.masterSeed}, Persona: ${payload.personaKey})`);
    return payload;
  } catch {
    comfyLog(`⚠️ [XMPEmbedder] Failed to parse XMP metadata string`);
    return null;
  }
}
