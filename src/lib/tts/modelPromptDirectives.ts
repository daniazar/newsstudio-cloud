/**
 * NewsStudio — Multi-Model & Multi-Language LLM Script Preprocessing & Expansion Directives
 * 
 * Provides structured system prompt directives for LLMs (Gemini 2.5 Flash, Ollama)
 * to author and expand broadcast news scripts specifically tailored to the acoustic,
 * G2P, and prosodic requirements of each neural TTS engine and language.
 */

export type TtsEngineId = "piper" | "omni" | "omnivoice" | "f5_tts" | "f5" | "kokoro" | "default";
export type SupportedLanguage = "es" | "en";
export type StudioPipelineMode = "news" | "ecommerce" | "realtime";

/**
 * Returns the default audio model based on the studio pipeline mode and language:
 * - Realtime mode: English -> "kokoro", Spanish -> "piper"
 * - News mode: "omni"
 * - E-Commerce mode: "omni"
 */
export function getDefaultEngineForMode(
  mode: StudioPipelineMode = "news",
  language: string = "es"
): TtsEngineId {
  if (mode === "realtime") {
    return language.toLowerCase().startsWith("en") ? "kokoro" : "piper";
  }
  return "omni";
}

export interface EngineDirectivesConfig {
  engineName: string;
  language: SupportedLanguage;
  summary: string;
  rules: string[];
  examples: { raw: string; expanded: string; rationale: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Piper ONNX Directives (VITS / espeak-ng)
// ─────────────────────────────────────────────────────────────────────────────

export const PIPER_SPANISH_DIRECTIVES: EngineDirectivesConfig = {
  engineName: "Piper ONNX (VITS)",
  language: "es",
  summary: "Latin G2P engine. Prone to reading silent English letters, consonant-vowel liaison blur, and low-pitch opening murmurs.",
  rules: [
    "SALUTATION CADENCE: Always wrap anchor opening greetings in Spanish inverted exclamation marks ¡...!, and insert a comma between the adjective and the vocative noun (e.g., '¡Buenas noches, queridos, espectadores!'). This forces an assertive +18Hz pitch onset and prevents opening syllable swallowing.",
    "FOREIGN BRANDS & ANGLICISMS: Transliterate English silent terminal vowels to phonetic Spanish ('Blue' -> 'Blu', 'Byte' -> 'Bait', 'Online' -> 'Onlain', 'Apple' -> 'Ápel').",
    "BRAND BOUNDARY DECOUPLING: Always append a soft comma immediately after a foreign proper noun when followed by an auxiliary verb or silent-h word (e.g., 'Blu Origin, ha ganado').",
    "OXYTONE ACCENT STRESS & CONSONANTS: Strip erroneous typographic accents from initial syllables of words ending in -dor/-dora/-dores (e.g., 'órbitador' -> 'orbitador'), and insert a syllable hyphen before the root ('or-bitador') to lock the bilabial [b] stop.",
    "VOWEL HIATUS DECOUPLING: When an unstressed terminal vowel -a precedes the copula 'es' ('noticia es'), insert a micro-pause comma ('noticia, es') to prevent diphthong collapse into 'noticiarse'.",
    "PREPOSITIONAL DELIMITATION: Insert a breathing comma before preposition 'en' following plural nouns ('comunicaciones, en Marte') to eliminate coarticulation blur.",
    "ACRONYMS & TICKERS: Letter-by-letter initialisms must be written with hyphens ('C-E-O', 'S-E-C', 'B-C-R-A', 'F-M-I', 'A-I'). Pronounceable acronyms remain standard capitalized words ('NASA', 'FIFA').",
    "NUMBER & CURRENCY VERBALIZATION: Never leave raw currency symbols or numbers ($10.5M -> 'diez coma cinco millones de dólares', 1.25% -> 'uno coma veinticinco por ciento')."
  ],
  examples: [
    {
      raw: "Buenas noches, queridos espectadores. En el espacio, Blue Origin ha ganado un contrato de la NASA para crear un órbitador de comunicaciones en Marte. Esta noticia es realmente importante.",
      expanded: "¡Buenas noches, queridos, espectadores! En el espacio, Blu Origin, ha ganado un contrato de la NASA para crear un or-bitador de comunicaciones, en Marte. Esta noticia, es realmente importante.",
      rationale: "Assertive greeting cadence, brand monophthongization, oxytone syllable locking, vowel hiatus prevention, and prepositional decoupling."
    }
  ]
};

export const PIPER_ENGLISH_DIRECTIVES: EngineDirectivesConfig = {
  engineName: "Piper ONNX (VITS)",
  language: "en",
  summary: "Fast English VITS model. Prone to ampersand reductions, digit slurring in 4-digit years, and acronym blending.",
  rules: [
    "AMPERSANDS & SPECIAL SYMBOLS: Never use raw '&'. Write out 'and' explicitly. For market indices, write 'S and P 500' or 'the S and P index' (raw 'S&P' reduces to 'SMP').",
    "INITIALISMS & ACRONYMS: Hyphenate letter-by-letter acronyms ('C-E-O', 'S-E-C', 'A-I', 'F-B-I'). Acronyms read as words should be capitalized standard words ('NASA', 'NATO').",
    "FOUR-DIGIT YEARS: Write calendar years in spoken verbal form ('twenty twenty-six' instead of '2026') to prevent phonetic slurring into '2020'.",
    "DECIMALS & MAGNITUDES: Fully expand monetary values and percentages ('14.8 million dollars', 'one point two five percent').",
    "BREATHING CADENCE: Use commas between independent clauses to give Piper's duration model clear 150ms respiratory boundary resets."
  ],
  examples: [
    {
      raw: "NVIDIA's CEO announced a $14.8M AI initiative for Q3 2026. The SEC pushed the S&P 500 up 1.25%.",
      expanded: "The C-E-O of NVIDIA announced a 14.8 million dollar A-I initiative for the third quarter of twenty twenty-six. The S-E-C pushed the S and P 500 up by one point two five percent.",
      rationale: "Hyphenated letter-by-letter initialisms, fully verbalized year and currency, and ampersand replacement."
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. OmniVoice Directives (Autoregressive Flow / Speech Tokenizer)
// ─────────────────────────────────────────────────────────────────────────────

export const OMNI_SPANISH_DIRECTIVES: EngineDirectivesConfig = {
  engineName: "OmniVoice (k2-fsa)",
  language: "es",
  summary: "Autoregressive neural speech tokenizer conditioned on reference audio latents. Prone to repetition loops on run-on sentences.",
  rules: [
    "CLAUSE LENGTH CEILING: Keep each clause strictly between 8 and 14 words. Autoregressive tokenizers enter hallucination and repetition loops when sentences exceed 16 words without punctuation.",
    "BREATHING PUNCTUATION: Use commas ',' frequently to create rhythmic speech pauses and periods '.' for definitive sentence drops.",
    "FULL NUMBER EXPANSION: All numbers, years, percentages, and currencies MUST be spelled out in complete Spanish words ('dos mil veintiséis', 'tres coma dos por ciento').",
    "PHONETIC ANGLICISMS: Transliterate foreign brand names to Spanish orthography ('Blu Origin', 'Ápel') to prevent token vocabulary fragmentation."
  ],
  examples: [
    {
      raw: "Buenas noches a todos los televidentes que hoy nos acompañan en esta transmisión especial sobre las nuevas tecnologías espaciales que están transformando la industria aeroespacial en el mundo.",
      expanded: "Buenas noches a todos los televidentes. Hoy nos acompañan en una transmisión especial, sobre nuevas tecnologías espaciales, que transforman la industria aeroespacial en todo el mundo.",
      rationale: "Splits a 32-word run-on sentence into three well-paced clauses under 14 words each."
    }
  ]
};

export const OMNI_ENGLISH_DIRECTIVES: EngineDirectivesConfig = {
  engineName: "OmniVoice (k2-fsa)",
  language: "en",
  summary: "Autoregressive neural speech tokenizer. Sensitive to sentence length and token density.",
  rules: [
    "SHORT BROADCAST CLAUSES: Maintain a strict 10 to 14 words per clause limit. Use periods and semicolons to reset the autoregressive speech state.",
    "VERBALIZED SYMBOLS: No symbols ($, %, &, #). Write 'dollars', 'percent', 'and', 'number'.",
    "SPACED INITIALISMS: Separate letter-by-letter acronyms with periods or spaces ('U.S.', 'C.E.O.', 'F.B.I.').",
    "EMPHASIS WITH ELLIPSES: Use '...' for deliberate 350ms pauses before revealing key news items."
  ],
  examples: [
    {
      raw: "Breaking news today as the Federal Reserve unexpectedly cut interest rates by 50 basis points causing markets to surge.",
      expanded: "Breaking news today... The Federal Reserve unexpectedly cut interest rates by fifty basis points, causing markets to surge.",
      rationale: "Injects breathing ellipsis and divides the thought into two balanced acoustic packets."
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. F5-TTS Directives (Flow Matching Diffusion)
// ─────────────────────────────────────────────────────────────────────────────

export const F5_SPANISH_DIRECTIVES: EngineDirectivesConfig = {
  engineName: "F5-TTS (Flow Matching Diffusion)",
  language: "es",
  summary: "Character-level flow matching ODE diffusion. No espeak fallback; completely sensitive to unexpanded symbols and non-Spanish letters.",
  rules: [
    "STRICTLY ALPHABETICAL TEXT: Absolutely ZERO raw digits (0-9) and ZERO symbols ($, %, @, #, &, +). F5-Spanish maps characters directly to speech latents. Unexpanded symbols cause vocal clicks and audio dropouts.",
    "SPANISH PHONETIC TRANSLITERATION: English names and tech terms must be written as Spanish character sequences ('Blú Origin', 'Ápel', 'Gúgol', 'Féisbuk').",
    "PUNCTUATION DRIVES DIFFUSION: Use commas ',' for 150ms micro-breaths, ellipses '...' for 400ms narrative pauses, and periods '.' for complete flow resets. Never use markdown asterisks or brackets.",
    "OPTIMAL LENGTH: 12 to 20 words per sentence. Too short creates truncation; too long causes flow drift."
  ],
  examples: [
    {
      raw: "Apple presentó el nuevo iPhone con un 20% más de batería por $999 USD.",
      expanded: "Ápel presentó el nuevo iPhone, con un veinte por ciento más de batería, por novecientos noventa y nueve dólares.",
      rationale: "Converts symbols and digits to pure Spanish characters and adds micro-breath pauses."
    }
  ]
};

export const F5_ENGLISH_DIRECTIVES: EngineDirectivesConfig = {
  engineName: "F5-TTS (Flow Matching Diffusion)",
  language: "en",
  summary: "Flow matching ODE diffusion with Vocos neural vocoder. Exceptional vocal clone timbre.",
  rules: [
    "NO UNEXPANDED SYMBOLS: Spell out all numbers, currencies, and mathematical symbols ('twenty twenty-six', 'fifteen percent', 'plus').",
    "LIAISON PRECLUSION: When an indefinite article 'a' precedes a proper noun starting with a consonant ('build a Mars orbiter'), rephrase ('build an orbiter for Mars') to prevent fusion into 'Amar's'.",
    "NATURAL DIFFUSION CADENCE: Punctuate with commas and em-dashes to create expressive broadcast rhythm.",
    "NO XML / TAGS: Strip all <pause> or [sfx] directives before diffusion."
  ],
  examples: [
    {
      raw: "NASA awarded Blue Origin a contract to build a Mars communications orbiter.",
      expanded: "NASA awarded Blue Origin a contract, to build an orbiter for communications on Mars.",
      rationale: "Prevents 'a Mars' coarticulation fusion and inserts a natural ODE flow breath."
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. Kokoro-82M Directives (Style-Vocoder KPipeline)
// ─────────────────────────────────────────────────────────────────────────────

export const KOKORO_SPANISH_DIRECTIVES: EngineDirectivesConfig = {
  engineName: "Kokoro-82M (KPipeline)",
  language: "es",
  summary: "Lightweight 82M style-vocoder model. Very fast, natural cadence with strict accent dependence.",
  rules: [
    "RISING QUESTION CONTOUR: In Spanish questions, Kokoro flattens pitch if the sentence ends plainly. Always use inverted question marks '¿...?' and introduce conversational framing ('¿Y a vos, qué te parece?').",
    "MANDATORY ACCENT MARKS: Kokoro's Spanish phonemizer strictly adheres to written accents ('á', 'é', 'í', 'ó', 'ú', 'ñ'). Missing accents cause flat or incorrect lexical stress.",
    "BALANCED CLAUSES: Use commas between prepositional phrases for pristine broadcast rhythm."
  ],
  examples: [
    {
      raw: "Esta noticia es importante. Que te parece?",
      expanded: "Esta noticia es realmente importante. ¿Y a vos, qué te parece?",
      rationale: "Ensures correct accent on 'qué' and provides rising terminal pitch contour."
    }
  ]
};

export const KOKORO_ENGLISH_DIRECTIVES: EngineDirectivesConfig = {
  engineName: "Kokoro-82M (KPipeline)",
  language: "en",
  summary: "High-fidelity style-vocoder model. Superior literary and conversational prosody.",
  rules: [
    "ACRONYM LETTER SPACING: For letter-by-letter acronyms, format with periods or hyphens ('C.E.O.', 'A.I.', 'S.E.C.'). Acronyms pronounced as words remain standard ('NASA', 'NATO').",
    "BROADCAST PROSODY: Use em-dashes '—' for parenthetical thoughts and commas ',' for conversational breathing pauses.",
    "DECIMAL VALUES: Format numbers clearly with words for scale ('14.8 million dollars')."
  ],
  examples: [
    {
      raw: "The CEO of the AI company spoke at NASA today.",
      expanded: "The C.E.O. of the A.I. company spoke at NASA today.",
      rationale: "Ensures initialisms are spelled out letter-by-letter while NASA is pronounced as a word."
    }
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// Master Prompt Directives Registry & Resolution Function
// ─────────────────────────────────────────────────────────────────────────────

const DIRECTIVES_REGISTRY: Record<string, Record<SupportedLanguage, EngineDirectivesConfig>> = {
  piper: {
    es: PIPER_SPANISH_DIRECTIVES,
    en: PIPER_ENGLISH_DIRECTIVES,
  },
  omni: {
    es: OMNI_SPANISH_DIRECTIVES,
    en: OMNI_ENGLISH_DIRECTIVES,
  },
  omnivoice: {
    es: OMNI_SPANISH_DIRECTIVES,
    en: OMNI_ENGLISH_DIRECTIVES,
  },
  f5_tts: {
    es: F5_SPANISH_DIRECTIVES,
    en: F5_ENGLISH_DIRECTIVES,
  },
  f5: {
    es: F5_SPANISH_DIRECTIVES,
    en: F5_ENGLISH_DIRECTIVES,
  },
  kokoro: {
    es: KOKORO_SPANISH_DIRECTIVES,
    en: KOKORO_ENGLISH_DIRECTIVES,
  },
  default: {
    es: PIPER_SPANISH_DIRECTIVES,
    en: PIPER_ENGLISH_DIRECTIVES,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Universal Broadcast Preprocessing Rules (Applies to ALL Engines & Languages)
// ─────────────────────────────────────────────────────────────────────────────

export const UNIVERSAL_BROADCAST_RULES: string[] = [
  "NUMBER & DECIMAL VERBALIZATION: Never write decimals with commas ('7,1', '42,5%'). In Spanish, write 'punto' or spell them out ('siete punto uno', 'cuarenta y dos coma cinco por ciento'). In English, write 'point' ('seven point one', 'five point two five percent'). Neural frontends treat raw commas as prosodic clause breaks, which splits numbers in half and slurs the decimal into succeeding verbs.",
  "SYMBOL & CURRENCY ELIMINATION: Never pass raw symbols ($, %, &, #, @, +). Always verbalize currencies after the amount ('3.5 billones de dólares', '14.8 million dollars') and write 'por ciento' / 'percent' instead of '%'.",
  "FINANCIAL INDICES & TICKERS: Prepend an institutional category noun and verbalize conjunctions. Write 'el índice S and P quinientos' instead of raw 'S&P 500', and 'the S and P 500 index' in English. This prevents models from slurring into 'SMP' or 'Pequimientos'.",
  "ACRONYM TAXONOMY: Distinguish word-acronyms from letter-initialisms. Acronyms pronounced as single words must remain standard capitalized words ('NASA', 'UNESCO', 'FIFA', 'OPEP'). Initialisms pronounced letter-by-letter must be hyphenated or spaced ('M-I-T', 'C-E-O', 'A-I', 'S-E-C', 'B-C-R-A', 'F-M-I').",
  "ANCHORED ONSET SALUTATIONS: Avoid single-word exclamation openings ('¡Atención!', '¡Urgente!') which suffer from zero-onset neural attack truncation ('Atención' -> 'Tensión'). Always anchor broadcast alerts with a multi-word carrier phrase ('Noticia de último momento: ...', '¡Buenas noches a todos nuestros espectadores!').",
  "DIRECT QUOTE ELIMINATION: Never wrap speech in raw quotation marks ('...' or \"...\"). Convert direct quotes into indirect attribution ('stated that the minister will not...' / 'afirmó que no habrá...') or set them off with conversational em-dashes '— ... —' to provide 200ms respiratory resets.",
  "FOREIGN PROPER NOUN FRAMING: In Spanish text, anchor foreign brand names and tech companies by prepending category nouns ('la empresa Apple', 'la compañía NVIDIA', 'la firma Blue Origin', 'el distrito de Wall Street'). This creates clean acoustic word boundaries and eliminates vowel-consonant boundary mangling.",
  "RESPIRATORY CLAUSE PACING: Keep clauses strictly between 8 and 16 words, punctuated by commas ',' for 150ms micro-breaths and periods '.' for definitive sentence drops."
];

/**
 * Resolves the structured system prompt instructions for an LLM generating or expanding
 * news script text for a specific audio model and language.
 */
export function getModelPromptDirectives(
  engine: TtsEngineId | string = "default",
  language: string = "es"
): EngineDirectivesConfig {
  const normEngine = (engine || "default").toLowerCase().trim();
  const langKey: SupportedLanguage = language.toLowerCase().startsWith("en") ? "en" : "es";

  const engineGroup = DIRECTIVES_REGISTRY[normEngine] || DIRECTIVES_REGISTRY.default;
  return engineGroup[langKey];
}

/**
 * Formats the engine directives into a ready-to-inject LLM system prompt block.
 */
export function getPromptSystemInstruction(
  engine: TtsEngineId | string = "default",
  language: string = "es"
): string {
  const config = getModelPromptDirectives(engine, language);

  const universalList = UNIVERSAL_BROADCAST_RULES.map((r, idx) => `U${idx + 1}. ${r}`).join("\n");
  const rulesList = config.rules.map((r, idx) => `M${idx + 1}. ${r}`).join("\n");
  const examplesList = config.examples
    .map(
      (ex, idx) =>
        `Example ${idx + 1}:\n- Raw Text: "${ex.raw}"\n- Preprocessed/Expanded Script: "${ex.expanded}"\n- Rationale: ${ex.rationale}`
    )
    .join("\n\n");

  return `### TARGET AUDIO ENGINE PREPROCESSING DIRECTIVES: [${config.engineName} - Language: ${config.language.toUpperCase()}]
${config.summary}

PART 1 — UNIVERSAL BROADCAST SCRIPT RULES (MANDATORY ACROSS ALL ENGINES & LANGUAGES):
${universalList}

PART 2 — ENGINE-SPECIFIC ACOUSTIC & PHONETIC DIRECTIVES:
${rulesList}

PART 3 — EMPIRICALLY VALIDATED EXAMPLES:
${examplesList}

You MUST output the script text already adhering to these rules so the resulting speech audio sounds perfectly natural without requiring downstream manual correction.`;
}

/**
 * Constructs prompt instructions for an LLM to normalize visual subtitle text into spoken audio script.
 */
export function buildSingleSegmentNormalizationPrompt(
  text: string,
  engine: TtsEngineId | string = "default",
  language: string = "es"
): { systemInstruction: string; userPrompt: string } {
  const systemInstruction = `You are an expert broadcast audio engineer and phonetic linguist specializing in neural Text-to-Speech (TTS) optimization.
Your task is to take a visual subtitle / display text and produce the acoustic, phonetically expanded spoken script strictly adhering to target engine rules.

${getPromptSystemInstruction(engine, language)}

CRITICAL OUTPUT INSTRUCTIONS:
- You must return ONLY the normalized spoken text string for speech synthesis.
- Do NOT output commentary, explanations, markdown fences, or quotes.
- Return ONLY the clean, perfected spoken string.`;

  const userPrompt = `Transform this visual subtitle text into the optimized spoken text for ${engine} (${language}):\n\n"${text}"`;

  return { systemInstruction, userPrompt };
}


