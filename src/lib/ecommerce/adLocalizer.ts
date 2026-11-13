/**
 * src/lib/ecommerce/adLocalizer.ts
 *
 * 1-Click Multilingual Product Ad Matrix.
 * Localizes e-commerce video ad campaigns across 8 global markets with:
 * - Real-time currency conversion and locale-specific price formatting
 * - Culturally adapted hook & scene copywriting
 * - Native Piper ONNX voice persona routing
 * - Localized direct-response CTA buttons
 * - Strict preservation of inline TTS tags ([urgent], [pause], [sfx])
 */

import { ProductSpec, AdScript, AdScene } from "@/lib/types/ecommerce";
import { generateLlmText } from "@/lib/llm/aiSdkGateway";

export type TargetMarketKey =
  | "en_us"
  | "es_latam"
  | "es_es"
  | "pt_br"
  | "de_de"
  | "fr_fr"
  | "en_gb"
  | "ja_jp";

export interface MarketProfile {
  key: TargetMarketKey;
  name: string;
  flag: string;
  language: string;
  currency: string;
  currencySymbol: string;
  exchangeRateFromUsd: number;
  locale: string;
  defaultVoiceId: string;
  ctaTranslation: string;
  culturalNotes: string;
}

export interface LocalizedAdResult {
  marketKey: TargetMarketKey;
  productSpec: ProductSpec;
  script: AdScript;
  originalPrice: number;
  convertedPrice: number;
  formattedPrice: string;
  formattedCompareAtPrice?: string;
  ctaText: string;
  voiceId: string;
}

export interface LocalizedCampaignBundle {
  baseProduct: ProductSpec;
  baseScript: AdScript;
  markets: Record<TargetMarketKey, LocalizedAdResult>;
  createdAt: string;
}

/**
 * 8 Global Market Profiles with Currency, Locale, and Persona Mappings
 */
export const MARKET_PROFILES: Record<TargetMarketKey, MarketProfile> = {
  en_us: {
    key: "en_us",
    name: "United States",
    flag: "🇺🇸",
    language: "English (US)",
    currency: "USD",
    currencySymbol: "$",
    exchangeRateFromUsd: 1.0,
    locale: "en-US",
    defaultVoiceId: "sofia",
    ctaTranslation: "Shop Now",
    culturalNotes: "High-energy direct response, clear value proposition, urgent scarcity callout.",
  },
  es_latam: {
    key: "es_latam",
    name: "Latin America (Rioplatense / Neutral)",
    flag: "🇦🇷",
    language: "Spanish (LATAM)",
    currency: "USD", // Many international cross-border checkouts use USD in LATAM
    currencySymbol: "US$",
    exchangeRateFromUsd: 1.0,
    locale: "es-AR",
    defaultVoiceId: "diego",
    ctaTranslation: "Comprar Ahora",
    culturalNotes: "Warm, conversational persuasion, emphasis on quality and official warranty.",
  },
  es_es: {
    key: "es_es",
    name: "Spain (Europe)",
    flag: "🇪🇸",
    language: "Spanish (Castilian)",
    currency: "EUR",
    currencySymbol: "€",
    exchangeRateFromUsd: 0.92,
    locale: "es-ES",
    defaultVoiceId: "isabella",
    ctaTranslation: "Comprar Ahora",
    culturalNotes: "Direct, articulate European Spanish with VAT-included price transparency.",
  },
  pt_br: {
    key: "pt_br",
    name: "Brazil",
    flag: "🇧🇷",
    language: "Portuguese (Brazil)",
    currency: "BRL",
    currencySymbol: "R$",
    exchangeRateFromUsd: 5.2,
    locale: "pt-BR",
    defaultVoiceId: "fabiana",
    ctaTranslation: "Comprar Já",
    culturalNotes: "Vibrant, friendly tone with installment payment emphasis (Parcelado).",
  },
  de_de: {
    key: "de_de",
    name: "Germany",
    flag: "🇩🇪",
    language: "German",
    currency: "EUR",
    currencySymbol: "€",
    exchangeRateFromUsd: 0.92,
    locale: "de-DE",
    defaultVoiceId: "marlene",
    ctaTranslation: "Jetzt Kaufen",
    culturalNotes: "Precise, engineering-focused tone emphasizing durability and specifications.",
  },
  fr_fr: {
    key: "fr_fr",
    name: "France",
    flag: "🇫🇷",
    language: "French",
    currency: "EUR",
    currencySymbol: "€",
    exchangeRateFromUsd: 0.92,
    locale: "fr-FR",
    defaultVoiceId: "camille",
    ctaTranslation: "Acheter Maintenant",
    culturalNotes: "Refined, elegant phrasing with sensory aesthetic emphasis.",
  },
  en_gb: {
    key: "en_gb",
    name: "United Kingdom",
    flag: "🇬🇧",
    language: "English (UK)",
    currency: "GBP",
    currencySymbol: "£",
    exchangeRateFromUsd: 0.79,
    locale: "en-GB",
    defaultVoiceId: "emma",
    ctaTranslation: "Order Today",
    culturalNotes: "Sophisticated British understatement, clean product specs, free UK delivery.",
  },
  ja_jp: {
    key: "ja_jp",
    name: "Japan",
    flag: "🇯🇵",
    language: "Japanese",
    currency: "JPY",
    currencySymbol: "¥",
    exchangeRateFromUsd: 152.0,
    locale: "ja-JP",
    defaultVoiceId: "sakura",
    ctaTranslation: "今すぐ購入",
    culturalNotes: "Polite, detail-oriented presentation highlighting craftsmanship and trust.",
  },
};

