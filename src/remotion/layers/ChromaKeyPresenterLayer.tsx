import React from "react";
import { AbsoluteFill, OffthreadVideo, useVideoConfig } from "remotion";
import { ChromaKeyVideo } from "../components/ChromaKeyVideo";

export interface ChromaKeyPresenterProps {
  videoSrc: string;
  fallbackImageSrc?: string;
  onError?: () => void;
  keyColor?: string; // hex, e.g. '#00ff00'
  similarity?: number; // 0.0 to 1.0
  smoothness?: number; // 0.0 to 1.0
  despillStrength?: number; // 0.0 to 1.0 (suppresses green edge spill & restores skin tones)
  showDropShadow?: boolean;
  dropShadowBlur?: number;
  glassReflectionOpacity?: number;
  clipPath?: string;
  style?: React.CSSProperties;
  rimColor?: [number, number, number];
  rimStrength?: number;
  ambientTint?: [number, number, number];
  offsetX?: number;
  offsetY?: number;
  scale?: number;
  layoutMode?: string;
}

/**
 * Calculates Euclidean RGB distance for chroma keying test verification.
 */
export function calculateChromaDistance(
  r: number,
  g: number,
  b: number,
  targetR_or_a = 0,
  targetG?: number,
  targetB?: number
): number {
  let targetR = targetR_or_a;
  let tG = targetG ?? 255;
  let tB = targetB ?? 0;

  // If 4 arguments are provided and targetG is undefined, 4th arg is alpha (e.g. 255)
  if (targetG === undefined && targetB === undefined) {
    targetR = 0;
    tG = 255;
    tB = 0;
  }

  const dr = r - targetR;
  const dg = g - tG;
  const db = b - tB;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Calculates despill green channel suppression gain.
 * If Green exceeds the average of Red & Blue, suppresses it towards the target max.
 */
export function calculateDespillGain(
  g: number,
  r: number,
  b: number,
  despillFactor = 0.5
): number {
  const maxRB = Math.max(r, b);
  const avgRB = r * despillFactor + b * (1.0 - despillFactor);
  const threshold = Math.max(maxRB, avgRB);
  if (g > threshold) {
    return threshold;
  }
  return g;
}

/**
 * Applies WebGL-style despill color correction to an RGB triplet.
 * Suppresses green fringing and neutralizes skin highlights.
 */
export function applyDespillColorCorrection(
  r: number,
  g: number,
  b: number,
  despillStrength = 0.8
): { r: number; g: number; b: number } {
  const maxRB = Math.max(r, b);
  if (g > maxRB) {
    const suppressedG = maxRB + (g - maxRB) * (1.0 - despillStrength);
    // Subtle magenta/warmth compensation for skin tone restoration
    const restoredR = Math.min(255, r + (g - suppressedG) * 0.15);
    const restoredB = Math.min(255, b + (g - suppressedG) * 0.05);
    return {
      r: Math.round(restoredR),
      g: Math.round(suppressedG),
      b: Math.round(restoredB),
    };
  }
  return { r, g, b };
}

import { resolveSrc } from "../utils/resolveSrc";
import { RobustImg } from "../components/RobustImg";

/**
 * WebGL-Calibrated Chroma Key Presenter Layer with Despill Color Correction
 */
export const ChromaKeyPresenterLayer: React.FC<ChromaKeyPresenterProps> = ({
  videoSrc,
  fallbackImageSrc,
  onError,
  similarity = 0.38,
  smoothness = 0.12,
  despillStrength = 0.85,
  showDropShadow = true,
  dropShadowBlur = 16,
  glassReflectionOpacity = 0.18,
  clipPath,
  style,
  rimColor = [0.0, 0.94, 1.0],
  rimStrength = 0.28,
  ambientTint = [1.0, 1.0, 1.0],
  offsetX = 0,
  offsetY = 0,
  scale = 1.0,
  layoutMode,
}) => {
  const { width, height } = useVideoConfig();
  const isVertical = height > width;

  const [hasError, setHasError] = React.useState(false);
  const isWebM = videoSrc?.toLowerCase().endsWith(".webm") || videoSrc?.includes("transparent");

  const handleError = React.useCallback(() => {
    setHasError(true);
    onError?.();
  }, [onError]);

  const isSplitLeft = layoutMode === "side_full_left";
  const isSplitRight = layoutMode === "side_full_right" || layoutMode === "split_side";
  const isFullScreen = layoutMode === "full_screen";
  const isCornerRight = layoutMode === "bottom_right";
  const isCornerLeft = layoutMode === "bottom_left";
  const isPip = layoutMode === "circle_pip";

  let containerStyle: React.CSSProperties = {
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    ...style,
  };

  let presenterWrapOrigin = "bottom center";

  if (isFullScreen) {
    containerStyle = {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: "100%",
      height: "100%",
      overflow: "hidden",
      ...style,
    };
    presenterWrapOrigin = "bottom center";
  } else if (isSplitLeft) {
    containerStyle = {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      width: "48%",
      height: "100%",
      backgroundColor: "#09090b",
      borderRight: "2px solid rgba(16, 185, 129, 0.3)",
      boxShadow: "0 0 30px rgba(0, 0, 0, 0.8)",
      overflow: "hidden",
      ...style,
    };
  } else if (isSplitRight) {
    containerStyle = {
      position: "absolute",
      top: 0,
      bottom: 0,
      right: 0,
      width: "48%",
      height: "100%",
      backgroundColor: "#09090b",
      borderLeft: "2px solid rgba(16, 185, 129, 0.3)",
      boxShadow: "0 0 30px rgba(0, 0, 0, 0.8)",
      overflow: "hidden",
      ...style,
    };
  } else if (isCornerRight) {
    containerStyle = {
      position: "absolute",
      bottom: 0,
      right: isVertical ? 10 : 20,
      width: isVertical ? "85%" : "54%",
      height: isVertical ? "75%" : "90%",
      overflow: "visible",
      ...style,
    };
    presenterWrapOrigin = "bottom right";
  } else if (isCornerLeft) {
    containerStyle = {
      position: "absolute",
      bottom: 0,
      left: isVertical ? 10 : 20,
      width: isVertical ? "85%" : "54%",
      height: isVertical ? "75%" : "90%",
      overflow: "visible",
      ...style,
    };
    presenterWrapOrigin = "bottom left";
  } else if (isPip) {
    containerStyle = {
      position: "absolute",
      bottom: 40,
      right: 40,
      width: 280,
      height: 280,
      borderRadius: "50%",
      overflow: "hidden",
      border: "4px solid #10b981",
      boxShadow: "0 0 20px rgba(16, 185, 129, 0.4)",
      ...style,
    };
    presenterWrapOrigin = "center center";
  }

  const mediaFit = isSplitLeft || isSplitRight || isFullScreen ? ("cover" as const) : ("contain" as const);

  return (
    <AbsoluteFill style={containerStyle}>
      {/* 1. Procedural Desk Contact Glass Reflection */}
      {glassReflectionOpacity > 0 && !hasError && !isPip && !isSplitLeft && !isSplitRight && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            width: "100%",
            height: "28%",
            transform: `scaleY(-0.35) translateY(-50%) translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`,
            transformOrigin: presenterWrapOrigin,
            opacity: glassReflectionOpacity,
            filter: "blur(10px) brightness(0.85)",
            pointerEvents: "none",
            maskImage: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 80%)",
            WebkitMaskImage: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 80%)",
          }}
        >
          {isWebM ? (
            <OffthreadVideo
              src={resolveSrc(videoSrc)}
              style={{ width: "100%", height: "100%", objectFit: mediaFit, objectPosition: "bottom center" }}
              transparent={true}
              volume={0}
              onError={handleError}
            />
          ) : (
            <ChromaKeyVideo
              src={videoSrc}
              similarity={similarity}
              smoothness={smoothness}
              despillStrength={despillStrength}
              rimColor={rimColor}
              rimStrength={rimStrength}
              ambientTint={ambientTint}
              style={{ width: "100%", height: "100%", objectFit: mediaFit, objectPosition: "bottom center" }}
              onError={handleError}
            />
          )}
        </div>
      )}

      {/* 2. Primary Presenter Layer with WebGL Chroma Shader, Despill & Drop Shadow */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale})`,
          transformOrigin: presenterWrapOrigin,
          filter: showDropShadow
            ? `drop-shadow(0px 18px ${dropShadowBlur}px rgba(0, 0, 0, 0.55))`
            : undefined,
          clipPath: clipPath,
          WebkitClipPath: clipPath,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {hasError && fallbackImageSrc ? (
          <RobustImg
            src={resolveSrc(fallbackImageSrc)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: mediaFit,
              objectPosition: "bottom center",
            }}
          />
        ) : isWebM ? (
          <OffthreadVideo
            src={resolveSrc(videoSrc)}
            style={{
              width: "100%",
              height: "100%",
              objectFit: mediaFit,
              objectPosition: "bottom center",
              clipPath: "inset(0 1.8% 0 1.8%)",
              WebkitClipPath: "inset(0 1.8% 0 1.8%)",
              maskImage:
                "linear-gradient(to right, transparent 0%, transparent 1.5%, black 3%, black 97%, transparent 98.5%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to right, transparent 0%, transparent 1.5%, black 3%, black 97%, transparent 98.5%, transparent 100%)",
            }}
            transparent={true}
            muted
            volume={0}
            onError={handleError}
          />
        ) : (
          <ChromaKeyVideo
            src={videoSrc}
            similarity={similarity}
            smoothness={smoothness}
            despillStrength={despillStrength}
            rimColor={rimColor}
            rimStrength={rimStrength}
            ambientTint={ambientTint}
            style={{
              width: "100%",
              height: "100%",
              objectFit: mediaFit,
              objectPosition: "bottom center",
            }}
            onError={handleError}
          />
        )}
      </div>
    </AbsoluteFill>
  );
};
