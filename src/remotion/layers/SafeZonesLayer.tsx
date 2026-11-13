/**
 * Safe Zones Layer — UI overlays for social media platforms.
 * Helps editors position elements away from platform UI (like TikTok buttons).
 */

import React from "react";
import { AbsoluteFill } from "remotion";
import type { AspectRatio } from "@/lib/types";

interface SafeZonesLayerProps {
  aspectRatio: AspectRatio;
  visible?: boolean;
}

export const SafeZonesLayer: React.FC<SafeZonesLayerProps> = ({
  aspectRatio,
  visible = false,
}) => {
  if (!visible) return null;

  const isVertical = aspectRatio === "vertical";
  const isSquare = aspectRatio === "square";

  return (
    <AbsoluteFill style={{ zIndex: 1000, pointerEvents: "none" }}>
      {/* Platform UI simulation */}
      {isVertical ? (
        <>
          {/* TikTok Bottom UI Area */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "350px",
              background: "rgba(255, 0, 0, 0.2)",
              borderTop: "2px dashed rgba(255, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "white",
              fontSize: "24px",
              fontWeight: "bold",
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            TIKTOK/REELS DANGER ZONE (CAPTIONS, LIKES)
          </div>

          {/* TikTok Right Side Buttons */}
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "30%",
              bottom: "350px",
              width: "120px",
              background: "rgba(255, 0, 0, 0.15)",
              borderLeft: "2px dashed rgba(255, 0, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              writingMode: "vertical-rl",
              color: "white",
              fontSize: "18px",
            }}
          >
            BUTTONS ZONE
          </div>

          {/* Top Info Area */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "150px",
              background: "rgba(255, 255, 0, 0.15)",
              borderBottom: "2px dashed rgba(255, 255, 0, 0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "black",
              fontSize: "18px",
            }}
          >
            TOP UI ZONE (SEARCH, FOLLOW)
          </div>
        </>
      ) : isSquare ? (
        <>
          {/* Square 1:1 Feed Safe Zones (Instagram / LinkedIn / Facebook) */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "90px",
              background: "rgba(255, 220, 0, 0.18)",
              borderBottom: "2px dashed rgba(255, 220, 0, 0.6)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#fef08a",
              fontSize: "16px",
              fontWeight: "bold",
              letterSpacing: "0.05em",
            }}
          >
            INSTAGRAM / LINKEDIN HEADER ZONE
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "130px",
              background: "rgba(255, 0, 0, 0.22)",
              borderTop: "2px dashed rgba(255, 0, 0, 0.6)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "white",
              fontSize: "18px",
              fontWeight: "bold",
              letterSpacing: "0.05em",
              textShadow: "0 2px 4px rgba(0,0,0,0.6)",
            }}
          >
            FEED CONTROLS / CTA ACTION ZONE
          </div>

          <div
            style={{
              position: "absolute",
              top: "90px",
              bottom: "130px",
              left: "40px",
              right: "40px",
              border: "2px dashed rgba(0, 240, 255, 0.5)",
              borderRadius: "12px",
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-end",
              paddingBottom: "16px",
              color: "rgba(0, 240, 255, 0.85)",
              fontSize: "16px",
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            1:1 SQUARE CONTENT SAFE ZONE
          </div>
        </>
      ) : (
        /* Horizontal Safe Zone */
        <div
          style={{
            position: "absolute",
            inset: "5%",
            border: "2px dashed rgba(0, 255, 255, 0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            paddingBottom: "20px",
            color: "rgba(0, 255, 255, 0.8)",
            fontSize: "20px",
          }}
        >
          TV SAFE ZONE
        </div>
      )}
    </AbsoluteFill>
  );
};
