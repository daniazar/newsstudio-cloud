"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { AspectRatio, CameraCue } from "@/lib/types";
import { getPersonaById } from "@/lib/tts/personas";
import { planBroadcastLoopSequence } from "@/lib/video/loopSelector";
import type { BroadcastDomainType } from "@/lib/video/loopSelectorTypes";

export interface EditorSegment {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  text: string;
  imagePrompt: string;
  assetPath?: string | null;
  assetType?: string | null;
  mediaSettings?: string | null;
  personaId?: string | null;
  voiceParams?: string | null;
  audioPath?: string | null;
  presenterVideoPath?: string | null;
  presenterVideoSrc?: string | null;
  presenterStatus?: string | null;
  personaAvatarUrl?: string | null;
  stickers?: unknown;
  transitionType?: string | null;
  backgroundPrompt?: string | null;
  keyword?: string | null;
  keywords?: string | null;
  presetChoice?: string | null;
  personaImagePrompt?: string | null;
  presenterVideoPrompt?: string | null;
  generatedAvatarKey?: string | null;
  mediaHistory?: string | null;
  sceneStrategy?: string | null;
  actionLoop?: string | null;
  cameraCue?: CameraCue | null;
}

export interface EditorVideoData {
  id: string;
  status: string;
  aspectRatio: string;
  presenterVideoPath?: string | null;
  presenterAudioPath?: string | null;
  globalBgVideoPath?: string | null;
  bgMusicPath?: string | null;
  bgMusicVolume?: number | null;
  sloganId?: string | null;
  outroId?: string | null;
  captionStyle?: string | null;
  voiceId?: string | null;
  renderProgress?: number;
}

export interface ClonedPersonaItem {
  id?: string;
  slug?: string;
  avatarUrl?: string;
  avatars?: Array<{ isDefault?: boolean; url?: string }>;
}

export interface MediaHistoryEntry {
  personaId?: string | null;
  audioPath?: string | null;
  presenterVideoPath?: string | null;
  expiresAt?: number;
}

export interface StoryData {
  id: string;
  title: string;
  status: string;
  articleImageUrls?: string | null;
  feed: { name: string; groups?: unknown[] };
  script?: {
    headline: string;
    segments: EditorSegment[];
  };
  video?: EditorVideoData;
}

