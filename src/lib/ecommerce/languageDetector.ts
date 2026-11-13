/**
 * src/lib/ecommerce/languageDetector.ts
 *
 * Intelligent Language & Locale Detection Engine for E-Commerce Products & Ad Prompts.
 *
 * Multi-Tier Architecture:
 * 1. Explicit metadata (ProductSpec.language / inLanguage)
 * 2. High-confidence diacritics & punctuation markers (á, é, í, ó, ú, ñ, ¿, ¡ vs ã, õ, ç)
 * 3. US proper noun exclusion (e.g. "Los Angeles", "Del Mar", "La Jolla", "El Paso")
 * 4. Dual-corpus lexical & commercial stopword frequency analysis (Spanish, English, Portuguese)
 * 5. Regional TLD & currency signals (ARS, CLP, COP, MXN, PEN, UYU, BRL, USD, EUR, GBP)
 * 6. Regional dialect classification (Argentine Rioplatense voseo vs Castilian vs Latam neutral)
 */

import { ProductSpec } from "@/lib/types/ecommerce";

export type SupportedLanguage = "es" | "en" | "pt" | "fr" | "de" | "ja";

export interface DetectedLanguageResult {
  language: SupportedLanguage;
  locale: string;             // e.g. "es-AR", "es-ES", "es-MX", "en-US", "pt-BR"
  isSpanish: boolean;
  isArgentine: boolean;
  countryName: string;
  voiceModelSuggestion: string;
  defaultCtaText: string;
  confidence?: number;        // Normalized score [0.0 - 1.0]
  detectedBy?: "universal_engine" | "mediapipe" | "metadata";
}

// Common Spanish words in general and e-commerce contexts
const SPANISH_COMMERCIAL_WORDS = new Set([
  // Function words, pronouns, and prepositions
  "de", "del", "la", "las", "el", "los", "en", "para", "por", "con", "sin", "al", "y", "o", "que",
  "un", "una", "unos", "unas", "su", "sus", "tu", "tus", "este", "esta", "estos", "estas", "esto",
  "pero", "como", "donde", "cuando", "mas", "más", "menos", "aqui", "aquí", "aca", "acá", "hoy", "ahora",
  // Common verbs & imperatives
  "es", "son", "tiene", "tienen", "tenes", "tenés", "hace", "hacé", "hacen", "hacer", "hacemos",
  "compra", "comprá", "comprar", "elegi", "elegí", "elegir", "lleva", "llevá", "llevar",
  "descubri", "descubrí", "descubrir", "encontra", "encontrá", "encontrar", "mira", "mirá", "mirar",
  "podes", "podés", "puede", "pueden", "somos", "incluye", "incluyen", "permite", "funciona", "usar",
  "transforma", "transformá", "renova", "renová", "combina", "combiná", "disfruta", "disfrutá",
  // Apparel & Footwear
  "zapatillas", "zapatilla", "remera", "remeras", "camisa", "camisas", "pantalon", "pantalones",
  "buzo", "buzos", "campera", "camperas", "vestido", "vestidos", "calzado", "ropa", "indumentaria",
  "gorra", "gorro", "talle", "talles", "cuello", "manga", "mangas", "bolsillo", "bolsillos",
  // Furniture, Home & Decor
  "sillon", "sillón", "sillones", "sofa", "sofá", "mesa", "mesas", "silla", "sillas", "mueble", "muebles",
  "madera", "hierro", "acero", "cuero", "algodon", "algodón", "lino", "vidrio", "plastico", "plástico",
  "hogar", "cocina", "baño", "dormitorio", "comedor", "living", "patio", "jardin", "jardín",
  "lampara", "lámpara", "luces", "luz", "colgante", "filamento", "decoracion", "decoración",
  "espacios", "pared", "paredes", "piso", "pisos", "revestimiento", "porcelanato", "ceramica", "cerámica",
  // Commercial terms & Descriptors
  "cuotas", "cuota", "envio", "envío", "gratis", "descuento", "oferta", "precio", "promocion", "promoción",
  "tienda", "garantia", "garantía", "calidad", "elegancia", "nuevo", "nueva", "nuevos", "nuevas",
  "moderno", "moderna", "rustico", "rústico", "escandinavo", "urbana", "urbano", "termico", "térmico",
  "inoxidable", "frio", "frío", "calor", "digital", "sumergible", "deportivo", "deportiva",
  "deportivos", "deportivas", "artesanal", "damasco", "ciervo", "tapizado", "cuerpos", "largas",
  "cortas", "italiano", "estampada", "porta", "notebook", "impermeable", "antideslizante",
  "inalambrico", "inalámbrico", "auriculares", "reloj", "bolso", "mochila", "billetera", "cartera",
  "funda", "soporte", "cargador", "bateria", "batería", "pantalla", "camara", "cámara", "alto", "ancho",
  "profundidad", "largo", "peso", "acabado", "terminacion", "terminación", "resistencia", "resistente",
  "producto", "unidad", "unidades", "caja", "cajas", "medidas", "marca", "modelo"
]);

