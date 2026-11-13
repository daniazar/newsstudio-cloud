import React from "react";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { UnifiedTimeline } from "@/components/editor/shared";
import type { CompositionProps, AspectRatio } from "@/lib/types";
import type { EditorLayerId } from "@/components/editor/shared/player/EditorLayerTree";
import type { StoryData, StorySegment } from "./hooks/useStoryEditorState";
import type { UnifiedTimelineItem } from "./shared/timeline/TimelineSceneAdapter";

export interface EditorPreviewStageProps {
  compositionProps: CompositionProps;
  handleFrameUpdate: (frame: number) => void;
  seekTarget: number | { frame: number; nonce: number } | undefined;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  missingAudioSegments: number[];
  selectedSceneIndex: number | null;
  handleUpdateAnchorPosition: (preset: "bottom-right" | "bottom-left" | "center" | "fullscreen") => void;
  showSocialSafeZones: boolean;
  setShowSocialSafeZones: React.Dispatch<React.SetStateAction<boolean>>;
  isSplitPreview: boolean;
  showLayerTree: boolean;
  setShowLayerTree: React.Dispatch<React.SetStateAction<boolean>>;
  showCanvasGizmo: boolean;
  setShowCanvasGizmo: React.Dispatch<React.SetStateAction<boolean>>;
  selectedLayer: EditorLayerId;
  setSelectedLayer: React.Dispatch<React.SetStateAction<EditorLayerId>>;
  setAspectRatio: React.Dispatch<React.SetStateAction<AspectRatio>>;
  handleUpdateVideoSettings: (settings: Record<string, unknown>) => void;
  showPresenter: boolean;
  setShowPresenter: React.Dispatch<React.SetStateAction<boolean>>;
  handleUpdatePresenter: (data: Record<string, unknown>) => void;
  handleResetPresenter: () => void;
  avatarLocked: boolean;
  setAvatarLocked: React.Dispatch<React.SetStateAction<boolean>>;
  showCaptions: boolean;
  setShowCaptions: React.Dispatch<React.SetStateAction<boolean>>;
  captionLocked: boolean;
  setCaptionLocked: React.Dispatch<React.SetStateAction<boolean>>;
  handleUpdateCaptionOffsets: (data: Record<string, unknown>) => void;
  handleResetCaptionOffsets: () => void;
  showHeadline: boolean;
  setShowHeadline: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSegmentMediaSettings: Record<string, unknown> | null;
  handleUpdateHeadlineOffsets: (data: Record<string, unknown>) => void;
  handleResetHeadlineOffsets: () => void;
  showTickerTape: boolean;
  setShowTickerTape: React.Dispatch<React.SetStateAction<boolean>>;
  tickerTapeOffsetY: number;
  setTickerTapeOffsetY: React.Dispatch<React.SetStateAction<number>>;
  showBrandLogo: boolean;
  setShowBrandLogo: React.Dispatch<React.SetStateAction<boolean>>;
  brandLogoOffsetX: number;
  setBrandLogoOffsetX: React.Dispatch<React.SetStateAction<number>>;
  brandLogoOffsetY: number;
  setBrandLogoOffsetY: React.Dispatch<React.SetStateAction<number>>;
  brandLogoScale: number;
  setBrandLogoScale: React.Dispatch<React.SetStateAction<number>>;
  showCitationBadge: boolean;
  setShowCitationBadge: React.Dispatch<React.SetStateAction<boolean>>;
  badgeOffsetX: number;
  setBadgeOffsetX: React.Dispatch<React.SetStateAction<number>>;
  badgeOffsetY: number;
  setBadgeOffsetY: React.Dispatch<React.SetStateAction<number>>;
  showIntro: boolean;
  setShowIntro: React.Dispatch<React.SetStateAction<boolean>>;
  showOutro: boolean;
  setShowOutro: React.Dispatch<React.SetStateAction<boolean>>;
  showBackdrop: boolean;
  setShowBackdrop: React.Dispatch<React.SetStateAction<boolean>>;
  handleCommitGizmoChanges: () => void;
  story: StoryData | null;
  setStory: (updater: StoryData | null | ((prev: StoryData | null) => StoryData | null), recordUndo?: boolean) => void;
  handleUpdateMediaSettings: (index: number, settings: string) => void;
  unifiedTimelineItems: UnifiedTimelineItem[];
  currentFrame: number;
  totalDuration: number;
  FPS: number;
  handleSelectScene: (index: number | null) => void;
  handleSeek: (time: number) => void;
  timelineSegments: StorySegment[];
  setWasPlayingBeforeDrag: React.Dispatch<React.SetStateAction<boolean>>;
  wasPlayingBeforeDrag: boolean;
  handleTrimSceneDuration: (index: number, frames: number) => void;
  handleTrimSceneStart: (index: number, startFrames: number, durationFrames: number) => void;
  handleAddScene: () => void;
  handleSplitScene: (index: number) => void;
  handleMergeScene: (index: number) => void;
  handleDeleteScene: (index: number) => void;
  handleReorderScene: (fromIdx: number, toIdx: number) => void;
  setShowReorderModal: React.Dispatch<React.SetStateAction<boolean>>;
  setShowShortcutsModal: React.Dispatch<React.SetStateAction<boolean>>;
}

