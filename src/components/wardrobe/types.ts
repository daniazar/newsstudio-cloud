import { ATTIRE_CATALOG_60 } from "@/lib/wardrobe/attireCatalog";

export interface PersonaItem {
  id: string;
  slug?: string;
  name: string;
  title?: string;
  role?: string;
  avatarUrl: string;
  gender: string;
  avatars?: { imageUrl?: string }[];
}

export interface OutfitItem {
  id: string;
  name: string;
  category: string;
  prompt: string;
  imageUrl?: string;
  source?: string;
  compiledPrompt?: string;
  gender?: string;
  samPrompt?: string;
  description?: string;
  cleanGenPrompt?: string;
}

export interface PersonaLoopOption {
  id: string;
  name: string;
  personaId: string;
  videoUrl: string;
  durationSec: number;
  frameCount: number;
  fps: number;
  sourceGarment: string;
  defaultTrackPrompt: string;
  description: string;
  isVerifiedDemo?: boolean;
}

export interface WardrobeInpaintJobSummary {
  id: string;
  status: string;
  currentStep?: string | null;
  doneSteps?: number | null;
  totalSteps?: number | null;
  errorLog?: string | null;
  outputPublicUrl?: string | null;
  config?: {
    personaName?: string;
    personaId?: string;
    outfitName?: string;
    sourceVideoPath?: string;
    outfitImagePath?: string;
    outputPublicUrl?: string;
  };
  createdAt: string;
  completedAt?: string | null;
}

export interface InpaintProgressState {
  phase: string;
  message: string;
  percent: number;
}

export interface InpaintResultState {
  outputPublicUrl: string;
  originalVideoUrl: string;
  outfitName: string;
}

export interface SamAnalysisResult {
  samPrompt: string;
  groundingDinoPrompt: string;
  negativePrompt: string;
  detectedGarments: Array<{ label: string; category?: string; material?: string; color?: string }>;
  confidence: number;
  reasoning: string;
  providerUsed: string;
}

export const FALLBACK_PERSONAS: PersonaItem[] = [
  { id: "ruby", name: "Ruby Vance", title: "Lead News Anchor", avatarUrl: "/avatars/ruby.png", gender: "female" },
  { id: "blaze", name: "Blaze Wilder", title: "Entertainment Anchor", avatarUrl: "/avatars/blaze.png", gender: "female" },
  { id: "isabel", name: "Isabel Rivera", title: "Presentadora Principal", avatarUrl: "/avatars/isabel.png", gender: "female" },
  { id: "storm", name: "Storm Sterling", title: "Breaking News Correspondent", avatarUrl: "/avatars/storm.png", gender: "female" },
  { id: "luna", name: "Luna Sommer", title: "Arts & Culture Reporter", avatarUrl: "/avatars/luna.png", gender: "female" },
  { id: "aris", name: "Dr. Aris Thorne", title: "Chief Medical Expert", avatarUrl: "/avatars/aris.png", gender: "male" },
];

export const LOOKBOOK_ITEMS_INITIAL: OutfitItem[] = ATTIRE_CATALOG_60.map((a) => ({
  id: a.id,
  name: a.name,
  category: a.category,
  prompt: a.prompt,
  imageUrl: a.imageUrl,
  gender: a.gender,
  samPrompt: a.samPrompt,
  description: a.description,
}));

export const GENDER_FILTERS = [
  { id: "auto", label: "🎯 Auto (For Anchor)" },
  { id: "all", label: "🌟 All (60 Attires)" },
  { id: "female", label: "🎙️ Female (20)" },
  { id: "male", label: "👔 Male (20)" },
  { id: "unisex", label: "🧥 Unisex (20)" },
];

export const CATEGORIES = [
  { id: "all", label: "🌟 All Categories" },
  { id: "broadcast", label: "🎙️ Prime Broadcast" },
  { id: "gala", label: "✨ Evening Gala" },
  { id: "edgy", label: "🖤 Edgy Leather" },
  { id: "casual", label: "☕ Casual Chic" },
  { id: "techwear", label: "🚀 Techwear" },
  { id: "executive", label: "💼 Executive" },
];

export const HAIR_GENDER_FILTERS = [
  { id: "auto", label: "🎯 Auto (For Anchor)" },
  { id: "all", label: "🌟 All (18 Styles)" },
  { id: "female", label: "🎙️ Women's (8)" },
  { id: "male", label: "👔 Men's (6)" },
  { id: "unisex", label: "🧥 Unisex (4)" },
];

export const HAIR_CATEGORIES = [
  { id: "all", label: "🌟 All Categories" },
  { id: "broadcast_anchor", label: "🎙️ Broadcast Anchor" },
  { id: "executive_sleek", label: "💼 Executive Sleek" },
  { id: "editorial_gala", label: "✨ Editorial Gala" },
  { id: "modern_casual", label: "☕ Modern Casual" },
  { id: "bold_avantgarde", label: "⚡ Avant-Garde" },
  { id: "textured_curls", label: "🌀 Textured Curls" },
];

export const HAIR_LENGTHS = [
  { id: "all", label: "All Lengths" },
  { id: "short", label: "Short" },
  { id: "medium", label: "Medium" },
  { id: "long", label: "Long" },
  { id: "updo", label: "Updo" },
];

export const HAIR_COLOR_FILTERS = [
  { id: "all", label: "🌟 All Colors", dot: null },
  { id: "blonde", label: "👱 Blonde", dot: "#E8C07A" },
  { id: "brunette", label: "🍫 Brunette", dot: "#6B4423" },
  { id: "black", label: "🖤 Black", dot: "#141416" },
  { id: "red", label: "🦊 Red / Copper", dot: "#A83E18" },
  { id: "silver", label: "🔘 Silver", dot: "#8E979E" },
  { id: "platinum", label: "❄️ Platinum", dot: "#EAEAEA" },
];

