/**
 * src/components/editor/shared/visuals/components/RenderModeSelector.tsx
 *
 * Visual Render & Motion Mode Selector, White Background Removal toggle,
 * and Scene Background & Staging Setup controls.
 */

import React from "react";
import {
  AdScene,
  ExtractedProductAsset,
} from "@/lib/types/ecommerce";
import {
  Layers,
  Sparkles,
  Home,
  Check,
  Trash2,
  Camera,
} from "lucide-react";
import { RENDER_MODES } from "../types";

export interface RenderModeSelectorProps {
  currentScene: AdScene;
  onUpdateScene: (updates: Partial<AdScene>) => void;
  productAssets: ExtractedProductAsset[];
  onOpenPhotoStudio: () => void;
  toast: (
    title: string,
    message: string,
    type?: "info" | "success" | "warning" | "error"
  ) => void;
  checkIsVideo: (url: string, type?: string) => boolean;
}

export const RenderModeSelector: React.FC<RenderModeSelectorProps> = ({
  currentScene,
  onUpdateScene,
  productAssets,
  onOpenPhotoStudio,
  toast,
  checkIsVideo,
}) => {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold text-zinc-100 uppercase tracking-wide">
            Visual Render & Motion Mode
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
          {currentScene.sceneType}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {RENDER_MODES.map((mode) => {
          const Icon = mode.icon;
          const isSelected = currentScene.sceneType === mode.type;
          return (
            <button
              key={mode.type}
              type="button"
              onClick={() => {
                const updates: Partial<AdScene> = { sceneType: mode.type };
                if (mode.type === "scene_background") {
                  if (!currentScene.secondaryMediaUrl) {
                    updates.secondaryMediaUrl =
                      currentScene.primaryMediaUrl || (productAssets[0]?.url ?? undefined);
                  }
                  updates.removeWhiteBg = false;
                  if (currentScene.presenterConfig?.mode === "hidden") {
                    updates.presenterConfig = {
                      ...currentScene.presenterConfig,
                      mode: "custom",
                      enabled: true,
                    };
                  }
                } else if (mode.isComparison && !currentScene.secondaryMediaUrl && productAssets.length > 1) {
                  const alternativeAsset = productAssets.find(
                    (a) => a.url && a.url !== currentScene.primaryMediaUrl
                  );
                  if (alternativeAsset?.url) {
                    updates.secondaryMediaUrl = alternativeAsset.url;
                  }
                }
                onUpdateScene(updates);
              }}
              className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                isSelected
                  ? "border-emerald-500 bg-emerald-500/10 text-white shadow-sm shadow-emerald-950/50"
                  : "border-zinc-800/80 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-300"
              }`}
            >
              <div
                className={`mt-0.5 p-1.5 rounded-md ${
                  isSelected ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-400"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate flex items-center gap-1.5">
                  <span>{mode.label}</span>
                  {mode.isComparison && (
                    <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-normal">
                      2-Img
                    </span>
                  )}
                  {mode.type === "product_turntable" && currentScene.customTurntableVideoUrl && (
                    <span
                      className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold"
                      title="This scene uses a generated Neural Product Turntable video"
                    >
                      Neural 360
                    </span>
                  )}
                  {mode.type === "product_turntable" && !currentScene.customTurntableVideoUrl && currentScene.turntable3dVideoUrl && (
                    <span
                      className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-bold"
                      title="This scene uses a pre-rendered 3D turntable video"
                    >
                      3D
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 line-clamp-1 mt-0.5">
                  {mode.type === "product_turntable" && currentScene.customTurntableVideoUrl
                    ? "Neural packshot rotation sweep (MiniMax H3 / Veo 3.1)"
                    : mode.type === "product_turntable" && currentScene.turntable3dVideoUrl
                    ? "True 3D neural-mesh rotation on the studio pedestal"
                    : mode.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* White Background Removal Toggle (Available for 3D Floating Hero & Turntable) */}
      {(currentScene.sceneType === "pattern_interrupt_hook" || currentScene.sceneType === "product_turntable") && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/90 border border-zinc-800 mt-2">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-cyan-500/20 text-cyan-400">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-zinc-100">
                  Remove White Background (Auto-Matte)
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  WebGL 60FPS
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Eliminates solid packshot backdrops so the product floats & dances seamlessly
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateScene({
                removeWhiteBg: !(currentScene.removeWhiteBg ?? (currentScene.sceneType === "pattern_interrupt_hook")),
              })
            }
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              (currentScene.removeWhiteBg ?? (currentScene.sceneType === "pattern_interrupt_hook"))
                ? "bg-cyan-500"
                : "bg-zinc-700"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                (currentScene.removeWhiteBg ?? (currentScene.sceneType === "pattern_interrupt_hook"))
                  ? "translate-x-4"
                  : "translate-x-0"
              }`}
            />
          </button>
        </div>
      )}

      {/* Dedicated Scene Background & Architectural Staging Section */}
      <div className="p-3 rounded-xl bg-zinc-900/70 border border-zinc-800/90 space-y-2.5 mt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-bold text-zinc-100 uppercase tracking-wide">
              Scene Background & Staging Setup
            </span>
          </div>
          {currentScene.secondaryMediaUrl ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <Check className="h-3 w-3" />
              {currentScene.sceneType === "scene_background"
                ? "Clean Background Active"
                : currentScene.sceneType === "room_staging"
                ? "3D Staging Active"
                : "Background Configured"}
            </span>
          ) : (
            <span className="text-[10px] text-zinc-400 font-mono">
              No Background Set
            </span>
          )}
        </div>

        {currentScene.secondaryMediaUrl ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-2.5 rounded-lg bg-black/40 border border-zinc-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative w-16 h-12 rounded-lg overflow-hidden border border-cyan-500/40 bg-zinc-950 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentScene.secondaryMediaUrl}
                  alt="Scene Background"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                <span className="absolute bottom-0.5 left-1 text-[8px] font-bold text-cyan-300">
                  BG
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-200 truncate">
                  {currentScene.sceneType === "scene_background"
                    ? "🖼️ Clean Scene Background"
                    : currentScene.sceneType === "room_staging"
                    ? "🛋️ 3D Architectural Surface Staging"
                    : "🖼️ Ambient Scene Backdrop"}
                </div>
                <p className="text-[10px] text-zinc-400 truncate mt-0.5">
                  {currentScene.sceneType === "scene_background"
                    ? "Full-bleed background image with smooth cinematic pan and zero injected overlays"
                    : currentScene.sceneType === "room_staging"
                    ? "Cinematic camera movement projecting surface material texture onto room plane"
                    : "Used as background environment behind product motion"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              {currentScene.sceneType !== "scene_background" && (
                <button
                  type="button"
                  onClick={() => {
                    const updates: Partial<AdScene> = {
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
                    toast("Mode Changed", "Switched to Clean Scene Background.", "success");
                  }}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition-colors cursor-pointer shadow"
                  title="Switch to clean scene background with zero injected overlays"
                >
                  🖼️ Clean BG
                </button>
              )}
              {currentScene.sceneType !== "room_staging" && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateScene({ sceneType: "room_staging" });
                    toast("Mode Changed", "Switched to 3D Surface Staging.", "success");
                  }}
                  className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold transition-colors cursor-pointer shadow"
                  title="Switch to 3D architectural room staging with surface texture projection"
                >
                  🛋️ 3D Staging
                </button>
              )}
              {currentScene.sceneType === "room_staging" && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateScene({
                      removeWhiteBg: !currentScene.removeWhiteBg,
                    })
                  }
                  className={`px-2 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                    currentScene.removeWhiteBg
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
                  }`}
                  title="Toggle overlaying a floating 3D cutout of the product on top of the lifestyle background"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>{currentScene.removeWhiteBg ? "Cutout Overlay On" : "Background Only"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onUpdateScene({ secondaryMediaUrl: undefined });
                  toast("Background Removed", "Cleared scene background.", "info");
                }}
                className="px-2 py-1 rounded bg-zinc-800 hover:bg-red-950/80 hover:text-red-300 text-zinc-400 text-[10px] font-semibold border border-zinc-700 hover:border-red-500/30 transition-colors cursor-pointer"
                title="Remove background from this scene"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-850">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-zinc-300">
                Select a photo to use as this scene's background:
              </span>
              <button
                type="button"
                onClick={onOpenPhotoStudio}
                className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer flex items-center gap-1"
              >
                <Camera className="h-3 w-3" />
                <span>Generate New Photo</span>
              </button>
            </div>

            {/* Quick Image Picker from Catalog / Product Assets */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 custom-scrollbar">
              {productAssets.length === 0 && (
                <span className="text-[10px] text-zinc-500 italic">
                  No catalog photos available. Open the Photo Studio above to generate one.
                </span>
              )}
              {productAssets
                .filter((a) => a?.url && !checkIsVideo(a.url, a.type))
                .slice(0, 8)
                .map((asset, idx) => (
                  <button
                    key={asset.url || idx}
                    type="button"
                    onClick={() => {
                      const updates: Partial<AdScene> = {
                        secondaryMediaUrl: asset.url,
                        primaryMediaUrl: asset.url,
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
                      toast("Background Set", "Applied photo as clean scene background.", "success");
                    }}
                    className="group relative w-16 h-12 rounded-lg overflow-hidden border border-zinc-700 hover:border-cyan-400 transition-all shrink-0 cursor-pointer shadow"
                    title={`Set ${asset.altText || "Photo"} as scene background`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={asset.url}
                      alt={asset.altText || "Product photo"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-black/40 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold px-1 py-0.5 rounded bg-cyan-500 text-black shadow transition-opacity">
                        Set BG
                      </span>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
