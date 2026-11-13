import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import type { BarRaceData } from "@/lib/studio/parsers/types";

export interface BarRaceLayerProps {
  data: BarRaceData;
  startFrame?: number;
  width?: number | string;
  height?: number | string;
  isVertical?: boolean;
}

const DEFAULT_BAR_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#6366f1", // Indigo
];

export const BarRaceLayer: React.FC<BarRaceLayerProps> = ({
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

  const items = data.items || [];
  const maxVal = data.maxValue || (items.length > 0 ? Math.max(...items.map((it) => it.value)) * 1.15 : 100);
  const primaryAccent = data.accentColor || "#3b82f6";

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
          maxWidth: isVertical ? "100%" : "880px",
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
          gap: "18px",
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
                🏁 COMPARISON RANKINGS
              </span>
              {data.category && (
                <span style={{ fontSize: isVertical ? "12px" : "13px", color: "#94a3b8", fontWeight: 600 }}>
                  {data.category}
                </span>
              )}
            </div>

            <h2
              style={{
                fontSize: isVertical ? "22px" : "28px",
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

          {data.unit && (
            <div
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                padding: "4px 10px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 700,
                color: "#cbd5e1",
                fontFamily: "monospace",
              }}
            >
              UNIT: {data.unit}
            </div>
          )}
        </div>

        {/* Animated Bar List */}
        <div style={{ display: "flex", flexDirection: "column", gap: isVertical ? "12px" : "14px" }}>
          {items.map((item, idx) => {
            const barSpring = spring({
              frame: relFrame - idx * 3.5,
              fps,
              config: { damping: 14, stiffness: 75 },
            });

            const barColor = item.color || DEFAULT_BAR_COLORS[idx % DEFAULT_BAR_COLORS.length];
            const targetPct = Math.min(100, Math.max(5, (item.value / maxVal) * 100));
            const animatedWidthPct = targetPct * barSpring;

            const isGold = idx === 0;
            const isSilver = idx === 1;
            const isBronze = idx === 2;

            const medalBadge = isGold ? "🥇" : isSilver ? "🥈" : isBronze ? "🥉" : `#${idx + 1}`;

            return (
              <div
                key={item.id || idx}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                  opacity: barSpring,
                }}
              >
                {/* Top Label & Value Line */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: isVertical ? "13px" : "15px",
                    fontWeight: 700,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontSize: isVertical ? "12px" : "14px",
                        color: isGold ? "#fbbf24" : isSilver ? "#cbd5e1" : isBronze ? "#d97706" : "#64748b",
                        fontWeight: 900,
                      }}
                    >
                      {medalBadge}
                    </span>
                    {item.icon && <span>{item.icon}</span>}
                    <span style={{ color: "#f8fafc" }}>{item.label}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontFamily: "monospace",
                        fontWeight: 900,
                        fontSize: isVertical ? "14px" : "17px",
                        color: "#ffffff",
                      }}
                    >
                      {item.formattedValue || item.value}
                    </span>
                    {item.delta && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 800,
                          color: item.delta.startsWith("-") ? "#f87171" : "#4ade80",
                          background: item.delta.startsWith("-")
                            ? "rgba(239, 68, 68, 0.15)"
                            : "rgba(16, 185, 129, 0.15)",
                          padding: "2px 6px",
                          borderRadius: "4px",
                          fontFamily: "monospace",
                        }}
                      >
                        {item.delta}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bar Track & Fill */}
                <div
                  style={{
                    width: "100%",
                    height: isVertical ? "18px" : "22px",
                    background: "rgba(255, 255, 255, 0.06)",
                    borderRadius: "8px",
                    overflow: "hidden",
                    position: "relative",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <div
                    style={{
                      width: `${animatedWidthPct}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, ${barColor} 0%, ${barColor}dd 80%, #ffffff 100%)`,
                      borderRadius: "8px",
                      boxShadow: `0 0 16px ${barColor}60`,
                      transition: "width 0.1s ease-out",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
