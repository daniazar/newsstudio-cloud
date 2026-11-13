/**
 * Captions Layer — Word-by-word animated text overlay.
 * High-retention TikTok-style captions with highlight animation.
 * Positioning adapts to vertical (center-bottom) or horizontal (lower third).
 */

import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import type { RemotionSegment, AspectRatio } from "../../lib/types";

interface CaptionsLayerProps {
  segments: RemotionSegment[];
  aspectRatio: AspectRatio;
  captionStyle?: string;
  primaryColor?: string;
  secondaryColor?: string;
  /** Dual-language subtitles toggle: renders secondary translation under primary kinetic captions */
  enableDualCaptions?: boolean;
  /** Secondary subtitle custom color */
  secondaryCaptionColor?: string;
}

interface TimedWord {
  word: string;
  startFrame: number;
  endFrame: number;
  cleanWord: string;
  isNumberOrMoney: boolean;
  isPowerWord: boolean;
}

const POWER_WORD_REGEX = /^(AI|NEW|RECORD|CRITICAL|MASSIVE|GROUNDBREAKING|SONY|APPLE|NVIDIA|GOOGLE|BREAKING|EXCLUSIVE|REVOLUTION)$/;
const NUMBER_OR_MONEY_REGEX = /[0-9]|\$|%|€|£/;

function getTimedWords(
  text: string,
  segmentStartFrame: number,
  segmentEndFrame: number
): TimedWord[] {
  const cleanText = (text || "").replace(/\[.*?\]/g, "").replace(/\s+/g, " ").trim();
  const words = cleanText.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [];

  const totalFrames = segmentEndFrame - segmentStartFrame;
  // Weight words by their length to better approximate speech time
  const wordLengths = words.map((w) => w.length);
  const totalChars = wordLengths.reduce((acc, len) => acc + len, 0);

  let currentFrame = segmentStartFrame;
  return words.map((word, i) => {
    const wordWeight = word.length / totalChars;
    const durationFrames = wordWeight * totalFrames;
    const startFrame = Math.round(currentFrame);
    const endFrame = Math.round(currentFrame + durationFrames);
    currentFrame += durationFrames;

    const cleanWord = word.toUpperCase().replace(/[^A-Z0-9$%]/g, "");
    const isNumberOrMoney = NUMBER_OR_MONEY_REGEX.test(cleanWord);
    const isPowerWord = POWER_WORD_REGEX.test(cleanWord);

    return {
      word,
      startFrame,
      endFrame: i === words.length - 1 ? segmentEndFrame : endFrame, // Ensure last word ends exactly at segment end
      cleanWord,
      isNumberOrMoney,
      isPowerWord,
    };
  });
}

