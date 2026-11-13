import { INTEGRAL_LAYOUT_TEMPLATES } from "@/lib/ecommerce/layoutTemplates";
import { AdScene } from "@/lib/types/ecommerce";
import React from "react";

export interface EditorSceneInspectorProps {
  currentScene: AdScene | null;
  onUpdateScene: (field: keyof AdScene, value: unknown) => void;
  onApplyLayoutTemplate?: (templateId: string) => void;
}

export const EditorSceneInspector: React.FC<EditorSceneInspectorProps> = ({
  currentScene,
  onUpdateScene,
  onApplyLayoutTemplate,
}) => {
  if (!currentScene) {
    return <div className="p-4 text-xs text-zinc-500">Select a scene from the timeline to edit.</div>;
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <label className="block text-xs font-semibold text-zinc-300 mb-1">Headline Text</label>
        <input
          type="text"
          value={currentScene.headline || ""}
          onChange={(e) => onUpdateScene("headline", e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-300 mb-1">Voiceover Script</label>
        <textarea
          rows={3}
          value={currentScene.voiceoverScript || ""}
          onChange={(e) => onUpdateScene("voiceoverScript", e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-300 mb-1">Visual Action Prompt</label>
        <input
          type="text"
          value={currentScene.visualActionPrompt || ""}
          onChange={(e) => onUpdateScene("visualActionPrompt", e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-300 mb-1">Layout Template</label>
        <div className="grid grid-cols-2 gap-2">
          {INTEGRAL_LAYOUT_TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => onApplyLayoutTemplate && onApplyLayoutTemplate(tmpl.id)}
              className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-cyan-500 text-left text-xs font-medium text-zinc-300 hover:text-white transition-all"
            >
              {tmpl.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
