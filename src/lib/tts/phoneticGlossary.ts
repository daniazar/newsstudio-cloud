/**
 * NewsStudio — Custom Phonetic Glossaries & Text Normalization Suite
 * 
 * Provides phonetic transformations, financial ticker expansions, currency & number
 * normalizations, and Argentine Spanish Rioplatense Yeísmo rehilado (ll/y -> sh) mapping.
 */

export interface NormalizationOptions {
  language?: string; // "es" | "en" | "es-AR" etc.
  engine?: string; // "piper" | "f5_tts" | "styletts2" | "cosyvoice_3" | "xtts_v2" | "default"
  applyYeismo?: boolean; // Enable Argentine Rioplatense 'll/y' -> 'sh' conversion
  expandFinancials?: boolean; // Expand tickers & acronyms (BTC, YPF, FED, Q3, etc.)
  expandCurrencies?: boolean; // Expand $10.5M, ARS, USD, percentages, numbers
  customGlossary?: Record<string, string>;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Number-to-Words Helper (Spanish & English)
// ─────────────────────────────────────────────────────────────────────────────

const SPANISH_UNITS: Record<number, string> = {
  0: "cero",
  1: "un",
  2: "dos",
  3: "tres",
  4: "cuatro",
  5: "cinco",
  6: "seis",
  7: "siete",
  8: "ocho",
  9: "nueve",
  10: "diez",
  11: "once",
  12: "doce",
  13: "trece",
  14: "catorce",
  15: "quince",
  16: "dieciséis",
  17: "diecisiete",
  18: "dieciocho",
  19: "diecinueve",
  20: "veinte",
  21: "veintiuno",
  22: "veintidós",
  23: "veintitrés",
  24: "veinticuatro",
  25: "veinticinco",
  26: "veintiséis",
  27: "veintisiete",
  28: "veintiocho",
  29: "veintinueve",
  30: "treinta",
  40: "cuarenta",
  50: "cincuenta",
  60: "sesenta",
  70: "setenta",
  80: "ochenta",
  90: "noventa",
  100: "cien",
};

const SPANISH_HUNDREDS: Record<number, string> = {
  100: "ciento",
  200: "doscientos",
  300: "trescientos",
  400: "cuatrocientos",
  500: "quinientos",
  600: "seiscientos",
  700: "setecientos",
  800: "ochocientos",
  900: "novecientos",
};

const ENGLISH_UNITS: Record<number, string> = {
  0: "zero",
  1: "one",
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
  7: "seven",
  8: "eight",
  9: "nine",
  10: "ten",
  11: "eleven",
  12: "twelve",
  13: "thirteen",
  14: "fourteen",
  15: "fifteen",
  16: "sixteen",
  17: "seventeen",
  18: "eighteen",
  19: "nineteen",
  20: "twenty",
  30: "thirty",
  40: "forty",
  50: "fifty",
  60: "sixty",
  70: "seventy",
  80: "eighty",
  90: "ninety",
};

export function integerToWordsSpanish(n: number): string {
  if (n < 0) return `menos ${integerToWordsSpanish(-n)}`;
  if (n === 0) return "cero";
  if (n === 100) return "cien";
  if (n in SPANISH_UNITS) {
    const val = SPANISH_UNITS[n];
    return n === 1 ? "uno" : val;
  }

  if (n < 100) {
    const tens = Math.floor(n / 10) * 10;
    const units = n % 10;
    return `${SPANISH_UNITS[tens]} y ${SPANISH_UNITS[units] === "un" ? "uno" : SPANISH_UNITS[units]}`;
  }

  if (n < 1000) {
    const hundreds = Math.floor(n / 100) * 100;
    const remainder = n % 100;
    const hundredsWord = SPANISH_HUNDREDS[hundreds] || `${SPANISH_UNITS[Math.floor(n / 100)]}cientos`;
    if (remainder === 0) return hundredsWord;
    return `${hundredsWord} ${integerToWordsSpanish(remainder)}`;
  }

  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    const thousandsWord = thousands === 1 ? "mil" : `${integerToWordsSpanish(thousands)} mil`;
    if (remainder === 0) return thousandsWord;
    return `${thousandsWord} ${integerToWordsSpanish(remainder)}`;
  }

