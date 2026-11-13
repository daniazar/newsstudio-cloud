import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { RobustImg } from "../../components/RobustImg";

export interface BeforeAfterWipeProps {
  beforeImageSrc: string;
  afterImageSrc: string;
  startFrame?: number;
  wipeDurationFrames?: number;
  beforeLabel?: string;
  afterLabel?: string;
  accentColor?: string;
  showDividerGlow?: boolean;
}

export const BeforeAfterWipeLayer: React.FC<BeforeAfterWipeProps> = ({
  beforeImageSrc,
  afterImageSrc,
  startFrame = 15,
  wipeDurationFrames = 60,
  beforeLabel = "BEFORE: DATED",
  afterLabel = "AFTER: LUXURY",
  accentColor = "#06b6d4",
  showDividerGlow = true,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Progress from 0 (entirely before) to 1 (entirely after)
  const progress = interpolate(
    frame,
    [startFrame, startFrame + wipeDurationFrames],
    [0.05, 0.95],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const splitX = progress * width;

  // Spring animations for badge entrance
  const badgeSpring = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  return (
    <div style={{ position: "absolute", width, height, overflow: "hidden", pointerEvents: "none" }}>
      {/* After Image (Full background layer) */}
      <RobustImg
        src={afterImageSrc}
        alt="After Transformation"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      />

      {/* Before Image (Clipped dynamically by split line) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: splitX,
          height,
          overflow: "hidden",
        }}
      >
        <RobustImg
          src={beforeImageSrc}
          alt="Before Transformation"
          style={{
            width,
            height,
            objectFit: "cover",
            display: "block",
          }}
        />
      </div>

      {/* Glowing Neon Divider Line */}
      {showDividerGlow && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: splitX - 2,
            width: 4,
            height,
            backgroundColor: "#ffffff",
            boxShadow: `0 0 15px ${accentColor}, 0 0 35px ${accentColor}`,
            zIndex: 10,
          }}
        >
          {/* Central Handle Pill */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              boxShadow: `0 0 20px ${accentColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#09090b",
              fontWeight: 900,
              fontSize: 14,
            }}
          >
            ↔
          </div>
        </div>
      )}

      {/* Floating Badges */}
      <div
        style={{
          position: "absolute",
          top: 140,
          left: 32,
          backgroundColor: "rgba(9, 9, 11, 0.85)",
          backdropFilter: "blur(12px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          padding: "8px 16px",
          borderRadius: 12,
          color: "#ffffff",
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: 0.5,
          transform: `scale(${badgeSpring})`,
          zIndex: 12,
        }}
      >
        {beforeLabel}
      </div>

      <div
        style={{
          position: "absolute",
          top: 140,
          right: 32,
          backgroundColor: accentColor,
          padding: "8px 16px",
          borderRadius: 12,
          color: "#09090b",
          fontWeight: 900,
          fontSize: 15,
          letterSpacing: 0.5,
          boxShadow: `0 4px 20px ${accentColor}66`,
          transform: `scale(${badgeSpring})`,
          zIndex: 12,
        }}
      >
        {afterLabel}
      </div>
    </div>
  );
};
