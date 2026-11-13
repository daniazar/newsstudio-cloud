/**
 * src/lib/ecommerce/creativeDirectorLlm.ts
 *
 * Multimodal AI Creative Director & Commercial Storyboard Engine.
 * Powered by unified AI SDK gateway (Gemini / Ollama).
 *
 * Synthesizes dynamic, bespoke commercial ad scripts and scene choreography
 * tailored specifically to the product's typology, category, and regional market language.
 * Completely eliminates rigid, repetitive templates.
 */

import { z } from "zod";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import {
  ProductSpec,
  VideoArchetype,
  TargetDistributionChannel,
  AdAspectRatio,
  AdScript,
  AdScene,
} from "@/lib/types/ecommerce";
import { detectProductLanguage, DetectedLanguageResult } from "./languageDetector";
import { compileAdScript, getBespokeEnglishVeoPrompt, getBespokeEnglishPhotoPrompt } from "./adCopywriter";
import { optimizeSpeechCadence } from "./cadenceOptimizer";
import { hasPersonaInPrompt } from "./personaPromptHelper";
import { getPromptSystemInstruction } from "@/lib/tts/modelPromptDirectives";

export interface GenerateCreativeScriptOptions {
  productSpec: ProductSpec;
  archetype?: VideoArchetype;
  targetChannel?: TargetDistributionChannel;
  aspectRatio?: AdAspectRatio;
  durationSeconds?: number;
  promoCode?: string;
  customHook?: string;
  userCreativeDirection?: string;
  language?: string;
  apiKey?: string;
  engine?: string;
}

export interface CreativeDirectorResult {
  script: AdScript;
  generatedBy: "gemini-2.5-flash" | "ollama" | "fallback_deterministic";
  langInfo: DetectedLanguageResult;
}

const VALID_SCENE_TYPES = new Set([
  "pattern_interrupt_hook",
  "before_after_wipe",
  "3d_exploded_blueprint",
  "macro_texture_zoom",
  "torture_stress_test",
  "social_proof_review",
  "price_promo_outro",
  "room_staging",
  "custom_veo_hero",
  "device_mockup_screen",
  "service_trust_map",
  "colorway_swatch_switcher",
]);

/**
 * Builds the LLM prompt for Gemini 2.5 Flash.
 */
