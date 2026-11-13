/**
 * src/components/editor/shared/visuals/components/MediaAssetGallery.tsx
 *
 * Product Photos & Media Asset Gallery grid:
 * - Filtering (all / photos / videos)
 * - Custom URL input
 * - Stock search trigger
 * - Asset selection / targeting (Before/After/Hero/Background)
 * - 3-dot overlay for multi-scene assignment
 * - Cutout removal & permanent catalog saving
 */

import React from "react";
import { AdScene } from "@/lib/types/ecommerce";
import { MediaGalleryItem } from "../types";
import {
  Layers,
  Image as ImageIcon,
  Film,
  Search,
  Link2,
  RotateCcw,
  Check,
  BookmarkPlus,
  Sparkles,
  Trash2,
  Home,
  ChevronDown,
  Plus,
} from "lucide-react";

export interface MediaAssetGalleryProps {
  allMedia: MediaGalleryItem[];
  filteredMedia: MediaGalleryItem[];
  photosCount: number;
  videosCount: number;
  mediaFilter: "all" | "photos" | "videos";
  onSetMediaFilter: (filter: "all" | "photos" | "videos") => void;
  onOpenStockSearch?: () => void;
  showCustomUrlBox: boolean;
  onToggleCustomUrlBox: () => void;
  customUrlInput: string;
  onChangeCustomUrlInput: (val: string) => void;
  onApplyCustomUrl: () => void;
  isCurrentSceneUsingCustomVideo: boolean;
  currentScene: AdScene;
  allScenes?: AdScene[];
  isComparisonMode: boolean;
  activeSlot: "primary" | "secondary";
  onSetActiveSlot: (slot: "primary" | "secondary") => void;
  onUpdateScene: (updates: Partial<AdScene>) => void;
  activeMediaDropdownUrl: string | null;
  onSetActiveMediaDropdownUrl: (url: string | null) => void;
  onSelectMedia: (item: { url: string; isVideo?: boolean }) => void;
  onApplyMediaToTarget: (
    targetIndex: number,
    item: MediaGalleryItem,
    asBackground?: boolean
  ) => void;
  onSaveMediaToCatalog: (e: React.MouseEvent, item: MediaGalleryItem) => void;
  onGenerateCutout: (url: string) => void;
  processingUrl: string | null;
  onDetachMediaFromScene: (e?: React.MouseEvent, sceneZeroIndex?: number) => void;
  onDeleteVeoVideo: (url?: string) => void;
  onRemoveAsset?: (assetUrl: string) => void;
  onInsertVideoScene?: (
    videoUrl: string,
    options?: { prompt?: string; durationSeconds?: number }
  ) => void;
  toast: (
    title: string,
    message: string,
    type?: "info" | "success" | "warning" | "error"
  ) => void;
}