// Common English words in general and e-commerce contexts
const ENGLISH_COMMERCIAL_WORDS = new Set([
  // Function words, pronouns, and prepositions
  "the", "a", "an", "and", "or", "of", "to", "in", "for", "with", "on", "at", "from", "by",
  "about", "as", "into", "like", "through", "after", "over", "between", "out", "against",
  "during", "without", "before", "under", "around", "among", "this", "that", "these", "those",
  "your", "our", "its", "their", "my", "more", "less", "here", "there", "today", "now",
  // Common verbs
  "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did",
  "get", "got", "make", "made", "find", "buy", "shop", "discover", "choose", "upgrade",
  "transform", "enjoy", "elevate", "experience", "includes", "features", "designed", "crafted",
  "engineered", "delivers", "provides", "delivering", "speaking", "crafted", "built",
  // Apparel & Footwear
  "shoes", "sneakers", "shirt", "shirts", "t-shirt", "pants", "hoodie", "jacket", "dress",
  "clothing", "apparel", "wear", "hat", "cap", "baseball", "size", "sizes", "sleeve", "sleeves",
  // Furniture, Home & Decor
  "sofa", "couch", "table", "chair", "furniture", "wood", "iron", "steel", "leather", "cotton",
  "linen", "glass", "plastic", "hardwood", "flooring", "interiors", "home", "kitchen", "bathroom",
  "bedroom", "living", "dining", "room", "decor", "spaces", "light", "lamp", "wall", "floor", "tile",
  // Commercial terms & Descriptors
  "shipping", "free", "discount", "sale", "price", "deal", "store", "purchase", "warranty", "guarantee",
  "quality", "elegance", "new", "modern", "sleek", "durable", "premium", "luxury", "classic",
  "portable", "best", "top", "black", "white", "blue", "red", "grey", "gray", "green", "yellow",
  "gold", "silver", "finish", "resistant", "waterproof", "non-slip", "wireless", "earbuds",
  "headphones", "watch", "bag", "backpack", "wallet", "case", "stand", "charger", "battery",
  "screen", "display", "camera", "brand", "product", "pack", "box", "dimensions", "height", "width",
  "depth", "length", "weight"
]);

const PORTUGUESE_COMMERCIAL_WORDS = new Set([
  "para", "com", "sem", "não", "uma", "frete", "parcelas", "revestimento",
  "qualidade", "compre", "pronta", "entrega", "produto", "madeira",
  "voce", "você", "gratis", "grátis", "desconto", "brasil", "entrega"
]);

// Recognizes prominent American/English geographical names that contain Spanish loan words ("Los", "El", "La", "Del", "San")
const US_PROPER_NAMES_REGEX =
  /\b(los angeles|las vegas|san francisco|san diego|del mar|el paso|la jolla|santa monica|miami|new york)\b/i;

