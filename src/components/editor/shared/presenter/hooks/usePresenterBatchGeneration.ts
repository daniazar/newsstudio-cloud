/**
 * src/components/editor/shared/presenter/hooks/usePresenterBatchGeneration.ts
 *
 * Hook managing scene video generation, image variation generation,
 * batch queue sequencing, IndexedDB caching, and file downloads.
 */

import { useState, useCallback, useMemo } from "react";
import { usePresenterCache } from "@/lib/hooks/usePresenterCache";
import { getPersonaById } from "@/lib/tts/personas";
import { resolveStorageUrl } from "@/lib/storage/storageUtils";
import { useToast } from "@/components/global/ToastContainer";
import { ModelSize, Segment, PresenterTtsClient } from "../types";

interface UsePresenterBatchGenerationProps {
  validSegments: Segment[];
  storyId: string;
  selectedModel: ModelSize;
  batchState: {
    generatingIds: Set<string>;
    setGeneratingIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    generationMessages: Record<string, string>;
    setGenerationMessages: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    startBatch: (total: number) => void;
    updateProgress: (done: number, title: string, message: string, progress?: number) => void;
    finishBatch: () => void;
    done: number;
    [key: string]: unknown;
  };
  tts?: PresenterTtsClient;
  onVideoGenerated?: (segmentId: string, videoUrl: string) => void;
  onUpdateSegmentAvatar: (index: number, url: string) => void;
}

