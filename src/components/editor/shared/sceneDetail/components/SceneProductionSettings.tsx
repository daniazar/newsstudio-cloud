/**
 * src/components/editor/shared/sceneDetail/components/SceneProductionSettings.tsx
 *
 * Production overrides for speaker name/title, scene transitions,
 * aspect fit mode, background prompt, and social sticker triggers.
 */

import React from "react";
import { MediaSettingsData, TRANSITIONS } from "../types";

interface SceneProductionSettingsProps {
  mediaSettings: MediaSettingsData;
  setMediaSettings: React.Dispatch<React.SetStateAction<MediaSettingsData>>;
  onSettingChange: (key: keyof MediaSettingsData, value: MediaSettingsData[keyof MediaSettingsData]) => void;
}

export function SceneProductionSettings({
  mediaSettings,
  setMediaSettings,
  onSettingChange,
}: SceneProductionSettingsProps) {
  return (
    <div className="mb-6 p-4 rounded-xl bg-surface-raised border border-border space-y-4">
      <p className="text-[10px] uppercase tracking-wider text-muted font-bold">
        Production Settings
      </p>

      {/* Custom Name/Title */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] uppercase text-muted font-bold">Override Name</label>
          <input
            type="text"
            placeholder="Leave blank for persona name"
            className="w-full bg-surface border border-border rounded px-2 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
            value={mediaSettings.speakerName || ""}
            onChange={(e) =>
              setMediaSettings({ ...mediaSettings, speakerName: e.target.value })
            }
            onBlur={(e) => onSettingChange("speakerName", e.currentTarget.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase text-muted font-bold">Override Title</label>
          <input
            type="text"
            placeholder="Leave blank for persona title"
            className="w-full bg-surface border border-border rounded px-2 py-1.5 text-xs text-foreground focus:border-accent focus:outline-none"
            value={mediaSettings.speakerTitle || ""}
            onChange={(e) =>
              setMediaSettings({ ...mediaSettings, speakerTitle: e.target.value })
            }
            onBlur={(e) => onSettingChange("speakerTitle", e.currentTarget.value)}
          />
        </div>
      </div>

      {/* Transition Selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-foreground">Scene Transition</label>
        <div className="grid grid-cols-2 gap-2">
          {TRANSITIONS.map((t) => (
            <button
              key={t.id}
              onClick={() => onSettingChange("transitionType", t.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded border text-[10px] font-medium transition-all cursor-pointer ${
                (mediaSettings.transitionType || "fade") === t.id
                  ? "border-accent bg-accent/5 text-accent"
                  : "border-border bg-surface text-muted hover:text-foreground"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