// Argentine Rioplatense voseo vocabulary markers
const ARGENTINE_VOSEO_REGEX =
  /\b(vos|tenés|hacé|probá|llevá|mirá|comprá|elegí|descubrí|encontrá|podés|remera|remeras|buzo|buzos|campera|camperas|pileta|departamento|auto|quilombo|porcelanato|acá)\b/i;

// Castilian European Spanish markers
const CASTILIAN_REGEX =
  /\b(tú|tienes|haz|prueba|compra|vosotros|ordenador|móvil|coche|piso|chapa|gafas)\b/i;

/**
 * High-accuracy universal language detection on plain text strings.
 * Accurately detects "Spanish" vs "English" without requiring browser globals or WebAssembly.
 */
export function detectLanguage(text?: string | null): "Spanish" | "English" {
  if (!text || typeof text !== "string") return "English";
  const trimmed = text.trim();
  if (!trimmed) return "English";

  // 1. Spanish-specific diacritics & inverted punctuation
  if (/[áéíóúüñ¿¡]/i.test(trimmed)) {
    return "Spanish";
  }

  // 2. Protect US Proper Nouns (e.g. "Los Angeles Dodgers Baseball Cap")
  const hasUsProperName = US_PROPER_NAMES_REGEX.test(trimmed);

  // 3. Tokenize and perform dual-corpus lexical scoring
  const clean = trimmed.toLowerCase().replace(/[^a-z0-9áéíóúüñ]/g, " ");
  const tokens = clean.split(/\s+/).filter(Boolean);

  let spanishScore = 0;
  let englishScore = 0;

  for (const token of tokens) {
    if (SPANISH_COMMERCIAL_WORDS.has(token)) spanishScore++;
    if (ENGLISH_COMMERCIAL_WORDS.has(token)) englishScore++;
  }

  // If US proper name matched (e.g. "Los Angeles"), reduce spurious Spanish credit
  if (hasUsProperName && spanishScore <= 1) {
    return "English";
  }

  if (spanishScore > englishScore) {
    return "Spanish";
  }

  if (englishScore > spanishScore) {
    return "English";
  }

  // Single word boundary check if tied and non-empty
  if (spanishScore > 0 && englishScore === 0) {
    return "Spanish";
  }

  return "English";
}

/**
 * Returns ISO code "es", "en", or "pt" for text.
 */
export function detectTextLanguage(text?: string | null): SupportedLanguage {
  if (!text || typeof text !== "string") return "en";
  const trimmed = text.trim();
  if (!trimmed) return "en";

  // Portuguese diacritics
  if (/[ãõçêôà]/i.test(trimmed)) {
    return "pt";
  }

  // Japanese
  if (/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(trimmed)) {
    return "ja";
  }

  // German
  if (/[äöüß]/i.test(trimmed)) {
    return "de";
  }

  // French
  if (/[œæèù]/i.test(trimmed)) {
    return "fr";
  }

  const clean = trimmed.toLowerCase().replace(/[^a-z0-9áéíóúüñãõçêôà]/g, " ");
  const tokens = clean.split(/\s+/).filter(Boolean);

  let ptScore = 0;
  let esScore = 0;

  for (const token of tokens) {
    if (PORTUGUESE_COMMERCIAL_WORDS.has(token)) ptScore++;
    if (SPANISH_COMMERCIAL_WORDS.has(token)) esScore++;
  }

  // Uniquely Portuguese words (frete, parcelas, brasil, voce, etc.)
  if (ptScore > 0 && (ptScore > esScore || tokens.some((t) => ["frete", "parcelas", "brasil", "voce", "você", "não"].includes(t)))) {
    return "pt";
  }

  const lang = detectLanguage(trimmed);
  return lang === "Spanish" ? "es" : "en";
}

export type ProductSpecWithLanguage = Partial<ProductSpec> & {
  language?: string;
  locale?: string;
};

/**
 * Detects the primary language, dialect, and regional locale of an E-Commerce Product Specification.
 */
