import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { CitationInfo } from "@/lib/ai/factChecker";

export type CitationPosition = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export interface CitationBadgeLayerProps {
  /** Structured citation verification info */
  citation?: CitationInfo;
  /** Direct source name override (e.g. "Reuters Wire", "Associated Press") */
  source?: string;
  /** Verification status type */
  factCheckStatus?: "verified" | "official" | "corroborated" | "breaking_wire";
  /** Confidence score between 0.0 and 1.0 (e.g. 0.96) */
  confidenceScore?: number;
  /** Verified timestamp text */
  verifiedTimestamp?: string;
  /** Position on screen (default: "top-left") */
  position?: CitationPosition;
  /** Frame at which badge animates into the scene (default: 15) */
  startFrame?: number;
  /** Brand primary highlight color */
  primaryColor?: string;
  /** Whether to render confidence percentage */
  showConfidenceScore?: boolean;
  /** Positioning offsets */
  offsetX?: number;
  offsetY?: number;
}

/**
 * Normalizes citation source name into uppercase broadcast format.
 */
export function formatCitationSource(sourceName?: string): string {
  if (!sourceName || !sourceName.trim()) return "VERIFIED NEWS WIRE";
  const cleaned = sourceName.replace(/^(verified\s*(source)?:\s*)/i, "").trim();
  return cleaned.toUpperCase();
}

/**
 * Formats a 0.0 - 1.0 confidence score into a percentage label.
 */
export function getConfidenceScoreLabel(score = 0.95): string {
  const percentage = Math.round(Math.min(1, Math.max(0, score)) * 100);
  return `${percentage}%`;
}

/**
 * Calculates CSS positioning coordinates for citation badge.
 */
export function getCitationPositionStyles(position: CitationPosition = "top-left"): React.CSSProperties {
  switch (position) {
    case "top-left":
      return { top: "36px", left: "36px" };
    case "top-right":
      return { top: "36px", right: "36px" };
    case "bottom-left":
      return { bottom: "110px", left: "36px" };
    case "bottom-right":
      return { bottom: "110px", right: "36px" };
    default:
      return { top: "36px", left: "36px" };
  }
}

/**
 * Calculates entrance spring values for testing and animation.
 */
export function calculateBadgeEntrance(
  frame: number,
  fps = 30,
  startFrame = 15
): { scale: number; opacity: number; translateY: number } {
  if (frame < startFrame) {
    return { scale: 0, opacity: 0, translateY: -20 };
  }

  const entrance = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 14, stiffness: 130 },
  });

  const opacity = interpolate(frame, [startFrame, startFrame + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = (1 - entrance) * -18;

  return { scale: entrance, opacity, translateY };
}

/**
 * Calibrated Branded Fact-Check Verification Badge & News Wire Source Citation Layer
 * Renders glassmorphic broadcast badge with animated radar pulse, verification checkmark,
 * and news wire source credibility metadata.
 */
export const CitationBadgeLayer: React.FC<CitationBadgeLayerProps> = ({
  citation = {
    isVerified: true,
    sourceName: "Verified Source: Reuters",
    verifiedTimestamp: "Today • 10:45 AM UTC",
    confidenceScore: 0.96,
  },
  source,
  factCheckStatus = "verified",
  confidenceScore,
  verifiedTimestamp,
  position = "top-left",
  startFrame = 15,
  showConfidenceScore = true,
  offsetX = 0,
  offsetY = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // If citation says unverified and no explicit source override, hide badge
  if (citation && citation.isVerified === false && !source) {
    return null;
  }

  if (frame < startFrame) {
    return null;
  }

  const { scale, opacity, translateY } = calculateBadgeEntrance(frame, fps, startFrame);
  const positionStyles = getCitationPositionStyles(position);

  const resolvedSource = formatCitationSource(source || citation?.sourceName);
  const resolvedScore = confidenceScore ?? citation?.confidenceScore ?? 0.96;
  const resolvedTime = verifiedTimestamp || citation?.verifiedTimestamp || "Today • Live Wire";

  const isEmerald = factCheckStatus === "verified" || (!source && citation?.isVerified);

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 50,
        transform: `translate(${offsetX}px, ${translateY + offsetY}px) scale(${scale})`,
        opacity,
        ...positionStyles,
      }}
      className="select-none font-sans"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "8px 14px",
          borderRadius: "14px",
          backgroundColor: "rgba(6, 9, 15, 0.78)",
          backdropFilter: "blur(14px)",
          border: `1.5px solid ${isEmerald ? "rgba(16, 185, 129, 0.45)" : "rgba(6, 182, 212, 0.45)"}`,
          boxShadow: isEmerald
            ? "0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(16, 185, 129, 0.2)"
            : "0 10px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(6, 182, 212, 0.2)",
        }}
      >
        {/* Animated Radar Pulse Indicator */}
        <div style={{ position: "relative", width: "12px", height: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              backgroundColor: isEmerald ? "#34d399" : "#38bdf8",
              opacity: 0.6,
              transform: `scale(${1 + ((frame % 30) / 30) * 1.5})`,
            }}
          />
          <span
            style={{
              position: "relative",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: isEmerald ? "#10b981" : "#0284c7",
              boxShadow: isEmerald ? "0 0 8px #10b981" : "0 0 8px #0284c7",
            }}
          />
        </div>

        {/* Credibility & Fact Check Info */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: isEmerald ? "#34d399" : "#38bdf8",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span style={{ fontSize: "12px" }}>✓</span> {resolvedSource}
            </span>
            <span
              style={{
                fontSize: "9px",
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: "4px",
                backgroundColor: isEmerald ? "rgba(16, 185, 129, 0.2)" : "rgba(56, 189, 248, 0.2)",
                color: isEmerald ? "#a7f3d0" : "#bae6fd",
                fontFamily: "monospace",
              }}
            >
              FACT CHECKED
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
            <span style={{ fontSize: "10px", fontWeight: 500, color: "#cbd5e1" }}>
              {resolvedTime}
            </span>
            {showConfidenceScore && (
              <>
                <span style={{ color: "rgba(255, 255, 255, 0.3)", fontSize: "10px" }}>•</span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: isEmerald ? "#6ee7b7" : "#7dd3fc", fontFamily: "monospace" }}>
                  {getConfidenceScoreLabel(resolvedScore)} Confidence
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
