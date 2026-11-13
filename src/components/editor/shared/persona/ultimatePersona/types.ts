/**
 * src/components/editor/shared/persona/ultimatePersona/types.ts
 *
 * Types, master loops definition, and preset wardrobe poses
 * for UltimatePersonaPicker.
 */

import { RubyWardrobePose } from "@/lib/realtime/rubyWardrobePresets";

export type MainTab = "personas" | "wardrobe";
export type GenderFilter = "all" | "female" | "male";

export const WARDROBE_CATEGORIES = [
  "All Outfits",
  "Burgundy Velvet Corset (Veo 3.1)",
  "Classic Broadcast",
  "Formal Gowns",
  "Editorial & High-Glam",
  "3-Camera Studio Array",
] as const;

export interface ActionLoopRaw {
  id: string;
  persona?: string;
  name?: string;
  label?: string;
  videoUrl?: string;
  src?: string;
  icon?: string;
  type?: string;
  category?: string;
  desc?: string;
  startPose?: string;
  endPose?: string;
  duration?: number;
  durationSec?: number;
}

export interface MasterCoreLoopDef {
  id: "M1" | "M2" | "M3" | "M4" | "M5";
  label: string;
  name: string;
  desc: string;
  icon: string;
  category: string;
  badgeBg: string;
}

export const MASTER_CORE_LOOPS: MasterCoreLoopDef[] = [
  {
    id: "M1",
    label: "M1: Neutral Clasp",
    name: "Base Home Stance",
    desc: "Hands clasped naturally at mid-torso with subtle breathing & micro-sway. The foundational anchor resting posture.",
    icon: "💎",
    category: "Home / Base",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  },
  {
    id: "M2",
    label: "M2: Low Hands Presenting",
    name: "Conversational Low Gestures",
    desc: "Subtle rhythmic hand gestures below chest level, articulating product specs and materials without visual noise.",
    icon: "🖐️",
    category: "Conversational",
    badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  },
  {
    id: "M3",
    label: "M3: High Hands Explaining",
    name: "High Engagement Two-Hands",
    desc: "Expressive two-handed gestures at chest level, delivering high-impact call-to-actions and key value propositions.",
    icon: "🙌",
    category: "Emphasis",
    badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  },
  {
    id: "M4",
    label: "M4: Asymmetric Gestures",
    name: "Directional Feature Focus",
    desc: "Dynamic asymmetric posture with directional arm gesturing toward product overlays and spec badges.",
    icon: "👉",
    category: "Directional",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  },
  {
    id: "M5",
    label: "M5: 3/4 Turn Perspective",
    name: "Angled Dimensional Profile",
    desc: "Engaging 45-degree angled stance showcasing 3D depth and cinematic realism during transitional beats.",
    icon: "🔄",
    category: "Perspective",
    badgeBg: "bg-rose-500/20 text-rose-300 border-rose-500/40",
  },
];

