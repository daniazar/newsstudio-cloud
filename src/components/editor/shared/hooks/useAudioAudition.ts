/**
 * src/components/editor/shared/hooks/useAudioAudition.ts
 *
 * Single-Instance HTML5 Audio Audition Hook.
 * Ensures only one preview track or voice sample plays at any time,
 * preventing overlapping audio chaos and cleaning up on unmount.
 */

import { useState, useRef, useEffect, useCallback } from "react";

export interface UseAudioAuditionReturn {
  activeUrl: string | null;
  isPlaying: boolean;
  playAudition: (url: string, volume?: number) => void;
  stopAudition: () => void;
  toggleAudition: (url: string, volume?: number) => void;
  // Aliases
  audition: (url: string, volume?: number) => void;
  stop: () => void;
}

export function useAudioAudition(): UseAudioAuditionReturn {
  const [activeUrl, setActiveUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioBlobUrlCache = useRef<Map<string, string>>(new Map());

  // Cleanup on component unmount
  useEffect(() => {
    const cacheMap = audioBlobUrlCache.current;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      // Revoke any created object URLs to free browser memory
      cacheMap.forEach((objectUrl) => {
        URL.revokeObjectURL(objectUrl);
      });
      cacheMap.clear();
    };
  }, []);

  const stopAudition = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setActiveUrl(null);
  }, []);

  const playAudition = useCallback(async (url: string, volume = 0.5) => {
    if (!url) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    audio.pause();

    // Check if we already cached a local Blob URL for this audio track
    let targetSrc = url;
    if (audioBlobUrlCache.current.has(url)) {
      targetSrc = audioBlobUrlCache.current.get(url)!;
    } else if (typeof window !== "undefined" && typeof fetch !== "undefined") {
      // Background cache fetch for instant subsequent auditions
      fetch(url)
        .then((res) => {
          if (res.ok) return res.blob();
          throw new Error("Failed to fetch audio sample");
        })
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          audioBlobUrlCache.current.set(url, blobUrl);
        })
        .catch(() => {
          // Silent fallback to standard direct HTTP streaming
        });
    }

    audio.src = targetSrc;
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.loop = false;

    audio.onended = () => {
      setIsPlaying(false);
      setActiveUrl(null);
    };

    audio.onerror = () => {
      setIsPlaying(false);
      setActiveUrl(null);
    };

    audio.play().then(() => {
      setIsPlaying(true);
      setActiveUrl(url);
    }).catch(() => {
      setIsPlaying(false);
      setActiveUrl(null);
    });
  }, []);

  const toggleAudition = useCallback((url: string, volume = 0.5) => {
    if (isPlaying && activeUrl === url) {
      stopAudition();
    } else {
      playAudition(url, volume);
    }
  }, [isPlaying, activeUrl, playAudition, stopAudition]);

  return {
    activeUrl,
    isPlaying,
    playAudition,
    stopAudition,
    toggleAudition,
    audition: playAudition,
    stop: stopAudition,
  };
}
