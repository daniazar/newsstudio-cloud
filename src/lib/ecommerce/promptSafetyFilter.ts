/**
 * src/lib/ecommerce/promptSafetyFilter.ts
 *
 * Comprehensive Prompt Safety, Prominent People Neutralization & Policy Compliance Filter.
 * 
 * Protects generative AI workflows (Google Veo, Google Flow, Imagen 3, Gemini CLI)
 * from triggering automated policy violations:
 * 1. Proactively eliminates named personas (Ruby Vance, Blaze Wilder, etc.) and real-world
 *    prominent people / political / celebrity names that trip the "prominent people" classifier.
 * 2. Neutralizes sensitive clothing and style terms (e.g. "corset" -> "fitted bodice")
 *    that trigger automated content moderation warnings.
 * 3. Sanitizes punctuation, empty parentheses, quotes, and formatting artifacts.
 */

export interface SanitizedPromptResult {
  sanitizedPrompt: string;
  originalPrompt: string;
  wasModified: boolean;
  neutralizedTerms: string[];
}

/**
 * Persona full names mapped to safe, generic visual presenter descriptions
 */
const PERSONA_NAME_REPLACEMENTS: Array<{ regex: RegExp; replacement: string; label: string }> = [
  // Full persona names
  { regex: /\bRuby\s+Vance\b/gi, replacement: "an elegant charismatic female presenter", label: "Ruby Vance" },
  { regex: /\bBlaze\s+Wilder\b/gi, replacement: "a modern athletic female presenter", label: "Blaze Wilder" },
  { regex: /\bMateo\s+Rossi\b/gi, replacement: "a sophisticated charismatic male presenter", label: "Mateo Rossi" },
  { regex: /\bSofia\s+Mendez\b/gi, replacement: "an approachable engaging female presenter", label: "Sofia Mendez" },
  { regex: /\bStorm\s+Harrison\b/gi, replacement: "a commanding athletic female presenter", label: "Storm Harrison" },
  { regex: /\bJordan\s+Steele\b/gi, replacement: "an authoritative charismatic male commentator", label: "Jordan Steele" },
  { regex: /\bDiego\s+Silva\b/gi, replacement: "a confident engaging male presenter", label: "Diego Silva" },
  { regex: /\bCamila\s+Torres\b/gi, replacement: "a poised charismatic female host", label: "Camila Torres" },
  { regex: /\bMarcus\s+Chen\b/gi, replacement: "a sharp articulate male presenter", label: "Marcus Chen" },
  { regex: /\bElena\s+Rostova\b/gi, replacement: "an articulate sophisticated female presenter", label: "Elena Rostova" },
  { regex: /\bMaya\s+Lin\b/gi, replacement: "a creative modern female presenter", label: "Maya Lin" },
  { regex: /\bLucas\s+Scott\b/gi, replacement: "an energetic professional male presenter", label: "Lucas Scott" },
];

/**
 * Common celebrity, public figure, or political surnames that trigger Google's
 * "policies about generating prominent people" safety filter
 */
const PROMINENT_PEOPLE_NAMES: Array<{ regex: RegExp; replacement: string; label: string }> = [
  { regex: /\b(JD\s+Vance|J\.D\.\s+Vance|Vance)\b/gi, replacement: "the presenter", label: "Vance" },
  { regex: /\b(Donald\s+Trump|Trump)\b/gi, replacement: "the executive", label: "Trump" },
  { regex: /\b(Joe\s+Biden|Biden)\b/gi, replacement: "the executive", label: "Biden" },
  { regex: /\b(Kamala\s+Harris|Harris)\b/gi, replacement: "the executive", label: "Harris" },
  { regex: /\b(Barack\s+Obama|Obama)\b/gi, replacement: "the speaker", label: "Obama" },
  { regex: /\b(Elon\s+Musk|Musk)\b/gi, replacement: "the tech founder", label: "Musk" },
  { regex: /\b(Mark\s+Zuckerberg|Zuckerberg)\b/gi, replacement: "the tech founder", label: "Zuckerberg" },
  { regex: /\b(Jeff\s+Bezos|Bezos)\b/gi, replacement: "the entrepreneur", label: "Bezos" },
  { regex: /\b(Taylor\s+Swift|Swift)\b/gi, replacement: "the artist", label: "Swift" },
  { regex: /\b(Kim\s+Kardashian|Kardashian)\b/gi, replacement: "the fashion model", label: "Kardashian" },
];

