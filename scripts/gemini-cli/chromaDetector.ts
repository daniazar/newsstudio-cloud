/**
 * scripts/gemini-cli/chromaDetector.ts
 *
 * Intelligent Chroma Backdrop Selector.
 * Analyzes attire color tones and automatically selects between Chroma Green (#00B140)
 * and Chroma Blue (#0047BB) to prevent color spill and keying holes.
 */

export interface ChromaResult {
  color: "green" | "blue";
  colorName: string;
  hex: string;
  label: string;
  prompt: string;
  reason: string;
}

const GREEN_KEYWORDS = [
  "green", "emerald", "olive", "teal", "forest", "jade", "mint",
  "lime", "sage", "khaki", "pistachio", "seafoam", "chartreuse"
];

const BLUE_KEYWORDS = [
  "blue", "cobalt", "navy", "sapphire", "cyan", "indigo", "azure",
  "denim", "cerulean", "sky", "midnight", "periwinkle"
];

export function detectOptimalChroma(attireDescription: string, forceMode?: "auto" | "green" | "blue"): ChromaResult {
  if (forceMode === "green") {
    return {
      color: "green",
      colorName: "Chroma Green",
      hex: "#00B140",
      label: "🟢 Studio Broadcast Chroma Green (#00B140)",
      prompt: "Solid seamless studio chroma green backdrop (#00B140), perfectly flat and uniform lighting with zero hot spots or shadows, isolated subject against green cyclorama.",
      reason: "User explicitly selected Chroma Green.",
    };
  }

  if (forceMode === "blue") {
    return {
      color: "blue",
      colorName: "Chroma Blue",
      hex: "#0047BB",
      label: "🔵 Studio Broadcast Chroma Blue (#0047BB)",
      prompt: "Solid seamless studio chroma blue backdrop (#0047BB), perfectly flat and uniform lighting with zero color bleed or shadows, isolated subject against blue cyclorama.",
      reason: "User explicitly selected Chroma Blue.",
    };
  }

  const text = attireDescription.toLowerCase();
  const hasGreen = GREEN_KEYWORDS.some((kw) => text.includes(kw));
  const hasBlue = BLUE_KEYWORDS.some((kw) => text.includes(kw));

  // If attire has green tones, use Chroma Blue to avoid green-on-green keying holes
  if (hasGreen && !hasBlue) {
    return {
      color: "blue",
      colorName: "Chroma Blue",
      hex: "#0047BB",
      label: "🔵 Studio Broadcast Chroma Blue (#0047BB) [Auto-Detected]",
      prompt: "Solid seamless studio chroma blue backdrop (#0047BB), perfectly flat and uniform lighting with zero color bleed or shadows, isolated subject against blue cyclorama.",
      reason: "Attire contains green tones — Chroma Blue selected automatically to prevent green spill & keying holes.",
    };
  }

  // If attire has blue tones, use Chroma Green to avoid blue-on-blue keying holes
  if (hasBlue && !hasGreen) {
    return {
      color: "green",
      colorName: "Chroma Green",
      hex: "#00B140",
      label: "🟢 Studio Broadcast Chroma Green (#00B140) [Auto-Detected]",
      prompt: "Solid seamless studio chroma green backdrop (#00B140), perfectly flat and uniform lighting with zero hot spots or shadows, isolated subject against green cyclorama.",
      reason: "Attire contains blue tones — Chroma Green selected automatically to prevent blue keying holes.",
    };
  }

  // Default to standard broadcast Chroma Green
  return {
    color: "green",
    colorName: "Chroma Green",
    hex: "#00B140",
    label: "🟢 Studio Broadcast Chroma Green (#00B140) [Auto-Detected]",
    prompt: "Solid seamless studio chroma green backdrop (#00B140), perfectly flat and uniform lighting with zero hot spots or shadows, isolated subject against green cyclorama.",
    reason: "Neutral attire tones — standard broadcast Chroma Green selected.",
  };

}
