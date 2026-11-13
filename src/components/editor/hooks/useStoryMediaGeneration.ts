import { useState, useCallback, useRef } from "react";
import type { StoryData } from "./useStoryEditorState";
import type { UseModernTtsReturn } from "@/lib/tts/useModernTts";
import type { PresenterConfig } from "@/lib/types";

export interface UseStoryMediaGenerationOptions {
  storyId: string;
  story: StoryData | null;
  setStory: (updater: StoryData | null | ((prev: StoryData | null) => StoryData | null), recordUndo?: boolean) => void;
  toast: (title: string, message: string, type?: "success" | "error" | "info" | "warning") => void;
  tts: UseModernTtsReturn;
  setAudioTimestamp: React.Dispatch<React.SetStateAction<number>>;
  presenterConfig: PresenterConfig;
}

export function useStoryMediaGeneration({
  storyId,
  story,
  setStory,
  toast,
  tts,
  setAudioTimestamp,
  presenterConfig,
}: UseStoryMediaGenerationOptions) {
  const [isAutoDirecting, setIsAutoDirecting] = useState(false);
  const sceneBlobMapRef = useRef<Record<number, Blob>>({});
  const sceneBlobTextMapRef = useRef<Record<number, string>>({});

  const handlePlaySceneAudio = useCallback(async (segmentIndex: number, textOverride?: string) => {
    const segments = story?.script?.segments || [];
    const seg = segments.find((s) => s.index === segmentIndex);
    const textToUse = textOverride?.trim() || seg?.spokenText || seg?.text;
    if (!textToUse) return;

    const cachedBlob = sceneBlobMapRef.current[segmentIndex];
    const cachedText = sceneBlobTextMapRef.current[segmentIndex];
    if (cachedBlob && cachedText === textToUse) {
      tts.previewAudio(cachedBlob);
      return;
    }

    if (tts.modelStatus !== "ready") return;
    const personaId = seg?.personaId || "ruby";
    const blob = await tts.generateAudio(`scene-${segmentIndex}`, textToUse, personaId, { bypassCache: true });
    if (blob) {
      sceneBlobMapRef.current[segmentIndex] = blob;
      sceneBlobTextMapRef.current[segmentIndex] = textToUse;
      tts.previewAudio(blob);
    }
  }, [story?.script?.segments, tts]);

  const handleAudioGenerated = useCallback(async (index: number, blob: Blob) => {
    sceneBlobMapRef.current[index] = blob;
    try {
      const formData = new FormData();
      formData.append("audio", blob, `segment_${index}.wav`);
      formData.append("segmentIndex", index.toString());

      const res = await fetch(`/api/stories/${storyId}/audio`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setStory((prev) => {
          if (!prev?.script?.segments) return prev;
          const updated = [...prev.script.segments];
          if (updated[index]) {
            updated[index] = { ...updated[index], audioPath: data.audioPath };
          }
          return { ...prev, script: { ...prev.script, segments: updated } };
        });
        setAudioTimestamp(Date.now());
        toast("Audio Uploaded", `Scene ${index + 1} audio saved successfully.`, "success");
      }
    } catch (e) {
      console.error("Failed to upload generated audio:", e);
      toast("Audio Upload Failed", `Could not save audio for Scene ${index + 1}.`, "error");
    }
  }, [storyId, setStory, setAudioTimestamp, toast]);

  const handleGenerateLipSyncForScene = useCallback(async (
    sceneIndex: number,
    textToUse: string,
    audioPath?: string,
    overrides?: { engine?: string; model?: string; personaId?: string; attireId?: string }
  ) => {
    toast("Generation Queued", `Submitted presenter video job for Scene ${sceneIndex + 1}...`, "info");
    try {
      const seg = story?.script?.segments?.[sceneIndex];
      const res = await fetch("/api/presenter/generate-scene", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storyId,
          sceneIndex,
          text: textToUse,
          audioPath: audioPath || seg?.audioPath,
          personaId: overrides?.personaId || seg?.personaId || presenterConfig.personaId || "ruby",
          attireId: overrides?.attireId || seg?.personaAvatarUrl,
          engine: overrides?.engine,
          model: overrides?.model,
        }),
      });

      if (res.ok) {
        toast("Presenter Generated", `Lip-sync video ready for Scene ${sceneIndex + 1}!`, "success");
        const refreshed = await fetch(`/api/stories/${storyId}`).then((r) => r.json());
        if (refreshed) setStory(refreshed);
      } else {
        const err = await res.json();
        toast("Generation Failed", err.error || "Failed to generate presenter video.", "error");
      }
    } catch {
      toast("Generation Error", "Network or server error during presenter generation.", "error");
    }
  }, [storyId, story?.script?.segments, presenterConfig.personaId, setStory, toast]);

  const handleGenerateAllPresenterVideos = useCallback(async () => {
    const segs = story?.script?.segments || [];
    toast("Batch Presenter Generation", `Queueing ${segs.length} presenter scenes...`, "info");
    for (const seg of segs) {
      const textToUse = seg.spokenText || seg.text;
      if (textToUse) {
        await handleGenerateLipSyncForScene(seg.index, textToUse, seg.audioPath || undefined);
      }
    }
  }, [story?.script?.segments, handleGenerateLipSyncForScene, toast]);

  const handleMagicAutoDirect = useCallback(async () => {
    setIsAutoDirecting(true);
    toast("Auto-Director Active", "Analyzing story script to assign optimal action loops, camera cues & transitions...", "info");
    try {
      const res = await fetch(`/api/stories/${storyId}/auto-direct`, { method: "POST" });
      if (res.ok) {
        const freshStory = await fetch(`/api/stories/${storyId}`).then((r) => r.json());
        setStory(freshStory);
        toast("Auto-Directing Complete", "Action loops, camera cues, and transitions updated!", "success");
      } else {
        toast("Auto-Directing Failed", "Could not execute magic auto-direction.", "error");
      }
    } catch {
      toast("Auto-Directing Error", "An error occurred during auto-direction.", "error");
    } finally {
      setIsAutoDirecting(false);
    }
  }, [storyId, setStory, toast]);

  const handleAutoMatchAllBRoll = useCallback(async () => {
    toast("B-Roll Matcher Active", "Matching stock & AI B-Roll visuals for all scenes...", "info");
    try {
      const res = await fetch(`/api/stories/${storyId}/auto-broll`, { method: "POST" });
      if (res.ok) {
        const refreshed = await fetch(`/api/stories/${storyId}`).then((r) => r.json());
        setStory(refreshed);
        toast("B-Roll Matched", "All scenes mapped with optimal B-Roll visuals!", "success");
      }
    } catch {
      toast("B-Roll Match Failed", "Could not auto-match B-Roll visuals.", "error");
    }
  }, [storyId, setStory, toast]);

  return {
    isAutoDirecting,
    sceneBlobMapRef,
    sceneBlobTextMapRef,
    handlePlaySceneAudio,
    handleAudioGenerated,
    handleGenerateLipSyncForScene,
    handleGenerateAllPresenterVideos,
    handleMagicAutoDirect,
    handleAutoMatchAllBRoll,
  };
}
