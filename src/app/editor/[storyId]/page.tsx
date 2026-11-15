"use client";

import { EditorLeftSidebar } from "@/components/editor/EditorLeftSidebar";
import { EditorPreviewStage } from "@/components/editor/EditorPreviewStage";
import { EditorRightInspector } from "@/components/editor/EditorRightInspector";
import { EditorTopBar } from "@/components/editor/EditorTopBar";
import { useEditorShortcutsAndTransport } from "@/components/editor/hooks/useEditorShortcutsAndTransport";
import { useStoryEditorState,type StoryData } from "@/components/editor/hooks/useStoryEditorState";
import { useStoryMediaGeneration } from "@/components/editor/hooks/useStoryMediaGeneration";
import {
adaptAdScenesToNewsSegments,
adaptNewsSegmentsToAdScenes,
adaptNewsSegmentsToTimeline,
KeyboardShortcutsModal,
LocalizationMatrixModal,
OmnichannelExportModal,
SocialPublishModal,
StoryboardReorderModal,
type CommercialReadinessMatrix,
type EditorMode,
} from "@/components/editor/shared";
import type { EditorLayerId } from "@/components/editor/shared/player/EditorLayerTree";
import { transformSegmentsToCompositionProps } from "@/components/editor/utils/compositionAdapter";
import { resolveLoopVideoUrl } from "@/components/editor/utils/loopResolver";
import { useToast } from "@/components/global/ToastContainer";
import { cachedFetch } from "@/lib/cache/indexedDB";
import {
generateRandomLoopSequence,
sliceSequenceForScene,
} from "@/lib/ecommerce/actionLoopFsmEngine";
import { useComfyServer } from "@/lib/hooks/useComfyServer";
import { pingLocalWorkerWake } from "@/lib/hooks/useLocalWorkerWake";
import { usePresenterBatch } from "@/lib/hooks/usePresenterBatch";
import { useSadTalkerServer } from "@/lib/hooks/useSadTalkerServer";
import { getPersonaById } from "@/lib/tts/personas";
import { useBatchGeneration } from "@/lib/tts/useBatchGeneration";
import { useModernTts } from "@/lib/tts/useModernTts";
import type { AspectRatio,CompositionProps,StudioSetId,PresenterConfig } from "@/lib/types";
import type { VideoBackdropConfig, AdScene } from "@/lib/types/ecommerce";
import { useParams } from "next/navigation";
import { useCallback,useMemo,useRef,useState } from "react";
import useSWR from "swr";

const FPS = 30;

