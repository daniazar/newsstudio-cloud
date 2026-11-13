import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface FeaturePillsProps {
  features: string[];
  startFrame?: number;
  accentColor?: string;
  maxItems?: number;
}

export const FeaturePillsLayer: React.FC<FeaturePillsProps> = ({
  features,
  startFrame = 0,
  accentColor = "#06b6d4",
  maxItems = 3,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const displayItems = (features || []).slice(0, maxItems);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        alignItems: "center",
        pointerEvents: "none",
        zIndex: 42,
      }}
    >
      {displayItems.map((feat, idx) => {
        const itemDelay = startFrame + idx * 8;
        const pop = spring({
          frame: Math.max(0, frame - itemDelay),
          fps,
          config: { damping: 14, stiffness: 130 },
        });

        if (frame < itemDelay) return null;

        return (
          <div
            key={idx}
            style={{
              transform: `scale(${pop}) translateY(${(1 - pop) * 20}px)`,
              backgroundColor: "rgba(9, 9, 11, 0.88)",
              backdropFilter: "blur(12px)",
              border: "1.5px solid rgba(255, 255, 255, 0.2)",
              borderRadius: 30,
              padding: "10px 24px",
              display: "flex",
              alignItems: "center",
              gap: 12,
              maxWidth: "88%",
              boxShadow: "0 6px 20px rgba(0, 0, 0, 0.5)",
            }}
          >
            {/* Glowing Accent Dot */}
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: accentColor,
                boxShadow: `0 0 12px ${accentColor}`,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: "#ffffff",
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: 0.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {feat}
            </span>
          </div>
        );
      })}
    </div>
  );
};