function buildPrompt(
  options: GenerateCreativeScriptOptions,
  langInfo: DetectedLanguageResult
): string {
  const { productSpec, archetype = "viral_ugc", targetChannel = "tiktok_shop", durationSeconds = 20, customHook, promoCode, userCreativeDirection } = options;

  const isArgentine = langInfo.isArgentine || productSpec.currency === "ARS";
  const isSpanish = langInfo.isSpanish || langInfo.language === "es";

  let languageStyleGuide = "";
  if (isSpanish && isArgentine) {
    languageStyleGuide = `CRITICAL LANGUAGE REQUIREMENT:
- Write 100% in authentic Argentine Spanish (Español Rioplatense).
- You MUST use natural Argentine voseo and vocabulary: "comprá", "mirá", "aprovechá", "ahorrá", "descubrí", "llevate", "pedilo", "acá", "living", "local", etc.
- Do NOT use Spain Castilian ("vosotros", "descubre", "compra tú", "haz tu pedido").
- Do NOT mix English with Spanish. Everything (headlines, subheadlines, voiceover, badges, CTA) MUST be in authentic Spanish.
- Format prices in Argentine Pesos (e.g., "$18.500", "$45.000").`;
  } else if (isSpanish) {
    languageStyleGuide = `CRITICAL LANGUAGE REQUIREMENT:
- Write 100% in high-converting commercial Spanish.
- Use natural call-to-actions ("Compra ahora", "Aprovecha hoy", "Descubre").
- Do NOT mix English with Spanish. Everything MUST be in Spanish.`;
  } else if (langInfo.language === "pt") {
    languageStyleGuide = `CRITICAL LANGUAGE REQUIREMENT:
- Write 100% in natural Brazilian Portuguese ("Compre agora", "Aproveite", "Confira").
- Do NOT mix English or Spanish.`;
  } else {
    languageStyleGuide = `CRITICAL LANGUAGE REQUIREMENT:
- Write 100% in high-converting American commercial English.
- Punchy, active voice, zero marketing fluff or corporate clichés.`;
  }

  const assets = productSpec.assets || [];
  const assetsSummary = assets.length > 0
    ? assets.map((a, i) => `[Asset Index ${i}]: type="${a.type || 'photo'}", isPrimary=${Boolean(a.isPrimary)}, url="${a.url}"`).join("\n")
    : "[Asset Index 0]: Placeholder hero product packshot";

  const targetEngine = options.engine || "omni";

  return `You are an elite Commercial Creative Director and Viral Ad Producer specializing in short-form e-commerce video ads (TikTok Shop, Instagram Reels, YouTube Shorts).

## Product Brief:
- **Title**: ${productSpec.title}
- **Vendor / Brand**: ${productSpec.vendor || "Brand"}
- **Typology**: ${productSpec.typology}
- **Price**: ${productSpec.price} ${productSpec.currency} ${productSpec.compareAtPrice ? `(Original: ${productSpec.compareAtPrice})` : ""}
- **Description**: ${productSpec.description || "N/A"}
- **Key Features / Bullets**: ${(productSpec.bulletPoints || []).join(" | ")}
- **Technical Specifics**: ${JSON.stringify(productSpec.typologySpecifics || {})}
- **Reviews**: ${JSON.stringify(productSpec.topReviews || [])}
- **Archetype**: ${archetype}
- **Target Channel**: ${targetChannel}
- **Total Duration**: ${durationSeconds} seconds
${customHook ? `- **Mandatory Hook**: "${customHook}"` : ""}
${promoCode ? `- **Promo Code**: "${promoCode}"` : ""}
${userCreativeDirection ? `- **Director's Custom Direction**: "${userCreativeDirection}"` : ""}

## Target Audio Synthesis Engine Directives (${targetEngine}):
${getPromptSystemInstruction(targetEngine, langInfo.language)}

## Available Anchor Personas (Select the ONE best fit for this product):
- "ruby_vance": Ruby Vance — Luxury Anchor & High-End Specialist (British-tinted prestige, articulate, authoritative; perfect for luxury goods, premium surfaces/flooring, fine jewellery, executive gear, high-ticket items).
- "sofia": Sofia Alvarez — Lifestyle & UGC Creator (Warm, engaging, relatable, authentic; perfect for home decor, apparel, wellness, beauty, lifestyle gadgets).
- "mateo": Mateo Rossi — Dynamic Field Specialist (Direct, technical, credible, energetic; perfect for construction materials, tools, outdoor gear, automotive, DIY).
- "diego": Diego Morales — High-Speed Tech & Innovation Host (Fast-paced, punchy, futuristic; perfect for electronics, smart home, gaming, audio, SaaS).
- "marcus": Marcus Vance — Senior Executive & Corporate Anchor (Deep, commanding, trustworthy; perfect for B2B, industrial, security, high-trust commerce).
- "camila": Camila Torres — Fashion & Beauty Influencer (Vibrant, trendsetting, chic; perfect for cosmetics, skincare, apparel, sensory consumables).
- "elena": Elena Rostova — Forensic Product Reviewer (Methodical, sharp, inquisitive; perfect for stress tests, technical benchmarks, problem-solution products).
- "adrian": Adrian Cole — High-Impact Action Host (Persuasive, upbeat; perfect for flash sales, viral impulse buys, sports & fitness).

## Available Integral Canvas Layout Templates (Select the ONE best fit):
- "tiktok_creator": TikTok & Reels Classic (Subtitles lower-third, Anchor corner right, Product hero center-stage).
- "top_subtitles": Top Subtitles (Reels Safe Zone — Subtitles in upper-third to avoid bottom platform buttons/comments, Anchor corner right).
- "anchor_left": Anchor Left / Product Right (Anchor bottom-left, Product staged center-right for dynamic 50/50 balance).
- "product_dominant": Product Dominant Giant 3D Hero (Product scaled 1.2x center-stage, Anchor compact 0.75x corner).
- "broadcast_newsroom": Broadcast Newsroom Ticker (TV-style news strap with live wire ticker tape pinned at bottom).
- "minimal_clean": Minimalist Luxury (Dead-center product, low-profile subtitles bar, discreet anchor).

## Product Harvested Assets Gallery (Select which asset index maps to each scene):
${assetsSummary}

## Target Language & Market:
${languageStyleGuide}

## Production Rules:
1. **NO BORING TEMPLATES**: Design a dynamic narrative specifically tailored to THIS product's physical properties, category, and consumer pain points.
2. Structure the ad into 4 or 5 cohesive, high-tempo scenes.
3. Choose the most impactful \`sceneType\` for each scene from this allowed list:
   - "pattern_interrupt_hook"
   - "before_after_wipe"
   - "3d_exploded_blueprint"
   - "macro_texture_zoom"
   - "torture_stress_test"
   - "social_proof_review"
   - "price_promo_outro"
   - "room_staging"
   - "custom_veo_hero"
   - "device_mockup_screen"
   - "service_trust_map"
   - "colorway_swatch_switcher"
4. Include frame-synchronized sound effects tags (e.g., "[sfx:whoosh]", "[sfx:pop]", "[sfx:ding]", "[sfx:cash_register]", "[sfx:impact]").
5. The final scene must be "price_promo_outro" with an irresistible, direct Call-to-Action.
6. BESPOKE VEO HERO SCENE PLANNING:
   For every scene (and especially the hero lifestyle/staging scene), synthesize a dedicated "customVeoPrompt" and "cameraCue".
   - CRITICAL REQUIREMENT: "customVeoPrompt" MUST ALWAYS BE WRITTEN IN ENGLISH, even when the rest of the commercial script (headline, voiceover, callToAction) is in Spanish, Portuguese, or another language. Video diffusion models (Google Veo / Flow / LTX) strictly require English prompts for photorealistic fidelity, natural daylight reflections, and accurate material rendering.
   - For Surface Material / Flooring: Describe a breathtaking sunlit luxury living room, penthouse or kitchen with this specific flooring/wall covering installed, sunlight reflections, architectural interior design, and a smooth floating aerial camera glide soaring forward across the floor with pure camera POV (no physical drones or camera equipment visible).
   - For Apparel: Describe an urban runway tracking shot or dynamic outdoor scene showcasing garment drape and movement.
     - ON-CAMERA DIALOGUE, AUDIO LANGUAGE & INGREDIENT REFERENCES:
       If a presenter or persona is featured:
       a) ON-CAMERA SPEECH & DIALOGUE: Design the prompt with the presenter speaking on camera with clear diction and natural lip synchronization delivering the exact scene dialogue/voiceoverScript. Specify the spoken audio language explicitly (e.g. "delivering the dialogue in Spanish: '[dialogue]'" or "speaking in English"). NEVER include silent closed-mouth conditioning or "absolutely no talking" phrases in custom scene prompts.
       b) ATTIRE INGREDIENT REFERENCE: Explicitly specify that the presenter's wardrobe and styling strictly match the character wardrobe reference photo in the first reference image.
       c) PRODUCT INGREDIENT REFERENCE: Explicitly specify that the presenter is showcasing and interacting with the exact product shown in the second reference image, faithfully reproducing its authentic finish, texture, and details.
     - STRUCTURED SECTION FORMAT REQUIREMENT:
       Format all "customVeoPrompt" strings using structured bracketed sections:
       [Environment]: <Architectural environment, lighting, pure camera POV without rigs or drones, 8k quality, 30fps>
       [Persona]: <Presenter appearance, wardrobe strictly matching Reference Image #1>
       [Camera]: <Cinematic camera movement and lens depth>
       [Action]:
       - 0.0s - 2.5s: <Initial stance and movement>
       - 2.5s - 5.5s: <Physical interaction with Reference Image #2 (exact product name), reproducing authentic finish & texture>
       - 5.5s - 8.0s: <Closing turn to camera and presentation>
       [Dialogue]: <Presenter speaking on camera delivering the scene voiceover in specified language with synchronized mouth articulation>

       Format "photoPrompt" using structured sections:
       [Environment]: <Setting description>
       [Persona & Wardrobe]: <Presenter appearance and wardrobe matching Reference Image #1>
       [Product Staging]: <Physical staging with Reference Image #2 (exact product name)>
       [Lighting & Atmosphere]: <Commercial 3-point softbox studio lighting, neutral balance, 8k look>
       [Composition & Style]: <High-end commercial architectural catalog photography, Hasselblad medium format perspective, razor-sharp textures, 8k resolution, professional commercial studio photography>

## Output Schema (Strict JSON):
{
  "selectedPersona": {
    "personaId": "string (one of: ruby_vance, sofia, mateo, diego, marcus, camila, elena, adrian)",
    "reasoning": "string (Why this persona fits this product, tone, and audience)"
  },
  "recommendedTemplate": {
    "templateId": "string (one of: tiktok_creator, top_subtitles, anchor_left, product_dominant, broadcast_newsroom, minimal_clean)",
    "reasoning": "string (Why this canvas layout optimizes viewer conversion on this target channel)"
  },
  "bespokePrompts": {
    "photoPrompt": "string (CRITICAL: MUST ALWAYS BE IN ENGLISH - An ultra-photorealistic studio photography prompt for Google Imagen 3 placing this product in an aspirational, cinematic environment with 8k macro lighting, softbox diffusion, and depth of field)",
    "videoPrompt": "string (CRITICAL: MUST ALWAYS BE IN ENGLISH - An exclusive 8-second cinematic video diffusion prompt for Google Veo 8s with dynamic camera motion, natural reflections, and material physics)"
  },
  "hookHeadline": "string (The core scroll-stopping hook)",
  "callToAction": "string (The final button CTA, e.g. COMPRÁ AHORA • TOCÁ ACÁ)",
  "scenes": [
    {
      "sceneType": "string (one of the allowed scene types)",
      "assignedAssetIndex": 0,
      "headline": "string (High-impact uppercase kinetic title, 3-7 words)",
      "subheadline": "string (Supporting technical or emotional benefit, 6-12 words)",
      "visualActionPrompt": "string (Detailed visual staging and camera motion prompt for video generation)",
      "customVeoPrompt": "string (CRITICAL: MUST ALWAYS BE IN ENGLISH - Photorealistic text-to-video prompt for Google Veo showing product in situ with lighting and motion, 8k quality, 30fps)",
      "cameraCue": "string (e.g. drone_flyover, dolly_in_slow, ambient_orbit_3d, dolly_out_reveal, crane_down_desk)",
      "voiceoverScript": "string (Clean, concise visual on-screen subtitle text displayed in captions overlay, e.g. '$49.99' or '20% OFF')",
      "spokenVoiceoverScript": "string (Acoustically expanded spoken script for neural TTS, e.g. 'cuarenta y nueve dólares con noventa y nueve centavos', verbalized percentages, no quotes, natural commas)",
      "featureBadgeText": "string (HUD metric or pill text, e.g. 10MM ESPESOR or 100% WATERPROOF)",
      "sfxTag": "string (e.g. [sfx:whoosh], [sfx:pop], [sfx:ding], [sfx:cash_register])"
    }
  ]
}

Return ONLY valid JSON. No conversational text or markdown explanation outside the JSON.`;
}