export function useStoryEditor(storyId: string) {
  const [story, setStory] = useState<StoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("vertical");
  const storyRef = useRef<StoryData | null>(null);
  storyRef.current = story;

  const fetchStory = useCallback(async () => {
    try {
      const res = await fetch(`/api/stories/${storyId}`);
      if (res.ok) {
        const data: StoryData = await res.json();
        setStory(data);
        if (data.video?.aspectRatio) {
          setAspectRatio(data.video.aspectRatio as AspectRatio);
        }
      }
    } catch (e) {
      console.error("[useStoryEditor] Failed to fetch story:", e);
    } finally {
      setIsLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  const updateHeadline = useCallback(
    async (headline: string) => {
      if (!headline.trim() || headline === storyRef.current?.script?.headline) return;

      setStory((prev) => {
        if (!prev?.script) return prev;
        return { ...prev, script: { ...prev.script, headline } };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update-script", headline }),
        });
      } catch (e) {
        console.error("[useStoryEditor] Failed to update headline:", e);
      }
    },
    [storyId]
  );

  const updateText = useCallback(
    async (index: number, text: string) => {
      const seg = storyRef.current?.script?.segments[index];
      if (!seg) return;

      setStory((prev) => {
        if (!prev?.script) return prev;
        const segments = [...prev.script.segments];
        segments[index] = { ...segments[index], text };
        return { ...prev, script: { ...prev.script, segments } };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: seg.id,
            text,
            audioPath: null,
            presenterVideoPath: null,
          }),
        });
      } catch (e) {
        console.error("[useStoryEditor] Failed to save segment text update:", e);
      }
    },
    [storyId]
  );

  const updateMediaSettings = useCallback(
    async (index: number, settings: string, extraFields?: Record<string, unknown>) => {
      const seg = storyRef.current?.script?.segments[index];
      if (!seg) return;

      setStory((prev) => {
        if (!prev?.script) return prev;
        const segments = [...prev.script.segments];
        segments[index] = {
          ...segments[index],
          mediaSettings: settings,
          ...extraFields,
        };
        return { ...prev, script: { ...prev.script, segments } };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: seg.id,
            mediaSettings: settings,
            ...extraFields,
          }),
        });
      } catch (e) {
        console.error("[useStoryEditor] Failed to save media settings:", e);
      }
    },
    [storyId]
  );

  const updateAsset = useCallback(
    async (index: number, url: string, type: string) => {
      const seg = storyRef.current?.script?.segments[index];
      if (!seg) return;

      setStory((prev) => {
        if (!prev?.script) return prev;
        const segments = [...prev.script.segments];
        segments[index] = { ...segments[index], assetPath: url, assetType: type };
        return { ...prev, script: { ...prev.script, segments } };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: seg.id,
            assetPath: url,
            assetType: type,
          }),
        });
      } catch (e) {
        console.error("[useStoryEditor] Failed to update asset:", e);
      }
    },
    [storyId]
  );

  const updateSegmentVoice = useCallback(
    async (index: number, personaId: string, params: Record<string, unknown>, clonedPersonas: ClonedPersonaItem[] = []) => {
      const seg = storyRef.current?.script?.segments[index];
      if (!seg) return;

      const paramsJson = JSON.stringify(params);
      const persona =
        getPersonaById(personaId) ||
        clonedPersonas.find((p: ClonedPersonaItem) => p.id === personaId || p.slug === personaId);
      const defaultAvatar = (() => {
        const avatars = persona?.avatars;
        if (!avatars || avatars.length === 0) return undefined;
        const normalized = avatars.map((a: string | { isDefault?: boolean; url?: string }) =>
          typeof a === "string" ? { isDefault: false, url: a } : a
        );
        return normalized.find((a) => a.isDefault)?.url || normalized[0]?.url;
      })();
      const avatarUrl = persona?.avatarUrl || defaultAvatar;

      setStory((prev) => {
        if (!prev?.script) return prev;
        const segments = [...prev.script.segments];
        const currentSeg = segments[index];

        let restoredAudio = null;
        let restoredVideo = null;
        let nextHistory = currentSeg.mediaHistory
          ? JSON.parse(currentSeg.mediaHistory as string)
          : [];
        const now = Date.now();
        nextHistory = nextHistory.filter((h: MediaHistoryEntry) => h.expiresAt && h.expiresAt > now);

        if (currentSeg.audioPath || currentSeg.presenterVideoPath) {
          nextHistory.push({
            personaId: currentSeg.personaId,
            audioPath: currentSeg.audioPath,
            presenterVideoPath: currentSeg.presenterVideoPath,
            expiresAt: now + 48 * 60 * 60 * 1000,
          });
        }

        const cachedIndex = nextHistory.findIndex((h: MediaHistoryEntry) => h.personaId === personaId);
        if (cachedIndex !== -1) {
          const cached = nextHistory.splice(cachedIndex, 1)[0];
          restoredAudio = cached.audioPath || null;
          restoredVideo = cached.presenterVideoPath || null;
        }

        segments[index] = {
          ...currentSeg,
          personaId,
          voiceParams: paramsJson,
          personaAvatarUrl: avatarUrl,
          audioPath: restoredAudio,
          presenterVideoPath: restoredVideo,
          presenterStatus: restoredVideo ? "done" : "pending",
          mediaHistory: JSON.stringify(nextHistory),
        };
        return { ...prev, script: { ...prev.script, segments } };
      });

      try {
        const res = await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: seg.id,
            personaId,
            voiceParams: paramsJson,
            personaAvatarUrl: avatarUrl,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (
            data.restoredAudioPath !== undefined ||
            data.restoredPresenterVideoPath !== undefined
          ) {
            setStory((prev) => {
              if (!prev?.script) return prev;
              const segments = [...prev.script.segments];
              segments[index] = {
                ...segments[index],
                audioPath: data.restoredAudioPath,
                presenterVideoPath: data.restoredPresenterVideoPath,
                presenterStatus: data.restoredPresenterVideoPath ? "done" : "pending",
              };
              return { ...prev, script: { ...prev.script, segments } };
            });
          }
        }
      } catch (e) {
        console.error("[useStoryEditor] Failed to update segment voice:", e);
      }
    },
    [storyId]
  );

  const updateSegmentAvatar = useCallback(
    async (index: number, avatarUrl: string) => {
      const seg = storyRef.current?.script?.segments[index];
      if (!seg) return;

      setStory((prev) => {
        if (!prev?.script) return prev;
        const segments = [...prev.script.segments];
        segments[index] = {
          ...segments[index],
          personaAvatarUrl: avatarUrl,
          presenterVideoPath: null,
          presenterStatus: "pending",
        };
        return { ...prev, script: { ...prev.script, segments } };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: seg.id,
            personaAvatarUrl: avatarUrl,
            presenterVideoPath: null,
            presenterStatus: "pending",
          }),
        });
      } catch (e) {
        console.error("[useStoryEditor] Failed to update avatar:", e);
      }
    },
    [storyId]
  );

  const updateSegmentActionLoop = useCallback(
    async (index: number, actionLoop: string) => {
      const seg = storyRef.current?.script?.segments[index];
      if (!seg) return;

      let ms: Record<string, unknown> = {};
      try {
        if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string);
      } catch {}
      ms.actionLoop = actionLoop;

      setStory((prev) => {
        if (!prev?.script) return prev;
        const segments = [...prev.script.segments];
        segments[index] = {
          ...segments[index],
          actionLoop,
          mediaSettings: JSON.stringify(ms),
        };
        return { ...prev, script: { ...prev.script, segments } };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: seg.id,
            mediaSettings: JSON.stringify(ms),
            actionLoop,
          }),
        });
      } catch (e) {
        console.error("[useStoryEditor] Failed to update action loop:", e);
      }
    },
    [storyId]
  );

  const updateSegmentCameraCue = useCallback(
    async (index: number, cameraCue: CameraCue) => {
      const seg = storyRef.current?.script?.segments[index];
      if (!seg) return;

      let ms: Record<string, unknown> = {};
      try {
        if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string);
      } catch {}
      ms.cameraCue = cameraCue;

      setStory((prev) => {
        if (!prev?.script) return prev;
        const segments = [...prev.script.segments];
        segments[index] = {
          ...segments[index],
          cameraCue,
          mediaSettings: JSON.stringify(ms),
        };
        return { ...prev, script: { ...prev.script, segments } };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update-segment",
            segmentId: seg.id,
            mediaSettings: JSON.stringify(ms),
            cameraCue,
          }),
        });
      } catch (e) {
        console.error("[useStoryEditor] Failed to update camera cue:", e);
      }
    },
    [storyId]
  );

  const reorderSegments = useCallback(
    async (newOrder: EditorSegment[]) => {
      let currentTime = 0;
      const timedSegments = newOrder.map((seg, idx) => {
        const duration = seg.endTime - seg.startTime;
        const s = {
          ...seg,
          index: idx,
          startTime: currentTime,
          endTime: currentTime + duration,
        };
        currentTime += duration;
        return s;
      });

      setStory((prev) => {
        if (!prev?.script) return prev;
        return { ...prev, script: { ...prev.script, segments: timedSegments } };
      });

      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reorder-segments",
            segments: timedSegments.map((s) => ({
              id: s.id,
              index: s.index,
              startTime: s.startTime,
              endTime: s.endTime,
            })),
          }),
        });
      } catch (e) {
        console.error("[useStoryEditor] Failed to reorder segments:", e);
      }
    },
    [storyId]
  );

  const deleteSegment = useCallback(
    async (segmentId: string) => {
      try {
        const res = await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "delete-segment", segmentId }),
        });

        if (res.ok) {
          await fetchStory();
        }
      } catch (e) {
        console.error("[useStoryEditor] Failed to delete segment:", e);
      }
    },
    [storyId, fetchStory]
  );

  const updateVideoSettings = useCallback(
    async (
      data: Partial<{
        aspectRatio: AspectRatio;
        bgMusicPath: string | null;
        bgMusicVolume: number;
        globalBgVideoPath: string | null;
        sloganId: string | null;
        outroId: string | null;
        voiceId: string | null;
        captionStyle: string | null;
      }>
    ) => {
      setStory((prev) => {
        if (!prev?.video) return prev;
        return { ...prev, video: { ...prev.video, ...data } };
      });

      if (data.aspectRatio) setAspectRatio(data.aspectRatio);

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
        console.error("[useStoryEditor] Failed to update video settings:", e);
      }
    },
    [storyId]
  );

  /**
   * Auto-choreographs the story's Action Loops & Camera Cues using Full-Mesh FSM.
   */
  const autoChoreographLoops = useCallback(
    async (options?: {
      domain?: BroadcastDomainType;
      personaId?: string;
      ambientIdleRatioTarget?: number;
    }) => {
      const segments = storyRef.current?.script?.segments;
      if (!segments || segments.length === 0) return;

      const totalDuration = segments.reduce((max, s) => Math.max(max, s.endTime), 0);
      const combinedScript = segments.map((s) => s.text).join(" ");
      const personaId = options?.personaId || segments[0]?.personaId || "ruby";
      const domain = options?.domain || "chroma_wall_standing";

      const planned = planBroadcastLoopSequence({
        totalDurationSeconds: Math.max(8, totalDuration),
        personaId,
        domain,
        scriptText: combinedScript,
        pacingConfig: options?.ambientIdleRatioTarget
          ? { ambientIdleRatioTarget: options.ambientIdleRatioTarget }
          : undefined,
      });

      // Apply choreographed beat to each scene
      const updated = segments.map((seg, idx) => {
        const beatNode =
          planned.sequence[idx % planned.sequence.length] || planned.sequence[0];
        let ms: Record<string, unknown> = {};
        try {
          if (seg.mediaSettings) ms = JSON.parse(seg.mediaSettings as string);
        } catch {}

        const actionLoop = beatNode.actionStateId || "state_idle";
        const cameraCue = beatNode.camera || "cam1_wide";
        ms.actionLoop = actionLoop;
        ms.cameraCue = cameraCue;

        return {
          ...seg,
          actionLoop,
          cameraCue,
          mediaSettings: JSON.stringify(ms),
        };
      });

      setStory((prev) => {
        if (!prev?.script) return prev;
        return { ...prev, script: { ...prev.script, segments: updated } };
      });

      // Persist to server
      try {
        await fetch(`/api/stories/${storyId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "batch-update-segments",
            segments: updated.map((seg) => ({
              id: seg.id,
              mediaSettings: seg.mediaSettings,
              actionLoop: seg.actionLoop,
              cameraCue: seg.cameraCue,
            })),
          }),
        });
      } catch (e) {
        console.error("[useStoryEditor] Failed to persist choreographed loops:", e);
      }

      return planned;
    },
    [storyId]
  );

  return {
    story,
    setStory,
    isLoading,
    aspectRatio,
    setAspectRatio,
    fetchStory,
    updateHeadline,
    updateText,
    updateMediaSettings,
    updateAsset,
    updateSegmentVoice,
    updateSegmentAvatar,
    updateSegmentActionLoop,
    updateSegmentCameraCue,
    reorderSegments,
    deleteSegment,
    updateVideoSettings,
    autoChoreographLoops,
  };
}
