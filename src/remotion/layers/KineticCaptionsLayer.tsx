import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { stripAllInlineTags } from "@/lib/sfx/inlineSfxParser";

export type CaptionStyleType = "hormozi_glow" | "beast_pop" | "cyber_neon" | "minimal_clean";

export interface TimedWord {
  word: string;
  startFrame: number;
  endFrame: number;
}

export interface WordChunk {
  words: TimedWord[];
  startFrame: number;
  endFrame: number;
}

export interface KineticCaptionsLayerProps {
  text: string;
  startFrame?: number;
  durationFrames?: number;
  styleType?: CaptionStyleType;
  wordsPerChunk?: number; // default: 4
  fontSize?: number;
  bottomOffset?: number;
}

export const KineticCaptionsLayer: React.FC<KineticCaptionsLayerProps> = ({
  text,
  startFrame = 0,
  durationFrames = 180,
  styleType = "hormozi_glow",
  wordsPerChunk = 4,
  fontSize = 44,
  bottomOffset = 220,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Strip all inline tags from caption display
  const clean = useMemo(() => stripAllInlineTags(text), [text]);

  // Compute word timing across the segment
  const chunks = useMemo(() => {
    const rawWords = clean.split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return [];

    const framesPerWord = Math.max(3, durationFrames / rawWords.length);
    const timedWords: TimedWord[] = rawWords.map((word, i) => ({
      word: word.toUpperCase(),
      startFrame: startFrame + Math.round(i * framesPerWord),
      endFrame: startFrame + Math.round((i + 1) * framesPerWord),
    }));

    // Group into chunks of 3-5 words
    const result: WordChunk[] = [];
    for (let i = 0; i < timedWords.length; i += wordsPerChunk) {
      const slice = timedWords.slice(i, i + wordsPerChunk);
      result.push({
        words: slice,
        startFrame: slice[0].startFrame,
        endFrame: slice[slice.length - 1].endFrame,
      });
    }

    return result;
  }, [clean, startFrame, durationFrames, wordsPerChunk]);

  // Find active chunk at current frame
  const activeChunk = chunks.find((c) => frame >= c.startFrame && frame <= c.endFrame + 4);

  if (!activeChunk) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 50 }}>
      <div
        style={{
          position: "absolute",
          bottom: `${bottomOffset}px`,
          left: "20px",
          right: "20px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px",
            maxWidth: "90%",
          }}
        >
          {activeChunk.words.map((tw, idx) => {
            const isSpoken = frame >= tw.startFrame;
            const isCurrentlyActive = frame >= tw.startFrame && frame < tw.endFrame;

            // Word Pop Spring Animation
            const wordSpring = spring({
              frame: Math.max(0, frame - tw.startFrame),
              fps,
              config: { damping: 10, stiffness: 140 },
            });

            const scale = isCurrentlyActive
              ? interpolate(wordSpring, [0, 1], [0.8, 1.22])
              : isSpoken
              ? 1.0
              : 0.9;

            return (
              <span
                key={idx}
                style={{
                  ...getWordStyle(styleType, isCurrentlyActive, isSpoken, fontSize),
                  transform: `scale(${scale})`,
                  display: "inline-block",
                  transition: "transform 0.05s ease-out",
                }}
              >
                {tw.word}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Style Theme Formatter ───────────────────────────────────────────────────

function getWordStyle(
  style: CaptionStyleType,
  isActive: boolean,
  isSpoken: boolean,
  fontSize: number
): React.CSSProperties {
  switch (style) {
    case "hormozi_glow":
      return {
        fontSize: `${fontSize}px`,
        fontWeight: 900,
        fontFamily: "'Impact', 'Montserrat', -apple-system, sans-serif",
        letterSpacing: "0.02em",
        color: isActive ? "#fde047" : isSpoken ? "#ffffff" : "rgba(255, 255, 255, 0.4)",
        WebkitTextStroke: "2.5px #000000",
        textShadow: isActive
          ? "0 0 20px #facc15, 0 4px 10px rgba(0,0,0,0.9)"
          : "0 4px 10px rgba(0,0,0,0.9)",
      };

    case "beast_pop":
      return {
        fontSize: `${fontSize * 1.05}px`,
        fontWeight: 900,
        fontFamily: "'Arial Black', -apple-system, sans-serif",
        color: isActive ? "#22d3ee" : isSpoken ? "#ffffff" : "rgba(255, 255, 255, 0.35)",
        backgroundColor: isActive ? "#000000" : "transparent",
        padding: isActive ? "2px 8px" : "0px",
        borderRadius: "8px",
        border: isActive ? "2px solid #22d3ee" : "none",
        boxShadow: isActive ? "0 0 15px #22d3ee" : "none",
        textShadow: "0 3px 6px rgba(0,0,0,0.9)",
      };

    case "cyber_neon":
      return {
        fontSize: `${fontSize * 0.95}px`,
        fontWeight: 800,
        fontFamily: "monospace",
        color: isActive ? "#4ade80" : isSpoken ? "#06b6d4" : "rgba(6, 182, 212, 0.3)",
        textShadow: isActive ? "0 0 15px #4ade80" : "0 0 8px #06b6d4",
        backgroundColor: "rgba(15, 23, 42, 0.8)",
        padding: "2px 6px",
        borderRadius: "6px",
        border: "1px solid rgba(6, 182, 212, 0.4)",
      };

    case "minimal_clean":
    default:
      return {
        fontSize: `${fontSize * 0.9}px`,
        fontWeight: 700,
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: isActive ? "#f59e0b" : isSpoken ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(8px)",
        padding: "2px 8px",
        borderRadius: "6px",
        textShadow: "0 2px 4px rgba(0,0,0,0.8)",
      };
  }
}