  if (n < 1000000000) {
    const millions = Math.floor(n / 1000000);
    const remainder = n % 1000000;
    const millionsWord = millions === 1 ? "un millón" : `${integerToWordsSpanish(millions)} millones`;
    if (remainder === 0) return millionsWord;
    return `${millionsWord} ${integerToWordsSpanish(remainder)}`;
  }

  const billions = Math.floor(n / 1000000000);
  const remainder = n % 1000000000;
  const billionsWord = billions === 1 ? "mil millones" : `${integerToWordsSpanish(billions)} mil millones`;
  if (remainder === 0) return billionsWord;
  return `${billionsWord} ${integerToWordsSpanish(remainder)}`;
}

export function integerToWordsEnglish(n: number): string {
  if (n < 0) return `minus ${integerToWordsEnglish(-n)}`;
  if (n in ENGLISH_UNITS) return ENGLISH_UNITS[n];

  if (n < 100) {
    const tens = Math.floor(n / 10) * 10;
    const units = n % 10;
    return `${ENGLISH_UNITS[tens]}-${ENGLISH_UNITS[units]}`;
  }

  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    if (remainder === 0) return `${ENGLISH_UNITS[hundreds]} hundred`;
    return `${ENGLISH_UNITS[hundreds]} hundred ${integerToWordsEnglish(remainder)}`;
  }

  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    const remainder = n % 1000;
    if (remainder === 0) return `${integerToWordsEnglish(thousands)} thousand`;
    return `${integerToWordsEnglish(thousands)} thousand ${integerToWordsEnglish(remainder)}`;
  }

  if (n < 1000000000) {
    const millions = Math.floor(n / 1000000);
    const remainder = n % 1000000;
    if (remainder === 0) return `${integerToWordsEnglish(millions)} million`;
    return `${integerToWordsEnglish(millions)} million ${integerToWordsEnglish(remainder)}`;
  }

  const billions = Math.floor(n / 1000000000);
  const remainder = n % 1000000000;
  if (remainder === 0) return `${integerToWordsEnglish(billions)} billion`;
  return `${integerToWordsEnglish(billions)} billion ${integerToWordsEnglish(remainder)}`;
}

