import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig, OffthreadVideo } from "remotion";
import { RobustImg } from "../components/RobustImg";
import { resolveSrc } from "../utils/resolveSrc";

export interface DebateSpeakerFeed {
  id: string;
  name: string;
  role: string;
  stance: string; // e.g. "BULL CASE • AGENTIC AI", "BEAR CASE • RISK FACTOR", "MODERATOR • HOST"
  location: string; // e.g. "STUDIO 1 • NEW YORK", "BUREAU • SILICON VALLEY"
  avatarUrl?: string;
  videoSrc?: string;
  imageSrc?: string;
  isSpeaking?: boolean;
  accentColor?: string; // e.g. "#22d3ee" (cyan), "#10b981" (emerald), "#f43f5e" (rose), "#a855f7" (purple)
  latencyMs?: number;
}

export interface DebateMultiBoxLayerProps {
  speakers: DebateSpeakerFeed[]; // 2 or 3 speakers
  activeSpeakerId?: string;
  topicHeadline?: string;
  roundBadgeText?: string;
  aspectRatio?: "horizontal" | "vertical";
  showVuMeters?: boolean;
}

export const DEFAULT_DEBATE_SPEAKERS_2WAY: DebateSpeakerFeed[] = [
  {
    id: "ruby",
    name: "Ruby Vance",
    role: "Chief Technology Anchor",
    stance: "PRO • AUTONOMOUS AGENTS",
    location: "STUDIO 1 • NEW YORK",
    avatarUrl: "/avatars/ruby.png",
    accentColor: "#10b981",
    isSpeaking: true,
    latencyMs: 12,
  },
  {
    id: "tomas",
    name: "Tomás Rossi",
    role: "Senior AI Safety Fellow",
    stance: "CON • HUMAN SUPERVISION",
    location: "BUREAU • LONDON",
    avatarUrl: "/avatars/tomas.png",
    accentColor: "#f43f5e",
    isSpeaking: false,
    latencyMs: 28,
  },
];

export const DEFAULT_DEBATE_SPEAKERS_3WAY: DebateSpeakerFeed[] = [
  {
    id: "ruby",
    name: "Ruby Vance",
    role: "Host & Moderator",
    stance: "NEUTRAL • MODERATOR",
    location: "MAIN DESK • NY",
    avatarUrl: "/avatars/ruby.png",
    accentColor: "#22d3ee",
    isSpeaking: false,
    latencyMs: 10,
  },
  {
    id: "mateo",
    name: "Mateo Rossi",
    role: "Bull Analyst",
    stance: "BULL • EXPONENTIAL SCALE",
    location: "BUREAU • SILICON VALLEY",
    avatarUrl: "/avatars/tomas.png",
    accentColor: "#10b981",
    isSpeaking: true,
    latencyMs: 18,
  },
  {
    id: "blaze",
    name: "Blaze Wilder",
    role: "Macro Strategist",
    stance: "BEAR • SYSTEMIC BUBBLE",
    location: "EXCHANGE • TOKYO",
    avatarUrl: "/avatars/blaze.png",
    accentColor: "#f43f5e",
    isSpeaking: false,
    latencyMs: 34,
  },
];

/**
 * Calculates dynamic active speaker glow styling based on speech state and timeline frame.
 */
export function calculateDebateSpeakerGlow(
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
      borderColor: "rgba(255, 255, 255, 0.14)",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
      opacity: 0.85,
      scale: 1.0,
    };
  }

  // Dynamic pulsing wave when active speaker is talking
  const pulse = Math.sin(frame * 0.28) * 0.5 + 0.5; // 0.0 to 1.0
  const glowSpread = 22 + pulse * 16; // 22px to 38px

  return {
    borderColor: accentColor,
    boxShadow: `0 0 ${glowSpread}px ${accentColor}80, inset 0 0 16px ${accentColor}33`,
    opacity: 1.0,
    scale: 1.008,
  };
}

/**
 * Calculates responsive energy heights for simulated broadcast VU meter bars.
 */