export function detectProductLanguage(
  spec: ProductSpecWithLanguage | null | undefined
): DetectedLanguageResult {
  if (!spec) {
    return {
      language: "es",
      locale: "es-AR",
      isSpanish: true,
      isArgentine: true,
      countryName: "Argentina",
      voiceModelSuggestion: "es_AR-daniela-high",
      defaultCtaText: "COMPRÁ AHORA • TOCÁ ACÁ",
      confidence: 1.0,
      detectedBy: "universal_engine",
    };
  }

  // 1. Check explicit language metadata
  const explicitLang = spec.language || spec.locale;
  if (explicitLang && typeof explicitLang === "string") {
    const l = explicitLang.toLowerCase();
    if (l.startsWith("es")) {
      const isAr = l.includes("ar") || ARGENTINE_VOSEO_REGEX.test(spec.title || "");
      const isEs = l.includes("es");
      return {
        language: "es",
        locale: isAr ? "es-AR" : isEs ? "es-ES" : "es-MX",
        isSpanish: true,
        isArgentine: isAr,
        countryName: isAr ? "Argentina" : isEs ? "Spain" : "Latin America",
        voiceModelSuggestion: isAr ? "es_AR-daniela-high" : isEs ? "es_ES-davefx-medium" : "es_ES-carlfm-x_low",
        defaultCtaText: isAr ? "COMPRÁ AHORA • TOCÁ ACÁ" : isEs ? "COMPRAR AHORA • HAZ TU PEDIDO" : "COMPRA AHORA • HAZ TU PEDIDO",
        confidence: 1.0,
        detectedBy: "metadata",
      };
    }
    if (l.startsWith("pt")) {
      return {
        language: "pt",
        locale: "pt-BR",
        isSpanish: false,
        isArgentine: false,
        countryName: "Brazil",
        voiceModelSuggestion: "pt_BR-edresson-low",
        defaultCtaText: "COMPRAR JÁ • CLIQUE AQUI",
        confidence: 1.0,
        detectedBy: "metadata",
      };
    }
  }

  const url = (spec.sourceUrl || "").toLowerCase();
  const domain = (spec.brand?.domain || "").toLowerCase();
  const currency = (spec.currency || "").toUpperCase();

  // 2. Check TLD / URL Patterns
  const isArDomain = url.includes(".com.ar") || domain.includes(".com.ar") || domain.includes("storehaus");
  const isEsDomain = url.includes(".es") || domain.endsWith(".es") || domain.includes(".com.es");
  const isMxDomain = url.includes(".com.mx") || domain.includes(".com.mx");
  const isClDomain = url.includes(".cl") || domain.endsWith(".cl");
  const isCoDomain = url.includes(".com.co") || domain.includes(".com.co");
  const isUyDomain = url.includes(".com.uy") || domain.includes(".com.uy");
  const isPeDomain = url.includes(".com.pe") || domain.includes(".com.pe");
  const isBrDomain = url.includes(".com.br") || domain.endsWith(".br");
  const isUkDomain = url.includes(".co.uk") || domain.endsWith(".uk");

  // 3. Check Currency
  const isArsCurrency = currency === "ARS";
  const isLatamCurrency = ["CLP", "COP", "MXN", "PEN", "UYU"].includes(currency);
  const isBrlCurrency = currency === "BRL";

  // 4. Text Frequency Scoring
  const corpus = `${spec.title || ""} ${spec.description || ""} ${(spec.bulletPoints || []).join(" ")} ${spec.vendor || ""}`;
  const cleanText = corpus.toLowerCase().replace(/[^a-z0-9áéíóúüñãõçêôà]/g, " ");
  const words = cleanText.split(/\s+/).filter(Boolean);

  let spanishScore = 0;
  let englishScore = 0;
  let portugueseScore = 0;

  for (const word of words) {
    if (SPANISH_COMMERCIAL_WORDS.has(word)) spanishScore++;
    if (ENGLISH_COMMERCIAL_WORDS.has(word)) englishScore++;
    if (PORTUGUESE_COMMERCIAL_WORDS.has(word)) portugueseScore++;
  }

  // Diacritics presence
  const hasSpanishDiacritics = /[áéíóúüñ¿¡]/i.test(corpus);
  const hasPortugueseDiacritics = /[ãõçêôà]/i.test(corpus);
  const hasArgentineVoseo = ARGENTINE_VOSEO_REGEX.test(corpus);
  const hasCastilianVocab = CASTILIAN_REGEX.test(corpus);

  if (hasSpanishDiacritics) spanishScore += 2;
  if (hasPortugueseDiacritics) portugueseScore += 2;

  // 5. Resolve Portuguese
  if (isBrDomain || isBrlCurrency || (portugueseScore > spanishScore && portugueseScore > englishScore && portugueseScore >= 2)) {
    return {
      language: "pt",
      locale: "pt-BR",
      isSpanish: false,
      isArgentine: false,
      countryName: "Brazil",
      voiceModelSuggestion: "pt_BR-edresson-low",
      defaultCtaText: "COMPRAR JÁ • CLIQUE AQUI",
      confidence: Math.min(1.0, 0.6 + portugueseScore * 0.05),
      detectedBy: "universal_engine",
    };
  }

  // 6. Resolve Spanish (Handles Argentine vs Castilian vs Latin America)
  const isLinguisticallySpanish = spanishScore > englishScore || (spanishScore >= 2 && englishScore === 0) || hasSpanishDiacritics;

  if (isArDomain || isArsCurrency || (isLinguisticallySpanish && hasArgentineVoseo)) {
    return {
      language: "es",
      locale: "es-AR",
      isSpanish: true,
      isArgentine: true,
      countryName: "Argentina",
      voiceModelSuggestion: "es_AR-daniela-high",
      defaultCtaText: "COMPRÁ AHORA • TOCÁ ACÁ",
      confidence: Math.min(1.0, 0.7 + spanishScore * 0.05),
      detectedBy: "universal_engine",
    };
  }

  if (isEsDomain || (isLinguisticallySpanish && hasCastilianVocab && !isLatamCurrency)) {
    return {
      language: "es",
      locale: "es-ES",
      isSpanish: true,
      isArgentine: false,
      countryName: "Spain",
      voiceModelSuggestion: "es_ES-davefx-medium",
      defaultCtaText: "COMPRAR AHORA • HAZ TU PEDIDO",
      confidence: Math.min(1.0, 0.7 + spanishScore * 0.05),
      detectedBy: "universal_engine",
    };
  }

  if (isMxDomain || isClDomain || isCoDomain || isUyDomain || isPeDomain || isLatamCurrency || (isLinguisticallySpanish && !isUkDomain)) {
    return {
      language: "es",
      locale: isClDomain ? "es-CL" : isCoDomain ? "es-CO" : "es-MX",
      isSpanish: true,
      isArgentine: false,
      countryName: isClDomain ? "Chile" : isCoDomain ? "Colombia" : "Latin America",
      voiceModelSuggestion: "es_ES-carlfm-x_low",
      defaultCtaText: "COMPRA AHORA • HAZ TU PEDIDO",
      confidence: Math.min(1.0, 0.65 + spanishScore * 0.05),
      detectedBy: "universal_engine",
    };
  }

  // 7. Default: English (US or UK)
  return {
    language: "en",
    locale: isUkDomain || currency === "GBP" ? "en-GB" : "en-US",
    isSpanish: false,
    isArgentine: false,
    countryName: isUkDomain ? "United Kingdom" : "United States",
    voiceModelSuggestion: isUkDomain ? "en_GB-cori-medium" : "en_US-amy-medium",
    defaultCtaText: "SHOP NOW • TAP BELOW",
    confidence: Math.min(1.0, 0.6 + englishScore * 0.05),
    detectedBy: "universal_engine",
  };
}
