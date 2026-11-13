import React from "react";
import { Globe2, Sparkles, RotateCcw } from "lucide-react";
import { SceneDetailPanel } from "@/components/editor/SceneDetailPanel";
import { VisualsStudioPanel } from "@/components/editor/VisualsStudioPanel";
import { MetadataPanel } from "@/components/editor/MetadataPanel";
import {
  UltimatePersonaPicker,
  PresenterPlacementControls,
  LipSyncStudioCard,
  BatchPresenterScenesCard,
  VoiceModelSelector,
  BatchVoiceGenerationCard,
  AudioMixerSection,
} from "@/components/editor/shared";
import { resolveLoopVideoUrl } from "@/components/editor/utils/loopResolver";
import type { PresenterConfig, StudioSetId } from "@/lib/types";
import type { VideoBackdropConfig, AdScene, PresenterLayoutMode } from "@/lib/types/ecommerce";
import type { UseModernTtsReturn } from "@/lib/tts/useModernTts";
import type { BatchState } from "@/lib/tts/useBatchGeneration";
import type { StoryData, StorySegment } from "./hooks/useStoryEditorState";

export interface EditorRightInspectorProps {
  rightPanelTab: "scene" | "visuals" | "voice" | "presenter" | "meta";
  setRightPanelTab: (tab: "scene" | "visuals" | "voice" | "presenter" | "meta") => void;
  selectedSegment: StorySegment | null;
  selectedSceneIndex: number | null;
  setSelectedSceneIndex: React.Dispatch<React.SetStateAction<number | null>>;
  timelineSegments: StorySegment[];
  scriptSegments: StorySegment[];
  story: StoryData | null;
  setStory: (updater: StoryData | null | ((prev: StoryData | null) => StoryData | null), recordUndo?: boolean) => void;
  storyId: string;
  handleUpdateText: (index: number, text: string) => void;
  handleUpdateMediaSettings: (index: number, settings: string) => void;
  handleUpdateAsset: (index: number, assetPath: string, assetType: string) => void;
  handleUpdateVideoSettings: (settings: Record<string, unknown>) => void;
  handleRegenerateBRoll: (index: number) => void;
  handleDeleteScene: (segmentIdOrIndex: string | number) => void;
  tts: UseModernTtsReturn;
  handlePlaySceneAudio: (index: number, textOverride?: string) => Promise<void>;
  handleRegenerateSceneAudio: (index: number, textOverride?: string) => Promise<void>;
  handleUpdateSegmentVoice: (index: number, personaId: string, params: Record<string, unknown>) => void;
  handleUpdateSegmentAvatar: (index: number, avatarUrl: string) => void;
  handleUpdateSegmentActionLoop: (index: number, loopId: string, videoUrl?: string, avatarUrl?: string) => void;
  globalBackdrop: VideoBackdropConfig;
  setGlobalBackdrop: React.Dispatch<React.SetStateAction<VideoBackdropConfig>>;
  setStudioSetId: React.Dispatch<React.SetStateAction<StudioSetId>>;
  aspectRatio: string;
  selectedVoiceEngine: string;
  setSelectedVoiceEngine: React.Dispatch<React.SetStateAction<string>>;
  selectedVoiceModel: string;
  setSelectedVoiceModel: React.Dispatch<React.SetStateAction<string>>;
  presenterConfig: PresenterConfig;
  setPresenterConfig: React.Dispatch<React.SetStateAction<PresenterConfig>>;
  handleRecastPersona: (personaId: string) => void;
  voiceSpeed: number;
  setVoiceSpeed: React.Dispatch<React.SetStateAction<number>>;
  voicePitch: number;
  setVoicePitch: React.Dispatch<React.SetStateAction<number>>;
  voiceLanguage: string;
  adScenesForModal: AdScene[];
  handleApplyPersonaToAll: (personaId: string) => void;
  handleClearAllAudio: () => void;
  handleClearSceneAudio: (index: number) => void;
  batchState: BatchState;
  handleBatchAudioCalibrateComplete: (scenes: AdScene[]) => void;
  handleAudioGenerated: (index: number, blob: Blob) => void;
  audioTimestamp: number;
  presenterScope: "broadcast" | "scene";
  setPresenterScope: React.Dispatch<React.SetStateAction<"broadcast" | "scene">>;
  selectedSceneHasPresenterOverride: boolean;
  handleResetBroadcastPresenterToFactory: () => void;
  handleResetCurrentScenePresenterOverride: () => void;
  selectedAttireId: string;
  setSelectedAttireId: React.Dispatch<React.SetStateAction<string>>;
  handleAutoChoreographAllLoops: (loopsList?: string[], personaId?: string) => void;
  handleShuffleActionLoops: (loopsList?: string[], personaId?: string) => void;
  handleReshuffleActiveSceneLoop: (targetSceneIndex?: number, loopsList?: string[], personaId?: string) => void;
  selectedSceneMediaSettings: Record<string, unknown> | null;
  handleGenerateLipSyncForScene: (sceneIndex: number, textToUse: string, audioPath?: string, overrides?: { engine?: string; model?: string; personaId?: string; attireId?: string }) => Promise<void>;
  presenterBatch: { isGenerating?: boolean; [key: string]: unknown };
  handleDeletePresenterVideoForScene: (sceneIndex: number) => void;
  handleDeleteAllPresenterVideos: () => void;
  comfyServer: unknown;
  sadtalkerServer: unknown;
  handleGenerateAllPresenterVideos: () => void;
  missingAudioSegments: number[];
  handleSelectScene: (index: number | null) => void;
  expandedSceneVideoIndex: number | null;
  setExpandedSceneVideoIndex: React.Dispatch<React.SetStateAction<number | null>>;
  handleSaveTitle: (title: string) => void;
}