export const CaptionsLayer: React.FC<CaptionsLayerProps> = ({
  segments,
  aspectRatio,
  captionStyle = "beast",
  primaryColor,
  secondaryColor,
  enableDualCaptions,
  secondaryCaptionColor,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Precompute timed words for all segments once, avoiding recalculation on every frame
  const timedWordsBySegment = React.useMemo(() => {
    const map = new Map<number, TimedWord[]>();
    for (const seg of segments) {
      map.set(
        seg.startFrame,
        getTimedWords(seg.text, seg.startFrame, seg.endFrame)
      );
    }
    return map;
  }, [segments]);

  // Find current segment
  const currentSegment = segments.find(
    (seg) => frame >= seg.startFrame && frame < seg.endFrame
  );

  if (!currentSegment) return null;

  const timedWords = timedWordsBySegment.get(currentSegment.startFrame) || [];

  // Show a window of words around the current position (for context)
  const currentWordIndex = timedWords.findIndex(
    (w) => frame >= w.startFrame && frame < w.endFrame
  );

  // Show 4-6 words at a time
  const windowSize = captionStyle === "breaking" ? 20 : 5;
  const windowStart = captionStyle === "breaking" 
    ? 0 
    : Math.max(0, Math.floor(currentWordIndex / windowSize) * windowSize);
  const windowEnd = Math.min(timedWords.length, windowStart + windowSize);
  const visibleWords = timedWords.slice(windowStart, windowEnd);

  const isVertical = aspectRatio === "vertical";
  const isSquare = aspectRatio === "square";
  
  // Secondary translation subtitle if present on current segment
  const secondarySubtitle = currentSegment.secondaryText?.trim();
  const showSecondary = enableDualCaptions !== false && Boolean(secondarySubtitle);
  
  // Ticker animation for breaking style
  const scrollOffset = captionStyle === "breaking"
    ? interpolate(
        frame - currentSegment.startFrame,
        [0, currentSegment.endFrame - currentSegment.startFrame],
        [width * 0.8, -width * 1.5] // Start from right, scroll left
      )
    : 0;

  // Position: lower section of the frame adapted for vertical, square, and horizontal
  let containerStyle: React.CSSProperties = {
    position: "absolute",
    left: isVertical ? 40 : isSquare ? 60 : width * 0.1,
    right: isVertical ? 40 : isSquare ? 60 : width * 0.1,
    bottom: isVertical ? height * 0.38 : isSquare ? 120 : 320,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: isVertical ? "12px" : isSquare ? "10px" : "8px",
    zIndex: 20,
  };

  if (captionStyle === "minimal") {
    containerStyle = {
      ...containerStyle,
      bottom: isVertical ? height * 0.38 : isSquare ? 90 : 200,
      justifyContent: "center",
    };
  } else if (captionStyle === "breaking") {
    containerStyle = {
      ...containerStyle,
      bottom: 0,
      left: 0,
      right: 0,
      width: "100%",
      backgroundColor: primaryColor || "#10b981",
      padding: "15px 0",
      justifyContent: "flex-start",
      flexWrap: "nowrap",
      overflow: "hidden",
      borderTop: "4px solid white",
      flexDirection: "row",
    };
  }

  return (
    <div style={containerStyle}>
      <div 
        style={captionStyle === "breaking" ? {
          display: "flex",
          whiteSpace: "nowrap",
          transform: `translateX(${scrollOffset}px)`,
          gap: "40px"
        } : {
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: isVertical ? "8px 12px" : isSquare ? "7px 10px" : "6px 10px",
        }}
      >
        {visibleWords.map((timedWord, i) => {
          const isActive =
            frame >= timedWord.startFrame && frame < timedWord.endFrame;
          const isPast = frame >= timedWord.endFrame;

          // Kinetic spring bounce animation when word triggers
          const wordSpring = spring({
            frame: Math.max(0, frame - timedWord.startFrame),
            fps,
            config: { damping: 10, stiffness: 220 },
            durationInFrames: 10,
          });

          const wordProgress = isActive ? wordSpring : isPast ? 1 : 0;
          const wordScale = isActive
            ? interpolate(wordProgress, [0, 1], [0.88, 1.18])
            : 1;

          // Subtle kinetic tilt for active words (alternating left/right)
          const tiltDeg = isActive ? ((i % 2 === 0 ? -2.5 : 2.5) * (1 - wordProgress)) : 0;

          // Entity & keyword detection for special accent colors (precomputed)
          const { isNumberOrMoney, isPowerWord } = timedWord;

          let fontSize = isVertical ? 50 : isSquare ? 42 : 38;
          if (captionStyle === "minimal") fontSize = isVertical ? 32 : isSquare ? 28 : 24;
          if (captionStyle === "breaking") fontSize = isVertical ? 40 : isSquare ? 36 : 32;
          if (captionStyle === "tiktok") fontSize = isVertical ? 48 : isSquare ? 42 : 36;
          if (captionStyle === "karaoke") fontSize = isVertical ? 58 : isSquare ? 48 : 42;

          let color = isActive ? "#ffffff" : isPast ? "#e2e8f0" : "rgba(255,255,255,0.45)";
          
          if (isActive) {
            if (isNumberOrMoney) {
              color = "#10B981"; // Emerald Green for stats/money
            } else if (isPowerWord) {
              color = primaryColor || "#00F0FF"; // Brand Cyan / Neon Blue
            } else if (captionStyle === "beast") {
              color = secondaryColor || "#FBBF24"; // Beast Gold
            } else if (captionStyle === "karaoke") {
              color = primaryColor || "#00F0FF";
            } else {
              color = "#FFFFFF";
            }
          }

          let textShadow = "0 3px 12px rgba(0,0,0,0.85), -2px -2px 0 rgba(0,0,0,0.9), 2px -2px 0 rgba(0,0,0,0.9), -2px 2px 0 rgba(0,0,0,0.9), 2px 2px 0 rgba(0,0,0,0.9)";
          if (isActive && (isNumberOrMoney || isPowerWord)) {
            textShadow = `0 0 24px ${color}aa, ${textShadow}`;
          }

          return (
            <span
              key={`${windowStart}-${i}`}
              style={{
                fontFamily: (captionStyle === "beast" || captionStyle === "tiktok" || captionStyle === "karaoke") ? "'Kanit', 'Inter', sans-serif" : "'Inter', 'SF Pro Display', sans-serif",
                fontSize,
                fontWeight: 900,
                color,
                textShadow,
                transform: `scale(${wordScale}) rotate(${tiltDeg}deg)`,
                backgroundColor: isActive
                  ? "rgba(0, 0, 0, 0.45)"
                  : "transparent",
                boxShadow: isActive && (isNumberOrMoney || isPowerWord)
                  ? `0 0 16px ${color}44`
                  : undefined,
                padding: isActive ? "4px 10px" : "4px 3px",
                borderRadius: 8,
                display: "inline-block",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                transition: "color 0.1s ease",
              }}
            >
              {timedWord.word}
            </span>
          );
        })}
      </div>

      {/* Secondary Subtitle Bar (Dual-Language Captions) */}
      {showSecondary && secondarySubtitle && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            width: "100%",
            marginTop: isVertical ? 14 : isSquare ? 10 : 8,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(10, 15, 25, 0.82)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              borderRadius: isVertical ? 14 : 10,
              padding: isVertical ? "8px 22px" : isSquare ? "6px 18px" : "5px 16px",
              maxWidth: isVertical ? "92%" : isSquare ? "88%" : "80%",
              textAlign: "center",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.6), 0 0 12px rgba(0,0,0,0.35)",
            }}
          >
            <span
              style={{
                fontFamily: "'Inter', 'SF Pro Display', -apple-system, sans-serif",
                fontSize: isVertical ? 26 : isSquare ? 23 : 20,
                fontWeight: 500,
                color: secondaryCaptionColor || "rgba(255, 255, 255, 0.94)",
                letterSpacing: "0.02em",
                lineHeight: 1.35,
                fontStyle: "italic",
                textShadow: "0 2px 5px rgba(0, 0, 0, 0.9)",
              }}
            >
              {secondarySubtitle}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
