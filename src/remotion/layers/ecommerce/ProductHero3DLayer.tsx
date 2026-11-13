import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { RobustImg } from "../../components/RobustImg";
import { resolveSrc } from "../../utils/resolveSrc";

import { WebGLChromaMatte } from "../../components/WebGLChromaMatte";

export interface ProductHero3DProps {
  imageSrc: string;
  startFrame?: number;
  scale?: number;
  enableFloating?: boolean;
  floatingMotionStyle?: "dancing" | "gentle" | "static";
  enableSpecularSheen?: boolean;
  accentColor?: string;
  altText?: string;
  /** When true, keys out solid white/cyclorama packshot backgrounds via WebGL (default: true) */
  removeWhiteBg?: boolean;
}

export const ProductHero3DLayer: React.FC<ProductHero3DProps> = ({
  imageSrc,
  startFrame = 0,
  scale = 1.0,
  enableFloating = true,
  floatingMotionStyle = "dancing",
  enableSpecularSheen = true,
  accentColor = "#06b6d4",
  altText = "Product Hero",
  removeWhiteBg = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Snappy spring entrance
  const entrance = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.9 },
  });

  const timeSec = (frame - startFrame) / fps;

  // Harmonic 3D oscillation (floating and dancing)
  let floatY = 0;
  let rotateY = 0;
  let rotateX = 0;

  if (enableFloating && floatingMotionStyle !== "static") {
    const isDancing = floatingMotionStyle === "dancing";
    const speedMult = isDancing ? 1.6 : 0.8;
    const ampY = isDancing ? 15 : 7;
    const ampRotY = isDancing ? 12 : 5;
    const ampRotX = isDancing ? 7 : 3;

    floatY = Math.sin(timeSec * Math.PI * speedMult) * ampY;
    rotateY = Math.cos(timeSec * Math.PI * (speedMult * 0.65)) * ampRotY;
    rotateX = Math.sin(timeSec * Math.PI * (speedMult * 0.45)) * ampRotX;
  }

  // Shadow expands when object is lower, contracts when higher
  const shadowScale = interpolate(floatY, [-12, 12], [0.85, 1.15]);
  const shadowOpacity = interpolate(floatY, [-12, 12], [0.25, 0.45]);

  // Dynamic 3D lighting response: as the surface tilts toward the key light, specular reflection intensifies
  const tiltLight = interpolate(rotateY + rotateX * 0.5, [-15, 15], [0.12, 0.38], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Rhythmic specular sheen sweep: 1.4s gleam + 1.4s breathing pause
  const sheenCycle = timeSec % 2.8;
  const sheenProgress = Math.min(1.0, sheenCycle / 1.4);
  const sheenTranslate = interpolate(sheenProgress, [0, 1], [-150, 250], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const resolvedSrc = resolveSrc(imageSrc);

  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        perspective: 1200,
        pointerEvents: "none",
      }}
    >
      {/* 3D Floating Hero Container */}
      <div
        style={{
          position: "relative",
          transform: `scale(${entrance * scale}) translateY(${floatY}px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`,
          transformStyle: "preserve-3d",
          maxWidth: "75%",
          maxHeight: "55%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {removeWhiteBg ? (
          <WebGLChromaMatte
            src={imageSrc}
            mediaType="image"
            mode="white_key"
            similarity={0.16}
            smoothness={0.08}
            defringeStrength={0.88}
            enableSheen={enableSpecularSheen}
            sheenProgress={sheenProgress}
            sheenIntensity={0.42}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              filter: `drop-shadow(0 25px 35px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 25px ${accentColor}33)`,
            }}
            alt={altText}
          />
        ) : (
          <>
            <RobustImg
              src={imageSrc}
              alt={altText}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                filter: `drop-shadow(0 25px 35px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 25px ${accentColor}33)`,
              }}
            />

            {/* Specular Studio Lighting & Light Gleam Sweep for opaque card */}
            {enableSpecularSheen && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  overflow: "hidden",
                  pointerEvents: "none",
                  maskImage: `url("${resolvedSrc}")`,
                  WebkitMaskImage: `url("${resolvedSrc}")`,
                  maskSize: "contain",
                  WebkitMaskSize: "contain",
                  maskRepeat: "no-repeat",
                  WebkitMaskRepeat: "no-repeat",
                  maskPosition: "center",
                  WebkitMaskPosition: "center",
                }}
              >
                {/* 1. Dynamic 3D Studio Directional Surface Light (responds to 3D rotation) */}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(135deg, rgba(255, 255, 255, ${tiltLight}) 0%, transparent 65%)`,
                    mixBlendMode: "screen",
                  }}
                />

                {/* 2. Traveling Specular Light Gleam Sweep */}
                <div
                  style={{
                    position: "absolute",
                    top: "-50%",
                    left: "-50%",
                    width: "200%",
                    height: "200%",
                    transform: `rotate(35deg) translateX(${sheenTranslate}%)`,
                    background: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.45) 50%, transparent 100%)`,
                    mixBlendMode: "screen",
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Dynamic Ground Elevation Shadow */}
      <div
        style={{
          width: 320 * scale * shadowScale * entrance,
          height: 38 * shadowScale * entrance,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, rgba(0, 0, 0, ${shadowOpacity}) 0%, transparent 75%)`,
          marginTop: 20,
          transform: `scale(${entrance})`,
        }}
      />
    </div>
  );
};