/**
 * Generic celebrity and political role words that trigger safety classifiers
 */
const PROMINENT_ROLE_TERMS: Array<{ regex: RegExp; replacement: string; label: string }> = [
  { regex: /\bcelebrity\s+lookalike\b/gi, replacement: "professional commercial model", label: "celebrity lookalike" },
  { regex: /\bcelebrity\b/gi, replacement: "commercial presenter", label: "celebrity" },
  { regex: /\bfamous\s+(actor|actress|star|singer|musician)\b/gi, replacement: "professional presenter", label: "famous actor/actress" },
  { regex: /\b(politician|president|prime\s+minister|senator|congressman|governor|monarch|royalty)\b/gi, replacement: "commercial host", label: "political title" },
  { regex: /\b(prominent\s+person|prominent\s+people|public\s+figure|VIP)\b/gi, replacement: "professional brand ambassador", label: "prominent person" },
];

/**
 * Potentially sensitive clothing / attire terms that may trigger content moderation filters
 */
const SENSITIVE_ATTIRE_TERMS: Array<{ regex: RegExp; replacement: string; label: string }> = [
  // Bodice and corset compound phrases
  { regex: /\b(tailored\s+)?burgundy\s+velvet\s+(evening\s+)?(bodice|corset|sweetheart\s+corset|blazer|dress)?(\s+with\s+(sleek\s+)?black\s+trousers|\s+with\s+trousers|\s+with\s+pants)\b/gi, replacement: "an elegant tailored burgundy velvet evening dress", label: "burgundy velvet evening dress" },
  { regex: /\bburgundy\s+velvet\s+(evening\s+)?(bodice|corset|blazer)\b/gi, replacement: "an elegant tailored burgundy velvet evening dress", label: "burgundy velvet evening dress" },
  { regex: /\bburgundy\s+velvet\s+outfit(\s+with\s+(sleek\s+)?black\s+trousers)?\b/gi, replacement: "an elegant tailored burgundy velvet evening dress", label: "burgundy velvet evening dress" },
  { regex: /\bvelvet\s+evening\s+bodice(\s+with\s+(sleek\s+)?black\s+trousers)?\b/gi, replacement: "an elegant tailored velvet evening dress", label: "velvet evening dress" },
  { regex: /\bevening\s+bodice\b/gi, replacement: "tailored evening dress", label: "evening bodice" },
  { regex: /\bsweetheart\s+corset\b/gi, replacement: "tailored evening dress", label: "sweetheart corset" },
  { regex: /\bsweetheart\s+bodice\b/gi, replacement: "tailored evening dress", label: "sweetheart bodice" },
  { regex: /\bvelvet\s+corset\b/gi, replacement: "tailored velvet evening dress", label: "velvet corset" },
  { regex: /\bvelvet\s+bodice\b/gi, replacement: "tailored velvet evening dress", label: "velvet bodice" },
  { regex: /\bboned\s+corset\b/gi, replacement: "structured tailored blazer", label: "boned corset" },
  { regex: /\bboned\s+bodice\b/gi, replacement: "structured tailored jacket", label: "boned bodice" },
  { regex: /\b(corset\s+gown|bodice\s+gown)\b/gi, replacement: "tailored evening gown", label: "corset/bodice gown" },
  { regex: /\b(corset\s+dress|bodice\s+dress)\b/gi, replacement: "tailored evening dress", label: "corset/bodice dress" },
  { regex: /\bfitted\s+bodice\b/gi, replacement: "tailored blazer", label: "fitted bodice" },
  { regex: /\bfitted\s+corset\b/gi, replacement: "tailored blazer", label: "fitted corset" },
  { regex: /\bstructured\s+bodice\b/gi, replacement: "structured tailored blazer", label: "structured bodice" },
  
  // Single keywords
  { regex: /\bcorset\b/gi, replacement: "tailored blazer", label: "corset" },
  { regex: /\bbodice\b/gi, replacement: "tailored jacket", label: "bodice" },
  { regex: /\bbustier\b/gi, replacement: "tailored vest", label: "bustier" },
  { regex: /\bcleavage\b/gi, replacement: "tailored neckline", label: "cleavage" },
  { regex: /\b(sweetheart\s+neckline|sweetheart)\b/gi, replacement: "tailored neckline", label: "sweetheart" },
  { regex: /\b(plunging\s+neckline|deep\s+v-neckline|low-cut\s+neckline|low-cut)\b/gi, replacement: "conservative tailored neckline", label: "plunging neckline" },
  { regex: /\b(strapless|backless)\b/gi, replacement: "tailored", label: "strapless/backless" },
  { regex: /\blingerie\b/gi, replacement: "designer loungewear", label: "lingerie" },
  { regex: /\b(revealing|unclothed|undressed|bare\s+skin|topless|bottomless|unbuttoned)\b/gi, replacement: "tailored attire", label: "revealing clothing" },
  { regex: /\b(seductive|erotic|sexy)\b/gi, replacement: "charismatic, elegant", label: "suggestive terms" },
];

