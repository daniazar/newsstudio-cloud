import { presetRegistry } from "../prompt/presetRegistry";
import { getPromptSystemInstruction } from "../tts/modelPromptDirectives";

export const SCRIPT_GENERATION_RULES = `Your task is to transform a raw news article into a broadcast-ready script for a vertical video. The script should be between 20 and 60 seconds long depending on how much interesting detail is in the article.

OUTPUT FORMAT: You MUST respond with valid JSON matching this exact structure:

{
  "headline": "A punchy, attention-grabbing headline (max 15 words)",
  "segments": [
    {
      "index": 0,
      "start_time": 0,
      "end_time": 7,
      "text": "Clean visual subtitle text to display on screen and for video captions. Uses standard broadcast numbers ($3.5B, 42.5%), quotes, and clean orthography.",
      "spoken_text": "Phonetically normalized and expanded text fed directly into the neural TTS engine. Verbalizes numbers ('tres punto cinco billones de dólares', 'cuarenta y dos coma cinco por ciento'), expands initialisms ('C-E-O', 'S and P quinientos'), anchors foreign brand names, and applies natural respiratory pauses.",
      "suggested_persona_id": "slug_of_the_persona_assigned_to_this_segment",
      "preset_choice": "preset_slug",
      "persona_image_prompt": "A detailed visual description for AI image generation. Synthesize the selected persona's physical features and style guidelines (hair style, makeup, specific clothing style, accessories) with the preset's environment/lighting details. Be extremely detailed to get raw photo realism.",
      "presenter_video_prompt": "A detailed motion video prompt. Specify presenter behavior, cameras, shots, cuts, and speech content. E.g.: 'The presenter (Ruby) is standing behind a TV studio desk. For 0-2s: medium shot. 2-3s: progressive camera zoom-in on the face. At 7s: cut to a side-angle take, all while speaking: \"[segment text]\"'",
      "image_prompt": "Detailed B-roll / background visual description for stock search (e.g. 'Close-up of a glowing blue microchip...'). Describe B-roll visuals to overlay.",
      "keyword": "A 1-3 word keyword describing the ideal B-roll footage. NEVER use brand names or proper nouns. Use abstract visual concepts (e.g. 'server room', 'data lock', 'search engine interface').",
      "backup_keywords": ["2-3 alternative keywords/queries for failover stock footage search (e.g. ['computer screen close up', 'datacenter lights']). No brand names."],
      "source_media_url": "Optional URL to an image or video directly from the article if it perfectly matches the segment. Otherwise null."
    }
  ],
  "suggested_music_mood": "One of: upbeat, serious, ambient, dramatic, calm, energetic. Pick the mood that best fits the overall article tone.",
  "suggested_music_query": "A 2-4 word search query for background music (e.g. 'corporate news ambient', 'tech innovation upbeat')",
  "backup_music_queries": ["A list of 2-3 alternative music search queries for failover music search (e.g. ['lofi tech corporate', 'cyberpunk synthwave slow']) in case the primary music query returns no results."],
  "youtube_title": "SEO-optimized YouTube title (max 100 chars)",
  "youtube_description": "YouTube description with key points and hashtags",
  "youtube_tags": ["tag1", "tag2", "tag3"],
  "instagram_caption": "Instagram caption with emojis and hashtags (max 2200 chars)",
  "instagram_hashtags": ["#tech", "#news", "#ai"]
}

PRESETS:
You MUST choose the most appropriate preset slug for each segment's setting:
${presetRegistry.getSlugsWithDescriptions()}

RULES:
1. Create between 3 and 8 segments. Total duration should be between 20 and 60 seconds.
2. Segments must be sequential: segment 0 starts at 0, each starts where the previous ends.
3. The script must be an informative dialogue delivered by the assigned news anchor.
4. SCENE STRUCTURE & MEDIA RULES:
   - Segment 0 (Scene 1 - Intro): The anchor delivers the opening headline and greeting in the broadcast studio setting. Keep 'source_media_url' as null (the system composites a 4.0s studio chroma loop).
   - Segment 1 (Scene 2 - Main Hook): The core news hook/lead story. If article images are provided, assign the primary/first image ('AVAILABLE ARTICLE IMAGES' item 1) to 'source_media_url'.
   - Segment 2+ (Scene 3+ - Details & Outro): Assign subsequent article images sequentially if relevant, or set 'source_media_url' to null and provide rich 'keyword' and 'backup_keywords' for stock B-roll auto-fetching.
5. Never refer to yourself in third person. Always act as the assigned persona.
6. Open with a hook, close with a forward-looking statement.
7. LANGUAGE CONSISTENCY FOR METADATA: All metadata fields — 'headline', 'youtube_title', 'youtube_description', 'instagram_caption', 'instagram_hashtags', and segment dialogue 'text' — MUST be composed in the target broadcast language (e.g. if the story/persona is Spanish, 'headline', 'youtube_title', 'youtube_description', and 'instagram_caption' MUST all be in fluent, compelling Spanish. NEVER output English metadata for a Spanish video).
8. For EACH segment, provide a 'keyword' field and a 'backup_keywords' array. CRITICAL: These keywords are sent directly to a stock video search API. NEVER use literal proper nouns, company names, or brand names.
9. Generate the 'persona_image_prompt' by fully merging the persona's visual description, visual style guidelines (hair/makeup/clothes/accessories), and the preset's environment/lighting details.
10. Generate the 'presenter_video_prompt' as a highly detailed layout plan detailing presenter behaviors, facial expressions, camera cuts, zoom progressions, and shot shifts timed to the spoken words. Make it sound extremely professional like a multi-camera news broadcast.
11. Provide 'suggested_music_mood', 'suggested_music_query', and a 'backup_music_queries' array with 2-3 alternative background music queries for search failovers.
12. Auto-inject inline emotion tags ([urgent], [excited], [whisper], [serious], [pause: 0.3s]) into the 'text' string based on article sentiment. E.g.: '[urgent] ¡Alerta de último momento! [pause: 0.3s] YPF anunció resultados históricos.'
13. TWO-TIER SCRIPT FIELDS (VISUAL SUBTITLES VS. ACOUSTIC SPEECH):
    - 'text' (Visual Subtitles): Rendered directly as video captions and in the editor. Must look clean, professional, and standard ($3.5B, 42.5%, S&P 500, quotes).
    - 'spoken_text' (Acoustic Speech): Sent to the neural TTS audio engine. Must adhere to Universal & Model-Specific normalization rules: spell out numbers, decimals, currencies, hyphenate letter initialisms ('C-E-O', 'M-I-T'), frame foreign brands, and insert commas/ellipses for natural respiratory cadence.`;

