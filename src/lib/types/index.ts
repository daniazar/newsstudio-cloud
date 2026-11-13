// ============================================================
// Status Enums (mapped as strings in SQLite)
// ============================================================

export const StoryStatus = {
  INGESTED: "INGESTED",
  SCRAPING: "SCRAPING",
  SCRAPED: "SCRAPED",
  SCRIPTING: "SCRIPTING",
  SCRIPTED: "SCRIPTED",
  IN_PRODUCTION: "IN_PRODUCTION",
  ASSETS_READY: "ASSETS_READY",
  RENDERING: "RENDERING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type StoryStatus = (typeof StoryStatus)[keyof typeof StoryStatus];

export const VideoStatus = {
  PENDING: "PENDING",
  AWAITING_VOICE: "AWAITING_VOICE",
  AWAITING_VIDEO: "AWAITING_VIDEO",
  ASSETS_READY: "ASSETS_READY",
  RENDERING: "RENDERING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
} as const;

export type VideoStatus = (typeof VideoStatus)[keyof typeof VideoStatus];

export const AspectRatio = {
  VERTICAL: "vertical",
  HORIZONTAL: "horizontal",
  SQUARE: "square",
} as const;

export type AspectRatio = (typeof AspectRatio)[keyof typeof AspectRatio];

// ============================================================
// RSS / Ingestion Types
// ============================================================

export interface StoryInput {
  title: string;
  link: string;
  description: string;
  author?: string;
  pubDate?: Date;
  guid: string;
  category?: string;
  feedId: string;
}

export interface IngestResult {
  feedId: string;
  feedName: string;
  totalItems: number;
  newItems: number;
  skippedItems: number;
  errors: string[];
}

// ============================================================
// Article Scraper Types
// ============================================================

export interface ScrapedArticle {
  title: string;
  content: string;
  author?: string;
  publishedDate?: string;
  wordCount: number;
  excerpt?: string;
  images?: string[];
}

export interface ScrapeResult {
  success: boolean;
  article?: ScrapedArticle;
  error?: string;
  fallbackUsed: boolean;
  tierUsed?: "readability" | "firecrawl" | "puppeteer" | "rss_fallback";
}

// ============================================================
// LLM / Script Types
// ============================================================

export interface ScriptSegment {
  index: number;
  start_time: number;
  end_time: number;
  text: string;
  image_prompt: string;
  source_media_url?: string | null;
}

export interface ScriptOutput {
  headline: string;
  segments: ScriptSegment[];
  youtube_title?: string;
  youtube_description?: string;
  youtube_tags?: string[];
  instagram_caption?: string;
  instagram_hashtags?: string[];
}

export type SegmentDraft = {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
  spokenText?: string | null;
  imagePrompt: string;
  assetType?: string | null;
  assetPath?: string | null;
  mediaSettings?: string | null;
  personaId?: string | null;
  voiceParams?: string | null;
  sceneStrategy?: SceneStrategy | string | null;
};

export type SceneStrategy =
  | "in_environment"
  | "chroma_broll"
  | "multi_anchor"
  | "infographic_ticker"
  | "bubble"
  | "transparent_anchor"
  | "full"
  | "ltx_full_portrait"
  | "ltx_green_screen";

export type LLMProvider = "gemini" | "ollama" | "openai-compatible";

export interface LLMProviderConfig {
  provider: LLMProvider;
  model: string;
  baseUrl?: string;
  apiKey?: string;
}

// ============================================================
// Asset Monitor Types
// ============================================================

export interface AssetCheckResult {
  videoId: string;
  hasPresenterVideo: boolean;
  hasPresenterAudio: boolean;
  hasBRollAssets: boolean;
  presenterVideoPath?: string;
  presenterAudioPath?: string;
  bRollPaths: string[];
  isComplete: boolean;
}

import type { Persona } from "@/lib/tts/personas";

export interface PresenterConfig {
  avatarSrc?: string;
  scale?: number;
  layoutMode?: string;
  offsetX?: number;
  offsetY?: number;
  bubbleFaceZoom?: number;
  bubbleFaceOffsetY?: number;
  bubbleFaceOffsetX?: number;
  personaId?: string;
  presenterName?: string;
  roleTag?: string;
  showNametag?: boolean;
  enabled?: boolean;
  selectedActionLoopId?: string;
  selectedAttireId?: string;
  [key: string]: unknown;
}

export interface TickerItem {
  id?: string;
  symbol?: string;
  value?: string;
  change?: string;
  isPositive?: boolean;
  headline?: string;
  category?: string;
  source?: string;
  urgency?: "breaking" | "developing" | "standard";
}

// ============================================================
// Remotion Composition Types
// ============================================================

export interface CompositionProps {
  aspectRatio: AspectRatio;
  segments: RemotionSegment[];
  presenterVideoSrc?: string;
  presenterImageSrc?: string;
  audioSrc?: string;
  globalBgVideoSrc?: string;
  bgMusicSrc?: string;
  bgMusicVolume?: number;
  sloganId?: string;
  outroId?: string;
  voiceId?: string;
  showSafeZones?: boolean;
  captionStyle?: string;
  clonedPersonas?: Persona[];
  watermarkSrc?: string;
  brandPrimaryColor?: string;
  brandSecondaryColor?: string;
  introVideoSrc?: string;
  outroVideoSrc?: string;
  logoSrc?: string;
  /** Presenter rendering mode — "bubble", "state_machine", "streamer", or "3camera_broadcast" */
  presenterMode?: "bubble" | "state_machine" | "streamer" | "3camera_broadcast";
  /** Active camera cue for broadcast composition override */
  activeCam?: CameraCue;
  /** VTuber/Streamer mode: render the animated stream chat overlay on the right side */
  showStreamChat?: boolean;
  /** Custom stream chat messages. Falls back to default demo messages if omitted. */
  streamChatMessages?: Array<{
    id: string;
    user: string;
    color: string;
    text: string;
    badge?: string;
    startFrame: number;
  }>;
  /** Global data graphic overlay configuration */
  dataGraphic?: DataGraphicConfig;
  /** Show live broadcast breaking news & financial marquee ticker tape */
  showTickerTape?: boolean;
  /** Optional custom ticker items for the ticker tape */
  tickerItems?: TickerItem[];
  /** Custom marquee breaking ticker headlines text */
  customTickerText?: string;
  /** Video language code (e.g. 'es', 'en', 'pt', 'es-AR') */
  language?: string;
  /** Enable automated sound effects (whooshes, pops, stingers) */
  sfxEnabled?: boolean;
  /** Virtual Studio 360 background plate ID */
  studioSetId?: StudioSetId;
  /** Multi-track stem volume overrides (0.0 to 1.5) */
  stemVolumes?: {
    voice?: number;
    music?: number;
    sfx?: number;
    ambience?: number;
  };
  /** Ambient room tone / studio chatter sound effect */
  ambienceTrackPath?: string;
  /** Dual-language subtitles mode: displays secondary translated text underneath primary kinetic captions */
  enableDualCaptions?: boolean;
  /** Custom secondary subtitle text color (default: rgba(255,255,255,0.92)) */
  secondaryCaptionColor?: string;
  /** Layer visibility toggles */
  showPresenter?: boolean;
  showCaptions?: boolean;
  showHeadline?: boolean;
  showCitationBadge?: boolean;
  showBrandLogo?: boolean;
  showBackdrop?: boolean;
  showIntro?: boolean;
  showOutro?: boolean;
  /** Layer positioning and scale offsets */
  brandLogoOffsetX?: number;
  brandLogoOffsetY?: number;
  brandLogoScale?: number;
  citationBadgeOffsetX?: number;
  citationBadgeOffsetY?: number;
  tickerTapeOffsetY?: number;
  /** Presenter framing, scale, layoutMode, and avatar settings */
  presenterConfig?: PresenterConfig;
  presenterScale?: number;
  presenterLayoutMode?: string;
  presenterOffsetX?: number;
  presenterOffsetY?: number;
  presenterBubbleFaceZoom?: number;
  presenterBubbleFaceOffsetY?: number;
  presenterBubbleFaceOffsetX?: number;
}

export type StudioSetId =
  | "highrise_newsroom"
  | "financial_trading"
  | "cyber_metropolis"
  | "podcast_loft"
  | "field_breaking"
  | "minimal_studio";

export interface StudioSetPreset {
  id: StudioSetId;
  name: string;
  category: "Broadcast" | "Financial" | "Tech" | "Field" | "Studio";
  bgUrl: string;
  description: string;
}

export const STUDIO_SETS: StudioSetPreset[] = [
  {
    id: "highrise_newsroom",
    name: "🏢 High-Rise Skyline Studio",
    category: "Broadcast",
    bgUrl: "/studio_environments/studio_plate_standup_skyline_9x16.jpg",
    description: "Floor-to-ceiling glass panoramic skyline with broadcast anchor lighting.",
  },
  {
    id: "financial_trading",
    name: "📈 Financial Trading Wall",
    category: "Financial",
    bgUrl: "/studio_environments/studio_plate_financial_trading_9x16.jpg",
    description: "Dynamic ticker video wall with multi-screen market data telemetry.",
  },
  {
    id: "cyber_metropolis",
    name: "🌃 Cyber Command Center",
    category: "Tech",
    bgUrl: "/studio_environments/studio_plate_cyber_command_9x16.jpg",
    description: "Deep neon cyan & purple futuristic cityscape with holographic cyc.",
  },
  {
    id: "podcast_loft",
    name: "☕ Penthouse Broadcast Lounge",
    category: "Tech",
    bgUrl: "/studio_environments/studio_plate_penthouse_lounge_9x16.jpg",
    description: "Cozy conversational penthouse lounge with warm ambient lighting.",
  },
  {
    id: "field_breaking",
    name: "🚨 Breaking News War Room",
    category: "Field",
    bgUrl: "/studio_environments/studio_plate_breaking_red_alert_9x16.jpg",
    description: "High-alert red broadcast command room for critical breaking developments.",
  },
  {
    id: "minimal_studio",
    name: "✨ Futuristic Trading Stage",
    category: "Studio",
    bgUrl: "/studio_environments/studio_plate_futuristic_financial_floor.jpg",
    description: "Clean dark futuristic broadcast floor with wide LED video walls.",
  },
];

export type KenBurnsDirection = "push_in" | "pull_out" | "pan_left" | "pan_right" | "tilt_up" | "static";

import { VoiceParams } from "../tts/voicePresets";
import type {
  AnchorStateId,
  ActionStateId,
  CameraCue,
  AnchorEmotion,
  RhetoricAction,
  EnergyLevel,
  DirectorMode,
  ActionLoopMetadata,
} from "./stateMachine";
import type {
  DataGraphicConfig,
  CandlestickData,
  SparklineData,
  BarRaceData,
  GaugeData,
  MapTracerData,
  SpecMatrixData,
  DataGraphicType,
  DataTicker,
} from "../studio/parsers/types";

export type {
  AnchorStateId,
  ActionStateId,
  CameraCue,
  AnchorEmotion,
  RhetoricAction,
  EnergyLevel,
  DirectorMode,
  ActionLoopMetadata,
};
export { ACTION_MATRIX_GESTURES, CAMERA_CUES, ANCHOR_STATES, ANCHOR_TRANSITIONS } from "./stateMachine";
export type {
  DataGraphicConfig,
  CandlestickData,
  SparklineData,
  BarRaceData,
  GaugeData,
  MapTracerData,
  SpecMatrixData,
  DataGraphicType,
  DataTicker,
};
import type { PersonaLook } from "@/lib/wardrobe/personaLookTypes";
export type { PersonaLook };

export interface RemotionSegment {
  index: number;
  startFrame: number;
  endFrame: number;
  text: string;
  /** Phonetically normalized audio script used for TTS synthesis */
  spokenText?: string | null;
  /** Secondary translated subtitle text for dual-language caption overlays */
  secondaryText?: string;
  keywords?: string[];
  duration?: number;
  imagePrompt?: string;
  bRollSrc?: string;
  bRollType?: "video" | "image" | "placeholder" | "prerendered_clip";
  transitionType?: string;
  stickers?: string[] | null;
  backgroundPrompt?: string | null;
  mediaSettings?: {
    startTrim?: number;
    endTrim?: number;
    scale?: number;
    offsetX?: number;
    offsetY?: number;
    presenterScale?: number;
    presenterOffsetX?: number;
    presenterOffsetY?: number;
    layoutMode?: string;
    objectFit?: "cover" | "contain";
    actionLoop?: string;
    cameraCue?: CameraCue;
    sceneStrategy?: string;
    speakerName?: string;
    speakerTitle?: string;
    dataGraphic?: DataGraphicConfig;
    studioSetId?: StudioSetId;
    kenBurnsDirection?: KenBurnsDirection;
    coAnchorId?: string;
    bubbleFaceZoom?: number;
    bubbleFaceOffsetY?: number;
    bubbleFaceOffsetX?: number;
  };
  personaId?: string;
  voiceParams?: VoiceParams;
  /** Speaker role — 'ruby' (default) or 'guest' */
  speaker?: string | null;
  /** Direct URL for the pre-rendered audio for this segment (VoiceLayer) */
  audioUrl?: string;
  /** Alternative audio source URL alias for broadcast compositions */
  audioSrc?: string;
  /** Storage key / relative asset path for the segment audio */
  audioPath?: string;
  /** Per-segment lip-sync video generated by InfiniteTalk. Overrides the global presenterVideoSrc. */
  presenterVideoSrc?: string;
  /** Per-segment presenter still image fallback */
  presenterImageSrc?: string;
  personaAvatarUrl?: string;
  speakerName?: string;
  /** Anchor persona name alias for broadcast lower thirds */
  personaName?: string;
  speakerTitle?: string;
  sceneStrategy?: string | null;
  /** Parameterized motion data graphic configuration for this segment */
  dataGraphic?: DataGraphicConfig;
  /** State machine target state: 'standing_wide' | 'seated_desk' | 'face_closeup' */
  targetState?: AnchorStateId;
  /** Specific action loop override (e.g. 'state_idle', 'state_gesture_left', 'state_explaining', 'state_pointing_screen') */
  actionLoop?: string;
  /** Specific 3-camera cue override ('cam1_wide' | 'cam2_left' | 'cam3_closeup') */
  cameraCue?: CameraCue;
  /** Pre-rendered transition video URL leading into this segment */
  transitionVideoSrc?: string;
  /** Anchor emotional affect for director engine: neutral, upbeat, grave, analytical, empathetic */
  emotion?: AnchorEmotion;
  /** Anchor rhetorical gesture typology: little_movement, explaining, emphasizing, comparing, etc. */
  rhetoricAction?: RhetoricAction;
  /** Energy level: low, medium, high */
  energyLevel?: EnergyLevel;
  /** Master pose state: M1, M2, M3, M4, M5 */
  poseState?: "M1" | "M2" | "M3" | "M4" | "M5";
  /** Assigned Multi-Loop Persona Look (Phase 5) */
  personaLook?: PersonaLook;
}

// ============================================================
// Pipeline Step Types (for UI)
// ============================================================

export const PipelineSteps = [
  "SCRAPING",
  "SCRIPTING",
  "AWAITING_VOICE",
  "AWAITING_VIDEO",
  "RENDERING",
  "COMPLETED",
] as const;

export type PipelineStep = (typeof PipelineSteps)[number];

export interface PipelineStepInfo {
  id: PipelineStep;
  label: string;
  description: string;
}

export const PIPELINE_STEP_INFO: PipelineStepInfo[] = [
  {
    id: "SCRAPING",
    label: "Scraping",
    description: "Fetching & parsing the full article",
  },
  {
    id: "SCRIPTING",
    label: "Scripting",
    description: "Ruby is writing the script with AI",
  },
  {
    id: "AWAITING_VOICE",
    label: "Awaiting Voice",
    description: "Waiting for TTS voice generation",
  },
  {
    id: "AWAITING_VIDEO",
    label: "Awaiting Video",
    description: "Waiting for Wan 2.2 & LivePortrait assets",
  },
  {
    id: "RENDERING",
    label: "Final Rendering",
    description: "Remotion is compositing the video",
  },
  {
    id: "COMPLETED",
    label: "Complete",
    description: "Video is ready in the vault",
  },
];

export * from "./ecommerce";
export * from "./brand";