export function EditorRightInspector({
  rightPanelTab,
  setRightPanelTab,
  selectedSegment,
  selectedSceneIndex,
  setSelectedSceneIndex,
  timelineSegments,
  scriptSegments,
  story,
  setStory,
  storyId,
  handleUpdateText,
  handleUpdateMediaSettings,
  handleUpdateAsset,
  handleUpdateVideoSettings,
  handleRegenerateBRoll,
  handleDeleteScene,
  tts,
  handlePlaySceneAudio,
  handleRegenerateSceneAudio,
  handleUpdateSegmentVoice,
  handleUpdateSegmentAvatar,
  handleUpdateSegmentActionLoop,
  globalBackdrop,
  setGlobalBackdrop,
  setStudioSetId,
  aspectRatio,
  selectedVoiceEngine,
  setSelectedVoiceEngine,
  selectedVoiceModel,
  setSelectedVoiceModel,
  presenterConfig,
  setPresenterConfig,
  handleRecastPersona,
  voiceSpeed,
  setVoiceSpeed,
  voicePitch,
  setVoicePitch,
  voiceLanguage,
  adScenesForModal,
  handleApplyPersonaToAll: _handleApplyPersonaToAll,
  handleClearAllAudio,
  handleClearSceneAudio,
  batchState: _batchState,
  handleBatchAudioCalibrateComplete,
  handleAudioGenerated: _handleAudioGenerated,
  audioTimestamp: _audioTimestamp,
  presenterScope,
  setPresenterScope,
  selectedSceneHasPresenterOverride,
  handleResetBroadcastPresenterToFactory,
  handleResetCurrentScenePresenterOverride,
  selectedAttireId,
  setSelectedAttireId,
  handleAutoChoreographAllLoops,
  handleShuffleActionLoops,
  handleReshuffleActiveSceneLoop,
  selectedSceneMediaSettings,
  handleGenerateLipSyncForScene,
  presenterBatch,
  handleDeletePresenterVideoForScene,
  handleDeleteAllPresenterVideos,
  comfyServer: _comfyServer,
  sadtalkerServer: _sadtalkerServer,
  handleGenerateAllPresenterVideos,
  missingAudioSegments: _missingAudioSegments,
  handleSelectScene,
  expandedSceneVideoIndex,
  setExpandedSceneVideoIndex,
  handleSaveTitle,
}: EditorRightInspectorProps) {
  return (
    <div className="flex-[3] min-w-0 overflow-hidden bg-surface-raised border-l border-border flex flex-col">
      {/* Permanent Persistent Tab Bar */}
      <div className="flex border-b border-border/80 bg-surface/60 shrink-0">
        {[
          { id: "scene", label: "Scene", icon: "🎬" },
          { id: "visuals", label: "Visuals", icon: "🎥" },
          { id: "voice", label: "Voice", icon: "🎙️" },
          { id: "presenter", label: "Presenter", icon: "🎭" },
          { id: "meta", label: "Metadata", icon: "📊" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setRightPanelTab(tab.id as "scene" | "visuals" | "voice" | "presenter" | "meta")}
            className={`flex-1 py-2.5 text-[11px] font-bold transition-all flex items-center justify-center gap-1 border-b-2 cursor-pointer ${
              rightPanelTab === tab.id
                ? tab.id === "presenter"
                  ? "text-purple-400 border-purple-500 bg-purple-500/10"
                  : tab.id === "voice"
                  ? "text-emerald-400 border-emerald-500 bg-emerald-500/10"
                  : tab.id === "visuals"
                  ? "text-sky-400 border-sky-500 bg-sky-500/10"
                  : tab.id === "scene"
                  ? "text-accent border-accent bg-accent/10"
                  : "text-amber-400 border-amber-500 bg-amber-500/10"
                : "text-muted hover:text-foreground border-transparent hover:bg-white/[0.02]"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Active Scene Context Sub-Header */}
      <div className="px-3 py-1.5 bg-black/20 border-b border-border/50 flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center gap-1.5">
          {selectedSegment ? (
            <>
              <span className="font-bold text-accent">Scene {selectedSceneIndex! + 1}</span>
              <span className="text-muted text-[10px]">of {timelineSegments.length}</span>
            </>
          ) : (
            <span className="text-muted text-[11px]">All Scenes (Story Defaults)</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedSegment && (
            <>
              <button
                disabled={selectedSceneIndex === 0}
                onClick={() => setSelectedSceneIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
                className="px-1.5 py-0.5 rounded bg-surface hover:bg-surface-raised border border-border text-[10px] text-muted hover:text-foreground disabled:opacity-30 cursor-pointer"
                title="Previous Scene"
              >
                ← Prev
              </button>
              <button
                disabled={selectedSceneIndex === timelineSegments.length - 1}
                onClick={() => setSelectedSceneIndex((prev) => (prev !== null && prev < timelineSegments.length - 1 ? prev + 1 : prev))}
                className="px-1.5 py-0.5 rounded bg-surface hover:bg-surface-raised border border-border text-[10px] text-muted hover:text-foreground disabled:opacity-30 cursor-pointer"
                title="Next Scene"
              >
                Next →
              </button>
              <button
                onClick={() => setSelectedSceneIndex(null)}
                className="px-1.5 py-0.5 rounded bg-surface hover:bg-surface-raised border border-border text-[10px] text-muted hover:text-foreground cursor-pointer ml-1"
                title="Deselect to view story defaults"
              >
                ✕ Clear
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
        {rightPanelTab === "scene" ? (
          <SceneDetailPanel
            key={selectedSegment?.id || `scene-${selectedSceneIndex}`}
            segment={selectedSegment}
            articleImageUrls={story?.articleImageUrls ? JSON.parse(story.articleImageUrls) : null}
            videoSettings={story?.video ? {
              bgMusicPath: story.video.bgMusicPath,
              bgMusicVolume: story.video.bgMusicVolume,
              sloganId: story.video.sloganId,
              outroId: story.video.outroId,
              captionStyle: story.video.captionStyle,
            } : null}
            totalScenes={timelineSegments.length}
            onUpdateText={handleUpdateText}
            onUpdateMediaSettings={handleUpdateMediaSettings}
            onUpdateAsset={handleUpdateAsset}
            onUpdateVideoSettings={handleUpdateVideoSettings}
            onRegenerateBRoll={handleRegenerateBRoll}
            onDeleteScene={(segId) => handleDeleteScene(segId)}
            onPlayAudio={tts.modelStatus === "ready" ? handlePlaySceneAudio : undefined}
            onRegenerateAudio={handleRegenerateSceneAudio}
            voiceEngine="omni"
            onClose={() => setSelectedSceneIndex(null)}
            onSelectPresenterTab={() => setRightPanelTab("presenter")}
            onUpdateSegmentPersona={(index, personaId) => handleUpdateSegmentVoice(index, personaId, {})}
            onUpdateSegmentAvatar={handleUpdateSegmentAvatar}
            onUpdateSegmentActionLoop={(index, actionLoop, videoUrl, avatarUrl) => {
              handleUpdateSegmentActionLoop(index, actionLoop, videoUrl, avatarUrl);
            }}
            storyId={storyId}
          />
        ) : rightPanelTab === "visuals" ? (
          <VisualsStudioPanel
            segments={timelineSegments}
            storyId={storyId}
            articleImageUrls={story?.articleImageUrls ? JSON.parse(story.articleImageUrls) : null}
            onUpdateAsset={handleUpdateAsset}
            onRegenerateBRoll={handleRegenerateBRoll}
            onSelectScene={(idx) => {
              setSelectedSceneIndex(idx);
              setRightPanelTab("scene");
            }}
            backdrop={globalBackdrop}
            onChangeBackdrop={(updates) => {
              setGlobalBackdrop((prev: VideoBackdropConfig) => {
                const next = { ...prev, ...updates };
                if (updates.studioBackgroundId) {
                  let matchedSetId: StudioSetId = "highrise_newsroom";
                  if (updates.studioBackgroundId.includes("financial")) matchedSetId = "financial_trading";
                  else if (updates.studioBackgroundId.includes("cyber")) matchedSetId = "cyber_metropolis";
                  else if (updates.studioBackgroundId.includes("lounge") || updates.studioBackgroundId.includes("penthouse")) matchedSetId = "podcast_loft";
                  else if (updates.studioBackgroundId.includes("breaking") || updates.studioBackgroundId.includes("alert")) matchedSetId = "field_breaking";
                  else if (updates.studioBackgroundId.includes("stage") || updates.studioBackgroundId.includes("futuristic")) matchedSetId = "minimal_studio";
                  else matchedSetId = "highrise_newsroom";
                  setStudioSetId(matchedSetId);
                  handleUpdateVideoSettings({ studioSetId: matchedSetId, globalBgVideoPath: updates.customImageUrl });
                } else if (updates.customImageUrl !== undefined) {
                  handleUpdateVideoSettings({ globalBgVideoPath: updates.customImageUrl });
                }
                return next;
              });
            }}
            aspectRatio={aspectRatio}
          />
        ) : rightPanelTab === "voice" ? (
          <div className="p-4 space-y-4">
            {/* Voice Model Switcher */}
            <VoiceModelSelector
              selectedEngine={selectedVoiceEngine}
              onChangeEngine={setSelectedVoiceEngine}
              selectedModel={selectedVoiceModel}
              onChangeModel={setSelectedVoiceModel}
              selectedPersonaId={presenterConfig.personaId}
              onChangePersona={(personaId, persona) => {
                handleRecastPersona(personaId);
                setPresenterConfig((prev: PresenterConfig) => ({
                  ...prev,
                  personaId,
                  presenterName: persona.name,
                  avatarSrc: persona.avatarUrl,
                }));
              }}
              speed={voiceSpeed}
              onChangeSpeed={setVoiceSpeed}
              pitchShift={voicePitch}
              onChangePitchShift={setVoicePitch}
              language={voiceLanguage}
              isSpanish={voiceLanguage === "es"}
            />

            {/* Batch Voice Generation & Audio Caching Suite */}
            <BatchVoiceGenerationCard
              scenes={adScenesForModal}
              defaultPersonaId={presenterConfig.personaId || "ruby"}
              selectedEngine={selectedVoiceEngine}
              selectedModel={selectedVoiceModel}
              speechSpeed={voiceSpeed}
              pitchShift={voicePitch}
              language={voiceLanguage}
              isSpanish={voiceLanguage === "es"}
              onUpdateScenePersona={(sceneIdx, pId) => {
                handleUpdateSegmentVoice(sceneIdx, pId, {});
              }}
              onBatchCalibrateComplete={handleBatchAudioCalibrateComplete}
              onClearSceneAudio={handleClearSceneAudio}
              onClearAllAudio={handleClearAllAudio}
              onSelectScene={(idx) => handleSelectScene(idx)}
              selectedSceneIndex={selectedSceneIndex}
            />

            {/* Audio Mixer */}
            <AudioMixerSection
              bgmUrl={story?.video?.bgMusicPath || undefined}
              onChangeBgmUrl={(url: string | undefined) => handleUpdateVideoSettings({ bgMusicPath: url })}
              bgmVolume={story?.video?.bgMusicVolume ?? 0.2}
              onChangeBgmVolume={(vol: number) => handleUpdateVideoSettings({ bgMusicVolume: vol })}
            />
          </div>
        ) : rightPanelTab === "presenter" ? (
          <div className="p-4 space-y-4">
            {/* Scope Switcher: Broadcast Default vs Selected Scene Override */}
            <div className="p-1 bg-zinc-900 rounded-lg border border-zinc-800 grid grid-cols-2 gap-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPresenterScope("broadcast")}
                className={`py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  presenterScope === "broadcast"
                    ? "bg-cyan-600 text-white shadow-sm font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Globe2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Broadcast Default</span>
              </button>

              <button
                type="button"
                onClick={() => setPresenterScope("scene")}
                className={`py-1.5 px-3 rounded-md flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  presenterScope === "scene"
                    ? "bg-purple-600 text-white shadow-sm font-bold"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-300" />
                <span>Scene #{(selectedSceneIndex ?? 0) + 1} Override</span>
                {selectedSceneHasPresenterOverride && (
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-300" />
                )}
              </button>
            </div>

            {presenterScope === "broadcast" ? (
              <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Globe2 className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
                  <span>
                    <strong>Broadcast Default:</strong> Full-screen chroma anchor applied across all scenes unless overridden.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetBroadcastPresenterToFactory}
                  className="flex items-center gap-1 text-[11px] font-semibold text-zinc-300 hover:text-white px-2 py-1 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 transition-colors shrink-0 cursor-pointer"
                  title="Reset broadcast presenter to factory defaults (Full Screen Chroma Anchor)"
                >
                  <RotateCcw className="h-3 w-3 text-cyan-400" />
                  <span>Factory Defaults</span>
                </button>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-purple-950/20 border border-purple-500/20 text-xs text-purple-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-purple-400" />
                  <span>
                    <strong>Scene #{(selectedSceneIndex ?? 0) + 1} Override:</strong> Custom placement for this scene only.
                  </span>
                </div>
                {selectedSceneHasPresenterOverride && (
                  <button
                    type="button"
                    onClick={handleResetCurrentScenePresenterOverride}
                    className="flex items-center gap-1 text-[11px] font-semibold text-zinc-300 hover:text-white px-2 py-1 rounded bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700/60 transition-colors shrink-0 cursor-pointer"
                    title="Remove custom override and inherit Broadcast Default"
                  >
                    <RotateCcw className="h-3 w-3 text-purple-400" />
                    <span>Reset to Default</span>
                  </button>
                )}
              </div>
            )}

            {/* Ultimate Persona Picker */}
            <UltimatePersonaPicker
              defaultCollapsed={false}
              selectedPersonaId={presenterConfig.personaId || "ruby"}
              onSelectPersona={(id, persona) => {
                handleRecastPersona(id);
                setPresenterConfig((prev: PresenterConfig) => ({
                  ...prev,
                  personaId: id,
                  presenterName: persona.name,
                  avatarSrc: persona.avatarUrl,
                }));
              }}
              selectedAttireId={selectedAttireId}
              onSelectAttire={(attireId, attireSrc) => {
                setSelectedAttireId(attireId);
                setPresenterConfig((prev: PresenterConfig) => ({
                  ...prev,
                  selectedPoseId: attireId,
                  avatarSrc: attireSrc,
                }));
                setStory((prev) => {
                  if (!prev?.script) return prev;
                  const newSegments = prev.script.segments.map((seg) => ({
                    ...seg,
                    personaAvatarUrl: attireSrc,
                  }));
                  return {
                    ...prev,
                    script: { ...prev.script, segments: newSegments },
                  };
                });

                if (story?.script?.segments) {
                  for (const seg of story.script.segments) {
                    fetch(`/api/stories/${storyId}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "update-segment",
                        segmentId: seg.id,
                        personaAvatarUrl: attireSrc,
                      }),
                    }).catch((err) => console.error("Failed to persist segment avatar:", err));
                  }
                }
              }}
              selectedActionLoopId={presenterConfig.selectedActionLoopId}
              onSelectActionLoop={(loopId, loopSrc) => {
                const videoUrl = loopSrc || resolveLoopVideoUrl(loopId, presenterConfig.personaId || "ruby");
                if (selectedSceneIndex !== null) {
                  handleUpdateSegmentActionLoop(selectedSceneIndex, loopId, videoUrl);
                }
                setPresenterConfig((prev: PresenterConfig) => ({
                  ...prev,
                  selectedActionLoopId: loopId,
                }));
              }}
              onAutoSequenceLoops={(loops, personaId) => {
                const ids = Array.isArray(loops) ? loops.map((l: unknown) => (typeof l === "string" ? l : (l as { id: string }).id)) : undefined;
                handleAutoChoreographAllLoops(ids, personaId || presenterConfig.personaId);
              }}
              onShuffleLoops={(loops, personaId) => {
                const ids = Array.isArray(loops) ? loops.map((l: unknown) => (typeof l === "string" ? l : (l as { id: string }).id)) : undefined;
                handleShuffleActionLoops(ids, personaId || presenterConfig.personaId);
              }}
              onShuffleActiveSceneLoop={(loops, personaId) => {
                const ids = Array.isArray(loops) ? loops.map((l: unknown) => (typeof l === "string" ? l : (l as { id: string }).id)) : undefined;
                if (selectedSceneIndex !== null) {
                  handleReshuffleActiveSceneLoop(selectedSceneIndex, ids, personaId || presenterConfig.personaId);
                } else {
                  handleReshuffleActiveSceneLoop(undefined, ids, personaId || presenterConfig.personaId);
                }
              }}
              compact={false}
              selectedEngine={selectedVoiceEngine}
              selectedModel={selectedVoiceModel}
              speechSpeed={voiceSpeed}
              language={voiceLanguage}
              isSpanish={voiceLanguage === "es"}
            />

            {/* Presenter Placement & Framing Controls */}
            <PresenterPlacementControls
              defaultCollapsed={false}
              isAvatarHidden={
                presenterScope === "scene"
                  ? ((selectedSceneMediaSettings?.isAvatarHidden as boolean | undefined) ?? (presenterConfig.enabled === false))
                  : (presenterConfig.enabled === false)
              }
              canHideAvatar={true}
              onToggleAvatarHidden={(hidden: boolean) => {
                if (presenterScope === "scene") {
                  const targetIdx = selectedSceneIndex ?? 0;
                  if (story?.script?.segments) {
                    const seg = story.script.segments.find((s) => s.index === targetIdx) || story.script.segments[targetIdx];
                    if (seg) {
                      let ms: Record<string, unknown> = {};
                      try { if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string); } catch {}
                      ms.isAvatarHidden = hidden;
                      ms.hasPresenterOverride = true;
                      handleUpdateMediaSettings(seg.index ?? targetIdx, JSON.stringify(ms));
                    }
                  }
                } else {
                  setPresenterConfig((prev: PresenterConfig) => ({ ...prev, enabled: !hidden }));
                }
              }}
              layoutMode={
                presenterScope === "scene"
                  ? ((selectedSceneMediaSettings?.layoutMode ?? presenterConfig.layoutMode) as PresenterLayoutMode || "full_screen")
                  : (presenterConfig.layoutMode as PresenterLayoutMode || "full_screen")
              }
              onChangeLayoutMode={(mode) => {
                if (presenterScope === "scene") {
                  const targetIdx = selectedSceneIndex ?? 0;
                  if (story?.script?.segments) {
                    const seg = story.script.segments.find((s) => s.index === targetIdx) || story.script.segments[targetIdx];
                    if (seg) {
                      let ms: Record<string, unknown> = {};
                      try { if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string); } catch {}
                      ms.layoutMode = mode;
                      ms.hasPresenterOverride = true;
                      handleUpdateMediaSettings(seg.index ?? targetIdx, JSON.stringify(ms));
                    }
                  }
                } else {
                  setPresenterConfig((prev: PresenterConfig) => ({ ...prev, layoutMode: mode }));
                  if (story?.script?.segments) {
                    for (const seg of story.script.segments) {
                      let ms: Record<string, unknown> = {};
                      try { if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string); } catch {}
                      if (!ms.hasPresenterOverride) {
                        ms.layoutMode = mode;
                        handleUpdateMediaSettings(seg.index ?? 0, JSON.stringify(ms));
                      }
                    }
                  }
                }
              }}
              scale={
                presenterScope === "scene"
                  ? ((selectedSceneMediaSettings?.presenterScale as number | undefined) ?? presenterConfig.scale ?? 1.0)
                  : (presenterConfig.scale ?? 1.0)
              }
              onChangeScale={(scale) => {
                if (presenterScope === "scene") {
                  const targetIdx = selectedSceneIndex ?? 0;
                  if (story?.script?.segments) {
                    const seg = story.script.segments.find((s) => s.index === targetIdx) || story.script.segments[targetIdx];
                    if (seg) {
                      let ms: Record<string, unknown> = {};
                      try { if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string); } catch {}
                      ms.presenterScale = scale;
                      ms.hasPresenterOverride = true;
                      handleUpdateMediaSettings(seg.index ?? targetIdx, JSON.stringify(ms));
                    }
                  }
                } else {
                  setPresenterConfig((prev: PresenterConfig) => ({ ...prev, scale }));
                  if (story?.script?.segments) {
                    for (const seg of story.script.segments) {
                      let ms: Record<string, unknown> = {};
                      try { if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string); } catch {}
                      if (!ms.hasPresenterOverride) {
                        ms.presenterScale = scale;
                        handleUpdateMediaSettings(seg.index ?? 0, JSON.stringify(ms));
                      }
                    }
                  }
                }
              }}
              offsetX={
                presenterScope === "scene"
                  ? ((selectedSceneMediaSettings?.presenterOffsetX as number | undefined) ?? presenterConfig.offsetX ?? 0)
                  : (presenterConfig.offsetX ?? 0)
              }
              onChangeOffsetX={(offsetX) => {
                if (presenterScope === "scene") {
                  const targetIdx = selectedSceneIndex ?? 0;
                  if (story?.script?.segments) {
                    const seg = story.script.segments.find((s) => s.index === targetIdx) || story.script.segments[targetIdx];
                    if (seg) {
                      let ms: Record<string, unknown> = {};
                      try { if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string); } catch {}
                      ms.presenterOffsetX = offsetX;
                      ms.hasPresenterOverride = true;
                      handleUpdateMediaSettings(seg.index ?? targetIdx, JSON.stringify(ms));
                    }
                  }
                } else {
                  setPresenterConfig((prev: PresenterConfig) => ({ ...prev, offsetX }));
                  if (story?.script?.segments) {
                    for (const seg of story.script.segments) {
                      let ms: Record<string, unknown> = {};
                      try { if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string); } catch {}
                      if (!ms.hasPresenterOverride) {
                        ms.presenterOffsetX = offsetX;
                        handleUpdateMediaSettings(seg.index ?? 0, JSON.stringify(ms));
                      }
                    }
                  }
                }
              }}
              offsetY={
                presenterScope === "scene"
                  ? ((selectedSceneMediaSettings?.presenterOffsetY as number | undefined) ?? presenterConfig.offsetY ?? 0)
                  : (presenterConfig.offsetY ?? 0)
              }
              onChangeOffsetY={(offsetY) => {
                if (presenterScope === "scene") {
                  const targetIdx = selectedSceneIndex ?? 0;
                  if (story?.script?.segments) {
                    const seg = story.script.segments.find((s) => s.index === targetIdx) || story.script.segments[targetIdx];
                    if (seg) {
                      let ms: Record<string, unknown> = {};
                      try { if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string); } catch {}
                      ms.presenterOffsetY = offsetY;
                      ms.hasPresenterOverride = true;
                      handleUpdateMediaSettings(seg.index ?? targetIdx, JSON.stringify(ms));
                    }
                  }
                } else {
                  setPresenterConfig((prev: PresenterConfig) => ({ ...prev, offsetY }));
                  if (story?.script?.segments) {
                    for (const seg of story.script.segments) {
                      let ms: Record<string, unknown> = {};
                      try { if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string); } catch {}
                      if (!ms.hasPresenterOverride) {
                        ms.presenterOffsetY = offsetY;
                        handleUpdateMediaSettings(seg.index ?? 0, JSON.stringify(ms));
                      }
                    }
                  }
                }
              }}
              showNametag={presenterConfig.showNametag}
              onChangeShowNametag={(show) => {
                setPresenterConfig((prev: PresenterConfig) => ({ ...prev, showNametag: show }));
              }}
              presenterName={presenterConfig.presenterName}
              onChangePresenterName={(name) => {
                setPresenterConfig((prev: PresenterConfig) => ({ ...prev, presenterName: name }));
              }}
              presenterTitle={presenterConfig.roleTag}
              onChangePresenterTitle={(title) => {
                setPresenterConfig((prev: PresenterConfig) => ({ ...prev, roleTag: title }));
              }}
              bubbleFaceZoom={
                presenterScope === "scene"
                  ? ((selectedSceneMediaSettings?.bubbleFaceZoom as number | undefined) ?? presenterConfig.bubbleFaceZoom ?? 1.85)
                  : (presenterConfig.bubbleFaceZoom ?? 1.85)
              }
              onChangeBubbleFaceZoom={(zoom) => {
                if (presenterScope === "scene") {
                  const targetIdx = selectedSceneIndex ?? 0;
                  if (story?.script?.segments) {
                    const seg = story.script.segments.find((s) => s.index === targetIdx) || story.script.segments[targetIdx];
                    if (seg) {
                      let ms: Record<string, unknown> = {};
                      try { if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string); } catch {}
                      ms.bubbleFaceZoom = zoom;
                      ms.hasPresenterOverride = true;
                      handleUpdateMediaSettings(seg.index ?? targetIdx, JSON.stringify(ms));
                    }
                  }
                } else {
                  setPresenterConfig((prev: PresenterConfig) => ({ ...prev, bubbleFaceZoom: zoom }));
                }
              }}
              bubbleFaceOffsetY={
                presenterScope === "scene"
                  ? ((selectedSceneMediaSettings?.bubbleFaceOffsetY as number | undefined) ?? presenterConfig.bubbleFaceOffsetY ?? 5)
                  : (presenterConfig.bubbleFaceOffsetY ?? 5)
              }
              onChangeBubbleFaceOffsetY={(y) => {
                if (presenterScope === "scene") {
                  const targetIdx = selectedSceneIndex ?? 0;
                  if (story?.script?.segments) {
                    const seg = story.script.segments.find((s) => s.index === targetIdx) || story.script.segments[targetIdx];
                    if (seg) {
                      let ms: Record<string, unknown> = {};
                      try { if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string); } catch {}
                      ms.bubbleFaceOffsetY = y;
                      ms.hasPresenterOverride = true;
                      handleUpdateMediaSettings(seg.index ?? targetIdx, JSON.stringify(ms));
                    }
                  }
                } else {
                  setPresenterConfig((prev: PresenterConfig) => ({ ...prev, bubbleFaceOffsetY: y }));
                }
              }}
              bubbleFaceOffsetX={
                presenterScope === "scene"
                  ? ((selectedSceneMediaSettings?.bubbleFaceOffsetX as number | undefined) ?? presenterConfig.bubbleFaceOffsetX ?? 0)
                  : (presenterConfig.bubbleFaceOffsetX ?? 0)
              }
              onChangeBubbleFaceOffsetX={(x) => {
                if (presenterScope === "scene") {
                  const targetIdx = selectedSceneIndex ?? 0;
                  if (story?.script?.segments) {
                    const seg = story.script.segments.find((s) => s.index === targetIdx) || story.script.segments[targetIdx];
                    if (seg) {
                      let ms: Record<string, unknown> = {};
                      try { if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string); } catch {}
                      ms.bubbleFaceOffsetX = x;
                      ms.hasPresenterOverride = true;
                      handleUpdateMediaSettings(seg.index ?? targetIdx, JSON.stringify(ms));
                    }
                  }
                } else {
                  setPresenterConfig((prev: PresenterConfig) => ({ ...prev, bubbleFaceOffsetX: x }));
                }
              }}
              onResetBubbleFaceCrop={() => {
                if (presenterScope === "scene") {
                  const targetIdx = selectedSceneIndex ?? 0;
                  if (story?.script?.segments) {
                    const seg = story.script.segments.find((s) => s.index === targetIdx) || story.script.segments[targetIdx];
                    if (seg) {
                      let ms: Record<string, unknown> = {};
                      try { if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string); } catch {}
                      delete ms.bubbleFaceZoom;
                      delete ms.bubbleFaceOffsetY;
                      delete ms.bubbleFaceOffsetX;
                      handleUpdateMediaSettings(seg.index ?? targetIdx, JSON.stringify(ms));
                    }
                  }
                } else {
                  setPresenterConfig((prev: PresenterConfig) => ({
                    ...prev,
                    bubbleFaceZoom: 1.85,
                    bubbleFaceOffsetY: 5,
                    bubbleFaceOffsetX: 0,
                  }));
                }
              }}
            />

            {/* LipSync Studio Card for active scene */}
            {selectedSceneIndex !== null && (() => {
              const activePresenterSeg = scriptSegments.find((s) => s.index === selectedSceneIndex) || (selectedSceneIndex >= 0 && selectedSceneIndex < scriptSegments.length ? scriptSegments[selectedSceneIndex] : null);
              if (!activePresenterSeg) return null;
              return (
                <LipSyncStudioCard
                  currentSceneIndex={activePresenterSeg.index}
                  audioUrl={activePresenterSeg.audioPath || undefined}
                  avatarUrl={activePresenterSeg.personaAvatarUrl || presenterConfig.avatarSrc || undefined}
                  videoUrl={activePresenterSeg.presenterVideoPath || undefined}
                  onGenerateLipSync={async (opts) => {
                    await handleGenerateLipSyncForScene(
                      activePresenterSeg.index,
                      activePresenterSeg.text || "",
                      activePresenterSeg.audioPath || undefined,
                      opts
                    );
                  }}
                  onDeleteLipSync={
                    activePresenterSeg.presenterVideoPath
                      ? () => handleDeletePresenterVideoForScene(activePresenterSeg.index)
                      : undefined
                  }
                  onRerollLoop={() => {
                    const currentPersona = activePresenterSeg?.personaId || presenterConfig.personaId || "ruby";
                    handleReshuffleActiveSceneLoop(activePresenterSeg.index, undefined, currentPersona);
                  }}
                  defaultCollapsed={false}
                />
              );
            })()}

            {/* Batch Presenter Scenes Card (All Scenes Matrix) */}
            <BatchPresenterScenesCard
              scenes={adScenesForModal}
              defaultPersonaId={presenterConfig.personaId || "ruby"}
              defaultAvatarSrc={presenterConfig.avatarSrc}
              onUpdateScenePersona={(sceneIdx, pId) => {
                handleUpdateSegmentVoice(sceneIdx, pId, {});
              }}
              onSelectScene={(idx) => handleSelectScene(idx)}
              selectedSceneIndex={selectedSceneIndex}
              onTestLipSync={async (idx) => {
                const seg = scriptSegments.find((s) => s.index === idx);
                await handleGenerateLipSyncForScene(
                  idx,
                  seg?.text || "",
                  seg?.audioPath || undefined,
                  { engine: "musetalk" }
                );
              }}
              onGenerateAllVideos={handleGenerateAllPresenterVideos}
              isGeneratingAll={Boolean(presenterBatch?.isGenerating)}
              onDeleteSceneVideo={(idx) => handleDeletePresenterVideoForScene(idx)}
              onDeleteAllVideos={handleDeleteAllPresenterVideos}
              onShuffleLoops={() => {
                const currentPersona = scriptSegments.find((s) => s.personaId)?.personaId || presenterConfig.personaId || "ruby";
                handleShuffleActionLoops(undefined, currentPersona);
              }}
              onRerollSceneLoop={(idx) => {
                const currentSeg = scriptSegments[idx];
                const currentPersona = currentSeg?.personaId || presenterConfig.personaId || "ruby";
                handleReshuffleActiveSceneLoop(idx, undefined, currentPersona);
              }}
              expandedVideoIndex={expandedSceneVideoIndex}
              onToggleExpandVideo={setExpandedSceneVideoIndex}
            />
          </div>
        ) : (
          <MetadataPanel
            story={story}
            segments={timelineSegments}
            onUpdateVideoSettings={handleUpdateVideoSettings}
            onUpdateStoryMetadata={(data) => {
              if (data.headline) {
                handleSaveTitle(data.headline);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
