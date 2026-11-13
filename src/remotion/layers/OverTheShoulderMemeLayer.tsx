import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { RobustImg } from "../components/RobustImg";
import { resolveSrc } from "../utils/resolveSrc";

export interface OverTheShoulderMemeLayerProps {
  imageUrl?: string;
  headline?: string;
  badgeLabel?: string;
  visible?: boolean;
  startFrame?: number;
  durationFrames?: number;
  position?: "left" | "right";
  accentColor?: string;
}

export const OverTheShoulderMemeLayer: React.FC<OverTheShoulderMemeLayerProps> = ({
  imageUrl,
  headline = "BREAKING SATIRE",
  badgeLabel = "THE DAILY LLM EXCLUSIVE",
  visible = true,
  startFrame = 15,
  durationFrames,
  position = "left",
  accentColor = "#f59e0b",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (!visible || !imageUrl) return null;

  const totalFrames = durationFrames || durationInFrames - startFrame;
  if (frame < startFrame || frame > startFrame + totalFrames) return null;

  const relativeFrame = frame - startFrame;

  // Spring slide-in animation
  const entrance = spring({
    frame: relativeFrame,
    fps,
    config: { damping: 14, mass: 0.6, stiffness: 120 },
  });

  // Exit animation (last 15 frames)
  const exitFrames = 15;
  const exitStart = totalFrames - exitFrames;
  const exitProgress =
    relativeFrame > exitStart
      ? interpolate(relativeFrame, [exitStart, totalFrames], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 0;

  const opacity = interpolate(relativeFrame, [0, 10], [0, 1], { extrapolateRight: "clamp" }) * (1 - exitProgress);
  const translateY = interpolate(entrance, [0, 1], [-40, 0]) + exitProgress * -30;
  const scale = interpolate(entrance, [0, 1], [0.85, 1.0]) * (1 - exitProgress * 0.1);

  const isLeft = position === "left";
  const horizontalPosition = isLeft ? { left: "80px" } : { right: "80px" };

  return (
    <div
      style={{
        position: "absolute",
        top: "80px",
        ...horizontalPosition,
        width: "420px",
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        transformOrigin: isLeft ? "top left" : "top right",
        zIndex: 40,
        pointerEvents: "none",
      }}
    >
      {/* Floating Card Container */}
      <div
        style={{
          borderRadius: "16px",
          overflow: "hidden",
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          border: `2px solid ${accentColor}`,
          boxShadow: `0 20px 40px rgba(0,0,0,0.6), 0 0 25px ${accentColor}44`,
          backdropFilter: "blur(12px)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Satirical Top Banner */}
        <div
          style={{
            backgroundColor: accentColor,
            color: "#0f172a",
            padding: "6px 14px",
            fontSize: "13px",
            fontWeight: 900,
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{badgeLabel}</span>
          <span style={{ fontSize: "11px", opacity: 0.85 }}>LIVE FEED</span>
        </div>

        {/* Meme Image Box (4:3 aspect) */}
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "260px",
            backgroundColor: "#020617",
            overflow: "hidden",
          }}
        >
          <RobustImg
            src={resolveSrc(imageUrl)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
          {/* Subtle vignette gradient */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(15,23,42,0.85) 0%, transparent 40%)",
            }}
          />
        </div>

        {/* Punchline Headline Banner */}
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#ffffff",
              fontSize: "18px",
              fontWeight: 800,
              lineHeight: "1.25",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {headline}
          </p>
        </div>
      </div>
    </div>
  );
};