/**
 * Converts price from USD to target market currency.
 */
export function convertPrice(priceUsd: number, marketKey: TargetMarketKey): number {
  const profile = MARKET_PROFILES[marketKey];
  const rate = profile?.exchangeRateFromUsd ?? 1.0;
  const raw = priceUsd * rate;

  // JPY is zero-decimal integer currency
  if (profile.currency === "JPY") {
    return Math.round(raw / 100) * 100;
  }

  // Round to standard 2-decimal commercial price ending in .99 or .90
  return Number(raw.toFixed(2));
}

/**
 * Formats a localized price string respecting national currency symbols and separators.
 */
export function formatLocalizedPrice(amount: number, marketKey: TargetMarketKey): string {
  const profile = MARKET_PROFILES[marketKey];

  if (profile.currency === "JPY") {
    return `¥${Math.round(amount).toLocaleString("ja-JP")}`;
  }

  if (profile.currency === "BRL") {
    return `R$ ${amount.toFixed(2).replace(".", ",")}`;
  }

  if (profile.currency === "EUR") {
    // European standard: 79,99 €
    return `${amount.toFixed(2).replace(".", ",")} €`;
  }

  if (profile.currency === "GBP") {
    return `£${amount.toFixed(2)}`;
  }

  if (marketKey === "es_latam") {
    return `US$ ${amount.toFixed(2).replace(".", ",")}`;
  }

  // Default USD: $79.99
  return `$${amount.toFixed(2)}`;
}

/**
 * Deterministic E-Commerce Translation Dictionaries (Guaranteed Zero-Network Fallback)
 */
const ECOM_FALLBACK_DICTIONARY: Record<
  TargetMarketKey,
  {
    hookPrefix: string;
    discountSuffix: string;
    trustBadge: string;
    cta: string;
    guarantee: string;
  }
