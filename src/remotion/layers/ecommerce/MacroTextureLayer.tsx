import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { RobustImg } from "../../components/RobustImg";

export interface MacroTextureProps {
  textureImageSrc: string;
  startFrame?: number;
  durationFrames?: number;
  label?: string;
  accentColor?: string;
}

export const MacroTextureLayer: React.FC<MacroTextureProps> = ({
  textureImageSrc,
  startFrame = 0,
  durationFrames = 120,
  label = "4K TEXTURE DETAIL",
  accentColor = "#06b6d4",
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const currentProg = Math.max(0, frame - startFrame);

  // Slow horizontal pan with subtle continuous zoom
  const panX = interpolate(currentProg, [0, durationFrames], [-20, 20], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const panY = interpolate(currentProg, [0, durationFrames], [-10, 10], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const zoomScale = interpolate(currentProg, [0, durationFrames], [1.15, 1.25], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ position: "absolute", width, height, overflow: "hidden", pointerEvents: "none" }}>
      {/* 4K Texture Plate */}
      <RobustImg
        src={textureImageSrc}
        alt={label}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${zoomScale}) translate(${panX}px, ${panY}px)`,
          display: "block",
        }}
      />

      {/* Magnifier Reticle Overlay */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 260,
          height: 260,
          borderRadius: "50%",
          border: `2px dashed ${accentColor}`,
          boxShadow: `0 0 30px ${accentColor}33`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -14,
            backgroundColor: accentColor,
            color: "#09090b",
            fontSize: 11,
            fontWeight: 900,
            padding: "2px 10px",
            borderRadius: 6,
            letterSpacing: 1,
          }}
        >
          {label}
        </div>
      </div>
    </div>
  );
};