export const NEWS_ARCHETYPE_INSTRUCTIONS: Record<string, string> = {
  breaking_flash: "BROADCAST ARCHETYPE: Breaking News Flash. Urgent, punchy, high-impact breaking bulletin. The lead anchor delivers fast-paced, high-clarity developing facts with immediate journalistic gravity.",
  deep_dive: "BROADCAST ARCHETYPE: Deep Dive & Analysis. Measured, analytical, in-depth breakdown. Focus on technical nuance, structural context, and quantitative implications.",
  primetime_brief: "BROADCAST ARCHETYPE: Primetime Anchor Brief. Authoritative, poised, primetime studio anchor style. Classic broadcast pacing, narrative progression from hook to wrap.",
  debate_perspectives: "BROADCAST ARCHETYPE: Debate & Perspectives. Examine contrasting viewpoints and dialectical scrutiny. Balance arguments and counterarguments objectively.",
  viral_social: "BROADCAST ARCHETYPE: Viral Social Byte (9:16 Vertical). High energy, curiosity gap hook, fast hook-to-payoff ratio tailored for short-form retention (TikTok/Reels/Shorts).",
  market_ticker: "BROADCAST ARCHETYPE: Financial & Market Ticker. Quantitative metrics, market implications, stock/crypto or economic impact, data-driven synthesis."
};

