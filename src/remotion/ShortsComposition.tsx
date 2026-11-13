import React from "react";
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig, OffthreadVideo, spring, interpolate } from "remotion";
import { KineticCaptionsLayer, CaptionStyleType } from "./layers/KineticCaptionsLayer";
import { DynamicOverlaysLayer } from "./layers/DynamicOverlaysLayer";
import { RobustImg } from "./components/RobustImg";
import { resolveSrc } from "./utils/resolveSrc";
import type { RemotionSegment } from "@/lib/types";
export interface ShortsCompositionProps {
  hookHeadline?: string;
  hookBadge?: string;
  captionStyle?: CaptionStyleType;
  videoSrc?: string;
  imageSrc?: string;
  audioSrc?: string;
  bgMusicSrc?: string;
  bgMusicVolume?: number;
  segments?: RemotionSegment[];
  channelHandle?: string;
  primaryColor?: string;
  transcriptText?: string;
}

export const ShortsComposition: React.FC<ShortsCompositionProps> = ({
  hookHeadline = "THIS CHANGES EVERYTHING",
  hookBadge = "🚨 BREAKING REPORT",
  captionStyle = "hormozi_glow",
  videoSrc,
  imageSrc = "/avatars/ruby.png",
  audioSrc,
  bgMusicSrc,
  bgMusicVolume = 0.2,
  segments = [],
  channelHandle = "@RubyNewsAI",
  primaryColor = "#fde047",
  transcriptText,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Active text across segments or explicit transcript
  const currentText =
    transcriptText ||
    segments.find((s) => frame >= s.startFrame && frame < s.endFrame)?.text ||
    segments[0]?.text ||
    hookHeadline;

  // Header Hook Spring Entrance
  const hookSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 90 },
  });

  const hookSlideY = interpolate(hookSpring, [0, 1], [-100, 0]);
  const hookOpacity = interpolate(hookSpring, [0, 1], [0, 1]);

  // Progress Bar Width
  const progressPct = (frame / Math.max(1, durationInFrames)) * 100;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000000", fontFamily: "sans-serif" }}>
      {/* 1. Main Background / Video Feed (Centered 9:16) */}
      <AbsoluteFill>
        {videoSrc ? (
          <OffthreadVideo
            src={resolveSrc(videoSrc)}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <RobustImg
            src={imageSrc}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}
        {/* Cinematic Vignette Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 80%, rgba(0,0,0,0.95) 100%)",
          }}
        />
      </AbsoluteFill>

      {/* 2. Top Viral Hook Banner */}
      <div
        style={{
          position: "absolute",
          top: "60px",
          left: "24px",
          right: "24px",
          transform: `translateY(${hookSlideY}px)`,
          opacity: hookOpacity,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          zIndex: 40,
        }}
      >
        {/* Top Mini Tag */}
        <div
          style={{
            background: "rgba(239, 68, 68, 0.9)",
            color: "#ffffff",
            fontSize: "12px",
            fontWeight: 900,
            padding: "4px 14px",
            borderRadius: "20px",
            letterSpacing: "0.08em",
            boxShadow: "0 0 20px rgba(239, 68, 68, 0.6)",
            fontFamily: "monospace",
          }}
        >
          {hookBadge}
        </div>

        {/* Main Hook Headline */}
        <h1
          style={{
            color: "#ffffff",
            fontSize: "32px",
            fontWeight: 900,
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: "-0.01em",
            lineHeight: 1.1,
            textShadow: "0 4px 20px rgba(0,0,0,0.9), 0 0 30px rgba(253, 224, 71, 0.3)",
            maxWidth: "92%",
          }}
        >
          {hookHeadline}
        </h1>
      </div>

      {/* 3. On-the-Fly Dynamic Overlays Layer */}
      <DynamicOverlaysLayer
        segments={segments}
        introDuration={0}
        aspectRatio="vertical"
        showEqualizer={false}
      />

      {/* 4. Kinetic Word-by-Word Captions */}
      <KineticCaptionsLayer
        text={currentText}
        startFrame={0}
        durationFrames={durationInFrames}
        styleType={captionStyle}
        fontSize={48}
        bottomOffset={260}
      />

      {/* 5. Channel Handle / Watermark Tag */}
      <div
        style={{
          position: "absolute",
          bottom: "40px",
          left: "0",
          right: "0",
          textAlign: "center",
          color: "rgba(255, 255, 255, 0.7)",
          fontSize: "14px",
          fontWeight: 800,
          letterSpacing: "0.05em",
          fontFamily: "monospace",
          zIndex: 40,
        }}
      >
        {channelHandle}
      </div>

      {/* 6. Bottom Neon Progress Bar */}
      <div
        style={{
          position: "absolute",
          bottom: "0",
          left: "0",
          right: "0",
          height: "8px",
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          zIndex: 50,
        }}
      >
        <div
          style={{
            width: `${progressPct}%`,
            height: "100%",
            backgroundColor: primaryColor || "#fde047",
            boxShadow: `0 0 12px ${primaryColor || "#fde047"}`,
          }}
        />
      </div>

      {/* 7. Audio Tracks */}
      {audioSrc && <Audio src={resolveSrc(audioSrc)} />}
      {bgMusicSrc && <Audio src={resolveSrc(bgMusicSrc)} volume={bgMusicVolume} />}
    </AbsoluteFill>
  );
};
