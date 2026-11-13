import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { SponsorCampaign } from "@/lib/sponsors/sponsorEngine";
import { RobustImg } from "../components/RobustImg";
import { resolveSrc } from "../utils/resolveSrc";

export interface SponsorPlacementLayerProps {
  sponsor?: SponsorCampaign;
  position?: "top-right" | "top-left" | "bottom-right";
  startFrame?: number;
  durationFrames?: number;
}

export const SponsorPlacementLayer: React.FC<SponsorPlacementLayerProps> = ({
  sponsor,
  position = "top-right",
  startFrame = 30,
  durationFrames = 300,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!sponsor) return null;

  const activeEndFrame = startFrame + durationFrames;
  if (frame < startFrame || frame > activeEndFrame) return null;

  // Spring entrance
  const entrance = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  // Fade-out at end
  const exitOpacity = interpolate(
    frame,
    [activeEndFrame - 20, activeEndFrame],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const opacity = entrance * exitOpacity;
  const translateY = interpolate(entrance, [0, 1], [-20, 0]);

  const accentColor = sponsor.accentColor || "#10b981";

  const positionStyles: React.CSSProperties =
    position === "top-right"
      ? { top: "40px", right: "40px" }
      : position === "top-left"
      ? { top: "40px", left: "40px" }
      : { bottom: "120px", right: "40px" };

  return (
    <div
      style={{
        position: "absolute",
        ...positionStyles,
        opacity,
        transform: `translateY(${translateY}px)`,
        zIndex: 50,
        pointerEvents: "none",
        fontFamily: "Inter, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 16px",
          background: "rgba(10, 15, 25, 0.88)",
          backdropFilter: "blur(16px)",
          border: `1px solid ${accentColor}44`,
          borderRadius: "14px",
          boxShadow: `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 15px ${accentColor}22`,
        }}
      >
        {/* Brand Accent Indicator */}
        <div
          style={{
            width: "4px",
            height: "28px",
            borderRadius: "2px",
            background: accentColor,
            boxShadow: `0 0 10px ${accentColor}`,
          }}
        />

        {/* Sponsor Content */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "9px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255, 255, 255, 0.6)",
              }}
            >
              Sponsored By
            </span>
            <span
              style={{
                fontSize: "12px",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "-0.01em",
              }}
            >
              {sponsor.brandName}
            </span>
          </div>

          <span
            style={{
              fontSize: "10px",
              fontWeight: 500,
              color: accentColor,
              marginTop: "1px",
            }}
          >
            {sponsor.tagline}
          </span>
        </div>

        {/* Optional QR Code */}
        {sponsor.qrCodeUrl && (
          <div
            style={{
              marginLeft: "6px",
              padding: "3px",
              background: "#ffffff",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <RobustImg
              src={resolveSrc(sponsor.qrCodeUrl)}
              alt="QR Code"
              style={{ width: "32px", height: "32px", display: "block" }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
