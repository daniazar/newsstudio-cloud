/**
 * src/lib/wardrobe/personaLookTypes.ts
 *
 * Client-safe data types, Zod schemas, and metadata definitions for Persona Looks.
 * Supports Full-Mesh FSM Multi-Loop Sets (M1 base, M2 explanatory, M3 welcoming).
 * Free of Node.js-only imports (fs, path, prisma) so it can be safely imported by client components.
 */

import { z } from "zod";
import type { AnchorStateId } from "@/lib/types/stateMachine";

export type { AnchorStateId };

export type PersonaLookCategory =
  | "prime_time"
  | "breaking_news"
  | "morning_show"
  | "gala"
  | "casual_field"
  | "special_report";

export type PoseTag = "M1" | "M2" | "M3" | "M4" | "M5" | "custom";

export interface PersonaLookLoopItem {
  poseTag: PoseTag;
  actionName: string; // e.g. "state_idle", "state_explanatory_right", "state_intro_welcome"
  videoUrl: string; // public URL or storage path
  durationSeconds?: number;
  frameCount?: number;
  fps?: number;
  isPrimary?: boolean; // Primary preview loop (defaults to M1)
}

export interface PersonaLook {
  id: string;
  personaId: string;
  lookName: string;
  category: PersonaLookCategory;
  videoUrl: string; // Backwards-compatible alias for primaryVideoUrl
  primaryVideoUrl: string; // convenient fallback / M1 video
  loops: Record<string, PersonaLookLoopItem>; // Keyed by PoseTag (e.g. { M1: {...}, M2: {...}, M3: {...} })
  thumbnailUrl?: string;
  outfitName: string;
  outfitId?: string;
  hairstyleName?: string;
  hairstyleId?: string;
  hairColorSwatch?: string;
  lightingPreset?: string;
  poseTag?: PoseTag;
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePersonaLookInput {
  id?: string;
  personaId: string;
  lookName: string;
  category: PersonaLookCategory;
  videoUrl?: string;
  primaryVideoUrl?: string;
  loops?: Record<string, PersonaLookLoopItem>;
  thumbnailUrl?: string;
  outfitName: string;
  outfitId?: string;
  hairstyleName?: string;
  hairstyleId?: string;
  hairColorSwatch?: string;
  lightingPreset?: string;
  poseTag?: PoseTag;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
  metadata?: Record<string, unknown>;
}

export const PersonaLookLoopItemSchema = z.object({
  poseTag: z.enum(["M1", "M2", "M3", "M4", "M5", "custom"]),
  actionName: z.string(),
  videoUrl: z.string().min(1),
  durationSeconds: z.number().optional(),
  frameCount: z.number().optional(),
  fps: z.number().optional(),
  isPrimary: z.boolean().optional(),
});

export const SaveLookSchema = z
  .object({
    id: z.string().optional(),
    personaId: z.string().min(1, "personaId is required"),
    lookName: z.string().min(1, "lookName is required"),
    category: z.enum([
      "prime_time",
      "breaking_news",
      "morning_show",
      "gala",
      "casual_field",
      "special_report",
    ]),
    videoUrl: z.string().optional(),
    primaryVideoUrl: z.string().optional(),
    loops: z.record(z.string(), PersonaLookLoopItemSchema).optional(),
    thumbnailUrl: z.string().optional(),
    outfitName: z.string().min(1, "outfitName is required"),
    outfitId: z.string().optional(),
    hairstyleName: z.string().optional(),
    hairstyleId: z.string().optional(),
    hairColorSwatch: z.string().optional(),
    lightingPreset: z.string().optional(),
    poseTag: z.enum(["M1", "M2", "M3", "M4", "M5", "custom"]).optional(),
    isDefault: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (data) =>
      Boolean(
        data.videoUrl ||
          data.primaryVideoUrl ||
          (data.loops && Object.keys(data.loops).length > 0)
      ),
    {
      message: "Either videoUrl, primaryVideoUrl, or at least one loop in loops is required",
    }
  );

// Category metadata descriptors
export const PERSONA_LOOK_CATEGORIES: {
  id: PersonaLookCategory;
  label: string;
  description: string;
  badgeColor: string;
}[] = [
  {
    id: "prime_time",
    label: "Prime Time",
    description: "Evening flagship broadcast with high-contrast studio lighting",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  },
  {
    id: "breaking_news",
    label: "Breaking News",
    description: "Urgent, alert-focused broadcast posture and attire",
    badgeColor: "bg-red-500/20 text-red-300 border-red-500/40",
  },
  {
    id: "morning_show",
    label: "Morning Show",
    description: "Bright, welcoming daylight lighting and accessible tailoring",
    badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  {
    id: "gala",
    label: "Gala & Evening",
    description: "Formal black-tie and evening red-carpet aesthetics",
    badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/40",
  },
  {
    id: "casual_field",
    label: "Casual Field",
    description: "Outdoor mobile reporter and on-the-scene outerwear",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  },
  {
    id: "special_report",
    label: "Special Report",
    description: "Deep investigative scrutiny and analytical broadcast posture",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
];

export const POSE_TAGS: { id: PoseTag; label: string; description: string }[] = [
  { id: "M1", label: "M1 (Seated / Idle)", description: "Centered torso, resting neutral base" },
  { id: "M2", label: "M2 (Explanatory)", description: "Right hand raised in open storytelling gesture" },
  { id: "M3", label: "M3 (Welcoming)", description: "Both hands open in welcoming overview" },
  { id: "M4", label: "M4 (Emphasis Nod)", description: "Engaged head nod and confident focus" },
  { id: "M5", label: "M5 (Side / Ticker)", description: "Angle toward side graphic or video wall" },
];

export const DEFAULT_POSE_SLOTS: {
  poseTag: PoseTag;
  actionName: string;
  label: string;
  description: string;
  role: string;
}[] = [
  {
    poseTag: "M1",
    actionName: "state_idle",
    label: "M1: Neutral Base",
    description: "Centered torso, hands clasped, subtle breathing",
    role: "Resting base loop during core reading",
  },
  {
    poseTag: "M2",
    actionName: "state_explanatory_right",
    label: "M2: Explanatory Gesture",
    description: "Right hand raised in open explanatory delivery",
    role: "Key storytelling & analysis moments",
  },
  {
    poseTag: "M3",
    actionName: "state_intro_welcome",
    label: "M3: Welcoming Broadcast",
    description: "Both hands open in welcoming overview",
    role: "Intro, welcome, macro trends & wrap-ups",
  },
];

/**
 * Resolves the appropriate loop video URL for an anchor finite-state machine (FSM) state or pose tag.
 * Falls back to primaryVideoUrl / videoUrl if a specific gesture is not yet rendered.
 */
export function resolvePersonaLookLoop(
  look: PersonaLook,
  targetState?: AnchorStateId | PoseTag | string
): string {
  if (!look) return "";
  if (!targetState) return look.primaryVideoUrl || look.videoUrl || "";

  // 1. Direct PoseTag match (e.g. "M1", "M2", "M3")
  if (look.loops && look.loops[targetState]?.videoUrl) {
    return look.loops[targetState].videoUrl;
  }

  // 2. Action name match (e.g. "state_idle", "state_explanatory_right", "state_intro_welcome")
  if (look.loops) {
    for (const loop of Object.values(look.loops)) {
      if (loop.actionName === targetState && loop.videoUrl) {
        return loop.videoUrl;
      }
    }
  }

  // 3. Fallback mappings for state machine action IDs and AnchorStateId framing states
  const stateToPoseMap: Record<string, PoseTag> = {
    // Canonical neutral idle
    state_idle: "M1",
    P01_NEUTRAL_CLASPED: "M1",
    seated_desk: "M1",

    // Canonical explanatory gesture
    state_explanatory_right: "M2",
    state_gesture_right: "M2",
    P02_RAISED_EXPLANATORY: "M2",
    face_closeup: "M2",

    // Canonical welcoming broadcast / wide
    state_intro_welcome: "M3",
    P03_OPEN_TWO_HANDS: "M3",
    standing_wide: "M3",

    // Emphasis nod
    state_emphasis_nod: "M4",
    P04_SEPARATED_NEUTRAL: "M4",

    // Side perspective turn
    state_side_turn: "M5",
    P05_SIDE_PERSPECTIVE_TURN: "M5",
  };

  const mappedPose = stateToPoseMap[targetState];
  if (mappedPose && look.loops && look.loops[mappedPose]?.videoUrl) {
    return look.loops[mappedPose].videoUrl;
  }

  // 4. Default to primary loop
  return look.primaryVideoUrl || look.videoUrl || "";
}
