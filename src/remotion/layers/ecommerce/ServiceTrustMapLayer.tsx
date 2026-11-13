import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export interface ServiceTrustMapProps {
  startFrame?: number;
  accentColor?: string;
  serviceArea?: string;
  responseTimeMinutes?: number;
  guaranteeYears?: number;
  licensedAndInsured?: boolean;
  googleRating?: number;
  googleReviewCount?: number;
  brandName?: string;
  scale?: number;
}

export const ServiceTrustMapLayer: React.FC<ServiceTrustMapProps> = ({
  startFrame = 0,
  accentColor = "#06b6d4",
  serviceArea = "Austin Metro Area",
  responseTimeMinutes = 30,
  guaranteeYears = 10,
  licensedAndInsured = true,
  googleRating = 4.9,
  googleReviewCount = 480,
  scale = 1.0,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Entrance spring for main map canvas
  const mapEntrance = spring({
    frame: Math.max(0, frame - startFrame),
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  // Entrance spring for Map Pin
  const pinEntrance = spring({
    frame: Math.max(0, frame - startFrame - 4),
    fps,
    config: { damping: 12, stiffness: 150 },
  });

  // Entrance spring for Trust Shield
  const shieldEntrance = spring({
    frame: Math.max(0, frame - startFrame - 10),
    fps,
    config: { damping: 13, stiffness: 130 },
  });

  // Entrance spring for Google Review Badge
  const reviewEntrance = spring({
    frame: Math.max(0, frame - startFrame - 16),
    fps,
    config: { damping: 13, stiffness: 130 },
  });

  const timeSec = Math.max(0, frame - startFrame) / fps;

  // Concentric Radar Waves (3 staggered pulses)
  const ring1Progress = (timeSec * 0.65) % 1;
  const ring1Scale = interpolate(ring1Progress, [0, 1], [0.4, 2.5]);
  const ring1Opacity = interpolate(ring1Progress, [0, 0.6, 1], [0.75, 0.35, 0]);

  const ring2Progress = (timeSec * 0.65 + 0.33) % 1;
  const ring2Scale = interpolate(ring2Progress, [0, 1], [0.4, 2.5]);
  const ring2Opacity = interpolate(ring2Progress, [0, 0.6, 1], [0.75, 0.35, 0]);

  const ring3Progress = (timeSec * 0.65 + 0.66) % 1;
  const ring3Scale = interpolate(ring3Progress, [0, 1], [0.4, 2.5]);
  const ring3Opacity = interpolate(ring3Progress, [0, 0.6, 1], [0.75, 0.35, 0]);

  // Subtle floating bob for the pin
  const pinBob = Math.sin(timeSec * Math.PI * 2) * 5;

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
        pointerEvents: "none",
        zIndex: 20,
      }}
    >
      {/* ===================================================================== */}
      {/* 1. HIGH-TECH GPS VECTOR MAP BACKGROUND GRID                           */}
      {/* ===================================================================== */}
      <div
        style={{
          position: "relative",
          width: Math.min(width * 0.88, 480) * scale,
          height: 380 * scale,
          borderRadius: 24,
          backgroundColor: "#0d0f14",
          border: `1px solid ${accentColor}44`,
          overflow: "hidden",
          transform: `scale(${mapEntrance})`,
          boxShadow: `0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px ${accentColor}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Vector Street Grid Lines */}
        <svg
          width="100%"
          height="100%"
          style={{ position: "absolute", top: 0, left: 0, opacity: 0.28 }}
        >
          <defs>
            <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
              <circle cx="0" cy="0" r="1.5" fill={accentColor} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#gridPattern)" />

          {/* Stylized Transit & Road Arteries */}
          <path
            d="M -50,180 Q 150,160 250,220 T 550,190"
            fill="none"
            stroke={accentColor}
            strokeWidth="3"
            opacity="0.45"
          />
          <path
            d="M 120,-30 L 190,420"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeDasharray="6,4"
            opacity="0.35"
          />
          <path
            d="M 320,-30 L 270,420"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="1.5"
            opacity="0.3"
          />
        </svg>

        {/* Top-Left GPS Telemetry Readout */}
        <div
          style={{
            position: "absolute",
            top: 14,
            left: 16,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            fontFamily: "monospace",
            fontSize: 9,
            color: "rgba(255, 255, 255, 0.55)",
            zIndex: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: "#10b981",
                boxShadow: "0 0 8px #10b981",
              }}
            />
            <span style={{ color: "#10b981", fontWeight: 800 }}>LIVE GPS COVERAGE</span>
          </div>
          <div>DISPATCH RADIUS: 35 MILES</div>
          <div>LAT 30.2672° N • LON 97.7431° W</div>
        </div>

        {/* Top-Right Response Pill */}
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 16,
            backgroundColor: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: 20,
            padding: "4px 10px",
            color: "#10b981",
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: 0.5,
            display: "flex",
            alignItems: "center",
            gap: 4,
            zIndex: 10,
          }}
        >
          <span>⚡</span>
          <span>{responseTimeMinutes}-MIN DISPATCH</span>
        </div>

        {/* Concentric Radar Wave Rings */}
        <div
          style={{
            position: "absolute",
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: `2px solid ${accentColor}`,
            transform: `scale(${ring1Scale})`,
            opacity: ring1Opacity,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: `2px solid ${accentColor}`,
            transform: `scale(${ring2Scale})`,
            opacity: ring2Opacity,
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: `2px solid ${accentColor}`,
            transform: `scale(${ring3Scale})`,
            opacity: ring3Opacity,
            pointerEvents: "none",
          }}
        />

        {/* Radial Ambient Glow */}
        <div
          style={{
            position: "absolute",
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${accentColor}33 0%, transparent 70%)`,
          }}
        />

        {/* Center Glowing Map Pin */}
        <div
          style={{
            position: "relative",
            transform: `scale(${pinEntrance}) translateY(${pinBob}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            zIndex: 15,
          }}
        >
          {/* Custom SVG Location Pin */}
          <svg width="46" height="56" viewBox="0 0 46 56" fill="none">
            <defs>
              <filter id="pinShadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor={accentColor} floodOpacity="0.6" />
              </filter>
            </defs>
            <path
              d="M 23 2 C 11.4 2 2 11.4 2 23 C 2 36 23 54 23 54 C 23 54 44 36 44 23 C 44 11.4 34.6 2 23 2 Z"
              fill={accentColor}
              filter="url(#pinShadow)"
            />
            <circle cx="23" cy="22" r="9" fill="#09090b" />
            <circle cx="23" cy="22" r="5" fill="#ffffff" />
          </svg>

          {/* Location Area Pill Tag */}
          <div
            style={{
              backgroundColor: "rgba(9, 9, 11, 0.92)",
              border: `1.5px solid ${accentColor}`,
              borderRadius: 20,
              padding: "5px 14px",
              marginTop: 6,
              boxShadow: `0 8px 20px rgba(0,0,0,0.8), 0 0 15px ${accentColor}44`,
              display: "flex",
              alignItems: "center",
              gap: 6,
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 900, color: "#ffffff" }}>
              📍 {serviceArea.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. TRUST & COMPLIANCE SHIELD + GOOGLE RATING MATRIX                   */}
      {/* ===================================================================== */}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 14,
          maxWidth: Math.min(width * 0.9, 480) * scale,
          width: "100%",
          justifyContent: "center",
        }}
      >
        {/* Left: Licensed, Bonded & Insured Shield Badge */}
        {licensedAndInsured && (
          <div
            style={{
              flex: 1,
              transform: `scale(${shieldEntrance})`,
              opacity: shieldEntrance,
              background: "linear-gradient(135deg, rgba(20, 24, 33, 0.95) 0%, rgba(9, 11, 15, 0.95) 100%)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              borderRadius: 16,
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6), 0 0 15px rgba(245, 158, 11, 0.15)",
            }}
          >
            {/* Gold Shield Icon */}
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                backgroundColor: "rgba(245, 158, 11, 0.15)",
                border: "1.5px solid #f59e0b",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              🛡️
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 10, fontWeight: 900, color: "#f59e0b", letterSpacing: 0.4 }}>
                LICENSED & INSURED
              </div>
              <div style={{ fontSize: 8, color: "rgba(255, 255, 255, 0.75)", fontWeight: 700 }}>
                {guaranteeYears}-Year Workmanship Warranty
              </div>
            </div>
          </div>
        )}

        {/* Right: Live Google Reviews Rating Badge */}
        <div
          style={{
            flex: 1,
            transform: `scale(${reviewEntrance})`,
            opacity: reviewEntrance,
            background: "linear-gradient(135deg, rgba(20, 24, 33, 0.95) 0%, rgba(9, 11, 15, 0.95) 100%)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: 16,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6), 0 0 15px rgba(16, 185, 129, 0.15)",
          }}
        >
          {/* Star Rating Emblem */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              backgroundColor: "rgba(16, 185, 129, 0.15)",
              border: "1.5px solid #10b981",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 900,
              color: "#10b981",
              flexShrink: 0,
            }}
          >
            ★
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 900, color: "#ffffff" }}>
                {googleRating.toFixed(1)}
              </span>
              <span style={{ color: "#f59e0b", fontSize: 10 }}>★★★★★</span>
            </div>
            <div style={{ fontSize: 8, color: "rgba(255, 255, 255, 0.75)", fontWeight: 700 }}>
              {googleReviewCount}+ Verified Google Reviews
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