export function numberStringToWords(numStr: string, lang = "es"): string {
  const isSpanish = lang.startsWith("es");
  const normalized = numStr.replace(",", ".");
  const parts = normalized.split(".");

  const intVal = parseInt(parts[0], 10);
  if (isNaN(intVal)) return numStr;

  const intWords = isSpanish ? integerToWordsSpanish(intVal) : integerToWordsEnglish(intVal);

  if (parts.length > 1 && parts[1]) {
    const decDigits = parts[1].split("");
    const decWords = isSpanish
      ? decDigits.map((d) => SPANISH_UNITS[parseInt(d, 10)] || d).join(" ")
      : decDigits.map((d) => ENGLISH_UNITS[parseInt(d, 10)] || d).join(" ");
    const decimalPointWord = isSpanish ? "punto" : "point";
    return `${intWords} ${decimalPointWord} ${decWords}`;
  }

  return intWords;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Argentine Spanish Rioplatense Yeísmo Rehilado (ll/y -> sh)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transforms standard Spanish orthography to phonetic Argentine Rioplatense
 * Yeísmo Rehilado representation (/ʃ/ -> 'sh').
 * 
 * Rules:
 * - 'll' (before/after vowels or word-initially) -> 'sh' (e.g. "llamo" -> "shamo", "calle" -> "cashe")
 * - 'y' when followed by a vowel -> 'sh' (e.g. "yo" -> "sho", "ayer" -> "asher", "playa" -> "plasha")
 * - Case preservation: "Yo" -> "Sho", "YO" -> "SHO", "lluvia" -> "shuvia"
 * - Standalone conjunction "y" (e.g. "pan y queso") is PRESERVED as "y" (/i/)
 * - Diphthongs at word ends ("hoy", "muy", "rey", "ley", "Paraguay", "Uruguay") PRESERVED as "y"
 */
export function applyRioplatenseYeismo(text: string): string {
  if (!text) return "";

  let result = text;

  // 1. Convert 'll' / 'LL' / 'Ll' in words
  result = result.replace(/\bLL([A-ZÁÉÍÓÚÑ]+)/g, "SH$1");
  result = result.replace(/([A-ZÁÉÍÓÚÑ]+)LL([A-ZÁÉÍÓÚÑ]+)/g, "$1SH$2");
  result = result.replace(/([A-ZÁÉÍÓÚÑ]+)LL\b/g, "$1SH");
  result = result.replace(/\bLl([a-záéíóúñ]+)/g, "Sh$1");
  result = result.replace(/\bLL\b/g, "SH");
  result = result.replace(/\bll\b/g, "sh");
  result = result.replace(/ll/g, "sh");
  result = result.replace(/LL/g, "SH");
  result = result.replace(/Ll/g, "Sh");

  // 2. Convert 'y' followed by vowel (ya, ye, yi, yo, yu, yá, yé, yí, yó, yú)
  // Word start uppercase (e.g. YO -> SHO, YA -> SHA, YPF -> preserved because P is consonant)
  result = result.replace(/\bY([AEIOUÁÉÍÓÚ])([A-ZÁÉÍÓÚÑ]*)\b/g, "SH$1$2");
  result = result.replace(/\bY([AEIOUÁÉÍÓÚ])([A-ZÁÉÍÓÚÑ]+)/g, "SH$1$2");
  result = result.replace(/\bY([aeiouáéíóú])/g, "Sh$1");
  result = result.replace(/\by([aeiouáéíóú])/g, "sh$1");

  // Word middle: e.g. playa -> plasha, ayer -> asher, Ayer -> Asher, leyes -> leshes, proyecto -> proshecto, ayuda -> ashuda
  result = result.replace(/([A-ZÁÉÍÓÚÑ])Y([AEIOUÁÉÍÓÚ])/g, "$1SH$2");
  result = result.replace(/([A-ZÁÉÍÓÚÑ])y([aeiouáéíóú])/g, "$1sh$2");
  result = result.replace(/([a-záéíóúñ])y([aeiouáéíóú])/g, "$1sh$2");
  result = result.replace(/([a-záéíóúñ])Y([aeiouáéíóú])/g, "$1Sh$2");

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Financial Acronyms & Tickers Normalization
// ─────────────────────────────────────────────────────────────────────────────

export const FINANCIAL_GLOSSARY_ES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  USDT: "Tether",
  YPF: "I-P-F",
  FED: "Reserva Federal",
  BCRA: "Banco Central",
  PBI: "P-B-I",
  PIB: "P-I-B",
  AFIP: "Afip",
  ARCA: "Arca",
  MERVAL: "Merval",
  NASDAQ: "Nasdaq",
  NYSE: "Bolsa de Nueva York",
  "S&P 500": "S y P quinientos",
  "S&P500": "S y P quinientos",
  SP500: "S y P quinientos",
  FMI: "Fondo Monetario Internacional",
  SEC: "S-E-C",
  IPO: "oferta pública inicial",
  Q1: "primer trimestre",
  Q2: "segundo trimestre",
  Q3: "tercer trimestre",
  Q4: "cuarto trimestre",
  "1T": "primer trimestre",
  "2T": "segundo trimestre",
  "3T": "tercer trimestre",
  "4T": "cuarto trimestre",
  CEO: "C-E-O",
  CFO: "C-F-O",
  CTO: "C-T-O",
  IA: "Inteligencia Artificial",
  AI: "Inteligencia Artificial",
  IVA: "I-V-A",
  ANSES: "Ánses",
  PAMI: "Pami",
  CONICET: "Conicet",
  UBA: "U-B-A",
  CABA: "Ciudad de Buenos Aires",
  AMBA: "Área Metropolitana de Buenos Aires",
};

export const FINANCIAL_GLOSSARY_EN: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  USDT: "Tether",
  FED: "Federal Reserve",
  GDP: "G-D-P",
  CPI: "C-P-I",
  SEC: "S-E-C",
  NASDAQ: "Nasdaq",
  NYSE: "New York Stock Exchange",
  "S&P 500": "S and P 500",
  "S&P500": "S and P 500",
  SP500: "S and P 500",
  IMF: "International Monetary Fund",
  IPO: "I-P-O",
  Q1: "first quarter",
  Q2: "second quarter",
  Q3: "third quarter",
  Q4: "fourth quarter",
  CEO: "C-E-O",
  CFO: "C-F-O",
  CTO: "C-T-O",
  AI: "A-I",
  FOMC: "F-O-M-C",
  ECB: "European Central Bank",
};

