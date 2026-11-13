/**
 * src/components/editor/shared/sceneDetail/types.ts
 *
 * Types, interfaces, and static constants for SceneDetailPanel.
 */

import { CameraCue } from "@/lib/types/stateMachine";

export interface Segment {
  index: number;
  id: string;
  text: string;
  spokenText?: string | null;
  imagePrompt: string;
  startTime: number;
  endTime: number;
  assetPath?: string | null;
  assetType?: string | null;
  audioPath?: string | null;
  audioUrl?: string | null;
  mediaSettings?: string | null;
  keyword?: string | null;
  backupKeywords?: string[];
  actionLoop?: string | null;
  cameraCue?: CameraCue | string | null;
  personaId?: string | null;
  personaAvatarUrl?: string | null;
}

export interface VideoSettings {
  bgMusicPath?: string | null;
  bgMusicVolume?: number | null;
  sloganId?: string | null;
  outroId?: string | null;
  captionStyle?: string | null;
  voiceId?: string | null;
}

export interface SceneDetailPanelProps {
  segment: Segment | null;
  totalScenes?: number;
  articleImageUrls?: string[] | null;
  videoSettings?: VideoSettings | null;
  onUpdateText: (index: number, text: string, spokenText?: string | null) => void;
  onUpdateMediaSettings: (index: number, settings: string, extraFields?: Record<string, unknown>) => void;
  onUpdateAsset?: (index: number, url: string, type: "video" | "image") => void;
  onUpdateVideoSettings?: (data: Record<string, unknown>) => void;
  onRegenerateBRoll: (index: number) => void;
  onDeleteScene?: (segmentId: string) => void;
  onPlayAudio?: (segmentIndex: number, textOverride?: string) => void;
  onRegenerateAudio?: (segmentIndex: number, textOverride?: string) => Promise<void>;
  onClose: () => void;
  onSelectPresenterTab?: () => void;
  onUpdateSegmentPersona?: (index: number, personaId: string) => void;
  onUpdateSegmentAvatar?: (index: number, url: string) => void;
  onUpdateSegmentActionLoop?: (index: number, actionLoop: string, videoUrl?: string, avatarUrl?: string) => void;
  voiceEngine?: string;
  storyId?: string;
}

export interface MediaSettingsData {
  scale: number;
  offsetX: number;
  offsetY: number;
  presenterScale?: number;
  presenterOffsetX?: number;
  presenterOffsetY?: number;
  layoutMode?: string;
  startTrim: number;
  endTrim: number;
  transitionType: string;
  backgroundPrompt: string;
  stickers: string[];
  speakerName: string;
  speakerTitle: string;
  objectFit: string;
  sceneStrategy: string;
  actionLoop: string;
  cameraCue: CameraCue;
}

export const DEFAULT_MEDIA_SETTINGS: MediaSettingsData = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  startTrim: 0,
  endTrim: 0,
  transitionType: "fade",
  backgroundPrompt: "",
  stickers: [] as string[],
  speakerName: "",
  speakerTitle: "",
  objectFit: "cover",
  sceneStrategy: "chroma_broll",
  actionLoop: "state_idle",
  cameraCue: "cam1_wide" as CameraCue,
};

export const OUTROS = [
  { id: "subscribe", text: "Subscribe for more daily tech updates!", icon: "🔔" },
  { id: "next-time", text: "See you next time on Ruby Tech News.", icon: "🎬" },
  { id: "stay-curious", text: "Stay curious, stay informed. Goodbye!", icon: "🧠" },
];

export const TRANSITIONS = [
  { id: "fade", name: "Crossfade", icon: "✨" },
  { id: "slide", name: "Slide Left", icon: "➡️" },
  { id: "zoom", name: "Zoom In", icon: "🔍" },
  { id: "glitch", name: "Glitch Blur", icon: "⚡" },
];

export const STICKERS = [
  { id: "link-in-bio", name: "Link in Bio", icon: "🔗" },
  { id: "swipe-up", name: "Swipe Up", icon: "👆" },
  { id: "like-share", name: "Like & Share", icon: "❤️" },
  { id: "new-video", name: "New Video", icon: "🆕" },
];

export const VOICES = [
  { id: "en-US-Standard-C", name: "Ruby (Pro)", icon: "👩‍💼" },
  { id: "en-US-Standard-D", name: "Alex (Hype)", icon: "🔥" },
  { id: "en-GB-Standard-B", name: "Oliver (British)", icon: "🇬🇧" },
  { id: "en-US-News-K", name: "Sarah (News)", icon: "🎙️" },
];

export const resolveClientSrc = (src?: string | null) => {
  if (!src) return "";
  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("/")
  ) {
    return src;
  }
  const hostname = typeof window !== "undefined" ? window.location.hostname : "localhost";
  return `http://${hostname}:9000/news-studio/${src}`;
};