export const MediaAssetGallery: React.FC<MediaAssetGalleryProps> = ({
  allMedia,
  filteredMedia,
  photosCount,
  videosCount,
  mediaFilter,
  onSetMediaFilter,
  onOpenStockSearch,
  showCustomUrlBox,
  onToggleCustomUrlBox,
  customUrlInput,
  onChangeCustomUrlInput,
  onApplyCustomUrl,
  isCurrentSceneUsingCustomVideo,
  currentScene,
  allScenes = [],
  isComparisonMode,
  activeSlot: _activeSlot,
  onSetActiveSlot,
  onUpdateScene,
  activeMediaDropdownUrl,
  onSetActiveMediaDropdownUrl,
  onSelectMedia,
  onApplyMediaToTarget,
  onSaveMediaToCatalog,
  onGenerateCutout,
  processingUrl,
  onDetachMediaFromScene,
  onDeleteVeoVideo,
  onRemoveAsset,
  onInsertVideoScene,
  toast,
}) => {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-bold text-zinc-100 uppercase tracking-wide">
            Product Media Gallery ({allMedia.length})
          </span>
        </div>

        {/* Filter Tabs: All, Photos, Videos */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg text-[11px]">
          <button
            type="button"
            onClick={() => onSetMediaFilter("all")}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
              mediaFilter === "all"
                ? "bg-zinc-800 text-white shadow-sm font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            All ({allMedia.length})
          </button>
          <button
            type="button"
            onClick={() => onSetMediaFilter("photos")}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              mediaFilter === "photos"
                ? "bg-zinc-800 text-purple-300 shadow-sm font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ImageIcon className="h-3 w-3 text-purple-400" />
            <span>Photos ({photosCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onSetMediaFilter("videos")}
            className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer flex items-center gap-1 ${
              mediaFilter === "videos"
                ? "bg-zinc-800 text-emerald-300 shadow-sm font-bold"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Film className="h-3 w-3 text-emerald-400" />
            <span>Videos ({videosCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onOpenStockSearch && (
            <button
              type="button"
              onClick={onOpenStockSearch}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
            >
              <Search className="h-3 w-3 text-emerald-400" />
              <span>Stock Photos</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleCustomUrlBox}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
          >
            <Link2 className="h-3 w-3 text-purple-400" />
            <span>URL</span>
          </button>
        </div>
      </div>

      {/* Custom URL Input Box */}
      {showCustomUrlBox && (
        <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
          <label className="text-[11px] font-semibold text-zinc-300 block">
            Paste Direct Media URL (Image or Video)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={customUrlInput}
              onChange={(e) => onChangeCustomUrlInput(e.target.value)}
              placeholder="https://.../asset.jpg or https://.../scene.mp4"
              className="flex-1 bg-black/60 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={onApplyCustomUrl}
              className="px-3 py-1.5 bg-emerald-500 text-black text-xs font-bold rounded hover:bg-emerald-400 cursor-pointer"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Active Custom Video In Current Scene Notice Banner */}
      {isCurrentSceneUsingCustomVideo && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200">
          <div className="flex items-center gap-2.5">
            <Film className="h-4 w-4 text-emerald-400 shrink-0" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-emerald-300">
                  Scene #{currentScene.sceneIndex !== undefined ? currentScene.sceneIndex + 1 : 1} Active Video
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono px-1.5 py-0.5 rounded">
                  Background Video
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                This scene uses a full-motion custom video instead of a static packshot.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => onDetachMediaFromScene(e)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold rounded-lg cursor-pointer transition-colors shadow"
            title="Remove video from this scene and restore default product photo packshot"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Remove from Scene</span>
          </button>
        </div>
      )}

      {/* Media Grid */}
      {filteredMedia.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl">
          <Layers className="h-6 w-6 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs text-zinc-400 font-medium">No media found in this filter.</p>
          <p className="text-[10px] text-zinc-500 mt-1">Generate a Custom Veo Video or Product Photo above!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5 max-h-[340px] overflow-y-auto custom-scrollbar p-1">
          {filteredMedia.map((asset, idx) => {
            const isSelectedPrimary =
              currentScene.primaryMediaUrl === asset.url ||
              (currentScene.sceneType === "custom_veo_hero" && currentScene.customVeoVideoUrl === asset.url);
            const isSelectedSecondary = currentScene.secondaryMediaUrl === asset.url;
            const isAssignMenuOpen = activeMediaDropdownUrl === asset.url;

            let borderStyle = "border-zinc-800 hover:border-zinc-700 opacity-85 hover:opacity-100";
            if (isSelectedPrimary && isSelectedSecondary) {
              borderStyle = "border-purple-500 ring-2 ring-purple-500/40 opacity-100";
            } else if (isSelectedPrimary) {
              borderStyle = "border-emerald-500 ring-2 ring-emerald-500/50 opacity-100";
            } else if (isSelectedSecondary) {
              borderStyle = "border-blue-500 ring-2 ring-blue-500/50 opacity-100";
            }

            return (
              <div
                key={asset.url + idx}
                onClick={() => onSelectMedia(asset)}
                className={`group relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 bg-black transition-all ${borderStyle}`}
              >
                {/* Media Rendering */}
                {asset.isVideo ? (
                  <video
                    src={asset.url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform pointer-events-none"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.url}
                    alt={asset.label}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                )}

                {/* Top-Left Badges */}
                <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10">
                  {isSelectedPrimary && (
                    <span className="flex items-center gap-1 bg-emerald-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                      <Check className="h-2.5 w-2.5" />
                      {isComparisonMode ? "AFTER" : "ACTIVE"}
                    </span>
                  )}
                  {isSelectedSecondary && isComparisonMode && (
                    <span className="flex items-center gap-1 bg-blue-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow">
                      <Check className="h-2.5 w-2.5" />
                      BEFORE
                    </span>
                  )}
                  {asset.isVideo && (
                    <span className="flex items-center gap-0.5 bg-emerald-950/90 border border-emerald-500/50 text-emerald-300 text-[8px] font-bold px-1 py-0.5 rounded backdrop-blur-sm shadow">
                      <Film className="h-2.5 w-2.5" />
                      <span>Veo Video</span>
                    </span>
                  )}
                  {asset.usedInScenes.length > 0 && (
                    <span className="bg-zinc-900/90 text-zinc-300 border border-zinc-700 text-[8px] font-mono px-1 py-0.5 rounded backdrop-blur-sm">
                      Sc. {asset.usedInScenes.join(", ")}
                    </span>
                  )}
                </div>

                {/* Top-Right Action Buttons */}
                <div className="absolute top-1.5 right-1.5 flex items-center gap-1 z-20">
                  {isSelectedPrimary && (asset.isVideo || asset.url === currentScene.customVeoVideoUrl) && (
                    <button
                      type="button"
                      onClick={(e) => onDetachMediaFromScene(e)}
                      className="flex items-center gap-1 bg-amber-950/90 hover:bg-amber-900 text-amber-300 border border-amber-500/50 text-[9px] font-black px-1.5 py-0.5 rounded shadow cursor-pointer"
                      title="Remove video from this scene (restore product photo)"
                    >
                      <RotateCcw className="h-2.5 w-2.5" />
                      <span>Detach</span>
                    </button>
                  )}
                  {!asset.isSavedInCatalog && (
                    <button
                      type="button"
                      onClick={(e) => onSaveMediaToCatalog(e, asset)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-cyan-500/90 hover:bg-cyan-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded shadow cursor-pointer"
                      title="Save permanently to Product Assets Catalog"
                    >
                      <BookmarkPlus className="h-2.5 w-2.5" />
                      <span>+ Catalog</span>
                    </button>
                  )}
                  {!asset.isVideo && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onGenerateCutout(asset.url);
                      }}
                      disabled={processingUrl === asset.url}
                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-zinc-900/90 hover:bg-cyan-500 hover:text-black text-cyan-300 border border-cyan-500/40 text-[9px] font-black px-1.5 py-0.5 rounded shadow cursor-pointer"
                      title="Remove white background & save permanent transparent PNG"
                    >
                      {processingUrl === asset.url ? (
                        <span className="animate-pulse">Matting...</span>
                      ) : (
                        <>
                          <Sparkles className="h-2.5 w-2.5" />
                          <span>Cutout</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (asset.isVideo || asset.url.includes("veo_") || asset.url.includes("/veo_scenes/")) {
                        onDeleteVeoVideo(asset.url);
                      } else {
                        const confirmDelete =
                          typeof window !== "undefined"
                            ? window.confirm("Remove this asset from product media?")
                            : true;
                        if (confirmDelete && onRemoveAsset) {
                          onRemoveAsset(asset.url);
                        }
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-red-950/90 hover:bg-red-800 text-red-300 border border-red-500/40 rounded shadow cursor-pointer"
                    title={asset.isVideo ? "Delete this generated video" : "Remove asset from catalog"}
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>

                {/* Hover Action Bar */}
                {!isAssignMenuOpen && (
                  <div className="absolute inset-x-1.5 bottom-6 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    {isComparisonMode ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateScene({ secondaryMediaUrl: asset.url });
                            onSetActiveSlot("secondary");
                          }}
                          className="flex-1 py-1 px-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[9px] font-bold shadow transition-colors text-center cursor-pointer truncate"
                          title="Set as BEFORE image"
                        >
                          Before
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateScene({ primaryMediaUrl: asset.url });
                            onSetActiveSlot("primary");
                          }}
                          className="flex-1 py-1 px-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[9px] font-bold shadow transition-colors text-center cursor-pointer truncate"
                          title="Set as AFTER image"
                        >
                          After
                        </button>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center gap-1 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isSelectedPrimary && (asset.isVideo || asset.url === currentScene.customVeoVideoUrl)) {
                              onDetachMediaFromScene(e);
                            } else {
                              onSelectMedia(asset);
                            }
                          }}
                          className={`flex-1 py-1 px-1.5 rounded text-white text-[9px] font-bold shadow transition-colors text-center cursor-pointer truncate flex items-center justify-center gap-1 ${
                            isSelectedPrimary && (asset.isVideo || asset.url === currentScene.customVeoVideoUrl)
                              ? "bg-amber-600 hover:bg-amber-500"
                              : "bg-emerald-600 hover:bg-emerald-500"
                          }`}
                        >
                          {isSelectedPrimary && (asset.isVideo || asset.url === currentScene.customVeoVideoUrl) ? (
                            <>
                              <RotateCcw className="h-2.5 w-2.5" />
                              <span>Remove</span>
                            </>
                          ) : (
                            <span>{asset.isVideo ? "Use Video" : "Use Here"}</span>
                          )}
                        </button>

                        {!asset.isVideo && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
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
                              toast("Background Set", "Set photo as clean scene background.", "success");
                            }}
                            className="py-1 px-1.5 rounded bg-cyan-700 hover:bg-cyan-600 text-white text-[9px] font-bold shadow transition-colors text-center cursor-pointer shrink-0 flex items-center gap-0.5"
                            title="Set this photo as clean scene background"
                          >
                            <Home className="h-2.5 w-2.5" />
                            <span>BG</span>
                          </button>
                        )}
                      </div>
                    )}

                    {Boolean(onApplyMediaToTarget) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetActiveMediaDropdownUrl(asset.url);
                        }}
                        className="py-1 px-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white text-[9px] font-bold shadow transition-colors flex items-center gap-0.5 cursor-pointer shrink-0"
                        title="Apply this asset to other scenes"
                      >
                        <span>Apply</span>
                        <ChevronDown className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                )}

                {/* In-Card Scene Assignment Overlay (immune to overflow clipping) */}
                {isAssignMenuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute inset-0 bg-zinc-950/95 backdrop-blur-sm p-2 flex flex-col z-30 rounded-xl overflow-y-auto custom-scrollbar"
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-800 text-[10px] font-bold text-zinc-200">
                      <span className="truncate">Apply to Scene:</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetActiveMediaDropdownUrl(null);
                        }}
                        className="text-zinc-400 hover:text-white p-0.5 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 py-1 space-y-1">
                      {asset.isVideo && onInsertVideoScene && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onInsertVideoScene(asset.url, {
                              prompt: asset.label,
                              durationSeconds: 8,
                            });
                            onSetActiveMediaDropdownUrl(null);
                          }}
                          className="w-full text-left px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="h-2.5 w-2.5" />
                          <span>➕ Insert New Scene</span>
                        </button>
                      )}

                      {!asset.isVideo ? (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApplyMediaToTarget(-1, asset, true);
                            }}
                            className="flex-1 text-center px-1.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[8px] font-bold truncate cursor-pointer"
                            title="Apply as background staging to all scenes"
                          >
                            🌟 All BG
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onApplyMediaToTarget(-1, asset, false);
                            }}
                            className="flex-1 text-center px-1.5 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[8px] font-bold truncate cursor-pointer"
                            title="Apply as visual hero to all scenes"
                          >
                            🌟 All Visual
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onApplyMediaToTarget(-1, asset);
                          }}
                          className="w-full text-left px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-[9px] font-bold flex items-center justify-between cursor-pointer"
                        >
                          <span>🌟 All Scenes</span>
                        </button>
                      )}

                      {allScenes.map((s, sIdx) => {
                        const target0Idx = s.sceneIndex !== undefined ? s.sceneIndex : sIdx;
                        const sNum = target0Idx + 1;
                        const isCur = target0Idx === (currentScene.sceneIndex ?? 0);
                        const isUsedInThisScene =
                          s.customVeoVideoUrl === asset.url ||
                          s.primaryMediaUrl === asset.url ||
                          s.secondaryMediaUrl === asset.url;

                        return (
                          <div
                            key={s.id || sIdx}
                            className={`flex items-center justify-between px-1.5 py-1 rounded text-[9px] transition-colors ${
                              isCur
                                ? "bg-emerald-500/15 text-emerald-300 font-bold"
                                : "hover:bg-zinc-850 text-zinc-300"
                            }`}
                          >
                            <span className="font-semibold text-zinc-300 shrink-0">
                              S{sNum}
                              {isCur && <span className="ml-1 text-[7px] text-emerald-400 font-mono">Cur</span>}
                            </span>

                            <div className="flex items-center gap-1 shrink-0">
                              {!asset.isVideo ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onApplyMediaToTarget(target0Idx, asset, true);
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-colors ${
                                      s.secondaryMediaUrl === asset.url
                                        ? "bg-emerald-500 text-black shadow"
                                        : "bg-emerald-500/20 hover:bg-emerald-500/35 text-emerald-300"
                                    }`}
                                    title={`Set as Background for Scene ${sNum}`}
                                  >
                                    BG
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onApplyMediaToTarget(target0Idx, asset, false);
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-colors ${
                                      s.primaryMediaUrl === asset.url
                                        ? "bg-cyan-500 text-black shadow"
                                        : "bg-cyan-500/20 hover:bg-cyan-500/35 text-cyan-300"
                                    }`}
                                    title={`Set as Visual for Scene ${sNum}`}
                                  >
                                    Visual
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onApplyMediaToTarget(target0Idx, asset, false);
                                  }}
                                  className={`px-2 py-0.5 rounded text-[8px] font-bold cursor-pointer transition-colors ${
                                    s.customVeoVideoUrl === asset.url || s.primaryMediaUrl === asset.url
                                      ? "bg-purple-500 text-white shadow"
                                      : "bg-purple-500/20 hover:bg-purple-500/35 text-purple-300"
                                  }`}
                                >
                                  Use Video
                                </button>
                              )}

                              {isUsedInThisScene && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDetachMediaFromScene(e, target0Idx);
                                  }}
                                  className="p-0.5 rounded hover:bg-amber-500/20 text-amber-400 text-[8px] cursor-pointer"
                                  title={`Detach from Scene ${sNum}`}
                                >
                                  <RotateCcw className="h-2.5 w-2.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Bottom Overlay Label */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-1.5 pt-3 pointer-events-none">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] text-zinc-300 font-medium truncate">
                      {asset.label}
                    </p>
                    {asset.isVideo && (
                      <Film className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
