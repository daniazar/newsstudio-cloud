/**
 * src/components/editor/shared/hooks/usePlayerTransport.ts
 *
 * Headless Remotion Player Transport Controller.
 * Manages frame seeking, play/pause, timecode formatting, and J/K/L keyboard shuttle.
 */

import { useState, useCallback, useEffect, RefObject } from "react";
import type { PlayerRef } from "@remotion/player";

export interface UsePlayerTransportOptions {
  fps?: number;
  totalFrames: number;
  playerRef?: RefObject<PlayerRef | null>;
  enableKeyboardShortcuts?: boolean;
}

export interface UsePlayerTransportReturn {
  currentFrame: number;
  setCurrentFrame: (frame: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  timecode: string;
  totalDurationTimecode: string;
  progressPercent: number;
  togglePlay: () => void;
  play: () => void;
  pause: () => void;
  seekTo: (frame: number) => void;
  stepForward: (deltaFrames?: number) => void;
  stepBackward: (deltaFrames?: number) => void;
  replay: () => void;
}

export function formatTimecode(frame: number, fps = 30): string {
  const totalSeconds = Math.floor(frame / fps);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const frames = Math.floor(frame % fps);

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  const ff = String(frames).padStart(2, "0");

  return `${mm}:${ss}:${ff}`;
}

export function usePlayerTransport({
  fps = 30,
  totalFrames,
  playerRef,
  enableKeyboardShortcuts = true,
}: UsePlayerTransportOptions): UsePlayerTransportReturn {
  const [currentFrame, setCurrentFrameState] = useState<number>(0);
  const [isPlaying, setIsPlayingState] = useState<boolean>(false);

  const seekTo = useCallback(
    (frame: number) => {
      const clamped = Math.max(0, Math.min(totalFrames - 1, Math.round(frame)));
      setCurrentFrameState(clamped);
      if (playerRef?.current) {
        playerRef.current.seekTo(clamped);
      }
    },
    [totalFrames, playerRef]
  );

  const play = useCallback(() => {
    setIsPlayingState(true);
    if (playerRef?.current) {
      playerRef.current.play();
    }
  }, [playerRef]);

  const pause = useCallback(() => {
    setIsPlayingState(false);
    if (playerRef?.current) {
      playerRef.current.pause();
    }
  }, [playerRef]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const stepForward = useCallback(
    (deltaFrames = 1) => {
      seekTo(currentFrame + deltaFrames);
    },
    [currentFrame, seekTo]
  );

  const stepBackward = useCallback(
    (deltaFrames = 1) => {
      seekTo(currentFrame - deltaFrames);
    },
    [currentFrame, seekTo]
  );

  const replay = useCallback(() => {
    seekTo(0);
    play();
  }, [seekTo, play]);

  // Sync state when Remotion Player emits timeupdate
  useEffect(() => {
    const player = playerRef?.current;
    if (!player) return;

    const onTimeUpdate = () => {
      const frame = player.getCurrentFrame();
      setCurrentFrameState(frame);
    };

    const onPlay = () => setIsPlayingState(true);
    const onPause = () => setIsPlayingState(false);

    player.addEventListener("timeupdate", onTimeUpdate);
    player.addEventListener("play", onPlay);
    player.addEventListener("pause", onPause);

    return () => {
      player.removeEventListener("timeupdate", onTimeUpdate);
      player.removeEventListener("play", onPlay);
      player.removeEventListener("pause", onPause);
    };
  }, [playerRef]);

  // Keyboard Shortcuts (Space to play/pause, J/K/L shuttle, Left/Right arrow step)
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "j" || e.key === "J") {
        e.preventDefault();
        stepBackward(fps); // Step back 1 second
      } else if (e.key === "k" || e.key === "K") {
        e.preventDefault();
        pause();
      } else if (e.key === "l" || e.key === "L") {
        e.preventDefault();
        stepForward(fps); // Step forward 1 second
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepBackward(e.shiftKey ? fps : 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        stepForward(e.shiftKey ? fps : 1);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enableKeyboardShortcuts, togglePlay, stepBackward, stepForward, pause, fps]);

  const timecode = formatTimecode(currentFrame, fps);
  const totalDurationTimecode = formatTimecode(totalFrames, fps);
  const progressPercent = totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0;

  return {
    currentFrame,
    setCurrentFrame: seekTo,
    isPlaying,
    setIsPlaying: (p: boolean) => (p ? play() : pause()),
    timecode,
    totalDurationTimecode,
    progressPercent,
    togglePlay,
    play,
    pause,
    seekTo,
    stepForward,
    stepBackward,
    replay,
  };
}
