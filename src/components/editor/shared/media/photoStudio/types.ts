/**
 * src/components/editor/shared/media/photoStudio/types.ts
 *
 * Types and interfaces for CustomProductPhotoStudioCard.
 */

import {
  AdScene,
  ExtractedProductAsset,
  ProductSpec,
} from "@/lib/types/ecommerce";

export interface CustomProductPhotoStudioCardProps {
  currentScene: AdScene;
  onUpdateScene: (updates: Partial<AdScene>) => void;
  productAssets?: ExtractedProductAsset[];
  onAddAsset?: (asset: ExtractedProductAsset) => void;
  productId?: string;
  productName?: string;
  productSpec?: ProductSpec;
  accentColor?: string;
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
}
