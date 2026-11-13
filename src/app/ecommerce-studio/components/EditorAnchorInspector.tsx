import React from "react";
import { AdPresenterConfig } from "@/lib/types/ecommerce";
import { UserCheck, Sparkles } from "lucide-react";

export interface EditorAnchorInspectorProps {
  presenterConfig: AdPresenterConfig;
  onUpdatePresenterConfig: (updater: Partial<AdPresenterConfig>) => void;
  isGeneratingLipSync?: boolean;
  onGenerateLipSync?: () => void;
}

export const EditorAnchorInspector: React.FC<EditorAnchorInspectorProps> = ({
  presenterConfig,
  onUpdatePresenterConfig,
  isGeneratingLipSync,
  onGenerateLipSync,
}) => {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-cyan-400" />
          Enable AI Presenter
        </label>
        <input
          type="checkbox"
          checked={presenterConfig.enabled}
          onChange={(e) => onUpdatePresenterConfig({ enabled: e.target.checked })}
          className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Presenter Persona</label>
        <select
          value={presenterConfig.personaId || "marcus"}
          onChange={(e) => onUpdatePresenterConfig({ personaId: e.target.value })}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="marcus">Marcus (tech_reviewer)</option>
          <option value="sophia">Sophia (lifestyle_creator)</option>
          <option value="alex">Alex (fitness_coach)</option>
          <option value="elena">Elena (luxury_expert)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-400 mb-1">Layout Mode</label>
        <select
          value={presenterConfig.layoutMode || presenterConfig.position || "circle_pip"}
          onChange={(e) => onUpdatePresenterConfig({ layoutMode: e.target.value as AdPresenterConfig["layoutMode"], position: e.target.value as AdPresenterConfig["position"] })}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="circle_pip">Circle PiP Corner</option>
          <option value="bottom_right">Bottom Right</option>
          <option value="bottom_left">Bottom Left</option>
          <option value="split_side">Split Screen</option>
          <option value="full_screen">Full Screen Anchor</option>
        </select>
      </div>

      {onGenerateLipSync && (
        <button
          onClick={onGenerateLipSync}
          disabled={isGeneratingLipSync}
          className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {isGeneratingLipSync ? "Generating LipSync..." : "Generate Scene LipSync"}
        </button>
      )}
    </div>
  );
};