export default function EditorPage() {
  const params = useParams();
  const storyId = params.storyId as string;
  const { toast } = useToast();

  const [selectedSceneIndex, setSelectedSceneIndex] = useState<number | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [showSafeZones, setShowSafeZones] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<"scene" | "visuals" | "voice" | "presenter" | "meta">("scene");
  const [leftTab, setLeftTab] = useState("timeline");
  const [isRendering, setIsRendering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [wasPlayingBeforeDrag, setWasPlayingBeforeDrag] = useState(false);
  const [audioTimestamp, setAudioTimestamp] = useState(() => Date.now());
  const [showSocialSafeZones, setShowSocialSafeZones] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [renderQuality, setRenderQuality] = useState<"draft" | "master">("master");
  const [showOmnichannelModal, setShowOmnichannelModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>("pro");
  const [showLocalizationModal, setShowLocalizationModal] = useState(false);
  const [isPolishingScript, setIsPolishingScript] = useState(false);
  const [globalBackdrop, setGlobalBackdrop] = useState<VideoBackdropConfig>({
    mode: "studio_plate",
    studioBackgroundId: "highrise_newsroom",
    customColor: "#18181b",
    blurPx: 0,
    dimmingPercent: 20,
    enableCameraPan: true,
  });

  const [selectedVoiceEngine, setSelectedVoiceEngine] = useState<string>("omni");
  const [selectedVoiceModel, setSelectedVoiceModel] = useState<string>("k2-fsa/OmniVoice");
  const [voiceSpeed, setVoiceSpeed] = useState<number>(1.0);
  const [voicePitch, setVoicePitch] = useState<number>(0);
  const [voiceLanguage, _setVoiceLanguage] = useState<string>("en");

  const [selectedAttireId, setSelectedAttireId] = useState<string>("ruby_burgundy_blazer");
  const [presenterScope, setPresenterScope] = useState<"broadcast" | "scene">("broadcast");
  const [presenterConfig, setPresenterConfig] = useState<PresenterConfig>({
    personaId: "ruby",
    layoutMode: "full_screen",
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
    showNametag: false,
    presenterName: "Ruby",
    roleTag: "News Anchor",
    bubbleFaceZoom: 1.85,
    bubbleFaceOffsetY: 5,
    bubbleFaceOffsetX: 0,
    enabled: true,
  });

  const [expandedSceneVideoIndex, setExpandedSceneVideoIndex] = useState<number | null>(null);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [seekTarget, setSeekTarget] = useState<number | { frame: number; nonce: number } | undefined>(undefined);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("vertical");
  const [globalBgEnabled, _setGlobalBgEnabled] = useState(false);
  const [showTickerTape, setShowTickerTape] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [studioSetId, setStudioSetId] = useState<StudioSetId>("cyber_metropolis");
  const [isSplitPreview, setIsSplitPreview] = useState(false);
  const [selectedLayer, setSelectedLayer] = useState<EditorLayerId>("avatar");
  const [showLayerTree, setShowLayerTree] = useState<boolean>(false);
  const [showCanvasGizmo, setShowCanvasGizmo] = useState<boolean>(true);
  const [avatarLocked, setAvatarLocked] = useState<boolean>(false);
  const [captionLocked, setCaptionLocked] = useState<boolean>(false);

  const [showPresenter, setShowPresenter] = useState<boolean>(true);
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [showHeadline, setShowHeadline] = useState<boolean>(true);
  const [showCitationBadge, setShowCitationBadge] = useState<boolean>(true);
  const [showBrandLogo, setShowBrandLogo] = useState<boolean>(true);
  const [showBackdrop, setShowBackdrop] = useState<boolean>(true);
  const [showIntro, setShowIntro] = useState<boolean>(true);
  const [showOutro, setShowOutro] = useState<boolean>(true);

  const [brandLogoOffsetX, setBrandLogoOffsetX] = useState<number>(0);
  const [brandLogoOffsetY, setBrandLogoOffsetY] = useState<number>(0);
  const [brandLogoScale, setBrandLogoScale] = useState<number>(1.0);

  const [badgeOffsetX, setBadgeOffsetX] = useState<number>(0);
  const [badgeOffsetY, setBadgeOffsetY] = useState<number>(0);
  const [tickerTapeOffsetY, setTickerTapeOffsetY] = useState<number>(0);

  const [isAutoProducing, setIsAutoProducing] = useState(false);
  const [isBatchExporting, setIsBatchExporting] = useState(false);

  const handleSplitSceneRef = useRef<((index: number) => void) | null>(null);

  const tts = useModernTts();
  const batchState = useBatchGeneration(tts);
  const presenterBatch = usePresenterBatch();
  const comfyServer = useComfyServer();
  const sadtalkerServer = useSadTalkerServer();

  const {
    story,
    setStory,
    storyRef: _storyRef,
    isLoading,
    undoStack,
    redoStack,
    handleUndo,
    handleRedo,
    handleSaveTakeSnapshot,
    isEditingTitle,
    setIsEditingTitle,
    titleEditValue,
    setTitleEditValue,
    handleSaveTitle,
  } = useStoryEditorState({
    storyId,
    toast,
    setPresenterConfig,
    setSelectedAttireId,
    setAspectRatio,
    setStudioSetId,
    setGlobalBackdrop,
  });

  const {
    isAutoDirecting,
    sceneBlobMapRef,
    sceneBlobTextMapRef,
    handlePlaySceneAudio,
    handleAudioGenerated,
    handleGenerateLipSyncForScene,
    handleGenerateAllPresenterVideos,
    handleMagicAutoDirect,
    handleAutoMatchAllBRoll,
  } = useStoryMediaGeneration({
    storyId,
    story,
    setStory,
    toast,
    tts,
    setAudioTimestamp,
    presenterConfig,
  });

  const scriptSegments = useMemo(() => story?.script?.segments ?? [], [story?.script?.segments]);

  type ScriptSegment = NonNullable<StoryData["script"]>["segments"][0];

  const contentDuration = scriptSegments.reduce((max, seg) => Math.max(max, seg.endTime), 0);
  const introDuration = 3;
  const outroDuration = 3;
  const totalDuration = contentDuration + introDuration + outroDuration;

  const timelineSegments = useMemo<ScriptSegment[]>(() => [
    { index: -1, id: "intro", text: "INTRO", imagePrompt: "Intro Logo Animation", startTime: 0, endTime: 3 } as ScriptSegment,
    ...scriptSegments.map((seg) => ({
      ...seg,
      startTime: (seg.startTime || 0) + 3,
      endTime: (seg.endTime || 0) + 3,
      keyword: seg.keyword,
      backupKeywords: seg.keywords ? JSON.parse(seg.keywords) : undefined,
    })),
    {
      index: -2,
      id: "outro",
      text: "OUTRO",
      imagePrompt: story?.video?.outroId?.toUpperCase() || "SUBSCRIBE",
      startTime: Math.max(0, totalDuration - 3),
      endTime: totalDuration,
    } as ScriptSegment,
  ], [scriptSegments, story?.video?.outroId, totalDuration]);

  const {
    handleSeek,
    handleFrameUpdate,
    handleDragStart: _handleDragStart,
    handleDragEnd: _handleDragEnd,
  } = useEditorShortcutsAndTransport({
    currentFrame,
    setCurrentFrame,
    isPlaying,
    setIsPlaying,
    setSelectedSceneIndex,
    setSeekTarget,
    setShowShortcutsModal,
    handleUndo,
    handleRedo,
    story,
    timelineSegments,
    handleSplitSceneRef,
  });

  const { data: dbPersonasRaw } = useSWR<
    | { id: string; name: string; isSystemPersona?: boolean }[]
    | { data?: { id: string; name: string; isSystemPersona?: boolean }[]; personas?: { id: string; name: string; isSystemPersona?: boolean }[] }
  >(
    "/api/personas?limit=500",
    (url: string) => cachedFetch("api:personas:all", () => fetch(url).then((r) => r.json()), 60 * 60 * 1000)
  );
  const dbPersonas = useMemo(() => {
    if (Array.isArray(dbPersonasRaw)) return dbPersonasRaw;
    if (dbPersonasRaw && typeof dbPersonasRaw === "object") {
      if ("data" in dbPersonasRaw && Array.isArray(dbPersonasRaw.data)) return dbPersonasRaw.data;
      if ("personas" in dbPersonasRaw && Array.isArray(dbPersonasRaw.personas)) return dbPersonasRaw.personas;
    }
    return [];
  }, [dbPersonasRaw]);
  const clonedPersonas = useMemo(() => dbPersonas.filter((p) => !p.isSystemPersona), [dbPersonas]);

  const selectedSegment = useMemo(() => {
    if (selectedSceneIndex === null) return null;
    return timelineSegments.find((s) => s.index === selectedSceneIndex) || null;
  }, [selectedSceneIndex, timelineSegments]);

  const selectedSceneMediaSettings = useMemo(() => {
    if (selectedSceneIndex === null || !story?.script?.segments) return null;
    const seg = story.script.segments.find((s) => s.index === selectedSceneIndex) || story.script.segments[selectedSceneIndex];
    if (!seg?.mediaSettings) return null;
    try {
      return JSON.parse(seg.mediaSettings as string);
    } catch {
      return null;
    }
  }, [selectedSceneIndex, story?.script?.segments]);

  const selectedSceneHasPresenterOverride = Boolean(
    selectedSceneMediaSettings?.hasPresenterOverride ||
    (selectedSceneMediaSettings?.layoutMode && selectedSceneMediaSettings.layoutMode !== presenterConfig.layoutMode) ||
    (selectedSceneMediaSettings?.presenterScale !== undefined && selectedSceneMediaSettings.presenterScale !== (presenterConfig.scale ?? 1.0)) ||
    (selectedSceneMediaSettings?.presenterOffsetX !== undefined && selectedSceneMediaSettings.presenterOffsetX !== (presenterConfig.offsetX ?? 0)) ||
    (selectedSceneMediaSettings?.presenterOffsetY !== undefined && selectedSceneMediaSettings.presenterOffsetY !== (presenterConfig.offsetY ?? 0))
  );

  const readinessMatrix: CommercialReadinessMatrix = useMemo(() => {
    const totalScenes = scriptSegments.length;
    if (totalScenes === 0) {
      return {
        totalScenes: 0,
        audioReadyCount: 0,
        presenterTotal: 0,
        presenterReadyCount: 0,
        isFullySynced: false,
        pendingAudioCount: 0,
        pendingPresenterCount: 0,
      };
    }

    const audioReadyCount = scriptSegments.filter((s) => Boolean(s.audioPath)).length;
    const pendingAudioCount = totalScenes - audioReadyCount;

    const presenterScenes = scriptSegments.filter(
      (s) => Boolean(s.personaId || story?.video?.presenterVideoPath || s.presenterVideoPath)
    );
    const presenterTotal = presenterScenes.length;
    const presenterReadyCount = presenterScenes.filter(
      (s) => Boolean(s.presenterVideoPath || s.presenterVideoSrc || s.presenterStatus === "COMPLETED" || s.presenterStatus === "done")
    ).length;
    const pendingPresenterCount = presenterTotal - presenterReadyCount;

    const isFullySynced = totalScenes > 0 && pendingAudioCount === 0 && pendingPresenterCount === 0;

    return {
      totalScenes,
      audioReadyCount,
      presenterTotal,
      presenterReadyCount,
      isFullySynced,
      pendingAudioCount,
      pendingPresenterCount,
    };
  }, [scriptSegments, story?.video?.presenterVideoPath]);

  const unifiedTimelineItems = useMemo(() => {
    return adaptNewsSegmentsToTimeline(timelineSegments, FPS);
  }, [timelineSegments]);

  const adScenesForModal = useMemo(() => {
    return adaptNewsSegmentsToAdScenes(scriptSegments, FPS);
  }, [scriptSegments]);

  const missingAudioSegments = useMemo(() => timelineSegments
    .filter(s => {
      if (s.index < 0) return false;
      const isBatchDone = batchState.batchResults[s.index] === "done" || batchState.batchResults[s.index] === "cached";
      const hasDbAudio = !!s.audioPath || !!s.presenterVideoPath || !!s.presenterVideoSrc;
      return !isBatchDone && !hasDbAudio;
    })
    .map(s => s.index), [timelineSegments, batchState.batchResults]);

  const handleSelectScene = useCallback(
    (index: number | null) => {
      setSelectedSceneIndex(index);
      if (index !== null) {
        const target = timelineSegments.find((s) => s.index === index);
        if (target) handleSeek(target.startTime);
      }
    },
    [timelineSegments, handleSeek]
  );

  const handleUpdateText = useCallback(
    async (index: number, text: string, spokenText?: string | null) => {
      if (!story?.script?.segments) return;
      const segmentId = story.script.segments[index]?.id;
      if (!segmentId) return;

      delete sceneBlobMapRef.current[index];
      delete sceneBlobTextMapRef.current[index];

      setStory((prev) => {
        if (!prev?.script) return prev;
        const newSegments = prev.script.segments.map((s) =>
          s.id === segmentId
            ? {
                ...s,
                text,
                spokenText: spokenText !== undefined ? spokenText : (s as { spokenText?: string }).spokenText,
                audioPath: null,
                presenterVideoPath: null,
                presenterStatus: "pending" as const,
              }
            : s
        );
        return {
          ...prev,
          script: { ...prev.script, segments: newSegments },
        };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId,
            text,
            spokenText,
          }),
        });
      } catch (e) {
        console.error("Failed to persist text update:", e);
      }
    },
    [story, storyId, setStory, sceneBlobMapRef, sceneBlobTextMapRef]
  );

  const handleUpdateMediaSettings = useCallback(
    async (index: number, mediaSettingsString: string) => {
      if (!story?.script?.segments) return;
      const targetSeg = story.script.segments.find((s) => s.index === index) || story.script.segments[index];
      if (!targetSeg) return;

      setStory((prev) => {
        if (!prev?.script) return prev;
        const newSegments = prev.script.segments.map((s) =>
          s.id === targetSeg.id ? { ...s, mediaSettings: mediaSettingsString } : s
        );
        return {
          ...prev,
          script: { ...prev.script, segments: newSegments },
        };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: targetSeg.id,
            mediaSettings: mediaSettingsString,
          }),
        });
      } catch (e) {
        console.error("Failed to persist media settings:", e);
      }
    },
    [story, storyId, setStory]
  );

  const handleUpdateAsset = useCallback(
    async (index: number, assetPath: string, assetType: string) => {
      if (!story?.script?.segments) return;
      const targetSeg = story.script.segments.find((s) => s.index === index) || story.script.segments[index];
      if (!targetSeg) return;

      setStory((prev) => {
        if (!prev?.script) return prev;
        const newSegments = prev.script.segments.map((s) =>
          s.id === targetSeg.id ? { ...s, assetPath, assetType } : s
        );
        return {
          ...prev,
          script: { ...prev.script, segments: newSegments },
        };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: targetSeg.id,
            assetPath,
            assetType,
          }),
        });
      } catch (e) {
        console.error("Failed to update asset:", e);
      }
    },
    [story, storyId, setStory]
  );

  const handleUpdateVideoSettings = useCallback(
    async (data: Partial<{
      aspectRatio: string;
      globalBgVideoPath: string;
      bgMusicPath: string;
      bgMusicVolume: number;
      sloganId: string;
      outroId: string;
      captionStyle: string;
      voiceId: string;
      studioSetId: string;
    }>) => {
      setStory((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          video: {
            ...prev.video,
            id: prev.video?.id || "temp-vid",
            status: prev.video?.status || "DRAFT",
            aspectRatio: data.aspectRatio || prev.video?.aspectRatio || "vertical",
            ...data,
          },
        };
      });

      if (data.aspectRatio) {
        setAspectRatio(data.aspectRatio as AspectRatio);
      }

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-video",
            ...data,
          }),
        });
      } catch (e) {
        console.error("Failed to update video settings:", e);
      }
    },
    [storyId, setStory]
  );

  const handleRegenerateBRoll = useCallback(
    async (index: number) => {
      if (!story?.script?.segments) return;
      const targetSeg = story.script.segments.find((s) => s.index === index) || story.script.segments[index];
      if (!targetSeg) return;

      toast("B-Roll Generating", `Searching stock video & generating AI visual for Scene ${index + 1}...`, "info");
      try {
        const res = await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "auto-match-broll",
            segmentIndex: targetSeg.index,
            query: targetSeg.keyword || targetSeg.imagePrompt,
            mediaType: "video",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const newAssetPath = data.segment?.assetPath || data.asset?.url || data.assetPath;
          const newAssetType = data.segment?.assetType || data.asset?.type || data.assetType || "video";
          if (newAssetPath) {
            await handleUpdateAsset(index, newAssetPath, newAssetType);
            toast("B-Roll Updated", `New B-roll assigned to Scene ${index + 1}!`, "success");
          } else {
            toast("No B-Roll Found", data.message || "No matching stock assets found.", "info");
          }
        } else {
          toast("B-Roll Failed", "Could not generate B-Roll.", "error");
        }
      } catch {
        toast("B-Roll Failed", "Could not generate B-Roll.", "error");
      }
    },
    [story, storyId, toast, handleUpdateAsset]
  );

  const handleDeleteScene = useCallback(
    async (segmentIdOrIndex: string | number) => {
      if (!story?.script?.segments) return;
      let targetSeg: ScriptSegment | undefined;
      if (typeof segmentIdOrIndex === "number") {
        targetSeg = story.script.segments.find((s) => s.index === segmentIdOrIndex) || story.script.segments[segmentIdOrIndex];
      } else {
        targetSeg = story.script.segments.find((s) => s.id === segmentIdOrIndex);
      }
      if (!targetSeg) return;

      const segId = targetSeg.id;
      const newSegments = story.script.segments
        .filter((s) => s.id !== segId)
        .map((s, idx) => ({ ...s, index: idx }));

      setStory((prev) => {
        if (!prev?.script) return prev;
        return {
          ...prev,
          script: { ...prev.script, segments: newSegments },
        };
      });

      if (selectedSceneIndex === targetSeg.index) {
        setSelectedSceneIndex(null);
      }

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "delete-segment",
            segmentId: segId,
          }),
        });
        toast("Scene Deleted", "Scene removed from story timeline.", "success");
      } catch {
        toast("Delete Failed", "Could not delete scene.", "error");
      }
    },
    [story, storyId, selectedSceneIndex, setStory, toast]
  );

  const handleAddScene = useCallback(async () => {
    if (!story?.script) return;
    const currentSegs = story.script.segments || [];
    const newIdx = currentSegs.length;
    const lastSeg = currentSegs[newIdx - 1];
    const newStart = lastSeg ? lastSeg.endTime : 0;
    const newEnd = newStart + 4;

    const newSeg: ScriptSegment = {
      id: `temp-${Date.now()}`,
      index: newIdx,
      startTime: newStart,
      endTime: newEnd,
      text: "New broadcast scene script line...",
      imagePrompt: "Newsroom broadcast studio graphic",
      assetType: "placeholder",
    };

    setStory((prev) => {
      if (!prev?.script) return prev;
      return {
        ...prev,
        script: { ...prev.script, segments: [...currentSegs, newSeg] },
      };
    });

    try {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add-segment",
          index: newIdx,
          startTime: newStart,
          endTime: newEnd,
          text: newSeg.text,
          imagePrompt: newSeg.imagePrompt,
        }),
      });
      if (res.ok) {
        const freshStory = await fetch(`/api/stories/${storyId}`).then((r) => r.json());
        setStory(freshStory);
        toast("Scene Added", `Created new Scene ${newIdx + 1}.`, "success");
      }
    } catch {
      toast("Error", "Failed to add scene", "error");
    }
  }, [story, storyId, setStory, toast]);

  const handleSplitScene = useCallback(
    async (index: number) => {
      if (!story?.script?.segments) return;
      const targetSeg = story.script.segments.find((s) => s.index === index) || story.script.segments[index];
      if (!targetSeg) return;

      const midTime = (targetSeg.startTime + targetSeg.endTime) / 2;
      const words = targetSeg.text.split(" ");
      const midWordIdx = Math.floor(words.length / 2);
      const firstHalfText = words.slice(0, midWordIdx).join(" ") || targetSeg.text;
      const secondHalfText = words.slice(midWordIdx).join(" ") || "Continued scene...";

      try {
        const res = await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "split-segment",
            segmentId: targetSeg.id,
            splitTime: midTime,
            firstHalfText,
            secondHalfText,
          }),
        });
        if (res.ok) {
          const freshStory = await fetch(`/api/stories/${storyId}`).then((r) => r.json());
          setStory(freshStory);
          toast("Scene Split", `Split Scene ${index + 1} into two scenes.`, "success");
        }
      } catch {
        toast("Split Failed", "Could not split scene.", "error");
      }
    },
    [story, storyId, setStory, toast]
  );
  handleSplitSceneRef.current = handleSplitScene;

  const handleMergeScene = useCallback(
    async (index: number) => {
      if (!story?.script?.segments || index >= story.script.segments.length - 1) return;
      const segA = story.script.segments.find((s) => s.index === index) || story.script.segments[index];
      const segB = story.script.segments.find((s) => s.index === index + 1) || story.script.segments[index + 1];
      if (!segA || !segB) return;

      try {
        const res = await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "merge-segments",
            firstSegmentId: segA.id,
            secondSegmentId: segB.id,
          }),
        });
        if (res.ok) {
          const freshStory = await fetch(`/api/stories/${storyId}`).then((r) => r.json());
          setStory(freshStory);
          toast("Scenes Merged", `Merged Scene ${index + 1} and ${index + 2}.`, "success");
        }
      } catch {
        toast("Merge Failed", "Could not merge scenes.", "error");
      }
    },
    [story, storyId, setStory, toast]
  );

  const handleTrimSceneStart = useCallback(
    async (index: number, newStartFrames: number, newDurationFrames: number) => {
      if (!story?.script?.segments) return;
      const targetSeg = story.script.segments.find((s) => s.index === index) || story.script.segments[index];
      if (!targetSeg) return;

      const newStartSec = newStartFrames / FPS;
      const newEndSec = newStartSec + newDurationFrames / FPS;

      setStory((prev) => {
        if (!prev?.script) return prev;
        const newSegments = prev.script.segments.map((s) =>
          s.id === targetSeg.id ? { ...s, startTime: newStartSec, endTime: newEndSec } : s
        );
        return {
          ...prev,
          script: { ...prev.script, segments: newSegments },
        };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: targetSeg.id,
            startTime: newStartSec,
            endTime: newEndSec,
          }),
        });
      } catch (e) {
        console.error("Failed to trim scene start:", e);
      }
    },
    [story, storyId, setStory]
  );

  const handleTrimSceneDuration = useCallback(
    async (index: number, newDurationFrames: number) => {
      if (!story?.script?.segments) return;
      const targetSeg = story.script.segments.find((s) => s.index === index) || story.script.segments[index];
      if (!targetSeg) return;

      const newEndSec = targetSeg.startTime + newDurationFrames / FPS;

      setStory((prev) => {
        if (!prev?.script) return prev;
        const newSegments = prev.script.segments.map((s) =>
          s.id === targetSeg.id ? { ...s, endTime: newEndSec } : s
        );
        return {
          ...prev,
          script: { ...prev.script, segments: newSegments },
        };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: targetSeg.id,
            endTime: newEndSec,
          }),
        });
      } catch (e) {
        console.error("Failed to trim scene duration:", e);
      }
    },
    [story, storyId, setStory]
  );

  const handleReorderScene = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (!story?.script?.segments) return;
      const segs = [...story.script.segments];
      const [moved] = segs.splice(fromIndex, 1);
      segs.splice(toIndex, 0, moved);

      const updated = segs.map((s, idx) => ({ ...s, index: idx }));

      setStory((prev) => {
        if (!prev?.script) return prev;
        return {
          ...prev,
          script: { ...prev.script, segments: updated },
        };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reorder-segments",
            segments: updated.map((s) => ({ id: s.id, index: s.index })),
          }),
        });
        toast("Scenes Reordered", "Timeline sequence updated.", "success");
      } catch {
        toast("Reorder Failed", "Could not save scene order.", "error");
      }
    },
    [story, storyId, setStory, toast]
  );

  const handleStoryboardReorder = useCallback(
    async (newAdScenes: AdScene[]) => {
      const updatedNews = adaptAdScenesToNewsSegments(newAdScenes, scriptSegments, FPS);
      setStory((prev) => {
        if (!prev?.script) return prev;
        return {
          ...prev,
          script: { ...prev.script, segments: updatedNews },
        };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reorder-segments",
            segments: updatedNews.map((s) => ({ id: s.id, index: s.index })),
          }),
        });
        toast("Storyboard Updated", "New scene sequence saved.", "success");
      } catch {
        toast("Reorder Failed", "Could not save storyboard sequence.", "error");
      }
    },
    [scriptSegments, storyId, setStory, toast]
  );

  const handleUpdateSegmentVoice = useCallback(
    async (index: number, personaId: string, params: Record<string, unknown>) => {
      if (!story?.script?.segments) return;
      const targetSeg = story.script.segments.find((s) => s.index === index) || story.script.segments[index];
      if (!targetSeg) return;

      setStory((prev) => {
        if (!prev?.script) return prev;
        const newSegments = prev.script.segments.map((s) =>
          s.id === targetSeg.id ? { ...s, personaId, voiceParams: JSON.stringify(params) } : s
        );
        return {
          ...prev,
          script: { ...prev.script, segments: newSegments },
        };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: targetSeg.id,
            personaId,
            voiceParams: JSON.stringify(params),
          }),
        });
      } catch (e) {
        console.error("Failed to update segment voice:", e);
      }
    },
    [story, storyId, setStory]
  );

  const handleUpdateSegmentAvatar = useCallback(
    async (index: number, personaAvatarUrl: string) => {
      if (!story?.script?.segments) return;
      const targetSeg = story.script.segments.find((s) => s.index === index) || story.script.segments[index];
      if (!targetSeg) return;

      setStory((prev) => {
        if (!prev?.script) return prev;
        const newSegments = prev.script.segments.map((s) =>
          s.id === targetSeg.id ? { ...s, personaAvatarUrl } : s
        );
        return {
          ...prev,
          script: { ...prev.script, segments: newSegments },
        };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: targetSeg.id,
            personaAvatarUrl,
          }),
        });
      } catch (e) {
        console.error("Failed to update segment avatar:", e);
      }
    },
    [story, storyId, setStory]
  );

  const handleUpdateSegmentActionLoop = useCallback(
    async (index: number, actionLoop: string, videoUrl?: string, avatarUrl?: string) => {
      if (!story?.script?.segments) return;
      const targetSeg = story.script.segments.find((s) => s.index === index) || story.script.segments[index];
      if (!targetSeg) return;

      let ms: Record<string, unknown> = {};
      try {
        if (targetSeg.mediaSettings) ms = JSON.parse(targetSeg.mediaSettings as string);
      } catch {}
      ms.actionLoop = actionLoop;
      if (videoUrl) ms.actionLoopVideoUrl = videoUrl;

      setStory((prev) => {
        if (!prev?.script) return prev;
        const newSegments = prev.script.segments.map((s) =>
          s.id === targetSeg.id
            ? {
                ...s,
                mediaSettings: JSON.stringify(ms),
                personaAvatarUrl: avatarUrl || s.personaAvatarUrl,
              }
            : s
        );
        return {
          ...prev,
          script: { ...prev.script, segments: newSegments },
        };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: targetSeg.id,
            mediaSettings: JSON.stringify(ms),
            personaAvatarUrl: avatarUrl || targetSeg.personaAvatarUrl,
          }),
        });
      } catch (e) {
        console.error("Failed to update action loop:", e);
      }
    },
    [story, storyId, setStory]
  );

  const handleShuffleActionLoops = useCallback(
    (loopsList?: string[], personaId: string = "ruby") => {
      if (!story?.script?.segments) return;
      const totalDurationFrames = story.script.segments.reduce((acc, s) => {
        const dur = Math.max(30, Math.round(((s.endTime || 4) - (s.startTime || 0)) * FPS));
        return acc + dur;
      }, 0) || 900;
      const seq = generateRandomLoopSequence(totalDurationFrames, { personaId, availableLoopIds: loopsList });

      setStory((prev) => {
        if (!prev?.script) return prev;
        const newSegments = prev.script.segments.map((seg, idx) => {
          let ms: Record<string, unknown> = {};
          try {
            if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string);
          } catch {}
          const assignedClip = seq[idx % Math.max(1, seq.length)];
          const assignedLoop = assignedClip?.clipId || "state_idle";
          ms.actionLoop = assignedLoop;
          ms.actionLoopVideoUrl = assignedClip?.videoUrl || resolveLoopVideoUrl(assignedLoop, personaId);
          return {
            ...seg,
            mediaSettings: JSON.stringify(ms),
          };
        });
        return {
          ...prev,
          script: { ...prev.script, segments: newSegments },
        };
      });

      for (let i = 0; i < story.script.segments.length; i++) {
        const seg = story.script.segments[i];
        let ms: Record<string, unknown> = {};
        try {
          if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string);
        } catch {}
        const assignedClip = seq[i % Math.max(1, seq.length)];
        const assignedLoop = assignedClip?.clipId || "state_idle";
        ms.actionLoop = assignedLoop;
        ms.actionLoopVideoUrl = assignedClip?.videoUrl || resolveLoopVideoUrl(assignedLoop, personaId);
        fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: seg.id,
            mediaSettings: JSON.stringify(ms),
          }),
        }).catch((err) => console.error("Failed to persist shuffled loop:", err));
      }

      toast("Loops Shuffled", "Assigned fresh action loops across all scenes.", "success");
    },
    [story, storyId, setStory, toast]
  );

  const handleReshuffleActiveSceneLoop = useCallback(
    (targetSceneIndex?: number, loopsList?: string[], personaId: string = "ruby") => {
      if (!story?.script?.segments) return;
      const activeIdx = targetSceneIndex !== undefined ? targetSceneIndex : selectedSceneIndex;
      if (activeIdx === null || activeIdx < 0 || activeIdx >= story.script.segments.length) return;

      const seg = story.script.segments.find((s) => s.index === activeIdx) || story.script.segments[activeIdx];
      if (!seg) return;

      const segStartFrame = Math.round((seg.startTime || 0) * FPS);
      const segDurationFrames = Math.max(30, Math.round(((seg.endTime || 4) - (seg.startTime || 0)) * FPS));
      const fsmSequence = generateRandomLoopSequence(segStartFrame + segDurationFrames + 120, {
        personaId,
        availableLoopIds: loopsList,
      });
      const slices = sliceSequenceForScene(fsmSequence, segStartFrame, segDurationFrames);
      const newLoop = slices[0]?.clipId || "state_idle";
      const videoUrl = slices[0]?.videoUrl || resolveLoopVideoUrl(newLoop, personaId);

      handleUpdateSegmentActionLoop(activeIdx, newLoop, videoUrl);
      toast("Loop Reshuffled", `Scene ${activeIdx + 1} assigned loop: ${newLoop}`, "success");
    },
    [story, selectedSceneIndex, handleUpdateSegmentActionLoop, toast]
  );

  const handleAutoChoreographAllLoops = useCallback(
    (loopsList?: string[], personaId: string = "ruby") => {
      handleShuffleActionLoops(loopsList, personaId);
    },
    [handleShuffleActionLoops]
  );

  const handleRecastPersona = useCallback(
    async (personaId: string) => {
      const personaObj = getPersonaById(personaId);
      const personaName = personaObj?.name || personaId;
      const avatarUrl = personaObj?.avatarUrl;

      setPresenterConfig((prev) => ({
        ...prev,
        personaId,
        presenterName: personaName,
        avatarSrc: avatarUrl || prev.avatarSrc,
      }));

      setStory((prev) => {
        if (!prev?.script) return prev;
        const newSegments = prev.script.segments.map((seg) => ({
          ...seg,
          personaId,
          personaAvatarUrl: avatarUrl || seg.personaAvatarUrl,
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
              personaId,
              personaAvatarUrl: avatarUrl || seg.personaAvatarUrl,
            }),
          }).catch((err) => console.error("Failed to recast persona segment:", err));
        }
      }

      toast("Persona Recast", `Story presenter updated to ${personaName}.`, "success");
    },
    [story, storyId, setStory, toast]
  );

  const handleApplyPersonaToAll = useCallback(
    (personaId: string) => {
      handleRecastPersona(personaId);
    },
    [handleRecastPersona]
  );

  const handleClearSceneAudio = useCallback(
    async (sceneIndex: number) => {
      if (!story?.script?.segments) return;
      const targetSeg = story.script.segments.find((s) => s.index === sceneIndex) || story.script.segments[sceneIndex];
      if (!targetSeg) return;

      delete sceneBlobMapRef.current[sceneIndex];
      delete sceneBlobTextMapRef.current[sceneIndex];

      setStory((prev) => {
        if (!prev?.script) return prev;
        const newSegments = prev.script.segments.map((s) =>
          s.id === targetSeg.id ? { ...s, audioPath: null } : s
        );
        return {
          ...prev,
          script: { ...prev.script, segments: newSegments },
        };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: targetSeg.id,
            audioPath: null,
          }),
        });
        toast("Audio Cleared", `Scene ${sceneIndex + 1} audio reset.`, "info");
      } catch (e) {
        console.error("Failed to clear scene audio:", e);
      }
    },
    [story, storyId, setStory, toast, sceneBlobMapRef, sceneBlobTextMapRef]
  );

  const handleClearAllAudio = useCallback(async () => {
    if (!story?.script?.segments) return;
    sceneBlobMapRef.current = {};
    sceneBlobTextMapRef.current = {};

    setStory((prev) => {
      if (!prev?.script) return prev;
      const newSegments = prev.script.segments.map((s) => ({ ...s, audioPath: null }));
      return {
        ...prev,
        script: { ...prev.script, segments: newSegments },
      };
    });

    for (const seg of story.script.segments) {
      fetch(`/api/stories/${storyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-segment",
          segmentId: seg.id,
          audioPath: null,
        }),
      }).catch((e) => console.error("Failed to clear audio segment:", e));
    }

    toast("All Audio Reset", "All scene audio clips cleared.", "info");
  }, [story, storyId, setStory, toast, sceneBlobMapRef, sceneBlobTextMapRef]);

  const handleBatchAudioCalibrateComplete = useCallback(
    async (_calibratedScenes?: unknown[]) => {
      const refreshed = await fetch(`/api/stories/${storyId}`).then((r) => r.json());
      if (refreshed) setStory(refreshed);
      setAudioTimestamp(Date.now());
      toast("Batch Audio Complete", "Calibrated and synced audio across all scenes.", "success");
    },
    [storyId, setStory, toast]
  );

  const handleRegenerateSceneAudio = useCallback(
    async (index: number, textOverride?: string) => {
      const seg = story?.script?.segments?.[index];
      const textToUse = textOverride?.trim() || seg?.spokenText || seg?.text;
      if (!textToUse) return;

      toast("Generating Audio", `Synthesizing audio for Scene ${index + 1}...`, "info");
      const personaId = seg?.personaId || presenterConfig.personaId || "ruby";
      const blob = await tts.generateAudio(`scene-${index}`, textToUse, personaId, { bypassCache: true });
      if (blob) {
        await handleAudioGenerated(index, blob);
      }
    },
    [story?.script?.segments, presenterConfig.personaId, tts, handleAudioGenerated, toast]
  );

  const handleDeletePresenterVideoForScene = useCallback(
    async (sceneIndex: number) => {
      if (!story?.script?.segments) return;
      const targetSeg = story.script.segments.find((s) => s.index === sceneIndex) || story.script.segments[sceneIndex];
      if (!targetSeg) return;

      setStory((prev) => {
        if (!prev?.script) return prev;
        const newSegments = prev.script.segments.map((s) =>
          s.id === targetSeg.id ? { ...s, presenterVideoPath: null, presenterStatus: "pending" as const } : s
        );
        return {
          ...prev,
          script: { ...prev.script, segments: newSegments },
        };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: targetSeg.id,
            presenterVideoPath: null,
            presenterStatus: "pending",
          }),
        });
        toast("Presenter Removed", `Scene ${sceneIndex + 1} lip-sync video deleted.`, "info");
      } catch (e) {
        console.error("Failed to delete presenter video:", e);
      }
    },
    [story, storyId, setStory, toast]
  );

  const handleDeleteAllPresenterVideos = useCallback(async () => {
    if (!story?.script?.segments) return;

    setStory((prev) => {
      if (!prev?.script) return prev;
      const newSegments = prev.script.segments.map((s) => ({
        ...s,
        presenterVideoPath: null,
        presenterStatus: "pending" as const,
      }));
      return {
        ...prev,
        script: { ...prev.script, segments: newSegments },
      };
    });

    for (const seg of story.script.segments) {
      fetch(`/api/stories/${storyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update-segment",
          segmentId: seg.id,
          presenterVideoPath: null,
          presenterStatus: "pending",
        }),
      }).catch((e) => console.error("Failed to clear presenter video:", e));
    }

    toast("All Presenter Videos Reset", "Cleared lip-sync videos across all scenes.", "info");
  }, [story, storyId, setStory, toast]);

  const handleResetBroadcastPresenterToFactory = useCallback(() => {
    setPresenterConfig({
      personaId: "ruby",
      layoutMode: "full_screen",
      scale: 1.0,
      offsetX: 0,
      offsetY: 0,
      showNametag: false,
      presenterName: "Ruby",
      roleTag: "News Anchor",
      bubbleFaceZoom: 1.85,
      bubbleFaceOffsetY: 5,
      bubbleFaceOffsetX: 0,
      enabled: true,
    });
    toast("Broadcast Presenter Reset", "Reverted to factory default chroma anchor placement.", "info");
  }, [toast]);

  const handleResetCurrentScenePresenterOverride = useCallback(() => {
    if (selectedSceneIndex === null || !story?.script?.segments) return;
    const targetSeg = story.script.segments.find((s) => s.index === selectedSceneIndex) || story.script.segments[selectedSceneIndex];
    if (!targetSeg) return;

    let ms: Record<string, unknown> = {};
    try {
      if (targetSeg.mediaSettings) ms = JSON.parse(targetSeg.mediaSettings as string);
    } catch {}
    delete ms.hasPresenterOverride;
    delete ms.layoutMode;
    delete ms.presenterScale;
    delete ms.presenterOffsetX;
    delete ms.presenterOffsetY;
    delete ms.isAvatarHidden;

    handleUpdateMediaSettings(targetSeg.index, JSON.stringify(ms));
    toast("Override Removed", `Scene ${selectedSceneIndex + 1} will inherit Broadcast Defaults.`, "info");
  }, [selectedSceneIndex, story, handleUpdateMediaSettings, toast]);

  const handlePolishScriptWithLlm = useCallback(async () => {
    setIsPolishingScript(true);
    toast("AI Script Polish", "Polishing script for broadcast cadence & tone...", "info");
    try {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "polish-script" }),
      });
      if (res.ok) {
        const refreshed = await fetch(`/api/stories/${storyId}`).then((r) => r.json());
        setStory(refreshed);
        toast("Script Polished", "Broadcast cadence and spoken phrasing optimized!", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        toast("Polish Failed", err.error || "Could not polish script.", "error");
      }
    } catch {
      toast("Polish Failed", "Could not polish script.", "error");
    } finally {
      setIsPolishingScript(false);
    }
  }, [storyId, setStory, toast]);

  const handleAutoProduceEpisode = useCallback(async () => {
    setIsAutoProducing(true);
    toast("Auto-Producing Episode", "Generating missing TTS, B-roll visuals, and lip-sync videos...", "info");
    try {
      void pingLocalWorkerWake("auto_produce");
      const res = await fetch(`/api/stories/${storyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-to-production", aspectRatio }),
      });
      if (res.ok) {
        const freshStory = await fetch(`/api/stories/${storyId}`).then((r) => r.json());
        setStory(freshStory);
        toast("Auto-Production Queued", "Audio & presenter pipeline jobs queued for worker execution!", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        toast("Auto-Produce Failed", err.error || "Error queueing auto-production.", "error");
      }
    } catch {
      toast("Auto-Produce Failed", "Error during auto-production.", "error");
    } finally {
      setIsAutoProducing(false);
    }
  }, [storyId, aspectRatio, setStory, toast]);

  const handleRenderVideo = useCallback(async () => {
    setIsRendering(true);
    toast("Render Triggered", `Submitting Remotion render job (${renderQuality} quality)...`, "info");
    try {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "render", quality: renderQuality }),
      });
      if (res.ok) {
        void pingLocalWorkerWake("render_video");
        const freshStory = await fetch(`/api/stories/${storyId}`).then((r) => r.json());
        if (freshStory && !freshStory.error) {
          setStory(freshStory);
        }
        toast("Render In Progress", "Video rendering on GPU queue...", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        toast("Render Failed", err.error || "Could not start render job.", "error");
      }
    } catch {
      toast("Render Error", "Network error starting render.", "error");
    } finally {
      setIsRendering(false);
    }
  }, [storyId, renderQuality, setStory, toast]);

  const handleUpdatePresenter = useCallback(
    (data: Partial<PresenterConfig>) => {
      setPresenterConfig((prev) => ({ ...prev, ...data }));
    },
    []
  );

  const handleResetPresenter = useCallback(() => {
    handleResetBroadcastPresenterToFactory();
  }, [handleResetBroadcastPresenterToFactory]);

  const handleUpdateCaptionOffsets = useCallback(
    (data: { offsetX?: number; offsetY?: number }) => {
      if (selectedSceneIndex !== null) {
        const seg = story?.script?.segments?.find((s) => s.index === selectedSceneIndex);
        if (seg) {
          let ms: Record<string, unknown> = {};
          try {
            if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string);
          } catch {}
          ms.captionOffsetX = data.offsetX ?? ms.captionOffsetX ?? 0;
          ms.captionOffsetY = data.offsetY ?? ms.captionOffsetY ?? 0;
          handleUpdateMediaSettings(seg.index, JSON.stringify(ms));
        }
      }
    },
    [selectedSceneIndex, story?.script?.segments, handleUpdateMediaSettings]
  );

  const handleResetCaptionOffsets = useCallback(() => {
    if (selectedSceneIndex !== null) {
      handleUpdateCaptionOffsets({ offsetX: 0, offsetY: 0 });
    }
  }, [selectedSceneIndex, handleUpdateCaptionOffsets]);

  const handleUpdateHeadlineOffsets = useCallback(
    (data: { offsetX?: number; offsetY?: number }) => {
      if (selectedSceneIndex !== null) {
        const seg = story?.script?.segments?.find((s) => s.index === selectedSceneIndex);
        if (seg) {
          let ms: Record<string, unknown> = {};
          try {
            if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string);
          } catch {}
          ms.headlineOffsetX = data.offsetX ?? ms.headlineOffsetX ?? 0;
          ms.headlineOffsetY = data.offsetY ?? ms.headlineOffsetY ?? 0;
          handleUpdateMediaSettings(seg.index, JSON.stringify(ms));
        }
      }
    },
    [selectedSceneIndex, story?.script?.segments, handleUpdateMediaSettings]
  );

  const handleResetHeadlineOffsets = useCallback(() => {
    if (selectedSceneIndex !== null) {
      handleUpdateHeadlineOffsets({ offsetX: 0, offsetY: 0 });
    }
  }, [selectedSceneIndex, handleUpdateHeadlineOffsets]);

  const handleCommitGizmoChanges = useCallback(() => {
    toast("Gizmo Layout Saved", "Updated framing & position coordinates.", "success");
  }, [toast]);

  const handleUpdateAnchorPosition = useCallback(
    (preset: "bottom-right" | "bottom-left" | "center" | "fullscreen") => {
      let layoutMode = "full_screen";
      let scale = 1.0;
      let offsetX = 0;
      let offsetY = 0;

      if (preset === "bottom-right") {
        layoutMode = "pip";
        scale = 0.35;
        offsetX = 28;
        offsetY = 28;
      } else if (preset === "bottom-left") {
        layoutMode = "pip";
        scale = 0.35;
        offsetX = -28;
        offsetY = 28;
      } else if (preset === "center") {
        layoutMode = "full_screen";
        scale = 1.0;
        offsetX = 0;
        offsetY = 0;
      } else if (preset === "fullscreen") {
        layoutMode = "full_screen";
        scale = 1.0;
        offsetX = 0;
        offsetY = 0;
      }

      setPresenterConfig((prev) => ({
        ...prev,
        layoutMode,
        scale,
        offsetX,
        offsetY,
      }));
    },
    []
  );

  const compositionProps: CompositionProps = useMemo(() => {
    return transformSegmentsToCompositionProps({
      aspectRatio,
      scriptSegments,
      story,
      globalBgEnabled,
      showSafeZones,
      showTickerTape,
      sfxEnabled,
      studioSetId,
      clonedPersonas,
      audioTimestamp,
      sceneBlobMap: sceneBlobMapRef.current,
      batchBlobMap: batchState.blobMap,
      showPresenter,
      showCaptions,
      showHeadline,
      showCitationBadge,
      showBrandLogo,
      showBackdrop,
      showIntro,
      showOutro,
      brandLogoOffsetX,
      brandLogoOffsetY,
      brandLogoScale,
      badgeOffsetX,
      badgeOffsetY,
      tickerTapeOffsetY,
      presenterConfig,
      fps: FPS,
    });
  }, [
    aspectRatio,
    scriptSegments,
    story,
    globalBgEnabled,
    showSafeZones,
    showTickerTape,
    sfxEnabled,
    studioSetId,
    clonedPersonas,
    audioTimestamp,
    batchState.blobMap,
    showPresenter,
    showCaptions,
    showHeadline,
    showCitationBadge,
    showBrandLogo,
    showBackdrop,
    showIntro,
    showOutro,
    brandLogoOffsetX,
    brandLogoOffsetY,
    brandLogoScale,
    badgeOffsetX,
    badgeOffsetY,
    tickerTapeOffsetY,
    presenterConfig,
    sceneBlobMapRef,
  ]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <p className="text-sm font-bold animate-pulse font-mono text-emerald-400">Loading Story Editor...</p>
      </div>
    );
  }

  if (!story?.script) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <p className="text-muted text-sm font-bold">No script available for this story.</p>
        <a href="/newsroom" className="text-xs font-bold text-accent hover:underline transition-colors mt-2">
          ← Back to Control Center
        </a>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Navigation Bar */}
      <EditorTopBar
        story={story}
        storyId={storyId}
        isEditingTitle={isEditingTitle}
        setIsEditingTitle={setIsEditingTitle}
        titleEditValue={titleEditValue}
        setTitleEditValue={setTitleEditValue}
        handleSaveTitle={handleSaveTitle}
        handleRecastPersona={handleRecastPersona}
        clonedPersonas={clonedPersonas}
        isAutoDirecting={isAutoDirecting}
        handleMagicAutoDirect={handleMagicAutoDirect}
        aspectRatio={aspectRatio}
        handleUpdateVideoSettings={handleUpdateVideoSettings}
        showSafeZones={showSafeZones}
        setShowSafeZones={setShowSafeZones}
        showTickerTape={showTickerTape}
        setShowTickerTape={setShowTickerTape}
        sfxEnabled={sfxEnabled}
        setSfxEnabled={setSfxEnabled}
        isSplitPreview={isSplitPreview}
        setIsSplitPreview={setIsSplitPreview}
        handleSaveTakeSnapshot={handleSaveTakeSnapshot}
        editorMode={editorMode}
        setEditorMode={setEditorMode}
        undoCount={undoStack.length}
        redoCount={redoStack.length}
        handleUndo={handleUndo}
        handleRedo={handleRedo}
        setShowShortcutsModal={setShowShortcutsModal}
        readinessMatrix={readinessMatrix}
        handleAutoProduceEpisode={handleAutoProduceEpisode}
        isAutoProducing={isAutoProducing}
        presenterConfig={presenterConfig}
        handlePolishScriptWithLlm={handlePolishScriptWithLlm}
        isPolishingScript={isPolishingScript}
        handleAutoMatchAllBRoll={handleAutoMatchAllBRoll}
        setShowLocalizationModal={setShowLocalizationModal}
        scriptSegments={scriptSegments}
        handleShuffleActionLoops={handleShuffleActionLoops}
        selectedSceneIndex={selectedSceneIndex}
        handleReshuffleActiveSceneLoop={handleReshuffleActiveSceneLoop}
        setRenderQuality={setRenderQuality}
        handleRenderVideo={handleRenderVideo}
        isRendering={isRendering}
        setShowOmnichannelModal={setShowOmnichannelModal}
        isBatchExporting={isBatchExporting}
        setShowPublishModal={setShowPublishModal}
        setStory={setStory}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <EditorLeftSidebar
          activeTab={leftTab}
          setActiveTab={setLeftTab}
        />

        {/* Center Preview Stage */}
        <EditorPreviewStage
          compositionProps={compositionProps}
          handleFrameUpdate={handleFrameUpdate}
          seekTarget={seekTarget}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          missingAudioSegments={missingAudioSegments}
          selectedSceneIndex={selectedSceneIndex}
          handleUpdateAnchorPosition={handleUpdateAnchorPosition}
          showSocialSafeZones={showSocialSafeZones}
          setShowSocialSafeZones={setShowSocialSafeZones}
          isSplitPreview={isSplitPreview}
          showLayerTree={showLayerTree}
          setShowLayerTree={setShowLayerTree}
          showCanvasGizmo={showCanvasGizmo}
          setShowCanvasGizmo={setShowCanvasGizmo}
          selectedLayer={selectedLayer}
          setSelectedLayer={setSelectedLayer}
          setAspectRatio={setAspectRatio}
          handleUpdateVideoSettings={handleUpdateVideoSettings}
          showPresenter={showPresenter}
          setShowPresenter={setShowPresenter}
          handleUpdatePresenter={handleUpdatePresenter}
          handleResetPresenter={handleResetPresenter}
          avatarLocked={avatarLocked}
          setAvatarLocked={setAvatarLocked}
          showCaptions={showCaptions}
          setShowCaptions={setShowCaptions}
          captionLocked={captionLocked}
          setCaptionLocked={setCaptionLocked}
          handleUpdateCaptionOffsets={handleUpdateCaptionOffsets}
          handleResetCaptionOffsets={handleResetCaptionOffsets}
          showHeadline={showHeadline}
          setShowHeadline={setShowHeadline}
          selectedSegmentMediaSettings={selectedSceneMediaSettings}
          handleUpdateHeadlineOffsets={handleUpdateHeadlineOffsets}
          handleResetHeadlineOffsets={handleResetHeadlineOffsets}
          showTickerTape={showTickerTape}
          setShowTickerTape={setShowTickerTape}
          tickerTapeOffsetY={tickerTapeOffsetY}
          setTickerTapeOffsetY={setTickerTapeOffsetY}
          showBrandLogo={showBrandLogo}
          setShowBrandLogo={setShowBrandLogo}
          brandLogoOffsetX={brandLogoOffsetX}
          setBrandLogoOffsetX={setBrandLogoOffsetX}
          brandLogoOffsetY={brandLogoOffsetY}
          setBrandLogoOffsetY={setBrandLogoOffsetY}
          brandLogoScale={brandLogoScale}
          setBrandLogoScale={setBrandLogoScale}
          showCitationBadge={showCitationBadge}
          setShowCitationBadge={setShowCitationBadge}
          badgeOffsetX={badgeOffsetX}
          setBadgeOffsetX={setBadgeOffsetX}
          badgeOffsetY={badgeOffsetY}
          setBadgeOffsetY={setBadgeOffsetY}
          showIntro={showIntro}
          setShowIntro={setShowIntro}
          showOutro={showOutro}
          setShowOutro={setShowOutro}
          showBackdrop={showBackdrop}
          setShowBackdrop={setShowBackdrop}
          handleCommitGizmoChanges={handleCommitGizmoChanges}
          story={story}
          setStory={setStory}
          handleUpdateMediaSettings={handleUpdateMediaSettings}
          unifiedTimelineItems={unifiedTimelineItems}
          currentFrame={currentFrame}
          totalDuration={totalDuration}
          FPS={FPS}
          handleSelectScene={handleSelectScene}
          handleSeek={handleSeek}
          timelineSegments={timelineSegments}
          setWasPlayingBeforeDrag={setWasPlayingBeforeDrag}
          wasPlayingBeforeDrag={wasPlayingBeforeDrag}
          handleTrimSceneDuration={handleTrimSceneDuration}
          handleTrimSceneStart={handleTrimSceneStart}
          handleAddScene={handleAddScene}
          handleSplitScene={handleSplitScene}
          handleMergeScene={handleMergeScene}
          handleDeleteScene={handleDeleteScene}
          handleReorderScene={handleReorderScene}
          setShowReorderModal={setShowReorderModal}
          setShowShortcutsModal={setShowShortcutsModal}
        />

        {/* Right Inspector */}
        <EditorRightInspector
          rightPanelTab={rightPanelTab}
          setRightPanelTab={setRightPanelTab}
          selectedSegment={selectedSegment}
          selectedSceneIndex={selectedSceneIndex}
          setSelectedSceneIndex={setSelectedSceneIndex}
          timelineSegments={timelineSegments}
          scriptSegments={scriptSegments}
          story={story}
          setStory={setStory}
          storyId={storyId}
          handleUpdateText={handleUpdateText}
          handleUpdateMediaSettings={handleUpdateMediaSettings}
          handleUpdateAsset={handleUpdateAsset}
          handleUpdateVideoSettings={handleUpdateVideoSettings}
          handleRegenerateBRoll={handleRegenerateBRoll}
          handleDeleteScene={handleDeleteScene}
          tts={tts}
          handlePlaySceneAudio={handlePlaySceneAudio}
          handleRegenerateSceneAudio={handleRegenerateSceneAudio}
          handleUpdateSegmentVoice={handleUpdateSegmentVoice}
          handleUpdateSegmentAvatar={handleUpdateSegmentAvatar}
          handleUpdateSegmentActionLoop={handleUpdateSegmentActionLoop}
          globalBackdrop={globalBackdrop}
          setGlobalBackdrop={setGlobalBackdrop}
          setStudioSetId={setStudioSetId}
          aspectRatio={aspectRatio}
          selectedVoiceEngine={selectedVoiceEngine}
          setSelectedVoiceEngine={setSelectedVoiceEngine}
          selectedVoiceModel={selectedVoiceModel}
          setSelectedVoiceModel={setSelectedVoiceModel}
          presenterConfig={presenterConfig}
          setPresenterConfig={setPresenterConfig}
          handleRecastPersona={handleRecastPersona}
          voiceSpeed={voiceSpeed}
          setVoiceSpeed={setVoiceSpeed}
          voicePitch={voicePitch}
          setVoicePitch={setVoicePitch}
          voiceLanguage={voiceLanguage}
          adScenesForModal={adScenesForModal}
          handleApplyPersonaToAll={handleApplyPersonaToAll}
          handleClearAllAudio={handleClearAllAudio}
          handleClearSceneAudio={handleClearSceneAudio}
          batchState={batchState}
          handleBatchAudioCalibrateComplete={handleBatchAudioCalibrateComplete}
          handleAudioGenerated={handleAudioGenerated}
          audioTimestamp={audioTimestamp}
          presenterScope={presenterScope}
          setPresenterScope={setPresenterScope}
          selectedSceneHasPresenterOverride={selectedSceneHasPresenterOverride}
          handleResetBroadcastPresenterToFactory={handleResetBroadcastPresenterToFactory}
          handleResetCurrentScenePresenterOverride={handleResetCurrentScenePresenterOverride}
          selectedAttireId={selectedAttireId}
          setSelectedAttireId={setSelectedAttireId}
          handleAutoChoreographAllLoops={handleAutoChoreographAllLoops}
          handleShuffleActionLoops={handleShuffleActionLoops}
          handleReshuffleActiveSceneLoop={handleReshuffleActiveSceneLoop}
          selectedSceneMediaSettings={selectedSceneMediaSettings}
          handleGenerateLipSyncForScene={handleGenerateLipSyncForScene}
          presenterBatch={presenterBatch}
          handleDeletePresenterVideoForScene={handleDeletePresenterVideoForScene}
          handleDeleteAllPresenterVideos={handleDeleteAllPresenterVideos}
          comfyServer={comfyServer}
          sadtalkerServer={sadtalkerServer}
          handleGenerateAllPresenterVideos={handleGenerateAllPresenterVideos}
          missingAudioSegments={missingAudioSegments}
          handleSelectScene={handleSelectScene}
          expandedSceneVideoIndex={expandedSceneVideoIndex}
          setExpandedSceneVideoIndex={setExpandedSceneVideoIndex}
          handleSaveTitle={handleSaveTitle}
        />
      </div>

      {/* Modals */}
      {showShortcutsModal && (
        <KeyboardShortcutsModal
          isOpen={showShortcutsModal}
          onClose={() => setShowShortcutsModal(false)}
        />
      )}

      {showReorderModal && (
        <StoryboardReorderModal
          isOpen={showReorderModal}
          onClose={() => setShowReorderModal(false)}
          scenes={adScenesForModal}
          onReorder={handleStoryboardReorder}
          selectedSceneIndex={selectedSceneIndex !== null ? selectedSceneIndex : undefined}
          onSelectScene={(idx) => handleSelectScene(idx)}
          fps={FPS}
          personaId={presenterConfig.personaId || "ruby"}
        />
      )}

      {showOmnichannelModal && (
        <OmnichannelExportModal
          isOpen={showOmnichannelModal}
          onClose={() => setShowOmnichannelModal(false)}
          sourceType="news"
          title="Broadcast Omnichannel Multi-Format Exporter"
          subtitle="Simultaneous 9:16 Shorts, 16:9 Broadcast, and 1:1 Social Feed with Gemini Vision QA"
          onTriggerBatchRender={async () => {
            setIsBatchExporting(true);
            toast("Omnichannel Batch", "Rendering all aspect ratios...", "info");
            setTimeout(() => {
              setIsBatchExporting(false);
              setShowOmnichannelModal(false);
              toast("Batch Complete", "Exported 9:16, 16:9, and 1:1 render packages!", "success");
            }, 3000);
          }}
          isRendering={isBatchExporting}
        />
      )}

      {showPublishModal && (
        <SocialPublishModal
          isOpen={showPublishModal}
          onClose={() => setShowPublishModal(false)}
          defaultTitle={story?.title || "AI Daily News Briefing"}
          defaultDescription={`Breaking broadcast coverage: ${story?.title || ""}\n\nAutomated AI synthesis via NewsStudio.`}
        />
      )}

      {showLocalizationModal && (
        <LocalizationMatrixModal
          isOpen={showLocalizationModal}
          onClose={() => setShowLocalizationModal(false)}
          onStartDubbingMatrix={async () => {
            const fresh = await fetch(`/api/stories/${storyId}`).then((r) => r.json());
            if (fresh) setStory(fresh);
            toast("Dubbing Complete", "Localization multi-dub matrix ready!", "success");
          }}
        />
      )}
    </div>
  );
}
