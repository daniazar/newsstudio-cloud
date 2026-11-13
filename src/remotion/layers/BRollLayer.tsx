import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  OffthreadVideo,
  interpolate,
  Easing,
  Sequence,
} from "remotion";
import type { RemotionSegment } from "@/lib/types";
import { RobustImg } from "../components/RobustImg";
import { resolveSrc } from "../utils/resolveSrc";

interface BRollLayerProps {
  segments: RemotionSegment[];
  globalBgVideoSrc?: string;
  showGlobalBg?: boolean;
}

export const BRollLayer: React.FC<BRollLayerProps> = ({
  segments,
  globalBgVideoSrc,
  showGlobalBg = false,
}) => {
  const { fps } = useVideoConfig();
  const transitionDuration = Math.round(fps * 0.5);
  const [hasGlobalBgError, setHasGlobalBgError] = React.useState(false);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#0a0a0a",
      }}
    >
      {/* Global background video */}
      {showGlobalBg && globalBgVideoSrc && !hasGlobalBgError && (
        <OffthreadVideo
          src={resolveSrc(globalBgVideoSrc)}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
          muted
          onError={() => setHasGlobalBgError(true)}
        />
      )}

      {segments.map((seg, i) => {
        // Keep mounted longer so the next segment can fade in over it
        const extendBy = i < segments.length - 1 ? transitionDuration : 0;
        const duration = Math.max(1, Math.round((seg.endFrame - seg.startFrame) + extendBy));
        
        return (
          <Sequence
            key={`broll-${seg.index}-${seg.personaId || 'default'}`}
            from={seg.startFrame}
            durationInFrames={duration}
          >
            <AnimatedBRoll segment={seg} />
          </Sequence>
        );
      })}

      {/* Subtle cinematic edge vignette for depth and contrast */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)",
          zIndex: 10,
        }}
      />
    </div>
  );
};

