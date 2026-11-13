import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface StreamChatMessage {
  id: string;
  user: string;
  color: string;
  text: string;
  badge?: string;
  avatarUrl?: string;
  startFrame: number;
}

export interface StreamChatLayerProps {
  messages?: StreamChatMessage[];
  position?: "left" | "right";
}

const DEFAULT_MESSAGES: StreamChatMessage[] = [
  { id: "m1", user: "TechGamer99", color: "#3b82f6", text: "W chat!! 🔥", badge: "👑 VIP", startFrame: 15 },
  { id: "m2", user: "CyberRuby_Fan", color: "#ec4899", text: "Is this real?! No way!! 🤯", badge: "⭐ Sub 12m", startFrame: 30 },
  { id: "m3", user: "DevGuru_X", color: "#10b981", text: "Local GPU models are insane now", startFrame: 50 },
  { id: "m4", user: "PixelKnight", color: "#f59e0b", text: "LET THEM COOK 👨‍🍳🔥", badge: "⚡ Mod", startFrame: 75 },
  { id: "m5", user: "FutureTech", color: "#8b5cf6", text: "Subscribe hit!! 🎉🎉", badge: "⭐ Sub 1m", startFrame: 95 },
];

/**
 * Animated Stream Chat Overlay for Remotion
 * Simulates real-time Twitch/YouTube streamer chat comments with entrance springs
 */
export const StreamChatLayer: React.FC<StreamChatLayerProps> = ({
  messages = DEFAULT_MESSAGES,
  position = "right",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const activeMessages = messages.filter((m) => frame >= m.startFrame);

  const containerStyle: React.CSSProperties =
    position === "right"
      ? { right: "24px", bottom: "160px" }
      : { left: "24px", bottom: "160px" };

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 60,
        width: "280px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        pointerEvents: "none",
        ...containerStyle,
      }}
    >
      {activeMessages.slice(-5).map((msg) => {
        const msgFrame = Math.max(0, frame - msg.startFrame);
        const entrance = spring({
          frame: msgFrame,
          fps,
          config: { damping: 14, stiffness: 140 },
        });

        const opacity = interpolate(msgFrame, [0, 10], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={msg.id}
            style={{
              transform: `translateX(${(1 - entrance) * (position === "right" ? 40 : -40)}px)`,
              opacity,
            }}
            className="flex items-start gap-2 p-2.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 shadow-xl font-sans text-xs"
          >
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-0.5">
                {msg.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/30 text-accent font-bold">
                    {msg.badge}
                  </span>
                )}
                <span className="font-bold truncate text-[11px]" style={{ color: msg.color }}>
                  {msg.user}
                </span>
              </div>
              <span className="text-white text-[11px] font-medium leading-snug break-words">
                {msg.text}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
