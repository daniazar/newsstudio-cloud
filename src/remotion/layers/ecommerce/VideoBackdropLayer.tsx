/**
 * src/remotion/layers/ecommerce/VideoBackdropLayer.tsx
 *
 * Cinematic Global Video Backdrop Engine.
 * Provides unified, photorealistic studio environments, lifestyle contextual blurs,
 * and high-contrast ambient gradients across the commercial ad.
 */

import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { VideoBackdropConfig, AdAspectRatio } from "@/lib/types/ecommerce";
import { STUDIO_BACKGROUNDS, getStudioBackgroundById } from "@/lib/realtime/studioBackgrounds";
import { RobustImg } from "../../components/RobustImg";

export interface VideoBackdropLayerProps {
  config?: VideoBackdropConfig;
  surfaceColor?: string;
  accentColor?: string;
  aspectRatio?: AdAspectRatio;
  lifestyleAssetUrl?: string;
}

export const VideoBackdropLayer: React.FC<VideoBackdropLayerProps> = ({
  config,
  surfaceColor = "#18181b",
  accentColor = "#06b6d4",
  aspectRatio = "9:16",
  lifestyleAssetUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // If an ambient lifestyle context asset exists and no custom color/plate was explicitly specified,
  // default to lifestyle_blur so scenes never render as empty black voids
  const hasExplicitCustomBackdrop =
    config?.mode === "studio_plate" ||
    config?.mode === "custom_color" ||
    (config?.mode === "gradient" && config.customColor && config.customColor !== "#18181b" && config.customColor !== surfaceColor);

  const mode = config?.mode === "lifestyle_blur"
    ? "lifestyle_blur"
    : hasExplicitCustomBackdrop
    ? config!.mode
    : lifestyleAssetUrl
    ? "lifestyle_blur"
    : config?.mode || "gradient";

  const blurPx = config?.blurPx ?? (mode === "lifestyle_blur" ? 22 : 0);
  const dimmingPercent = config?.dimmingPercent ?? (mode === "studio_plate" ? 25 : mode === "lifestyle_blur" ? 35 : 0);
  const enableCameraPan = config?.enableCameraPan ?? true;

  // Resolve studio plate path with aspect-ratio awareness
  const resolvedPlateUrl = useMemo(() => {
    if (mode !== "studio_plate") return null;

    const bgId = config?.studioBackgroundId || "studio_plate_penthouse_lounge";
    // Check if bgId is already a full image path
    if (bgId.startsWith("/") || bgId.startsWith("http")) {
      return bgId;
    }

    // Attempt aspect-ratio matched variant (e.g. _9x16 or _16x9)
    const suffix = aspectRatio === "16:9" ? "_16x9" : "_9x16";
    const matchedWithSuffix = `${bgId.replace(/_(9x16|16x9)$/, "")}${suffix}`;

    const found =
      STUDIO_BACKGROUNDS.find((b) => b.id === matchedWithSuffix) ||
      STUDIO_BACKGROUNDS.find((b) => b.id === bgId) ||
      getStudioBackgroundById(bgId);

    return found?.imageUrl || `/studio_environments/${matchedWithSuffix}.jpg`;
  }, [mode, config?.studioBackgroundId, aspectRatio]);

  // Subtle cinematic camera drift (slow-zoom 1.0 -> 1.05 over 30 seconds)
  const panScale = enableCameraPan
    ? interpolate(frame, [0, fps * 30], [1.0, 1.05], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 1.0;

  const panY = enableCameraPan
    ? interpolate(frame, [0, fps * 30], [0, -8], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : 0;

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#09090b" }}>
      {/* ── 1. STUDIO PLATE ENVIRONMENT ─────────────────────────────── */}
      {mode === "studio_plate" && resolvedPlateUrl && (
        <div
          style={{
            position: "absolute",
            inset: -20, // Negative inset to prevent edge artifacts during pan
            transform: `scale(${panScale}) translateY(${panY}px)`,
            transformOrigin: "center center",
            filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
          }}
        >
          <RobustImg
            src={resolvedPlateUrl}
            alt="Virtual Studio Set"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      )}

      {/* ── 2. LIFESTYLE CONTEXTUAL BLUR BOKEH ──────────────────────── */}
      {mode === "lifestyle_blur" && (
        <div
          style={{
            position: "absolute",
            inset: -40,
            transform: `scale(${1.15 * panScale}) translateY(${panY}px)`,
            filter: `blur(${Math.max(12, blurPx)}px) saturate(1.15)`,
          }}
        >
          <RobustImg
            src={lifestyleAssetUrl || "/placeholder_product.png"}
            alt="Lifestyle Bokeh Backdrop"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        </div>
      )}

      {/* ── 3. CUSTOM SOLID / IMAGE BACKDROP ────────────────────────── */}
      {mode === "custom_color" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: config?.customColor || surfaceColor,
            backgroundImage: config?.customImageUrl ? `url(${config.customImageUrl})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
      )}

      {/* ── 4. RADIAL STUDIO SPOTLIGHT (DEFAULT) ───────────────────── */}
      {mode === "gradient" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: config?.customColor?.includes("gradient")
              ? config.customColor
              : `radial-gradient(circle at 50% 38%, ${config?.customColor || surfaceColor || "#18181b"} 0%, #09090b 82%)`,
          }}
        >
          {/* Subtle Horizon Glow Line */}
          <div
            style={{
              position: "absolute",
              bottom: "22%",
              left: 0,
              right: 0,
              height: 1,
              background: `linear-gradient(90deg, transparent 0%, ${accentColor}22 50%, transparent 100%)`,
            }}
          />
        </div>
      )}

      {/* ── AMBIENT CONTRAST VIGNETTE & DIMMING OVERLAY ─────────────── */}
      {dimmingPercent > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: `rgba(0, 0, 0, ${dimmingPercent / 100})`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Ambient Vignette for cinematic depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0, 0, 0, 0.55) 100%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};