const AnimatedBRoll: React.FC<{ segment: RemotionSegment }> = ({ segment }) => {
  const frame = useCurrentFrame(); // Starts at 0 for this sequence
  const { width, fps } = useVideoConfig();
  const transitionDuration = Math.round(fps * 0.5);

  const getTransitionStyle = (): React.CSSProperties => {
    const type = segment.transitionType || "fade";
    const progress = interpolate(frame, [0, transitionDuration], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });

    const style: React.CSSProperties = { opacity: progress };

    if (type === "slide" && frame < transitionDuration) {
      const x = interpolate(progress, [0, 1], [width, 0]);
      style.transform = `translateX(${x}px)`;
    } else if (type === "zoom" && frame < transitionDuration) {
      const s = interpolate(progress, [0, 1], [1.35, 1]);
      style.transform = `scale(${s})`;
    } else if ((type === "blur_dissolve" || type === "glitch") && frame < transitionDuration) {
      const b = interpolate(progress, [0, 1], [16, 0]);
      const bright = interpolate(progress, [0, 0.4, 1], [1.8, 1.3, 1]);
      style.filter = `blur(${b}px) brightness(${bright})`;
    }

    return style;
  };

  const transitionStyle = getTransitionStyle();
  const userScale = segment.mediaSettings?.scale ?? 1;
  const offsetX = segment.mediaSettings?.offsetX ?? 0;
  const offsetY = segment.mediaSettings?.offsetY ?? 0;
  
  // Multi-mode alternating or explicit Ken Burns motion
  const isImage = segment.bRollType === "image";
  const segDuration = Math.max(1, segment.endFrame - segment.startFrame);
  const motionProgress = interpolate(frame, [0, segDuration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });

  const kbDir = segment.mediaSettings?.kenBurnsDirection;
  let startScale = 1.0;
  let endScale = 1.08;
  let startX = 0;
  let endX = 0;
  let startY = 0;
  let endY = 0;

  if (kbDir === "push_in") {
    startScale = 1.0;
    endScale = 1.12;
  } else if (kbDir === "pull_out") {
    startScale = 1.12;
    endScale = 1.01;
  } else if (kbDir === "pan_left") {
    startScale = 1.06;
    endScale = 1.06;
    startX = 3.0;
    endX = -3.0;
  } else if (kbDir === "pan_right") {
    startScale = 1.06;
    endScale = 1.06;
    startX = -3.0;
    endX = 3.0;
  } else if (kbDir === "tilt_up") {
    startScale = 1.06;
    endScale = 1.06;
    startY = 3.0;
    endY = -3.0;
  } else if (kbDir === "static") {
    startScale = 1.0;
    endScale = 1.0;
  } else {
    // Cycle camera motion style across segments (Push-In, Pull-Out, Drift-Down, Drift-Up)
    const motionPattern = segment.index % 4;
    if (motionPattern === 0) {
      startScale = 1.0;
      endScale = 1.08;
      startX = -1.2;
      endX = 1.2;
    } else if (motionPattern === 1) {
      startScale = 1.08;
      endScale = 1.01;
      startX = 1.2;
      endX = -1.2;
    } else if (motionPattern === 2) {
      startScale = 1.02;
      endScale = 1.09;
      startY = -1.5;
      endY = 1.5;
    } else {
      startScale = 1.0;
      endScale = 1.07;
    }
  }

  const animScale = isImage && userScale === 1 ? interpolate(motionProgress, [0, 1], [startScale, endScale]) : userScale;
  const animX = isImage ? interpolate(motionProgress, [0, 1], [startX, endX]) : 0;
  const animY = isImage ? interpolate(motionProgress, [0, 1], [startY, endY]) : 0;

  const baseTransform = `scale(${animScale}) translate(${offsetX + animX}%, ${offsetY + animY}%)`;
  
  const combinedStyle: React.CSSProperties = {
    ...transitionStyle,
    position: "absolute",
    width: "100%",
    height: "100%",
    objectFit: segment.mediaSettings?.objectFit === "contain" ? "contain" : "cover",
    transform: (transitionStyle.transform || "") + " " + baseTransform,
  };

  const [hasVideoError, setHasVideoError] = React.useState(false);

  if (segment.bRollType === "video" && segment.bRollSrc && !hasVideoError) {
    const startFrom = segment.mediaSettings?.startTrim 
      ? Math.round(segment.mediaSettings.startTrim * fps)
      : undefined;
    const endAt = segment.mediaSettings?.endTrim 
      ? Math.round(segment.mediaSettings.endTrim * fps)
      : undefined;

    return (
      <OffthreadVideo
        src={resolveSrc(segment.bRollSrc)}
        startFrom={startFrom}
        endAt={endAt}
        style={combinedStyle}
        muted={segment.sceneStrategy !== "full"}
        onError={() => setHasVideoError(true)}
      />
    );
  }

  if (segment.bRollType === "image" && segment.bRollSrc) {
    // Robustly check if it's a webpage instead of an image
    const isWebpage = 
      segment.bRollSrc.includes("twitter.com") || 
      segment.bRollSrc.includes("x.com") || 
      segment.bRollSrc.includes("youtube.com") ||
      segment.bRollSrc.includes("vimeo.com") ||
      segment.bRollSrc.includes("facebook.com") ||
      segment.bRollSrc.includes("instagram.com") ||
      segment.bRollSrc.includes("/status/") ||
      segment.bRollSrc.includes(".html") ||
      segment.bRollSrc.includes("/page/");

    if (!isWebpage) {
      return (
        <RobustImg
          src={resolveSrc(segment.bRollSrc)}
          style={combinedStyle}
        />
      );
    }
  }

  // Placeholder: animated gradient
  return <PlaceholderGradient frame={frame} segment={segment} opacity={Number(transitionStyle.opacity ?? 1)} />;
};

const PlaceholderGradient: React.FC<{ frame: number; segment: RemotionSegment; opacity: number }> = ({ 
  frame, 
  segment, 
  opacity 
}) => {
  const rotation = interpolate(frame % 300, [0, 300], [0, 360]);
  
  return (
    <div
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        opacity,
        background: `linear-gradient(${rotation}deg, #111827, #1f2937, #111827)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
        textAlign: "center",
      }}
    >
      <div style={{
        fontSize: "24px",
        color: "rgba(255,255,255,0.4)",
        fontWeight: "bold",
        marginBottom: "20px",
        textTransform: "uppercase",
        letterSpacing: "0.1em"
      }}>
        Scene {segment.index + 1}
      </div>
      <div style={{
        fontSize: "18px",
        color: "rgba(255,255,255,0.2)",
        fontStyle: "italic",
        maxWidth: "80%"
      }}>
        &quot;{segment.imagePrompt}&quot;
      </div>
    </div>
  );
};
