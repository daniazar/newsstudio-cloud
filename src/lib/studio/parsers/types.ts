/**
 * src/lib/studio/parsers/types.ts
 *
 * Shared TypeScript interfaces and strict Zod schemas for all studio payload formats.
 * These map 1:1 to the JSON stored in GenerationJob.studioPayload.
 */

import { z } from "zod";
import type { LLMProvider } from "@/lib/types";
import type { AnyLanguageModel } from "@/lib/llm/aiSdkGateway";

export const StudioTypeSchema = z.enum([
  "interview",
  "podcast",
  "vtuber",
  "localization",
  "data_studio",
  "narrative_matrix",
  "debate",
]);

export type StudioType = z.infer<typeof StudioTypeSchema>;

export const StudioOutputModeSchema = z.enum(["audio_only", "video"]);
export type StudioOutputMode = z.infer<typeof StudioOutputModeSchema>;

export const EmotionTagSchema = z.enum([
  "[urgent]",
  "[excited]",
  "[whisper]",
  "[serious]",
  "[calm]",
  "[pause: 0.3s]",
  "[pause: 0.5s]",
  "[pause: 1s]",
]);
export type EmotionTag = z.infer<typeof EmotionTagSchema>;

export const CameraAngleSchema = z
  .string()
  .transform((val) => {
    const v = val.toLowerCase().trim();
    if (v === "host" || v === "host_solo") return "host_solo";
    if (v === "guest" || v === "guest_solo") return "guest_solo";
    if (v === "dual" || v === "dual_shot") return "dual_shot";
    if (v === "wide" || v === "wide_shot") return "wide_shot";
    if (v === "reaction" || v === "reaction_shot") return "reaction_shot";
    return val;
  })
  .pipe(
    z.enum([
      "host_solo",
      "guest_solo",
      "dual_shot",
      "wide_shot",
      "reaction_shot",
    ])
  )
  .catch("dual_shot");
export type CameraAngle = z.infer<typeof CameraAngleSchema>;

export const PacingSchema = z
  .string()
  .transform((val) => {
    const s = val.trim();
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  })
  .pipe(z.enum(["Solemn", "Standard", "Urgent", "Casual"]))
  .catch("Standard");
export type Pacing = z.infer<typeof PacingSchema>;

export interface ParseOptions {
  /** Optional custom API key */
  apiKey?: string;
  /** Optional custom Base URL */
  baseURL?: string;
  /** Persona slugs to assign to roles (ordered by role priority) */
  personaSlugs?: string[];
  /** Single persona slug (for single-presenter modes like VTuber, Data Studio) */
  personaSlug?: string;
  /** Participant count for debates (2 or 3) */
  participantCount?: 2 | 3;
  /** Layout key for debate desk */
  layoutKey?: string;
  /** Explicit LLM provider override ("gemini" | "ollama") */
  provider?: LLMProvider;
  /** Explicit model override */
  model?: string;
  /** Tenant company ID for token and usage tracking */
  companyId?: string | null;
  /** Associated story ID */
  storyId?: string;
  /** Allow fallback between Gemini and Ollama (defaults to true) */
  allowFallback?: boolean;
  /** Custom LanguageModelV4 instance (useful for unit tests and isolated mocking) */
  customModel?: AnyLanguageModel;
}

// ─── Interview Studio ─────────────────────────────────────────────────────

export const InterviewTurnSchema = z.object({
  speakerId: z.string().catch(""),
  text: z.string(),
  cameraAngle: CameraAngleSchema.catch("dual_shot"),
  emotion: z.string().catch("[serious]"),
  pacing: PacingSchema.catch("Standard"),
  generatedImageUrl: z.string().optional(),
  audioPath: z.string().optional(),
  videoPath: z.string().optional(),
});
export type InterviewTurn = z.infer<typeof InterviewTurnSchema>;

export const InterviewLlmResponseSchema = z.object({
  topic: z.string(),
  turns: z.array(InterviewTurnSchema),
});

export const InterviewPayloadSchema = z.object({
  studioType: z.literal("interview"),
  outputMode: StudioOutputModeSchema,
  topic: z.string(),
  turns: z.array(InterviewTurnSchema),
});
export type InterviewPayload = z.infer<typeof InterviewPayloadSchema>;

// ─── Podcast Studio ───────────────────────────────────────────────────────

export const PodcastLineSchema = z.object({
  id: z.string().optional(),
  speakerId: z.string().catch(""),
  text: z.string(),
  language: z
    .string()
    .transform((s) => s.toLowerCase().trim())
    .pipe(z.enum(["en", "es"]))
    .catch("en"),
  pacing: z
    .string()
    .transform((s) => s.toLowerCase().trim())
    .pipe(z.enum(["solemn", "standard", "urgent", "casual"]))
    .catch("standard"),
  audioPath: z.string().optional(),
  videoPath: z.string().optional(),
});
export type PodcastLine = z.infer<typeof PodcastLineSchema> & { id: string };

