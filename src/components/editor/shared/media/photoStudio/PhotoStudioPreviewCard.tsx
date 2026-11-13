/**
 * src/components/editor/shared/media/photoStudio/PhotoStudioPreviewCard.tsx
 *
 * Preview card for generated product photos with action controls:
 * Regenerate, Save to Catalog, Apply to Scene (Background vs Visual), and Reset to Packshot.
 */

import React, { useState } from "react";
import {
  Camera,
  RefreshCw,
  Trash2,
  CheckCircle2,
  Check,
  ChevronDown,
  BookmarkPlus,
} from "lucide-react";
import { AdScene, ExtractedProductAsset } from "@/lib/types/ecommerce";

interface PhotoStudioPreviewCardProps {
  currentScene: AdScene;
  generatedPhotoUrl: string;
  resolvedName: string;
  isGenerating: boolean;
  productAssets: ExtractedProductAsset[];
  allScenes: AdScene[];
  isPhotoActiveAsBackground: boolean;
  isPhotoActiveAsPrimary: boolean;
  isCurrentPhotoActive: boolean;
  onGeneratePhoto: () => void;
  onResetToPackshot: () => void;
  onAddAsset?: (asset: ExtractedProductAsset) => void;
  onUpdateScene: (updates: Partial<AdScene>) => void;
  onAssignMediaToScene?: (
    sceneIndex: number,
    mediaUrl: string,
    isVideo?: boolean,
    asBackground?: boolean
  ) => void;
  setSuccessMessage: (msg: string | null) => void;
}

