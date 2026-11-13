/**
 * src/lib/ecommerce/adCopywriter.ts
 *
 * AI Creative Director & Commercial Copywriting Engine.
 * Synthesizes frame-accurate commercial scripts across the 6 Video Archetypes
 * dynamically adapted to the 7 Product Typologies.
 */

import {
AdAspectRatio,
AdScene,
AdScript,
ProductSpec,
TargetDistributionChannel,
VideoArchetype,
} from "@/lib/types/ecommerce";
import { lintAdCopy } from "./amazonLinter";
import { optimizeSpeechCadence } from "./cadenceOptimizer";
import { detectProductLanguage } from "./languageDetector";
import { getPersonaPromptDetails } from "./personaPromptHelper";
import { detectLanguage,filterPromptForSafety } from "./promptSafetyFilter";

export interface GenerateScriptOptions {
  productSpec: ProductSpec;
  archetype?: VideoArchetype;
  targetChannel?: TargetDistributionChannel;
  aspectRatio?: AdAspectRatio;
  durationSeconds?: number;
  promoCode?: string;
  customHook?: string;
  language?: string;
}

/**
 * Calculates discount percentage if compare-at price exists.
 */
function calculateDiscount(price: number, comparePrice?: number): number | undefined {
  if (!comparePrice || comparePrice <= price) return undefined;
  return Math.round(((comparePrice - price) / comparePrice) * 100);
}

/**
 * Generates scene choreography and scripts based on archetype and product typology.
 */
