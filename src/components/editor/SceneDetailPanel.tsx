"use client";

/**
 * src/components/editor/SceneDetailPanel.tsx
 *
 * Inspector panel for detailed scene parameter configuration:
 * Global Project Settings when no scene is active, or granular scene controls
 * (Cadence script polish, B-roll selection/pan/zoom/trim, anchor action loops,
 * layout strategy, transitions, and social sticker overlays).
 */

import React, { useState } from "react";
import { MusicGalleryModal } from "./MusicGalleryModal";
import { RealtimeLipSyncPreviewModal } from "./RealtimeLipSyncPreviewModal";
import { CameraCue } from "@/lib/types/stateMachine";

import {
  Segment,
  SceneDetailPanelProps,
  DEFAULT_MEDIA_SETTINGS,
  MediaSettingsData,
} from "./shared/sceneDetail/types";
import { GlobalProjectSettings } from "./shared/sceneDetail/components/GlobalProjectSettings";
import { ScenePresenterAnchorCard } from "./shared/sceneDetail/components/ScenePresenterAnchorCard";
import { SceneProductionSettings } from "./shared/sceneDetail/components/SceneProductionSettings";

export type { Segment, SceneDetailPanelProps };

export const SceneDetailPanel: React.FC<SceneDetailPanelProps> = ({
  segment,
  totalScenes = 5,
  videoSettings,
  onUpdateText,
  onUpdateMediaSettings,
  onUpdateVideoSettings,
  onDeleteScene,
  onClose,
  onSelectPresenterTab,
  onUpdateSegmentActionLoop,
  storyId,
}) => {
  const [editedText, setEditedText] = useState(segment?.text ?? "");
  const [isMusicGalleryOpen, setIsMusicGalleryOpen] = useState(false);
  const [isLipSyncPreviewOpen, setIsLipSyncPreviewOpen] = useState(false);

  const [mediaSettings, setMediaSettings] = useState<MediaSettingsData>(() => {
    if (!segment) return DEFAULT_MEDIA_SETTINGS;
    if (segment.mediaSettings) {
      try {
        const parsed = JSON.parse(segment.mediaSettings);
        return {
          ...DEFAULT_MEDIA_SETTINGS,
          ...parsed,
          actionLoop: parsed.actionLoop || segment.actionLoop || "state_idle",
          cameraCue: (parsed.cameraCue ||
            segment.cameraCue ||
            (segment.index === 0
              ? "cam1_wide"
              : segment.index % 2 === 1
              ? "cam2_left"
              : "cam3_closeup")) as CameraCue,
        };
      } catch {
        return {
          ...DEFAULT_MEDIA_SETTINGS,
          actionLoop: segment.actionLoop || "state_idle",
          cameraCue: (segment.cameraCue ||
            (segment.index === 0 ? "cam1_wide" : "cam2_left")) as CameraCue,
        };
      }
    }
    return {
      ...DEFAULT_MEDIA_SETTINGS,
      actionLoop: segment.actionLoop || "state_idle",
      cameraCue: (segment.cameraCue ||
        (segment.index === 0 ? "cam1_wide" : "cam2_left")) as CameraCue,
    };
  });

  const [prevSegmentId, setPrevSegmentId] = useState(segment?.id);
  const [prevMediaSettingsRaw, setPrevMediaSettingsRaw] = useState(segment?.mediaSettings);
  const [prevSegmentText, setPrevSegmentText] = useState(segment?.text);

  // Sync segment changes to local state during render
  if (
    segment &&
    (segment.id !== prevSegmentId ||
      segment.mediaSettings !== prevMediaSettingsRaw ||
      segment.text !== prevSegmentText)
  ) {
    if (segment.id !== prevSegmentId) {
      setPrevSegmentId(segment.id);
    }
    if (segment.text !== prevSegmentText) {
      setPrevSegmentText(segment.text);
      setEditedText(segment.text);
    }
    if (segment.id !== prevSegmentId || segment.mediaSettings !== prevMediaSettingsRaw) {
      setPrevMediaSettingsRaw(segment.mediaSettings);
      let nextMs: MediaSettingsData = DEFAULT_MEDIA_SETTINGS;
      if (segment.mediaSettings) {
        try {
          const parsed = JSON.parse(segment.mediaSettings);
          nextMs = {
            ...DEFAULT_MEDIA_SETTINGS,
            ...parsed,
            actionLoop: parsed.actionLoop || segment.actionLoop || "state_idle",
            cameraCue: (parsed.cameraCue ||
              segment.cameraCue ||
              (segment.index === 0
                ? "cam1_wide"
                : segment.index % 2 === 1
                ? "cam2_left"
                : "cam3_closeup")) as CameraCue,
          };
        } catch {
          nextMs = {
            ...DEFAULT_MEDIA_SETTINGS,
            actionLoop: segment.actionLoop || "state_idle",
            cameraCue: (segment.cameraCue ||
              (segment.index === 0 ? "cam1_wide" : "cam2_left")) as CameraCue,
          };
        }
      } else {
        nextMs = {
          ...DEFAULT_MEDIA_SETTINGS,
          actionLoop: segment.actionLoop || "state_idle",
          cameraCue: (segment.cameraCue ||
            (segment.index === 0 ? "cam1_wide" : "cam2_left")) as CameraCue,
        };
      }
      setMediaSettings(nextMs);
    }
  }

  const handleSaveMediaSettings = (newSettings: MediaSettingsData) => {
    setMediaSettings(newSettings);
    if (segment) {
      onUpdateMediaSettings(segment.index, JSON.stringify(newSettings), {
        transitionType: newSettings.transitionType,
        backgroundPrompt: newSettings.backgroundPrompt,
        stickers: newSettings.stickers,
        objectFit: newSettings.objectFit,
        sceneStrategy: newSettings.sceneStrategy,
        actionLoop: newSettings.actionLoop,
        cameraCue: newSettings.cameraCue,
      });
    }
  };

  const handleSettingChange = (key: keyof MediaSettingsData, value: MediaSettingsData[keyof MediaSettingsData]) => {
    handleSaveMediaSettings({ ...mediaSettings, [key]: value });
  };

  // When no scene is selected, display global project settings
  if (!segment) {
    return (
      <>
        <GlobalProjectSettings
          videoSettings={videoSettings}
          onUpdateVideoSettings={onUpdateVideoSettings}
          onOpenMusicGallery={() => setIsMusicGalleryOpen(true)}
        />
        {isMusicGalleryOpen && (
          <MusicGalleryModal
            onSelect={(url) => {
              if (onUpdateVideoSettings) onUpdateVideoSettings({ bgMusicPath: url });
            }}
            onClose={() => setIsMusicGalleryOpen(false)}
          />
        )}
      </>
    );
  }

  const isIntro = segment.index === -1 || segment.id === "intro";
  const isOutro = segment.index === -2 || segment.id === "outro";

  if (isIntro || isOutro) {
    return (
      <div className="h-full flex flex-col p-4 overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{isIntro ? "🎬" : "🏁"}</span>
            <div>
              <h3 className="text-sm font-bold text-accent">
                {isIntro ? "Intro Bumper" : "Outro Bumper"}
              </h3>
              <p className="text-[10px] text-muted">
                {isIntro ? "Brand Logo Sting & Slogan" : "Call-To-Action & Social Card"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground text-sm cursor-pointer p-1"
          >
            ✕
          </button>
        </div>

        <div className="p-3 rounded-xl bg-surface border border-border space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted uppercase text-[10px] font-bold">Duration</span>
            <span className="font-mono text-foreground font-bold">3.0s (90 frames)</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted uppercase text-[10px] font-bold">
              {isIntro ? "Slogan Preset" : "Outro Preset"}
            </span>
            <span className="font-mono text-accent">
              {isIntro ? (videoSettings?.sloganId || "Default Stinger") : (videoSettings?.outroId || "Subscribe / CTA")}
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 text-xs text-muted space-y-1">
          <p className="font-bold text-accent">
            {isIntro ? "💡 Intro Bumper Info" : "💡 Outro Bumper Info"}
          </p>
          <p className="text-[11px] leading-relaxed">
            {isIntro
              ? "The intro bumper plays first in the broadcast sequence. You can customize the slogan and channel watermark in Global Settings."
              : "The outro bumper plays at the conclusion of the broadcast with call-to-action cards and channel branding."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto">
      {/* Scene Presenter Anchor Card (Identity, Action Loop, 3-Camera Rig, Neural Lip-Sync) */}
      <ScenePresenterAnchorCard
        segment={segment}
        totalScenes={totalScenes}
        mediaSettings={mediaSettings}
        setMediaSettings={setMediaSettings}
        onUpdateMediaSettings={onUpdateMediaSettings}
        onUpdateSegmentActionLoop={onUpdateSegmentActionLoop}
        onSelectPresenterTab={onSelectPresenterTab}
        onSelectCameraCue={(cue) => handleSettingChange("cameraCue", cue)}
        onTestLipSync={() => setIsLipSyncPreviewOpen(true)}
      />

      {/* Visual Subtitles (On-Screen Captions) */}
      <div className="mb-4 p-3.5 rounded-xl bg-surface border border-border space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">
            Visual Subtitles (On-Screen Captions)
          </label>
          <span className="text-[10px] font-mono text-muted">
            {editedText.length} chars
          </span>
        </div>
        <textarea
          rows={3}
          value={editedText}
          onChange={(e) => {
            const next = e.target.value;
            setEditedText(next);
            if (segment && onUpdateText) {
              onUpdateText(segment.index, next, segment.spokenText);
            }
          }}
          className="w-full bg-surface-raised border border-border rounded-lg p-2.5 text-xs text-foreground placeholder:text-muted focus:border-accent focus:outline-none resize-none leading-relaxed"
          placeholder="Enter on-screen subtitles for this scene..."
        />
      </div>

      {/* Production Settings */}
      <SceneProductionSettings
        mediaSettings={mediaSettings}
        setMediaSettings={setMediaSettings}
        onSettingChange={handleSettingChange}
      />

      {/* Actions */}
      <div className="mt-auto pt-4 border-t border-border">
        <button
          disabled={totalScenes <= 1}
          onClick={() => segment && onDeleteScene?.(segment.id)}
          className="w-full py-2 rounded-lg border border-red-500/30 bg-red-500/5 text-red-500 text-[10px] font-bold uppercase tracking-wider hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title={totalScenes <= 1 ? "Cannot delete the only scene in story" : "Delete this scene"}
        >
          🗑️ Delete Scene
        </button>
      </div>

      {isMusicGalleryOpen && (
        <MusicGalleryModal
          onSelect={(url) => {
            if (onUpdateVideoSettings) onUpdateVideoSettings({ bgMusicPath: url });
          }}
          onClose={() => setIsMusicGalleryOpen(false)}
        />
      )}

      {isLipSyncPreviewOpen && segment && (
        <RealtimeLipSyncPreviewModal
          isOpen={isLipSyncPreviewOpen}
          onClose={() => setIsLipSyncPreviewOpen(false)}
          segment={{
            index: segment.index,
            text: editedText,
            personaId: segment.personaId,
            audioPath: segment.audioPath || segment.audioUrl,
            actionLoop: mediaSettings.actionLoop,
          }}
          storyId={
            storyId ||
            (typeof window !== "undefined"
              ? window.location.pathname.split("/").pop() || ""
              : "")
          }
        />
      )}
    </div>
  );
};