export const PodcastLlmResponseSchema = z.object({
  title: z.string(),
  lines: z.array(PodcastLineSchema),
});

export const PodcastPayloadSchema = z.object({
  studioType: z.literal("podcast"),
  outputMode: StudioOutputModeSchema,
  title: z.string(),
  lines: z.array(PodcastLineSchema.extend({ id: z.string() })),
  stitchedAudioPath: z.string().optional(),
});
export type PodcastPayload = z.infer<typeof PodcastPayloadSchema>;

// ─── VTuber Studio ────────────────────────────────────────────────────────

export const VTuberReactionMomentSchema = z.object({
  text: z.string(),
  reaction: z.enum(["[excited]", "[serious]", "[urgent]", "[calm]"]).catch("[excited]"),
  chatLine: z.string(),
  timestamp: z.coerce.number().optional(),
  audioPath: z.string().optional(),
  videoPath: z.string().optional(),
});
export type VTuberReactionMoment = z.infer<typeof VTuberReactionMomentSchema>;

export const VTuberLlmResponseSchema = z.object({
  streamTitle: z.string(),
  reactionMoments: z.array(VTuberReactionMomentSchema),
});

export const VTuberPayloadSchema = z.object({
  studioType: z.literal("vtuber"),
  outputMode: StudioOutputModeSchema,
  streamTitle: z.string(),
  mediaUrl: z.string().optional(),
  personaId: z.string(),
  reactionMoments: z.array(VTuberReactionMomentSchema),
  generatedImageUrl: z.string().optional(),
});
export type VTuberPayload = z.infer<typeof VTuberPayloadSchema>;

// ─── Localization Matrix ──────────────────────────────────────────────────

export const LocalizationTrackSchema = z.object({
  language: z.string(),
  languageName: z.string(),
  translatedText: z.string(),
  personaId: z.string(),
  audioPath: z.string().optional(),
  videoPath: z.string().optional(),
});
export type LocalizationTrack = z.infer<typeof LocalizationTrackSchema>;

export const LocalizationRawTrackSchema = z.object({
  language: z.string(),
  languageName: z.string(),
  translatedText: z.string(),
});

export const LocalizationLlmResponseSchema = z.object({
  sourceText: z.string(),
  tracks: z.array(LocalizationRawTrackSchema),
});

export const LocalizationPayloadSchema = z.object({
  studioType: z.literal("localization"),
  outputMode: StudioOutputModeSchema,
  sourceText: z.string(),
  sourceLanguage: z.string(),
  tracks: z.array(LocalizationTrackSchema),
});
export type LocalizationPayload = z.infer<typeof LocalizationPayloadSchema>;

// ─── Data Studio & Motion Graphics ─────────────────────────────────────────

export const DataGraphicTypeSchema = z.enum([
  "candlestick",
  "sparkline",
  "bar_race",
  "gauge",
  "map_tracer",
  "spec_matrix",
  "ticker_tape",
]);
export type DataGraphicType = z.infer<typeof DataGraphicTypeSchema>;

export const DataTickerSchema = z.object({
  symbol: z.coerce.string(),
  label: z.coerce.string(),
  value: z.coerce.string(),
  change: z.coerce.string(),
  direction: z.enum(["up", "down", "flat"]).catch("up"),
});
export type DataTicker = z.infer<typeof DataTickerSchema>;

export const CandleItemSchema = z.object({
  timestamp: z.string().optional(),
  open: z.coerce.number(),
  high: z.coerce.number(),
  low: z.coerce.number(),
  close: z.coerce.number(),
  volume: z.coerce.number().optional(),
  label: z.string().optional(),
});
export type CandleItem = z.infer<typeof CandleItemSchema>;

export const CandlestickDataSchema = z.object({
  type: z.literal("candlestick"),
  symbol: z.string(),
  name: z.string().optional(),
  currentPrice: z.coerce.string(),
  change: z.coerce.string(),
  isPositive: z.boolean(),
  timeframe: z.string().optional(),
  currencySymbol: z.string().optional(),
  candles: z.array(CandleItemSchema),
  highPrice: z.coerce.string().optional(),
  lowPrice: z.coerce.string().optional(),
  supportLevel: z.coerce.string().optional(),
  resistanceLevel: z.coerce.string().optional(),
  calloutText: z.string().optional(),
  accentColor: z.string().optional(),
});
export type CandlestickData = z.infer<typeof CandlestickDataSchema>;

export const SparklinePointSchema = z.object({
  label: z.coerce.string(),
  value: z.coerce.number(),
});
export type SparklinePoint = z.infer<typeof SparklinePointSchema>;