export function compileAdScript(options: GenerateScriptOptions): AdScript {
  const {
    productSpec,
    archetype = "viral_ugc",
    targetChannel = "tiktok_shop",
    aspectRatio = "9:16",
    durationSeconds = 20,
    promoCode = "TIKTOK15",
    customHook,
    language: explicitLanguage,
  } = options;

  const fps = 30;
  const totalFrames = durationSeconds * fps;
  const discount = calculateDiscount(productSpec.price, productSpec.compareAtPrice);

  const langInfo = detectProductLanguage(productSpec);
  const lang = explicitLanguage || langInfo.language;
  const isSpanish = lang === "es";
  const isArgentine = langInfo.isArgentine || productSpec.currency === "ARS";

  const formatPrice = (amount: number) => {
    if (productSpec.currency === "ARS") {
      return `$${Math.round(amount).toLocaleString("es-AR")}`;
    }
    if (productSpec.currency === "EUR") {
      return `€${amount.toFixed(2)}`;
    }
    if (productSpec.currency === "BRL") {
      return `R$ ${amount.toFixed(2).replace(".", ",")}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  const assets = productSpec?.assets || [];
  const heroAssetUrl =
    assets.find((a) => a.type === "hero_packshot" || a.isPrimary)?.url ||
    assets[0]?.url ||
    "/placeholder_product.png";

  const lifestyleAssetUrl =
    assets.find((a) => a.type === "lifestyle_context" && a.url !== heroAssetUrl)?.url ||
    heroAssetUrl;

  const bulletPoints = productSpec?.bulletPoints || [];
  const primaryBullet =
    bulletPoints[0] ||
    (isSpanish
      ? isArgentine
        ? "Diseñado para un rendimiento insuperable"
        : "Diseñado para un rendimiento superior"
      : "Engineered for unmatched performance");

  const secondaryBullet =
    bulletPoints[1] ||
    (isSpanish
      ? "Fabricado con materiales de máxima durabilidad"
      : "Crafted from premium durable materials");

  const isSurface = productSpec.typology === "surface_material";
  const isService = productSpec.typology === "local_service";
  const isSaas = productSpec.typology === "digital_saas";
  const isAmazon = targetChannel === "amazon_listing";

  const scenes: AdScene[] = [];
  const sceneDuration = Math.floor(totalFrames / 5);

  // Surface-specific technical properties resolution
  const surfaceSpecs = productSpec.typologySpecifics?.surfaceMaterial;
  const surfaceThickness = surfaceSpecs?.thickness;
  const surfaceDimensions =
    surfaceSpecs?.dimensions ||
    (surfaceSpecs?.width && surfaceSpecs?.length
      ? `${surfaceSpecs.width}x${surfaceSpecs.length}`
      : undefined);
  const surfaceRectified = surfaceSpecs?.rectified;
  const surfaceYield = surfaceSpecs?.yieldPerBox || surfaceSpecs?.coveragePerUnit;
  const surfaceUsage = surfaceSpecs?.usageClass;
  const surfaceOrigin = surfaceSpecs?.origin;

  // ---------------------------------------------------------------------------
  // SCENE 1 (0.0s – 4.0s): HOOK / PATTERN INTERRUPT
  // ---------------------------------------------------------------------------
  let hookHeadline = isSpanish
    ? isArgentine
      ? "Dejá de conformarte con imitaciones"
      : "Deja de conformarte con imitaciones"
    : "Stop Settling For Cheap Alternatives";

  let hookSub = isSpanish
    ? isArgentine
      ? `Descubrí ${productSpec.title.slice(0, 45)}...`
      : `Descubre ${productSpec.title.slice(0, 45)}...`
    : `Meet ${productSpec.title.slice(0, 45)}...`;

  const hookVisual = `High-energy pattern interrupt highlighting the problem.`;

  if (customHook) {
    hookHeadline = customHook;
  } else if (archetype === "flash_sale") {
    if (isSpanish) {
      hookHeadline = discount
        ? `¡OFERTA RELÁMPAGO: ${discount}% OFF!`
        : "¡PRECIO EXCLUSIVO POR TIEMPO LIMITADO!";
      hookSub = isArgentine
        ? `Aprovechá hoy con ${productSpec.vendor}`
        : `Aprovecha hoy con ${productSpec.vendor}`;
    } else {
      hookHeadline = discount ? `FLASH SALE: ${discount}% OFF TODAY` : "LIMITED TIME PRICE DROP";
      hookSub = `Save big on ${productSpec.vendor}`;
    }
  } else if (isSurface) {
    if (isSpanish) {
      hookHeadline = isArgentine
        ? "¿Buscás transformar tus espacios sin obra molesta?"
        : "¿Buscas transformar tus espacios sin obras complicadas?";
      hookSub = isArgentine
        ? "Mirá la renovación que estabas esperando."
        : "Descubre la transformación que estabas esperando.";
    } else {
      hookHeadline = "Tired of Outdated, Scuffed Floors?";
      hookSub = "Here is the transformation you've been waiting for.";
    }
  } else if (isSaas) {
    if (isSpanish) {
      hookHeadline = isArgentine
        ? "¿Cansado de perder horas en tareas manuales?"
        : "¿Cansado de perder horas en tareas manuales?";
      hookSub = isArgentine
        ? `Automatizá tu flujo con ${productSpec.title.slice(0, 38)}...`
        : `Automatiza tu flujo con ${productSpec.title.slice(0, 38)}...`;
    } else {
      hookHeadline = "Tired of Wasting Hours on Manual Tasks?";
      hookSub = `Automate your workflow with ${productSpec.title.slice(0, 38)}...`;
    }
  } else if (isService) {
    if (isSpanish) {
      hookHeadline = "¿Urgencias en tu hogar? Tenemos la solución";
      hookSub = "Atención técnica en menos de 30 minutos.";
    } else {
      hookHeadline = "Emergency Repairs? Help Is On The Way";
      hookSub = "Dispatched in under 30 minutes.";
    }
  } else if (isAmazon) {
    hookHeadline = productSpec.title.slice(0, 50);
    hookSub = isSpanish
      ? `Por ${productSpec.vendor} • Presentación Oficial`
      : `By ${productSpec.vendor} • Official Product Overview`;
  }

  const hookVoiceover = isSpanish
    ? isAmazon
      ? `Presentamos ${productSpec.title.slice(0, 40)}. Calidad garantizada para tu día a día.`
      : isArgentine
      ? `¡${hookHeadline}! Mirá cómo esto transforma todo por completo.`
      : `¡${hookHeadline}! Mira cómo esto transforma todo por completo.`
    : isAmazon
    ? `Introducing the ${productSpec.title.slice(0, 40)}. Engineered for durability and everyday use.`
    : `${hookHeadline}! You have to see how this changes everything.`;

  scenes.push({
    id: "scene_1_hook",
    sceneIndex: 0,
    startFrame: 0,
    durationFrames: sceneDuration,
    sceneType: isSurface ? "before_after_wipe" : "pattern_interrupt_hook",
    headline: hookHeadline,
    subheadline: hookSub,
    visualActionPrompt: hookVisual,
    primaryMediaUrl: heroAssetUrl,
    secondaryMediaUrl: isSurface ? lifestyleAssetUrl : undefined,
    sfxTag: "[sfx:whoosh]",
    voiceoverScript: hookVoiceover,
  });

  // ---------------------------------------------------------------------------
  // SCENE 2 (4.0s – 8.0s): FEATURE BREAKDOWN / TRANSFORMATION
  // ---------------------------------------------------------------------------
  let scene2Type: AdScene["sceneType"] = "3d_exploded_blueprint";
  let scene2Head = isSpanish ? "Diseñado Sin Compromisos" : "Engineered Without Compromise";
  let scene2Sub = primaryBullet;
  let scene2Voice = `${scene2Head}. ${scene2Sub}.`;
  let scene2Badge = isSpanish ? "MÁXIMA CALIDAD" : primaryBullet.slice(0, 28);

  if (isSurface) {
    scene2Type = "before_after_wipe";
    if (isSpanish) {
      scene2Head =
        surfaceThickness && surfaceDimensions
          ? `${surfaceDimensions} • ${surfaceThickness}`
          : "Renovación Inmediata de Ambientes";
      scene2Sub = surfaceRectified
        ? "Porcelanato rectificado con terminación milimétrica y máxima adherencia."
        : "Sistema de encastre fácil y rápido, sin adhesivos molestos.";
      scene2Voice =
        surfaceThickness && surfaceDimensions
          ? `Formato ${surfaceDimensions} con ${surfaceThickness} de espesor${
              surfaceRectified ? ", acabado rectificado de precisión" : ""
            }.`
          : `${scene2Head}. ${scene2Sub}.`;
      scene2Badge = surfaceThickness
        ? `${surfaceThickness.toUpperCase()}${surfaceRectified ? " RECTIFICADO" : ""}`
        : "ENCASTRE FÁCIL";
    } else {
      scene2Head =
        surfaceThickness && surfaceDimensions
          ? `${surfaceDimensions} • ${surfaceThickness}`
          : "Instant Room Transformation";
      scene2Sub = surfaceRectified
        ? "Precision rectified porcelain with seamless edge alignment."
        : "Click-Lock DIY Installation with zero glue or nails.";
      scene2Voice =
        surfaceThickness && surfaceDimensions
          ? `Format ${surfaceDimensions} with ${surfaceThickness} thickness${
              surfaceRectified ? ", precision rectified edges" : ""
            }.`
          : `${scene2Head}. ${scene2Sub}.`;
      scene2Badge = surfaceThickness
        ? `${surfaceThickness.toUpperCase()}${surfaceRectified ? " RECTIFIED" : ""}`
        : "CLICK-LOCK DIY";
    }
  } else if (isSaas) {
    scene2Type = "device_mockup_screen";
    if (isSpanish) {
      scene2Head = isArgentine ? "Automatizá Todo Tu Trabajo" : "Automatiza Todo Tu Trabajo";
      scene2Sub =
        productSpec.typologySpecifics?.digitalSaas?.timeSavedMetric ||
        "98% de Ahorro de Tiempo • Listo en 2 minutos.";
      scene2Voice = `${scene2Head}. ${scene2Sub}.`;
      scene2Badge = "AHORRO DE TIEMPO";
    } else {
      scene2Head = "Automate Your Entire Workflow";
      scene2Sub =
        productSpec.typologySpecifics?.digitalSaas?.timeSavedMetric ||
        "98% Time Saved • Setup in under 2 minutes.";
      scene2Voice = `${scene2Head}. ${scene2Sub}.`;
      scene2Badge = "TIME SAVED";
    }
  } else if (isService) {
    scene2Type = "service_trust_map";
    if (isSpanish) {
      scene2Head = "Asistencia Rápida en el Día";
      scene2Sub = `Técnicos matriculados y asegurados en ${
        productSpec.typologySpecifics?.localService?.serviceAreaCity || "tu zona"
      }.`;
      scene2Voice = `${scene2Head}. ${scene2Sub}.`;
      scene2Badge = "ATENCIÓN EN EL DÍA";
    } else {
      scene2Head = "Rapid Same-Day Local Dispatch";
      scene2Sub = `Licensed, bonded & insured technicians across ${
        productSpec.typologySpecifics?.localService?.serviceAreaCity || "your area"
      }.`;
      scene2Voice = `${scene2Head}. ${scene2Sub}.`;
      scene2Badge = "LOCAL DISPATCH";
    }
  } else if (archetype === "us_vs_them") {
    if (isSpanish) {
      scene2Head = "Por Qué Otras Marcas Fallan";
      scene2Sub = "Materiales frágiles, sin garantía y de corta duración.";
      scene2Voice = `${scene2Head}. ${scene2Sub}.`;
      scene2Badge = "CALIDAD SUPERIOR";
    } else {
      scene2Head = "Why Generic Brands Fail";
      scene2Sub = "Weak materials, short battery, zero warranty.";
      scene2Voice = `${scene2Head}. ${scene2Sub}.`;
      scene2Badge = "UNMATCHED QUALITY";
    }
  }

  scenes.push({
    id: "scene_2_features",
    sceneIndex: 1,
    startFrame: sceneDuration,
    durationFrames: sceneDuration,
    sceneType: scene2Type,
    headline: scene2Head,
    subheadline: scene2Sub,
    visualActionPrompt: "Kinetic animation highlighting key engineering specs.",
    primaryMediaUrl: heroAssetUrl,
    secondaryMediaUrl: lifestyleAssetUrl,
    sfxTag: "[sfx:pop]",
    voiceoverScript: scene2Voice,
    featureBadgeText: scene2Badge,
  });

  // ---------------------------------------------------------------------------
  // SCENE 3 (8.0s – 12.0s): TORTURE TEST / SENSORY MACRO / ROOM STAGING
  // ---------------------------------------------------------------------------
  let scene3Type: AdScene["sceneType"] = "macro_texture_zoom";
  let scene3Head = isSpanish ? "Máxima Resistencia y Durabilidad" : "Built For Extreme Durability";
  let scene3Sub = secondaryBullet;
  let scene3Voice = `¡${scene3Head}! ${scene3Sub}.`;
  let scene3Badge = isSpanish ? "CALIDAD PROBADA" : "PROVEN QUALITY";

  if (isSurface) {
    scene3Type = "torture_stress_test";
    if (isSpanish) {
      scene3Head = surfaceUsage ? surfaceUsage : "100% Impermeable y de Alto Tránsito";
      scene3Sub = surfaceYield
        ? `Rendimiento de ${surfaceYield}${
            surfaceOrigin ? ` • Origen ${surfaceOrigin}` : ""
          }. Máxima durabilidad.`
        : "Resistente a rayones, líquidos y alto tránsito diario.";
      scene3Voice = surfaceYield
        ? `${surfaceUsage ? `Apto para ${surfaceUsage.toLowerCase()}. ` : ""}Rendimiento de ${surfaceYield}, 100% impermeable${
            surfaceOrigin ? ` con calidad de ${surfaceOrigin}` : ""
          }.`
        : "100% impermeable, resistente a rayones y alto tránsito.";
      scene3Badge = surfaceYield ? surfaceYield.toUpperCase() : "100% IMPERMEABLE";
    } else {
      scene3Head = surfaceUsage ? surfaceUsage : "100% Waterproof & Pet-Proof";
      scene3Sub = surfaceYield
        ? `Yield of ${surfaceYield}${
            surfaceOrigin ? ` • Origin ${surfaceOrigin}` : ""
          }. Maximum durability.`
        : "Tested against spills, scratches, and heavy wear.";
      scene3Voice = surfaceYield
        ? `${surfaceUsage ? `Suitable for ${surfaceUsage.toLowerCase()}. ` : ""}Yield of ${surfaceYield}, 100% waterproof${
            surfaceOrigin ? ` with warranty from ${surfaceOrigin}` : ""
          }.`
        : "100% waterproof, resistant to scratches and heavy traffic.";
      scene3Badge = surfaceYield ? surfaceYield.toUpperCase() : "100% WATERPROOF";
    }
  } else if (productSpec.typology === "apparel_wearable") {
    scene3Type = "colorway_swatch_switcher";
    if (isSpanish) {
      scene3Head = "Tejido Elástico y Ajuste Cómodo";
      scene3Sub = "Comodidad respirable para todo el día en varios colores.";
      scene3Voice = `¡${scene3Head}! ${scene3Sub}.`;
      scene3Badge = "MÁXIMO CONFORT";
    } else {
      scene3Head = "4-Way Stretch & Shape Recovery";
      scene3Sub = "Breathable all-day comfort in multiple colorways.";
      scene3Voice = `${scene3Head}! ${scene3Sub}.`;
      scene3Badge = "4-WAY STRETCH";
    }
  } else if (productSpec.typology === "sensory_consumable") {
    scene3Type = "macro_texture_zoom";
    if (isSpanish) {
      scene3Head = "Fórmula 100% Pura y Natural";
      scene3Sub = "Resultados comprobados sin químicos agresivos.";
      scene3Voice = `¡${scene3Head}! ${scene3Sub}.`;
      scene3Badge = "FÓRMULA PURA";
    } else {
      scene3Head = "100% Clean & Botanical";
      scene3Sub = "Clinical results with zero parabens or harsh chemicals.";
      scene3Voice = `${scene3Head}! ${scene3Sub}.`;
      scene3Badge = "CLEAN FORMULA";
    }
  }

  scenes.push({
    id: "scene_3_durability",
    sceneIndex: 2,
    startFrame: sceneDuration * 2,
    durationFrames: sceneDuration,
    sceneType: scene3Type,
    headline: scene3Head,
    subheadline: scene3Sub,
    visualActionPrompt: "Detailed physical stress test demonstrating product durability.",
    primaryMediaUrl: heroAssetUrl,
    sfxTag: "[sfx:ding]",
    voiceoverScript: scene3Voice,
    featureBadgeText: scene3Badge,
  });

  // ---------------------------------------------------------------------------
  // SCENE 4 (12.0s – 16.0s): SOCIAL PROOF & VERIFIED REVIEWS
  // ---------------------------------------------------------------------------
  const topReview = productSpec.topReviews[0] || {
    author: isSpanish ? "Cliente Verificado" : "Verified Customer",
    rating: 5,
    body: isSpanish
      ? isArgentine
        ? "Excelente calidad, superó todas mis expectativas. ¡Muy recomendado!"
        : "Excelente calidad, superó todas mis expectativas. ¡Totalmente recomendado!"
      : "Exceeded all my expectations. Honestly the best purchase I made all year!",
  };

  const reviewHead = isSpanish
    ? `${topReview.rating}.0 Estrellas • Comprador Verificado`
    : `${topReview.rating}.0 Stars • Verified Buyer`;

  const reviewVoice = isSpanish
    ? isArgentine
      ? `Los compradores confirman: "${topReview.body.slice(0, 60)}"`
      : `Nuestros clientes confirman: "${topReview.body.slice(0, 60)}"`
    : `Customers are rating it five stars: "${topReview.body.slice(0, 60)}"`;

  scenes.push({
    id: "scene_4_proof",
    sceneIndex: 3,
    startFrame: sceneDuration * 3,
    durationFrames: sceneDuration,
    sceneType: "social_proof_review",
    headline: reviewHead,
    subheadline: `"${topReview.body.slice(0, 80)}"`,
    visualActionPrompt: "5 animated gold stars bursting onto the screen with reviewer card.",
    primaryMediaUrl: heroAssetUrl,
    sfxTag: "[sfx:ding]",
    voiceoverScript: reviewVoice,
    featureBadgeText: "5.0 ★★★★★",
  });

  // ---------------------------------------------------------------------------
  // SCENE 5 (16.0s – 20.0s): PRICE STRIKE-THROUGH & CALL TO ACTION
  // ---------------------------------------------------------------------------
  let ctaText = isSpanish
    ? isArgentine
      ? "COMPRÁ AHORA • TOCÁ ACÁ"
      : "COMPRA AHORA • HAZ TU PEDIDO"
    : "SHOP NOW • TAP BELOW";

  if (isAmazon) {
    ctaText = isSpanish ? "DISPONIBLE EN AMAZON PRIME" : "AVAILABLE ON AMAZON PRIME";
  } else if (targetChannel === "shopify_pdp") {
    ctaText = isSpanish
      ? isArgentine
        ? "AGREGÁ AL CARRITO — ENVÍO RÁPIDO"
        : "AÑADIR AL CARRITO — ENVÍO HOY"
      : "ADD TO CART — SHIPS TODAY";
  } else if (isSaas) {
    ctaText = isSpanish
      ? isArgentine
        ? "PROBALO GRATIS • SIN TARJETA"
        : "PRUÉBALO GRATIS • SIN TARJETA"
      : "START FREE TRIAL • NO CARD NEEDED";
  } else if (isService) {
    ctaText = isSpanish
      ? isArgentine
        ? "LLAMÁ AHORA • ATENCIÓN EN EL DÍA"
        : "LLAMA AHORA • ATENCIÓN EN EL DÍA"
      : "CALL NOW • SAME DAY BOOKING";
  }

  const finalPriceText = formatPrice(productSpec.price);
  const finalCompareText = productSpec.compareAtPrice ? formatPrice(productSpec.compareAtPrice) : undefined;

  const outroHeadline = finalCompareText
    ? isSpanish
      ? `${finalPriceText} (Antes ${finalCompareText})`
      : `${finalPriceText} (Was ${finalCompareText})`
    : finalPriceText;

  const outroSubheadline = promoCode
    ? isSpanish
      ? isArgentine
        ? `¡Usá el código ${promoCode} y ahorrá más!`
        : `¡Usa el código ${promoCode} y ahorra más!`
      : `Use code ${promoCode} for extra savings!`
    : isSpanish
    ? isArgentine
      ? "Compra segura con envío directo."
      : "Compra protegida con envío seguro."
    : "Fast & secure checkout.";

  const outroVoiceover = isSpanish
    ? discount
      ? isArgentine
        ? `¡Pedilo hoy y ahorrá un ${discount} por ciento! ${ctaText}.`
        : `¡Pídelo hoy y ahorra un ${discount} por ciento! ${ctaText}.`
      : isArgentine
      ? `¡Conseguí el tuyo hoy por solo ${finalPriceText}! ${ctaText}.`
      : `¡Consigue el tuyo hoy por solo ${finalPriceText}! ${ctaText}.`
    : discount
    ? `Order today and save ${discount} percent! ${ctaText}.`
    : `Get yours today for just ${finalPriceText}. ${ctaText}.`;

  const outroBadge = discount
    ? `${discount}% OFF`
    : isSpanish
    ? isArgentine
      ? "OFERTA HOY"
      : "MEJOR VALOR"
    : "BEST VALUE";

  scenes.push({
    id: "scene_5_outro",
    sceneIndex: 4,
    startFrame: sceneDuration * 4,
    durationFrames: totalFrames - sceneDuration * 4,
    sceneType: "price_promo_outro",
    headline: outroHeadline,
    subheadline: outroSubheadline,
    visualActionPrompt: "Pulsing Call to Action button with strike-through price badge.",
    primaryMediaUrl: heroAssetUrl,
    sfxTag: "[sfx:cash_register]",
    voiceoverScript: outroVoiceover,
    featureBadgeText: outroBadge,
  });

  // Pass all copy through the Amazon Linter if target is Amazon
  if (isAmazon) {
    for (const scene of scenes) {
      scene.headline = lintAdCopy(scene.headline, { channel: targetChannel }).sanitizedText;
      if (scene.subheadline) {
        scene.subheadline = lintAdCopy(scene.subheadline, { channel: targetChannel }).sanitizedText;
      }
      if (scene.voiceoverScript) {
        scene.voiceoverScript = lintAdCopy(scene.voiceoverScript, { channel: targetChannel }).sanitizedText;
      }
    }
  }

  // Automatically inject breathing pauses and natural spoken cadence for neural TTS prosody
  for (const scene of scenes) {
    if (scene.voiceoverScript) {
      scene.spokenVoiceoverScript = optimizeSpeechCadence(scene.voiceoverScript, lang);
    }

    // Default anchor persona tailored to typology
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

    // Synthesize intelligent custom Google Veo cinematic prompt and camera motion cue
    if (!scene.customVeoPrompt) {
      if (productSpec.typology === "surface_material") {
        scene.cameraCue = scene.sceneIndex === 0 ? "drone_flyover" : scene.sceneIndex === 1 ? "dolly_in_slow" : "ambient_orbit_3d";
      } else if (productSpec.typology === "digital_saas" || productSpec.typology === "sensory_consumable") {
        scene.cameraCue = "dolly_in_slow";
      } else {
        scene.cameraCue = "drone_flyover";
      }
      const sceneDialogue = scene.voiceoverScript || scene.headline || "";
      const detectedLang = detectLanguage(sceneDialogue);
      scene.customVeoPrompt = getBespokeEnglishVeoPrompt(
        productSpec,
        scene.cameraCue,
        defaultPersonaId,
        undefined,
        "living_room",
        {
          dialogue: sceneDialogue,
          language: detectedLang,
          sceneIndex: scene.sceneIndex,
          headline: scene.headline,
          visualActionPrompt: scene.visualActionPrompt,
          allowSpeaking: true,
        }
      );
    }
  }

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

  const firstSceneDialogue = hookHeadline || scenes[0]?.voiceoverScript || scenes[0]?.headline || "";

  return {
    id: `script_${Date.now()}`,
    archetype,
    targetChannel,
    aspectRatio,
    durationSeconds,
    totalFrames,
    fps,
    scenes,
    hookHeadline,
    callToAction: ctaText,
    promoCode,
    discountPercentage: discount,
    selectedPersonaId: defaultPersonaId,
    personaReasoning: `Calibrated for ${productSpec.typology.replace(/_/g, " ")} products with high viewer authority.`,
    recommendedTemplateId: defaultTemplateId,
    templateReasoning: "Optimized for short-form retention and platform UI safe zones.",
    bespokePhotoPrompt: getBespokeEnglishPhotoPrompt(productSpec, defaultPersonaId),
    bespokeVeoPrompt: getBespokeEnglishVeoPrompt(
      productSpec,
      "drone_flyover",
      defaultPersonaId,
      undefined,
      "living_room",
      {
        dialogue: firstSceneDialogue,
        language: detectLanguage(firstSceneDialogue),
        allowSpeaking: true,
      }
    ),
  };
}

/**
 * Synthesizes an intelligent, photorealistic Google Imagen 3 photo studio prompt strictly in English.
 */
export function getBespokeEnglishPhotoPrompt(
  productSpec: ProductSpec,
  personaId?: string,
  attireId?: string
): string {
  const brand = productSpec.vendor || "luxury";
  const personaDetails = getPersonaPromptDetails({
    personaId,
    attireId,
    productName: productSpec.title,
    typology: productSpec.typology,
    actionVariant: "living_room",
    mode: "photo",
  });

  if (personaDetails.structuredPrompt) {
    return personaDetails.structuredPrompt;
  }

  let prompt = "";
  if (productSpec.typology === "surface_material") {
    prompt = `Professional commercial architectural photography of installed ${productSpec.title} in a modern luxury living room, ${personaDetails.fullPersonaPromptClause}, warm morning sunbeam reflections across the textured grain, Scandinavian interior architecture, soft natural shadows, 8k, photorealistic, Hasselblad medium format`;
  } else if (productSpec.typology === "apparel_wearable") {
    prompt = `Editorial fashion studio photography of ${productSpec.title} by ${brand}, ${personaDetails.fullPersonaPromptClause}, clean neutral backdrop, softbox rim lighting highlighting premium fabric texture, sharp details, 8k resolution, Vogue magazine style`;
  } else if (productSpec.typology === "sensory_consumable") {
    prompt = `Luxury cosmetics studio product photograph of ${productSpec.title}, ${personaDetails.fullPersonaPromptClause}, placed on a raw travertine stone plinth, water droplets and botanical leaf accents, warm directional light, high fashion aesthetic, 8k`;
  } else if (productSpec.typology === "discrete_object") {
    prompt = `Clean minimalist studio photography of ${productSpec.title} by ${brand}, ${personaDetails.fullPersonaPromptClause}, resting on a matte black desk setup, moody studio softbox lighting, crisp metallic highlights, macro depth of field, 8k`;
  } else {
    prompt = `High-end commercial product photograph of ${productSpec.title}, ${personaDetails.fullPersonaPromptClause}, studio lighting, crisp reflections, soft natural shadows, 8k resolution, commercial advertising masterpiece`;
  }
  return filterPromptForSafety(prompt);
}

export interface BespokeVeoPromptOptions {
  dialogue?: string;
  language?: string;
  sceneIndex?: number;
  templateIndex?: number;
  headline?: string;
  visualActionPrompt?: string;
  allowSpeaking?: boolean;
}

/**
 * Synthesizes an intelligent, photorealistic Google Veo prompt strictly in English.
 * Video diffusion models require English prompts for superior spatial coherence and fidelity.
 */
export function getBespokeEnglishVeoPrompt(
  productSpec: ProductSpec,
  cameraCue: string = "drone_flyover",
  personaId?: string,
  attireId?: string,
  environmentVariant: "living_room" | "showroom_wall" | "showroom_paint" = "living_room",
  sceneContext?: BespokeVeoPromptOptions
): string {
  const cueLabel =
    cameraCue === "dolly_in_slow"
      ? "Cinematic slow dolly push into"
      : cameraCue === "ambient_orbit_3d"
      ? "Cinematic smooth 3D orbit around"
      : cameraCue === "crane_down_desk"
      ? "Cinematic studio crane boom gently moving downward over"
      : cameraCue === "dolly_out_reveal"
      ? "Cinematic smooth dolly pull-back revealing"
      : "Smooth floating aerial glide moving steadily forward across";

  const shouldAllowSpeaking = sceneContext?.allowSpeaking ?? Boolean(sceneContext?.dialogue);
  const resolvedTemplateIndex =
    sceneContext?.templateIndex ??
    (typeof sceneContext?.sceneIndex === "number" ? sceneContext.sceneIndex % 6 : 0);

  const personaDetails = getPersonaPromptDetails({
    personaId,
    attireId,
    productName: productSpec.title,
    typology: productSpec.typology,
    actionVariant: environmentVariant,
    dialogue: sceneContext?.dialogue,
    language: sceneContext?.language,
    allowSpeaking: shouldAllowSpeaking,
    templateIndex: resolvedTemplateIndex,
  });

  if (personaDetails.structuredPrompt) {
    return personaDetails.structuredPrompt;
  }

  const noDroneConstraint = "pure unobstructed camera POV, no physical drones, no quadcopters, no camera equipment visible in frame";

  let prompt = "";
  if (productSpec.typology === "surface_material") {
    if (environmentVariant === "showroom_wall") {
      prompt = `${cueLabel} an upscale architectural design showroom with floor-to-ceiling exhibition walls displaying gallery-mounted samples of different flooring planks, wall textures, and curated finishes, featuring ${productSpec.title} on the feature exhibition wall, ${personaDetails.fullPersonaPromptClause}, ${noDroneConstraint}, architectural spotlights highlighting natural wood grain and textures, photorealistic 8k commercial quality, 30fps`;
    } else if (environmentVariant === "showroom_paint") {
      prompt = `${cueLabel} a modern interior design showroom featuring an illuminated exhibition gallery wall of large architectural paint swatches and textured wall finishes paired with ${productSpec.title}, ${personaDetails.fullPersonaPromptClause}, ${noDroneConstraint}, warm gallery lighting, photorealistic 8k commercial quality, 30fps`;
    } else {
      prompt = `${cueLabel} an expansive sunlit luxury living room with installed ${productSpec.title}, ${personaDetails.fullPersonaPromptClause}, ${noDroneConstraint}, natural daylight reflections on the material, high-end Scandinavian interior architecture, photorealistic 8k commercial quality, 30fps`;
    }
  } else if (productSpec.typology === "digital_saas") {
    prompt = `${cueLabel} a modern minimalist glass-walled executive office with ${productSpec.title}, ${personaDetails.fullPersonaPromptClause}, ${noDroneConstraint}, volumetric sunlight, 8k commercial aesthetic, 30fps`;
  } else if (productSpec.typology === "sensory_consumable") {
    prompt = `${cueLabel} a luxury Italian marble bathroom vanity featuring ${productSpec.title}, ${personaDetails.fullPersonaPromptClause}, ${noDroneConstraint}, soft morning sunlight, natural water droplets, photorealistic 8k commercial quality, 30fps`;
  } else if (productSpec.typology === "apparel_wearable") {
    prompt = `${cueLabel} a sunlit modern architectural set, ${personaDetails.fullPersonaPromptClause}, ${noDroneConstraint}, natural fabric drape and movement, 8k commercial quality, 30fps`;
  } else {
    prompt = `${cueLabel} an expansive contemporary architectural showroom showcasing ${productSpec.title}, ${personaDetails.fullPersonaPromptClause}, ${noDroneConstraint}, warm ambient lighting, 8k photorealistic commercial quality, 30fps`;
  }
  return filterPromptForSafety(prompt, { allowSpeaking: shouldAllowSpeaking });
}

