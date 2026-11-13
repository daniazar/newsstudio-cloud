/**
 * src/components/editor/shared/visuals/components/veoStudio/VeoVideoPreviewSection.tsx
 *
 * Active video preview player for generated Veo scenes.
 * Supports mute/unmute audio, show/hide preview, insert as new scene,
 * bulk assign to other scenes, and permanent deletion.
 */

import React from "react";
import {
  Film,
  VolumeX,
  Volume2,
  EyeOff,
  Eye,
  X,
  RefreshCw,
  BookmarkPlus,
  Plus,
  Copy,
  RotateCcw,
  Trash2,
  Sparkles,
} from "lucide-react";
import { AdScene, ExtractedProductAsset, ProductSpec } from "@/lib/types/ecommerce";

interface VeoVideoPreviewSectionProps {
  currentScene: AdScene;
  activeVeoUrl?: string;
  productAssets: ExtractedProductAsset[];
  productSpec?: ProductSpec;
  productName?: string;
  veoPrompt: string;
  showVideoPreviewInStudio: boolean;
  setShowVideoPreviewInStudio: (show: boolean) => void;
  showVeoApplyMenu: boolean;
  setShowVeoApplyMenu: (show: boolean) => void;
  isGeneratingVeo: boolean;
  isDeletingVeo: boolean;
  allScenes: AdScene[];
  onUpdateScene: (updates: Partial<AdScene>) => void;
  onAddAsset?: (asset: ExtractedProductAsset) => void;
  onInsertVideoScene?: (
    videoUrl: string,
    options?: { prompt?: string; durationSeconds?: number }
  ) => void;
  onAssignMediaToScene?: (
    sceneIndex: number,
    mediaUrl: string,
    isVideo?: boolean,
    asBackground?: boolean
  ) => void;
  handleGenerateVeoScene: () => Promise<void>;
  handleDeleteVeoVideo: (url?: string) => Promise<void>;
  handleDetachMediaFromScene: (e?: React.MouseEvent, sceneZeroIndex?: number) => void;
  setVeoSuccessMessage: (msg: string | null) => void;
  toast: (
    title: string,
    message: string,
    type?: "info" | "success" | "warning" | "error"
  ) => void;
}

