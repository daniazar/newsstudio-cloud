import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface DimensionCalipersProps {
  widthLabel?: string;  // e.g. "60\" WIDTH"
  heightLabel?: string; // e.g. "30\" DEPTH"
  doorwayClearance?: string; // e.g. "Fits 30\" Doorways"
  startFrame?: number;
  accentColor?: string;
}

export const DimensionCalipersLayer: React.FC<DimensionCalipersProps> = ({
  widthLabel = "60\" WIDTH",
  heightLabel = "30\" DEPTH",
  doorwayClearance = "FITS 30\" DOORWAYS",
  startFrame = 0,
  accentColor = "#06b6d4",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  return (
    <div
      style={{
        position: "absolute",
        top: "30%",
        left: "50%",
        transform: `translate(-50%, -50%) scale(${entrance})`,
        width: 320,
        height: 240,
        border: `1px dashed ${accentColor}88`,
        borderRadius: 16,
        pointerEvents: "none",
        zIndex: 42,
      }}
    >
      {/* Top Caliper Line & Label */}
      <div
        style={{
          position: "absolute",
          top: -24,
          left: "50%",
          transform: "translateX(-50%)",
          backgroundColor: accentColor,
          color: "#09090b",
          fontSize: 11,
          fontWeight: 900,
          padding: "2px 10px",
          borderRadius: 4,
          letterSpacing: 0.5,
          whiteSpace: "nowrap",
        }}
      >
        ↔ {widthLabel}
      </div>

      {/* Side Caliper Line & Label */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          right: -30,
          transform: "translateY(-50%) rotate(90deg)",
          backgroundColor: "rgba(9, 9, 11, 0.85)",
          border: `1px solid ${accentColor}`,
          color: "#ffffff",
          fontSize: 11,
          fontWeight: 800,
          padding: "2px 8px",
          borderRadius: 4,
          letterSpacing: 0.5,
          whiteSpace: "nowrap",
        }}
      >
        ↕ {heightLabel}
      </div>

      {/* Doorway Clearance Badge */}
      {doorwayClearance && (
        <div
          style={{
            position: "absolute",
            bottom: -28,
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#10b981",
            color: "#09090b",
            fontSize: 11,
            fontWeight: 900,
            padding: "3px 12px",
            borderRadius: 6,
            letterSpacing: 0.5,
            whiteSpace: "nowrap",
            boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
          }}
        >
          ✓ {doorwayClearance}
        </div>
      )}
    </div>
  );
};
