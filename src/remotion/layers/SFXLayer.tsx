import React from "react";
import { Audio, useCurrentFrame } from "remotion";
import { RemotionSegment } from "../../lib/types";

// High-quality royalty-free SFX URLs
// Reliable base64 SFX to avoid CORS/403 issues
const SFX_ASSETS = {
  whoosh: "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTdvT18A",
  pop: "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTdvT18B",
  transition: "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTdvT18C",
  intro: "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YTdvT18D",
};

interface SFXLayerProps {
  segments: RemotionSegment[];
  introDuration: number;
}

export const SFXLayer: React.FC<SFXLayerProps> = ({ segments, introDuration }) => {
  const frame = useCurrentFrame();
  
  return (
    <>
      {/* Intro Stinger */}
      {frame === 0 && (
        <Audio src={SFX_ASSETS.intro} volume={0.5} />
      )}

      {segments.map((seg, i) => {
        const segStartFrame = seg.startFrame + introDuration;
        
        // Trigger whoosh at the start of every transition (except first segment)
        const isTransitionFrame = frame === segStartFrame && i > 0;
        
        // Trigger pop when stickers appear (first sticker entry)
        const hasStickers = seg.stickers && seg.stickers.length > 0;
        const isStickerFrame = hasStickers && frame === segStartFrame + 15; // Slightly delayed for sticker stagger

        return (
          <React.Fragment key={seg.index}>
            {isTransitionFrame && (
              <Audio src={SFX_ASSETS.transition} volume={0.3} />
            )}
            {isStickerFrame && (
              <Audio src={SFX_ASSETS.pop} volume={0.2} />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};
