import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { RobustImg } from "../../components/RobustImg";

export interface DeviceMockup3DProps {
  screenMediaUrl?: string;
  startFrame?: number;
  accentColor?: string;
  deviceType?: "laptop" | "phone";
  timeSavedMetric?: string;
  beforeMetric?: string;
  afterMetric?: string;
  integrations?: string[];
  brandName?: string;
  scale?: number;
}

export const DeviceMockup3DLayer: React.FC<DeviceMockup3DProps> = ({
  screenMediaUrl,
  startFrame = 0,
  accentColor = "#06b6d4",
  deviceType = "laptop",
  timeSavedMetric = "98% TIME SAVED ⚡",
  beforeMetric = "Manual Workflow: 4 Hours",
  afterMetric = "Automated: 15 Seconds",
  integrations = ["Slack", "Stripe", "Shopify", "Zapier"],
  brandName = "Ruby",
  scale = 1.0,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Entrance spring for main device
  const entrance = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 14, stiffness: 120, mass: 0.9 },
  });

  // Staggered entrance for Speedometer HUD
  const hudEntrance = spring({
    frame: Math.max(0, frame - startFrame - 6),
    fps,
    config: { damping: 12, stiffness: 130 },
  });

  // Staggered entrance for Integration pills
  const integrationsEntrance = spring({
    frame: Math.max(0, frame - startFrame - 12),
    fps,
    config: { damping: 15, stiffness: 140 },
  });

  const timeSec = Math.max(0, frame - startFrame) / fps;

  // Harmonic 3D oscillation
  const floatY = Math.sin(timeSec * Math.PI * 1.5) * 10;
  const rotateY = -8 + Math.cos(timeSec * Math.PI * 0.8) * 6;
  const rotateX = 6 + Math.sin(timeSec * Math.PI * 0.6) * 4;

  // Shadow expands when object is lower, contracts when higher
  const shadowScale = interpolate(floatY, [-10, 10], [0.88, 1.12]);
  const shadowOpacity = interpolate(floatY, [-10, 10], [0.25, 0.45]);

  // Specular sheen sweep angle
  const sheenProgress = (timeSec * 0.4) % 2.5;
  const sheenTranslate = interpolate(sheenProgress, [0, 1], [-150, 250], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const isPhone = deviceType === "phone";

  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        perspective: 1200,
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      {/* 3D Floating Clay Device Stage */}
      <div
        style={{
          position: "relative",
          transform: `scale(${entrance * scale}) translateY(${floatY}px) rotateY(${rotateY}deg) rotateX(${rotateX}deg)`,
          transformStyle: "preserve-3d",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          maxWidth: isPhone ? "55%" : "82%",
        }}
      >
        {isPhone ? (
          /* ================================================================= */
          /* PHONE CLAY MOCKUP                                                */
          /* ================================================================= */
          <div
            style={{
              position: "relative",
              width: 240,
              height: 480,
              backgroundColor: "#18181b",
              borderRadius: 42,
              padding: 10,
              border: "2px solid rgba(255, 255, 255, 0.18)",
              boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 30px ${accentColor}22`,
            }}
          >
            {/* Dynamic Island Pill */}
            <div
              style={{
                position: "absolute",
                top: 18,
                left: "50%",
                transform: "translateX(-50%)",
                width: 70,
                height: 18,
                backgroundColor: "#09090b",
                borderRadius: 12,
                zIndex: 30,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 8px",
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#1c1917" }} />
              <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#10b981" }} />
            </div>

            {/* Screen Inner Viewport */}
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#09090b",
                borderRadius: 34,
                overflow: "hidden",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {screenMediaUrl ? (
                <RobustImg
                  src={screenMediaUrl}
                  alt="App UI"
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                /* Fallback Phone SaaS UI */
                <div style={{ padding: "40px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontSize: 11, fontWeight: 900, color: "#ffffff" }}>{brandName} Mobile</div>
                    <div style={{ fontSize: 9, color: "#10b981", fontWeight: 800 }}>LIVE SYNC</div>
                  </div>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      borderRadius: 12,
                      padding: "10px",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)" }}>Automated Efficiency</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: accentColor }}>+380%</div>
                  </div>
                  <div
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      borderRadius: 12,
                      padding: "8px 10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div style={{ width: "80%", height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)" }} />
                    <div style={{ width: "60%", height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)" }} />
                  </div>
                </div>
              )}

              {/* Specular Sheen Sweep */}
              <div
                style={{
                  position: "absolute",
                  top: "-50%",
                  left: "-50%",
                  width: "200%",
                  height: "200%",
                  transform: `rotate(35deg) translateX(${sheenTranslate}%)`,
                  background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.25) 50%, transparent 100%)",
                  pointerEvents: "none",
                }}
              />
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* LAPTOP CLAY MOCKUP (MacBook Pro Style)                           */
          /* ================================================================= */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {/* Display Lid */}
            <div
              style={{
                width: 360,
                height: 230,
                backgroundColor: "#18181b",
                borderRadius: "14px 14px 2px 2px",
                padding: "8px 8px 10px 8px",
                border: "1.5px solid rgba(255, 255, 255, 0.2)",
                boxShadow: `0 30px 60px -12px rgba(0, 0, 0, 0.85), 0 0 35px ${accentColor}25`,
                position: "relative",
              }}
            >
              {/* Webcam Notch / Status Dot */}
              <div
                style={{
                  position: "absolute",
                  top: 3,
                  left: "50%",
                  transform: "translateX(-50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <div style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#09090b" }} />
                <div style={{ width: 2, height: 2, borderRadius: "50%", backgroundColor: "#10b981" }} />
              </div>

              {/* Screen Inner Viewport */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#09090b",
                  borderRadius: 8,
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {screenMediaUrl ? (
                  <RobustImg
                    src={screenMediaUrl}
                    alt="SaaS Platform UI"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  /* Fallback SaaS Analytics Dashboard */
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      padding: "10px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      background: "linear-gradient(135deg, #09090b 0%, #18181b 100%)",
                    }}
                  >
                    {/* SaaS Dashboard Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: accentColor }} />
                        <span style={{ fontSize: 10, fontWeight: 900, color: "#ffffff", letterSpacing: 0.5 }}>{brandName.toUpperCase()} CLOUD</span>
                      </div>
                      <span style={{ fontSize: 8, color: "#10b981", fontWeight: 800, backgroundColor: "rgba(16,185,129,0.15)", padding: "1px 6px", borderRadius: 10 }}>● 99.9% UPTIME</span>
                    </div>

                    {/* KPI Stat Cards */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.5)" }}>TIME SPENT</div>
                        <div style={{ fontSize: 12, fontWeight: 900, color: "#10b981" }}>-98%</div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.5)" }}>OUTPUT</div>
                        <div style={{ fontSize: 12, fontWeight: 900, color: accentColor }}>10x Faster</div>
                      </div>
                      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "6px", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div style={{ fontSize: 7, color: "rgba(255,255,255,0.5)" }}>AUTOMATED</div>
                        <div style={{ fontSize: 12, fontWeight: 900, color: "#ffffff" }}>100%</div>
                      </div>
                    </div>

                    {/* High-Tech Trend Graph */}
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", borderRadius: 6, border: "1px solid rgba(255,255,255,0.05)", padding: 6, display: "flex", alignItems: "flex-end", gap: 6 }}>
                      {[35, 45, 60, 50, 75, 90, 85, 100].map((val, idx) => (
                        <div
                          key={idx}
                          style={{
                            flex: 1,
                            height: `${val}%`,
                            backgroundColor: idx === 7 ? accentColor : "rgba(255,255,255,0.15)",
                            borderRadius: "2px 2px 0 0",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Specular Sheen Sweep */}
                <div
                  style={{
                    position: "absolute",
                    top: "-50%",
                    left: "-50%",
                    width: "200%",
                    height: "200%",
                    transform: `rotate(35deg) translateX(${sheenTranslate}%)`,
                    background: "linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.25) 50%, transparent 100%)",
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>

            {/* Bottom Keyboard Deck & Trackpad */}
            <div
              style={{
                width: 420,
                height: 14,
                backgroundColor: "#27272a",
                borderRadius: "2px 2px 10px 10px",
                borderTop: "1px solid rgba(255, 255, 255, 0.25)",
                boxShadow: "0 8px 16px rgba(0, 0, 0, 0.7)",
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
              }}
            >
              {/* Center Thumb Notch */}
              <div
                style={{
                  width: 50,
                  height: 4,
                  backgroundColor: "#18181b",
                  borderRadius: "0 0 4px 4px",
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Ground Elevation Shadow */}
      <div
        style={{
          width: (isPhone ? 200 : 360) * scale * shadowScale * entrance,
          height: 32 * shadowScale * entrance,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, rgba(0, 0, 0, ${shadowOpacity}) 0%, transparent 75%)`,
          marginTop: 18,
          transform: `scale(${entrance})`,
        }}
      />

      {/* ===================================================================== */}
      {/* WORKFLOW SPEEDOMETER HUD CARD                                         */}
      {/* ===================================================================== */}
      <div
        style={{
          position: "absolute",
          bottom: 90,
          transform: `scale(${hudEntrance})`,
          opacity: hudEntrance,
          background: "rgba(9, 9, 11, 0.88)",
          backdropFilter: "blur(14px)",
          border: `1px solid ${accentColor}66`,
          borderRadius: 18,
          padding: "10px 18px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          boxShadow: `0 12px 32px rgba(0, 0, 0, 0.75), 0 0 20px ${accentColor}22`,
          maxWidth: "88%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#f59e0b" }}>⚡</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 900,
              letterSpacing: 1,
              color: "rgba(255, 255, 255, 0.75)",
              textTransform: "uppercase",
            }}
          >
            Workflow Speedometer
          </span>
        </div>

        {/* Side-by-Side Comparison */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Before */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#f87171",
              textDecoration: "line-through",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              padding: "3px 8px",
              borderRadius: 6,
              border: "1px solid rgba(239, 68, 68, 0.25)",
            }}
          >
            {beforeMetric}
          </div>

          <span style={{ color: "rgba(255, 255, 255, 0.4)", fontSize: 11 }}>➔</span>

          {/* After */}
          <div
            style={{
              fontSize: 11,
              fontWeight: 900,
              color: "#10b981",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              padding: "3px 10px",
              borderRadius: 6,
              border: "1px solid rgba(16, 185, 129, 0.35)",
            }}
          >
            {afterMetric}
          </div>
        </div>

        {/* Highlight Time Saved Pill */}
        <div
          style={{
            backgroundColor: accentColor,
            color: "#09090b",
            fontSize: 10,
            fontWeight: 900,
            padding: "2px 10px",
            borderRadius: 12,
            letterSpacing: 0.5,
            marginTop: 2,
          }}
        >
          {timeSavedMetric}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* GLASSMORPHIC INTEGRATION BADGES                                       */}
      {/* ===================================================================== */}
      {integrations && integrations.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 45,
            transform: `scale(${integrationsEntrance})`,
            opacity: integrationsEntrance,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 800,
              color: "rgba(255, 255, 255, 0.5)",
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginRight: 4,
            }}
          >
            Integrates with:
          </span>
          {integrations.slice(0, 4).map((tool, idx) => (
            <div
              key={idx}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                fontSize: 10,
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: 6,
                letterSpacing: 0.4,
              }}
            >
              {tool}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
