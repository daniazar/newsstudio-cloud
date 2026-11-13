import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { RobustImg } from "../../components/RobustImg";

export interface ReviewSocialProofProps {
  author?: string;
  rating?: number;
  reviewText: string;
  title?: string;
  location?: string;
  highlightPhrase?: string;
  platform?: "trustpilot" | "amazon" | "shopify" | "judge_me" | "yotpo" | "generic";
  verifiedBuyer?: boolean;
  startFrame?: number;
  accentColor?: string;
  avatarUrl?: string;
  aspectRatio?: "9:16" | "16:9" | "1:1" | "4:5";
}

export const ReviewSocialProofLayer: React.FC<ReviewSocialProofProps> = ({
  author = "Verified Customer",
  rating = 5,
  reviewText,
  title,
  location,
  highlightPhrase,
  platform = "shopify",
  verifiedBuyer = true,
  startFrame = 0,
  accentColor = "#06b6d4",
  avatarUrl,
  aspectRatio = "9:16",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elapsed = Math.max(0, frame - startFrame);

  const entrance = spring({
    frame: elapsed,
    fps,
    config: { damping: 13, stiffness: 120 },
  });

  const starsCount = Math.min(5, Math.max(1, Math.round(rating)));
  const isVertical = aspectRatio === "9:16";
  const avatarInitial = author.charAt(0).toUpperCase();

  const platformBadge =
    platform === "amazon"
      ? "AMAZON VERIFIED"
      : platform === "trustpilot"
      ? "TRUSTPILOT REVIEW"
      : platform === "judge_me"
      ? "JUDGE.ME CERTIFIED"
      : platform === "yotpo"
      ? "YOTPO VERIFIED"
      : "VERIFIED BUYER";

  return (
    <div
      style={{
        transform: `scale(${entrance}) translateY(${(1 - entrance) * 30}px)`,
        opacity: entrance,
        backgroundColor: "rgba(9, 9, 11, 0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1.5px solid ${accentColor}55`,
        borderRadius: 24,
        padding: isVertical ? "24px 28px" : "28px 36px",
        maxWidth: isVertical ? "88%" : 650,
        boxShadow: `0 20px 50px rgba(0, 0, 0, 0.7), 0 0 35px ${accentColor}22`,
        display: "flex",
        flexDirection: "column",
        gap: isVertical ? 12 : 16,
        alignItems: "center",
        textAlign: "center",
        pointerEvents: "none",
        zIndex: 42,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Optional Highlight Pill */}
      {highlightPhrase && (
        <div
          style={{
            backgroundColor: `${accentColor}22`,
            border: `1px solid ${accentColor}88`,
            color: "#ffffff",
            fontSize: isVertical ? 16 : 14,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            padding: "6px 18px",
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span style={{ color: accentColor }}>✦</span>
          <span>{highlightPhrase}</span>
          <span style={{ color: accentColor }}>✦</span>
        </div>
      )}

      {/* 5 Animated Gold Stars with Staggered Springs */}
      <div style={{ display: "flex", gap: 8, fontSize: isVertical ? 34 : 28, color: "#facc15" }}>
        {Array.from({ length: starsCount }).map((_, i) => {
          const starSpring = spring({
            frame: Math.max(0, elapsed - i * 3),
            fps,
            config: { damping: 9, stiffness: 180 },
          });
          return (
            <span
              key={i}
              style={{
                transform: `scale(${starSpring})`,
                display: "inline-block",
                textShadow: "0 2px 10px rgba(250, 204, 21, 0.4)",
              }}
            >
              ★
            </span>
          );
        })}
      </div>

      {/* Title if present */}
      {title && (
        <div
          style={{
            color: "#ffffff",
            fontSize: isVertical ? 22 : 20,
            fontWeight: 800,
            lineHeight: 1.25,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </div>
      )}

      {/* Review Body */}
      <div
        style={{
          color: "rgba(255, 255, 255, 0.95)",
          fontSize: isVertical ? 24 : 20,
          fontWeight: 600,
          lineHeight: 1.4,
          fontStyle: "italic",
        }}
      >
        &ldquo;{reviewText}&rdquo;
      </div>

      {/* Reviewer Meta & Verification Pill */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginTop: 6,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {/* Avatar Circle */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: `${accentColor}33`,
            border: `2px solid ${accentColor}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontWeight: 800,
            fontSize: 16,
            overflow: "hidden",
          }}
        >
          {avatarUrl ? (
            <RobustImg src={avatarUrl} alt={author} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            avatarInitial
          )}
        </div>

        {/* Name and Location */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left" }}>
          <span style={{ color: "#ffffff", fontSize: 17, fontWeight: 800 }}>
            {author}
          </span>
          {location && (
            <span style={{ color: "rgba(255, 255, 255, 0.65)", fontSize: 13, fontWeight: 500 }}>
              {location}
            </span>
          )}
        </div>

        {/* Verified Badge */}
        {verifiedBuyer && (
          <div
            style={{
              backgroundColor: "#10b98122",
              border: "1px solid #10b981",
              color: "#10b981",
              fontSize: 14,
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 6,
              letterSpacing: "0.04em",
            }}
          >
            <span>✓</span> {platformBadge}
          </div>
        )}
      </div>
    </div>
  );
};
