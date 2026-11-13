import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { RobustImg } from "../../components/RobustImg";
import {
  StagingEnvironmentKey,
  StagedRoomConfig,
  getEnvironmentByKey,
} from "@/lib/ecommerce/roomStager";

export interface RoomVisualizerProps {
  roomImageSrc?: string;
  startFrame?: number;
  durationFrames?: number;
  roomTypeLabel?: string;
  accentColor?: string;
  environmentKey?: StagingEnvironmentKey;
  surfaceTextureUrl?: string;
  stagedConfig?: StagedRoomConfig;
  cleanBackgroundMode?: boolean;
}

export const RoomVisualizerLayer: React.FC<RoomVisualizerProps> = ({
  roomImageSrc,
  startFrame = 0,
  durationFrames = 120,
  roomTypeLabel,
  accentColor = "#06b6d4",
  environmentKey = "living_room_modern",
  surfaceTextureUrl,
  stagedConfig,
  cleanBackgroundMode = false,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const env = stagedConfig?.environment || getEnvironmentByKey(environmentKey);
  const activePlane = stagedConfig?.activePlane || env.planes[0];
  const bgImage = roomImageSrc || env.defaultBackgroundUrl;
  const texture = surfaceTextureUrl || stagedConfig?.textureUrl;
  const label = roomTypeLabel || env.name.toUpperCase();

  const currentProg = Math.max(0, frame - startFrame);

  // Cinematic camera motion based on environment profile
  const dollyScale = interpolate(
    currentProg,
    [0, durationFrames],
    [env.cameraMotion.startScale, env.cameraMotion.endScale],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const dollyPanY = interpolate(
    currentProg,
    [0, durationFrames],
    [0, env.cameraMotion.panYPixels],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const dollyRotate = interpolate(
    currentProg,
    [0, durationFrames],
    [0, env.cameraMotion.rotationDeg],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div style={{ position: "absolute", width, height, overflow: "hidden", pointerEvents: "none" }}>
      {/* Zooming Room Plate Container */}
      <div
        style={{
          width: "100%",
          height: "100%",
          transform: `scale(${dollyScale}) translateY(${dollyPanY}px) rotate(${dollyRotate}deg)`,
          position: "relative",
        }}
      >
        {/* Base Architectural Room Background */}
        <RobustImg
          src={bgImage}
          alt={label}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />

        {/* Perspective-Warped Surface Texture Plane (Flooring / Wall / Countertop) */}
        {!cleanBackgroundMode && texture && activePlane && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              clipPath: stagedConfig?.planeTransformCss.clipPath || `polygon(${activePlane.polygon.map(([x, y]) => `${x}% ${y}%`).join(", ")})`,
              mixBlendMode: activePlane.blendMode as React.CSSProperties["mixBlendMode"],
              opacity: activePlane.opacity,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                transform: stagedConfig?.planeTransformCss.transform || `perspective(${activePlane.perspectivePx}px) rotateX(${activePlane.rotateXDeg}deg) scale(${activePlane.scale})`,
                transformOrigin: "bottom center",
                backgroundImage: `url(${texture})`,
                backgroundRepeat: activePlane.textureRepeat,
                backgroundSize: `${activePlane.textureScalePercent}%`,
              }}
            />
          </div>
        )}

        {/* Directional Sun / Spot Lighting Overlay */}
        {!cleanBackgroundMode && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: stagedConfig?.lightingCss.backgroundOverlay || `linear-gradient(${env.lighting.lightAngleDeg}deg, rgba(255,255,255,0.12) 0%, transparent 60%)`,
              pointerEvents: "none",
            }}
          />
        )}

        {/* Contact Shadow Grounding Overlay */}
        {!cleanBackgroundMode && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: stagedConfig?.lightingCss.contactShadow || "radial-gradient(ellipse at 50% 85%, rgba(0,0,0,0.5) 0%, transparent 70%)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Cinematic Vignette */}
      {!cleanBackgroundMode && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: stagedConfig?.lightingCss.vignette || `radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, ${env.lighting.vignetteStrength}) 100%)`,
          }}
        />
      )}

      {/* Glassmorphic Architectural Room Badge */}
      {!cleanBackgroundMode && label && (
        <div
          style={{
            position: "absolute",
            bottom: 120,
            left: 32,
            backgroundColor: "rgba(9, 9, 11, 0.85)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${accentColor}44`,
            padding: "8px 18px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: accentColor,
              boxShadow: `0 0 8px ${accentColor}`,
            }}
          />
          <span
            style={{
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {label}
          </span>
        </div>
      )}
    </div>
  );
};
