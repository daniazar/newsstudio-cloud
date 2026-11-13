/**
 * src/lib/ai/pronunciationDetector.ts
 *
 * Scans script text for potential TTS pronunciation issues:
 * - Acronyms (all-caps tokens)
 * - Numeric strings that may need expansion
 * - Foreign words / proper nouns that may cause TTS stutters
 * - Known glossary entries (already have expansions)
 *
 * Returns structured warnings with severity levels for UI highlighting.
 */

export type WarningSeverity = "red" | "yellow" | "green";

export interface PronunciationWarning {
  /** The problematic token as found in the text */
  token: string;
  /** Start index in the original text */
  startIndex: number;
  /** End index in the original text */
  endIndex: number;
  /** Severity: "red" = needs manual attention, "yellow" = has auto-expansion, "green" = already in glossary */
  severity: WarningSeverity;
  /** Human-readable reason */
  reason: string;
  /** Suggested replacement (from glossary or auto-generated) */
  suggestion?: string;
  /** Category of the warning */
  category: "acronym" | "number" | "foreign" | "symbol" | "mixed_case";
}

export interface DetectionResult {
  /** Original text */
  text: string;
  /** All detected warnings, sorted by position */
  warnings: PronunciationWarning[];
  /** Summary counts */
  counts: {
    red: number;
    yellow: number;
    green: number;
    total: number;
  };
}

// Common Spanish acronyms with known good expansions
const KNOWN_ES_ACRONYMS: Record<string, string> = {
  YPF: "I-Pe-Efe",
  BCRA: "Bé-Cé-Erre-A",
  AFIP: "A-Fip",
  "EE.UU.": "Estados Unidos",
  OTAN: "Otán",
  ONU: "O-Ene-Ú",
  FMI: "Efe-Eme-Í",
  PIB: "Pé-I-Bé",
  PBI: "Pé-Bé-Í",
  IVA: "I-Va",
  CEO: "Cé-E-Ó",
  FIFA: "Fifa",
  AFA: "A-Efa-A",
  CONICET: "Conicet",
  NASA: "Nasa",
  IA: "Inteligencia Artificial",
  GPU: "Gé-Pé-Ú",
  CPU: "Cé-Pé-Ú",
  ANSES: "Ánses",
  PAMI: "Pami",
  CABA: "Ciudad Autónoma de Buenos Aires",
  GBA: "Gran Buenos Aires",
  AMBA: "Área Metropolitana de Buenos Aires",
  UBA: "Ú-Bé-A",
  UTN: "Ú-Té-Ene",
  SRL: "Ese-Erre-Ele",
  SA: "Ese-A",
};

const KNOWN_EN_ACRONYMS: Record<string, string> = {
  CEO: "C-E-O",
  CFO: "C-F-O",
  CTO: "C-T-O",
  IPO: "I-P-O",
  GDP: "G-D-P",
  FBI: "F-B-I",
  CIA: "C-I-A",
  NATO: "Nato",
  NASA: "Nasa",
  FIFA: "Fifa",
  AI: "A-I",
  GPU: "G-P-U",
  CPU: "C-P-U",
  API: "A-P-I",
};

// Words that are commonly fine and should not be flagged
const IGNORE_LIST = new Set([
  // Spanish common all-caps that are fine
  "NO", "SÍ", "YA", "MÁS", "NI", "AÚN",
  // English common short words
  "I", "A", "OK", "US", "AM", "PM", "TV", "IT", "UP", "GO", "IN", "ON", "OR",
]);

/**
 * Detect potential pronunciation issues in a script text.
 *
 * @param text The script text to analyze
 * @param language "es" or "en"
 * @param glossary Optional custom glossary entries (from /api/glossary)
 */
