import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import type { RemotionSegment, AspectRatio } from "@/lib/types";
import { RobustImg } from "../components/RobustImg";
import { resolveSrc } from "../utils/resolveSrc";

interface BrandingLayerProps {
  aspectRatio: AspectRatio;
  segments?: RemotionSegment[];
  feedName?: string;
  includeOutro?: boolean;
  watermarkSrc?: string;
  offsetX?: number;
  offsetY?: number;
  scale?: number;
}

export const BrandingLayer: React.FC<BrandingLayerProps> = ({
  aspectRatio,
  feedName,
  includeOutro = true,
  watermarkSrc,
  offsetX = 0,
  offsetY = 0,
  scale = 1.0,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Determine outro bounds
  const outroDuration = fps * 3; // 3 seconds
  
  const isVertical = aspectRatio === "vertical";
  
  // Watermark position
  const logoTop = (isVertical ? 60 : 40) - offsetY;
  const logoLeft = (isVertical ? 40 : 40) + offsetX;

  // Render the watermark logo (a glowing "Ruby" text placeholder for now)
  const renderWatermark = () => {
    // Fade out during outro
    const opacity = interpolate(
      frame,
      [durationInFrames - outroDuration - 10, durationInFrames - outroDuration],
      [1, 0],
      { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
    );

    return (
      <div
        style={{
          position: "absolute",
          top: logoTop,
          left: logoLeft,
          opacity,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          transform: scale !== 1.0 ? `scale(${scale})` : undefined,
          transformOrigin: "top left",
        }}
      >
        {watermarkSrc ? (
          <RobustImg src={resolveSrc(watermarkSrc)} style={{ height: "48px", objectFit: "contain" }} />
        ) : (
          <>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: "#10b981",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: "bold", fontSize: 18,
              boxShadow: "0 0 10px rgba(16, 185, 129, 0.5)"
            }}>
              R
            </div>
            <span style={{
              color: "rgba(255,255,255,0.8)",
              fontFamily: "sans-serif",
              fontWeight: 800,
              fontSize: 20,
              textShadow: "0 2px 4px rgba(0,0,0,0.5)"
            }}>
              NewsStudio
            </span>
          </>
        )}
      </div>
    );
  };

  // Render Source Attribution if feedName is available
  const renderAttribution = () => {
    if (!feedName) return null;

    // Fade out during outro
    const opacity = interpolate(
      frame,
      [durationInFrames - outroDuration - 10, durationInFrames - outroDuration],
      [1, 0],
      { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
    );

    const bottomPos = isVertical ? 120 : 40;
    const leftPos = isVertical ? 40 : 40;

    return (
      <div
        style={{
          position: "absolute",
          bottom: bottomPos,
          left: leftPos,
          opacity,
          background: "rgba(0,0,0,0.6)",
          padding: "6px 12px",
          borderRadius: "6px",
          border: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(4px)",
        }}
      >
        <span style={{
          color: "rgba(255,255,255,0.7)",
          fontFamily: "sans-serif",
          fontSize: 14,
        }}>
          Source: <span style={{ color: "#10b981", fontWeight: "bold" }}>{feedName}</span>
        </span>
      </div>
    );
  };

  // Render Outro CTA
  const renderOutro = () => {
    if (!includeOutro) return null;

    const outroStartFrame = durationInFrames - outroDuration;
    
    // Scale up animation
    const scale = spring({
      fps,
      frame: frame - outroStartFrame,
      config: { damping: 12, stiffness: 90 },
    });

    const opacity = interpolate(
      frame,
      [outroStartFrame, outroStartFrame + 10],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    );

    if (frame < outroStartFrame) return null;

    return (
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(10, 10, 10, 0.95)",
          backdropFilter: "blur(10px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          opacity,
          zIndex: 100,
        }}
      >
        <div style={{ transform: `scale(${scale})`, textAlign: "center" }}>
          <div style={{
            width: 80, height: 80, borderRadius: "50%", background: "#10b981",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: "bold", fontSize: 40, margin: "0 auto 20px auto",
            boxShadow: "0 0 40px rgba(16, 185, 129, 0.4)"
          }}>
            R
          </div>
          <h2 style={{
            color: "#fff",
            fontFamily: "sans-serif",
            fontSize: isVertical ? 48 : 64,
            fontWeight: 800,
            marginBottom: 10
          }}>
            Subscribe for more
          </h2>
          <p style={{
            color: "#10b981",
            fontFamily: "sans-serif",
            fontSize: isVertical ? 24 : 32,
            fontWeight: "bold"
          }}>
            Daily Tech News
          </p>
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill style={{ zIndex: 50, pointerEvents: "none" }}>
      {renderWatermark()}
      {renderAttribution()}
      {renderOutro()}
    </AbsoluteFill>
  );
};