export const SparklineDataSchema = z.object({
  type: z.literal("sparkline"),
  symbol: z.string(),
  title: z.string(),
  currentValue: z.coerce.string(),
  unit: z.string().optional(),
  deltaPercentage: z.coerce.string(),
  isPositive: z.boolean(),
  timeframe: z.string().optional(),
  points: z.array(SparklinePointSchema),
  highAnnotation: z.string().optional(),
  lowAnnotation: z.string().optional(),
  accentColor: z.string().optional(),
});
export type SparklineData = z.infer<typeof SparklineDataSchema>;

export const BarRaceItemSchema = z.object({
  id: z.string().catch(() => Math.random().toString(36).slice(2, 8)),
  label: z.coerce.string(),
  value: z.coerce.number(),
  formattedValue: z.coerce.string().catch(""),
  color: z.string().optional(),
  icon: z.string().optional(),
  delta: z.coerce.string().optional(),
  rank: z.coerce.number().optional(),
  category: z.string().optional(),
});
export type BarRaceItem = z.infer<typeof BarRaceItemSchema>;

export const BarRaceDataSchema = z.object({
  type: z.literal("bar_race"),
  title: z.string(),
  subtitle: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  maxValue: z.number().optional(),
  items: z.array(BarRaceItemSchema),
  accentColor: z.string().optional(),
});
export type BarRaceData = z.infer<typeof BarRaceDataSchema>;

export const GaugeZoneSchema = z.object({
  label: z.string(),
  min: z.number(),
  max: z.number(),
  color: z.string(),
});
export type GaugeZone = z.infer<typeof GaugeZoneSchema>;

export const GaugeDataSchema = z.object({
  type: z.literal("gauge"),
  title: z.string(),
  subtitle: z.string().optional(),
  currentValue: z.number(),
  formattedValue: z.string().optional(),
  minValue: z.number(),
  maxValue: z.number(),
  unit: z.string().optional(),
  sentimentLabel: z.string(),
  zones: z.array(GaugeZoneSchema),
  accentColor: z.string().optional(),
});
export type GaugeData = z.infer<typeof GaugeDataSchema>;

export const MapWaypointSchema = z.object({
  id: z.string(),
  name: z.string(),
  coords: z.tuple([z.number(), z.number()]),
  status: z.enum(["origin", "transit", "destination", "chokepoint", "alert"]).optional(),
  value: z.string().optional(),
  label: z.string().optional(),
  color: z.string().optional(),
});
export type MapWaypoint = z.infer<typeof MapWaypointSchema>;

export const MapRouteSchema = z.object({
  id: z.string(),
  fromId: z.string(),
  toId: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(["normal", "diverted", "blocked", "surge"]).optional(),
  dashSpeed: z.number().optional(),
  curvature: z.number().optional(),
});
export type MapRoute = z.infer<typeof MapRouteSchema>;

export const MapTracerDataSchema = z.object({
  type: z.literal("map_tracer"),
  title: z.string(),
  subtitle: z.string().optional(),
  region: z.enum(["world", "americas", "europe", "asia", "middle_east", "supply_chain_straits"]),
  waypoints: z.array(MapWaypointSchema),
  routes: z.array(MapRouteSchema),
  spotlightNote: z.string().optional(),
  accentColor: z.string().optional(),
});
export type MapTracerData = z.infer<typeof MapTracerDataSchema>;

export const SpecRowSchema = z.object({
  label: z.string(),
  valA: z.string(),
  valB: z.string(),
  winner: z.enum(["A", "B", "tie"]).optional(),
  unit: z.string().optional(),
  note: z.string().optional(),
});
export type SpecRow = z.infer<typeof SpecRowSchema>;

export const SpecMatrixDataSchema = z.object({
  type: z.literal("spec_matrix"),
  title: z.string(),
  subtitle: z.string().optional(),
  itemA: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    badge: z.string().optional(),
    accentColor: z.string().optional(),
    avatarUrl: z.string().optional(),
  }),
  itemB: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    badge: z.string().optional(),
    accentColor: z.string().optional(),
    avatarUrl: z.string().optional(),
  }),
  rows: z.array(SpecRowSchema),
  verdict: z.string().optional(),
  accentColor: z.string().optional(),
});
export type SpecMatrixData = z.infer<typeof SpecMatrixDataSchema>;

export const DataGraphicConfigSchema = z.discriminatedUnion("type", [
  CandlestickDataSchema,
  SparklineDataSchema,
  BarRaceDataSchema,
  GaugeDataSchema,
  MapTracerDataSchema,
  SpecMatrixDataSchema,
]);
export type DataGraphicConfig = z.infer<typeof DataGraphicConfigSchema>;

export const DataStudioLlmResponseSchema = z.object({
  headline: z.string().optional(),
  summary: z.string().optional(),
  graphicType: DataGraphicTypeSchema.catch("sparkline"),
  graphicConfig: z.record(z.string(), z.unknown()).optional(),
  tickers: z.array(DataTickerSchema).optional(),
});

