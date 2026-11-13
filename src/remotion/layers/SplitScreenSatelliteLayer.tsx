import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig, OffthreadVideo } from "remotion";
import { RobustImg } from "../components/RobustImg";
import { resolveSrc } from "../utils/resolveSrc";
export interface SatelliteFeedConfig {
  name: string;
  role: string;
  location: string;
  videoSrc?: string;
  imageSrc?: string;
  isSpeaking?: boolean;
  audioLevel?: number; // 0 to 1
  latencyMs?: number;
  signalStatus?: "LIVE" | "STANDBY" | "REPLAY";
  avatarUrl?: string;
}

export interface SplitScreenSatelliteLayerProps {
  leftFeed?: SatelliteFeedConfig;
  rightFeed?: SatelliteFeedConfig;
  topicHeadline?: string;
  satelliteBadgeText?: string;
  primaryColor?: string;
  aspectRatio?: "horizontal" | "vertical" | "square";
  showVuMeters?: boolean;
}

export const DEFAULT_LEFT_FEED: SatelliteFeedConfig = {
  name: "Ruby Sterling",
  role: "Primary Anchor",
  location: "STUDIO 1 • NEW YORK",
  imageSrc: "/avatars/ruby.png",
  isSpeaking: true,
  latencyMs: 18,
};

export const DEFAULT_RIGHT_FEED: SatelliteFeedConfig = {
  name: "Blaze Wilder",
  role: "Senior Tech Analyst",
  location: "BUREAU • SILICON VALLEY",
  imageSrc: "/avatars/blaze.png",
  isSpeaking: false,
  latencyMs: 24,
};

/**
 * Calculates dynamic active speaker glow styling based on speech state and timeline frame.
 */
export function calculateSpeakerGlow(
  isSpeaking = false,
  frame = 0,
  accentColor = "#22d3ee"
): {
  borderColor: string;
  boxShadow: string;
  opacity: number;
  scale: number;
} {
  if (!isSpeaking) {
    return {
      borderColor: "rgba(255, 255, 255, 0.18)",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
      opacity: 0.85,
      scale: 1.0,
    };
  }

  // Dynamic pulsing wave when active speaker is talking
  const pulse = Math.sin(frame * 0.25) * 0.5 + 0.5; // 0.0 to 1.0
  const glowSpread = 20 + pulse * 14; // 20px to 34px

  return {
    borderColor: accentColor,
    boxShadow: `0 0 ${glowSpread}px rgba(34, 211, 238, 0.45), inset 0 0 12px rgba(34, 211, 238, 0.15)`,
    opacity: 1.0,
    scale: 1.006,
  };
}

/**
 * Calculates responsive energy heights (percentages 20-100%) for simulated broadcast VU meter bars.
 */
export function calculateVuMeterBars(
  frame: number,
  isSpeaking = false,
  barCount = 5
): number[] {
  if (!isSpeaking) {
    return Array.from({ length: barCount }, () => 15);
  }

  const factors = [0.8, 1.25, 0.65, 1.1, 0.9, 1.4, 0.75];
  return Array.from({ length: barCount }, (_, idx) => {
    const factor = factors[idx % factors.length];
    const wave = Math.sin(frame * 0.35 * factor + idx * 1.2);
    const height = Math.min(100, Math.max(22, wave * 48 + 52));
    return Math.round(height);
  });
}

/**
 * Calibrated Dual-Anchor Split Screen Satellite Broadcast Layer
 * Renders side-by-side or stacked multi-anchor layouts with dynamic active speaker glow borders,
 * audio VU meters, location chyrons, and satellite transmission stats.
 */
