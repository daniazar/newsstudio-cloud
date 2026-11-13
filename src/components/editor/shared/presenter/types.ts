/**
 * src/components/editor/shared/presenter/types.ts
 *
 * Shared types, action loop options, and attire configurations
 * for PresenterStudioPanel.
 */

import { CameraCue } from "@/lib/types/stateMachine";
import type { UseModernTtsReturn } from "@/lib/tts/useModernTts";

export type PresenterTtsClient = UseModernTtsReturn & {
  clonedPersonas?: Array<{ id: string; name?: string; avatarUrl?: string; avatars?: string[] }>;
};

export interface PresenterBatchProgressState {
  generatingIds: Set<string>;
  setGeneratingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  generationMessages: Record<string, string>;
  setGenerationMessages: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  startBatch: (total: number) => void;
  updateProgress: (done: number, title: string, message: string, progress?: number) => void;
  finishBatch: () => void;
  done: number;
  [key: string]: unknown;
}

export type ModelSize = "musetalk" | "ditto" | "sadtalker" | "1.3b" | "14b" | "ltx" | "eros" | "sulphur" | "veo" | "minimax";

export interface ActionLoopOption {
  id: string;
  name: string;
  pose: string;
  category: "Home / Clasped" | "Right Explanatory" | "Open Two Hands" | "Left Presentation" | "Lean / Thinking" | "Transitions" | "Classic Master";
  icon: string;
  desc: string;
}

export const BROADCAST_ACTION_LOOPS: ActionLoopOption[] = [
  // Veo Burgundy M1 Clasped Neutral
  { id: "ruby_burgundy_M1_loop_v1", name: "M1 Clasped Loop v1", pose: "M1", category: "Home / Clasped", icon: "🧘", desc: "Waist-up neutral clasped hands base loop" },
  { id: "ruby_burgundy_M1_loop_v2", name: "M1 Clasped Loop v2", pose: "M1", category: "Home / Clasped", icon: "🧘", desc: "Waist-up neutral clasped hands variation" },
  { id: "ruby_burgundy_M1_dynamic_v1", name: "M1 Dynamic Emphasis", pose: "M1", category: "Home / Clasped", icon: "⚡", desc: "Clasped hands slight lean dynamic emphasis" },
  { id: "ruby_burgundy_M1_hair_adjust_v1", name: "M1 Hair Adjust", pose: "M1", category: "Home / Clasped", icon: "✨", desc: "Natural candid hair adjustment gesture" },
  
  // Veo Burgundy M2 Right Explanatory
  { id: "ruby_burgundy_M2_loop_v1", name: "M2 Right Explanatory v1", pose: "M2", category: "Right Explanatory", icon: "👉", desc: "Right hand raised explanatory articulation" },
  { id: "ruby_burgundy_M2_loop_v2", name: "M2 Right Explanatory v2", pose: "M2", category: "Right Explanatory", icon: "👉", desc: "Right hand raised presentation variation" },
  { id: "ruby_burgundy_M2_dynamic_v1", name: "M2 Right Dynamic", pose: "M2", category: "Right Explanatory", icon: "🌊", desc: "Right hand emphatic gesture sweep" },

  // Veo Burgundy M3 Open Two Hands
  { id: "ruby_burgundy_M3_loop_v1", name: "M3 Open Hands v1", pose: "M3", category: "Open Two Hands", icon: "👐", desc: "Two hands open balanced presentation" },
  { id: "ruby_burgundy_M3_loop_v2", name: "M3 Open Hands v2", pose: "M3", category: "Open Two Hands", icon: "👐", desc: "Two hands open balanced welcome variation" },
  { id: "ruby_burgundy_M3_dynamic_v1", name: "M3 Open Dynamic", pose: "M3", category: "Open Two Hands", icon: "⚖️", desc: "Two hands alternating comparison" },

  // Veo Burgundy M4 Left Hand Presentation
  { id: "ruby_burgundy_M4_loop_v1", name: "M4 Left Hand v1", pose: "M4", category: "Left Presentation", icon: "👈", desc: "Left hand explanatory sweep" },
  { id: "ruby_burgundy_M4_loop_v2", name: "M4 Left Hand v2", pose: "M4", category: "Left Presentation", icon: "👈", desc: "Left hand presentation variation" },
  { id: "ruby_burgundy_M4_dynamic_v1", name: "M4 Left Dynamic", pose: "M4", category: "Left Presentation", icon: "👈", desc: "Left hand emphatic gesture" },
  { id: "ruby_burgundy_M4_hair_adjust_v1", name: "M4 Hair Adjust", pose: "M4", category: "Left Presentation", icon: "✨", desc: "Natural candid hair tuck" },

  // Veo Burgundy M5 Lean / Thinking
  { id: "ruby_burgundy_M5_loop_v1", name: "M5 Thinking Lean v1", pose: "M5", category: "Lean / Thinking", icon: "🤔", desc: "Analytical head tilt and lean" },
  { id: "ruby_burgundy_M5_loop_v2", name: "M5 Thinking Lean v2", pose: "M5", category: "Lean / Thinking", icon: "🤔", desc: "Analytical listening posture" },
  { id: "ruby_burgundy_M5_dynamic_v1", name: "M5 Thinking Dynamic", pose: "M5", category: "Lean / Thinking", icon: "💡", desc: "Investigative analytical shift" },

  // Transitions
  { id: "ruby_burgundy_T1_to_2", name: "T1→2 Clasped to Right Hand", pose: "T12", category: "Transitions", icon: "🔄", desc: "Seamless transition from M1 to M2" },
  { id: "ruby_burgundy_T2_to_1", name: "T2→1 Right Hand to Clasped", pose: "T21", category: "Transitions", icon: "🔄", desc: "Seamless transition from M2 to M1" },
  { id: "ruby_burgundy_T1_to_4", name: "T1→4 Clasped to Left Hand", pose: "T14", category: "Transitions", icon: "🔄", desc: "Seamless transition from M1 to M4" },
  { id: "ruby_burgundy_T4_to_1", name: "T4→1 Left Hand to Clasped", pose: "T41", category: "Transitions", icon: "🔄", desc: "Seamless transition from M4 to M1" },
  { id: "ruby_burgundy_T2_to_4", name: "T2→4 Right to Left Hand", pose: "T24", category: "Transitions", icon: "🔄", desc: "Seamless transition across hands" },
  { id: "ruby_burgundy_T4_to_2", name: "T4→2 Left to Right Hand", pose: "T42", category: "Transitions", icon: "🔄", desc: "Seamless transition across hands" },

  // Classic Master Suite
  { id: "ruby_intro_welcome", name: "Ruby Intro Welcome", pose: "Classic", category: "Classic Master", icon: "👐", desc: "Classic studio welcome" },
  { id: "ruby_emphasis_nod", name: "Ruby Emphasis Nod", pose: "Classic", category: "Classic Master", icon: "👍", desc: "Classic confident nod" },
  { id: "ruby_idle", name: "Ruby Neutral Idle", pose: "Classic", category: "Classic Master", icon: "🧘", desc: "Classic resting base" },
  { id: "ruby_breaking_alert", name: "Ruby Breaking Alert", pose: "Classic", category: "Classic Master", icon: "🚨", desc: "High-alert breaking news stance" },
  { id: "ruby_deep_thought_analyst", name: "Ruby Deep Thought", pose: "Classic", category: "Classic Master", icon: "💡", desc: "Analytical thought stance" },
  { id: "ruby_look_down_notes", name: "Ruby Look Down Notes", pose: "Classic", category: "Classic Master", icon: "📑", desc: "Teleprompter / notes glance" },
  { id: "ruby_signoff_outro", name: "Ruby Signoff Outro", pose: "Classic", category: "Classic Master", icon: "✨", desc: "Warm sign-off smile" },
];

