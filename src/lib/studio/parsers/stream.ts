/**
 * src/lib/studio/parsers/stream.ts
 *
 * Real-time progressive studio parser streamer powered by Vercel AI SDK streamLlmObject.
 * Emits progressive partial events as JSON tokens stream in from the LLM, then yields
 * the normalized complete StudioPayload once generation finishes.
 *
 * Automatic fallback to parseArticleForStudio if stream initialization or token consumption fails.
 */

import { streamLlmObject } from "@/lib/llm/aiSdkGateway";
import { parseArticleForStudio } from "./index";
import {
  StudioType,
  StudioPayload,
  ParseOptions,
  InterviewLlmResponseSchema,
  PodcastLlmResponseSchema,
  VTuberLlmResponseSchema,
  LocalizationLlmResponseSchema,
  DataStudioLlmResponseSchema,
  NarrativeMatrixLlmResponseSchema,
  DebateLlmResponseSchema,
} from "./types";
import {
  SYSTEM_PROMPT as INTERVIEW_SYSTEM_PROMPT,
  normalizeInterviewPayload,
} from "./interview";
import {
  SYSTEM_PROMPT as PODCAST_SYSTEM_PROMPT,
  normalizePodcastPayload,
} from "./podcast";
import {
  SYSTEM_PROMPT as VTUBER_SYSTEM_PROMPT,
  normalizeVTuberPayload,
} from "./vtuber";
import {
  SYSTEM_PROMPT as LOCALIZATION_SYSTEM_PROMPT,
  normalizeLocalizationPayload,
} from "./localization";
import {
  SYSTEM_PROMPT as DATA_STUDIO_SYSTEM_PROMPT,
  normalizeDataStudioPayload,
} from "./data_studio";
import {
  SYSTEM_PROMPT as NARRATIVE_MATRIX_SYSTEM_PROMPT,
  normalizeNarrativeMatrixPayload,
} from "./narrative_matrix";
import {
  DEBATE_SYSTEM_PROMPT,
  normalizeDebatePayload,
} from "./debate";

export type StudioStreamEvent =
  | {
      type: "partial";
      studioType: StudioType;
      partial: Record<string, unknown>;
      sceneCount: number;
    }
  | {
      type: "complete";
      studioType: StudioType;
      payload: StudioPayload;
    };

export function computeSceneCount(
  studioType: StudioType,
  partial: Record<string, unknown>
): number {
  if (!partial || typeof partial !== "object") return 0;
  switch (studioType) {
    case "interview":
      return Array.isArray(partial.turns) ? partial.turns.length : 0;
    case "podcast":
      return Array.isArray(partial.lines) ? partial.lines.length : 0;
    case "vtuber":
      return Array.isArray(partial.reactionMoments) ? partial.reactionMoments.length : 0;
    case "localization":
      return Array.isArray(partial.tracks) ? partial.tracks.length : 0;
    case "data_studio":
      if (Array.isArray(partial.tickers) && partial.tickers.length > 0) {
        return partial.tickers.length;
      }
      return partial.headline || partial.summary ? 1 : 0;
    case "narrative_matrix":
      return Array.isArray(partial.perspectives) ? partial.perspectives.length : 0;
    case "debate":
      if (Array.isArray(partial.turns) && partial.turns.length > 0) {
        return partial.turns.length;
      }
      return Array.isArray(partial.speakers) ? partial.speakers.length : 0;
    default:
      return 0;
  }
}

interface InitializedStream {
  stream: Awaited<ReturnType<typeof streamLlmObject>>;
  normalize: (finalOutput: unknown) => StudioPayload;
}

