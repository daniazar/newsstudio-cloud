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
import { AdOutroConfig, AdAspectRatio, BrandDNA } from "@/lib/types/ecommerce";

export const COMMERCIAL_OUTRO_MESSAGES = [
  // English Presets
  {
    id: "tap-shop-now",
    headline: "Ready to Upgrade?",
    cta: "Tap Below to Shop Now",
    icon: "🛍️",
    badge: "Free Nationwide Shipping Over $50",
    lang: "en" as const,
  },
  {
    id: "free-shipping",
    headline: "Fast Nationwide Dispatch",
    cta: "Free Shipping on All Orders",
    icon: "🚚",
    badge: "Delivered Directly to Your Door",
    lang: "en" as const,
  },
  {
    id: "limited-stock",
    headline: "Hurry, High Demand",
    cta: "Claim Yours Before Stock Runs Out",
    icon: "⚡",
    badge: "Limited Warehouse Stock Left",
    lang: "en" as const,
  },
  {
    id: "sample-box",
    headline: "Experience the Quality First",
    cta: "Order Your Free Sample Box",
    icon: "📦",
    badge: "100% Free Samples & Shipping",
    lang: "en" as const,
  },
  {
    id: "money-back",
    headline: "100% Risk-Free Purchase",
    cta: "30-Day Money-Back Guarantee",
    icon: "✅",
    badge: "Hassle-Free Direct Returns",
    lang: "en" as const,
  },

  // Spanish Presets (with Argentine/Rioplatense flair)
  {
    id: "pedi-muestras",
    headline: "¿Querés ver cómo queda?",
    cta: "Pedí tus Muestras Gratis Hoy",
    icon: "📦",
    badge: "Envío sin cargo a tu puerta",
    lang: "es" as const,
  },
  {
    id: "cuotas-sin-interes",
    headline: "Facilidades Exclusivas",
    cta: "Hasta 12 Cuotas Sin Interés",
    icon: "💳",
    badge: "Todas las tarjetas y Mercado Pago",
    lang: "es" as const,
  },
  {
    id: "envio-pais",
    headline: "Comprá desde tu Casa",
    cta: "Envíos Gratis a Todo el País",
    icon: "🇦🇷",
    badge: "Despacho inmediato a todo el territorio",
    lang: "es" as const,
  },
  {
    id: "garantia-oficial",
    headline: "Compra 100% Segura",
    cta: "Garantía Oficial de Fábrica",
    icon: "🛡️",
    badge: "Asesoramiento técnico personalizado",
    lang: "es" as const,
  },
  {
    id: "stock-limitado",
    headline: "¡Últimas Unidades Disponibles!",
    cta: "Comprá Ahora y Asegurá tu Precio",
    icon: "🔥",
    badge: "Precio promocional por tiempo limitado",
    lang: "es" as const,
  },
];

export interface CommercialOutroLayerProps {
  config?: AdOutroConfig;
  brand?: Partial<BrandDNA> | { name: string; logoUrl?: string | null; primaryColor?: string; surfaceColor?: string; domain?: string };
  accentColor?: string;
  aspectRatio?: AdAspectRatio;
  isSpanish?: boolean;
  productRating?: number;
  productReviewCount?: number;
}

