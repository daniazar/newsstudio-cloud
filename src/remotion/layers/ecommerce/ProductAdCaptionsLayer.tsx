/**
 * src/remotion/layers/ecommerce/ProductAdCaptionsLayer.tsx
 *
 * Dynamic Word-Illuminated Kinetic Captions Engine for E-Commerce Video Ads.
 * Accurately synchronizes with playback frame by frame, illuminating spoken words
 * in real-time with vibrant spring bounce, neon halo glow, and currency/number highlights.
 */

import React, { useMemo } from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { AdAspectRatio, AdCaptionStyle } from "@/lib/types/ecommerce";
import { stripAllInlineTags } from "@/lib/sfx/inlineSfxParser";

export interface TimedAdWord {
  word: string;
  startFrame: number;
  endFrame: number;
  cleanWord: string;
  isNumericOrCurrency: boolean;
  isPowerWord: boolean;
}

export interface AdWordChunk {
  words: TimedAdWord[];
  startFrame: number;
  endFrame: number;
}

export interface ProductAdCaptionsLayerProps {
  text: string;
  sceneStartFrame: number;
  sceneDurationFrames: number;
  /** Actual voiceover audio duration in frames (when shorter than scene, e.g. video scenes) */
  audioDurationFrames?: number;
  aspectRatio?: AdAspectRatio;
  accentColor?: string;
  styleType?: AdCaptionStyle;
  fontSize?: number;
  offsetY?: number;
  offsetX?: number;
}