export interface PersonaAttire {
  id: string;
  name: string;
  icon: string;
  badge: string;
  description: string;
  type: "chroma_loops" | "in_environment" | "avatar_bubble";
  thumbnailUrl?: string;
  defaultStudioBgId?: string;
  actionLoopsAvailable?: boolean;
}

export function getPersonaAttires(personaId: string, avatarUrl?: string | null): PersonaAttire[] {
  const normId = (personaId || "ruby").toLowerCase();

  if (normId === "ruby" || normId === "ruby_vance") {
    return [
      {
        id: "ruby_blue_dress_chroma",
        name: "Royal Blue Dress (Chroma Loops)",
        icon: "👗",
        badge: "10 HD Action Loops",
        description: "Green-screen master loops. Scene 1 uses a 3D studio background plate; scenes 2+ are transparent over B-Roll via WebGL shader.",
        type: "chroma_loops",
        thumbnailUrl: "/avatars/master_ruby_archive/chroma_master_poses/ruby_chroma_cam01_center_wide_0deg.mp4",
        defaultStudioBgId: "studio_plate_videowall_standup_9x16",
        actionLoopsAvailable: true,
      },
      {
        id: "ruby_green_suit_studio",
        name: "Emerald Green Suit (Virtual Studio)",
        icon: "👔",
        badge: "Direct Virtual Set",
        description: "Full in-environment 3D newsroom set. Scene 1 renders direct anchor studio framing.",
        type: "in_environment",
        thumbnailUrl: "/avatars/ruby.png",
        defaultStudioBgId: "studio_plate_standup_skyline_9x16",
        actionLoopsAvailable: false,
      },
      {
        id: "ruby_avatar_bubble",
        name: "Avatar Bubble (MuseTalk Realtime)",
        icon: "🫧",
        badge: "Corner Bubble",
        description: "Floating broadcast anchor bubble with 40+ FPS MuseTalk neural visemes over B-Roll.",
        type: "avatar_bubble",
        thumbnailUrl: avatarUrl || "/avatars/ruby.png",
        actionLoopsAvailable: false,
      },
    ];
  }

  if (normId === "mateo") {
    return [
      {
        id: "mateo_charcoal_suit_chroma",
        name: "Charcoal Grey Suit (37 HD Action Loops)",
        icon: "👔",
        badge: "37 HD Action Loops",
        description: "Option A 16:9 widescreen knee-up broadcast action matrix (10 boundary loops, 20 transitions, 5 dynamic loops, 2 micro-adjustments).",
        type: "chroma_loops",
        thumbnailUrl: "/avatars/master_mateo_archive/domain_chroma_wall_standing_default_trait/mateo_169_widescreen_01_M1_stand_base.jpg",
        defaultStudioBgId: "studio_plate_videowall_standup_9x16",
        actionLoopsAvailable: true,
      },
      {
        id: "mateo_avatar_bubble",
        name: "Avatar Bubble (MuseTalk Realtime)",
        icon: "🫧",
        badge: "Corner Bubble",
        description: "Floating broadcast bubble with 40+ FPS MuseTalk neural visemes.",
        type: "avatar_bubble",
        thumbnailUrl: avatarUrl || "/avatars/mateo.png",
        actionLoopsAvailable: false,
      },
    ];
  }

  if (normId === "blaze") {
    return [
      {
        id: "blaze_leather_jacket_chroma",
        name: "Leather Jacket (Action Loops)",
        icon: "🧥",
        badge: "HD Action Loops",
        description: "Cyberpunk & Tech broadcast loops. Scene 1 uses studio background plate; scenes 2+ are transparent.",
        type: "chroma_loops",
        thumbnailUrl: "/avatars/blaze.png",
        defaultStudioBgId: "studio_plate_financial_trading_9x16",
        actionLoopsAvailable: true,
      },
      {
        id: "blaze_avatar_bubble",
        name: "Avatar Bubble (MuseTalk Realtime)",
        icon: "🫧",
        badge: "Corner Bubble",
        description: "Floating broadcast bubble with 40+ FPS MuseTalk neural visemes.",
        type: "avatar_bubble",
        thumbnailUrl: avatarUrl || "/avatars/blaze.png",
        actionLoopsAvailable: false,
      },
    ];
  }

  // Generic Persona Fallback (for any persona without master loops)
  return [
    {
      id: `${normId}_avatar_bubble`,
      name: "Avatar Face Bubble (MuseTalk Lip-Sync)",
      icon: "🫧",
      badge: "MuseTalk Realtime",
      description: "Floating broadcast anchor bubble in lower corner with 40+ FPS MuseTalk neural visemes.",
      type: "avatar_bubble",
      thumbnailUrl: avatarUrl || `/avatars/${normId}.png`,
      actionLoopsAvailable: false,
    },
    {
      id: `${normId}_in_environment`,
      name: "Full Avatar In-Environment",
      icon: "🏢",
      badge: "In-Environment",
      description: "Full scene anchor framing with studio background and neural lip-sync.",
      type: "in_environment",
      thumbnailUrl: avatarUrl || `/avatars/${normId}.png`,
      defaultStudioBgId: "studio_plate_videowall_standup_9x16",
      actionLoopsAvailable: false,
    },
  ];
}

