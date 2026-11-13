import React, { useMemo } from "react";
import { interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { RobustImg } from "../../components/RobustImg";
import { resolveSrc } from "../../utils/resolveSrc";
import { TurntablePedestalKey, TurntableRadarPin, TurntableSocialProofConfig } from "@/lib/types/ecommerce";
import {
  getPedestalByKey,
  computeTurntableRotation,
  generateAtmosphericParticles,
  generateStudioBackdrop,
} from "@/lib/ecommerce/productRelighter";

import { WebGLChromaMatte } from "../../components/WebGLChromaMatte";
import { Turntable3DClip } from "./Turntable3DLayer";

export interface ProductTurntableLayerProps {
  imageSrc: string;
  startFrame?: number;
  durationFrames?: number;
  pedestalKey?: TurntablePedestalKey;
  accentColor?: string;
  altText?: string;
  enableRotation?: boolean;
  enableParticles?: boolean;
  enableSheen?: boolean;
  headline?: string;
  /** When true, keys out white packshot background for 360 degree turntable (default: false) */
  removeWhiteBg?: boolean;
  /**
   * Pre-rendered 360° turntable clip (VP9+alpha WebM) from the 3D Product Turntable mode.
   * When set, it replaces the CSS-rotated packshot and its reflection (the clip already
   * rotates, so no rotateY is applied); pedestal, rim glow, particles and HUD are kept.
   */
  turntableVideoUrl?: string;
  /** Loop length of the turntable clip in composition frames (default: 4 s). */
  turntableLoopFrames?: number;
  /** Enable dynamic feature radar callouts */
  enableRadarPins?: boolean;
  /** Feature radar callout pins */
  radarPins?: TurntableRadarPin[];
  /** Dynamic Social Proof & Scarcity HUD overlay configuration */
  socialProof?: TurntableSocialProofConfig;
}

export const ProductTurntableLayer: React.FC<ProductTurntableLayerProps> = ({
  imageSrc,
  startFrame = 0,
  pedestalKey = "matte_obsidian",
  accentColor = "#06b6d4",
  altText = "Product 360",
  enableRotation = true,
  enableParticles = true,
  enableSheen = true,
  headline,
  removeWhiteBg = false,
  turntableVideoUrl,
  turntableLoopFrames,
  enableRadarPins = true,
  radarPins = [],
  socialProof,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const pedestal = useMemo(() => getPedestalByKey(pedestalKey), [pedestalKey]);
  const particles = useMemo(() => generateAtmosphericParticles(22, 108), []);
  const backdrop = useMemo(
    () => generateStudioBackdrop(pedestal, accentColor),
    [pedestal, accentColor]
  );

  const currentProg = Math.max(0, frame - startFrame);

  // Snappy spring entrance
  const entrance = spring({
    frame: currentProg,
    fps,
    config: { damping: 14, stiffness: 110, mass: 0.9 },
  });

  // 3D Turntable rotation and floating bob
  const { yawDeg, pitchDeg, bobYPx } = enableRotation
    ? computeTurntableRotation(currentProg, fps, { speedRpm: 5.5, mode: "continuous" })
    : { yawDeg: 0, pitchDeg: 18, bobYPx: 0 };

  // Specular sheen sweep progress
  const sheenTimeSec = currentProg / fps;
  const sheenTranslate = interpolate(sheenTimeSec % 3.0, [0, 1.2], [-120, 240], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const activeRimColor = accentColor || pedestal.lighting.rimLightColor;
  const label = headline || `360° STUDIO • ${pedestal.name.toUpperCase()}`;
  const resolvedSrc = resolveSrc(imageSrc);
  const hasTurntableVideo = Boolean(turntableVideoUrl);
  // Square clip fitted inside the stage (the renderer frames the product with padding).
  const videoBoxPx = Math.round(Math.min(width * 0.8, height * 0.75 * 0.72));

  return (
    <div
      style={{
        position: "absolute",
        width,
        height,
        overflow: "hidden",
        pointerEvents: "none",
        background: backdrop.background,
        perspective: 1400,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Volumetric Studio Rim Lighting Glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: backdrop.rimGlow,
          pointerEvents: "none",
        }}
      />

      {/* Floating Atmospheric Particles */}
      {enableParticles && (
        <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
          {particles.map((p) => {
            const floatOffset = (currentProg * p.speed) % 100;
            const yPos = (p.initialY - floatOffset + 100) % 100;
            const xPos = p.initialX + Math.sin(currentProg * 0.05 + p.id) * p.drift;

            return (
              <div
                key={p.id}
                style={{
                  position: "absolute",
                  left: `${xPos}%`,
                  top: `${yPos}%`,
                  width: p.size,
                  height: p.size,
                  borderRadius: "50%",
                  backgroundColor: pedestal.lighting.particlesColor,
                  opacity: p.opacity,
                  filter: "blur(0.5px)",
                  boxShadow: `0 0 6px ${pedestal.lighting.particlesColor}`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Central 3D Stage (Product + Reflections + Pedestal) */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "75%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${entrance})`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* True 3D Turntable Clip (pre-rendered rotation, no CSS rotateY) */}
        {hasTurntableVideo && turntableVideoUrl ? (
          <div
            style={{
              position: "relative",
              zIndex: 10,
              width: videoBoxPx,
              height: videoBoxPx,
              transform: `translateY(${bobYPx - 25}px)`,
              filter: `drop-shadow(0 20px 30px rgba(0, 0, 0, 0.55)) drop-shadow(0 0 20px ${activeRimColor}22)`,
            }}
          >
            <Sequence from={startFrame} layout="none" name="3D Turntable Clip">
              <Turntable3DClip turntableUrl={turntableVideoUrl} loopDurationFrames={turntableLoopFrames} />
            </Sequence>
          </div>
        ) : (
        /* Floating Rotating Product Packshot */
        <div
          style={{
            position: "relative",
            zIndex: 10,
            maxWidth: "68%",
            maxHeight: "58%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `translateY(${bobYPx - 25}px) rotateY(${yawDeg}deg) rotateX(${pitchDeg * 0.2}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {removeWhiteBg ? (
            <WebGLChromaMatte
              src={imageSrc}
              mediaType="image"
              mode="white_key"
              similarity={0.16}
              smoothness={0.08}
              defringeStrength={0.88}
              enableSheen={enableSheen}
              sheenProgress={((currentProg / fps) % 3.0) / 3.0}
              sheenIntensity={pedestal.lighting.specularShininess * 0.5}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                filter: `drop-shadow(0 20px 30px rgba(0, 0, 0, 0.65)) drop-shadow(0 0 20px ${activeRimColor}22)`,
              }}
              alt={altText}
            />
          ) : (
            <>
              <RobustImg
                src={resolvedSrc}
                alt={altText}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  filter: `drop-shadow(0 20px 30px rgba(0, 0, 0, 0.65)) drop-shadow(0 0 20px ${activeRimColor}22)`,
                }}
              />

              {/* Specular Sheen Sweep Mask for opaque card */}
              {enableSheen && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    overflow: "hidden",
                    pointerEvents: "none",
                    maskImage: `url("${resolvedSrc}")`,
                    WebkitMaskImage: `url("${resolvedSrc}")`,
                    maskSize: "contain",
                    WebkitMaskSize: "contain",
                    maskRepeat: "no-repeat",
                    WebkitMaskRepeat: "no-repeat",
                    maskPosition: "center",
                    WebkitMaskPosition: "center",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: "-50%",
                      left: "-50%",
                      width: "200%",
                      height: "200%",
                      transform: `rotate(35deg) translateX(${sheenTranslate}%)`,
                      background: `linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, ${pedestal.lighting.specularShininess * 0.5}) 50%, transparent 100%)`,
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
        )}

        {/* Contact Shadow on Turntable Surface */}
        <div
          style={{
            position: "relative",
            zIndex: 5,
            width: 260,
            height: 38,
            borderRadius: "50%",
            marginTop: -10,
            background: `radial-gradient(ellipse, rgba(0, 0, 0, 0.85) 0%, transparent 70%)`,
            filter: `blur(${pedestal.lighting.shadowSoftness * 0.4}px)`,
          }}
        />

        {/* Inverted Ground Reflection on Pedestal Top */}
        {hasTurntableVideo && turntableVideoUrl ? (
          <div
            style={{
              position: "relative",
              zIndex: 4,
              width: Math.round(videoBoxPx * 0.88),
              height: Math.round(videoBoxPx * 0.3),
              marginTop: -35,
              overflow: "hidden",
              opacity: pedestal.reflectionOpacity,
              filter: `blur(${pedestal.reflectionBlurPx}px)`,
              maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 75%)",
              WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 75%)",
              pointerEvents: "none",
            }}
          >
            {/* Mirror the lower half of the same clip (same src + frame → cached extraction) */}
            <div
              style={{
                width: "100%",
                height: Math.round(videoBoxPx * 0.88),
                // Flip in place: the product's base ends up at the top edge of the clipped box.
                transform: "scaleY(-1)",
              }}
            >
              <Sequence from={startFrame} layout="none" name="3D Turntable Reflection">
                <Turntable3DClip turntableUrl={turntableVideoUrl} loopDurationFrames={turntableLoopFrames} />
              </Sequence>
            </div>
          </div>
        ) : (
        <div
          style={{
            position: "relative",
            zIndex: 4,
            maxWidth: "60%",
            maxHeight: "26%",
            marginTop: -35,
            opacity: pedestal.reflectionOpacity,
            transform: `scaleY(-1) rotateY(${yawDeg}deg)`,
            filter: `blur(${pedestal.reflectionBlurPx}px)`,
            maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 75%)",
            WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 75%)",
            pointerEvents: "none",
          }}
        >
          <RobustImg
            src={resolvedSrc}
            alt={`${altText} Reflection`}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />
        </div>
        )}

        {/* 3D Cylindrical Pedestal */}
        <div
          style={{
            position: "absolute",
            bottom: "6%",
            width: 390,
            height: 110,
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Top Elliptical Surface Bevel */}
          <div
            style={{
              width: "100%",
              height: 72,
              borderRadius: "50%",
              backgroundColor: pedestal.surfaceColor,
              border: `2px solid ${pedestal.bevelColor}`,
              boxShadow: `0 0 25px ${activeRimColor}22, inset 0 2px 10px rgba(255, 255, 255, 0.4)`,
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top Surface Center Light Pool */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                background: `radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.4) 0%, transparent 70%)`,
              }}
            />
          </div>

          {/* Cylinder Body Base */}
          <div
            style={{
              width: "100%",
              height: 65,
              marginTop: -36,
              background: pedestal.cylinderGradient,
              borderRadius: "0 0 16px 16px",
              boxShadow: "0 30px 60px rgba(0, 0, 0, 0.9)",
              borderBottom: `2px solid ${pedestal.bevelColor}`,
            }}
          />
        </div>
      </div>

      {/* Glassmorphic Studio Telemetry HUD Badge */}
      {label && (
        <div
          style={{
            position: "absolute",
            bottom: 110,
            left: 36,
            zIndex: 30,
            backgroundColor: "rgba(9, 9, 11, 0.85)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${activeRimColor}44`,
            padding: "8px 18px",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            gap: 10,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)",
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: activeRimColor,
              boxShadow: `0 0 10px ${activeRimColor}`,
            }}
          />
          <span
            style={{
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {label}
          </span>
        </div>
      )}

      {/* Dynamic Feature Radar Callouts & Interactive Hotspot Overlay */}
      {enableRadarPins && radarPins && radarPins.length > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 35,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {radarPins.map((pin, idx) => {
            const pinStart = pin.startFrame ?? 15;
            const pinDuration = pin.durationFrames ?? 180;
            const elapsed = currentProg - pinStart;

            if (elapsed < 0 || elapsed > pinDuration) return null;

            const entrance = spring({
              frame: elapsed,
              fps,
              config: { damping: 13, stiffness: 140 },
            });

            const exitProgress = interpolate(
              elapsed,
              [pinDuration - 15, pinDuration],
              [1, 0],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );

            const scale = entrance * exitProgress;
            const opacity = Math.min(entrance, exitProgress);
            const color = pin.pulseColor || activeRimColor;

            // Concentric radar pulsing waves
            const wavePeriod = 45;
            const p1 = (elapsed % wavePeriod) / wavePeriod;
            const waveScale1 = interpolate(p1, [0, 1], [1, 2.3]);
            const waveOpacity1 = interpolate(p1, [0, 0.8, 1], [0.75, 0.2, 0]);

            const p2 = ((elapsed + 22) % wavePeriod) / wavePeriod;
            const waveScale2 = interpolate(p2, [0, 1], [1, 2.3]);
            const waveOpacity2 = interpolate(p2, [0, 0.8, 1], [0.75, 0.2, 0]);

            const isRightAligned = pin.x > 70;

            return (
              <div
                key={pin.id || idx}
                style={{
                  position: "absolute",
                  left: `${pin.x}%`,
                  top: `${pin.y}%`,
                  transform: `translate(-50%, -50%) scale(${scale})`,
                  opacity,
                  display: "flex",
                  alignItems: "center",
                  flexDirection: isRightAligned ? "row-reverse" : "row",
                }}
              >
                {/* Radar center pin with pulsing waves */}
                <div
                  style={{
                    position: "relative",
                    width: 24,
                    height: 24,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
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
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      backgroundColor: color,
                      boxShadow: `0 0 14px ${color}, 0 2px 6px rgba(0, 0, 0, 0.8)`,
                    }}
                  />
                </div>

                {/* Connecting Leader Line */}
                <div
                  style={{
                    width: 16,
                    height: 2,
                    backgroundColor: `${color}99`,
                    boxShadow: `0 0 6px ${color}66`,
                  }}
                />

                {/* Glassmorphic Radar Tag Pill */}
                <div
                  style={{
                    backgroundColor: "rgba(10, 10, 14, 0.92)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: `1px solid ${color}88`,
                    borderRadius: 8,
                    padding: "6px 12px",
                    boxShadow: `0 8px 24px rgba(0, 0, 0, 0.6), 0 0 12px ${color}33`,
                    maxWidth: 220,
                  }}
                >
                  <div
                    style={{
                      color: "#ffffff",
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 1.1,
                      textTransform: "uppercase",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {pin.label}
                  </div>
                  {pin.detail && (
                    <div
                      style={{
                        color: "rgba(255, 255, 255, 0.75)",
                        fontSize: 9.5,
                        fontWeight: 500,
                        marginTop: 2,
                      }}
                    >
                      {pin.detail}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dynamic Social Proof & Scarcity HUD Overlays */}
      {socialProof && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 40,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Top-Left: 5-Star Verified Rating Badge */}
          {socialProof.showRatingBadge && (() => {
            const ratingElapsed = Math.max(0, currentProg - 10);
            const ratingSpring = spring({
              frame: ratingElapsed,
              fps,
              config: { damping: 14, stiffness: 120 },
            });
            const rating = (socialProof.rating ?? 4.9).toFixed(1);
            const reviewCount = (socialProof.reviewCount ?? 1420).toLocaleString();

            return (
              <div
                style={{
                  position: "absolute",
                  top: 36,
                  left: 36,
                  transform: `translateY(${(1 - ratingSpring) * -20}px)`,
                  opacity: ratingSpring,
                  backgroundColor: "rgba(9, 9, 11, 0.88)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  border: "1px solid rgba(251, 191, 36, 0.4)",
                  borderRadius: 12,
                  padding: "8px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.6), 0 0 16px rgba(251, 191, 36, 0.15)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                  <span style={{ color: "#fbbf24", fontSize: 13 }}>★</span>
                  <span style={{ color: "#ffffff", fontWeight: 800, fontSize: 13 }}>
                    {rating}
                  </span>
                </div>
                <div style={{ width: 1, height: 14, backgroundColor: "rgba(255, 255, 255, 0.2)" }} />
                <span
                  style={{
                    color: "rgba(255, 255, 255, 0.8)",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                  }}
                >
                  {reviewCount} Reviews
                </span>
                {socialProof.trustSeal && socialProof.trustSeal !== "none" && (
                  <>
                    <div style={{ width: 1, height: 14, backgroundColor: "rgba(255, 255, 255, 0.2)" }} />
                    <span
                      style={{
                        color: "#38bdf8",
                        fontSize: 10.5,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: 0.8,
                      }}
                    >
                      {socialProof.trustSeal === "30_day_guarantee"
                        ? "30-Day Guarantee"
                        : socialProof.trustSeal === "free_shipping"
                        ? "Free Shipping"
                        : "Official Warranty"}
                    </span>
                  </>
                )}
              </div>
            );
          })()}

          {/* Top-Right: High-Urgency Scarcity Ticker */}
          {socialProof.showScarcityTicker && (() => {
            const scarcityElapsed = Math.max(0, currentProg - 14);
            const scarcitySpring = spring({
              frame: scarcityElapsed,
              fps,
              config: { damping: 12, stiffness: 130 },
            });
            const pulse = 0.88 + 0.12 * Math.sin(currentProg * 0.2);
            const text = socialProof.scarcityText || "⚡ ONLY 7 LEFT IN STOCK";

            return (
              <div
                style={{
                  position: "absolute",
                  top: 36,
                  right: 36,
                  transform: `translateY(${(1 - scarcitySpring) * -20}px) scale(${pulse})`,
                  opacity: scarcitySpring,
                  backgroundColor: "rgba(220, 38, 38, 0.25)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  border: "1px solid rgba(239, 68, 68, 0.75)",
                  borderRadius: 12,
                  padding: "8px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 8px 30px rgba(0, 0, 0, 0.6), 0 0 20px rgba(239, 68, 68, 0.35)",
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor: "#ef4444",
                    boxShadow: "0 0 10px #ef4444",
                  }}
                />
                <span
                  style={{
                    color: "#fecaca",
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.9,
                    textTransform: "uppercase",
                  }}
                >
                  {text}
                </span>
              </div>
            );
          })()}

          {/* Bottom-Right: Verified Buyer Review Quote Pill */}
          {socialProof.showBuyerQuote && socialProof.buyerQuoteText && (() => {
            const quoteElapsed = Math.max(0, currentProg - 25);
            const quoteSpring = spring({
              frame: quoteElapsed,
              fps,
              config: { damping: 14, stiffness: 110 },
            });

            return (
              <div
                style={{
                  position: "absolute",
                  bottom: 36,
                  right: 36,
                  maxWidth: 340,
                  transform: `translateY(${(1 - quoteSpring) * 20}px)`,
                  opacity: quoteSpring,
                  backgroundColor: "rgba(9, 9, 11, 0.9)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: `1px solid ${activeRimColor}55`,
                  borderRadius: 14,
                  padding: "10px 14px",
                  boxShadow: `0 12px 36px rgba(0, 0, 0, 0.7), 0 0 16px ${activeRimColor}22`,
                }}
              >
                <div
                  style={{
                    color: "rgba(255, 255, 255, 0.92)",
                    fontSize: 11,
                    fontStyle: "italic",
                    lineHeight: 1.4,
                    marginBottom: 6,
                  }}
                >
                  “{socialProof.buyerQuoteText}”
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span
                    style={{
                      color: "rgba(255, 255, 255, 0.6)",
                      fontSize: 9.5,
                      fontWeight: 600,
                      letterSpacing: 0.4,
                    }}
                  >
                    {socialProof.buyerAuthor || "Verified Buyer"}
                  </span>
                  <span
                    style={{
                      color: "#34d399",
                      fontSize: 9.5,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: 3,
                    }}
                  >
                    <span>✓</span>
                    <span>VERIFIED</span>
                  </span>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