export const ProductAdCaptionsLayer: React.FC<ProductAdCaptionsLayerProps> = ({
  text,
  sceneStartFrame,
  sceneDurationFrames,
  audioDurationFrames,
  aspectRatio = "9:16",
  accentColor = "#06b6d4",
  styleType = "kinetic_glow",
  fontSize,
  offsetY = 0,
  offsetX = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Strip inline speech tags: [sfx:...], [pause:...]
  const cleanText = useMemo(() => stripAllInlineTags(text || "").replace(/\s+/g, " ").trim(), [text]);

  // Determine chunk size based on aspect ratio (portrait needs fewer words per line)
  const wordsPerChunk = useMemo(() => {
    if (aspectRatio === "9:16") return 3;
    if (aspectRatio === "16:9") return 5;
    return 4;
  }, [aspectRatio]);

  // Compute character-weighted word timing across the scene duration
  const chunks = useMemo(() => {
    const rawWords = cleanText.split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return [];

    const totalChars = rawWords.reduce((acc, w) => acc + w.length, 0);
    // If actual audio duration is known (e.g. 5.6s audio in an 8.0s video scene),
    // synchronize captions precisely to the spoken audio duration rather than stretching.
    const speechFrames = audioDurationFrames && audioDurationFrames > 0
      ? Math.min(sceneDurationFrames, audioDurationFrames)
      : sceneDurationFrames;
    const effectiveFrames = Math.max(15, speechFrames - 10);
    const speechLeadFrames = 3;

    let accumulatedOffset = speechLeadFrames;
    const timedWords: TimedAdWord[] = [];
    for (const word of rawWords) {
      const wordWeight = word.length / totalChars;
      const wordDuration = Math.max(4, Math.round(wordWeight * effectiveFrames));
      const start = sceneStartFrame + accumulatedOffset;
      const end = start + wordDuration;
      accumulatedOffset += wordDuration;

      const cleanWord = word.toUpperCase().replace(/[^A-Z0-9$%]/g, "");
      const isNumericOrCurrency = /[0-9]|\$|%|€|£/.test(cleanWord);
      const isPowerWord = /^(OFF|SAVE|FREE|SALE|NUEVO|NEW|WATERPROOF|IMPERMEABLE|GARANTIZADO|GUARANTEED|BEST|TOP|EXCLUSIVE|TRANSFORM|CALIDAD|DESCUENTO)$/.test(
        cleanWord
      );

      timedWords.push({
        word,
        startFrame: start,
        endFrame: end,
        cleanWord,
        isNumericOrCurrency,
        isPowerWord,
      });
    }

    // Group words into punchy, high-retention chunks
    const result: AdWordChunk[] = [];
    for (let i = 0; i < timedWords.length; i += wordsPerChunk) {
      const slice = timedWords.slice(i, i + wordsPerChunk);
      result.push({
        words: slice,
        startFrame: slice[0].startFrame,
        endFrame: slice[slice.length - 1].endFrame,
      });
    }

    return result;
  }, [cleanText, sceneStartFrame, sceneDurationFrames, audioDurationFrames, wordsPerChunk]);

  // If captions are hidden or text is empty, do not render
  if (styleType === "hidden" || chunks.length === 0) return null;

  // Find the active chunk at the current playback frame (clears once speech has finished)
  const activeChunk = chunks.find((c) => frame >= c.startFrame - 4 && frame <= c.endFrame + 12);

  if (!activeChunk) return null;

  // Font sizing based on canvas orientation
  const resolvedFontSize =
    fontSize ||
    (aspectRatio === "9:16" ? 44 : aspectRatio === "16:9" ? 34 : 30);

  return (
    <div
      style={{
        position: "absolute",
        top: aspectRatio === "9:16" ? 155 : 75,
        left: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transform: `translate3d(${offsetX}px, ${offsetY}px, 0)`,
        pointerEvents: "none",
        zIndex: 42,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: aspectRatio === "9:16" ? "8px 12px" : "6px 10px",
          maxWidth: "94%",
          padding: styleType === "minimal_clean" ? "8px 16px" : undefined,
          backgroundColor:
            styleType === "minimal_clean" ? "rgba(9, 9, 11, 0.75)" : undefined,
          backdropFilter: styleType === "minimal_clean" ? "blur(8px)" : undefined,
          borderRadius: styleType === "minimal_clean" ? 30 : undefined,
          border:
            styleType === "minimal_clean"
              ? "1px solid rgba(255, 255, 255, 0.15)"
              : undefined,
        }}
      >
        {activeChunk.words.map((tw, idx) => {
          const isActive = frame >= tw.startFrame && frame < tw.endFrame;
          const isSpoken = frame >= tw.endFrame;

          // Spring bounce animation when word triggers
          const wordSpring = spring({
            frame: Math.max(0, frame - tw.startFrame),
            fps,
            config: { damping: 11, stiffness: 220 },
            durationInFrames: 8,
          });

          const scale = isActive
            ? interpolate(wordSpring, [0, 1], [0.85, 1.22])
            : isSpoken
            ? 1.0
            : 0.94;

          // Subtle energetic tilt for active word
          const tiltDeg = isActive ? (idx % 2 === 0 ? -2.5 : 2.5) * (1 - wordSpring) : 0;

          // Accent color resolution:
          // Numeric/Currency words get vibrant Emerald (#10b981)
          // Power words get the brand Accent Color (#06b6d4, etc.)
          // Standard active words get Golden Yellow (#facc15) or Beast Cyan (#22d3ee)
          let activeGlowColor = "#facc15";
          if (tw.isNumericOrCurrency) {
            activeGlowColor = "#10b981";
          } else if (tw.isPowerWord) {
            activeGlowColor = accentColor || "#06b6d4";
          } else if (styleType === "beast_pop") {
            activeGlowColor = "#22d3ee";
          } else if (styleType === "karaoke_flow") {
            activeGlowColor = accentColor || "#06b6d4";
          }

          // Compute specific styles per theme
          let textColor = isActive ? activeGlowColor : isSpoken ? "#ffffff" : "rgba(255, 255, 255, 0.38)";
          let textShadow = "0 3px 12px rgba(0, 0, 0, 0.9), 0 1px 3px rgba(0, 0, 0, 0.8)";
          let backgroundColor = "transparent";
          let boxShadow = "none";
          let border = "1px solid transparent";
          let padding = "2px 6px";
          let borderRadius = 6;

          if (styleType === "beast_pop") {
            textColor = isActive ? "#000000" : isSpoken ? "#ffffff" : "rgba(255, 255, 255, 0.4)";
            backgroundColor = isActive ? activeGlowColor : "rgba(0, 0, 0, 0.65)";
            boxShadow = isActive
              ? `0 0 24px ${activeGlowColor}aa, 0 4px 14px rgba(0,0,0,0.9)`
              : "0 2px 6px rgba(0,0,0,0.6)";
            border = isActive ? "2px solid #ffffff" : "1px solid rgba(255, 255, 255, 0.15)";
            padding = "4px 10px";
            borderRadius = 8;
          } else if (styleType === "kinetic_glow") {
            if (isActive) {
              textShadow = `0 0 24px ${activeGlowColor}, 0 4px 12px rgba(0,0,0,0.95), 0 0 2px #000000`;
              backgroundColor = "rgba(0, 0, 0, 0.55)";
              boxShadow = `0 0 16px ${activeGlowColor}55`;
              border = `1px solid ${activeGlowColor}88`;
              padding = "3px 8px";
              borderRadius = 8;
            }
          } else if (styleType === "karaoke_flow") {
            if (isActive) {
              textShadow = `0 0 20px ${activeGlowColor}dd, 0 2px 6px rgba(0,0,0,0.9)`;
              backgroundColor = "rgba(0, 0, 0, 0.4)";
              borderRadius = 6;
              padding = "2px 6px";
            }
          }

          return (
            <span
              key={`${activeChunk.startFrame}-${idx}`}
              style={{
                fontFamily:
                  styleType === "beast_pop"
                    ? "'Arial Black', 'Impact', sans-serif"
                    : "'Montserrat', 'Inter', system-ui, -apple-system, sans-serif",
                fontSize: `${resolvedFontSize}px`,
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: styleType === "beast_pop" ? "0.02em" : "-0.5px",
                lineHeight: 1.15,
                color: textColor,
                textShadow,
                backgroundColor,
                boxShadow,
                border,
                padding,
                borderRadius,
                transform: `scale(${scale}) rotate(${tiltDeg}deg)`,
                display: "inline-block",
                transition: "color 0.08s ease, transform 0.05s ease-out",
                WebkitTextStroke:
                  styleType === "kinetic_glow" && isActive
                    ? "1px rgba(0,0,0,0.8)"
                    : styleType === "beast_pop" && !isActive
                    ? "1.5px #000000"
                    : undefined,
              }}
            >
              {tw.word}
            </span>
          );
        })}
      </div>
    </div>
  );
};