export function VeoVideoPreviewSection({
  currentScene,
  activeVeoUrl,
  productAssets,
  productSpec,
  productName,
  veoPrompt,
  showVideoPreviewInStudio,
  setShowVideoPreviewInStudio,
  showVeoApplyMenu,
  setShowVeoApplyMenu,
  isGeneratingVeo,
  isDeletingVeo,
  allScenes,
  onUpdateScene,
  onAddAsset,
  onInsertVideoScene,
  onAssignMediaToScene,
  handleGenerateVeoScene,
  handleDeleteVeoVideo,
  handleDetachMediaFromScene,
  setVeoSuccessMessage,
  toast,
}: VeoVideoPreviewSectionProps) {
  const hasActiveVideo = Boolean(
    currentScene.customVeoVideoUrl ||
      (currentScene.primaryMediaUrl &&
        (currentScene.primaryMediaUrl.endsWith(".mp4") ||
          currentScene.primaryMediaUrl.endsWith(".webm")))
  );

  if (!hasActiveVideo) return null;

  const isVeoSavedInCatalog = activeVeoUrl
    ? productAssets.some((a) => a.url === activeVeoUrl) ||
      Boolean(productSpec?.assets?.some((a) => a.url === activeVeoUrl))
    : false;

  if (showVideoPreviewInStudio) {
    return (
      <div className="space-y-2">
        {/* Video Player Container */}
        <div className="relative rounded-xl overflow-hidden border border-emerald-500/40 bg-black aspect-video max-h-52 group shadow-md">
          <video
            src={currentScene.customVeoVideoUrl || currentScene.primaryMediaUrl}
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Top-Left Badges */}
          <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-black/80 backdrop-blur-md text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
              <Film className="h-3 w-3" />
              Veo 3.1 1080p Clip
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500 text-black shadow">
              Active in Scene{" "}
              {(currentScene.sceneIndex !== undefined ? currentScene.sceneIndex : 0) + 1}
            </span>
            <button
              type="button"
              onClick={() => {
                const isMuted = currentScene.muteVideoAudio ?? true;
                onUpdateScene({ muteVideoAudio: !isMuted });
                toast(
                  "Video Audio",
                  !isMuted
                    ? "Muted native video audio for clean voiceover."
                    : "Unmuted native video audio.",
                  "info"
                );
              }}
              className={`text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-md flex items-center gap-1 border transition-colors cursor-pointer shadow ${
                (currentScene.muteVideoAudio ?? true)
                  ? "bg-black/80 text-amber-300 border-amber-500/50 hover:bg-amber-950/60"
                  : "bg-emerald-500 text-black border-emerald-400 hover:bg-emerald-400"
              }`}
              title="Click to toggle muting native video audio so voiceover plays cleanly"
            >
              {(currentScene.muteVideoAudio ?? true) ? (
                <>
                  <VolumeX className="h-3 w-3 text-amber-400" />
                  <span>Muted for Voiceover</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3 w-3 text-black" />
                  <span>Video Audio ON</span>
                </>
              )}
            </button>
          </div>

          {/* Top-Right Quick Actions */}
          <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
            <button
              type="button"
              onClick={() => setShowVideoPreviewInStudio(false)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/80 hover:bg-black text-zinc-300 hover:text-white border border-zinc-700/70 backdrop-blur-md text-[10px] font-medium cursor-pointer transition-colors shadow"
              title="Hide video preview player in panel"
            >
              <EyeOff className="h-3 w-3" />
              <span>Hide</span>
            </button>
            <button
              type="button"
              onClick={(e) => handleDetachMediaFromScene(e)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-red-950/90 hover:bg-red-900 text-red-300 border border-red-500/50 backdrop-blur-md text-[10px] font-bold cursor-pointer transition-colors shadow"
              title="Close video and restore product photo packshot"
            >
              <X className="h-3 w-3" />
              <span>Close Video</span>
            </button>
          </div>
        </div>

        {/* Dedicated Scene Actions & Assignment Bar (Positioned OUTSIDE overflow-hidden) */}
        <div className="p-2 rounded-xl bg-zinc-900/95 border border-zinc-800 flex flex-wrap items-center justify-between gap-2 shadow-sm">
          {/* Left Actions: Regenerate, Save to Catalog, Insert, Apply to Scene */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handleGenerateVeoScene}
              disabled={isGeneratingVeo}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-emerald-400 text-xs font-semibold border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isGeneratingVeo ? "animate-spin" : ""}`} />
              <span>Regenerate</span>
            </button>

            {activeVeoUrl && !isVeoSavedInCatalog && (
              <button
                type="button"
                onClick={() => {
                  onAddAsset?.({
                    id: `asset_veo_${Date.now()}`,
                    url: activeVeoUrl,
                    type: "existing_video",
                    altText: `Custom Veo Video: ${productName || "Product"}`,
                  });
                  setVeoSuccessMessage("💾 Saved Veo video to Product Assets catalog");
                }}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-cyan-300 text-xs font-semibold border border-cyan-500/30 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                title="Add this Veo video to permanent product assets"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                <span>Save to Catalog</span>
              </button>
            )}

            {activeVeoUrl && onInsertVideoScene && (
              <button
                type="button"
                onClick={() => {
                  onInsertVideoScene(activeVeoUrl, {
                    prompt: veoPrompt,
                    durationSeconds: 8,
                  });
                  setVeoSuccessMessage(
                    "➕ Inserted as New Scene (No Avatar) with coherent voiceover"
                  );
                }}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 text-xs font-bold border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                title="Insert this video as a new 8s scene without avatar overlay and with coherent voiceover"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Insert as New Scene</span>
              </button>
            )}

            {/* Apply to Scene Dropdown: Zero Clipping, Dropdown Below with Max-Height */}
            {activeVeoUrl && onAssignMediaToScene && (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowVeoApplyMenu(!showVeoApplyMenu);
                  }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm ${
                    showVeoApplyMenu
                      ? "bg-purple-950 text-purple-200 border-purple-400 ring-2 ring-purple-500/30"
                      : "bg-zinc-850 hover:bg-zinc-800 text-purple-300 border-purple-500/40"
                  }`}
                >
                  <Copy className="h-3.5 w-3.5 text-purple-400" />
                  <span>Apply to Scene ▾</span>
                </button>

                {showVeoApplyMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-0 top-full mt-1.5 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs max-h-72 overflow-y-auto custom-scrollbar ring-1 ring-black/50"
                  >
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400 border-b border-zinc-800/80 mb-1">
                      Target Scene Assignment
                    </div>
                    {onInsertVideoScene && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            onInsertVideoScene(activeVeoUrl, {
                              prompt: veoPrompt,
                              durationSeconds: 8,
                            });
                            setShowVeoApplyMenu(false);
                            setVeoSuccessMessage(
                              "➕ Inserted as New Scene (No Avatar) with coherent voiceover"
                            );
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-emerald-950/60 text-emerald-300 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5 text-emerald-400" />
                          <span>➕ Insert as New Scene (No Avatar)</span>
                        </button>
                        <div className="border-t border-zinc-800 my-1" />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onAssignMediaToScene(-1, activeVeoUrl, true);
                        setShowVeoApplyMenu(false);
                        setVeoSuccessMessage("🌟 Veo video applied to ALL scenes");
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-purple-950/60 text-purple-300 font-semibold flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                      <span>🌟 Apply to All Scenes</span>
                    </button>
                    <div className="border-t border-zinc-800 my-1" />
                    {allScenes.map((s, sIdx) => {
                      const target0Idx = s.sceneIndex !== undefined ? s.sceneIndex : sIdx;
                      const sNum = target0Idx + 1;
                      const isCur = target0Idx === (currentScene.sceneIndex ?? 0);
                      return (
                        <button
                          key={s.id || sIdx}
                          type="button"
                          onClick={() => {
                            onAssignMediaToScene(target0Idx, activeVeoUrl, true);
                            setShowVeoApplyMenu(false);
                            setVeoSuccessMessage(`🎬 Veo video assigned to Scene ${sNum}`);
                          }}
                          className={`w-full text-left px-3 py-1.5 hover:bg-zinc-800/80 flex items-center justify-between cursor-pointer transition-colors ${
                            isCur ? "text-emerald-400 font-bold bg-emerald-950/30" : "text-zinc-200"
                          }`}
                        >
                          <span className="truncate pr-2">
                            Scene {sNum}: {s.sceneType?.replace(/_/g, " ") || "Scene"}
                          </span>
                          {isCur && (
                            <span className="text-[9px] text-emerald-400 font-mono bg-emerald-950/80 border border-emerald-500/40 rounded px-1.5 py-0.2 shrink-0">
                              Current
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Actions: Remove from Scene & Delete */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => handleDetachMediaFromScene(e)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-850 hover:bg-amber-950/70 text-amber-300 text-xs font-semibold border border-amber-500/30 flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
              title="Keep video in assets but revert this scene to product packshot"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Remove from Scene</span>
            </button>

            <button
              type="button"
              onClick={() => handleDeleteVeoVideo()}
              disabled={isDeletingVeo}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-850 hover:bg-red-950/80 text-red-400 text-xs font-semibold border border-red-500/30 flex items-center gap-1 cursor-pointer transition-colors shadow-sm disabled:opacity-50"
              title="Permanently delete this generated video file and remove from product assets"
            >
              <Trash2 className={`h-3.5 w-3.5 ${isDeletingVeo ? "animate-spin" : ""}`} />
              <span>{isDeletingVeo ? "Deleting..." : "Delete Video"}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Collapsed video indicator
  return (
    <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-xs">
      <div className="flex items-center gap-2">
        <Film className="h-4 w-4 text-emerald-400 shrink-0" />
        <div>
          <span className="text-zinc-200 text-xs font-semibold block">
            Video Background Active in Scene #
            {(currentScene.sceneIndex !== undefined ? currentScene.sceneIndex : 0) + 1}
          </span>
          <span className="text-[10px] text-zinc-400">Preview player collapsed</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowVideoPreviewInStudio(true)}
          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors shadow"
          title="Show video preview player"
        >
          <Eye className="h-3 w-3" />
          <span>Show Preview</span>
        </button>
        <button
          type="button"
          onClick={(e) => handleDetachMediaFromScene(e)}
          className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold border border-amber-500/40 flex items-center gap-1 cursor-pointer transition-colors shadow"
          title="Remove video from this scene and restore product photo"
        >
          <RotateCcw className="h-3 w-3" />
          <span>Remove from Scene</span>
        </button>
      </div>
    </div>
  );
}
