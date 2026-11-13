/**
 * src/components/editor/shared/sceneDetail/components/SceneBRollMediaControls.tsx
 *
 * B-roll asset assignment card with auto-matching, gallery launcher,
 * and transform sliders (Zoom, Pan X, Pan Y, Trim Start, Trim End).
 */

import React, { useState } from "react";
import { MediaSettingsData } from "../types";

interface SceneBRollMediaControlsProps {
  segmentIndex: number;
  assetPath?: string | null;
  assetType?: string | null;
  keyword?: string | null;
  textSnippet: string;
  mediaSettings: MediaSettingsData;
  setMediaSettings: React.Dispatch<React.SetStateAction<MediaSettingsData>>;
  onSettingChange: (key: keyof MediaSettingsData, value: MediaSettingsData[keyof MediaSettingsData]) => void;
  onOpenGallery: () => void;
  onUpdateAsset?: (index: number, url: string, type: "video" | "image") => void;
  onRegenerateBRoll?: (index: number) => void;
}

export function SceneBRollMediaControls({
  segmentIndex,
  assetPath,
  assetType,
  keyword,
  textSnippet,
  mediaSettings,
  setMediaSettings,
  onSettingChange,
  onOpenGallery,
  onUpdateAsset,
  onRegenerateBRoll,
}: SceneBRollMediaControlsProps) {
  const [isAutoMatching, setIsAutoMatching] = useState(false);
  const isScene0 = segmentIndex === 0;

  const handleAutoMatchBRoll = async () => {
    if (isAutoMatching || isScene0) return;
    setIsAutoMatching(true);
    try {
      if (onRegenerateBRoll) {
        await onRegenerateBRoll(segmentIndex);
      } else {
        const storyId = window.location.pathname.split("/").pop();
        const res = await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "auto-match-broll",
            segmentIndex,
            query: keyword || textSnippet.slice(0, 30),
            mediaType: "video",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.asset && onUpdateAsset) {
            onUpdateAsset(segmentIndex, data.asset.url, data.asset.type);
          }
        }
      }
    } catch (e) {
      console.error("Auto match failed:", e);
    } finally {
      setIsAutoMatching(false);
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
        <label className="text-xs font-semibold text-foreground block">B-Roll Asset</label>
        <div className="flex items-center gap-1">
          {isScene0 ? (
            <span className="text-[9px] font-mono text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
              🏢 Studio Set Scene
            </span>
          ) : (
            <button
              onClick={handleAutoMatchBRoll}
              disabled={isAutoMatching}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 transition-all cursor-pointer flex items-center gap-1"
              title="Auto-search 4K stock video for this scene"
            >
              {isAutoMatching ? (
                <>
                  <span className="w-2 h-2 border border-purple-400 border-t-transparent rounded-full animate-spin" />
                  Matching...
                </>
              ) : (
                <>
                  <span>🔍</span> Auto-Find B-Roll
                </>
              )}
            </button>
          )}
          <button
            onClick={onOpenGallery}
            className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-border bg-surface text-muted hover:text-foreground transition-all cursor-pointer"
            title="Open full stock asset gallery"
          >
            🖼️ Gallery
          </button>
        </div>
      </div>
      <div className="p-3 rounded-lg bg-surface border border-border">
        {assetPath ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className="text-accent">✓</span>
              <span className="text-xs text-foreground truncate">
                {assetPath.split("/").pop() || assetPath}
              </span>
            </div>

            <div className="border-t border-border pt-3 space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-muted font-semibold">
                Media Controls
              </p>

              {/* Scale */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted w-12">Zoom</label>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.05"
                  value={mediaSettings.scale}
                  onChange={(e) =>
                    setMediaSettings({ ...mediaSettings, scale: parseFloat(e.target.value) })
                  }
                  onPointerUp={(e) =>
                    onSettingChange("scale", parseFloat((e.currentTarget as HTMLInputElement).value))
                  }
                  onKeyUp={(e) =>
                    onSettingChange("scale", parseFloat((e.currentTarget as HTMLInputElement).value))
                  }
                  className="flex-1 accent-accent"
                />
                <span className="text-xs font-mono text-muted w-8">
                  {mediaSettings.scale.toFixed(2)}x
                </span>
              </div>

              {/* Pan X */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted w-12">Pan X</label>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={mediaSettings.offsetX}
                  onChange={(e) =>
                    setMediaSettings({ ...mediaSettings, offsetX: parseFloat(e.target.value) })
                  }
                  onPointerUp={(e) =>
                    onSettingChange("offsetX", parseFloat((e.currentTarget as HTMLInputElement).value))
                  }
                  onKeyUp={(e) =>
                    onSettingChange("offsetX", parseFloat((e.currentTarget as HTMLInputElement).value))
                  }
                  className="flex-1 accent-accent"
                />
                <span className="text-xs font-mono text-muted w-8">{mediaSettings.offsetX}%</span>
              </div>

              {/* Pan Y */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-muted w-12">Pan Y</label>
                <input
                  type="range"
                  min="-50"
                  max="50"
                  step="1"
                  value={mediaSettings.offsetY}
                  onChange={(e) =>
                    setMediaSettings({ ...mediaSettings, offsetY: parseFloat(e.target.value) })
                  }
                  onPointerUp={(e) =>
                    onSettingChange("offsetY", parseFloat((e.currentTarget as HTMLInputElement).value))
                  }
                  onKeyUp={(e) =>
                    onSettingChange("offsetY", parseFloat((e.currentTarget as HTMLInputElement).value))
                  }
                  className="flex-1 accent-accent"
                />
                <span className="text-xs font-mono text-muted w-8">{mediaSettings.offsetY}%</span>
              </div>

              {assetType === "video" && (
                <>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-muted w-12">Trim Start</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={mediaSettings.startTrim}
                      onChange={(e) =>
                        setMediaSettings({
                          ...mediaSettings,
                          startTrim: parseFloat(e.target.value),
                        })
                      }
                      onPointerUp={(e) =>
                        onSettingChange("startTrim", parseFloat((e.currentTarget as HTMLInputElement).value))
                      }
                      onKeyUp={(e) =>
                        onSettingChange("startTrim", parseFloat((e.currentTarget as HTMLInputElement).value))
                      }
                      className="flex-1 accent-accent"
                    />
                    <span className="text-xs font-mono text-muted w-8">
                      {mediaSettings.startTrim}s
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-xs text-muted w-12">Trim End</label>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={mediaSettings.endTrim}
                      onChange={(e) =>
                        setMediaSettings({
                          ...mediaSettings,
                          endTrim: parseFloat(e.target.value),
                        })
                      }
                      onPointerUp={(e) =>
                        onSettingChange("endTrim", parseFloat((e.currentTarget as HTMLInputElement).value))
                      }
                      onKeyUp={(e) =>
                        onSettingChange("endTrim", parseFloat((e.currentTarget as HTMLInputElement).value))
                      }
                      className="flex-1 accent-accent"
                    />
                    <span className="text-xs font-mono text-muted w-8">
                      {mediaSettings.endTrim}s
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted">
            No B-roll assigned. Drag & drop a file onto the scene block.
          </p>
        )}
      </div>
    </div>
  );
}