/**
 * Formats and normalizes prompt grammar, punctuation, and syntax
 */
export function cleanPromptSyntax(text: string): string {
  if (!text) return "";

  let cleaned = text;

  // 1. Remove empty parentheses like () or ( )
  cleaned = cleaned.replace(/\(\s*[\s,.-]*\s*\)/g, "");

  // 2. Clean double quotes inside prompt to single quotes or remove to avoid CLI quoting issues
  cleaned = cleaned.replace(/["“”]/g, "'");

  // 3. Fix redundant parentheses sequences like "))." or "). )."
  cleaned = cleaned
    .replace(/\)\s*\.\s*\)\s*\./g, ").")
    .replace(/\)\s*\.\s*\)\s*/g, "). ")
    .replace(/\)\s*,\s*\)/g, "),")
    .replace(/\)\s*\)\s*\./g, ").")
    .replace(/\)\s*\)/g, ")");

  // 4. Fix duplicate punctuation and whitespace
  cleaned = cleaned
    .replace(/(?:\s*[,.]){2,}/g, (match) => match.includes(".") ? "." : ",")
    .replace(/\s+\./g, ".")
    .replace(/\s+,/g, ",");

  // 4b. Clean double articles like "a an" -> "an" or "a a" -> "a"
  cleaned = cleaned
    .replace(/\b(a|an)\s+(an)\b/gi, "an")
    .replace(/\b(a|an)\s+(a)\b/gi, "a");

  // 5. Clean leading/trailing punctuation and excess whitespace while preserving structured section line breaks
  cleaned = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  cleaned = cleaned
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Strip leading commas or periods
  cleaned = cleaned.replace(/^[,.\s]+/, "").trim();

  return cleaned;
}

export { detectLanguage } from "./languageDetector";

/**
 * Removes legacy silent conditioning, closed-mouth clauses, and voiceover-only constraints
 * from generative video prompts, allowing on-camera speaking dialogue.
 */
export function stripSilentContract(prompt: string): string {
  if (!prompt || typeof prompt !== "string") return "";

  let cleaned = prompt;

  const silentPatterns: RegExp[] = [
    // Full compound contracts
    /silent\s+on-camera\s+presenter\s+with\s+closed\s+mouth[,\s\w\(\)\-\.]+absolutely\s+no\s+on-camera\s+talking\s+or\s+lip\s+movement/gi,
    /silent\s+on-camera\s+presenter[,\s\w\(\)\-\.]+absolutely\s+no\s+on-camera\s+talking\s+or\s+lip\s+movement/gi,
    /silent\s+on-camera\s+presenter\s+with\s+closed\s+mouth[,\s\w\(\)\-\.]+clean\s+ambient\s+room\s+acoustics/gi,
    // Discrete clauses and phrases
    /,\s*silent\s+on-camera\s+presenter\s+with\s+closed\s+mouth\b/gi,
    /\bsilent\s+on-camera\s+presenter\s+with\s+closed\s+mouth\b/gi,
    /\bsilent\s+on-camera\s+presenter\b/gi,
    /\bsilently\s+looking\s+toward\s+camera\s+with\s+mouth\s+closed\b/gi,
    /\bsilently\s+looking\s+toward\s+camera\b/gi,
    /\bwith\s+closed\s+mouth\b/gi,
    /\bclosed\s+mouth\b/gi,
    /\bpoised\s+serene\s+facial\s+expression\b/gi,
    /\bpersona\s+not\s+(?:speaking|talking)\s+or\s+(?:speaking|talking)\s+on\s+camera\b/gi,
    /\bpersona\s+not\s+(?:speaking|talking)\s+on\s+camera\b/gi,
    /\bpersona\s+not\s+(?:speaking|talking)\b/gi,
    /\bspoken\s+narration\s+with\s+voiceover\s*\([^\)]*\)/gi,
    /\bspoken\s+narration\s+with\s+voiceover\b/gi,
    /\bvoiceover\s+narration\s+only\b/gi,
    /\boff-camera\s+voiceover\s+narration\b/gi,
    /\bclean\s+ambient\s+environment\s+acoustic\s+sound\s+effects\s+only\s+without\s+spoken\s+dialogue\s*\([^\)]*\)/gi,
    /\bclean\s+ambient\s+environment\s+acoustic\s+sound\s+effects\s+only\s+without\s+spoken\s+dialogue\b/gi,
    /\bclean\s+ambient\s+audio\s+with\s+zero\s+on-camera\s+dialogue\b/gi,
    /\bclean\s+ambient\s+room\s+acoustics\b/gi,
    /\bprimed\s+for\s+broadcast\s+voiceover\s+narration\b/gi,
    /\babsolutely\s+no\s+on-camera\s+talking\s+or\s+lip\s+movement\b/gi,
    /\bno\s+on-camera\s+talking\s+or\s+lip\s+movement\b/gi,
  ];

  for (const pat of silentPatterns) {
    cleaned = cleaned.replace(pat, "");
  }

  return cleanPromptSyntax(cleaned);
}

