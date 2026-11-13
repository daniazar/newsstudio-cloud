/**
 * src/lib/ai/comfy/image/promptScoper.ts
 *
 * Scoping and prompt compilation utilities for Multi-Pass Progressive Composition Pipeline (Part 10 — IMAGE_ROADMAP.md).
 * Provides clean compilation methods for Stage 1 (Environment), Stage 2 (Props), and Stage 3A/3B (Persona Insertion)
 * without requiring ad-hoc string filtering when structured inputs are available.
 */

/**
 * Strips persona names, physical traits, body attributes, clothing, nudity, pose, and action tags
 * from a raw prompt string to return a clean Stage 1 Environment & Architecture prompt.
 */
export function scopePromptForStage1(fullPrompt: string, personaKeys: string[] = []): string {
  if (!fullPrompt || !fullPrompt.trim()) {
    return "studio background, professional studio lighting, neutral backdrop";
  }

  const tags = fullPrompt.split(",").map(t => t.trim()).filter(Boolean);
  const personaPatterns = personaKeys.map(k => new RegExp(`\\b${k}\\b`, "i"));

  const stripRules: RegExp[] = [
    /\b(RubyVance|StormSterling|Ruby|Storm|VoltStryker|Volt|ElenaRostova|Elena|MayaLin|Maya|ChloeVane|Chloe)\b/i,
    /\b(\d{2}-year-old|\d+yo|\d+cm)\b/i,
    /\b(woman|man|female|male|girl|boy|person|people|character|anchor|presenter|1girl|1boy|2girls|2boys|solo)\b/i,
    /\b(eyes?|freckles?|hair|lips?|face|head|birthmark|iris|cheeks?|chin|nose|eyebrows?)\b/i,
    /\b(green|blue|brown|hazel|copper|red|blonde|brunette|black|wavy|curly|straight|shoulder-length|long|short)[_\s]+hair\b/i,
    /\b(green|blue|brown|hazel)[_\s]+eyes\b/i,
    /\b(pale|porcelain|tanned|dark|oiled|glistening|wet|sweat|tan_lines|tanline|goosebumps)[_\s]+skin\b/i,
    /\b(body|figure|waist|hips?|chest|bust|breasts?|legs?|arms?|thighs?|torso|skin|anatomy|physique|shape|throat|shoulders|stomach)\b/i,
    /\b\d+-inch\b/i,
    /\b(voluptuous|hourglass|slender|athletic|curvy|petite|tall|slim|natural|bare|hourglass_figure|large_breasts|huge_breasts|gigantic_breasts|colossal|small_breasts|cleavage|44j|36dd|38f|32b)\b/i,
    /\b(nude|naked|uncensored|unclothed|bare_skin|topless|bottomless|nipples?|areola|vulva|penis|cock|testicles|scrotum|circumcised|uncircumcised|foreskin|huge_penis|large_penis|erect_penis|throbbing_penis|veiny_penis|futanari|ts_female|shemale|transgender|ladyboy|genitals?|erotic|intimate|erect_nipples|puffy_areolas|pink_areolas|shaved_pussy|landing_strip|hairy_pussy|trimmed_pubic_hair|heart_pubic_hair|cum|bodily_fluids|piercing|genital_piercing|oiled_skin|glistening_skin|tan_lines|tanline)\b/i,
    /\b(dress|suit|blazer|jacket|skirt|pants|trousers|lingerie|underwear|bra|panties|heels|shoes|boots|outfit|attire|clothing|silk|top|blouse|harness|spiderweb|chain|chains|padlock|lock|weight|ring|jewelry|necklace|bracelet|prince[_\s]albert)\b/i,
    /\b(full-body|portrait|standing|seated|sitting|kneeling|lying|reclining|looking\s+at\s+viewer|gaze|headshot|close-up|medium\s+shot|full_body|head-to-toe|full_length|shot|angle|view|frame|wide\s+angle)\b/i,
    /\b(embracing|kissing|holding|touching|talking|speaking|gesturing|walking|running|leaning|posing)\b/i,
    /\b(high fidelity photorealistic|crisp detail|sharp focus on subject|master cinematographic composition|score_\d+(_up)?|rating_(explicit|sfw|questionable)|source_photo|RAW photo|realistic|real life|photography|professional photo|shot on Canon EOS R5|85mm f\/1|4 lens|rim light)\b/i
  ];

  const cleanTags = tags.filter(tag => {
    const unweightedTag = tag.replace(/[\(\):0-9\.]/g, "").trim();

    // Preserve tight camera framing and zoom tags across Stage 1 & 2 to lock close-up presenter perspective
    if (/\b(tight|framing|zoomed-in|close-up|filling \d+%\s*of\s*frame|chest-up|anchor\s+close)\b/i.test(unweightedTag)) {
      return true;
    }

    const isPersonaName = personaPatterns.some(p => p.test(tag) || p.test(unweightedTag));
    if (isPersonaName) return false;

    const matchesStripRule = stripRules.some(rule => rule.test(tag) || rule.test(unweightedTag));
    return !matchesStripRule;
  });

  if (cleanTags.length === 0) {
    return "studio background, professional studio lighting, neutral architectural backdrop, photorealistic";
  }

  return cleanTags.join(", ");
}

/**
 * Compiles a pure Environment & Architecture prompt directly from scene modifiers,
 * excluding persona/body/attire categories.
 */