export function getColorFamilyHex(family?: string): string {
  switch (family) {
    case "blonde":
      return "#E8C07A";
    case "platinum":
      return "#EAEAEA";
    case "black":
      return "#141416";
    case "brunette":
      return "#6B4423";
    case "red":
      return "#A83E18";
    case "silver":
      return "#8E979E";
    default:
      return "#A855F7";
  }
}

export type TransformationType = "attire" | "hair" | "compound" | "persona";
export type MorphologyPolicy = "strict_garment" | "adapt_persona_attire" | "biometric_adaptation";
export type BodyAdaptationOption = "strict_outfit" | "adapt_to_persona";
export type SleeveStyleOption = "full_sleeves" | "sleeveless" | "match_source" | "auto";

/**
 * Resolves whether full long sleeves should be synthesized based on sleeve policy,
 * target attire keywords, and anchor gender.
 */
export function resolveShouldUseFullSleeves(
  sleeveStyle: SleeveStyleOption = "auto",
  targetAttireText: string = "",
  gender: string = "female"
): boolean {
  if (sleeveStyle === "full_sleeves") return true;
  if (sleeveStyle === "sleeveless" || sleeveStyle === "match_source") return false;

  // "auto": detect if attire or gender calls for long sleeves (suits, blazers, jackets, coats, shirts, male business formal)
  const lower = (targetAttireText || "").toLowerCase();
  const hasLongSleeveIndicator =
    /\b(suit|blazer|jacket|tuxedo|coat|trench|sweater|cardigan|shirt|long sleeve|executive|formal business)\b/.test(
      lower
    );

  if (hasLongSleeveIndicator) return true;
  if (gender === "male") return true;

  return false;
}

/**
 * Calibrates inverted tracking prompt targeting head, face, skin, and optionally hair
 * while preserving body, attire, lapels, sleeves, hands, desk, and kinematics.
 * Includes anti-ghost-hair cleanup tokens, optional body/attire adaptation to persona traits,
 * and intelligent full-sleeve tracking to eliminate sleeveless suits on sleeved attires.
 */
export function buildPersonaSwapTrackPrompt(
  keepOriginalHair: boolean = false,
  morphologyPolicy: MorphologyPolicy = "strict_garment",
  bodyAdaptation?: BodyAdaptationOption,
  sleeveStyle: SleeveStyleOption = "auto",
  targetAttireText?: string,
  gender?: string
): string {
  const isAttireAdapted =
    morphologyPolicy === "adapt_persona_attire" ||
    bodyAdaptation === "adapt_to_persona";

  const hairTokens = keepOriginalHair
    ? "face, skin, neck, eyes, eyebrows, nose, mouth, lips, chin, jawline, ears"
    : "head, face, hair, curls, long hair, cascading hair, stray hair";

  if (isAttireAdapted) {
    const isFullSleeves = resolveShouldUseFullSleeves(sleeveStyle, targetAttireText, gender);
    const armTokens = isFullSleeves
      ? ", arms, bare arms, forearms, biceps, upper arms"
      : "";
    return `${hairTokens}, clothing, dress, top, bodice, straps, neckline, corset, collar, chest, decolletage, shoulders${armTokens}`;
  }

  if (morphologyPolicy === "biometric_adaptation") {
    return `${hairTokens}, neckline, chest`;
  }

  return hairTokens;
}

export const INPAINTER_GRID_RESPONSIVE_COLS = { mobile: 1, tablet: 2, desktop: 4 } as const;
export const LOOKBOOK_GRID_RESPONSIVE_COLS = { mobile: 1, tablet: 2, desktop: 3 } as const;

export function buildFullCanvasTrackPrompt(
  outfitSamPrompt?: string,
  sourceGarmentText?: string,
  extraTokens?: string[]
): string {
  const baseTokens = outfitSamPrompt ? outfitSamPrompt.split(",").map((s) => s.trim().toLowerCase()) : [];
  const sourceTokens = (sourceGarmentText || "").split(",").map((s) => s.trim().toLowerCase());
  const canvasTokens = [
    "clothing",
    "shoulders",
    "chest",
    "torso",
    "upper body",
    "neckline",
    "collar",
    "arms",
    "sleeves",
    "hands",
    ...(extraTokens || []),
  ];
  return Array.from(new Set([...baseTokens, ...sourceTokens, ...canvasTokens])).filter(Boolean).join(", ");
}

/**
 * Calibrates compound tracking prompt binding garments, bare arms, and hairstyle/head together
 * for full anchor makeover metamorphosis ("${sourceGarment}, clothing, attire, dress, hair, head").
 */
export function buildCompoundTrackPrompt(
  sourceGarmentText?: string,
  outfitSamPrompt?: string,
  hairSamPrompt?: string
): string {
  const sourceTokens = (sourceGarmentText || "burgundy dress")
    .split(",")
    .map((s) => s.trim().toLowerCase());
  const defaultTokens = ["clothing", "attire", "dress", "hair", "head"];
  const outfitTokens = outfitSamPrompt ? outfitSamPrompt.split(",").map((s) => s.trim().toLowerCase()) : [];
  const hairTokens = hairSamPrompt ? hairSamPrompt.split(",").map((s) => s.trim().toLowerCase()) : [];

  return Array.from(new Set([...sourceTokens, ...defaultTokens, ...outfitTokens, ...hairTokens]))
    .filter(Boolean)
    .join(", ");
}