export const CreativeDirectionSchema = z.object({
  selectedPersona: z
    .object({
      personaId: z.string().optional(),
      reasoning: z.string().optional(),
    })
    .optional()
    .catch(undefined),
  recommendedTemplate: z
    .object({
      templateId: z.string().optional(),
      reasoning: z.string().optional(),
    })
    .optional()
    .catch(undefined),
  bespokePrompts: z
    .object({
      photoPrompt: z.string().optional(),
      videoPrompt: z.string().optional(),
    })
    .optional()
    .catch(undefined),
  hookHeadline: z.string().optional(),
  callToAction: z.string().optional(),
  scenes: z
    .array(
      z.object({
        sceneType: z.string().optional(),
        assignedAssetIndex: z.number().optional(),
        headline: z.string().optional(),
        subheadline: z.string().optional(),
        visualActionPrompt: z.string().optional(),
        customVeoPrompt: z.string().optional(),
        cameraCue: z.string().optional(),
        voiceoverScript: z.string().optional(),
        spokenVoiceoverScript: z.string().optional(),
        featureBadgeText: z.string().optional(),
        sfxTag: z.string().optional(),
      })
    )
    .default([])
    .catch([]),
});

/**
 * Synthesizes a creative commercial ad script with unified AI SDK gateway (Gemini / Ollama),
 * with deterministic fallback to compileAdScript.
 */
