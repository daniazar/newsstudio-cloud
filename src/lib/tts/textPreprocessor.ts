import { transpileAudioTagsForModel } from "./audioTagAdapter";
import { applyCadencePreset,CadencePresetId } from "./cadencePresets";
import { NormalizationOptions,normalizeTextForSpeech } from "./phoneticGlossary";

export type TtsEngineType = 
  | "piper"
  | "f5_tts" 
  | "xtts_v2" 
  | "cosyvoice_3" 
  | "styletts2" 
  | "bark"
  | "parler_tts"
  | "fish_speech" 
  | "higgs_audio" 
  | "vibevoice" 
  | "index_tts" 
  | "omnivoice"
  | "omni"
  | "orpheus"
  | "orpheus_tts"
  | "kokoro"
  | "chattts"
  | "melotts";

export interface PreprocessOptions {
  engine?: TtsEngineType | string;
  language?: string; // "es" | "en" | "es-AR" etc.
  instructText?: string;
  addBreaths?: boolean;
  applyYeismo?: boolean;
  cadencePreset?: CadencePresetId | string;
  normalizationOptions?: NormalizationOptions;
}

/**
 * Preprocesses news script text for speech synthesis engines:
 * 1. Transpiles generic audio tags ([laugh], [sigh], [gasp]) to model-specific syntax.
 * 2. Applies currency and financial acronym normalizations.
 * 3. Applies engine-specific cadence & breathing punctuation triggers.
 */
export function preprocessTextForTts(text: string, options: PreprocessOptions = {}): string {
  if (!text || typeof text !== "string") return "";

  const engine = options.engine || (process.env.DEFAULT_TTS_ENGINE as TtsEngineType) || "f5_tts";
  const language = options.language || "es";
  const addBreaths = options.addBreaths !== false;

  // 1. Transpile generic audio tags into model-specific syntax (<laugh>, [break_4], pauses, etc.)
  let processed = transpileAudioTagsForModel(text, engine);

  // 2. Apply Cadence Preset punctuation formatting if specified
  if (options.cadencePreset) {
    const cadenceRes = applyCadencePreset(processed, options.cadencePreset);
    processed = cadenceRes.processedText;
  }

  // 3. Normalization (Currencies, numbers, financial acronyms, yeísmo)
  processed = normalizeTextForSpeech(processed, {
    language,
    engine,
    applyYeismo: options.applyYeismo,
    ...(options.normalizationOptions || {}),
  });

  // 4. Engine-specific prosody formatting
  switch (engine) {
    case "f5_tts":
      processed = formatForF5Tts(processed, addBreaths);
      break;
    case "xtts_v2":
      processed = formatForXttsV2(processed, addBreaths);
      break;
    case "cosyvoice_3":
      processed = formatForCosyVoice(processed, options.instructText);
      break;
    case "piper":
      processed = formatForPiper(processed);
      break;
    case "omnivoice":
    case "omni":
      processed = formatForOmniVoice(processed);
      break;
    case "styletts2":
    case "higgs_audio":
    case "vibevoice":
    case "index_tts":
    case "fish_speech":
    case "parler_tts":
    case "bark":
      processed = formatForF5Tts(processed, addBreaths);
      break;
    default:
      processed = formatForPiper(processed);
      break;
  }

  return processed.replace(/\s+/g, " ").trim();
}

/**
 * F5-TTS Flow Matching ConvNeXt V2:
 * Responds exceptionally well to ellipses (...) and em-dashes (--) for breath intake & natural pauses.
 */
function formatForF5Tts(text: string, addBreaths: boolean): string {
  let result = text;

  if (addBreaths) {
    // Replace colon or semi-colon with pause dash
    result = result.replace(/[:;]\s*/g, " -- ");

    // Ensure sentence boundaries have micro-pause ellipses if long
    result = result.replace(/([.!?])\s+([A-Z¿¡])/g, "$1... $2");

    // Add breath pauses after introductory news anchors phrases (e.g. "Hola", "Buenas noches")
    result = result.replace(/^(Hola|Buenas noches|Bienvenidos|Atención)\b/i, "$1...");

    // Clean multiple dashes or dots
    result = result.replace(/-{3,}/g, "--").replace(/\.{4,}/g, "...");
  }

  return result;
}