export function usePresenterBatchGeneration({
  validSegments,
  storyId,
  selectedModel,
  batchState,
  tts,
  onVideoGenerated,
  onUpdateSegmentAvatar,
}: UsePresenterBatchGenerationProps) {
  const { toast } = useToast();
  const segmentIds = useMemo(() => validSegments.map((s) => s.id), [validSegments]);
  const presenterCache = usePresenterCache(segmentIds);

  const [generatingIds, setGeneratingIds] = [
    batchState.generatingIds,
    batchState.setGeneratingIds,
  ];
  const [generationMessages, setGenerationMessages] = [
    batchState.generationMessages,
    batchState.setGenerationMessages,
  ];

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generatingImages, setGeneratingImages] = useState<Set<string>>(new Set());

  // ── Generate a single scene ──────────────────────────────────
  const generateScene = useCallback(
    async (seg: Segment, isInternalBatch = false) => {
      if (generatingIds.has(seg.id)) return;

      if (!isInternalBatch) {
        batchState.startBatch(1);
        batchState.updateProgress(0, `Scene ${seg.index + 1}`, "Initializing...");
      }

      setGeneratingIds((prev) => new Set(prev).add(seg.id));
      setErrors((prev) => {
        const n = { ...prev };
        delete n[seg.id];
        return n;
      });
      presenterCache.setSceneStatus(seg.id, { status: "generating", startedAt: Date.now() });

      try {
        const personaId = seg.personaId || "ruby";
        const persona =
          getPersonaById(personaId) ||
          tts?.clonedPersonas?.find((p: { id: string }) => p.id === personaId);
        const avatarUrl = seg.personaAvatarUrl || persona?.avatarUrl;

        let actionLoopName = seg.actionLoop;
        if (!actionLoopName && seg.mediaSettings) {
          try {
            actionLoopName = JSON.parse(seg.mediaSettings).actionLoop;
          } catch {}
        }

        const res = await fetch("/api/presenter/generate-scene", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            segmentId: seg.id,
            storyId,
            model: selectedModel,
            personaId,
            avatarUrl,
            actionLoop: actionLoopName,
          }),
        });

        if (!res.body) throw new Error("No response stream");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line);

              if (event.error) {
                throw new Error(event.error);
              }

              if (event.message) {
                setGenerationMessages((prev) => ({ ...prev, [seg.id]: event.message }));
                batchState.updateProgress(
                  batchState.done,
                  `Scene ${seg.index + 1}`,
                  event.message,
                  event.progress
                );
              }

              if (event.status === "done" && event.presenterVideoPath) {
                const videoRes = await fetch(event.presenterVideoPath);
                if (videoRes.ok) {
                  const blob = await videoRes.blob();
                  await presenterCache.saveVideo(seg.id, blob);
                }
                onVideoGenerated?.(seg.id, event.presenterVideoPath);
              }
            } catch (parseErr: unknown) {
              const pErr = parseErr as Error;
              if (pErr?.message && pErr.message !== "Unexpected end of JSON input") {
                throw parseErr;
              }
            }
          }
        }
      } catch (err: unknown) {
        const errorObj = err as Error;
        const errMessage = errorObj?.message ?? "Generation failed";
        presenterCache.setSceneStatus(seg.id, {
          status: "error",
          errorMessage: errMessage,
        });
        setErrors((prev) => ({ ...prev, [seg.id]: errMessage }));
      } finally {
        setGeneratingIds((prev) => {
          const n = new Set(prev);
          n.delete(seg.id);
          return n;
        });
        setGenerationMessages((prev) => {
          const n = { ...prev };
          delete n[seg.id];
          return n;
        });
        if (!isInternalBatch) batchState.finishBatch();
      }
    },
    [
      generatingIds,
      presenterCache,
      storyId,
      selectedModel,
      onVideoGenerated,
      batchState,
      tts,
      setGeneratingIds,
      setGenerationMessages,
    ]
  );

  // ── Generate a single image variation ────────────────────────
  const generateImageOnly = useCallback(
    async (seg: Segment) => {
      if (generatingImages.has(seg.id)) return;

      setGeneratingImages((prev) => new Set(prev).add(seg.id));
      setErrors((prev) => {
        const n = { ...prev };
        delete n[seg.id];
        return n;
      });
      setGenerationMessages((prev) => ({
        ...prev,
        [seg.id]: "Initializing ComfyUI...",
      }));

      try {
        const personaId = seg.personaId || "ruby";
        const persona =
          getPersonaById(personaId) ||
          tts?.clonedPersonas?.find((p: { id: string }) => p.id === personaId);
        const avatarUrl = seg.personaAvatarUrl || persona?.avatarUrl;

        const res = await fetch("/api/presenter/generate-scene", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            segmentId: seg.id,
            storyId,
            onlyGenerateImage: true,
            avatarUrl,
          }),
        });

        if (!res.body) throw new Error("No response stream");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line);

              if (event.error) {
                throw new Error(event.error);
              }

              if (event.message) {
                setGenerationMessages((prev) => ({
                  ...prev,
                  [seg.id]: event.message,
                }));
              }

              if (event.status === "done" && event.personaAvatarUrl) {
                onUpdateSegmentAvatar(seg.index, event.personaAvatarUrl);
              }
            } catch {
              // Ignore partial parse
            }
          }
        }
      } catch (err: unknown) {
        const errorObj = err as Error;
        const errMessage = errorObj?.message ?? "Image generation failed";
        setErrors((prev) => ({
          ...prev,
          [seg.id]: errMessage,
        }));
      } finally {
        setGeneratingImages((prev) => {
          const n = new Set(prev);
          n.delete(seg.id);
          return n;
        });
        setGenerationMessages((prev) => {
          const n = { ...prev };
          delete n[seg.id];
          return n;
        });
      }
    },
    [generatingImages, storyId, onUpdateSegmentAvatar, tts, setGenerationMessages]
  );

  // ── Download Helper ──────────────────────────────────────────
  const handleDownload = useCallback(async (path: string, filename: string) => {
    try {
      const resolved = resolveStorageUrl(path);
      const url = `${resolved}${resolved.includes("?") ? "&" : "?"}t=${Date.now()}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch file");

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Download failed:", err);
      toast("Download Failed", "Failed to download file. It might not be ready yet.", "error");
    }
  }, [toast]);

  // ── Generate all scenes that have audio (with optional forceAll) ────────
  const generateAll = useCallback(
    async (forceAll = false) => {
      const toGenerate = validSegments.filter((s) => {
        const cacheState = presenterCache.getSceneState(s.id);
        if (forceAll) {
          return (
            s.audioPath &&
            cacheState.status !== "generating" &&
            !generatingIds.has(s.id)
          );
        }
        return (
          s.audioPath &&
          cacheState.status !== "done" &&
          cacheState.status !== "cached" &&
          cacheState.status !== "generating" &&
          !generatingIds.has(s.id)
        );
      });

      if (toGenerate.length === 0) return;

      batchState.startBatch(toGenerate.length);

      let completed = 0;
      for (const seg of toGenerate) {
        batchState.updateProgress(completed, `Scene ${seg.index + 1}`, "Starting...");
        await generateScene(seg, true);
        completed++;
        batchState.updateProgress(completed, `Scene ${seg.index + 1}`, "Complete");
      }

      batchState.finishBatch();
    },
    [validSegments, presenterCache, generatingIds, generateScene, batchState]
  );

  const doneCount = useMemo(
    () =>
      validSegments.filter((s) => {
        const state = presenterCache.getSceneState(s.id);
        return state.status === "done" || state.status === "cached";
      }).length,
    [validSegments, presenterCache]
  );

  const audioCount = useMemo(
    () => validSegments.filter((s) => s.audioPath).length,
    [validSegments]
  );

  const isAnyGenerating = generatingIds.size > 0;

  return {
    presenterCache,
    generatingIds,
    generatingImages,
    errors,
    generationMessages,
    generateScene,
    generateImageOnly,
    generateAll,
    handleDownload,
    doneCount,
    audioCount,
    isAnyGenerating,
  };
}