export async function generateCreativeAdScriptWithLlm(
  options: GenerateCreativeScriptOptions
): Promise<CreativeDirectorResult> {
  const {
    productSpec,
    archetype = "viral_ugc",
    targetChannel = "tiktok_shop",
    aspectRatio = "9:16",
    durationSeconds = 20,
    promoCode = "TIKTOK15",
    customHook,
  } = options;

  const langInfo = detectProductLanguage(productSpec);

  // If apiKey is explicitly passed as empty string, immediately use language-aware deterministic compiler
  if (options.apiKey === "") {
    return {
      script: compileAdScript({
        productSpec,
        archetype,
        targetChannel,
        aspectRatio,
        durationSeconds,
        promoCode,
        customHook,
        language: options.language || langInfo.language,
      }),
      generatedBy: "fallback_deterministic",
      langInfo,
    };
  }

  try {
    const prompt = buildPrompt(options, langInfo);
    const { object: parsed, providerUsed } = await generateLlmObject({
      schema: CreativeDirectionSchema,
      schemaName: "CreativeDirection",
      prompt,
      tier: "structured",
      apiKey: options.apiKey,
      temperature: 0.7,
      allowFallback: true,
    });

    const rawScenes = Array.isArray(parsed.scenes) ? parsed.scenes : [];

    if (rawScenes.length < 3) {
      throw new Error("LLM returned fewer than 3 scenes");
    }

    const fps = 30;
    const totalFrames = durationSeconds * fps;
    const numScenes = rawScenes.length;
    const baseDuration = Math.floor(totalFrames / numScenes);

    const assets = productSpec?.assets || [];
    const heroAssetUrl =
      assets.find((a) => a.type === "hero_packshot" || a.isPrimary)?.url ||
      assets[0]?.url ||
      "/placeholder_product.png";
    const lifestyleAssetUrl =
      assets.find((a) => a.type === "lifestyle_context" && a.url !== heroAssetUrl)?.url ||
      heroAssetUrl;

    const defaultPersonaId =
      productSpec.typology === "surface_material"
        ? "ruby_vance"
        : productSpec.typology === "discrete_object"
        ? "diego"
        : productSpec.typology === "apparel_wearable"
        ? "sofia"
        : productSpec.typology === "sensory_consumable"
        ? "camila"
        : "ruby_vance";

    const defaultTemplateId =
      targetChannel === "tiktok_shop"
        ? "top_subtitles"
        : archetype === "pdp_showcase"
        ? "product_dominant"
        : "tiktok_creator";

    const selectedPersonaId =
      typeof parsed.selectedPersona?.personaId === "string" && parsed.selectedPersona.personaId.trim()
        ? parsed.selectedPersona.personaId.toLowerCase().trim()
        : defaultPersonaId;

    const personaReasoning =
      typeof parsed.selectedPersona?.reasoning === "string"
        ? parsed.selectedPersona.reasoning
        : `Selected based on ${productSpec.typology.replace(/_/g, " ")} tone and target demographic.`;

    const recommendedTemplateId =
      typeof parsed.recommendedTemplate?.templateId === "string" && parsed.recommendedTemplate.templateId.trim()
        ? parsed.recommendedTemplate.templateId.trim()
        : defaultTemplateId;

    const templateReasoning =
      typeof parsed.recommendedTemplate?.reasoning === "string"
        ? parsed.recommendedTemplate.reasoning
        : "Optimized for short-form retention and platform UI safe zones.";

    const bespokePhotoPrompt =
      typeof parsed.bespokePrompts?.photoPrompt === "string" && parsed.bespokePrompts.photoPrompt.trim()
        ? parsed.bespokePrompts.photoPrompt.trim()
        : getBespokeEnglishPhotoPrompt(productSpec, selectedPersonaId);

    const bespokeVeoPrompt =
      typeof parsed.bespokePrompts?.videoPrompt === "string" && parsed.bespokePrompts.videoPrompt.trim()
        ? parsed.bespokePrompts.videoPrompt.trim()
        : getBespokeEnglishVeoPrompt(productSpec, "drone_flyover", selectedPersonaId);

    const scenes: AdScene[] = rawScenes.map((raw, index) => {
      const startFrame = index * baseDuration;
      const isLast = index === numScenes - 1;
      const duration = isLast ? totalFrames - startFrame : baseDuration;
      const rawType = raw.sceneType || "";
      const validSceneType: AdScene["sceneType"] = VALID_SCENE_TYPES.has(rawType)
        ? (rawType as AdScene["sceneType"])
        : isLast
        ? "price_promo_outro"
        : index === 0
        ? "pattern_interrupt_hook"
        : "3d_exploded_blueprint";

      // Contextual image mapping from harvested gallery
      let mappedMediaUrl = heroAssetUrl;
      if (
        typeof raw.assignedAssetIndex === "number" &&
        raw.assignedAssetIndex >= 0 &&
        assets[raw.assignedAssetIndex]?.url
      ) {
        mappedMediaUrl = assets[raw.assignedAssetIndex].url;
      } else if (index === 1 && lifestyleAssetUrl) {
        mappedMediaUrl = lifestyleAssetUrl;
      }

      return {
        id: `scene_${index + 1}_${validSceneType}`,
        sceneIndex: index,
        startFrame,
        durationFrames: duration,
        sceneType: validSceneType,
        headline: String(raw.headline || productSpec.title.slice(0, 40)),
        subheadline: raw.subheadline ? String(raw.subheadline) : undefined,
        visualActionPrompt: String(raw.visualActionPrompt || "High impact product showcase"),
        cameraCue: raw.cameraCue ? String(raw.cameraCue) : "drone_flyover",
        customVeoPrompt: (raw.customVeoPrompt && hasPersonaInPrompt(String(raw.customVeoPrompt)))
          ? String(raw.customVeoPrompt)
          : getBespokeEnglishVeoPrompt(productSpec, raw.cameraCue ? String(raw.cameraCue) : "drone_flyover", selectedPersonaId),
        primaryMediaUrl: mappedMediaUrl,
        secondaryMediaUrl: validSceneType === "before_after_wipe" ? lifestyleAssetUrl : undefined,
        sfxTag: raw.sfxTag || (index === 0 ? "[sfx:whoosh]" : isLast ? "[sfx:cash_register]" : "[sfx:pop]"),
        voiceoverScript: String(raw.voiceoverScript || raw.headline),
        spokenVoiceoverScript: raw.spokenVoiceoverScript
          ? String(raw.spokenVoiceoverScript)
          : optimizeSpeechCadence(String(raw.voiceoverScript || raw.headline), langInfo.language),
        featureBadgeText: raw.featureBadgeText ? String(raw.featureBadgeText) : undefined,
      };
    });

    const discount =
      productSpec.compareAtPrice && productSpec.compareAtPrice > productSpec.price
        ? Math.round(((productSpec.compareAtPrice - productSpec.price) / productSpec.compareAtPrice) * 100)
        : undefined;

    const script: AdScript = {
      id: `script_gemini_${Date.now()}`,
      archetype,
      targetChannel,
      aspectRatio,
      durationSeconds,
      totalFrames,
      fps,
      scenes,
      hookHeadline: parsed.hookHeadline || scenes[0]?.headline || productSpec.title,
      callToAction: parsed.callToAction || (langInfo.isSpanish ? "COMPRÁ AHORA • TOCÁ ACÁ" : "SHOP NOW • TAP BELOW"),
      promoCode,
      discountPercentage: discount,
      selectedPersonaId,
      personaReasoning,
      recommendedTemplateId,
      templateReasoning,
      bespokePhotoPrompt,
      bespokeVeoPrompt,
    };

    return {
      script,
      generatedBy: providerUsed === "ollama" ? "ollama" : "gemini-2.5-flash",
      langInfo,
    };
  } catch (error) {
    console.warn("[CreativeDirectorLlm] LLM generation failed or timed out, falling back to deterministic compiler:", error);
    return {
      script: compileAdScript({
        productSpec,
        archetype,
        targetChannel,
        aspectRatio,
        durationSeconds,
        promoCode,
        customHook,
        language: options.language || langInfo.language,
      }),
      generatedBy: "fallback_deterministic",
      langInfo,
    };
  }
}
