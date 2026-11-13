import React from "react";
import { useCurrentFrame, useVideoConfig, spring } from "remotion";
import { UsVsThemConfig, AdAspectRatio } from "@/lib/types/ecommerce";

export interface UsVsThemComparisonLayerProps {
  config: UsVsThemConfig;
  primaryColor?: string;
  aspectRatio: AdAspectRatio;
}

export const UsVsThemComparisonLayer: React.FC<UsVsThemComparisonLayerProps> = ({
  config,
  primaryColor = "#06b6d4",
  aspectRatio,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!config.enabled) return null;

  const isVertical = aspectRatio === "9:16";
  const usTitle = config.usTitle || "OUR BRAND";
  const themTitle = config.themTitle || "OTHERS";
  const rows = config.rows || [];

  // Card entrance spring
  const cardEntrance = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  return (
    <div
      style={{
        position: "absolute",
        top: isVertical ? "28%" : "20%",
        left: "50%",
        transform: `translateX(-50%) scale(${cardEntrance})`,
        width: isVertical ? "90%" : "70%",
        maxWidth: 680,
        backgroundColor: "rgba(9, 9, 11, 0.88)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1.5px solid ${primaryColor}44`,
        borderRadius: 24,
        padding: isVertical ? "20px 16px" : "24px 28px",
        boxShadow: `0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px ${primaryColor}22`,
        zIndex: 42,
        pointerEvents: "none",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Table Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 1fr 1fr",
          alignItems: "center",
          borderBottom: "1px solid rgba(255, 255, 255, 0.12)",
          paddingBottom: 12,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: isVertical ? 11 : 13,
            fontWeight: 800,
            color: "rgba(255, 255, 255, 0.5)",
            textTransform: "uppercase",
            letterSpacing: "0.8px",
          }}
        >
          Key Features
        </span>

        {/* Us Column Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `${primaryColor}20`,
            border: `1px solid ${primaryColor}66`,
            borderRadius: 12,
            padding: "4px 8px",
            color: "#ffffff",
            fontSize: isVertical ? 11 : 13,
            fontWeight: 900,
            textAlign: "center",
            letterSpacing: "0.5px",
          }}
        >
          {usTitle}
        </div>

        {/* Them Column Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255, 255, 255, 0.5)",
            fontSize: isVertical ? 11 : 13,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {themTitle}
        </div>
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {rows.map((row, idx) => {
          const rowEntrance = spring({
            frame: Math.max(0, frame - idx * 4),
            fps,
            config: { damping: 12, stiffness: 140 },
          });

          return (
            <div
              key={idx}
              style={{
                display: "grid",
                gridTemplateColumns: "1.4fr 1fr 1fr",
                alignItems: "center",
                transform: `translateX(${(1 - rowEntrance) * 20}px)`,
                opacity: rowEntrance,
                padding: "4px 0",
              }}
            >
              {/* Feature Name */}
              <span
                style={{
                  color: "#ffffff",
                  fontSize: isVertical ? 12 : 14,
                  fontWeight: 700,
                  letterSpacing: "-0.2px",
                }}
              >
                {row.feature}
              </span>

              {/* Us Check/Value */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  color: "#10b981",
                  fontSize: isVertical ? 12 : 14,
                  fontWeight: 900,
                }}
              >
                {typeof row.us === "boolean" ? (
                  row.us ? (
                    <span
                      style={{
                        backgroundColor: "#10b98125",
                        border: "1px solid #10b98188",
                        borderRadius: "50%",
                        width: 22,
                        height: 22,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ✓
                    </span>
                  ) : (
                    <span style={{ color: "#ef4444" }}>✕</span>
                  )
                ) : (
                  <span>{row.us}</span>
                )}
              </div>

              {/* Them Cross/Value */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  color: "#ef4444",
                  fontSize: isVertical ? 12 : 14,
                  fontWeight: 800,
                }}
              >
                {typeof row.them === "boolean" ? (
                  row.them ? (
                    <span style={{ color: "#10b981" }}>✓</span>
                  ) : (
                    <span
                      style={{
                        backgroundColor: "#ef444425",
                        border: "1px solid #ef444488",
                        borderRadius: "50%",
                        width: 22,
                        height: 22,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ✕
                    </span>
                  )
                ) : (
                  <span style={{ color: "rgba(255, 255, 255, 0.45)" }}>{row.them}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
