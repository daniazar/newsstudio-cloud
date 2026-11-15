/**
 * Intro Layer — Animated branded intro.
 * Displays logo and slogan text with entrance animations.
 */

import React from "react";
import {
  AbsoluteFill,
  useVideoConfig,
  spring,
  interpolate,
  Audio,
  OffthreadVideo,
  useCurrentFrame,
} from "remotion";
import { RobustImg } from "../components/RobustImg";

import type { AspectRatio } from "../../lib/types";

export const SLOGANS: ReadonlyArray<{ id: string; text: string; icon: string; audio?: string }> = [
  { id: "ruby-tech", text: "Welcome to Ruby Tech News", icon: "💎" },
  { id: "daily-brief", text: "Your Daily Tech Briefing", icon: "⚡" },
  { id: "future-now", text: "The Future, Right Now", icon: "🚀" },
  { id: "dev-pulse", text: "Pulse of the Dev World", icon: "💻" },
  { id: "curiosity-gap", text: "Lo que nadie te contó hoy", icon: "💡" },
  { id: "emergency-alert", text: "¡Alerta máxima de último momento!", icon: "🚨" },
  { id: "data-shock", text: "Un número que cambió todo hoy", icon: "📊" },
  { id: "breaking-rioplatense", text: "Información exclusiva en vivo", icon: "🔥" },
];

interface IntroLayerProps {
  sloganId?: string;
  durationInFrames: number;
  introVideoSrc?: string;
  logoSrc?: string;
  primaryColor?: string;
  aspectRatio?: AspectRatio;
}

export const IntroLayer: React.FC<IntroLayerProps> = ({
  sloganId = "ruby-tech",
  durationInFrames,
  introVideoSrc,
  logoSrc,
  primaryColor,
  aspectRatio,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const isSquare = aspectRatio === "square" || width === height;
  const isVertical = aspectRatio === "vertical" || height > width;

  const slogan = SLOGANS.find((s) => s.id === sloganId) || SLOGANS[0];

  // Animations
  const entrance = spring({
    frame,
    fps,
    config: { damping: 12 },
  });

  const exit = spring({
    frame: frame - (durationInFrames - 15),
    fps,
    config: { damping: 12 },
  });

  const opacity = interpolate(frame, [0, 10, durationInFrames - 10, durationInFrames], [0, 1, 1, 0]);
  const scale = entrance - exit * 0.5;
  const yOffset = interpolate(entrance, [0, 1], [50, 0]);

  return (
    <AbsoluteFill
      style={{
        display: frame < durationInFrames ? "flex" : "none",
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 100,
      }}
    >
      {introVideoSrc ? (
        <OffthreadVideo src={introVideoSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <>
          {slogan.audio && (
            <Audio src={slogan.audio} volume={0.8} />
          )}
      <div
        style={{
          opacity,
          transform: `scale(${scale}) translateY(${yOffset}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
          {logoSrc ? (
            <RobustImg src={logoSrc} style={{ width: "200px", height: "auto", objectFit: "contain", filter: "drop-shadow(0 0 20px rgba(0,0,0,0.5))" }} />
          ) : (
            <div
              style={{
                fontSize: "120px",
                filter: `drop-shadow(0 0 30px ${primaryColor || "#10b981"}66)`,
              }}
            >
              {slogan.icon}
            </div>
          )}

        {/* Brand Name */}
        <h1
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: isSquare ? "52px" : isVertical ? "48px" : "64px",
            fontWeight: 900,
            color: "white",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            margin: 0,
            background: `linear-gradient(to right, ${primaryColor || "#10b981"}, #3b82f6)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            textAlign: "center",
          }}
        >
          RUBY STUDIO
        </h1>

        {/* Slogan */}
        <p
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: isSquare ? "26px" : isVertical ? "24px" : "32px",
            fontWeight: 500,
            color: "#94a3b8",
            margin: 0,
            textAlign: "center",
            maxWidth: isSquare ? "85%" : isVertical ? "90%" : "70%",
          }}
        >
          {slogan.text}
        </p>
      </div>
        </>
      )}

      {/* Decorative elements */}
      {!introVideoSrc && (
        <div
          style={{
            position: "absolute",
            bottom: "100px",
            height: "4px",
            width: interpolate(frame, [0, durationInFrames], [0, 400]),
            backgroundColor: primaryColor || "#10b981",
            borderRadius: "2px",
            opacity: 0.5,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