export interface SanitizeDiffusionPromptOptions {
  allowSpeaking?: boolean;
}

/**
 * Primary Safety Filter for Diffusion Prompts (Google Veo, Google Flow, Imagen 3).
 * Sanitizes and neutralizes names, prominent figures, sensitive attire, and formatting.
 */
export function sanitizeDiffusionPrompt(
  rawPrompt: string,
  options?: SanitizeDiffusionPromptOptions
): SanitizedPromptResult {
  if (!rawPrompt || typeof rawPrompt !== "string") {
    return {
      sanitizedPrompt: "",
      originalPrompt: rawPrompt || "",
      wasModified: false,
      neutralizedTerms: [],
    };
  }

  let prompt = rawPrompt;
  const neutralizedTerms: string[] = [];

  // 1. Structure pattern fix:
  // "featuring [Persona Name] ([traits], dressed in [attire]), [action]"
  // -> "featuring [traits], dressed in [attire], [action]"
  prompt = prompt.replace(
    /\bfeaturing\s+([a-z]+(?:[-'\s]+[a-z]+)*)\s*\(\s*([^)]+?)\s*\)/gi,
    (match, name, innerDetails) => {
      neutralizedTerms.push(`featuring ${name} (...)`);
      return `featuring ${innerDetails.trim()}`;
    }
  );

  // 2. Normalize known Persona names
  for (const item of PERSONA_NAME_REPLACEMENTS) {
    if (item.regex.test(prompt)) {
      neutralizedTerms.push(item.label);
      prompt = prompt.replace(item.regex, item.replacement);
    }
  }

  // 3. Normalize known Prominent People & Political Surnames
  for (const item of PROMINENT_PEOPLE_NAMES) {
    if (item.regex.test(prompt)) {
      neutralizedTerms.push(item.label);
      prompt = prompt.replace(item.regex, item.replacement);
    }
  }

  // 4. Normalize Prominent Role Terms
  for (const item of PROMINENT_ROLE_TERMS) {
    if (item.regex.test(prompt)) {
      neutralizedTerms.push(item.label);
      prompt = prompt.replace(item.regex, item.replacement);
    }
  }

  // 5. Normalize Sensitive Clothing / Attire Terms
  for (const item of SENSITIVE_ATTIRE_TERMS) {
    if (item.regex.test(prompt)) {
      neutralizedTerms.push(item.label);
      prompt = prompt.replace(item.regex, item.replacement);
    }
  }

  // 6. Generic pattern safeguard:
  // Remove any remaining "featuring Firstname Lastname," pattern
  prompt = prompt.replace(
    /\bfeaturing\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g,
    (match, first, last) => {
      // Don't replace common English descriptive adjective-noun pairs like "natural daylight", "high quality"
      const lower = `${first} ${last}`.toLowerCase();
      if (
        lower.includes("daylight") ||
        lower.includes("quality") ||
        lower.includes("lighting") ||
        lower.includes("interior") ||
        lower.includes("architecture") ||
        lower.includes("surface")
      ) {
        return match;
      }
      neutralizedTerms.push(`${first} ${last}`);
      return "featuring a professional presenter";
    }
  );

  // 6b. Camera Motion & Physical Drone Elimination:
  // Convert physical drone nouns to pure camera motion and enforce pure camera POV without quadcopters
  if (/\b(FPV\s+drone|drone\s+flyover|drone\s+glide|drone\s+aerial|drone\s+flight|drone\s+camera)\b/i.test(prompt)) {
    neutralizedTerms.push("drone camera motion");
    prompt = prompt
      .replace(/\bCinematic\s+continuous\s+FPV\s+drone\s+flyover\b/gi, "Smooth continuous floating camera glide")
      .replace(/\bCinematic\s+drone\s+flyover\b/gi, "Smooth floating aerial glide")
      .replace(/\bFPV\s+drone\b/gi, "floating camera")
      .replace(/\bdrone\s+flyover\b/gi, "floating aerial glide")
      .replace(/\bdrone\s+glide\b/gi, "floating camera glide")
      .replace(/\bdrone\s+aerial\b/gi, "floating aerial")
      .replace(/\bdrone\s+flight\b/gi, "camera flight")
      .replace(/\bdrone\s+camera\b/gi, "floating camera");
    if (!prompt.includes("no physical drones")) {
      prompt = `${prompt}, pure unobstructed camera POV, no physical drones, no quadcopters, no camera equipment visible in frame`;
    }
  }

  // 6c. Persona Speaking vs Non-Speaking Contract:
  // When allowSpeaking is true or prompt contains explicit on-camera dialogue instructions,
  // do NOT enforce closed-mouth silence and strip any leftover legacy silent conditioning.
  const isSpeakingAllowed =
    options?.allowSpeaking === true ||
    (options?.allowSpeaking !== false &&
      /\b(speaking on camera|delivering the dialogue|speaking in|lip synchronization|dialogue:)\b/i.test(prompt));

  if (isSpeakingAllowed) {
    const stripped = stripSilentContract(prompt);
    if (stripped !== prompt) {
      neutralizedTerms.push("strip legacy silent contract");
      prompt = stripped;
    }
  } else {
    // Legacy / default mode: enforce closed-mouth silent presenter and voiceover contract
    const hasHumanSubject =
      /\b(presenter|model|spokesperson|persona|ruby|blaze|mateo|sofia|camila|elena|marcus|adrian)\b/i.test(prompt) ||
      /\b(walking gracefully|holding and presenting|modeling and presenting|kneeling down|standing gracefully)\b/i.test(prompt);

    if (hasHumanSubject) {
      if (/\b(speaking to camera|talking to camera|delivering lines)\b/i.test(prompt)) {
        prompt = prompt.replace(/\b(speaking to camera|talking to camera|delivering lines)\b/gi, "silently looking toward camera with mouth closed");
        neutralizedTerms.push("on-camera speech");
      }

      if (!/\b(spoken narration with voiceover)\b/i.test(prompt)) {
        if (!/\b(persona not speaking|persona not talking|silent on-camera presenter)\b/i.test(prompt)) {
          prompt = `${prompt}, silent on-camera presenter with closed mouth, poised serene facial expression, persona not talking or speaking on camera, spoken narration with voiceover, voiceover narration only, clean ambient room acoustics, absolutely no on-camera talking or lip movement`;
          neutralizedTerms.push("enforce silent presenter with spoken narration voiceover");
        } else {
          prompt = `${prompt}, spoken narration with voiceover, voiceover narration only, absolutely no on-camera talking or lip movement`;
          neutralizedTerms.push("enforce spoken narration with voiceover");
        }
      }
    }
  }

  // 7. Syntax & formatting cleanup
  const finalPrompt = cleanPromptSyntax(prompt);
  const wasModified = finalPrompt !== rawPrompt;

  return {
    sanitizedPrompt: finalPrompt,
    originalPrompt: rawPrompt,
    wasModified,
    neutralizedTerms,
  };
}

/**
 * Convenient shorthand function returning directly the sanitized prompt string
 */
export function filterPromptForSafety(
  prompt: string,
  options?: SanitizeDiffusionPromptOptions
): string {
  return sanitizeDiffusionPrompt(prompt, options).sanitizedPrompt;
}