export function compileEnvironmentPrompt(sceneModifiers?: string, environmentCategory?: string): string {
  const parts: string[] = [];

  if (environmentCategory && environmentCategory.trim()) {
    parts.push(environmentCategory.trim());
  }

  if (sceneModifiers && sceneModifiers.trim()) {
    const scopedModifiers = scopePromptForStage1(sceneModifiers);
    if (scopedModifiers) {
      parts.push(scopedModifiers);
    }
  }

  if (parts.length === 0) {
    return "modern broadcast news studio, professional studio lighting, neutral architectural background";
  }

  return parts.join(", ");
}

/**
 * Strips persona names, physical features, clothing, body, pose, and human action tags,
 * while preserving environment AND prop/furniture/object tags for Stage 2 (Props & Foreground Elements).
 */
export function scopePromptForStage2(fullPrompt: string, personaKeys: string[] = []): string {
  const isStanding = /\b(standing|podium|lectern|upright|standing_bg|standing_isolated|full standing|standing_mic)\b/i.test(fullPrompt);

  const scoped = scopePromptForStage1(fullPrompt, personaKeys);

  if (scoped && scoped !== "studio background, professional studio lighting, neutral architectural backdrop, photorealistic") {
    return scoped;
  }

  if (isStanding) {
    return "modern news broadcast studio standing set, standing news presenter studio, broadcast studio microphones on stands, ambient newsroom telemetry screens, (NO chair:1.5), (NO desk:1.5), standing studio background";
  }

  return "high-back black executive leather anchor chair facing front, sleek smoked tempered glass broadcast newsroom desk with dark brushed stainless steel frame facing camera in lower foreground, open silver laptop, digital tablet, stacked printed news script papers, studio broadcast microphone on metallic desk stand, glass of water, photorealistic studio set furniture";
}

/**
 * Compiles a Stage 2 Props prompt specifically focusing on foreground elements, furniture, and set items.
 */
export function compilePropsPrompt(sceneModifiers?: string, propsCategory?: string, fullPromptText?: string): string {
  const parts: string[] = [];

  if (propsCategory && propsCategory.trim()) {
    parts.push(propsCategory.trim());
  }

  if (sceneModifiers && sceneModifiers.trim()) {
    const scopedModifiers = scopePromptForStage1(sceneModifiers);
    if (scopedModifiers) {
      parts.push(scopedModifiers);
    }
  }

  if (fullPromptText && fullPromptText.trim()) {
    const scopedProps = scopePromptForStage2(fullPromptText);
    if (scopedProps) {
      parts.push(scopedProps);
    }
  }

  if (parts.length === 0) {
    return "high-back executive leather anchor chair facing front, sleek smoked tempered glass newsroom desk with brushed steel trim, open silver laptop, stacked script papers, studio microphone, foreground set props";
  }

  return parts.join(", ");
}

/**
 * Compiles a clean, dedicated Stage 3 Persona Insertion prompt specifically for a single subject,
 * containing ONLY that persona's physical features, face description, hair, eyes, and attire/pose.
 */
export function compileStage3PersonaPrompt(
  personaName: string,
  personaBasePrompt: string,
  attireOrPose?: string,
  isNsfw: boolean = false,
  fullPromptText?: string
): string {
  const parts: string[] = [];

  const fullText = `${personaName} ${personaBasePrompt} ${attireOrPose || ""} ${fullPromptText || ""}`.toLowerCase();
  const isMale = /\b(1boy|man|male|boy|he|his|him|beard|mustache|pinstripe suit|tuxedo|gentleman)\b/i.test(fullText);
  const isFemale = /\b(1girl|woman|female|girl|she|her|dress|blouse|skirt)\b/i.test(fullText);
  const genderTerm = isMale ? "male news presenter, 1boy" : (isFemale ? "female news anchor, 1girl" : "broadcast news anchor");

  const isStanding = /\b(standing|podium|lectern|upright|standing_bg|standing_isolated|full standing|standing_mic)\b/i.test(fullText);

  if (isNsfw) {
    parts.push(`full-body shot, wide angle head-to-toe view, full length portrait, ${genderTerm}, completely naked, fully nude, unclothed`);
  } else if (isStanding) {
    parts.push(`A high-fidelity photorealistic broadcast news portrait of a ${genderTerm}, standing upright in broadcast studio from waist up, upper body and head prominent in center frame, looking directly at camera, news anchor framing, (NO chair:1.5), (NO desk:1.5)`);
  } else {
    parts.push(`A high-fidelity photorealistic medium close-up broadcast news portrait of a ${genderTerm}, seated in high-back executive anchor chair behind modern newsroom desk, upper body and head prominent in center frame, looking directly at camera, news anchor framing`);
  }

  if (personaBasePrompt && personaBasePrompt.trim()) {
    parts.push(personaBasePrompt.trim());
  }

  if (attireOrPose && attireOrPose.trim()) {
    parts.push(attireOrPose.trim());
  }

  if (!isNsfw) {
    if (isStanding) {
      parts.push("medium-long shot, standing upright in broadcast studio from waist up, hands clasped gracefully in front of lower waist, standing news presenter posture, prominent facial features, sharp focus on face and lips, perfect eye contact, ready for lip-sync animation, (NO chair:1.5), (NO desk:1.5)");
    } else {
      parts.push("medium shot, seated in high-back executive anchor chair behind modern newsroom desk with open silver laptop, digital tablet, stacked news script papers, and studio microphone, executive chair back visible behind shoulders, desk in lower foreground, prominent facial features, sharp focus on face and lips, perfect eye contact, ready for lip-sync animation");
    }
  } else {
    parts.push("high fidelity photorealistic, crisp detail, sharp focus on subject, master cinematographic composition");
  }

  return parts.join(", ");
}