async function initStudioObjectStream(
  studioType: StudioType,
  content: string,
  options: ParseOptions
): Promise<InitializedStream> {
  switch (studioType) {
    case "interview": {
      const personaSlugs = options.personaSlugs?.length
        ? options.personaSlugs
        : options.personaSlug
        ? [options.personaSlug, "tomas"]
        : ["ruby", "tomas"];
      const slugContext = `Available persona slugs: ${personaSlugs.join(", ")}. Use these for speakerId.`;
      const userPrompt = `${slugContext}\n\nARTICLE CONTENT:\n${content.slice(0, 6000)}`;

      const stream = await streamLlmObject({
        schema: InterviewLlmResponseSchema,
        schemaName: "InterviewScript",
        schemaDescription: "A 3-camera dual-presenter interview script",
        system: INTERVIEW_SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.7,
        tier: "structured",
        provider: options.provider,
        model: options.model,
        companyId: options.companyId,
        storyId: options.storyId,
        allowFallback: options.allowFallback,
        customModel: options.customModel,
      });

      return {
        stream,
        normalize: (out) =>
          normalizeInterviewPayload(
            out as Parameters<typeof normalizeInterviewPayload>[0],
            personaSlugs
          ),
      };
    }

    case "podcast": {
      const personaSlugs = options.personaSlugs?.length
        ? options.personaSlugs
        : options.personaSlug
        ? [options.personaSlug, "mateo"]
        : ["ruby", "mateo"];
      const slugContext = `Use these persona slugs: ${personaSlugs.join(", ")}.`;
      const userPrompt = `${slugContext}\n\nARTICLE CONTENT:\n${content.slice(0, 6000)}`;

      const stream = await streamLlmObject({
        schema: PodcastLlmResponseSchema,
        schemaName: "PodcastScript",
        schemaDescription: "Casual multi-speaker podcast script",
        system: PODCAST_SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.7,
        tier: "structured",
        provider: options.provider,
        model: options.model,
        companyId: options.companyId,
        storyId: options.storyId,
        allowFallback: options.allowFallback,
        customModel: options.customModel,
      });

      return {
        stream,
        normalize: (out) =>
          normalizePodcastPayload(
            out as Parameters<typeof normalizePodcastPayload>[0],
            personaSlugs
          ),
      };
    }

    case "vtuber": {
      const personaId = options.personaSlug || options.personaSlugs?.[0] || "ruby";
      const userPrompt = `Streamer persona: ${personaId}\n\nARTICLE CONTENT:\n${content.slice(0, 5000)}`;

      const stream = await streamLlmObject({
        schema: VTuberLlmResponseSchema,
        schemaName: "VTuberScript",
        schemaDescription: "A live-streamer VTuber reaction script with simulated chat",
        system: VTUBER_SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.7,
        tier: "structured",
        provider: options.provider,
        model: options.model,
        companyId: options.companyId,
        storyId: options.storyId,
        allowFallback: options.allowFallback,
        customModel: options.customModel,
      });

      return {
        stream,
        normalize: (out) =>
          normalizeVTuberPayload(
            out as Parameters<typeof normalizeVTuberPayload>[0],
            personaId
          ),
      };
    }

    case "localization": {
      const userPrompt = `ARTICLE CONTENT:\n${content.slice(0, 5000)}`;

      const stream = await streamLlmObject({
        schema: LocalizationLlmResponseSchema,
        schemaName: "LocalizationScript",
        schemaDescription: "Multilingual broadcast news summary and translations",
        system: LOCALIZATION_SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.7,
        tier: "structured",
        provider: options.provider,
        model: options.model,
        companyId: options.companyId,
        storyId: options.storyId,
        allowFallback: options.allowFallback,
        customModel: options.customModel,
      });

      return {
        stream,
        normalize: (out) =>
          normalizeLocalizationPayload(
            out as Parameters<typeof normalizeLocalizationPayload>[0]
          ),
      };
    }

    case "data_studio": {
      const personaId = options.personaSlug || options.personaSlugs?.[0] || "ruby";
      const userPrompt = `ARTICLE CONTENT:\n${content.slice(0, 6000)}`;

      const stream = await streamLlmObject({
        schema: DataStudioLlmResponseSchema,
        schemaName: "DataStudioScript",
        schemaDescription: "Financial data intelligence editor and graphic specification",
        system: DATA_STUDIO_SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.6,
        tier: "structured",
        provider: options.provider,
        model: options.model,
        companyId: options.companyId,
        storyId: options.storyId,
        allowFallback: options.allowFallback,
        customModel: options.customModel,
      });

      return {
        stream,
        normalize: (out) =>
          normalizeDataStudioPayload(
            out as Parameters<typeof normalizeDataStudioPayload>[0],
            personaId
          ),
      };
    }

    case "narrative_matrix": {
      const defaultSlugs = ["ruby", "mateo", "blaze"];
      const personaSlugs = options.personaSlugs?.length
        ? options.personaSlugs
        : options.personaSlug
        ? [options.personaSlug, "mateo", "blaze"]
        : defaultSlugs;
      const slugContext = `Use these persona slugs for the 3 perspectives: ${personaSlugs.slice(0, 3).join(", ")}.`;
      const userPrompt = `${slugContext}\n\nARTICLE CONTENT:\n${content.slice(0, 5000)}`;

      const stream = await streamLlmObject({
        schema: NarrativeMatrixLlmResponseSchema,
        schemaName: "NarrativeMatrixScript",
        schemaDescription: "A structured 3-perspective debate segment with arguments and rebuttals",
        system: NARRATIVE_MATRIX_SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.7,
        tier: "reasoning",
        provider: options.provider,
        model: options.model,
        companyId: options.companyId,
        storyId: options.storyId,
        allowFallback: options.allowFallback,
        customModel: options.customModel,
      });

      return {
        stream,
        normalize: (out) =>
          normalizeNarrativeMatrixPayload(
            out as Parameters<typeof normalizeNarrativeMatrixPayload>[0],
            personaSlugs
          ),
      };
    }

    case "debate": {
      const requestedCount: 2 | 3 = options.participantCount || (options.personaSlugs?.length === 2 ? 2 : 3);
      const personaSlugs = options.personaSlugs?.length
        ? options.personaSlugs
        : options.personaSlug
        ? [options.personaSlug, "tomas"]
        : requestedCount === 2
        ? ["ruby", "tomas"]
        : ["ruby", "mateo", "blaze"];
      const slugContext = `Participants: ${requestedCount} personas (${personaSlugs.join(", ")}).`;
      const userPrompt = `${slugContext}\n\nARTICLE / TOPIC CONTENT:\n${content.slice(0, 5000)}`;

      const stream = await streamLlmObject({
        schema: DebateLlmResponseSchema,
        schemaName: "DebateScript",
        schemaDescription: "A structured news debate broadcast script with speakers and turns",
        system: DEBATE_SYSTEM_PROMPT,
        prompt: userPrompt,
        temperature: 0.75,
        tier: "reasoning",
        provider: options.provider,
        model: options.model,
        companyId: options.companyId,
        storyId: options.storyId,
        allowFallback: options.allowFallback,
        customModel: options.customModel,
      });

      return {
        stream,
        normalize: (out) =>
          normalizeDebatePayload(
            out as Parameters<typeof normalizeDebatePayload>[0],
            {
              participantCount: options.participantCount,
              personaSlugs,
              layoutKey: options.layoutKey,
            }
          ),
      };
    }

    default:
      throw new Error(`Unknown studio type: ${studioType}`);
  }
}

