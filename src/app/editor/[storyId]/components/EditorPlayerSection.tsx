"use client";

import React, { useState, useCallback } from "react";
import { VideoPlayer } from "@/components/player/VideoPlayer";
import { SceneTrack } from "@/components/editor/SceneTrack";
import type { CompositionProps } from "@/lib/types";

interface EditorPlayerSectionProps {
  compositionProps: CompositionProps;
  trackSegments: React.ComponentProps<typeof SceneTrack>["segments"];
  totalDuration: number;
  selectedSceneIndex: number | null;
  seekFrame?: number | { frame: number; nonce: number };
  missingAudioSegments: number[];
  onSelectScene: (index: number | null) => void;
  onDropAsset: (index: number, file: File) => void;
  onPan?: (dx: number, dy: number) => void;
  onPanEnd?: () => void;
  fps?: number;
}

export const EditorPlayerSection: React.FC<EditorPlayerSectionProps> = ({
  compositionProps,
  trackSegments,
  totalDuration,
  selectedSceneIndex,
  seekFrame,
  missingAudioSegments,
  onSelectScene,
  onDropAsset,
  onPan,
  onPanEnd,
  fps = 30,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [wasPlayingBeforeDrag, setWasPlayingBeforeDrag] = useState(false);
  const [internalSeekFrame, setInternalSeekFrame] = useState<number | { frame: number; nonce: number } | undefined>(seekFrame);

  // Sync external seek frame when it changes
  React.useEffect(() => {
    if (seekFrame !== undefined) {
      setInternalSeekFrame(seekFrame);
    }
  }, [seekFrame]);

  const handleFrameUpdate = useCallback((frame: number) => {
    setCurrentFrame(frame);
  }, []);

  const handleSeek = useCallback(
    (time: number) => {
      const frame = Math.round(time * fps);
      setInternalSeekFrame(frame);
    },
    [fps]
  );

  const handleDragStart = useCallback(() => {
    setWasPlayingBeforeDrag(isPlaying);
  }, [isPlaying]);

  const handleDragEnd = useCallback(() => {
    if (wasPlayingBeforeDrag) {
      setIsPlaying(true);
    }
  }, [wasPlayingBeforeDrag]);

  return (
    <div className="flex-1 min-w-0 flex flex-col border-r border-border">
      {/* Video Player Box */}
      <div className="flex-1 flex items-center justify-center p-6 bg-black/30 overflow-hidden relative">
        <VideoPlayer
          compositionProps={compositionProps}
          onFrameUpdate={handleFrameUpdate}
          seekToFrame={internalSeekFrame}
          playing={isPlaying}
          onPlayingChange={setIsPlaying}
          missingAudioSegments={missingAudioSegments}
          isPanEnabled={selectedSceneIndex !== null}
          onPan={onPan}
          onPanEnd={onPanEnd}
        />
      </div>

      {/* Timeline Track */}
      <div className="h-36 p-4 bg-surface border-t border-border">
        <SceneTrack
          segments={trackSegments}
          totalDuration={totalDuration}
          selectedIndex={selectedSceneIndex}
          onSelectScene={onSelectScene}
          onDropAsset={onDropAsset}
          onSeek={handleSeek}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          currentFrame={currentFrame}
          fps={fps}
        />
      </div>
    </div>
  );
};
