import { useEffect, useCallback } from "react";
import type { StoryData, StorySegment } from "./useStoryEditorState";

export interface UseEditorShortcutsAndTransportOptions {
  currentFrame: number;
  setCurrentFrame: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedSceneIndex: React.Dispatch<React.SetStateAction<number | null>>;
  setSeekTarget: React.Dispatch<React.SetStateAction<number | { frame: number; nonce: number } | undefined>>;
  setShowShortcutsModal: React.Dispatch<React.SetStateAction<boolean>>;
  handleUndo: () => void;
  handleRedo: () => void;
  story: StoryData | null;
  timelineSegments: StorySegment[];
  handleSplitSceneRef: React.MutableRefObject<((index: number) => void) | null>;
}

export function useEditorShortcutsAndTransport({
  currentFrame,
  setCurrentFrame,
  isPlaying: _isPlaying,
  setIsPlaying,
  setSelectedSceneIndex,
  setSeekTarget,
  setShowShortcutsModal,
  handleUndo,
  handleRedo,
  story,
  timelineSegments,
  handleSplitSceneRef,
}: UseEditorShortcutsAndTransportOptions) {
  const handleSeek = useCallback((time: number) => {
    const frame = Math.round(time * 30);
    setCurrentFrame(frame);
    setSeekTarget({ frame, nonce: Date.now() + Math.random() });
  }, [setCurrentFrame, setSeekTarget]);

  const handleFrameUpdate = useCallback((frame: number) => {
    setCurrentFrame(frame);
  }, [setCurrentFrame]);

  const handleDragStart = useCallback(() => {
    setIsPlaying(false);
  }, [setIsPlaying]);

  const handleDragEnd = useCallback(() => {
    // No-op or resume playback if needed
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        const newF = Math.max(0, currentFrame - 60);
        setCurrentFrame(newF);
        setSeekTarget({ frame: newF, nonce: Date.now() + Math.random() });
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        setIsPlaying(false);
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        const newF = currentFrame + 60;
        setCurrentFrame(newF);
        setSeekTarget({ frame: newF, nonce: Date.now() + Math.random() });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const delta = e.shiftKey ? 30 : 1;
        const newF = Math.max(0, currentFrame - delta);
        setCurrentFrame(newF);
        setSeekTarget({ frame: newF, nonce: Date.now() + Math.random() });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const delta = e.shiftKey ? 30 : 1;
        const newF = currentFrame + delta;
        setCurrentFrame(newF);
        setSeekTarget({ frame: newF, nonce: Date.now() + Math.random() });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSceneIndex((prev) => {
          const next = prev !== null && prev > 0 ? prev - 1 : 0;
          const target = timelineSegments.find((s) => s.index === next);
          if (target) handleSeek(target.startTime);
          return next;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSceneIndex((prev) => {
          const next = prev !== null && prev < timelineSegments.length - 1 ? prev + 1 : prev === null ? 0 : prev;
          const target = timelineSegments.find((s) => s.index === next);
          if (target) handleSeek(target.startTime);
          return next;
        });
      } else if (e.key === "d" || e.key === "D") {
        e.preventDefault();
        setSelectedSceneIndex(null);
      } else if (e.key === "s" || e.key === "S") {
        if (!e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const curTime = currentFrame / 30;
          const segToSplit = story?.script?.segments?.find(
            (s: { startTime?: number; endTime?: number }) => s && curTime >= (s.startTime ?? 0) && curTime <= (s.endTime ?? (s.startTime ?? 0) + 4)
          );
          if (segToSplit) {
            handleSplitSceneRef.current?.(segToSplit.index);
          }
        }
      } else if (e.key === "?") {
        e.preventDefault();
        setShowShortcutsModal((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    currentFrame,
    handleRedo,
    handleUndo,
    handleSeek,
    handleSplitSceneRef,
    setCurrentFrame,
    setIsPlaying,
    setSeekTarget,
    setSelectedSceneIndex,
    setShowShortcutsModal,
    story?.script?.segments,
    timelineSegments,
  ]);

  return {
    handleSeek,
    handleFrameUpdate,
    handleDragStart,
    handleDragEnd,
  };
}