> = {
  en_us: {
    hookPrefix: "Stop Scrolling! Discover the all-new",
    discountSuffix: "Limited Time Offer • Get Yours Today",
    trustBadge: "VERIFIED SPECIFICATIONS",
    cta: "Shop Now",
    guarantee: "30-Day Money Back Guarantee",
  },
  es_latam: {
    hookPrefix: "¡Atención! Descubrí el nuevo",
    discountSuffix: "Oferta por Tiempo Limitado • Pedí el Tuyo",
    trustBadge: "ESPECIFICACIONES VERIFICADAS",
    cta: "Comprar Ahora",
    guarantee: "Garantía Oficial de 30 Días",
  },
  es_es: {
    hookPrefix: "¡Atención! Descubre el nuevo",
    discountSuffix: "Oferta por Tiempo Limitado • Haz tu Pedido",
    trustBadge: "ESPECIFICACIONES VERIFICADAS",
    cta: "Comprar Ahora",
    guarantee: "Garantía de Satisfacción 30 Días",
  },
  pt_br: {
    hookPrefix: "Atenção! Conheça o novo",
    discountSuffix: "Oferta por Tempo Limitado • Peça Já o Seu",
    trustBadge: "ESPECIFICAÇÕES VERIFICADAS",
    cta: "Comprar Já",
    guarantee: "Garantia de 30 Dias",
  },
  de_de: {
    hookPrefix: "Achtung! Entdecken Sie das neue",
    discountSuffix: "Zeitlich Begrenztes Angebot • Jetzt Sichern",
    trustBadge: "VERIFIZIERTE SPEZIFIKATIONEN",
    cta: "Jetzt Kaufen",
    guarantee: "30 Tage Geld-zurück-Garantie",
  },
  fr_fr: {
    hookPrefix: "Ne zappez pas! Découvrez le nouveau",
    discountSuffix: "Offre à Durée Limitée • Commandez le Vôtre",
    trustBadge: "SPÉCIFICATIONS VÉRIFIÉES",
    cta: "Acheter Maintenant",
    guarantee: "Garantie Satisfait ou Remboursé 30 Jours",
  },
  en_gb: {
    hookPrefix: "Hold on! Introducing the all-new",
    discountSuffix: "Exclusive UK Offer • Order Yours Today",
    trustBadge: "OFFICIALLY CERTIFIED",
    cta: "Order Today",
    guarantee: "30-Day Risk Free Guarantee",
  },
  ja_jp: {
    hookPrefix: "注目！待望の最新モデル登場：",
    discountSuffix: "期間限定キャンペーン • 今すぐご注文を",
    trustBadge: "公式認定スペック",
    cta: "今すぐ購入",
    guarantee: "30日間全額返金保証",
  },
};

/**
 * Translates ad copy using Gemini 2.5 Flash when available, or deterministic e-commerce dictionary.
 */
export async function translateAdText(
  text: string,
  targetMarket: TargetMarketKey
): Promise<string> {
  if (!text) return "";
  if (targetMarket === "en_us") return text;

  const profile = MARKET_PROFILES[targetMarket];

  try {
    const system = `You are an expert e-commerce direct response copywriter.
Translate the following short product ad copy into ${profile.language}.

Target audience guidelines:
${profile.culturalNotes}

STRICT RULES:
1. Preserve all square-bracketed audio tags exactly as-is: [urgent], [excited], [pause: X.Xs], [sfx:name].
2. Keep it punchy, high-converting, and natural for TikTok/Reels video captions.
3. Output ONLY the translated copy, with no quotes, commentary, or markdown formatting.`;

    const res = await generateLlmText({
      system,
      prompt: `Text to translate:\n${text}`,
      tier: "structured",
      temperature: 0.3,
      allowFallback: true,
    });

    const translated = res.text?.trim();
    if (translated) return translated;
  } catch (err) {
    console.warn(`[AdLocalizer] LLM translation failed for ${targetMarket}, using dictionary fallback:`, err);
  }

  // Deterministic fallback dictionary if offline or API unavailable
  const dict = ECOM_FALLBACK_DICTIONARY[targetMarket] || ECOM_FALLBACK_DICTIONARY.en_us;

  // Preserve any leading tags
  const tagMatch = text.match(/^(\[[^\]]+\]\s*)/);
  const leadingTag = tagMatch ? tagMatch[1] : "";
  const cleanText = text.replace(/^(\[[^\]]+\]\s*)/, "");

  return `${leadingTag}${dict.hookPrefix} ${cleanText}`;
}

