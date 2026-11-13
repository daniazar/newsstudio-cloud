import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate, OffthreadVideo, Audio } from "remotion";
import { RobustImg } from "../components/RobustImg";

const OUTRO_DATA: Record<string, { title: string; subtitle: string; icon: string; sfx?: string }> = {
  "subscribe": {
    title: "Subscribe for more",
    subtitle: "Daily Tech Updates",
    icon: "🔔",
    sfx: "https://www.myinstants.com/media/sounds/ding-sound-effect.mp3"
  },
  "next-time": {
    title: "See you next time",
    subtitle: "On Ruby Tech News",
    icon: "🎬",
    sfx: "https://www.myinstants.com/media/sounds/movie-projector.mp3"
  },
  "stay-curious": {
    title: "Stay Curious",
    subtitle: "Stay Informed. Goodbye!",
    icon: "🧠",
    sfx: "https://www.myinstants.com/media/sounds/magic-sparkle.mp3"
  }
};

interface OutroLayerProps {
  outroId?: string;
  aspectRatio: "horizontal" | "vertical" | "square";
  outroVideoSrc?: string;
  logoSrc?: string;
  primaryColor?: string;
}

export const OutroLayer: React.FC<OutroLayerProps> = ({ 
  outroId = "subscribe",
  aspectRatio,
  outroVideoSrc,
  logoSrc,
  primaryColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const data = OUTRO_DATA[outroId] || OUTRO_DATA["subscribe"];

  const scale = spring({
    fps,
    frame,
    config: { damping: 12, stiffness: 120 },
  });

  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });

  const isVertical = aspectRatio === "vertical";

  return (
    <AbsoluteFill style={{ 
      backgroundColor: "#0a0a0a",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100
    }}>
      {outroVideoSrc ? (
        <OffthreadVideo src={outroVideoSrc} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <>
          {/* SFX */}
          {frame === 5 && data.sfx && <Audio src={data.sfx} volume={0.5} />}

      <div style={{ 
        opacity,
        transform: `scale(${scale})`,
        textAlign: "center"
      }}>
        <div style={{
          fontSize: isVertical ? 120 : 160,
          marginBottom: 40,
          filter: `drop-shadow(0 0 30px ${primaryColor || "#10b981"}66)`
        }}>
          {logoSrc ? (
            <RobustImg src={logoSrc} style={{ width: isVertical ? "150px" : "200px", height: "auto", objectFit: "contain" }} />
          ) : (
            data.icon
          )}
        </div>
        
        <h2 style={{
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          fontSize: isVertical ? 56 : 72,
          fontWeight: 900,
          marginBottom: 10,
          textTransform: "uppercase",
          letterSpacing: "-0.02em"
        }}>
          {data.title}
        </h2>
        
        <p style={{
          color: primaryColor || "#10b981",
          fontFamily: "'Inter', sans-serif",
          fontSize: isVertical ? 28 : 36,
          fontWeight: "bold",
          letterSpacing: "0.05em"
        }}>
          {data.subtitle}
        </p>

        {/* Ruby Watermark */}
        {!logoSrc && (
          <div style={{
            marginTop: 80,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            justifyContent: "center",
            opacity: 0.6
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%", background: primaryColor || "#10b981",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: "bold", fontSize: 18
            }}>R</div>
            <span style={{ color: "#fff", fontWeight: "bold", fontSize: 20 }}>Ruby Tech</span>
          </div>
        )}
      </div>
      </>
      )}
    </AbsoluteFill>
  );
};