export function EditorPreviewStage({
  compositionProps,
  handleFrameUpdate,
  seekTarget,
  isPlaying,
  setIsPlaying,
  missingAudioSegments,
  selectedSceneIndex,
  handleUpdateAnchorPosition,
  showSocialSafeZones,
  setShowSocialSafeZones,
  isSplitPreview,
  showLayerTree,
  setShowLayerTree,
  showCanvasGizmo,
  setShowCanvasGizmo,
  selectedLayer,
  setSelectedLayer,
  setAspectRatio,
  handleUpdateVideoSettings,
  showPresenter,
  setShowPresenter,
  handleUpdatePresenter,
  handleResetPresenter,
  avatarLocked,
  setAvatarLocked,
  showCaptions,
  setShowCaptions,
  captionLocked,
  setCaptionLocked,
  handleUpdateCaptionOffsets,
  handleResetCaptionOffsets,
  showHeadline,
  setShowHeadline,
  selectedSegmentMediaSettings,
  handleUpdateHeadlineOffsets,
  handleResetHeadlineOffsets,
  showTickerTape,
  setShowTickerTape,
  tickerTapeOffsetY,
  setTickerTapeOffsetY,
  showBrandLogo,
  setShowBrandLogo,
  brandLogoOffsetX,
  setBrandLogoOffsetX,
  brandLogoOffsetY,
  setBrandLogoOffsetY,
  brandLogoScale,
  setBrandLogoScale,
  showCitationBadge,
  setShowCitationBadge,
  badgeOffsetX,
  setBadgeOffsetX,
  badgeOffsetY,
  setBadgeOffsetY,
  showIntro,
  setShowIntro,
  showOutro,
  setShowOutro,
  showBackdrop,
  setShowBackdrop,
  handleCommitGizmoChanges,
  story,
  setStory,
  handleUpdateMediaSettings,
  unifiedTimelineItems,
  currentFrame,
  totalDuration,
  FPS,
  handleSelectScene,
  handleSeek,
  timelineSegments,
  setWasPlayingBeforeDrag,
  wasPlayingBeforeDrag,
  handleTrimSceneDuration,
  handleTrimSceneStart,
  handleAddScene,
  handleSplitScene,
  handleMergeScene,
  handleDeleteScene,
  handleReorderScene,
  setShowReorderModal,
  setShowShortcutsModal,
}: EditorPreviewStageProps) {
  return (
    <div className="flex-[7] min-w-0 flex flex-col border-r border-border">
      {/* Player */}
      <div className="flex-1 flex items-center justify-center p-6 bg-black/30">
        <VideoPlayer
          mode="broadcast"
          compositionProps={compositionProps}
          onFrameUpdate={handleFrameUpdate}
          seekToFrame={seekTarget}
          playing={isPlaying}
          onPlayingChange={setIsPlaying}
          missingAudioSegments={missingAudioSegments}
          selectedSegmentIndex={selectedSceneIndex}
          onUpdateAnchorPosition={handleUpdateAnchorPosition}
          showSocialSafeZones={showSocialSafeZones}
          onToggleSocialSafeZones={() => setShowSocialSafeZones(!showSocialSafeZones)}
          isSplitPreview={isSplitPreview}
          showLayerTree={showLayerTree}
          onToggleLayerTree={() => setShowLayerTree((prev) => !prev)}
          showGizmo={showCanvasGizmo}
          onToggleGizmo={() => setShowCanvasGizmo((prev) => !prev)}
          selectedLayer={selectedLayer}
          onSelectLayer={setSelectedLayer}
          onChangeAspectRatio={(ratio) => {
            setAspectRatio(ratio);
            handleUpdateVideoSettings({ aspectRatio: ratio });
          }}
          avatarVisible={showPresenter}
          onToggleAvatarVisible={() => setShowPresenter((prev) => !prev)}
          onUpdatePresenter={handleUpdatePresenter}
          onResetPresenter={handleResetPresenter}
          avatarLocked={avatarLocked}
          onToggleAvatarLocked={() => setAvatarLocked((prev) => !prev)}
          captionVisible={showCaptions}
          onToggleCaptionVisible={() => setShowCaptions((prev) => !prev)}
          captionLocked={captionLocked}
          onToggleCaptionLocked={() => setCaptionLocked((prev) => !prev)}
          onUpdateCaptionOffsets={handleUpdateCaptionOffsets}
          onResetCaptionOffsets={handleResetCaptionOffsets}
          headlineVisible={showHeadline}
          onToggleHeadlineVisible={() => setShowHeadline((prev) => !prev)}
          headlineOffsetX={typeof selectedSegmentMediaSettings?.headlineOffsetX === "number" ? selectedSegmentMediaSettings.headlineOffsetX : 0}
          headlineOffsetY={typeof selectedSegmentMediaSettings?.headlineOffsetY === "number" ? selectedSegmentMediaSettings.headlineOffsetY : 0}
          onUpdateHeadlineOffsets={handleUpdateHeadlineOffsets}
          onResetHeadline={handleResetHeadlineOffsets}
          tickerTapeVisible={showTickerTape}
          onToggleTickerTapeVisible={() => setShowTickerTape((prev) => !prev)}
          tickerTapeOffsetY={tickerTapeOffsetY}
          onUpdateTickerTapeOffsets={(patch) => {
            if (patch.offsetY !== undefined) setTickerTapeOffsetY(patch.offsetY);
          }}
          onResetTickerTape={() => setTickerTapeOffsetY(0)}
          brandLogoVisible={showBrandLogo}
          onToggleBrandLogoVisible={() => setShowBrandLogo((prev) => !prev)}
          brandLogoOffsetX={brandLogoOffsetX}
          brandLogoOffsetY={brandLogoOffsetY}
          brandLogoScale={brandLogoScale}
          onUpdateBrandLogoOffsets={(patch) => {
            if (patch.offsetX !== undefined) setBrandLogoOffsetX(patch.offsetX);
            if (patch.offsetY !== undefined) setBrandLogoOffsetY(patch.offsetY);
            if (patch.scale !== undefined) setBrandLogoScale(patch.scale);
          }}
          onResetBrandLogo={() => {
            setBrandLogoOffsetX(0);
            setBrandLogoOffsetY(0);
            setBrandLogoScale(1.0);
          }}
          badgeVisible={showCitationBadge}
          onToggleBadgeVisible={() => setShowCitationBadge((prev) => !prev)}
          badgeOffsetX={badgeOffsetX}
          badgeOffsetY={badgeOffsetY}
          onUpdateBadgeOffsets={(patch) => {
            if (patch.offsetX !== undefined) setBadgeOffsetX(patch.offsetX);
            if (patch.offsetY !== undefined) setBadgeOffsetY(patch.offsetY);
          }}
          onResetBadge={() => {
            setBadgeOffsetX(0);
            setBadgeOffsetY(0);
          }}
          introBumperVisible={showIntro}
          onToggleIntroBumperVisible={() => setShowIntro((prev) => !prev)}
          outroEndCardVisible={showOutro}
          onToggleOutroEndCardVisible={() => setShowOutro((prev) => !prev)}
          backdropVisible={showBackdrop}
          onToggleBackdropVisible={() => setShowBackdrop((prev) => !prev)}
          onCommitChanges={handleCommitGizmoChanges}
          isPanEnabled={selectedSceneIndex !== null}
          onPan={(dx, dy) => {
            if (selectedSceneIndex === null || !story?.script) return;
            setStory((prev) => {
              if (!prev?.script) return prev;
              const scriptObj = prev.script;
              const targetSeg = scriptObj.segments.find((s: { index?: number }) => s.index === selectedSceneIndex) || scriptObj.segments[selectedSceneIndex];
              if (!targetSeg) return prev;
              let ms = { offsetX: 0, offsetY: 0 };
              try {
                if (targetSeg.mediaSettings) ms = { ...ms, ...JSON.parse(targetSeg.mediaSettings as string) };
              } catch {}
              ms.offsetX = Math.max(-50, Math.min(50, ms.offsetX + dx));
              ms.offsetY = Math.max(-50, Math.min(50, ms.offsetY + dy));
              const newSegments = scriptObj.segments.map((s) =>
                s.id === targetSeg.id ? { ...s, mediaSettings: JSON.stringify(ms) } : s
              );
              return { ...prev, script: { ...prev.script, segments: newSegments } };
            });
          }}
          onPanEnd={() => {
            if (selectedSceneIndex === null || !story?.script) return;
            const scriptObj = story.script;
            const seg = scriptObj?.segments?.find((s: { index?: number }) => s.index === selectedSceneIndex) || scriptObj?.segments?.[selectedSceneIndex];
            if (seg && seg.mediaSettings) {
              handleUpdateMediaSettings(seg.index, seg.mediaSettings as string);
            }
          }}
        />
      </div>

      {/* Timeline & Bottom Shortcut Hint Bar */}
      <div className="flex-shrink-0 flex flex-col bg-surface border-t border-border">
        <div className="p-3 pb-2">
          <UnifiedTimeline
            items={unifiedTimelineItems}
            currentFrame={currentFrame}
            totalDurationFrames={Math.round(totalDuration * FPS)}
            fps={FPS}
            selectedSceneIndex={selectedSceneIndex}
            onSelectScene={(idx, seekToStart) => {
              handleSelectScene(idx);
              if (seekToStart && idx !== null) {
                const seg = timelineSegments.find((s) => s.index === idx);
                if (seg) {
                  handleSeek(seg.startTime);
                }
              }
            }}
            onSeek={(frame, isScrubbing) => {
              if (isScrubbing) {
                if (isPlaying) {
                  setIsPlaying(false);
                  setWasPlayingBeforeDrag(true);
                }
              } else {
                if (wasPlayingBeforeDrag) {
                  setIsPlaying(true);
                  setWasPlayingBeforeDrag(false);
                }
              }
              handleSeek(frame / FPS);
            }}
            onTrimScene={(idx, newDurationFrames) => {
              handleTrimSceneDuration(idx, newDurationFrames);
            }}
            onTrimStartScene={(idx, newStartFrames, newDurationFrames) => {
              handleTrimSceneStart(idx, newStartFrames, newDurationFrames);
            }}
            onAddScene={handleAddScene}
            onSplitScene={(idx) => {
              handleSplitScene(idx);
            }}
            onMergeScene={(idx) => {
              handleMergeScene(idx);
            }}
            onDeleteScene={(idx) => {
              handleDeleteScene(idx);
            }}
            onReorderScene={(fromIdx, toIdx) => {
              handleReorderScene(fromIdx, toIdx);
            }}
            onOpenReorderModal={() => setShowReorderModal(true)}
          />
        </div>

        {/* Bottom Keyboard Shortcuts Hint Bar */}
        <div className="px-4 py-1.5 bg-black/40 border-t border-border/50 flex items-center justify-between text-[10px] text-muted font-mono shrink-0">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 rounded bg-surface border border-border text-[9px] text-foreground font-bold">Space</kbd> Play/Pause</span>
            <span><kbd className="px-1 py-0.5 rounded bg-surface border border-border text-[9px] text-foreground font-bold">S</kbd> Split Scene</span>
            <span><kbd className="px-1 py-0.5 rounded bg-surface border border-border text-[9px] text-foreground font-bold">J/K/L</kbd> Shuttle</span>
            <span><kbd className="px-1 py-0.5 rounded bg-surface border border-border text-[9px] text-foreground font-bold">←/→</kbd> Frame Step</span>
            <span><kbd className="px-1 py-0.5 rounded bg-surface border border-border text-[9px] text-foreground font-bold">↑/↓</kbd> Jump Scene</span>
            <span><kbd className="px-1 py-0.5 rounded bg-surface border border-border text-[9px] text-foreground font-bold">D</kbd> Deselect</span>
          </div>
          <button
            onClick={() => setShowShortcutsModal(true)}
            className="text-accent hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>Shortcuts Cheat Sheet (?)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
