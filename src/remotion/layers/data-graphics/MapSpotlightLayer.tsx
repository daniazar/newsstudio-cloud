import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import type { MapTracerData } from "@/lib/studio/parsers/types";

export interface MapSpotlightLayerProps {
  data: MapTracerData;
  startFrame?: number;
  width?: number | string;
  height?: number | string;
  isVertical?: boolean;
}

export const MapSpotlightLayer: React.FC<MapSpotlightLayerProps> = ({
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

  const waypoints = data.waypoints || [];
  const routes = data.routes || [];
  const primaryAccent = data.accentColor || "#06b6d4";

  const svgWidth = 860;
  const svgHeight = isVertical ? 420 : 360;

  // Radar ripple radius oscillation
  const radarPulse = (relFrame % 45) / 45; // 0..1 loop every 1.5s
  const rippleRadius = interpolate(radarPulse, [0, 1], [6, 24]);
  const rippleOpacity = interpolate(radarPulse, [0, 1], [0.8, 0]);

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
                🗺️ 3D MAP & ROUTE TRACER
              </span>
              <span style={{ fontSize: isVertical ? "11px" : "12px", color: "#94a3b8", fontWeight: 700 }}>
                REGION: {data.region.toUpperCase().replace(/_/g, " ")}
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

          {data.spotlightNote && (
            <div
              style={{
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.4)",
                color: "#fbbf24",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 700,
                maxWidth: "240px",
                textAlign: "right",
              }}
            >
              ⚠️ {data.spotlightNote}
            </div>
          )}
        </div>

        {/* Map Vector Stage */}
        <div
          style={{
            position: "relative",
            width: "100%",
            borderRadius: "16px",
            overflow: "hidden",
            background: "radial-gradient(ellipse at center, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: "100%", height: "auto", display: "block" }}>
            <defs>
              {/* High-tech Map Background Grid Pattern */}
              <pattern id="mapGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.04)" strokeWidth="1" />
                <circle cx="40" cy="40" r="1.5" fill="rgba(6, 182, 212, 0.25)" />
              </pattern>
              <filter id="routeGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Grid Backdrop */}
            <rect width={svgWidth} height={svgHeight} fill="url(#mapGrid)" />

            {/* Stylized Vector Map Contours */}
            {/* Stylized landmass silhouette silhouettes */}
            <g opacity="0.18" fill="rgba(148, 163, 184, 0.4)" stroke="rgba(6, 182, 212, 0.4)" strokeWidth="1">
              {/* Americas */}
              <path d="M 80 60 Q 140 70 170 130 Q 150 200 200 280 Q 180 340 140 320 Q 100 220 70 140 Z" />
              {/* Europe & Africa */}
              <path d="M 380 60 Q 480 50 490 120 Q 520 220 460 330 Q 400 340 370 240 Q 350 160 380 60 Z" />
              {/* Asia & Pacific */}
              <path d="M 520 70 Q 720 60 760 160 Q 700 260 620 280 Q 560 210 520 70 Z" />
            </g>

            {/* Render Animated Routes */}
            {routes.map((route, idx) => {
              const fromWp = waypoints.find((w) => w.id === route.fromId);
              const toWp = waypoints.find((w) => w.id === route.toId);
              if (!fromWp || !toWp) return null;

              const x1 = (fromWp.coords[0] / 100) * svgWidth;
              const y1 = (fromWp.coords[1] / 100) * svgHeight;
              const x2 = (toWp.coords[0] / 100) * svgWidth;
              const y2 = (toWp.coords[1] / 100) * svgHeight;

              // Arc Midpoint with Curvature offset
              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2 - ((route.curvature ?? 0.3) * 120);

              const pathStr = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;

              const routeSpring = spring({
                frame: relFrame - idx * 4,
                fps,
                config: { damping: 18, stiffness: 60 },
              });

              const routeColor = route.color || (route.status === "diverted" ? "#f59e0b" : route.status === "blocked" ? "#ef4444" : "#06b6d4");
              const strokeDashoffset = interpolate(routeSpring, [0, 1], [1200, 0]);

              return (
                <g key={route.id || idx}>
                  {/* Route Background Glow Line */}
                  <path
                    d={pathStr}
                    fill="none"
                    stroke={routeColor}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="1200"
                    strokeDashoffset={strokeDashoffset}
                    filter="url(#routeGlow)"
                    opacity="0.85"
                  />
                  {/* Route Dashed Overlay */}
                  <path
                    d={pathStr}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="8 8"
                    strokeDashoffset={strokeDashoffset - (relFrame * (route.dashSpeed || 2))}
                    opacity="0.7"
                  />
                  {/* Route Label */}
                  {route.label && (
                    <text
                      x={midX}
                      y={midY - 12}
                      textAnchor="middle"
                      fill={routeColor}
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {route.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Render Waypoint Nodes & Radar Pings */}
            {waypoints.map((wp, idx) => {
              const x = (wp.coords[0] / 100) * svgWidth;
              const y = (wp.coords[1] / 100) * svgHeight;

              const wpColor = wp.color || (wp.status === "alert" ? "#ef4444" : wp.status === "chokepoint" ? "#f59e0b" : "#06b6d4");

              const nodeSpring = spring({
                frame: relFrame - idx * 3,
                fps,
                config: { damping: 12, stiffness: 85 },
              });

              return (
                <g key={wp.id || idx} opacity={nodeSpring}>
                  {/* Radar Ripple Ping */}
                  <circle
                    cx={x}
                    cy={y}
                    r={rippleRadius}
                    fill="none"
                    stroke={wpColor}
                    strokeWidth="2"
                    opacity={rippleOpacity}
                  />

                  {/* Core Node Circle */}
                  <circle cx={x} cy={y} r={6} fill="#ffffff" stroke={wpColor} strokeWidth="3" filter="url(#routeGlow)" />

                  {/* Floating Waypoint Label Card */}
                  <g transform={`translate(${x}, ${y - 20})`}>
                    <rect
                      x="-55"
                      y="-22"
                      width="110"
                      height="24"
                      rx="6"
                      fill="rgba(15, 23, 42, 0.9)"
                      stroke={wpColor}
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="-7"
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="10"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {wp.name}
                    </text>
                    {wp.value && (
                      <text
                        x="0"
                        y="18"
                        textAnchor="middle"
                        fill={wpColor}
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {wp.value}
                      </text>
                    )}
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
