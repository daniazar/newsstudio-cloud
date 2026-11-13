import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from "remotion";

const STICKER_DATA: Record<string, { label: string; icon: string; color: string }> = {
  "link-in-bio": { label: "LINK IN BIO", icon: "🔗", color: "#10b981" },
  "swipe-up": { label: "SWIPE UP", icon: "👆", color: "#3b82f6" },
  "like-share": { label: "LIKE & SHARE", icon: "❤️", color: "#ef4444" },
  "new-video": { label: "NEW VIDEO", icon: "🆕", color: "#fbbf24" },
};

interface StickersLayerProps {
  stickers?: string[] | null;
  startFrame?: number;
}

export const StickersLayer: React.FC<StickersLayerProps> = ({ stickers, startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!stickers || stickers.length === 0) return null;

  const relativeFrame = frame - startFrame;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 60 }}>
      <div style={{
        position: "absolute",
        top: 150,
        right: 40,
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        alignItems: "flex-end"
      }}>
        {stickers.map((id, i) => {
          const data = STICKER_DATA[id];
          if (!data) return null;

          const scale = spring({
            fps,
            frame: relativeFrame - (i * 5), // Staggered entry
            config: { damping: 12, stiffness: 120 },
          });

          return (
            <div
              key={id}
              style={{
                transform: `scale(${scale})`,
                backgroundColor: "rgba(0,0,0,0.8)",
                border: `2px solid ${data.color}`,
                borderRadius: "12px",
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                boxShadow: `0 4px 15px rgba(0,0,0,0.3), 0 0 10px ${data.color}44`,
                backdropFilter: "blur(8px)",
              }}
            >
              <span style={{ fontSize: "20px" }}>{data.icon}</span>
              <span style={{
                color: "#fff",
                fontSize: "14px",
                fontWeight: 900,
                fontFamily: "sans-serif",
                letterSpacing: "0.05em"
              }}>
                {data.label}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