export interface Segment {
  id: string;
  index: number;
  text: string;
  spokenText?: string | null;
  personaId?: string | null;
  audioPath?: string | null;
  presenterVideoPath?: string | null;
  presenterStatus?: string | null;
  personaAvatarUrl?: string | null;
  presetChoice?: string | null;
  personaImagePrompt?: string | null;
  presenterVideoPrompt?: string | null;
  actionLoop?: string | null;
  cameraCue?: CameraCue | null;
  mediaSettings?: string | null;
  sceneStrategy?: string | null;
  assetPath?: string | null;
  assetType?: string | null;
}

export interface PresenterStudioPanelProps {
  segments: Segment[];
  storyId: string;
  comfyServer: {
    comfyOnline: boolean | null;
    isCheckingHealth: boolean;
    checkHealth: () => Promise<void>;
    startServer: () => Promise<void>;
    stopServer: () => Promise<void>;
  };
  sadtalkerServer: {
    sadtalkerOnline: boolean | null;
    isCheckingHealth: boolean;
    checkHealth: () => Promise<void>;
    startServer: () => Promise<void>;
    stopServer: () => Promise<void>;
  };
  batchState: PresenterBatchProgressState;
  /** Called when a video is generated so the parent can refresh segment data */
  onVideoGenerated?: (segmentId: string, videoUrl: string) => void;
  onDeletePresenterVideo?: (segmentId: string) => void;
  onUpdateSegmentAvatar: (index: number, url: string) => void;
  onUpdateSegmentActionLoop?: (index: number, actionLoop: string) => void;
  onUpdateSegmentCameraCue?: (index: number, cameraCue: CameraCue) => void;
  selectedSceneIndex?: number | null;
  onSelectScene?: (index: number) => void;
  tts?: PresenterTtsClient;
  onUpdateAsset?: (index: number, url: string, type: "video" | "image") => void;
  onUpdateSegmentStrategy?: (index: number, strategy: string) => void;
  onUpdateSegmentPersona?: (index: number, personaId: string) => void;
  onApplyPersonaToAll?: (personaId: string) => void;
}