export function detectPronunciationIssues(
  text: string,
  language: "es" | "en" = "es",
  glossary?: Record<string, string>
): DetectionResult {
  const warnings: PronunciationWarning[] = [];
  const knownAcronyms = language === "es" ? KNOWN_ES_ACRONYMS : KNOWN_EN_ACRONYMS;
  const mergedGlossary = { ...knownAcronyms, ...(glossary || {}) };

  // 1. Detect all-caps tokens (acronyms)
  const acronymRegex = /\b([A-ZÁÉÍÓÚÑ]{2,})\b/g;
  let match: RegExpExecArray | null;
  while ((match = acronymRegex.exec(text)) !== null) {
    const token = match[1];
    if (IGNORE_LIST.has(token)) continue;

    const hasExpansion = mergedGlossary[token];
    warnings.push({
      token,
      startIndex: match.index,
      endIndex: match.index + token.length,
      severity: hasExpansion ? "yellow" : "red",
      reason: hasExpansion
        ? `Acronym with known expansion: "${hasExpansion}"`
        : "Unknown acronym — TTS may spell it letter-by-letter or mispronounce",
      suggestion: hasExpansion || undefined,
      category: "acronym",
    });
  }

  // 2. Detect complex numeric patterns (decimals, large numbers, percentages)
  const numberRegex = /\b(\d{1,3}(?:[.,]\d{1,3})+%?|\d{4,}%?|\d+[.,]\d+%?)\b/g;
  while ((match = numberRegex.exec(text)) !== null) {
    const token = match[1];
    warnings.push({
      token,
      startIndex: match.index,
      endIndex: match.index + token.length,
      severity: "yellow",
      reason: "Complex number — verify TTS reads it correctly (commas vs periods, thousands vs decimals)",
      category: "number",
    });
  }

  // 3. Detect currency symbols followed by numbers (may not be in glossary regex)
  const currencyRegex = /(\$|€|£|¥)\s*(\d+(?:[.,]\d+)?)\s*(M|k|B|millones|mil)?\b/g;
  while ((match = currencyRegex.exec(text)) !== null) {
    const token = match[0];
    warnings.push({
      token,
      startIndex: match.index,
      endIndex: match.index + token.length,
      severity: "yellow",
      reason: "Currency expression — normalizer should expand this, but verify output",
      category: "symbol",
    });
  }

  // 4. Detect quarter/fiscal references (Q1, Q2, Q3, Q4)
  const quarterRegex = /\b(Q[1-4])\b/g;
  while ((match = quarterRegex.exec(text)) !== null) {
    const token = match[1];
    const hasExpansion = mergedGlossary[token];
    if (hasExpansion) {
      warnings.push({
        token,
        startIndex: match.index,
        endIndex: match.index + token.length,
        severity: "green",
        reason: `Quarter reference with expansion: "${hasExpansion}"`,
        suggestion: hasExpansion,
        category: "acronym",
      });
    }
  }

  // 5. Detect mixed-case camelCase or PascalCase tokens (potential brand names / tech terms)
  const mixedCaseRegex = /\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b/g;
  while ((match = mixedCaseRegex.exec(text)) !== null) {
    const token = match[1];
    if (token.length < 5) continue; // Skip short ones
    warnings.push({
      token,
      startIndex: match.index,
      endIndex: match.index + token.length,
      severity: "yellow",
      reason: "CamelCase term — may need pronunciation guidance for TTS",
      category: "mixed_case",
    });
  }

  // Deduplicate by position (some regex may overlap)
  const seen = new Set<string>();
  const deduped = warnings.filter((w) => {
    const key = `${w.startIndex}-${w.endIndex}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Sort by position
  deduped.sort((a, b) => a.startIndex - b.startIndex);

  return {
    text,
    warnings: deduped,
    counts: {
      red: deduped.filter((w) => w.severity === "red").length,
      yellow: deduped.filter((w) => w.severity === "yellow").length,
      green: deduped.filter((w) => w.severity === "green").length,
      total: deduped.length,
    },
  };
}

/**
 * Apply glossary expansions to text, replacing all known acronyms with their phonetic equivalents.
 * Used for the "Expand All" button in the Script Editor.
 */
export function expandAcronyms(
  text: string,
  language: "es" | "en" = "es",
  glossary?: Record<string, string>
): string {
  const knownAcronyms = language === "es" ? KNOWN_ES_ACRONYMS : KNOWN_EN_ACRONYMS;
  const mergedGlossary = { ...knownAcronyms, ...(glossary || {}) };

  let result = text;
  // Sort by length descending to replace longer matches first (e.g., "EE.UU." before "EE")
  const sorted = Object.entries(mergedGlossary).sort(
    ([a], [b]) => b.length - a.length
  );

  for (const [acronym, expansion] of sorted) {
    const escaped = acronym.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "g");
    result = result.replace(regex, expansion);
  }

  return result;
}
