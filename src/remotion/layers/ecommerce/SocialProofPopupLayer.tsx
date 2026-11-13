import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { SocialProofPopupConfig, AdAspectRatio } from "@/lib/types/ecommerce";

export interface SocialProofPopupLayerProps {
  config: SocialProofPopupConfig;
  primaryColor?: string;
  aspectRatio: AdAspectRatio;
}

export function getPopupCoordinates(
  position: SocialProofPopupConfig["position"],
  aspectRatio: AdAspectRatio
): React.CSSProperties {
  const isVertical = aspectRatio === "9:16";
  const bottomOffset = isVertical ? 95 : 32;
  const topOffset = isVertical ? 85 : 24;
  const sideOffset = 24;

  switch (position) {
    case "top_right":
      return { top: topOffset, right: sideOffset };
    case "bottom_right":
      return { bottom: bottomOffset, right: sideOffset };
    case "bottom_left":
    default:
      return { bottom: bottomOffset, left: sideOffset };
  }
}

export const SocialProofPopupLayer: React.FC<SocialProofPopupLayerProps> = ({
  config,
  primaryColor = "#06b6d4",
  aspectRatio,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!config.enabled) return null;

  const platform = config.platform || "trustpilot";
  const customerName = config.customerName || "Jessica M.";
  const location = config.location || "Verified Buyer • Austin, TX";
  const rating = config.rating || 5;
  const quote = config.quote || "Transformed our home in 1 weekend. Best decision ever!";
  const position = config.position || "bottom_left";

  // Staggered slide in at frame 30 (1 second in)
  const startFrame = 30;
  const entrance = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  if (frame < startFrame) return null;

  const posStyles = getPopupCoordinates(position, aspectRatio);
  const avatarLetter = customerName.charAt(0).toUpperCase();

  // Platform accents
  const platformColor =
    platform === "trustpilot"
      ? "#00b67a"
      : platform === "amazon"
      ? "#ff9900"
      : platform === "tiktok"
      ? "#fe2c55"
      : "#10b981";

  const platformName =
    platform === "trustpilot"
      ? "Trustpilot Verified"
      : platform === "amazon"
      ? "Amazon Verified Purchase"
      : platform === "tiktok"
      ? "TikTok Shop Order"
      : "Shopify Verified";

  return (
    <div
      style={{
        position: "absolute",
        ...posStyles,
        transform: `translateY(${(1 - entrance) * 40}px) scale(${entrance})`,
        opacity: entrance,
        display: "flex",
        alignItems: "center",
        gap: 10,
        backgroundColor: "rgba(9, 9, 11, 0.88)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: `1.5px solid ${platformColor}55`,
        borderRadius: 20,
        padding: "10px 14px",
        maxWidth: aspectRatio === "9:16" ? 340 : 420,
        boxShadow: `0 12px 35px rgba(0, 0, 0, 0.65), 0 0 20px ${platformColor}1a`,
        zIndex: 43,
        pointerEvents: "none",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Avatar Initial Circle */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: `linear-gradient(135deg, ${platformColor}, ${primaryColor})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontWeight: 900,
          fontSize: 16,
          flexShrink: 0,
          boxShadow: `0 0 12px ${platformColor}55`,
        }}
      >
        {avatarLetter}
      </div>

      {/* Content */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        {/* Header line: Platform badge & 5 stars */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              color: platformColor,
              fontSize: 9,
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {platformName}
          </span>
          <div style={{ display: "flex", gap: 1, color: "#eab308", fontSize: 10 }}>
            {Array.from({ length: Math.min(5, Math.max(1, rating)) }).map((_, i) => (
              <span key={i}>★</span>
            ))}
          </div>
        </div>

        {/* Quote */}
        <div
          style={{
            color: "#ffffff",
            fontSize: 11,
            fontWeight: 700,
            lineHeight: 1.25,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          &ldquo;{quote}&rdquo;
        </div>

        {/* Customer & Location */}
        <div
          style={{
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: 9,
            fontWeight: 600,
          }}
        >
          {customerName} • {location}
        </div>
      </div>
    </div>
  );
};
