import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import type { SpecMatrixData } from "@/lib/studio/parsers/types";

export interface SpecMatrixLayerProps {
  data: SpecMatrixData;
  startFrame?: number;
  width?: number | string;
  height?: number | string;
  isVertical?: boolean;
}

export const SpecMatrixLayer: React.FC<SpecMatrixLayerProps> = ({
  data,
  startFrame = 0,
  width = "100%",
  height = "100%",
  isVertical = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const relFrame = Math.max(0, frame - startFrame);

  const entrance = spring({
    frame: relFrame,
    fps,
    config: { damping: 14, stiffness: 90 },
  });

  const cardOpacity = interpolate(entrance, [0, 1], [0, 1]);
  const cardScale = interpolate(entrance, [0, 1], [0.95, 1]);

  const rows = data.rows || [];
  const primaryAccent = data.accentColor || "#8b5cf6";
  const itemAColor = data.itemA.accentColor || "#3b82f6";
  const itemBColor = data.itemB.accentColor || "#f59e0b";

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        opacity: cardOpacity,
        transform: `scale(${cardScale})`,
        padding: isVertical ? "16px" : "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: isVertical ? "100%" : "920px",
          background: "linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.98) 100%)",
          border: `1px solid ${primaryAccent}50`,
          boxShadow: `0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px ${primaryAccent}25`,
          borderRadius: "24px",
          padding: isVertical ? "20px" : "28px",
          backdropFilter: "blur(18px)",
          color: "#ffffff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {/* Header Bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  background: `${primaryAccent}25`,
                  color: primaryAccent,
                  border: `1px solid ${primaryAccent}60`,
                  fontSize: isVertical ? "11px" : "12px",
                  fontWeight: 800,
                  padding: "3px 9px",
                  borderRadius: "6px",
                  letterSpacing: "0.08em",
                  fontFamily: "monospace",
                }}
              >
                ⚖️ SIDE-BY-SIDE SPEC MATRIX
              </span>
            </div>

            <h2
              style={{
                fontSize: isVertical ? "20px" : "26px",
                fontWeight: 900,
                letterSpacing: "-0.02em",
                marginTop: "6px",
                color: "#ffffff",
              }}
            >
              {data.title}
            </h2>

            {data.subtitle && (
              <p style={{ fontSize: isVertical ? "12px" : "14px", color: "#94a3b8", marginTop: "2px" }}>
                {data.subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Dual Entity Hero Headers */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: isVertical ? "10px" : "16px" }}>
          {/* Item A Card */}
          <div
            style={{
              background: `linear-gradient(135deg, ${itemAColor}15 0%, rgba(15, 23, 42, 0.6) 100%)`,
              border: `1px solid ${itemAColor}50`,
              boxShadow: `0 8px 24px ${itemAColor}15`,
              borderRadius: "16px",
              padding: isVertical ? "12px" : "16px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: isVertical ? "14px" : "18px", fontWeight: 800, color: "#ffffff" }}>
                {data.itemA.title}
              </span>
              {data.itemA.badge && (
                <span
                  style={{
                    background: `${itemAColor}30`,
                    color: itemAColor,
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                  }}
                >
                  {data.itemA.badge}
                </span>
              )}
            </div>
            {data.itemA.subtitle && (
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>{data.itemA.subtitle}</span>
            )}
          </div>

          {/* Item B Card */}
          <div
            style={{
              background: `linear-gradient(135deg, ${itemBColor}15 0%, rgba(15, 23, 42, 0.6) 100%)`,
              border: `1px solid ${itemBColor}50`,
              boxShadow: `0 8px 24px ${itemBColor}15`,
              borderRadius: "16px",
              padding: isVertical ? "12px" : "16px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: isVertical ? "14px" : "18px", fontWeight: 800, color: "#ffffff" }}>
                {data.itemB.title}
              </span>
              {data.itemB.badge && (
                <span
                  style={{
                    background: `${itemBColor}30`,
                    color: itemBColor,
                    fontSize: "10px",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: "6px",
                    fontFamily: "monospace",
                  }}
                >
                  {data.itemB.badge}
                </span>
              )}
            </div>
            {data.itemB.subtitle && (
              <span style={{ fontSize: "12px", color: "#94a3b8" }}>{data.itemB.subtitle}</span>
            )}
          </div>
        </div>

        {/* Comparison Rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {rows.map((row, idx) => {
            const rowSpring = spring({
              frame: relFrame - idx * 3,
              fps,
              config: { damping: 14, stiffness: 80 },
            });

            const isWinnerA = row.winner === "A";
            const isWinnerB = row.winner === "B";

            return (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: isVertical ? "10px" : "16px",
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: "12px",
                  padding: isVertical ? "8px 12px" : "10px 16px",
                  opacity: rowSpring,
                  transform: `translateY(${interpolate(rowSpring, [0, 1], [15, 0])}px)`,
                }}
              >
                {/* Side A Row Cell */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingRight: "10px",
                    borderRight: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                      {row.label}
                    </span>
                    <span
                      style={{
                        fontSize: isVertical ? "13px" : "15px",
                        fontWeight: 800,
                        fontFamily: "monospace",
                        color: isWinnerA ? "#4ade80" : "#ffffff",
                      }}
                    >
                      {row.valA}
                    </span>
                  </div>
                  {isWinnerA && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 900,
                        color: "#10b981",
                        background: "rgba(16, 185, 129, 0.15)",
                        border: "1px solid rgba(16, 185, 129, 0.4)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      WINNER ✓
                    </span>
                  )}
                </div>

                {/* Side B Row Cell */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingLeft: "6px",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: "10px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>
                      {row.label}
                    </span>
                    <span
                      style={{
                        fontSize: isVertical ? "13px" : "15px",
                        fontWeight: 800,
                        fontFamily: "monospace",
                        color: isWinnerB ? "#4ade80" : "#ffffff",
                      }}
                    >
                      {row.valB}
                    </span>
                  </div>
                  {isWinnerB && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 900,
                        color: "#10b981",
                        background: "rgba(16, 185, 129, 0.15)",
                        border: "1px solid rgba(16, 185, 129, 0.4)",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                    >
                      WINNER ✓
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Takeaway Verdict */}
        {data.verdict && (
          <div
            style={{
              background: "linear-gradient(90deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)",
              border: "1px solid rgba(139, 92, 246, 0.4)",
              borderRadius: "12px",
              padding: isVertical ? "8px 12px" : "12px 16px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span style={{ fontSize: "14px" }}>💡</span>
            <span style={{ fontSize: isVertical ? "11px" : "13px", fontWeight: 700, color: "#e2e8f0" }}>
              {data.verdict}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
