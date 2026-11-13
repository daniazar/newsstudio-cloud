import { useState, useEffect, useCallback, useRef } from "react";
import type { AspectRatio, StudioSetId, PresenterConfig } from "@/lib/types";
import type { VideoBackdropConfig } from "@/lib/types/ecommerce";

export interface StorySegment {
  id: string;
  index: number;
  startTime: number;
  endTime: number;
  text: string;
  spokenText?: string | null;
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
  cameraCue?: string | null;
}

export interface StoryData {
  id: string;
  title: string;
  status: string;
  language?: string | null;
  description?: string | null;
  articleImageUrls?: string | null;
  feed: { name: string; groups?: unknown[] };
  script?: {
    headline: string;
    youtubeTitle?: string | null;
    youtubeDescription?: string | null;
    instagramCaption?: string | null;
    instagramHashtags?: string | null;
    segments: StorySegment[];
  };
  video?: {
    id: string;
    status: string;
    aspectRatio: string;
    youtubeTitle?: string | null;
    youtubeDescription?: string | null;
    instagramCaption?: string | null;
    instagramHashtags?: string | null;
    presenterVideoPath?: string | null;
    presenterAudioPath?: string | null;
    globalBgVideoPath?: string | null;
    bgMusicPath?: string | null;
    bgMusicVolume?: number | null;
    sloganId?: string | null;
    outroId?: string | null;
    captionStyle?: string | null;
    voiceId?: string | null;
    studioSetId?: string | null;
    renderProgress?: number;
  };
}

export interface UseStoryEditorStateOptions {
  storyId: string;
  toast: (title: string, message: string, type?: "success" | "error" | "info" | "warning") => void;
  setPresenterConfig: React.Dispatch<React.SetStateAction<PresenterConfig>>;
  setSelectedAttireId: React.Dispatch<React.SetStateAction<string>>;
  setAspectRatio: React.Dispatch<React.SetStateAction<AspectRatio>>;
  setStudioSetId: React.Dispatch<React.SetStateAction<StudioSetId>>;
  setGlobalBackdrop: React.Dispatch<React.SetStateAction<VideoBackdropConfig>>;
}

export function useStoryEditorState({
  storyId,
  toast,
  setPresenterConfig,
  setSelectedAttireId,
  setAspectRatio,
  setStudioSetId,
  setGlobalBackdrop,
}: UseStoryEditorStateOptions) {
  const [story, setStoryState] = useState<StoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [undoStack, setUndoStack] = useState<StoryData[]>([]);
  const [redoStack, setRedoStack] = useState<StoryData[]>([]);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleEditValue, setTitleEditValue] = useState("");

  const storyRef = useRef<StoryData | null>(story);
  useEffect(() => {
    storyRef.current = story;
  }, [story]);

  // Wrapper around setStory to keep track of undo history
  const setStory = useCallback((updater: StoryData | null | ((prev: StoryData | null) => StoryData | null), recordUndo = true) => {
    setStoryState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (recordUndo && prev && next && prev !== next) {
        setUndoStack((uPrev) => [...uPrev, prev]);
        setRedoStack([]);
      }
      return next;
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !story) return;
    const prevStory = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [story, ...prev]);
    setStoryState(prevStory);
  }, [undoStack, story]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !story) return;
    const nextStory = redoStack[0];
    setRedoStack((prev) => prev.slice(1));
    setUndoStack((prev) => [...prev, story]);
    setStoryState(nextStory);
  }, [redoStack, story]);

  const handleSaveTakeSnapshot = useCallback(() => {
    if (!story?.script) return;
    toast("Snapshot Saved", "Story Snapshot saved as Take B! You can experiment with zero data loss.", "success");
  }, [story, toast]);

  const fetchStory = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/stories/${storyId}`);
      if (res.ok) {
        const data: StoryData = await res.json();
        setStoryState(data);
        setTitleEditValue(data.title || "");

        const firstSeg = data.script?.segments?.[0];
        if (firstSeg) {
          let firstMs: Record<string, unknown> = {};
          try {
            if (firstSeg.mediaSettings) {
              firstMs = typeof firstSeg.mediaSettings === "string" ? JSON.parse(firstSeg.mediaSettings) : firstSeg.mediaSettings;
            }
          } catch {}

          const segPersona = firstSeg.personaId || "ruby";
          const segAvatar = firstSeg.personaAvatarUrl;
          const segLayout = firstMs.layoutMode || "full_screen";

          setPresenterConfig((prev: PresenterConfig) => ({
            ...prev,
            personaId: segPersona,
            avatarSrc: segAvatar || prev.avatarSrc,
            layoutMode: (segLayout as PresenterConfig["layoutMode"]) || "full_screen",
            scale: typeof (firstMs.presenterScale ?? firstMs.scale) === "number" ? ((firstMs.presenterScale ?? firstMs.scale) as number) : 1.0,
            offsetX: typeof firstMs.presenterOffsetX === "number" ? firstMs.presenterOffsetX : 0,
            offsetY: typeof firstMs.presenterOffsetY === "number" ? firstMs.presenterOffsetY : 0,
          }));
          if (segAvatar) {
            setSelectedAttireId(segAvatar);
          }
        }
        if (data.video?.aspectRatio) {
          setAspectRatio(data.video.aspectRatio as AspectRatio);
        }
        if (data.video?.studioSetId) {
          setStudioSetId(data.video.studioSetId as StudioSetId);
          setGlobalBackdrop((prev: VideoBackdropConfig) => ({
            ...prev,
            studioBackgroundId: data.video?.studioSetId || undefined,
            customImageUrl: data.video?.globalBgVideoPath || undefined,
          }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch story:", e);
    } finally {
      setIsLoading(false);
    }
  }, [storyId, setPresenterConfig, setSelectedAttireId, setAspectRatio, setStudioSetId, setGlobalBackdrop]);

  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  const handleSaveTitle = useCallback(async (newTitle: string) => {
    if (!story || !newTitle.trim()) return;
    setStory((prev) => prev ? { ...prev, title: newTitle } : prev);
    setIsEditingTitle(false);
    try {
      await fetch(`/api/stories/${storyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle }),
      });
      toast("Title Updated", "Story title saved successfully.", "success");
    } catch {
      toast("Error", "Failed to save title", "error");
    }
  }, [story, storyId, setStory, toast]);

  return {
    story,
    setStory,
    storyRef,
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
    fetchStory,
  };
}
