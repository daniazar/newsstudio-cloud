import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Audio,
  OffthreadVideo,
} from "remotion";
import { RobustImg } from "../../components/RobustImg";
import { resolveSrc } from "../../utils/resolveSrc";
import { AdIntroConfig, AdAspectRatio, BrandDNA } from "@/lib/types/ecommerce";

export const COMMERCIAL_INTRO_SLOGANS = [
  // English Presets
  {
    id: "official-showcase",
    text: "Official Store Showcase",
    icon: "💎",
    subtitle: "Verified Authentic Quality",
    lang: "en" as const,
  },
  {
    id: "exclusive-launch",
    text: "Exclusive Brand Launch",
    icon: "🚀",
    subtitle: "New Arrival Collection",
    lang: "en" as const,
  },
  {
    id: "top-choice",
    text: "Top-Rated Customer Choice",
    icon: "⭐",
    subtitle: "Over 10,000+ Happy Customers",
    lang: "en" as const,
  },
  {
    id: "solution-waiting",
    text: "The Upgrade You Need",
    icon: "💡",
    subtitle: "Designed for Everyday Living",
    lang: "en" as const,
  },
  {
    id: "engineered-excellence",
    text: "Engineered for Excellence",
    icon: "🏆",
    subtitle: "Premium Craftsmanship",
    lang: "en" as const,
  },

  // Spanish Presets (with Rioplatense flair)
  {
    id: "calidad-premium",
    text: "Calidad Premium Garantizada",
    icon: "🛡️",
    subtitle: "Materiales Seleccionados",
    lang: "es" as const,
  },
  {
    id: "transforma-espacio",
    text: "Transformá tu Espacio Sin Obra",
    icon: "🏠",
    subtitle: "Fácil, Rápido y Limpio",
    lang: "es" as const,
  },
  {
    id: "mas-vendido",
    text: "El Más Elegido del Año",
    icon: "🔥",
    subtitle: "Miles de Clientes Satisfechos",
    lang: "es" as const,
  },
  {
    id: "coleccion-oficial",
    text: "Colección Oficial Exclusiva",
    icon: "💎",
    subtitle: "Directo de Fábrica",
    lang: "es" as const,
  },
  {
    id: "diseno-superior",
    text: "Tecnología y Diseño Superior",
    icon: "✨",
    subtitle: "Máxima Durabilidad",
    lang: "es" as const,
  },
];

export interface CommercialIntroLayerProps {
  config?: AdIntroConfig;
  brand?: Partial<BrandDNA> | { name: string; logoUrl?: string | null; primaryColor?: string; surfaceColor?: string };
  accentColor?: string;
  aspectRatio?: AdAspectRatio;
  isSpanish?: boolean;
}

