import { z } from "zod";

import { ALL_PRESET_SLUGS } from "../prompt/presetRegistry";

/**
 * Schema for a single script segment produced by the LLM.
 */
export const SegmentSchema = z.object({
  index: z.number().int().min(0),
  start_time: z.number().min(0),
  end_time: z.number().min(0),
  text: z.string().min(1),
  /** Phonetically normalized audio script for neural TTS synthesis */
  spoken_text: z.string().optional().nullable(),
  emotion: z.enum(["neutral", "excited", "serious", "urgent"]).default("neutral"),
  image_prompt: z.string().min(1),
  imagePromptHash: z.string().optional(),
  source_media_url: z.string().optional().nullable(),
  suggested_persona_id: z.string().optional().nullable(),
  preset_choice: z.string().optional().nullable().transform(val => {
    if (!val) return "news-anchor-desk";
    if (ALL_PRESET_SLUGS.includes(val)) return val;
    // Try to normalize to kebab-case
    const cleaned = val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (ALL_PRESET_SLUGS.includes(cleaned)) return cleaned;
    return "news-anchor-desk";
  }),
  persona_image_prompt: z.string().optional().nullable(),
  presenter_video_prompt: z.string().optional().nullable(),
  /** 1-3 word keyword for stock footage search (e.g. "server room", "AI robot") */
  keyword: z.string().optional().nullable(),
  backup_keywords: z.array(z.string()).default([]),
  is_prerendered_clip: z.boolean().optional().nullable(),
  clip_id: z.string().optional().nullable(),
});

/**
 * Schema for the full LLM script output.
 * Contains a headline, 5 segments, and optional platform metadata.
 */
export const ScriptOutputSchema = z.object({
  headline: z.string().min(1),
  segments: z
    .array(SegmentSchema)
    .min(3)
    .max(8)
    .refine(
      (segments) => {
        // Verify segments are ordered and non-overlapping
        for (let i = 1; i < segments.length; i++) {
          if (segments[i].start_time < segments[i - 1].end_time) {
            return false;
          }
        }
        return true;
      },
      { message: "Segments must be ordered and non-overlapping" }
    ),
  include_standard_outro: z.boolean().default(true),
  /** Suggested background music mood for this story */
  suggested_music_mood: z.enum(["upbeat", "serious", "ambient", "dramatic", "calm", "energetic"]).optional().nullable(),
  /** Suggested search query for background music (e.g. "corporate news ambient") */
  suggested_music_query: z.string().optional().nullable(),
  backup_music_queries: z.array(z.string()).default([]),
  youtube_title: z.string().max(100).optional(),
  youtube_description: z.string().optional(),
  youtube_tags: z.array(z.string()).optional(),
  instagram_caption: z.string().max(2200).optional(),
  instagram_hashtags: z.array(z.string()).optional(),
});

export type SegmentOutput = z.infer<typeof SegmentSchema>;
export type ScriptOutput = z.infer<typeof ScriptOutputSchema>;

/**
 * Validate raw LLM output against the schema.
 * Returns the parsed output or throws with detailed validation errors.
 */
export function validateScriptOutput(raw: unknown): ScriptOutput {
  return ScriptOutputSchema.parse(raw);
}

/**
 * Safe validation that returns result instead of throwing.
 */
export function safeValidateScriptOutput(raw: unknown) {
  return ScriptOutputSchema.safeParse(raw);
}