export const SplitScreenSatelliteLayer: React.FC<SplitScreenSatelliteLayerProps> = ({
  leftFeed = DEFAULT_LEFT_FEED,
  rightFeed = DEFAULT_RIGHT_FEED,
  topicHeadline = "BREAKING TECH ROUNDTABLE — DUAL SATELLITE",
  satelliteBadgeText = "LIVE DUAL SATELLITE LINK",
  primaryColor = "#22d3ee",
  aspectRatio = "horizontal",
  showVuMeters = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = aspectRatio === "vertical";

  // Entrance spring animation
  const entrance = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 120 },
  });

  const blink = Math.floor(frame / 15) % 2 === 0;

  const renderFeedWindow = (feed: SatelliteFeedConfig, side: "left" | "right") => {
    const isSpeaking = Boolean(feed.isSpeaking);
    const glow = calculateSpeakerGlow(isSpeaking, frame, primaryColor);
    const vuBars = calculateVuMeterBars(frame, isSpeaking, 5);

    const mediaSrc = feed.videoSrc || feed.imageSrc || feed.avatarUrl;
    const isVideo = Boolean(feed.videoSrc);

    return (
      <div
        style={{
          position: "relative",
          flex: 1,
          height: "100%",
          minHeight: isVertical ? "260px" : "auto",
          borderRadius: "18px",
          overflow: "hidden",
          border: `2.5px solid ${glow.borderColor}`,
          boxShadow: glow.boxShadow,
          opacity: glow.opacity,
          transform: `scale(${glow.scale})`,
          transition: "all 0.25s cubic-bezier(0.25, 1, 0.5, 1)",
          backgroundColor: "#080a0f",
        }}
        className="font-sans"
      >
        {/* Presenter Feed Media */}
        {mediaSrc ? (
          isVideo ? (
            <OffthreadVideo
              src={resolveSrc(mediaSrc)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <RobustImg
              src={resolveSrc(mediaSrc)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )
        ) : (
          <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-500 font-mono text-xs">
            NO SATELLITE SIGNAL
          </div>
        )}

        {/* Broadcast CRT Scanline Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.12,
            backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.45) 50%)",
            backgroundSize: "100% 4px",
          }}
        />

        {/* Top Location & Satellite Metadata HUD */}
        <div
          style={{
            position: "absolute",
            top: "14px",
            left: "14px",
            right: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {/* Location Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "4px 10px",
              borderRadius: "8px",
              backgroundColor: "rgba(0, 0, 0, 0.82)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              fontSize: "10px",
              fontFamily: "monospace",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#ffffff",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                backgroundColor: "#ef4444",
                boxShadow: blink ? "0 0 8px #ef4444" : "none",
                opacity: blink ? 1 : 0.4,
              }}
            />
            <span>{feed.location}</span>
          </div>

          {/* Stream Quality & Latency Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 8px",
              borderRadius: "6px",
              backgroundColor: "rgba(0, 0, 0, 0.7)",
              backdropFilter: "blur(6px)",
              fontSize: "9px",
              fontFamily: "monospace",
              color: "#67e8f9",
              border: "1px solid rgba(6, 182, 212, 0.25)",
            }}
          >
            <span>HD 1080p</span>
            <span style={{ color: "rgba(255, 255, 255, 0.3)" }}>•</span>
            <span>{feed.latencyMs ?? (side === "left" ? 18 : 24)}ms RTT</span>
          </div>
        </div>

        {/* Dynamic Broadcast Audio VU Meter */}
        {showVuMeters && isSpeaking && (
          <div
            style={{
              position: "absolute",
              bottom: "72px",
              right: "14px",
              display: "flex",
              alignItems: "flex-end",
              gap: "3px",
              height: "24px",
              padding: "4px 6px",
              borderRadius: "6px",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              zIndex: 10,
            }}
          >
            {vuBars.map((heightPct, idx) => (
              <div
                key={idx}
                style={{
                  width: "4px",
                  height: `${heightPct}%`,
                  borderRadius: "1px",
                  backgroundColor:
                    heightPct > 80 ? "#ef4444" : heightPct > 55 ? "#f59e0b" : "#10b981",
                  transition: "height 0.08s ease",
                }}
              />
            ))}
          </div>
        )}

        {/* Lower-Third Presenter Chyron */}
        <div
          style={{
            position: "absolute",
            bottom: "12px",
            left: "12px",
            right: "12px",
            padding: "10px 14px",
            borderRadius: "12px",
            background: "linear-gradient(90deg, rgba(0, 0, 0, 0.95) 0%, rgba(10, 15, 25, 0.85) 75%, transparent 100%)",
            borderLeft: `4px solid ${isSpeaking ? primaryColor : "rgba(255, 255, 255, 0.3)"}`,
            backdropFilter: "blur(12px)",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ color: "#ffffff", fontWeight: 800, fontSize: "14px", letterSpacing: "0.02em" }}>
              {feed.name}
            </span>
            {isSpeaking && (
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 900,
                  padding: "1px 5px",
                  borderRadius: "3px",
                  backgroundColor: "rgba(34, 211, 238, 0.2)",
                  color: "#22d3ee",
                  border: "1px solid rgba(34, 211, 238, 0.4)",
                  fontFamily: "monospace",
                  letterSpacing: "0.06em",
                }}
              >
                ON AIR
              </span>
            )}
          </div>
          <div style={{ color: "#67e8f9", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "2px" }}>
            {feed.role}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 40,
        opacity: entrance,
        transform: `scale(${interpolate(entrance, [0, 1], [0.97, 1])})`,
        display: "flex",
        flexDirection: "column",
        padding: isVertical ? "20px 16px" : "28px 36px",
      }}
      className="font-sans select-none"
    >
      {/* Top Broadcast Header Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          padding: "8px 16px",
          borderRadius: "14px",
          backgroundColor: "rgba(6, 9, 15, 0.85)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 12px 36px rgba(0, 0, 0, 0.7)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span
            style={{
              padding: "3px 8px",
              borderRadius: "5px",
              backgroundColor: "#ef4444",
              color: "#ffffff",
              fontWeight: 900,
              fontSize: "11px",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              boxShadow: "0 0 12px rgba(239, 68, 68, 0.6)",
            }}
          >
            LIVE
          </span>
          <span
            style={{
              color: "#ffffff",
              fontWeight: 800,
              fontSize: isVertical ? "12px" : "13px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {topicHeadline}
          </span>
        </div>

        {!isVertical && (
          <div
            style={{
              color: "rgba(255, 255, 255, 0.6)",
              fontFamily: "monospace",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {satelliteBadgeText}
          </div>
        )}
      </div>

      {/* Dual Feeds (Side-by-Side in 16:9, Stacked in 9:16) */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: isVertical ? "column" : "row",
          gap: isVertical ? "14px" : "20px",
          minHeight: 0,
        }}
      >
        {renderFeedWindow(leftFeed, "left")}
        {renderFeedWindow(rightFeed, "right")}
      </div>
    </div>
  );
};
