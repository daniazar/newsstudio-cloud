import React from "react";
import { spring, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ShoppableHotspotsConfig, AdAspectRatio } from "@/lib/types/ecommerce";
import { RobustImg } from "../../components/RobustImg";
import { resolveSrc } from "../../utils/resolveSrc";

export interface ShoppableHotspotLayerProps {
  config: ShoppableHotspotsConfig;
  accentColor?: string;
  aspectRatio: AdAspectRatio;
}

export const ShoppableHotspotLayer: React.FC<ShoppableHotspotLayerProps> = ({
  config,
  accentColor = "#06b6d4",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!config || !config.enabled || !config.hotspots || config.hotspots.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 42,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {config.hotspots.map((hotspot, idx) => {
        const startFrame = hotspot.startFrame ?? 0;
        const durationFrames = hotspot.durationFrames ?? 180;
        const elapsed = frame - startFrame;

        // Skip if outside active frame range
        if (elapsed < 0 || elapsed > durationFrames) return null;

        // Entrance spring animation
        const entrance = spring({
          frame: elapsed,
          fps,
          config: { damping: 13, stiffness: 140 },
        });

        // Exit interpolation in the last 15 frames
        const exitProgress = interpolate(
          elapsed,
          [durationFrames - 15, durationFrames],
          [1, 0],
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );

        const scale = entrance * exitProgress;
        const opacity = Math.min(entrance, exitProgress);

        const color = hotspot.pulseColor || accentColor;

        // Concentric radar pulsing waves (45 frames period = 1.5s at 30fps)
        const wavePeriod = 45;
        const p1 = (elapsed % wavePeriod) / wavePeriod;
        const waveScale1 = interpolate(p1, [0, 1], [1, 2.3]);
        const waveOpacity1 = interpolate(p1, [0, 0.8, 1], [0.75, 0.2, 0]);

        const p2 = ((elapsed + 22) % wavePeriod) / wavePeriod;
        const waveScale2 = interpolate(p2, [0, 1], [1, 2.3]);
        const waveOpacity2 = interpolate(p2, [0, 0.8, 1], [0.75, 0.2, 0]);

        // Place pill to the right unless hotspot is near the right edge
        const isRightAligned = hotspot.x > 70;

        return (
          <div
            key={hotspot.id || idx}
            style={{
              position: "absolute",
              left: `${hotspot.x}%`,
              top: `${hotspot.y}%`,
              transform: `translate(-50%, -50%) scale(${scale})`,
              opacity,
              display: "flex",
              alignItems: "center",
              flexDirection: isRightAligned ? "row-reverse" : "row",
            }}
          >
            {/* Center Hotspot Pin with Concentric Radar Waves */}
            <div
              style={{
                position: "relative",
                width: 26,
                height: 26,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Radar wave ring 1 */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: `2px solid ${color}`,
                  transform: `scale(${waveScale1})`,
                  opacity: waveOpacity1,
                }}
              />
              {/* Radar wave ring 2 */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: `2px solid ${color}`,
                  transform: `scale(${waveScale2})`,
                  opacity: waveOpacity2,
                }}
              />

              {/* Glowing Center Core */}
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  backgroundColor: color,
                  boxShadow: `0 0 16px ${color}, 0 2px 8px rgba(0, 0, 0, 0.8)`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#09090b",
                  fontWeight: 900,
                  fontSize: 13,
                  lineHeight: 1,
                }}
              >
                +
              </div>
            </div>

            {/* Connecting Leader Line */}
            <div
              style={{
                width: 18,
                height: 2,
                backgroundColor: `${color}99`,
                boxShadow: `0 0 6px ${color}66`,
              }}
            />

            {/* Glassmorphic Hotspot Tag Pill */}
            <div
              style={{
                backgroundColor: "rgba(10, 10, 14, 0.92)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: `1px solid ${color}88`,
                borderRadius: 14,
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                gap: 8,
                boxShadow: `0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px ${color}22`,
                whiteSpace: "nowrap",
              }}
            >
              {/* Optional Thumbnail Image */}
              {hotspot.imageUrl && (
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    overflow: "hidden",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                  }}
                >
                  <RobustImg
                    src={resolveSrc(hotspot.imageUrl)}
                    alt={hotspot.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              )}

              {/* Callout Title & Price */}
              <div style={{ display: "flex", flexDirection: "column", textAlign: isRightAligned ? "right" : "left" }}>
                <span
                  style={{
                    color: "#ffffff",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.02em",
                    lineHeight: 1.2,
                  }}
                >
                  {hotspot.calloutText || hotspot.title}
                </span>
                {hotspot.price && (
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 1 }}>
                    <span style={{ color, fontSize: 11, fontWeight: 900 }}>
                      ${hotspot.price.toFixed(2)}
                    </span>
                    {hotspot.compareAtPrice && hotspot.compareAtPrice > hotspot.price && (
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, textDecoration: "line-through" }}>
                        ${hotspot.compareAtPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