export function calculateDebateVuMeters(
  frame: number,
  isSpeaking = false,
  barCount = 5
): number[] {
  if (!isSpeaking) {
    return Array.from({ length: barCount }, () => 14);
  }

  const factors = [0.85, 1.3, 0.7, 1.15, 0.95, 1.45, 0.8];
  return Array.from({ length: barCount }, (_, idx) => {
    const factor = factors[idx % factors.length];
    const wave = Math.sin(frame * 0.4 * factor + idx * 1.3);
    const height = Math.min(100, Math.max(24, wave * 46 + 54));
    return Math.round(height);
  });
}

/**
 * Broadcast 2-Way and 3-Way Split Screen Multi-Box Layer.
 * Renders side-by-side (2-way) or tri-column (3-way) feeds with active speaker tracking,
 * live VU meters, chyrons, and topic HUD headers.
 */
export const DebateMultiBoxLayer: React.FC<DebateMultiBoxLayerProps> = ({
  speakers = DEFAULT_DEBATE_SPEAKERS_2WAY,
  activeSpeakerId,
  topicHeadline = "THE GREAT AI AGENT DEBATE • CLASH OF PERSPECTIVES",
  roundBadgeText = "ROUND 2 • CROSS-EXAMINATION",
  aspectRatio = "horizontal",
  showVuMeters = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const isVertical = aspectRatio === "vertical";
  const speakerList = speakers.slice(0, 3); // max 3
  const is3Way = speakerList.length === 3;

  // Entrance spring animation
  const entrance = spring({
    frame,
    fps,
    config: { damping: 16, stiffness: 130 },
  });

  const blink = Math.floor(frame / 15) % 2 === 0;

  const renderSpeakerBox = (speaker: DebateSpeakerFeed, index: number) => {
    const isSpeaking = activeSpeakerId
      ? speaker.id === activeSpeakerId
      : Boolean(speaker.isSpeaking);

    const accentColor = speaker.accentColor || (index === 0 ? "#22d3ee" : index === 1 ? "#10b981" : "#f43f5e");
    const glow = calculateDebateSpeakerGlow(isSpeaking, frame, accentColor);
    const vuBars = calculateDebateVuMeters(frame, isSpeaking, 5);

    const mediaSrc = speaker.videoSrc || speaker.imageSrc || speaker.avatarUrl;
    const isVideo = Boolean(speaker.videoSrc);

    return (
      <div
        key={speaker.id || `feed-${index}`}
        style={{
          position: "relative",
          flex: 1,
          height: "100%",
          minHeight: isVertical ? (is3Way ? "210px" : "280px") : "auto",
          borderRadius: isVertical ? "14px" : "18px",
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
        {/* Presenter Video or Image Feed */}
        {mediaSrc ? (
          isVideo ? (
            <OffthreadVideo
              src={resolveSrc(mediaSrc)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <RobustImg
              src={mediaSrc}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          )
        ) : (
          <div className="w-full h-full bg-zinc-950 flex items-center justify-center text-zinc-600 font-mono text-xs">
            NO SATELLITE SIGNAL
          </div>
        )}

        {/* Broadcast Scanline Texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            opacity: 0.12,
            backgroundImage: "linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.5) 50%)",
            backgroundSize: "100% 4px",
          }}
        />

        {/* Top Location & Transmission HUD */}
        <div
          style={{
            position: "absolute",
            top: isVertical ? "8px" : "12px",
            left: isVertical ? "8px" : "12px",
            right: isVertical ? "8px" : "12px",
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
              gap: "6px",
              padding: "3px 8px",
              borderRadius: "6px",
              backgroundColor: "rgba(0, 0, 0, 0.85)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              fontSize: "9px",
              fontFamily: "monospace",
              fontWeight: 800,
              letterSpacing: "0.06em",
              color: "#ffffff",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: isSpeaking ? accentColor : "#ef4444",
                boxShadow: blink ? `0 0 8px ${isSpeaking ? accentColor : "#ef4444"}` : "none",
                opacity: blink ? 1 : 0.4,
              }}
            />
            <span>{speaker.location}</span>
          </div>

          {/* Stance Indicator Badge */}
          <div
            style={{
              padding: "2px 7px",
              borderRadius: "5px",
              backgroundColor: `${accentColor}22`,
              border: `1px solid ${accentColor}55`,
              color: accentColor,
              fontSize: "8.5px",
              fontFamily: "monospace",
              fontWeight: 900,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {speaker.stance}
          </div>
        </div>

        {/* Dynamic VU Meter Bar on Active Speaking */}
        {showVuMeters && isSpeaking && (
          <div
            style={{
              position: "absolute",
              bottom: isVertical ? "64px" : "74px",
              right: isVertical ? "10px" : "14px",
              display: "flex",
              alignItems: "flex-end",
              gap: "3px",
              height: "22px",
              padding: "4px 5px",
              borderRadius: "6px",
              backgroundColor: "rgba(0, 0, 0, 0.82)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              zIndex: 10,
            }}
          >
            {vuBars.map((heightPct, idx) => (
              <div
                key={idx}
                style={{
                  width: "3.5px",
                  height: `${heightPct}%`,
                  borderRadius: "1px",
                  backgroundColor:
                    heightPct > 80 ? "#ef4444" : heightPct > 55 ? "#f59e0b" : accentColor,
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
            bottom: isVertical ? "8px" : "12px",
            left: isVertical ? "8px" : "12px",
            right: isVertical ? "8px" : "12px",
            padding: isVertical ? "6px 10px" : "9px 12px",
            borderRadius: "10px",
            background: "linear-gradient(90deg, rgba(0, 0, 0, 0.95) 0%, rgba(12, 16, 26, 0.88) 75%, transparent 100%)",
            borderLeft: `4px solid ${isSpeaking ? accentColor : "rgba(255, 255, 255, 0.3)"}`,
            backdropFilter: "blur(12px)",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#ffffff", fontWeight: 800, fontSize: isVertical ? "12px" : "13.5px", letterSpacing: "0.02em" }}>
              {speaker.name}
            </span>
            {isSpeaking && (
              <span
                style={{
                  fontSize: "8.5px",
                  fontWeight: 900,
                  padding: "1px 5px",
                  borderRadius: "3px",
                  backgroundColor: `${accentColor}25`,
                  color: accentColor,
                  border: `1px solid ${accentColor}60`,
                  fontFamily: "monospace",
                  letterSpacing: "0.06em",
                }}
              >
                ON AIR
              </span>
            )}
          </div>
          <div
            style={{
              color: "#94a3b8",
              fontSize: isVertical ? "8.5px" : "9.5px",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginTop: "2px",
            }}
          >
            {speaker.role}
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
        padding: isVertical ? "16px 12px" : "24px 32px",
      }}
      className="font-sans select-none"
    >
      {/* Top Broadcast Header Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: isVertical ? "12px" : "16px",
          padding: "8px 16px",
          borderRadius: "14px",
          backgroundColor: "rgba(6, 9, 15, 0.88)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          boxShadow: "0 12px 36px rgba(0, 0, 0, 0.7)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
            LIVE DEBATE
          </span>
          <span
            style={{
              color: "#ffffff",
              fontWeight: 800,
              fontSize: isVertical ? "11px" : "13px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {topicHeadline}
          </span>
        </div>

        {!isVertical && (
          <div
            style={{
              color: "#22d3ee",
              fontFamily: "monospace",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "3px 10px",
              borderRadius: "6px",
              backgroundColor: "rgba(34, 211, 238, 0.12)",
              border: "1px solid rgba(34, 211, 238, 0.3)",
            }}
          >
            {roundBadgeText}
          </div>
        )}
      </div>

      {/* Multi-Box Feeds (Side-by-Side in 16:9, Stacked in 9:16) */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: isVertical ? "column" : "row",
          gap: isVertical ? "10px" : "18px",
          minHeight: 0,
        }}
      >
        {speakerList.map((speaker, idx) => renderSpeakerBox(speaker, idx))}
      </div>
    </div>
  );
};
