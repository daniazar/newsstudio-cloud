import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import type { GaugeData } from "@/lib/studio/parsers/types";

export interface GaugeMeterLayerProps {
  data: GaugeData;
  startFrame?: number;
  width?: number | string;
  height?: number | string;
  isVertical?: boolean;
}

export const GaugeMeterLayer: React.FC<GaugeMeterLayerProps> = ({
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

  const minVal = data.minValue ?? 0;
  const maxVal = data.maxValue ?? 100;
  const curVal = data.currentValue ?? 50;
  const range = maxVal - minVal || 1;

  // Normalized fraction 0..1
  const targetFraction = Math.min(1, Math.max(0, (curVal - minVal) / range));

  // Needle spring animation
  const needleSpring = spring({
    frame: relFrame,
    fps,
    config: { damping: 12, stiffness: 65 },
  });

  const animatedFraction = targetFraction * needleSpring;
  // Angle: -90deg (far left / min) to +90deg (far right / max)
  const needleAngle = interpolate(animatedFraction, [0, 1], [-90, 90]);

  // Digital counter interpolator
  const displayedValue = Math.round(minVal + animatedFraction * range);

  const zones = data.zones || [
    { label: "Low", min: 0, max: 33, color: "#ef4444" },
    { label: "Moderate", min: 34, max: 66, color: "#f59e0b" },
    { label: "High", min: 67, max: 100, color: "#10b981" },
  ];

  // Determine active zone
  const activeZone =
    zones.find((z) => curVal >= z.min && curVal <= z.max) || zones[zones.length - 1];

  const primaryAccent = data.accentColor || activeZone.color || "#06b6d4";

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
          maxWidth: isVertical ? "100%" : "820px",
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
          alignItems: "center",
          gap: "16px",
        }}
      >
        {/* Header Bar */}
        <div style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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
                🎯 GAUGES & SENTIMENT
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

          <div
            style={{
              background: `${activeZone.color}20`,
              border: `1px solid ${activeZone.color}60`,
              color: activeZone.color,
              padding: "6px 14px",
              borderRadius: "10px",
              fontSize: isVertical ? "12px" : "14px",
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              boxShadow: `0 0 15px ${activeZone.color}30`,
            }}
          >
            {data.sentimentLabel || activeZone.label}
          </div>
        </div>

        {/* Semi-Circular SVG Gauge */}
        <div style={{ position: "relative", width: isVertical ? "280px" : "360px", marginTop: "10px" }}>
          <svg viewBox="0 0 360 210" style={{ width: "100%", height: "auto", display: "block" }}>
            <defs>
              <filter id="gaugeNeedleGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Arc Background Track */}
            <path
              d="M 40 180 A 140 140 0 0 1 320 180"
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="24"
              strokeLinecap="round"
            />

            {/* Render Colored Zone Segments */}
            {zones.map((zone, i) => {
              const zoneStartFrac = Math.max(0, (zone.min - minVal) / range);
              const zoneEndFrac = Math.min(1, (zone.max - minVal) / range);

              // Angles in radians: Math.PI (left) to 0 (right)
              const startAngle = Math.PI * (1 - zoneStartFrac);
              const endAngle = Math.PI * (1 - zoneEndFrac);

              const r = 140;
              const cx = 180;
              const cy = 180;

              const x1 = cx + r * Math.cos(startAngle);
              const y1 = cy - r * Math.sin(startAngle);
              const x2 = cx + r * Math.cos(endAngle);
              const y2 = cy - r * Math.sin(endAngle);

              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
                  fill="none"
                  stroke={zone.color}
                  strokeWidth="24"
                  strokeLinecap="butt"
                  opacity={activeZone.label === zone.label ? "0.95" : "0.35"}
                />
              );
            })}

            {/* Gauge Needle */}
            <g transform={`translate(180, 180) rotate(${needleAngle})`}>
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="-130"
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#gaugeNeedleGlow)"
              />
              <polygon
                points="-7,0 7,0 0,-140"
                fill={activeZone.color}
                filter="url(#gaugeNeedleGlow)"
              />
              {/* Center Hub Pivot */}
              <circle cx="0" cy="0" r="14" fill="#0f172a" stroke="#ffffff" strokeWidth="4" />
              <circle cx="0" cy="0" r="6" fill={activeZone.color} />
            </g>
          </svg>

          {/* Large Digital Counter Under Needle */}
          <div
            style={{
              position: "absolute",
              bottom: "0px",
              left: "0",
              right: "0",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: isVertical ? "36px" : "46px",
                fontWeight: 900,
                fontFamily: "monospace",
                letterSpacing: "-0.03em",
                color: "#ffffff",
                lineHeight: 1,
              }}
            >
              {data.formattedValue || `${displayedValue}${data.unit ? ` ${data.unit}` : ""}`}
            </div>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, marginTop: "4px" }}>
              RANGE: {minVal} — {maxVal} {data.unit || ""}
            </div>
          </div>
        </div>

        {/* Bottom Zone Pill Legend */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", marginTop: "12px" }}>
          {zones.map((zone, idx) => (
            <div
              key={idx}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(255, 255, 255, 0.05)",
                padding: "4px 10px",
                borderRadius: "6px",
                fontSize: "11px",
                fontWeight: 700,
                color: "#cbd5e1",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: zone.color,
                }}
              />
              <span>{zone.label}</span>
              <span style={{ color: "#64748b", fontFamily: "monospace" }}>
                ({zone.min}-{zone.max})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
