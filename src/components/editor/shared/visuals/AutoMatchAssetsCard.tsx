/**
 * src/components/editor/shared/visuals/AutoMatchAssetsCard.tsx
 *
 * Visuals & Product Asset Studio Auto-Director Panel for Commercial Video Ads.
 * Faithful implementation of the News Studio Visuals & B-Roll Studio card (media_1788977407034.png).
 *
 * Features:
 * - Header: VISUALS & PRODUCT ASSET STUDIO with dynamic coverage badge
 * - Hero Card: Auto-Match Product Assets & Scene Modes with 🔄 ⚡ Auto-Match button
 * - Scene Matrix: Per-scene thumbnail preview, scene mode selector, white background cutout toggle, and single-scene match shortcut
 */

"use client";

import { autoDirectSceneAssetsAndModes } from "@/lib/ecommerce/sceneAutoDirector";
import { AdScene,ProductSpec } from "@/lib/types/ecommerce";
import { ChevronDown,Film,Image as ImageIcon,RefreshCw,Wand2 } from "lucide-react";
import React,{ useState } from "react";

export interface AutoMatchAssetsCardProps {
  scenes: AdScene[];
  productSpec?: ProductSpec | null;
  onUpdateScenes: (updatedScenes: AdScene[]) => void;
  onUpdateScene: (sceneIndex: number, updates: Partial<AdScene>) => void;
  onSelectScene?: (sceneIndex: number) => void;
  selectedSceneIndex?: number | null;
  defaultCollapsed?: boolean;
  default3dTurntableUrl?: string | null;
}

const SCENE_MODE_OPTIONS: { id: AdScene["sceneType"]; label: string; icon: string }[] = [
  { id: "pattern_interrupt_hook", label: "Pattern Interrupt Hook", icon: "⚡" },
  { id: "before_after_wipe", label: "Before / After Comparison Wipe", icon: "⚖️" },
  { id: "3d_exploded_blueprint", label: "3D Exploded Blueprint Specs", icon: "🔬" },
  { id: "macro_texture_zoom", label: "Macro Texture Sensory Zoom", icon: "🔍" },
  { id: "torture_stress_test", label: "Torture Durability Stress Test", icon: "🛡️" },
  { id: "room_staging", label: "Lifestyle Room Staging", icon: "🏡" },
  { id: "social_proof_review", label: "Verified 5-Star Social Proof", icon: "⭐" },
  { id: "colorway_swatch_switcher", label: "Colorway Swatch Switcher", icon: "🎨" },
  { id: "product_turntable", label: "Floating 3D Product Turntable", icon: "🔄" },
  { id: "price_promo_outro", label: "Price Promo & Urgent CTA Outro", icon: "🏷️" },
];

