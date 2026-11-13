import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { BrandDNA, BrandWatermarkConfig, AdAspectRatio } from "@/lib/types/ecommerce";
import { RobustImg } from "../../components/RobustImg";

export interface BrandWatermarkLayerProps {
  brand: BrandDNA;
  watermark?: BrandWatermarkConfig;
  aspectRatio: AdAspectRatio;
  offsetX?: number;
  offsetY?: number;
}

/**
 * Calculates absolute coordinates for the watermark bug based on position and aspect ratio.
 */
export function getWatermarkCoordinates(
  position: BrandWatermarkConfig["position"],
  aspectRatio: AdAspectRatio
): React.CSSProperties {
  const isVertical = aspectRatio === "9:16";
  const topOffset = isVertical ? 44 : 24;
  const bottomOffset = isVertical ? 75 : 32;
  const sideOffset = isVertical ? 28 : 28;

  switch (position) {
    case "top_left":
      return { top: topOffset, left: sideOffset };
    case "bottom_left":
      return { bottom: bottomOffset, left: sideOffset };
    case "bottom_right":
      return { bottom: bottomOffset, right: sideOffset };
    case "top_right":
    default:
      return { top: topOffset, right: sideOffset };
  }
}

/**
 * BrandWatermarkLayer
 *
 * Broadcast-grade corner brand bug overlay.
 * Renders high-res brand logo, favicon, or glowing monogram badge.
 */
export const BrandWatermarkLayer: React.FC<BrandWatermarkLayerProps> = ({
  brand,
  watermark,
  aspectRatio,
  offsetX = 0,
  offsetY = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // If watermark is explicitly disabled or missing, do not render
  if (!watermark || watermark.enabled === false) {
    return null;
  }

  const position = watermark?.position || "top_right";
  const baseOpacity = Math.max(0.1, Math.min(1.0, watermark?.opacity ?? 0.85));
  const scale = Math.max(0.4, Math.min(2.0, watermark?.scale ?? 1.0));
  const showDomain = watermark?.showDomainTag ?? false;
  const logoUrl = watermark?.customLogoUrl || brand.logoUrl || brand.faviconUrl;

  // Spring entrance animation
  const entrance = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8, stiffness: 120 },
  });

  const positionStyles = getWatermarkCoordinates(position, aspectRatio);
  const monogramLetter = brand.name ? brand.name.trim().charAt(0).toUpperCase() : "★";

  return (
    <div
      style={{
        position: "absolute",
        ...positionStyles,
        zIndex: 46,
        transform: `translate3d(${offsetX}px, ${offsetY}px, 0) scale(${scale * (0.85 + 0.15 * entrance)})`,
        transformOrigin:
          position === "top_right"
            ? "top right"
            : position === "top_left"
            ? "top left"
            : position === "bottom_right"
            ? "bottom right"
            : "bottom left",
        opacity: baseOpacity * entrance,
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(9, 9, 11, 0.65)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.18)",
        borderRadius: 24,
        padding: "5px 12px",
        boxShadow: "0 6px 20px rgba(0, 0, 0, 0.45)",
        pointerEvents: "none",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {logoUrl ? (
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255, 255, 255, 0.1)",
          }}
        >
          <RobustImg
            src={logoUrl}
            alt={brand.name}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            background: `linear-gradient(135deg, ${brand.primaryColor || "#06b6d4"}, ${
              brand.secondaryColor || "#3b82f6"
            })`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            fontSize: 11,
            fontWeight: 900,
            boxShadow: `0 0 10px ${brand.primaryColor || "#06b6d4"}66`,
          }}
        >
          {monogramLetter}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <span
          style={{
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: "0.8px",
            textTransform: "uppercase",
          }}
        >
          {brand.name || "OFFICIAL BRAND"}
        </span>
        {showDomain && brand.domain && (
          <span
            style={{
              color: brand.primaryColor || "#06b6d4",
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: "0.2px",
            }}
          >
            {brand.domain.replace(/^https?:\/\//, "")}
          </span>
        )}
      </div>
    </div>
  );
};