/**
 * XTTS v2 (Coqui):
 * Prevents breath exhaustion by ensuring sentences stay under ~15 words and converting long clauses with structural commas.
 */
function formatForXttsV2(text: string, addBreaths: boolean): string {
  const sentences = text.split(/(?<=[.!?])\s+/);

  const formattedSentences = sentences.map((sentence) => {
    let s = sentence.trim();
    const words = s.split(" ");
    if (words.length > 15 && addBreaths) {
      // Find middle conjunctions or commas to split sentence
      s = s.replace(/(\b(y|o|pero|que|cuando|donde|mientras|and|but|or|where|when)\b)/i, ", $1");
    }
    return s;
  });

  return formattedSentences.join(" ");
}

/**
 * CosyVoice 3 (Alibaba FunAudioLLM):
 * Supports instruct text control (e.g. [professional newsroom cadence]) and emotion prompt prefixes.
 */
function formatForCosyVoice(text: string, instructText?: string): string {
  let result = text;
  if (instructText && instructText.trim()) {
    result = `<instruct>${instructText.trim()}</instruct> ${result}`;
  }
  return result;
}

/**
 * Piper Neural VITS:
 * Clean, natural sentence pacing with balanced punctuation.
 */
function formatForPiper(text: string): string {
  return text.replace(/--+/g, ",").replace(/\.\.+/g, ".").replace(/\s+/g, " ").trim();
}

/**
 * OmniVoice (Next-Gen Kaldi k2-fsa / Qwen Speech LLM):
 * Autoregressive speech-LLM thrives on clean, natural sentence structure with standard periods and commas.
 * Strips repeated dots, quotation marks, and dangling ellipsis that trip autoregressive EOS tokens.
 */
function formatForOmniVoice(text: string): string {
  return text
    .replace(/["'“”«»]/g, "") // Strip quotation marks
    .replace(/(?:\s*\.\s*){2,}/g, ", ") // Convert spaced dots into natural comma pauses
    .replace(/\.{2,}/g, ", ") // Convert intra-sentence ellipses into natural comma pauses (prevents 1-word sentence splits)
    .replace(/-{2,}/g, ", ") // Convert em-dashes to natural comma pause
    .replace(/,\s*,+/g, ", ") // Deduplicate consecutive commas
    .replace(/([.!?])\s*,+/g, "$1") // Clean trailing commas immediately following terminal punctuation
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Helper to get active TTS engine formatting instructions for LLM prompts.
 */
export function getLlmTtsFormattingInstructions(engine?: TtsEngineType): string {
  const activeEngine = engine || (process.env.DEFAULT_TTS_ENGINE as TtsEngineType) || "f5_tts";

  switch (activeEngine) {
    case "f5_tts":
      return `
- Write short, expressive sentences for F5-TTS voice synthesis.
- Use dashes (--) and ellipses (...) between clauses to trigger natural human breaths, pauses, and speech cadence.
- For Spanish (Argentine Rioplatense), use natural spoken phrasing and voseo where applicable.
`;
    case "piper":
      return `
- Write crisp, well-punctuated broadcast news sentences for Piper Neural VITS synthesis.
- Keep commas and periods clean for optimal neural prosody.
`;
    case "xtts_v2":
      return `
- Keep sentences punchy (under 15 words) for XTTS v2 multilingual voice cloning.
- Use frequent commas and periods to structure breath cadence and prevent voice fatigue.
`;
    case "cosyvoice_3":
      return `
- Write text suited for CosyVoice 3 zero-shot emotional synthesis.
- Ensure natural newsroom cadence with clear emotional inflection markers.
`;
    default:
      return `
- Write clean, clear news sentences for speech synthesis.
`;
  }
}
