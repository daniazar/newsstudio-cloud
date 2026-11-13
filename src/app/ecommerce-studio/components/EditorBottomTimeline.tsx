import { AdScript } from "@/lib/types/ecommerce";
import { Clapperboard,Plus,Trash2 } from "lucide-react";
import React from "react";

export interface EditorBottomTimelineProps {
  script: AdScript | null;
  selectedSceneIndex: number;
  onSelectScene: (index: number) => void;
  onAddScene?: () => void;
  onDeleteScene?: (index: number) => void;
}

export const EditorBottomTimeline: React.FC<EditorBottomTimelineProps> = ({
  script,
  selectedSceneIndex,
  onSelectScene,
  onAddScene,
  onDeleteScene,
}) => {
  const scenes = script?.scenes || [];

  return (
    <div className="h-32 bg-zinc-900 border-t border-zinc-800 p-3 flex items-center gap-3 overflow-x-auto shrink-0">
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
          <Clapperboard className="w-4 h-4 text-cyan-400" />
          Timeline ({scenes.length})
        </div>
        {onAddScene && (
          <button
            onClick={onAddScene}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-zinc-700 transition-colors"
            title="Add New Scene"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 overflow-x-auto flex-1">
        {scenes.map((scene, idx) => {
          const isSelected = selectedSceneIndex === idx;
          const durationSec = ((scene.durationFrames || 90) / 30).toFixed(1);

          return (
            <div
              key={scene.id || idx}
              onClick={() => onSelectScene(idx)}
              className={`group relative p-2.5 rounded-xl border cursor-pointer transition-all shrink-0 min-w-[140px] flex flex-col justify-between ${
                isSelected
                  ? "bg-cyan-950/80 border-cyan-500 text-white shadow-md"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] font-bold text-cyan-400">Scene #{idx + 1}</span>
                <span className="text-[10px] text-zinc-500 font-mono">{durationSec}s</span>
              </div>
              <p className="text-xs font-semibold truncate my-1">
                {scene.headline || "Untitled Scene"}
              </p>
              <div className="text-[10px] text-zinc-400 truncate opacity-80">
                {scene.voiceoverScript || scene.visualActionPrompt || "No script"}
              </div>

              {onDeleteScene && scenes.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteScene(idx);
                  }}
                  className="absolute top-1 right-1 p-1 rounded bg-zinc-900/80 hover:bg-rose-950 hover:text-rose-400 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Scene"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
