import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface PricePromoBadgeProps {
  price: number;
  compareAtPrice?: number;
  currency?: string;
  discountPercentage?: number;
  promoCode?: string;
  startFrame?: number;
  accentColor?: string;
}

export const PricePromoBadgeLayer: React.FC<PricePromoBadgeProps> = ({
  price,
  compareAtPrice,
  currency = "$",
  discountPercentage,
  promoCode,
  startFrame = 0,
  accentColor = "#06b6d4",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 13, stiffness: 130 },
  });

  // Animated strike-through line
  const strikeProgress = interpolate(frame - startFrame, [10, 25], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const currSymbol = currency === "USD" ? "$" : currency === "EUR" ? "€" : currency === "GBP" ? "£" : currency;

  return (
    <div
      style={{
        transform: `scale(${entrance}) translateY(${(1 - entrance) * 20}px)`,
        backgroundColor: "rgba(9, 9, 11, 0.92)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255, 255, 255, 0.15)",
        boxShadow: "0 10px 35px rgba(0, 0, 0, 0.5)",
        borderRadius: 24,
        padding: "20px 36px",
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        pointerEvents: "none",
        zIndex: 45,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        {/* Main Current Price */}
        <div style={{ color: "#ffffff", fontWeight: 900, fontSize: 50, letterSpacing: -0.5 }}>
          {currSymbol}{price.toFixed(2)}
        </div>

        {/* Compare-at Strike-Through */}
        {compareAtPrice && compareAtPrice > price && (
          <div style={{ position: "relative", color: "rgba(255, 255, 255, 0.5)", fontSize: 32, fontWeight: 700 }}>
            {currSymbol}{compareAtPrice.toFixed(2)}
            {/* Animated red strike line */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                width: `${strikeProgress}%`,
                height: 4,
                backgroundColor: "#ef4444",
                transform: "rotate(-10deg)",
              }}
            />
          </div>
        )}

        {/* Discount Pill */}
        {discountPercentage && (
          <div
            style={{
              backgroundColor: "#ef4444",
              color: "#ffffff",
              fontSize: 18,
              fontWeight: 900,
              padding: "6px 14px",
              borderRadius: 10,
              boxShadow: "0 2px 10px rgba(239, 68, 68, 0.5)",
            }}
          >
            -{discountPercentage}%
          </div>
        )}
      </div>

      {/* Promo Code Pill */}
      {promoCode && (
        <div
          style={{
            backgroundColor: `${accentColor}22`,
            border: `1.5px dashed ${accentColor}`,
            color: accentColor,
            fontSize: 17,
            fontWeight: 800,
            padding: "6px 16px",
            borderRadius: 8,
            letterSpacing: 0.5,
          }}
        >
          USE CODE: {promoCode}
        </div>
      )}
    </div>
  );
};