/**
 * Streams an article parse progressively as an AsyncGenerator emitting StudioStreamEvents.
 * Yields partial events as tokens stream from the LLM, then yields complete with the
 * final normalized StudioPayload.
 *
 * If streaming fails or throws, gracefully catches and falls back to synchronous parseArticleForStudio.
 */
export async function* streamArticleForStudio(
  studioType: StudioType,
  articleContent: string,
  options: ParseOptions = {}
): AsyncGenerator<StudioStreamEvent, void, unknown> {
  const content = (articleContent || "").trim();
  if (!content) {
    throw new Error("Article content cannot be empty");
  }

  try {
    const { stream, normalize } = await initStudioObjectStream(
      studioType,
      content,
      options
    );

    let maxSceneCount = 0;
    for await (const partial of stream.partialOutputStream) {
      if (partial && typeof partial === "object") {
        const partialObj = partial as Record<string, unknown>;
        const sceneCount = computeSceneCount(studioType, partialObj);
        maxSceneCount = Math.max(maxSceneCount, sceneCount);
        yield {
          type: "partial",
          studioType,
          partial: partialObj,
          sceneCount: maxSceneCount,
        };
      }
    }

    const finalOutput = await stream.output;
    const payload = normalize(finalOutput);
    yield {
      type: "complete",
      studioType,
      payload,
    };
  } catch (streamError) {
    console.warn(
      `[streamArticleForStudio] Stream failed for studioType "${studioType}", falling back to synchronous parseArticleForStudio:`,
      streamError
    );
    const payload = await parseArticleForStudio(studioType, content, options);
    yield {
      type: "complete",
      studioType,
      payload,
    };
  }
}