export const AutoMatchAssetsCard: React.FC<AutoMatchAssetsCardProps> = ({
  scenes,
  productSpec,
  onUpdateScenes,
  onUpdateScene,
  onSelectScene,
  selectedSceneIndex,
  defaultCollapsed = true,
  default3dTurntableUrl,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isMatchingAll, setIsMatchingAll] = useState(false);

  // Calculate coverage
  const readyCount = scenes.filter((s) => !!s.primaryMediaUrl).length;
  const coveragePercent = Math.round((readyCount / Math.max(1, scenes.length)) * 100);

  const handleMatchAll = () => {
    setIsMatchingAll(true);
    setTimeout(() => {
      const result = autoDirectSceneAssetsAndModes(scenes, productSpec, { default3dTurntableUrl });
      onUpdateScenes(result.updatedScenes);
      setIsMatchingAll(false);
    }, 400);
  };

  const handleSingleSceneMatch = (sceneIndex: number) => {
    const singleSlice = [scenes[sceneIndex]];
    const result = autoDirectSceneAssetsAndModes(singleSlice, productSpec, { default3dTurntableUrl });
    if (result.updatedScenes[0]) {
      onUpdateScene(sceneIndex, result.updatedScenes[0]);
    }
  };

  if (isCollapsed) {
    return (
      <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Film className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-200">
                Visuals & Product Asset Studio
              </h4>
              <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-500/30 shrink-0">
                {readyCount}/{scenes.length} Ready ({coveragePercent}%)
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 truncate mt-0.5">
              Product imagery, lifestyle B-roll, and kinematic scene modes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isMatchingAll || scenes.length === 0}
            onClick={handleMatchAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${isMatchingAll ? "animate-spin" : ""}`} />
            <span>{isMatchingAll ? "Matching..." : "⚡ Auto-Match All"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            aria-label="Expand visuals and assets panel"
            className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 shrink-0">
        <div>
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <Film className="w-3.5 h-3.5 text-sky-400" />
            <span>Visuals & Product Asset Studio</span>
          </h2>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Product imagery, lifestyle B-roll, and kinematic scene modes
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-500/30">
            {readyCount}/{scenes.length} READY ({coveragePercent}%)
          </span>
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            aria-label="Collapse visuals and assets panel"
            className="p-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronDown className="h-4 w-4 rotate-180" />
          </button>
        </div>
      </div>

      {/* Batch Auto-Match All Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/40 via-zinc-950 to-purple-950/30 border border-sky-500/30 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-bold text-white">Auto-Match Story B-Roll & Modes</span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400">
            Scenes 1–{scenes.length}
          </span>
        </div>

        <p className="text-[11px] text-zinc-400 leading-relaxed">
          Intelligently assigns hero packshots, lifestyle photos, customer reviews, and kinematic scene modes across all scenes based on script narrative and typology.
        </p>

        <button
          type="button"
          disabled={isMatchingAll || scenes.length === 0}
          onClick={handleMatchAll}
          className="w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 bg-sky-500 hover:bg-sky-600 text-white shadow-md shadow-sky-500/20 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isMatchingAll ? "animate-spin" : ""}`} />
          <span>{isMatchingAll ? "Auto-Matching Storyboard..." : "⚡ Auto-Match All Assets & Scene Modes"}</span>
        </button>
      </div>

      {/* Scene-by-Scene Visual Matrix */}
      <div className="space-y-2.5">
        <span className="text-[10px] font-mono uppercase font-bold text-zinc-400 block">
          Scene Media Matrix ({scenes.length} Scenes)
        </span>

        <div className="space-y-2 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
          {scenes.map((scene, idx) => {
            const isSelected = selectedSceneIndex === idx;

            return (
              <div
                key={scene.id || idx}
                onClick={() => onSelectScene?.(idx)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-zinc-900 border-sky-500/60 ring-1 ring-sky-500/30 shadow-sm"
                    : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Media Thumbnail */}
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0 relative group">
                    {scene.primaryMediaUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={scene.primaryMediaUrl}
                        alt={`Scene ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-500 text-[9px]">
                        <ImageIcon className="h-4 w-4 mb-1 text-zinc-600" />
                        <span>No asset</span>
                      </div>
                    )}

                    {scene.removeWhiteBg && (
                      <span className="absolute bottom-0.5 right-0.5 text-[8px] bg-black/80 text-emerald-400 px-1 rounded font-mono">
                        Cutout
                      </span>
                    )}
                  </div>

                  {/* Scene Details & Controls */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-200">
                        Scene #{idx + 1}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSingleSceneMatch(idx);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 font-medium transition-colors"
                        title="Auto-match asset and mode for this scene only"
                      >
                        ✨ Auto-Match
                      </button>
                    </div>

                    {/* Scene Mode Dropdown */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={scene.sceneType}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          onUpdateScene(idx, {
                            sceneType: e.target.value as AdScene["sceneType"],
                          });
                        }}
                        className="w-full text-xs font-semibold bg-zinc-900 border border-zinc-700/80 rounded-lg px-2 py-1 text-zinc-200 focus:border-sky-500 focus:outline-none cursor-pointer"
                      >
                        {SCENE_MODE_OPTIONS.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.icon} {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* White Background Cutout Toggle */}
                    <div className="flex items-center justify-between pt-1">
                      <label
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={scene.removeWhiteBg ?? false}
                          onChange={(e) => {
                            onUpdateScene(idx, { removeWhiteBg: e.target.checked });
                          }}
                          className="rounded border-zinc-700 bg-zinc-900 text-sky-500 focus:ring-0 cursor-pointer"
                        />
                        <span>Remove White Background (3D Cutout)</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