export const CommercialOutroLayer: React.FC<CommercialOutroLayerProps> = ({
  config,
  brand,
  accentColor = "#06b6d4",
  aspectRatio = "9:16",
  isSpanish = false,
  productRating = 4.9,
  productReviewCount = 1240,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const isVertical = aspectRatio === "9:16" || height > width;
  const isSquare = aspectRatio === "1:1" || width === height;

  // Resolve Outro Preset
  const defaultOutroId = isSpanish ? "pedi-muestras" : "tap-shop-now";
  const activeOutro =
    COMMERCIAL_OUTRO_MESSAGES.find((o) => o.id === (config?.outroId || defaultOutroId)) ||
    COMMERCIAL_OUTRO_MESSAGES[0];

  const headline = config?.customHeadline || activeOutro.headline;
  const ctaText = config?.customCta || activeOutro.cta;
  const promoCode = config?.promoCode || "PROMO10";
  const discountPercent = config?.discountPercentage || 10;
  const showReviews = config?.showReviewsRating ?? true;
  const showGuarantee = config?.showGuaranteeBadge ?? true;
  const showDomain = config?.showDomain ?? true;

  // Spring Entrance
  const entrance = spring({
    frame,
    fps,
    config: { damping: 13, stiffness: 110 },
  });

  const opacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });
  const scale = interpolate(entrance, [0, 1], [0.88, 1]);
  const yOffset = interpolate(entrance, [0, 1], [35, 0]);

  // Pulsing CTA button
  const buttonPulse = 1 + Math.sin(frame * 0.22) * 0.035;
  const arrowOffset = Math.sin(frame * 0.25) * 5;

  const brandName = brand?.name || "Official Store";
  const logoUrl = brand?.logoUrl;
  const domain = brand?.domain || "storehaus.com.ar";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#09090b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
        opacity,
        overflow: "hidden",
      }}
    >
      {/* Dynamic Background Glow */}
      <div
        style={{
          position: "absolute",
          width: isVertical ? "130%" : "70%",
          height: isVertical ? "70%" : "90%",
          background: `radial-gradient(circle, ${accentColor}30 0%, transparent 65%)`,
          filter: "blur(70px)",
          pointerEvents: "none",
        }}
      />

      {/* Outro Video Override if provided */}
      {config?.outroVideoSrc ? (
        <OffthreadVideo
          src={resolveSrc(config.outroVideoSrc)}
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
            padding: isVertical ? "0 36px" : "0 70px",
            maxWidth: isVertical ? 860 : 1100,
            gap: isVertical ? 18 : 22,
          }}
        >
          {/* 1. Brand Logo / Icon */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
            {logoUrl ? (
              <RobustImg
                src={logoUrl}
                alt={brandName}
                style={{
                  maxHeight: isVertical ? 75 : 90,
                  maxWidth: isVertical ? 240 : 320,
                  objectFit: "contain",
                  filter: `drop-shadow(0 8px 24px rgba(0,0,0,0.8)) drop-shadow(0 0 20px ${accentColor}35)`,
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: isVertical ? 54 : 64,
                  filter: `drop-shadow(0 0 25px ${accentColor}60)`,
                }}
              >
                {activeOutro.icon}
              </div>
            )}
          </div>

          {/* 2. Headline Hook */}
          {headline && (
            <h3
              style={{
                color: "#a1a1aa",
                fontSize: isVertical ? 18 : 22,
                fontWeight: 700,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                margin: 0,
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {headline}
            </h3>
          )}

          {/* 3. High-Converting Primary CTA Text */}
          <h2
            style={{
              color: "#ffffff",
              fontSize: isVertical ? 40 : isSquare ? 44 : 52,
              fontWeight: 950,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              textShadow: "0 6px 30px rgba(0,0,0,0.95)",
              fontFamily: "system-ui, -apple-system, sans-serif",
              margin: 0,
            }}
          >
            {ctaText}
          </h2>

          {/* 4. Promo Code Pill */}
          {promoCode && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 20px",
                borderRadius: 14,
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                border: "2px dashed rgba(255, 255, 255, 0.25)",
                boxShadow: `0 4px 20px ${accentColor}20`,
              }}
            >
              <span
                style={{
                  color: "#e4e4e7",
                  fontSize: isVertical ? 12 : 14,
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {isSpanish ? "USÁ EL CUPÓN:" : "USE CODE:"}
              </span>
              <span
                style={{
                  color: accentColor,
                  fontSize: isVertical ? 15 : 17,
                  fontWeight: 950,
                  fontFamily: "ui-monospace, monospace",
                  letterSpacing: "1.5px",
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  padding: "4px 10px",
                  borderRadius: 8,
                  border: `1px solid ${accentColor}60`,
                }}
              >
                {promoCode.toUpperCase()}
              </span>
              <span
                style={{
                  backgroundColor: "#10b981",
                  color: "#000000",
                  fontSize: isVertical ? 11 : 12,
                  fontWeight: 900,
                  padding: "3px 8px",
                  borderRadius: 6,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {discountPercent}% OFF
              </span>
            </div>
          )}

          {/* 5. Pulsing "Shop Now" Action Button */}
          <div
            style={{
              transform: `scale(${buttonPulse})`,
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: isVertical ? "16px 40px" : "18px 48px",
              borderRadius: 999,
              backgroundColor: accentColor,
              color: "#09090b",
              fontWeight: 950,
              fontSize: isVertical ? 20 : 24,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
              fontFamily: "system-ui, -apple-system, sans-serif",
              boxShadow: `0 10px 40px ${accentColor}70, 0 2px 10px rgba(0,0,0,0.5)`,
              margin: isVertical ? "8px 0" : "12px 0",
            }}
          >
            <span>{isSpanish ? "COMPRAR AHORA" : "SHOP NOW"}</span>
            <span
              style={{
                transform: `translateX(${arrowOffset}px)`,
                display: "inline-block",
                fontSize: isVertical ? 22 : 26,
              }}
            >
              ➔
            </span>
          </div>

          {/* 6. Social Proof Trust Rating & Guarantee Row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              marginTop: 4,
            }}
          >
            {showReviews && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                <span style={{ color: "#facc15", fontSize: 13 }}>★★★★★</span>
                <span
                  style={{
                    color: "#ffffff",
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {productRating.toFixed(1)}/5
                </span>
                <span style={{ color: "#a1a1aa", fontSize: 11 }}>
                  ({productReviewCount.toLocaleString()}+ {isSpanish ? "Reseñas" : "Reviews"})
                </span>
              </div>
            )}

            {showGuarantee && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  padding: "6px 14px",
                  borderRadius: 20,
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                }}
              >
                <span style={{ color: "#10b981", fontSize: 13, fontWeight: 900 }}>✓</span>
                <span
                  style={{
                    color: "#e4e4e7",
                    fontSize: 11,
                    fontWeight: 800,
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {activeOutro.badge}
                </span>
              </div>
            )}
          </div>

          {/* 7. Store Domain Tag */}
          {showDomain && (
            <div
              style={{
                color: "#71717a",
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "1px",
                fontFamily: "ui-monospace, monospace",
                marginTop: 6,
              }}
            >
              {domain}
            </div>
          )}
        </div>
      )}

      {/* Optional Audio SFX */}
      {config?.audioSfx && frame === 3 && (
        <Audio src={resolveSrc(config.audioSfx)} volume={0.6} />
      )}
    </AbsoluteFill>
  );
};