export function normalizeFinancialAcronyms(text: string, lang = "es"): string {
  if (!text) return "";

  const isSpanish = lang.startsWith("es");
  const dict = isSpanish ? FINANCIAL_GLOSSARY_ES : FINANCIAL_GLOSSARY_EN;
  let result = text;

  // Multi-word / special symbol replacements first (e.g. S&P 500)
  const specialKeys = ["S&P 500", "S&P500", "SP500"];
  for (const k of specialKeys) {
    if (dict[k]) {
      const reg = new RegExp(k.replace("&", "\\&"), "g");
      result = result.replace(reg, dict[k]);
    }
  }

  // Word-boundary replacements
  for (const [acronym, replacement] of Object.entries(dict)) {
    if (specialKeys.includes(acronym)) continue;
    const regex = new RegExp(`\\b${acronym}\\b`, "g");
    result = result.replace(regex, replacement);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Currency and Number Normalization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes currency expressions ($10.5M, $100k, $50, USD 10M, ARS 500, €10M, £5M)
 * and percentages (10.5%, 25%) into spoken natural language.
 */
export function normalizeCurrenciesAndNumbers(text: string, lang = "es"): string {
  if (!text) return "";

  const isSpanish = lang.startsWith("es");
  let result = text;

  if (isSpanish) {
    // $10.5B / $ 10.5 B -> diez punto cinco mil millones de dólares
    result = result.replace(/\$\s*(\d+(?:[.,]\d+)?)\s*B\b/gi, (_, val) => {
      const words = numberStringToWords(val, "es");
      return `${words} mil millones de dólares`;
    });

    // $10.5M / $ 10.5 M -> diez punto cinco millones de dólares
    result = result.replace(/\$\s*(\d+(?:[.,]\d+)?)\s*M\b/g, (_, val) => {
      const words = numberStringToWords(val, "es");
      return `${words} millones de dólares`;
    });

    // $10.5k / $10.5K / $ 10k -> diez punto cinco mil dólares
    result = result.replace(/\$\s*(\d+(?:[.,]\d+)?)\s*k\b/gi, (_, val) => {
      const words = numberStringToWords(val, "es");
      return `${words} mil dólares`;
    });

    // USD 10.5M / USD 10M
    result = result.replace(/USD\s*(\d+(?:[.,]\d+)?)\s*M\b/gi, (_, val) => {
      const words = numberStringToWords(val, "es");
      return `${words} millones de dólares estadounidenses`;
    });

    // USD 100
    result = result.replace(/USD\s*(\d+(?:[.,]\d+)?)\b/gi, (_, val) => {
      const words = numberStringToWords(val, "es");
      return `${words} dólares estadounidenses`;
    });

    // ARS 10.5M / ARS 100
    result = result.replace(/ARS\s*(\d+(?:[.,]\d+)?)\s*M\b/gi, (_, val) => {
      const words = numberStringToWords(val, "es");
      return `${words} millones de pesos argentinos`;
    });
    result = result.replace(/ARS\s*(\d+(?:[.,]\d+)?)\b/gi, (_, val) => {
      const words = numberStringToWords(val, "es");
      return `${words} pesos argentinos`;
    });

    // €10.5M / €100
    result = result.replace(/€\s*(\d+(?:[.,]\d+)?)\s*M\b/g, (_, val) => {
      const words = numberStringToWords(val, "es");
      return `${words} millones de euros`;
    });
    result = result.replace(/€\s*(\d+(?:[.,]\d+)?)\b/g, (_, val) => {
      const words = numberStringToWords(val, "es");
      return `${words} euros`;
    });

    // £10.5M / £100
    result = result.replace(/£\s*(\d+(?:[.,]\d+)?)\s*M\b/g, (_, val) => {
      const words = numberStringToWords(val, "es");
      return `${words} millones de libras esterlinas`;
    });
    result = result.replace(/£\s*(\d+(?:[.,]\d+)?)\b/g, (_, val) => {
      const words = numberStringToWords(val, "es");
      return `${words} libras esterlinas`;
    });

    // Plain dollar values ($100, $ 50.5)
    result = result.replace(/\$\s*(\d+(?:[.,]\d+)?)\b/g, (_, val) => {
      const words = numberStringToWords(val, "es");
      return `${words} dólares`;
    });

    // Percentages (10.5%, 50%)
    result = result.replace(/(\d+(?:[.,]\d+)?)\s*%/g, (_, val) => {
      const words = numberStringToWords(val, "es");
      return `${words} por ciento`;
    });
  } else {
    // English currency normalization

    // $10.5B -> ten point five billion dollars
    result = result.replace(/\$\s*(\d+(?:[.,]\d+)?)\s*B\b/gi, (_, val) => {
      const words = numberStringToWords(val, "en");
      return `${words} billion dollars`;
    });

    // $10.5M -> ten point five million dollars
    result = result.replace(/\$\s*(\d+(?:[.,]\d+)?)\s*M\b/g, (_, val) => {
      const words = numberStringToWords(val, "en");
      return `${words} million dollars`;
    });

    // $10.5k / $10k -> ten point five thousand dollars
    result = result.replace(/\$\s*(\d+(?:[.,]\d+)?)\s*k\b/gi, (_, val) => {
      const words = numberStringToWords(val, "en");
      return `${words} thousand dollars`;
    });

    // USD 10.5M
    result = result.replace(/USD\s*(\d+(?:[.,]\d+)?)\s*M\b/gi, (_, val) => {
      const words = numberStringToWords(val, "en");
      return `${words} million US dollars`;
    });
    result = result.replace(/USD\s*(\d+(?:[.,]\d+)?)\b/gi, (_, val) => {
      const words = numberStringToWords(val, "en");
      return `${words} US dollars`;
    });

    // €10.5M
    result = result.replace(/€\s*(\d+(?:[.,]\d+)?)\s*M\b/g, (_, val) => {
      const words = numberStringToWords(val, "en");
      return `${words} million euros`;
    });
    result = result.replace(/€\s*(\d+(?:[.,]\d+)?)\b/g, (_, val) => {
      const words = numberStringToWords(val, "en");
      return `${words} euros`;
    });

    // £10.5M
    result = result.replace(/£\s*(\d+(?:[.,]\d+)?)\s*M\b/g, (_, val) => {
      const words = numberStringToWords(val, "en");
      return `${words} million pounds`;
    });
    result = result.replace(/£\s*(\d+(?:[.,]\d+)?)\b/g, (_, val) => {
      const words = numberStringToWords(val, "en");
      return `${words} pounds`;
    });

    // Plain dollar values ($100, $ 50.5)
    result = result.replace(/\$\s*(\d+(?:[.,]\d+)?)\b/g, (_, val) => {
      const words = numberStringToWords(val, "en");
      return `${words} dollars`;
    });

    // Percentages (10.5%, 50%)
    result = result.replace(/(\d+(?:[.,]\d+)?)\s*%/g, (_, val) => {
      const words = numberStringToWords(val, "en");
      return `${words} percent`;
    });
  }

  return result;
}

/**
 * Normalizes broadcast cadence, vocatives, and syllable boundaries for Spanish neural anchors (Piper, Modern-TTS).
 */
export function normalizeBroadcastCadenceSpanish(text: string): string {
  if (!text) return "";
  let norm = text;

  // 1. Salutation energy & pitch assertion
  norm = norm.replace(
    /^(?:¡)?(Buenas\s+(?:noches|tardes)|Buenos\s+días),\s*(queridos?|estimados?)\s+(especta(?:-?dores|-?doras|-?dor|-?dora)|oyentes|televidentes)(?:\.|\!)?/i,
    "¡$1, $2, $3!"
  );

  // 2. Fix misplaced typographic accents on technical oxytones ending in -dor/-dora/-dores
  norm = norm.replace(/(?<=^|[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ])([Óó])(rbitad(?:or|ora|ores|oras)(?![a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]))/g, (_, o, rest) => (o === "Ó" ? "O" : "o") + rest);

  // 3. Prevent liaison blur between plural noun endings and preposition 'en' before proper noun
  norm = norm.replace(/\b(comunicaciones)\s+en\s+([A-ZÁÉÍÓÚ][a-záéíóúñ]+)\b/g, "$1, en $2");

  // 4. Decouple vowel hiatus before copula 'es' when following noun phrase
  norm = norm.replace(/\b([a-záéíóúñ]+(?:ia|io|ad|ón))\s+(es\s+(?:realmente|muy|tan|sumamente|extremadamente))\b/gi, "$1, $2");

  // 5. Clean duplicate commas
  norm = norm.replace(/,\s*,+/g, ",");

  return norm;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Master Speech Text Normalizer Pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes speech text before passing to TTS engines:
 * 1. Expands currencies and numbers ($10.5M -> diez punto cinco millones de dólares)
 * 2. Expands financial tickers & acronyms (BTC -> Bitcoin, FED, YPF, Q3)
 * 3. Applies custom phonetic glossaries
 * 4. (Optional) Applies Spanish broadcast cadence and syllable coarticulation fixes
 * 5. (Optional) Applies Argentine Rioplatense yeísmo rehilado (ll/y -> sh)
 */
export function normalizeTextForSpeech(text: string, options: NormalizationOptions = {}): string {
  if (!text || typeof text !== "string") return "";

  const lang = options.language || "es";
  let normalized = text.trim();

  // 1. Currency & Number normalization
  if (options.expandCurrencies !== false) {
    normalized = normalizeCurrenciesAndNumbers(normalized, lang);
  }

  // 2. Financial acronyms & tickers
  if (options.expandFinancials !== false) {
    normalized = normalizeFinancialAcronyms(normalized, lang);
  }

  // 3. Custom Glossary overrides
  if (options.customGlossary) {
    for (const [target, replacement] of Object.entries(options.customGlossary)) {
      const regex = new RegExp(`\\b${target}\\b`, "g");
      normalized = normalized.replace(regex, replacement);
    }
  }

  // 4. Spanish Broadcast Cadence & Coarticulation Decoupling
  if (lang.startsWith("es")) {
    normalized = normalizeBroadcastCadenceSpanish(normalized);
  }

  // 5. Argentine Spanish Rioplatense Yeísmo
  if (options.applyYeismo && lang.startsWith("es")) {
    normalized = applyRioplatenseYeismo(normalized);
  }

  // Clean extra spaces
  normalized = normalized.replace(/\s+/g, " ").trim();

  return normalized;
}
