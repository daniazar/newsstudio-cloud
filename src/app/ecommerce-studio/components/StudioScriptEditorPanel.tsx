import { ARCHETYPE_OPTIONS,CHANNEL_OPTIONS } from "@/app/ecommerce-studio/constants/studioConstants";
import { AdScene,AdScript,TargetDistributionChannel,VideoArchetype } from "@/lib/types/ecommerce";
import { Clapperboard } from "lucide-react";
import React from "react";

export interface StudioScriptEditorPanelProps {
  script: AdScript | null;
  selectedSceneIndex: number;
  onSelectScene: (index: number) => void;
  onUpdateScene: (field: keyof AdScene, value: unknown) => void;
  onSelectArchetype?: (archetype: VideoArchetype) => void;
  onSelectChannel?: (channel: TargetDistributionChannel) => void;
}

export const StudioScriptEditorPanel: React.FC<StudioScriptEditorPanelProps> = ({
  script,
  selectedSceneIndex,
  onSelectScene,
  onUpdateScene,
  onSelectArchetype,
  onSelectChannel,
}) => {
  const currentScene = script?.scenes?.[selectedSceneIndex] || null;

  return (
    <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-200 flex items-center gap-2">
          <Clapperboard className="w-4 h-4 text-cyan-400" />
          Commercial Script & Scene Director
        </h2>
        <span className="text-xs text-zinc-500">
          {script?.scenes?.length || 0} Scenes Configured
        </span>
      </div>

      {script && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Video Archetype</label>
            <select
              value={script.archetype || "viral_ugc"}
              onChange={(e) => onSelectArchetype && onSelectArchetype(e.target.value as VideoArchetype)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
            >
              {ARCHETYPE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Distribution Channel</label>
            <select
              value={script.targetChannel || "tiktok_shop"}
              onChange={(e) => onSelectChannel && onSelectChannel(e.target.value as TargetDistributionChannel)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
            >
              {CHANNEL_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Scene Navigation Cards */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {(script?.scenes || []).map((scene, idx) => {
          const isSelected = selectedSceneIndex === idx;
          return (
            <button
              key={scene.id || idx}
              onClick={() => onSelectScene(idx)}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all shrink-0 text-left ${
                isSelected
                  ? "bg-cyan-950 border-cyan-500 text-cyan-300 shadow-sm"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <div className="font-bold">Scene #{idx + 1}</div>
              <div className="text-[11px] opacity-80 truncate max-w-[120px]">
                {scene.headline || "Untitled"}
              </div>
            </button>
          );
        })}
      </div>

      {currentScene && (
        <div className="space-y-3 pt-2 border-t border-zinc-800">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Headline Text</label>
            <input
              type="text"
              value={currentScene.headline || ""}
              onChange={(e) => onUpdateScene("headline", e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Voiceover Script</label>
            <textarea
              rows={3}
              value={currentScene.voiceoverScript || ""}
              onChange={(e) => onUpdateScene("voiceoverScript", e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      )}
    </div>
  );
};
