import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  FlashSaleUrgencyConfig,
  AdAspectRatio,
} from "@/lib/types/ecommerce";
import {
  computeFrameCountdown,
  computeStockProgress,
  getUrgencyThemeStyles,
} from "@/lib/ecommerce/urgencyEngine";

export interface FlashSaleUrgencyLayerProps {
  config: FlashSaleUrgencyConfig;
  aspectRatio: AdAspectRatio;
  startFrame?: number;
}

export const FlashSaleUrgencyLayer: React.FC<FlashSaleUrgencyLayerProps> = ({
  config,
  aspectRatio,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  if (!config || !config.enabled) return null;

  const elapsed = Math.max(0, frame - startFrame);

  // Entrance spring
  const entrance = spring({
    frame: elapsed,
    fps,
    config: { damping: 13, stiffness: 140 },
  });

  const theme = getUrgencyThemeStyles(config.theme || "neon_fire");
  const countdown = computeFrameCountdown(
    config.initialSeconds || 7200,
    elapsed,
    fps,
    config.showMilliseconds ?? true
  );

  const scarcity = config.stockScarcity?.enabled
    ? computeStockProgress(config.stockScarcity, elapsed, durationInFrames)
    : null;

  const isVertical = aspectRatio === "9:16";
  const position = config.position || "top_banner";

  // Subtle breathing pulse for high-energy urgency
  const pulse = Math.sin((elapsed / fps) * Math.PI * 2) * 0.015 + 1.0;

  // Colon blink effect (half second on / off)
  const showColon = Math.floor((elapsed / (fps / 2))) % 2 === 0;

  // Position-specific container styles
  const containerStyles: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    transform: `translateX(-50%) scale(${entrance * pulse})`,
    zIndex: 42,
    pointerEvents: "none",
    width: isVertical ? "90%" : "auto",
    minWidth: isVertical ? "auto" : 460,
    maxWidth: isVertical ? 380 : 540,
    fontFamily: "system-ui, -apple-system, sans-serif",
  };

  if (position === "top_banner") {
    containerStyles.top = isVertical ? 86 : 28;
  } else if (position === "bottom_card") {
    containerStyles.bottom = isVertical ? 92 : 36;
  } else {
    // floating_pill
    containerStyles.top = isVertical ? 140 : 36;
    containerStyles.right = 24;
    containerStyles.left = "auto";
    containerStyles.transform = `scale(${entrance * pulse})`;
  }

  return (
    <div style={containerStyles}>
      <div
        style={{
          backgroundColor: "rgba(10, 10, 14, 0.94)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: `1.5px solid ${theme.primaryColor}88`,
          borderRadius: 20,
          padding: isVertical ? "12px 18px" : "14px 22px",
          boxShadow: `0 14px 40px rgba(0, 0, 0, 0.75), 0 0 30px ${theme.glowColor}`,
          display: "flex",
          flexDirection: "column",
          gap: 10,
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Top Header: Flame/Lightning icon & Headline */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <span style={{ fontSize: 16, display: "inline-block" }}>{theme.iconSymbol}</span>
          <span
            style={{
              color: "#ffffff",
              fontSize: isVertical ? 12 : 13,
              fontWeight: 900,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textShadow: `0 0 10px ${theme.glowColor}`,
            }}
          >
            {config.headline || "FLASH SALE: LIMITED TIME DROP"}
          </span>
        </div>

        {/* Digital LCD Countdown Timer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isVertical ? 6 : 8,
            backgroundColor: "rgba(0, 0, 0, 0.6)",
            padding: "8px 16px",
            borderRadius: 12,
            border: `1px solid ${theme.primaryColor}44`,
          }}
        >
          {/* Hours Block */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span
              style={{
                color: "#ffffff",
                fontFamily: "monospace, Courier, sans-serif",
                fontSize: isVertical ? 20 : 24,
                fontWeight: 900,
                letterSpacing: "0.05em",
                textShadow: `0 0 8px ${theme.glowColor}`,
              }}
            >
              {countdown.hoursStr}
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.45)" }}>HRS</span>
          </div>

          <span
            style={{
              color: showColon ? theme.primaryColor : "transparent",
              fontSize: isVertical ? 18 : 22,
              fontWeight: 900,
              marginBottom: 10,
              transition: "color 0.1s",
            }}
          >
            :
          </span>

          {/* Minutes Block */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span
              style={{
                color: "#ffffff",
                fontFamily: "monospace, Courier, sans-serif",
                fontSize: isVertical ? 20 : 24,
                fontWeight: 900,
                letterSpacing: "0.05em",
                textShadow: `0 0 8px ${theme.glowColor}`,
              }}
            >
              {countdown.minutesStr}
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.45)" }}>MIN</span>
          </div>

          <span
            style={{
              color: showColon ? theme.primaryColor : "transparent",
              fontSize: isVertical ? 18 : 22,
              fontWeight: 900,
              marginBottom: 10,
              transition: "color 0.1s",
            }}
          >
            :
          </span>

          {/* Seconds Block */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span
              style={{
                color: theme.primaryColor,
                fontFamily: "monospace, Courier, sans-serif",
                fontSize: isVertical ? 20 : 24,
                fontWeight: 900,
                letterSpacing: "0.05em",
                textShadow: `0 0 10px ${theme.glowColor}`,
              }}
            >
              {countdown.secondsStr}
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.45)" }}>SEC</span>
          </div>

          {config.showMilliseconds !== false && (
            <>
              <span
                style={{
                  color: "rgba(255, 255, 255, 0.4)",
                  fontSize: isVertical ? 16 : 18,
                  fontWeight: 900,
                  marginBottom: 10,
                }}
              >
                .
              </span>

              {/* Centiseconds Block */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span
                  style={{
                    color: "rgba(255, 255, 255, 0.8)",
                    fontFamily: "monospace, Courier, sans-serif",
                    fontSize: isVertical ? 16 : 19,
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                  }}
                >
                  {countdown.centisecondsStr}
                </span>
                <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.45)" }}>MS</span>
              </div>
            </>
          )}
        </div>

        {/* Live Inventory Scarcity Progress Bar */}
        {scarcity && (
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11,
                fontWeight: 800,
              }}
            >
              <span style={{ color: theme.primaryColor, letterSpacing: "0.04em" }}>
                {scarcity.stockLabel}
              </span>
              <span style={{ color: "rgba(255, 255, 255, 0.65)" }}>
                {scarcity.claimedPercentage}% Sold
              </span>
            </div>

            {/* Progress Track */}
            <div
              style={{
                width: "100%",
                height: 7,
                backgroundColor: "rgba(255, 255, 255, 0.12)",
                borderRadius: 999,
                overflow: "hidden",
                position: "relative",
              }}
            >
              <div
                style={{
                  width: `${scarcity.claimedPercentage}%`,
                  height: "100%",
                  background: theme.gradient,
                  borderRadius: 999,
                  boxShadow: `0 0 10px ${theme.primaryColor}`,
                  transition: "width 0.2s ease-out",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