export const CommercialIntroLayer: React.FC<CommercialIntroLayerProps> = ({
  config,
  brand,
  accentColor = "#06b6d4",
  aspectRatio = "9:16",
  isSpanish = false,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const durationInFrames = config?.durationFrames || 60;
  const isVertical = aspectRatio === "9:16" || height > width;
  const isSquare = aspectRatio === "1:1" || width === height;

  // Resolve Slogan
  const defaultSloganId = isSpanish ? "calidad-premium" : "official-showcase";
  const activeSlogan =
    COMMERCIAL_INTRO_SLOGANS.find((s) => s.id === (config?.sloganId || defaultSloganId)) ||
    COMMERCIAL_INTRO_SLOGANS[0];

  const headline = config?.customHeadline || activeSlogan.text;
  const subheadline = config?.customSubheadline || activeSlogan.subtitle;
  const showVerified = config?.showVerifiedBadge ?? true;
  const showLogo = config?.showLogo ?? true;

  // Animations
  const entrance = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  const exitOpacity = interpolate(
    frame,
    [Math.max(0, durationInFrames - 12), durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const scale = interpolate(entrance, [0, 1], [0.85, 1]);
  const yOffset = interpolate(entrance, [0, 1], [30, 0]);

  // Sheen beam across the center
  const sheenProgress = interpolate(frame, [12, 38], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const brandName = brand?.name || "Official Store";
  const logoUrl = brand?.logoUrl;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#09090b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        opacity: exitOpacity,
        overflow: "hidden",
      }}
    >
      {/* Background Radial Glow */}
      <div
        style={{
          position: "absolute",
          width: isVertical ? "120%" : "60%",
          height: isVertical ? "60%" : "80%",
          background: `radial-gradient(circle, ${accentColor}25 0%, transparent 70%)`,
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      {/* Video Bumper override if provided */}
      {config?.introVideoSrc ? (
        <OffthreadVideo
          src={resolveSrc(config.introVideoSrc)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            transform: `scale(${scale}) translateY(${yOffset}px)`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: isVertical ? "0 40px" : "0 80px",
            maxWidth: isVertical ? 900 : 1200,
            gap: isVertical ? 22 : 28,
          }}
        >
          {/* 1. Verified Official Store Badge */}
          {showVerified && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 18px",
                borderRadius: 999,
                backgroundColor: "rgba(255, 255, 255, 0.08)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                boxShadow: `0 4px 20px ${accentColor}15`,
              }}
            >
              <span
                style={{
                  color: "#10b981",
                  fontSize: isVertical ? 15 : 17,
                  fontWeight: 900,
                }}
              >
                ✓
              </span>
              <span
                style={{
                  color: "#ffffff",
                  fontSize: isVertical ? 11 : 13,
                  fontWeight: 800,
                  letterSpacing: "1.2px",
                  textTransform: "uppercase",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {brandName} •{" "}
                {isSpanish ? "TIENDA OFICIAL VERIFICADA" : "OFFICIAL VERIFIED STORE"}
              </span>
            </div>
          )}

          {/* 2. Brand Logo or Stylized Icon */}
          {showLogo && (
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: isVertical ? "10px 0" : "14px 0",
              }}
            >
              {logoUrl ? (
                <RobustImg
                  src={logoUrl}
                  alt={brandName}
                  style={{
                    maxHeight: isVertical ? 110 : 130,
                    maxWidth: isVertical ? 320 : 420,
                    objectFit: "contain",
                    filter: `drop-shadow(0 10px 30px rgba(0, 0, 0, 0.8)) drop-shadow(0 0 25px ${accentColor}40)`,
                  }}
                />
              ) : (
                <div
                  style={{
                    fontSize: isVertical ? 72 : 84,
                    filter: `drop-shadow(0 0 35px ${accentColor}80)`,
                  }}
                >
                  {activeSlogan.icon}
                </div>
              )}
            </div>
          )}

          {/* 3. Dynamic Specular Slogan Hook Headline */}
          <div
            style={{
              position: "relative",
              display: "inline-block",
            }}
          >
            <h1
              style={{
                color: "#ffffff",
                fontSize: isVertical ? 44 : isSquare ? 48 : 56,
                fontWeight: 950,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
                textTransform: "uppercase",
                textShadow: "0 6px 30px rgba(0, 0, 0, 0.95)",
                fontFamily: "system-ui, -apple-system, sans-serif",
                margin: 0,
              }}
            >
              {headline}
            </h1>

            {/* Specular Gleam Sweep */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: `${sheenProgress}%`,
                width: "40px",
                height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                transform: "skewX(-25deg)",
                pointerEvents: "none",
                opacity: sheenProgress > 0 && sheenProgress < 100 ? 0.8 : 0,
              }}
            />
          </div>

          {/* 4. Subheadline / Micro Hook */}
          {subheadline && (
            <p
              style={{
                color: accentColor,
                fontSize: isVertical ? 16 : 20,
                fontWeight: 800,
                letterSpacing: "0.5px",
                textShadow: "0 2px 14px rgba(0, 0, 0, 0.9)",
                fontFamily: "system-ui, -apple-system, sans-serif",
                margin: 0,
              }}
            >
              {subheadline}
            </p>
          )}
        </div>
      )}

      {/* Optional Audio SFX Stinger */}
      {config?.audioSfx && frame === 2 && (
        <Audio src={resolveSrc(config.audioSfx)} volume={0.7} />
      )}
    </AbsoluteFill>
  );
};
