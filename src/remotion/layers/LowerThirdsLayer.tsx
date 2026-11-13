import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { RemotionSegment, AspectRatio } from "../../lib/types";

interface LowerThirdsLayerProps {
  currentSegment: RemotionSegment | null;
  aspectRatio: AspectRatio;
  speakerName?: string;
  speakerTitle?: string;
  personaName?: string;
  personaTitle?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

// Module-level cache for parsed mediaSettings to eliminate JSON.parse on every frame
const mediaSettingsCache = new Map<string, Record<string, unknown>>();

function parseMediaSettings(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, unknown>;
  if (typeof raw !== "string") return {};
  const cached = mediaSettingsCache.get(raw);
  if (cached) return cached;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (mediaSettingsCache.size > 200) mediaSettingsCache.clear();
    mediaSettingsCache.set(raw, parsed);
    return parsed;
  } catch {
    return {};
  }
}

export const LowerThirdsLayer: React.FC<LowerThirdsLayerProps> = ({
  currentSegment,
  aspectRatio,
  speakerName = "Ruby Vance",
  speakerTitle = "Lead News Anchor",
  personaName,
  personaTitle,
  primaryColor = "#00F0FF",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!currentSegment) return null;

  const segmentFrame = frame - currentSegment.startFrame;
  const segmentLength = currentSegment.endFrame - currentSegment.startFrame;

  // Entrance spring (first 15 frames)
  const entrance = spring({
    frame: segmentFrame,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  // Exit animation (fade and slide down in last 15 frames or after 150 frames / 5s)
  const displayDuration = Math.min(segmentLength, 150);
  const exitProgress = interpolate(
    segmentFrame,
    [displayDuration - 15, displayDuration],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const slideX = interpolate(entrance, [0, 1], [-300, 0]) + exitProgress * -300;
  const opacity = interpolate(entrance, [0, 1], [0, 1]) * (1 - exitProgress);

  if (opacity <= 0.01) return null;

  const isVertical = aspectRatio === "vertical";
  const isSquare = aspectRatio === "square";
  const isGuest = currentSegment.speaker === "guest";

  // Parse custom mediaSettings (cached to avoid JSON parsing on every frame)
  const customSettings = parseMediaSettings(currentSegment.mediaSettings);

  const displayName =
    (customSettings.speakerName as string | undefined) ||
    personaName ||
    (isGuest ? "Dr. Aris" : speakerName);
  const displayTitle =
    (customSettings.speakerTitle as string | undefined) ||
    personaTitle ||
    (isGuest ? "Guest Correspondent" : speakerTitle);

  // Position calculation based on aspect ratio
  const bottomPos = isVertical ? 220 : isSquare ? 120 : 60;
  const leftPos = isVertical ? 32 : 48;
  const hOffsetX = Number(customSettings.headlineOffsetX) || 0;
  const hOffsetY = Number(customSettings.headlineOffsetY) || 0;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          bottom: bottomPos,
          left: leftPos,
          transform: `translate(${slideX + hOffsetX}px, ${-hOffsetY}px)`,
          opacity,
          zIndex: 35,
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        {/* Bureau / Live Status Tag */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            border: `1px solid ${primaryColor}40`,
            padding: "3px 10px",
            borderRadius: "6px",
            width: "fit-content",
            backdropFilter: "blur(12px)",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#ef4444",
              boxShadow: "0 0 8px #ef4444",
            }}
          />
          <span
            style={{
              color: "#fff",
              fontSize: isVertical ? "11px" : "10px",
              fontFamily: "'Inter', sans-serif",
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            STUDIO 1 • LIVE
          </span>
        </div>

        {/* Main Name & Title Card */}
        <div
          style={{
            backgroundColor: "rgba(8, 14, 26, 0.88)",
            borderLeft: `4px solid ${primaryColor}`,
            borderTop: `1px solid rgba(255,255,255,0.1)`,
            borderRight: `1px solid rgba(255,255,255,0.05)`,
            borderBottom: `1px solid rgba(255,255,255,0.05)`,
            padding: isVertical ? "10px 18px" : "8px 16px",
            borderRadius: "0 10px 10px 0",
            backdropFilter: "blur(16px)",
            boxShadow: "0 12px 32px rgba(0, 0, 0, 0.6)",
          }}
        >
          <h2
            style={{
              color: "#ffffff",
              fontSize: isVertical ? "26px" : isSquare ? "22px" : "20px",
              fontWeight: 900,
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              fontFamily: "'Inter', sans-serif",
              lineHeight: 1.1,
              textShadow: "0 2px 8px rgba(0,0,0,0.8)",
            }}
          >
            {displayName}
          </h2>
          <p
            style={{
              color: primaryColor,
              fontSize: isVertical ? "13px" : "11px",
              fontWeight: 700,
              margin: "3px 0 0 0",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {displayTitle}
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