export const DataStudioPayloadSchema = z.object({
  studioType: z.literal("data_studio"),
  outputMode: StudioOutputModeSchema,
  headline: z.string(),
  summary: z.string(),
  graphicType: DataGraphicTypeSchema,
  graphicConfig: DataGraphicConfigSchema.optional(),
  tickers: z.array(DataTickerSchema),
  personaId: z.string(),
  audioPath: z.string().optional(),
  videoPath: z.string().optional(),
  generatedImageUrl: z.string().optional(),
});
export type DataStudioPayload = z.infer<typeof DataStudioPayloadSchema>;

// ─── Narrative Matrix ─────────────────────────────────────────────────────

export const NarrativePerspectiveSchema = z.object({
  role: z.string().catch("Analyst"),
  personaId: z.string().catch(""),
  argumentText: z.string(),
  rebuttal: z.string().optional(),
  cameraAngle: CameraAngleSchema.catch("host_solo"),
  generatedImageUrl: z.string().optional(),
  audioPath: z.string().optional(),
  videoPath: z.string().optional(),
});
export type NarrativePerspective = z.infer<typeof NarrativePerspectiveSchema>;

export const NarrativeMatrixLlmResponseSchema = z.object({
  topic: z.string(),
  perspectives: z.array(NarrativePerspectiveSchema),
});

export const NarrativeMatrixPayloadSchema = z.object({
  studioType: z.literal("narrative_matrix"),
  outputMode: StudioOutputModeSchema,
  topic: z.string(),
  perspectives: z.array(NarrativePerspectiveSchema),
});
export type NarrativeMatrixPayload = z.infer<typeof NarrativeMatrixPayloadSchema>;

// ─── News Studio Debate (2 or 3 Personas) ─────────────────────────────────

export const DebateSpeakerConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().catch("Debater"),
  stance: z.string().catch("OPINION"),
  location: z.string().catch("STUDIO"),
  accentColor: z.string().optional(),
  avatarUrl: z.string().optional(),
  videoSrc: z.string().optional(),
});
export type DebateSpeakerConfig = z.infer<typeof DebateSpeakerConfigSchema>;

export const DebateCameraCueSchema = z
  .string()
  .transform((val) => {
    const v = val.toLowerCase().trim();
    if (v === "desk" || v === "desk_master") return "desk_master";
    if (v === "split" || v === "split_screen") return "split_screen";
    if (v === "solo" || v === "solo_speaker") return "solo_speaker";
    return val;
  })
  .pipe(z.enum(["desk_master", "split_screen", "solo_speaker"]))
  .catch("split_screen");
export type DebateCameraCue = z.infer<typeof DebateCameraCueSchema>;

export const DebateTurnSchema = z.object({
  id: z.string(),
  speakerId: z.string().catch(""),
  speakerName: z.string().catch("Debater"),
  stance: z.string().catch("OPINION"),
  text: z.string(),
  emotion: z.string().catch("[serious]"),
  cameraCue: DebateCameraCueSchema,
  roundName: z.string().catch("ROUND"),
  pacing: PacingSchema.optional(),
  audioPath: z.string().optional(),
  videoPath: z.string().optional(),
  generatedImageUrl: z.string().optional(),
});
export type DebateTurn = z.infer<typeof DebateTurnSchema>;

export const DebateLlmResponseSchema = z.object({
  topic: z.string(),
  participantCount: z.union([z.literal(2), z.literal(3)]).optional(),
  speakers: z.array(DebateSpeakerConfigSchema),
  turns: z.array(
    DebateTurnSchema.omit({ id: true }).extend({
      id: z.string().optional(),
    })
  ),
});

export const DebatePayloadSchema = z.object({
  studioType: z.literal("debate"),
  outputMode: StudioOutputModeSchema,
  topic: z.string(),
  participantCount: z.union([z.literal(2), z.literal(3)]),
  layoutKey: z.string().optional(),
  deskMasterImageSrc: z.string().optional(),
  speakers: z.array(DebateSpeakerConfigSchema),
  turns: z.array(DebateTurnSchema),
  generatedImagesMap: z.record(z.string(), z.string()).optional(),
  stitchedAudioPath: z.string().optional(),
});
export type DebatePayload = z.infer<typeof DebatePayloadSchema>;

// ─── Union ────────────────────────────────────────────────────────────────

export const StudioPayloadSchema = z.union([
  InterviewPayloadSchema,
  PodcastPayloadSchema,
  VTuberPayloadSchema,
  LocalizationPayloadSchema,
  DataStudioPayloadSchema,
  NarrativeMatrixPayloadSchema,
  DebatePayloadSchema,
]);
export type StudioPayload = z.infer<typeof StudioPayloadSchema>;
