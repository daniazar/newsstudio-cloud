/**
 * src/components/editor/shared/visuals/types.ts
 *
 * Shared types, interfaces, and constants for SceneVisualsPicker and its subcomponents.
 */

import React from "react";
import {
  AdScene,
  ExtractedProductAsset,
  ProductSpec,
} from "@/lib/types/ecommerce";
import {
  Sparkles,
  RotateCw,
  Search,
  ArrowRightLeft,
  Home,
  ShieldAlert,
  Smartphone,
  Compass,
  Image as ImageIcon,
  Film,
} from "lucide-react";

export const DEFAULT_FLOW_PROJECT_URL =
  "https://flow.google.com/project/065b7352-6e4f-4aa9-b420-eab8beeebcdd";

export type StudioSubtab = "photo" | "video" | "turntable" | "closed";

export interface SceneVisualsPickerProps {
  currentScene: AdScene;
  onUpdateScene: (updates: Partial<AdScene>) => void;
  productAssets: ExtractedProductAsset[];
  onOpenStockSearch?: () => void;
  onAddAsset?: (asset: ExtractedProductAsset) => void;
  onRemoveAsset?: (assetUrl: string) => void;
  accentColor?: string;
  productId?: string;
  productName?: string;
  productSpec?: ProductSpec;
  personaId?: string;
  attireId?: string;
  avatarSrc?: string;
  actionLoopId?: string;
  videoUrl?: string;
  allScenes?: AdScene[];
  onAssignMediaToScene?: (
    sceneIndex: number,
    mediaUrl: string,
    isVideo?: boolean,
    asBackground?: boolean
  ) => void;
  onInsertVideoScene?: (
    videoUrl: string,
    options?: { prompt?: string; durationSeconds?: number }
  ) => void;
}

export interface RenderModeOption {
  type: AdScene["sceneType"];
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  isComparison?: boolean;
}

export const RENDER_MODES: RenderModeOption[] = [
  {
    type: "scene_background",
    label: "🖼️ Clean Scene Background",
    description:
      "Full-bleed background image with smooth cinematic pan and zero injected overlays",
    icon: ImageIcon,
  },
  {
    type: "custom_veo_hero",
    label: "✨ Custom Veo Hero Scene",
    description:
      "AI cinematic video scene (e.g. floating camera glide across living room with product)",
    icon: Film,
  },
  {
    type: "pattern_interrupt_hook",
    label: "3D Floating & Dancing",
    description: "Product floats & dances with harmonic 3D tilt & sheen",
    icon: Sparkles,
  },
  {
    type: "before_after_wipe",
    label: "Before & After Split",
    description: "Interactive split slider comparison with glow beam",
    icon: ArrowRightLeft,
    isComparison: true,
  },
  {
    type: "product_turntable",
    label: "360° Studio Turntable",
    description: "Illuminated pedestal rotation with studio reflections",
    icon: RotateCw,
  },
  {
    type: "macro_texture_zoom",
    label: "Macro Texture Zoom",
    description: "Sensory macro close-up with specular sheen & gloss",
    icon: Search,
  },
  {
    type: "room_staging",
    label: "🛋️ 3D Surface Staging",
    description:
      "Projects surface material texture onto architectural floor/wall plane",
    icon: Home,
    isComparison: true,
  },
  {
    type: "3d_exploded_blueprint",
    label: "3D Exploded Blueprint",
    description:
      "Precision calipers, engineering dimensions & specs callouts",
    icon: Compass,
  },
  {
    type: "torture_stress_test",
    label: "Torture Stress Test",
    description: "Waterproof splash barrier & extreme durability testing",
    icon: ShieldAlert,
  },
  {
    type: "device_mockup_screen",
    label: "Device Mockup 3D",
    description: "Framed within premium phone / laptop display interface",
    icon: Smartphone,
  },
];

export interface MediaGalleryItem {
  url: string;
  label: string;
  isVideo: boolean;
  isPrimary?: boolean;
  isSavedInCatalog: boolean;
  usedInScenes: number[];
}
