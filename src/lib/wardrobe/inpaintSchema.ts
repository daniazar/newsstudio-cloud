/**
 * src/lib/wardrobe/inpaintSchema.ts
 *
 * Zod validation schema and TypeScript types for the MiniMax H3 / SAM 3.1
 * Neural Video Inpainting API requests (Attire, Hairstyle, and Compound Makeover).
 */

import { z } from "zod";

export const InpaintRequestSchema = z.object({
  sourceVideoPath: z.string().min(1, "sourceVideoPath is required"),
  outfitImagePath: z.string().min(1, "outfitImagePath is required"),
  personaName: z.string().optional().default("Ruby Vance"),
  personaId: z.string().optional().default("ruby"),
  sourceGarment: z.string().optional().default("burgundy dress"),
  outfitName: z.string().min(1, "outfitName is required"),
  outfitDescription: z.string().min(1, "outfitDescription is required"),
  trackPrompt: z.string().optional(),
  customMiniMaxPrompt: z.string().optional(),
  frameCount: z.number().optional().default(0),
  seed: z.number().optional().default(20261002),
  stream: z.boolean().optional().default(false),
  mode: z.enum(["attire", "hair", "compound", "persona"]).optional().default("attire"),
  // Neural Persona Transference fields
  targetPersonaId: z.string().optional(),
  targetPersonaName: z.string().optional(),
  targetPersonaImagePath: z.string().optional(),
  keepOriginalHair: z.boolean().optional().default(false),
  morphologyPolicy: z.enum(["strict_garment", "adapt_persona_attire", "biometric_adaptation"]).optional().default("strict_garment"),
  bodyAdaptation: z.enum(["strict_outfit", "adapt_to_persona"]).optional(),
  sleeveStyle: z.enum(["full_sleeves", "sleeveless", "match_source", "auto"]).optional().default("auto"),
  // Hairstyle & compound fields
  hairstyleId: z.string().optional(),
  hairLength: z.enum(["short", "medium", "long", "updo"]).optional(),
  hairImagePath: z.string().optional(),
  targetHairName: z.string().optional(),
  targetHairDescription: z.string().optional(),
  hairColorSwatch: z.string().optional(),
  sourceHairDescription: z.string().optional(),
  customHairPrompt: z.string().optional(),
  // Phase 3: Salon Color Science
  salonTechnique: z.enum(["solid", "ombre", "balayage", "highlights", "money_piece", "shadow_root"]).optional(),
  salonDimension: z.enum(["subtle", "medium", "bold"]).optional(),
  rootTone: z.object({ hex: z.string(), name: z.string(), description: z.string() }).optional(),
  tipTone: z.object({ hex: z.string(), name: z.string(), description: z.string() }).optional(),
  salonFormula: z.string().optional(),
  salonNegativePrompt: z.string().optional(),
  // Phase 4: Studio Environment Lighting & Color Bleed
  lightingPreset: z.enum(["broadcast_neutral", "warm_tungsten", "cool_cyan", "cyber_neon", "dramatic_noir", "golden_hour"]).optional(),
  keyDirection: z.enum(["left", "center", "right"]).optional(),
  rimLightWrap: z.number().min(0).max(100).optional(),
  despillEnabled: z.boolean().optional(),
  ambientBleedTint: z.string().optional(),
  lightingConfig: z.object({
    presetId: z.enum(["broadcast_neutral", "warm_tungsten", "cool_cyan", "cyber_neon", "dramatic_noir", "golden_hour"]).optional(),
    presetName: z.string().optional(),
    description: z.string().optional(),
    keyLight: z.object({
      name: z.string().optional(),
      hex: z.string().optional(),
      colorTempK: z.number().optional(),
      intensity: z.number().optional(),
      direction: z.enum(["left", "center", "right"]).optional(),
      role: z.enum(["key", "fill", "rim"]).optional(),
    }).optional(),
    fillLight: z.object({
      name: z.string().optional(),
      hex: z.string().optional(),
      colorTempK: z.number().optional(),
      intensity: z.number().optional(),
      direction: z.enum(["left", "center", "right"]).optional(),
      role: z.enum(["key", "fill", "rim"]).optional(),
    }).optional(),
    rimLight: z.object({
      name: z.string().optional(),
      hex: z.string().optional(),
      colorTempK: z.number().optional(),
      intensity: z.number().optional(),
      direction: z.enum(["left", "center", "right"]).optional(),
      role: z.enum(["key", "fill", "rim"]).optional(),
    }).optional(),
    ambientBleed: z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      dominantHex: z.string().optional(),
      bleedIntensity: z.number().optional(),
      bounceType: z.enum(["chroma_green", "led_wall", "warm_desk", "custom"]).optional(),
      despillWrap: z.boolean().optional(),
    }).optional(),
    rimLightWrap: z.number().min(0).max(100).optional(),
    despillEnabled: z.boolean().optional(),
    keyDirection: z.enum(["left", "center", "right"]).optional(),
    ambientTintHex: z.string().optional(),
  }).optional(),
  lightingFormula: z.string().optional(),
  // Phase 6: Volumetric Mask Padding & Studio Set Adaptability
  volumetricPaddingPercent: z.number().min(0).max(50).optional(),
  featherRadiusPixels: z.number().min(0).max(64).optional(),
  boundaryDecay: z.enum(["linear", "smoothstep", "cosine"]).optional(),
  autoVolumetricEnabled: z.boolean().optional(),
  volumetricPaddingConfig: z.object({
    paddingTopPercent: z.number().min(0).max(50).optional(),
    paddingBottomPercent: z.number().min(0).max(50).optional(),
    paddingLeftPercent: z.number().min(0).max(50).optional(),
    paddingRightPercent: z.number().min(0).max(50).optional(),
    featherRadiusPixels: z.number().min(0).max(64).optional(),
    boundaryDecay: z.enum(["linear", "smoothstep", "cosine"]).optional(),
    autoVolumetricEnabled: z.boolean().optional(),
    silhouetteClass: z.enum(["compact", "medium", "volumetric", "dramatic"]).optional(),
    adaptiveSetExpansion: z.boolean().optional(),
  }).optional(),
  volumetricFormula: z.string().optional(),
});

export type InpaintRequestInput = z.infer<typeof InpaintRequestSchema>;
