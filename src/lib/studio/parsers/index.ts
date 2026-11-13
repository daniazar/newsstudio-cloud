/**
 * src/lib/studio/parsers/index.ts
 *
 * Unified dispatcher for all studio article parsers.
 * Call parseArticleForStudio(studioType, articleContent, options) from API routes.
 */

import type { StudioType, StudioPayload, ParseOptions } from "./types";
import { parseArticleAsInterview } from "./interview";
import { parseArticleAsPodcast } from "./podcast";
import { parseArticleAsVTuber } from "./vtuber";
import { parseArticleAsLocalization } from "./localization";
import { parseArticleAsDataStudio } from "./data_studio";
import { parseArticleAsNarrativeMatrix } from "./narrative_matrix";
import { parseArticleAsDebate } from "./debate";

export type { ParseOptions } from "./types";

/**
 * Parse a news article's fullContent into a studio-specific payload.
 * Each studio type uses its own isolated prompt powered by the unified AI SDK Gateway.
 */
export async function parseArticleForStudio(
  studioType: StudioType,
  articleContent: string,
  options: ParseOptions = {}
): Promise<StudioPayload> {
  const content = (articleContent || "").trim();
  if (!content) {
    throw new Error("Article content cannot be empty");
  }

  switch (studioType) {
    case "interview":
      return parseArticleAsInterview(content, options);

    case "podcast":
      return parseArticleAsPodcast(content, options);

    case "vtuber":
      return parseArticleAsVTuber(content, options);

    case "localization":
      return parseArticleAsLocalization(content, options);

    case "data_studio":
      return parseArticleAsDataStudio(content, options);

    case "narrative_matrix":
      return parseArticleAsNarrativeMatrix(content, options);

    case "debate":
      return parseArticleAsDebate(content, options);

    default:
      throw new Error(`Unknown studio type: ${studioType}`);
  }
}

// Progressive Streaming Parser
export {
  streamArticleForStudio,
  computeSceneCount,
  type StudioStreamEvent,
} from "./stream";

// Re-export all types, schemas, and parser functions
export * from "./types";
export {
  parseArticleAsInterview,
  normalizeInterviewPayload,
  type ParseInterviewOptions,
  SYSTEM_PROMPT as INTERVIEW_SYSTEM_PROMPT,
} from "./interview";
export {
  parseArticleAsPodcast,
  normalizePodcastPayload,
  type ParsePodcastOptions,
  SYSTEM_PROMPT as PODCAST_SYSTEM_PROMPT,
} from "./podcast";
export {
  parseArticleAsVTuber,
  normalizeVTuberPayload,
  type ParseVTuberOptions,
  SYSTEM_PROMPT as VTUBER_SYSTEM_PROMPT,
} from "./vtuber";
export {
  parseArticleAsLocalization,
  normalizeLocalizationPayload,
  type ParseLocalizationOptions,
  SYSTEM_PROMPT as LOCALIZATION_SYSTEM_PROMPT,
} from "./localization";
export {
  parseArticleAsDataStudio,
  normalizeDataStudioPayload,
  type ParseDataStudioOptions,
  generateFallbackDataStudio,
  SYSTEM_PROMPT as DATA_STUDIO_SYSTEM_PROMPT,
} from "./data_studio";
export {
  parseArticleAsNarrativeMatrix,
  normalizeNarrativeMatrixPayload,
  type ParseNarrativeMatrixOptions,
  SYSTEM_PROMPT as NARRATIVE_MATRIX_SYSTEM_PROMPT,
} from "./narrative_matrix";
export {
  parseArticleAsDebate,
  normalizeDebatePayload,
  type ParseDebateOptions,
  SYSTEM_PROMPT as DEBATE_SYSTEM_PROMPT,
} from "./debate";
