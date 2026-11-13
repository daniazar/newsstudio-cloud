import React from "react";
import { AbsoluteFill, OffthreadVideo } from "remotion";
import type { RemotionSegment } from "@/lib/types";

interface PrerenderedClipLayerProps {
  currentSegment: RemotionSegment | null;
}

export const PrerenderedClipLayer: React.FC<PrerenderedClipLayerProps> = ({ currentSegment }) => {
  if (!currentSegment || currentSegment.bRollType !== "prerendered_clip" || !currentSegment.bRollSrc) {
    return null;
  }

  // Pre-rendered clips from other stories have a 3s intro (90 frames at 30fps) 
  // and a ~4s outro (120 frames). We want to trim those so we only show the core story.
  const startTrimFrames = 90; // Skip intro
  
  // startFrom is expected in milliseconds or frames, wait, Video component uses frames for startFrom if it's a number.
  // Let's check Remotion docs: startFrom={number of frames}.
  // We'll pass the exact frames.
  
  // Calculate when we should stop this video
  const durationInFrames = currentSegment.endFrame - currentSegment.startFrame;
  const endAtFrames = startTrimFrames + durationInFrames;

  // Render video full screen
  return (
    <AbsoluteFill style={{ zIndex: 50, backgroundColor: "#000" }}>
      <OffthreadVideo 
        src={currentSegment.bRollSrc} 
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
        startFrom={startTrimFrames}
        endAt={endAtFrames}
      />
    </AbsoluteFill>
  );
};