/**
 * Generate the user prompt with the full article content and persona options.
 */
export function buildUserPrompt(
  article: {
    title: string;
    content: string;
    author?: string;
    source?: string;
    images?: string[];
  },
  personasContext?: string,
  options?: {
    engine?: string;
    language?: string;
    archetype?: string;
    customDirection?: string;
    leadPersonaId?: string;
  }
): string {
  const targetEngine = options?.engine || "omni";
  const targetLanguage = options?.language || "es";
  const archetypeInstruction = options?.archetype && NEWS_ARCHETYPE_INSTRUCTIONS[options.archetype]
    ? `\n${NEWS_ARCHETYPE_INSTRUCTIONS[options.archetype]}\n`
    : "";
  const customDirectionInstruction = options?.customDirection?.trim()
    ? `\nEDITORIAL CREATIVE DIRECTION:\n${options.customDirection.trim()}\n`
    : "";
  const leadPersonaInstruction = options?.leadPersonaId && options.leadPersonaId !== "auto"
    ? `\nMANDATORY LEAD ANCHOR:\nAssign suggested_persona_id: "${options.leadPersonaId}" to lead the broadcast.\n`
    : "";

  const imagesContext = article.images && article.images.length > 0 
    ? `AVAILABLE ARTICLE IMAGES (Use these for source_media_url if relevant):\n${article.images.join("\n")}\n` 
    : "";

  const personasSection = personasContext 
    ? `AVAILABLE ANCHOR PERSONAS (Assign suggested_persona_id matching one of these slugs. Incorporate their visual descriptions and style/visual guidelines in the persona_image_prompt):\n${personasContext}\n` 
    : "";

  return `Transform this tech news article into an informative news anchor broadcast script (20 to 60 seconds).
  
SPEECH SYNTHESIS CADENCE & TWO-TIER EXPANSION DIRECTIVES (${targetEngine.toUpperCase()}):
${getPromptSystemInstruction(targetEngine, targetLanguage)}
${archetypeInstruction}${customDirectionInstruction}${leadPersonaInstruction}
SOURCE: ${article.source ?? "Unknown"}
TITLE: ${article.title}
AUTHOR: ${article.author ?? "Unknown"}
TARGET BROADCAST LANGUAGE: ${targetLanguage.toUpperCase()} (${targetLanguage === "es" ? "Español / Spanish" : "English"}). You MUST write the headline, SEO title, YouTube description, Instagram caption, hashtags, and script dialogue in this language.

${personasSection}
${imagesContext}
ARTICLE CONTENT:
${article.content.slice(0, 8000)}

Remember: Respond ONLY with valid JSON. No markdown, no code blocks, just raw JSON.`;
}

export const POLISH_SCRIPT_PROMPT = `You are "Ruby," a world-class tech news script editor.
Your goal is to take an existing scene script and "punch it up" to make it more engaging, concise, and professional for a vertical video.

RULES:
1. Maintain the core meaning and facts.
2. Make it sound more authoritative and sharp.
3. Use high-impact words.
4. Keep the length similar to the original (±15%).
5. Respond ONLY with the polished text. No conversational filler.`;

export function buildPolishPrompt(originalText: string, style: 'punchy' | 'short' | 'tiktok' = 'punchy'): string {
  const styleInstructions = {
    punchy: "Make it more professional, sharp, and authoritative.",
    short: "Make it significantly more concise while keeping the core news fact.",
    tiktok: "Add more energy, high-impact hooks, and a faster cadence feel."
  };

  return `${styleInstructions[style]}

ORIGINAL TEXT:
"${originalText}"

POLISHED TEXT:`;
}