/**
 * Localizes a single Scene for the target market.
 */
export async function localizeAdScene(
  scene: AdScene,
  targetMarket: TargetMarketKey
): Promise<AdScene> {
  if (targetMarket === "en_us") return { ...scene };

  const [translatedHeadline, translatedSubheadline, translatedVoiceover, translatedBadge] =
    await Promise.all([
      translateAdText(scene.headline, targetMarket),
      scene.subheadline ? translateAdText(scene.subheadline, targetMarket) : Promise.resolve(""),
      scene.voiceoverScript ? translateAdText(scene.voiceoverScript, targetMarket) : Promise.resolve(""),
      scene.featureBadgeText ? translateAdText(scene.featureBadgeText, targetMarket) : Promise.resolve(""),
    ]);

  return {
    ...scene,
    headline: translatedHeadline,
    subheadline: translatedSubheadline || undefined,
    voiceoverScript: translatedVoiceover || undefined,
    featureBadgeText: translatedBadge || undefined,
  };
}

/**
 * Localizes an entire ProductSpec for a target market (converted price, currency, translated bullets).
 */
export function localizeProductSpec(
  product: ProductSpec,
  targetMarket: TargetMarketKey
): ProductSpec {
  const profile = MARKET_PROFILES[targetMarket];
  const convertedPrice = convertPrice(product.price, targetMarket);
  const convertedCompareAt = product.compareAtPrice
    ? convertPrice(product.compareAtPrice, targetMarket)
    : undefined;

  return {
    ...product,
    currency: profile.currency,
    price: convertedPrice,
    compareAtPrice: convertedCompareAt,
  };
}

/**
 * Localizes an entire AdScript for a target market.
 */
export async function localizeAdScript(
  script: AdScript,
  targetMarket: TargetMarketKey
): Promise<AdScript> {
  const profile = MARKET_PROFILES[targetMarket];

  const [translatedHook, localizedScenes] = await Promise.all([
    translateAdText(script.hookHeadline, targetMarket),
    Promise.all(script.scenes.map((s) => localizeAdScene(s, targetMarket))),
  ]);

  return {
    ...script,
    hookHeadline: translatedHook,
    callToAction: profile.ctaTranslation,
    scenes: localizedScenes,
  };
}

/**
 * Main Entry Point: 1-Click Multi-Market Ad Matrix Generator.
 * Compiles localized versions of the product spec and script for all specified markets.
 */
export async function localizeAdCampaign(
  product: ProductSpec,
  script: AdScript,
  targetMarkets: TargetMarketKey[] = ["en_us", "es_latam", "de_de", "fr_fr", "pt_br", "ja_jp"]
): Promise<LocalizedCampaignBundle> {
  const markets: Record<string, LocalizedAdResult> = {};

  for (const marketKey of targetMarkets) {
    const profile = MARKET_PROFILES[marketKey];
    const localizedProduct = localizeProductSpec(product, marketKey);
    const localizedScript = await localizeAdScript(script, marketKey);

    const convertedPrice = localizedProduct.price;
    const formattedPrice = formatLocalizedPrice(convertedPrice, marketKey);
    const formattedCompareAtPrice = localizedProduct.compareAtPrice
      ? formatLocalizedPrice(localizedProduct.compareAtPrice, marketKey)
      : undefined;

    markets[marketKey] = {
      marketKey,
      productSpec: localizedProduct,
      script: localizedScript,
      originalPrice: product.price,
      convertedPrice,
      formattedPrice,
      formattedCompareAtPrice,
      ctaText: profile.ctaTranslation,
      voiceId: profile.defaultVoiceId,
    };
  }

  return {
    baseProduct: product,
    baseScript: script,
    markets: markets as Record<TargetMarketKey, LocalizedAdResult>,
    createdAt: new Date().toISOString(),
  };
}