export function PhotoStudioPreviewCard({
  currentScene,
  generatedPhotoUrl,
  resolvedName,
  isGenerating,
  productAssets,
  allScenes,
  isPhotoActiveAsBackground,
  isPhotoActiveAsPrimary,
  isCurrentPhotoActive,
  onGeneratePhoto,
  onResetToPackshot,
  onAddAsset,
  onUpdateScene,
  onAssignMediaToScene,
  setSuccessMessage,
}: PhotoStudioPreviewCardProps) {
  const [showApplyMenu, setShowApplyMenu] = useState<boolean>(false);

  return (
    <div className="relative rounded-xl overflow-hidden border border-cyan-500/40 bg-black aspect-video max-h-48 group">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={generatedPhotoUrl}
        alt="Generated Custom Product Photo"
        className="w-full h-full object-contain"
      />
      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-cyan-300 border border-cyan-500/40 flex items-center gap-1">
          <Camera className="h-3 w-3" />
          Imagen 3 Photo
        </span>
        {isCurrentPhotoActive && (
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded shadow ${
              isPhotoActiveAsBackground
                ? "bg-emerald-500 text-black"
                : "bg-cyan-500 text-black"
            }`}
          >
            {isPhotoActiveAsBackground ? "Active as Background" : "Active as Visual"}
          </span>
        )}
      </div>
      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          type="button"
          onClick={onGeneratePhoto}
          disabled={isGenerating}
          className="px-2.5 py-1 rounded bg-black/80 hover:bg-black text-cyan-300 text-[11px] font-bold border border-cyan-500/40 flex items-center gap-1 cursor-pointer transition-colors shadow"
        >
          <RefreshCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
          Regenerate
        </button>
        <div className="flex items-center gap-1.5">
          {productAssets.some((a) => a.url === generatedPhotoUrl) ? (
            <div
              className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1 shadow"
              title="Photo is saved in product catalog assets"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              <span>In Catalog</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onAddAsset && generatedPhotoUrl) {
                  onAddAsset({
                    id: `photo_gen_${Date.now()}`,
                    url: generatedPhotoUrl,
                    type: "lifestyle_context",
                    altText: `Custom AI Staged Photo: ${resolvedName}`,
                  });
                  setSuccessMessage("💾 Added custom photo to product catalog assets!");
                }
              }}
              className="px-2.5 py-1 rounded bg-zinc-900/90 hover:bg-zinc-800 text-cyan-300 text-[11px] font-bold border border-cyan-500/30 flex items-center gap-1 cursor-pointer transition-colors shadow"
              title="Save this AI photo to product catalog assets"
            >
              <BookmarkPlus className="h-3 w-3 text-cyan-400" />
              <span>Save to Catalog</span>
            </button>
          )}

          {/* Apply to Scene Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowApplyMenu((prev) => !prev)}
              className="px-2.5 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-black text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow"
            >
              <span>Apply to Scene</span>
              <ChevronDown className="h-3 w-3" />
            </button>

            {showApplyMenu && (
              <div className="absolute right-0 bottom-full mb-1.5 w-64 bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl p-2 z-30 space-y-2 text-xs backdrop-blur-xl max-h-80 overflow-y-auto custom-scrollbar">
                <div className="px-1 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800 flex items-center justify-between">
                  <span>Apply Photo</span>
                  <span className="text-[9px] text-cyan-400 font-normal">Background or Visual</span>
                </div>

                {/* Current Scene Quick Actions */}
                <div className="p-1.5 rounded-lg bg-zinc-900/70 border border-zinc-800/90 space-y-1">
                  <div className="px-1 text-[9px] font-bold text-zinc-400">
                    Scene #{currentScene.sceneIndex + 1} (Current Scene)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onAssignMediaToScene) {
                        onAssignMediaToScene(
                          currentScene.sceneIndex,
                          generatedPhotoUrl,
                          false,
                          true
                        );
                      } else {
                        const updates: Partial<AdScene> = {
                          secondaryMediaUrl: generatedPhotoUrl,
                          primaryMediaUrl: generatedPhotoUrl,
                          sceneType: "scene_background",
                          removeWhiteBg: false,
                        };
                        if (currentScene.presenterConfig?.mode === "hidden") {
                          updates.presenterConfig = {
                            ...currentScene.presenterConfig,
                            mode: "custom",
                            enabled: true,
                          };
                        }
                        onUpdateScene(updates);
                      }
                      setShowApplyMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                      isPhotoActiveAsBackground
                        ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                        : "hover:bg-emerald-500/15 text-emerald-300"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>🛋️</span>
                      <span className="font-semibold">Set as Scene Background</span>
                    </span>
                    {isPhotoActiveAsBackground && (
                      <Check className="h-3 w-3 text-emerald-400" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onAssignMediaToScene) {
                        onAssignMediaToScene(
                          currentScene.sceneIndex,
                          generatedPhotoUrl,
                          false,
                          false
                        );
                      } else {
                        onUpdateScene({ primaryMediaUrl: generatedPhotoUrl });
                      }
                      setShowApplyMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                      isPhotoActiveAsPrimary
                        ? "bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40"
                        : "hover:bg-cyan-500/15 text-cyan-300"
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span>✨</span>
                      <span className="font-semibold">Set as Product Visual</span>
                    </span>
                    {isPhotoActiveAsPrimary && <Check className="h-3 w-3 text-cyan-400" />}
                  </button>
                </div>

                {/* Other Scenes in Script */}
                {allScenes
                  .filter((s) => s.sceneIndex !== currentScene.sceneIndex)
                  .map((s) => (
                    <div
                      key={s.id || s.sceneIndex}
                      className="p-1.5 rounded-lg bg-zinc-900/40 border border-zinc-850 hover:border-zinc-700 space-y-1"
                    >
                      <div className="px-1 text-[9px] font-medium text-zinc-300 truncate">
                        Scene #{s.sceneIndex + 1}: {s.headline || s.sceneType}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (onAssignMediaToScene) {
                              onAssignMediaToScene(s.sceneIndex, generatedPhotoUrl, false, true);
                            }
                            setShowApplyMenu(false);
                          }}
                          className="flex-1 px-2 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-300 text-[10px] font-bold border border-emerald-500/20 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>🛋️ Set BG</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onAssignMediaToScene) {
                              onAssignMediaToScene(s.sceneIndex, generatedPhotoUrl, false, false);
                            }
                            setShowApplyMenu(false);
                          }}
                          className="flex-1 px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 text-[10px] font-bold border border-cyan-500/20 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>✨ Set Visual</span>
                        </button>
                      </div>
                    </div>
                  ))}

                {/* Bulk Application */}
                {allScenes.length > 1 && (
                  <div className="pt-1.5 border-t border-zinc-800 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (onAssignMediaToScene) {
                          onAssignMediaToScene(-1, generatedPhotoUrl, false, true);
                        }
                        setShowApplyMenu(false);
                      }}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left hover:bg-emerald-500/20 text-emerald-300 text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      <span>🌟 Apply as Background to All Scenes</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (onAssignMediaToScene) {
                          onAssignMediaToScene(-1, generatedPhotoUrl, false, false);
                        }
                        setShowApplyMenu(false);
                      }}
                      className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left hover:bg-cyan-500/20 text-cyan-300 text-[11px] font-bold cursor-pointer transition-colors"
                    >
                      <span>✨ Apply as Visual to All Scenes</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onResetToPackshot}
            className="px-2.5 py-1 rounded bg-red-950/80 hover:bg-red-900/90 text-red-300 text-[11px] font-bold border border-red-500/40 flex items-center gap-1 cursor-pointer transition-colors shadow"
          >
            <Trash2 className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
