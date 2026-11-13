import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface TortureBadge {
  icon: string;
  title: string;
  subtitle?: string;
  accentColor?: string;
}

export interface TortureTestProps {
  badges: TortureBadge[];
  startFrame?: number;
  accentColor?: string;
}

export const TortureTestLayer: React.FC<TortureTestProps> = ({
  badges,
  startFrame = 0,
  accentColor = "#06b6d4",
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        pointerEvents: "none",
        zIndex: 42,
      }}
    >
      {badges.map((badge, idx) => {
        const itemDelay = startFrame + idx * 12;
        const popSpring = spring({
          frame: Math.max(0, frame - itemDelay),
          fps,
          config: { damping: 12, stiffness: 140, mass: 0.8 },
        });

        if (frame < itemDelay) return null;

        const borderCol = badge.accentColor || accentColor;

        return (
          <div
            key={idx}
            style={{
              transform: `scale(${popSpring}) translateY(${(1 - popSpring) * 30}px)`,
              backgroundColor: "rgba(9, 9, 11, 0.92)",
              backdropFilter: "blur(16px)",
              border: `2px solid ${borderCol}`,
              boxShadow: `0 8px 24px ${borderCol}44, 0 4px 16px rgba(0,0,0,0.6)`,
              borderRadius: 30,
              padding: "12px 26px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              maxWidth: "90%",
            }}
          >
            <div style={{ fontSize: 32 }}>{badge.icon}</div>
            <div
              style={{
                color: "#ffffff",
                fontWeight: 900,
                fontSize: 22,
                letterSpacing: 0.6,
                textTransform: "uppercase",
              }}
            >
              {badge.title}
            </div>
          </div>
        );
      })}
    </div>
  );
};