export const MATEO_WARDROBE_POSES: RubyWardrobePose[] = [
  {
    id: "mateo_default_trait_m1",
    label: "Mateo — Neutral Clasped (M1)",
    outfit: "Tailored Charcoal Grey Suit & Burgundy Tie",
    category: "Classic Broadcast",
    pose: "M1: Neutral Clasped Base",
    color: "#475569",
    badgeBg: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    src: "/avatars/master_mateo_archive/domain_chroma_wall_standing_default_trait/mateo_169_widescreen_01_M1_stand_base.jpg",
  },
  {
    id: "mateo_default_trait_m2",
    label: "Mateo — Raised Right Hand (M2)",
    outfit: "Tailored Charcoal Grey Suit & Burgundy Tie",
    category: "Classic Broadcast",
    pose: "M2: Raised Right Hand",
    color: "#475569",
    badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    src: "/avatars/master_mateo_archive/domain_chroma_wall_standing_default_trait/mateo_169_widescreen_02_M2_raised_right.jpg",
  },
  {
    id: "mateo_default_trait_m3",
    label: "Mateo — Open Two Hands (M3)",
    outfit: "Tailored Charcoal Grey Suit & Burgundy Tie",
    category: "Classic Broadcast",
    pose: "M3: Open Two Hands",
    color: "#475569",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    src: "/avatars/master_mateo_archive/domain_chroma_wall_standing_default_trait/mateo_169_widescreen_03_M3_open_two_hands.jpg",
  },
  {
    id: "mateo_default_trait_m4",
    label: "Mateo — Separated Arms (M4)",
    outfit: "Tailored Charcoal Grey Suit & Burgundy Tie",
    category: "Classic Broadcast",
    pose: "M4: Separated Arms at Rest",
    color: "#475569",
    badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    src: "/avatars/master_mateo_archive/domain_chroma_wall_standing_default_trait/mateo_169_widescreen_04_M4_separated_arms.jpg",
  },
  {
    id: "mateo_default_trait_m5",
    label: "Mateo — Three-Quarter Profile (M5)",
    outfit: "Tailored Charcoal Grey Suit & Burgundy Tie",
    category: "Classic Broadcast",
    pose: "M5: Three-Quarter Stance",
    color: "#475569",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    src: "/avatars/master_mateo_archive/domain_chroma_wall_standing_default_trait/mateo_169_widescreen_05_M5_turn_side.jpg",
  },
];

export const BLAZE_WARDROBE_POSES: RubyWardrobePose[] = [
  {
    id: "blaze_silver_blazer_m1",
    label: "Blaze — Neutral Clasped (M1)",
    outfit: "Metallic Silver Cropped Blazer & Leather Pants",
    category: "Classic Broadcast",
    pose: "M1: Neutral Clasped Base",
    color: "#94a3b8",
    badgeBg: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    src: "/avatars/master_blaze_archive/domain_chroma_wall_standing_silver_blazer/blaze_169_widescreen_01_M1_stand_base.jpg",
  },
  {
    id: "blaze_silver_blazer_m2",
    label: "Blaze — Raised Right Hand (M2)",
    outfit: "Metallic Silver Cropped Blazer & Leather Pants",
    category: "Classic Broadcast",
    pose: "M2: Raised Right Hand",
    color: "#94a3b8",
    badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    src: "/avatars/master_blaze_archive/domain_chroma_wall_standing_silver_blazer/blaze_169_widescreen_02_M2_raised_right.jpg",
  },
  {
    id: "blaze_silver_blazer_m3",
    label: "Blaze — Open Two Hands (M3)",
    outfit: "Metallic Silver Cropped Blazer & Leather Pants",
    category: "Classic Broadcast",
    pose: "M3: Open Two Hands",
    color: "#94a3b8",
    badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    src: "/avatars/master_blaze_archive/domain_chroma_wall_standing_silver_blazer/blaze_169_widescreen_03_M3_open_two_hands.jpg",
  },
  {
    id: "blaze_silver_blazer_m4",
    label: "Blaze — Separated Arms (M4)",
    outfit: "Metallic Silver Cropped Blazer & Leather Pants",
    category: "Classic Broadcast",
    pose: "M4: Separated Arms at Rest",
    color: "#94a3b8",
    badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    src: "/avatars/master_blaze_archive/domain_chroma_wall_standing_silver_blazer/blaze_169_widescreen_04_M4_separated_arms.jpg",
  },
  {
    id: "blaze_silver_blazer_m5",
    label: "Blaze — Three-Quarter Profile (M5)",
    outfit: "Metallic Silver Cropped Blazer & Leather Pants",
    category: "Classic Broadcast",
    pose: "M5: Three-Quarter Stance",
    color: "#94a3b8",
    badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    src: "/avatars/master_blaze_archive/domain_chroma_wall_standing_silver_blazer/blaze_169_widescreen_05_M5_turn_side.jpg",
  },
];
