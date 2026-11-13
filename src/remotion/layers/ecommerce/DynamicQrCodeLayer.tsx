import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { QrCodeConfig, AdAspectRatio } from "@/lib/types/ecommerce";

export interface DynamicQrCodeLayerProps {
  config: QrCodeConfig;
  primaryColor?: string;
  aspectRatio: AdAspectRatio;
}

export function getQrCoordinates(
  position: QrCodeConfig["position"],
  aspectRatio: AdAspectRatio
): React.CSSProperties {
  const isVertical = aspectRatio === "9:16";
  const topOffset = isVertical ? 90 : 24;
  const bottomOffset = isVertical ? 80 : 32;
  const sideOffset = 24;

  switch (position) {
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
 * Procedural SVG QR Matrix with functional alignment patterns
 */
const SvgQrMatrix: React.FC<{ size: number; color?: string }> = ({ size, color = "#ffffff" }) => {
  return (
    <svg width={size} height={size} viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width="25" height="25" fill="#09090b" rx="2" />

      {/* Top-Left Finder Pattern */}
      <rect x="2" y="2" width="7" height="7" stroke={color} strokeWidth="1.2" fill="none" rx="1" />
      <rect x="4" y="4" width="3" height="3" fill={color} rx="0.5" />

      {/* Top-Right Finder Pattern */}
      <rect x="16" y="2" width="7" height="7" stroke={color} strokeWidth="1.2" fill="none" rx="1" />
      <rect x="18" y="4" width="3" height="3" fill={color} rx="0.5" />

      {/* Bottom-Left Finder Pattern */}
      <rect x="2" y="16" width="7" height="7" stroke={color} strokeWidth="1.2" fill="none" rx="1" />
      <rect x="4" y="18" width="3" height="3" fill={color} rx="0.5" />

      {/* Timing Patterns */}
      <line x1="9.5" y1="5.5" x2="15.5" y2="5.5" stroke={color} strokeWidth="1" strokeDasharray="1 1" />
      <line x1="5.5" y1="9.5" x2="5.5" y2="15.5" stroke={color} strokeWidth="1" strokeDasharray="1 1" />

      {/* Alignment Center Pattern */}
      <rect x="11" y="11" width="3" height="3" fill={color} rx="0.5" />

      {/* Procedural Data Modules */}
      <rect x="10" y="2" width="1" height="2" fill={color} />
      <rect x="14" y="2" width="1" height="1" fill={color} />
      <rect x="10" y="7" width="2" height="1" fill={color} />
      <rect x="13" y="7" width="1" height="2" fill={color} />
      <rect x="2" y="10" width="2" height="1" fill={color} />
      <rect x="2" y="13" width="1" height="2" fill={color} />
      <rect x="7" y="10" width="1" height="2" fill={color} />
      <rect x="7" y="14" width="2" height="1" fill={color} />
      <rect x="16" y="10" width="2" height="1" fill={color} />
      <rect x="20" y="10" width="1" height="2" fill={color} />
      <rect x="16" y="13" width="1" height="1" fill={color} />
      <rect x="22" y="13" width="1" height="2" fill={color} />
      <rect x="10" y="16" width="2" height="1" fill={color} />
      <rect x="10" y="19" width="1" height="2" fill={color} />
      <rect x="14" y="17" width="1" height="1" fill={color} />
      <rect x="13" y="21" width="2" height="1" fill={color} />
      <rect x="17" y="16" width="2" height="2" fill={color} />
      <rect x="21" y="17" width="2" height="1" fill={color} />
      <rect x="17" y="20" width="1" height="2" fill={color} />
      <rect x="20" y="21" width="2" height="2" fill={color} />
    </svg>
  );
};

export const DynamicQrCodeLayer: React.FC<DynamicQrCodeLayerProps> = ({
  config,
  primaryColor = "#06b6d4",
  aspectRatio,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!config.enabled) return null;

  const position = config.position || "top_right";
  const label = config.label || "SCAN TO BUY";
  const sublabel = config.sublabel || "DIRECT CHECKOUT";
  const qrSize = config.size || 86;

  // Spring entrance
  const entrance = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  // Gentle pulse animation
  const pulse = 1 + Math.sin(frame / 12) * 0.02;

  const posStyles = getQrCoordinates(position, aspectRatio);

  return (
    <div
      style={{
        position: "absolute",
        ...posStyles,
        transform: `scale(${entrance * pulse})`,
        transformOrigin: position === "top_right" ? "top right" : "bottom left",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(9, 9, 11, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: `1.5px solid ${primaryColor}66`,
        borderRadius: 18,
        padding: "10px 12px",
        boxShadow: `0 12px 30px rgba(0, 0, 0, 0.6), 0 0 20px ${primaryColor}22`,
        zIndex: 44,
        pointerEvents: "none",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* QR Code Graphic */}
      <div
        style={{
          padding: 4,
          backgroundColor: "#09090b",
          borderRadius: 10,
          border: "1px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <SvgQrMatrix size={qrSize} color={primaryColor} />
      </div>

      {/* Label and Sublabel */}
      <div style={{ textAlign: "center", lineHeight: 1.1 }}>
        <div
          style={{
            color: "#ffffff",
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: "0.8px",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          style={{
            color: primaryColor,
            fontSize: 8,
            fontWeight: 800,
            letterSpacing: "0.3px",
            marginTop: 2,
          }}
        >
          {sublabel}
        </div>
      </div>
    </div>
  );
};
