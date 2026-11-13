import React from "react";
import { useCurrentFrame } from "remotion";
import type { RemotionSegment } from "@/lib/types";
import { detectLanguage } from "@/lib/ecommerce/languageDetector";
import { getPersonaById } from "@/lib/tts/personas";

export interface TickerItem {
  id?: string;
  symbol?: string;
  value?: string;
  change?: string;
  isPositive?: boolean;
  headline?: string;
  category?: string;
  source?: string;
  urgency?: "breaking" | "developing" | "standard";
}

export interface LocalizedTickerStrings {
  badgeText: string;
  category: string;
}

export const TICKER_LOCALIZATIONS: Record<string, LocalizedTickerStrings> = {
  es: {
    badgeText: "EN VIVO",
    category: "ÚLTIMO MOMENTO",
  },
  en: {
    badgeText: "LIVE WIRE",
    category: "BREAKING NEWS",
  },
  pt: {
    badgeText: "AO VIVO",
    category: "ÚLTIMA HORA",
  },
  fr: {
    badgeText: "EN DIRECT",
    category: "DERNIÈRE MINUTE",
  },
  de: {
    badgeText: "LIVE",
    category: "EILMELDUNG",
  },
  it: {
    badgeText: "IN DIRETTA",
    category: "ULTIM'ORA",
  },
  ja: {
    badgeText: "生放送",
    category: "速報",
  },
  zh: {
    badgeText: "直播",
    category: "快讯",
  },
};

export const DEFAULT_FINANCIAL_TICKERS: TickerItem[] = [
  { symbol: "NVDA", value: "$228.86", change: "+1.7%", isPositive: true },
  { symbol: "BTC", value: "$83,021", change: "-0.6%", isPositive: false },
  { symbol: "ETH", value: "$2,659", change: "-1.1%", isPositive: false },
  { symbol: "AAPL", value: "$338.40", change: "-0.8%", isPositive: false },
  { symbol: "TSLA", value: "$357.45", change: "-3.9%", isPositive: false },
  { symbol: "S&P 500", value: "7,683.7", change: "-0.8%", isPositive: false },
  { symbol: "MSFT", value: "$509.22", change: "-1.3%", isPositive: false },
  { symbol: "INFLATION", value: "2.8%", change: "-0.1%", isPositive: true },
];

export const DEFAULT_FINANCIAL_TICKERS_ES: TickerItem[] = [
  { symbol: "NVDA", value: "$228.86", change: "+1.7%", isPositive: true },
  { symbol: "BTC", value: "$83.021", change: "-0.6%", isPositive: false },
  { symbol: "ETH", value: "$2.659", change: "-1.1%", isPositive: false },
  { symbol: "AAPL", value: "$338.40", change: "-0.8%", isPositive: false },
  { symbol: "TSLA", value: "$357.45", change: "-3.9%", isPositive: false },
  { symbol: "S&P 500", value: "7.683,7", change: "-0.8%", isPositive: false },
  { symbol: "MSFT", value: "$509.22", change: "-1.3%", isPositive: false },
  { symbol: "INFLACIÓN", value: "2.8%", change: "-0.1%", isPositive: true },
];

export const DEFAULT_NEWS_HEADLINES_ES: TickerItem[] = [
  {
    id: "default-es-1",
    headline: "Cumbre Global de IA concluye con un marco histórico de seguridad internacional",
    category: "POLÍTICA TECH",
    urgency: "breaking",
  },
  ...DEFAULT_FINANCIAL_TICKERS_ES,
  {
    id: "default-es-2",
    headline: "Plataformas autónomas alcanzan síntesis de transmisión 4K en tiempo real",
    category: "TRANSMISIÓN",
    urgency: "standard",
  },
];

export interface TickerTapeLayerProps {
  /** Array of custom structured ticker items */
  items?: TickerItem[];
  /** Array of story headline strings */
  headlines?: string[];
  /** Segments array to automatically extract headlines from */
  segments?: RemotionSegment[];
  /** Scrolling speed in pixels per frame (default: 2.5) */
  speed?: number;
  /** Primary category / broadcast theme label (default: localized, e.g. "ÚLTIMO MOMENTO" or "BREAKING NEWS") */
  category?: string;
  /** Accent theme color (default: "#ef4444") */
  accentColor?: string;
  /** Position on screen (default: "bottom") */
  position?: "bottom" | "top";
  /** Whether to show the left-docked live badge (default: true) */
  showBadge?: boolean;
  /** Custom text for the live badge (default: localized, e.g. "EN VIVO" or "LIVE WIRE") */
  badgeText?: string;
  /** Optional manual cycle loop width in pixels before repetition (default: dynamically measured) */
  loopWidth?: number;
  /** Custom marquee continuous ticker text string */
  customTickerText?: string;
  /** Vertical offset adjustment in pixels */
  offsetY?: number;
  /** Video language code (e.g. 'es', 'en', 'pt', 'es-AR') */
  language?: string;
}

/**
 * Resolves the primary language code for the ticker tape.
 * Checks explicit prop, segment persona language, and lexical content.
 */
export type TickerLanguage = "es" | "en" | "pt" | "fr" | "de" | "it" | "ja" | "zh";

export function resolveTickerLanguage({
  language,
  segments,
  headlines,
  customTickerText,
}: {
  language?: string;
  segments?: RemotionSegment[];
  headlines?: string[];
  customTickerText?: string;
}): TickerLanguage {
  if (language && typeof language === "string") {
    const clean = language.toLowerCase().slice(0, 2);
    if (clean in TICKER_LOCALIZATIONS) {
      return clean as TickerLanguage;
    }
  }

  // Check persona language from first segment if available
  if (segments && segments.length > 0) {
    for (const seg of segments) {
      if (seg.personaId) {
        const p = getPersonaById(seg.personaId);
        if (p?.language && p.language in TICKER_LOCALIZATIONS) {
          return p.language as TickerLanguage;
        }
      }
    }
  }

  // Sample text from segments, headlines, or custom text
  const sampleTexts: string[] = [];
  if (segments) {
    for (const s of segments) {
      if (s.text) sampleTexts.push(s.text);
    }
  }
  if (headlines) {
    sampleTexts.push(...headlines);
  }
  if (customTickerText) {
    sampleTexts.push(customTickerText);
  }

  const combined = sampleTexts.join(" ").trim();
  if (combined) {
    const detected = detectLanguage(combined);
    if (detected === "Spanish") return "es";
  }

  return "en";
}

/**
 * Normalizes string headlines and story data into structured TickerItems.
 */
export function formatHeadlineTickerItems(
  headlines: string[],
  defaultCategory = "TOP STORY"
): TickerItem[] {
  return headlines
    .filter((h) => typeof h === "string" && h.trim().length > 0)
    .map((headline, idx) => ({
      id: `headline-${idx}`,
      headline: headline.trim(),
      category: defaultCategory,
      urgency: idx === 0 ? "breaking" : "standard",
    }));
}

/**
 * Extracts headline strings from Remotion segments.
 */
export function extractHeadlinesFromSegments(segments: RemotionSegment[]): string[] {
  return segments
    .filter((seg) => Boolean(seg.text && seg.text.trim()))
    .map((seg) => {
      const text = seg.text.trim();
      const firstSentence = text.split(/[.!?]/)[0]?.trim();
      return firstSentence && firstSentence.length > 10 ? firstSentence : text.slice(0, 80);
    });
}

/**
 * Estimates the pixel width of one cycle of ticker items.
 * Used as an accurate SSR and layout initialization fallback before DOM measurement.
 */
export function estimateTickerCycleWidth(items: TickerItem[]): number {
  if (!items || items.length === 0) return 1800;

  let totalWidth = 0;
  for (const item of items) {
    if (item.headline) {
      const categoryWidth = item.category ? item.category.length * 7.5 + 24 : 0;
      const headlineWidth = item.headline.length * 7.8;
      const separatorWidth = 24;
      const itemContainerSpacing = 52;
      totalWidth += categoryWidth + headlineWidth + separatorWidth + itemContainerSpacing;
    } else {
      const symbolWidth = (item.symbol?.length || 4) * 8.5;
      const valueWidth = (item.value?.length || 6) * 8.0;
      const changeWidth = item.change ? item.change.length * 8.0 + 16 : 0;
      const spacing = 64;
      totalWidth += symbolWidth + valueWidth + changeWidth + spacing;
    }
  }

  return Math.max(Math.round(totalWidth), 600);
}

/**
 * Calculates continuous horizontal scroll offset based on frame and speed.
 * Uses modulo wrapping for uninterrupted 60fps / 30fps animation.
 */
export function calculateTickerTranslateX(
  frame: number,
  speed = 2.5,
  loopWidth = 1800
): number {
  if (loopWidth <= 0) return 0;
  const rawOffset = frame * speed;
  return -1 * (rawOffset % loopWidth);
}

/**
 * Calibrated Continuous Horizontal Scrolling News Ticker Tape Layer
 * Renders story headlines and financial indicators across a broadcast-grade ticker bar.
 * Matches video language and executes an unbroken, mathematically seamless infinite loop.
 */
export const TickerTapeLayer: React.FC<TickerTapeLayerProps> = ({
  items,
  headlines,
  segments,
  customTickerText,
  speed = 2.5,
  category,
  accentColor = "#ef4444",
  position = "bottom",
  showBadge = true,
  badgeText,
  loopWidth,
  offsetY = 0,
  language,
}) => {
  const frame = useCurrentFrame();

  // 1. Resolve video language
  const resolvedLang = resolveTickerLanguage({
    language,
    segments,
    headlines,
    customTickerText,
  });

  const localDefaults = TICKER_LOCALIZATIONS[resolvedLang] || TICKER_LOCALIZATIONS.en;

  // If badgeText was not provided or was default "LIVE WIRE", use localized badge
  const finalBadgeText = badgeText && badgeText !== "LIVE WIRE" ? badgeText : localDefaults.badgeText;

  // If category was not provided or was default "BREAKING NEWS", use localized category
  const effectiveCategory = category && category !== "BREAKING NEWS" ? category : localDefaults.category;

  // 2. Resolve ticker item list (memoized to avoid string splitting and object allocations on every frame)
  const resolvedItems = React.useMemo<TickerItem[]>(() => {
    if (customTickerText && customTickerText.trim()) {
      const rawParts = customTickerText.split(/[•|]/).map((s) => s.trim()).filter(Boolean);
      return rawParts.map((part, idx) => ({
        id: `custom-ticker-${idx}`,
        headline: part,
        category: effectiveCategory,
        urgency: idx === 0 ? "breaking" : "standard",
      }));
    }
    if (items && items.length > 0) {
      return items;
    }
    if (headlines && headlines.length > 0) {
      return formatHeadlineTickerItems(headlines, effectiveCategory);
    }
    if (segments && segments.length > 0) {
      const extracted = extractHeadlinesFromSegments(segments);
      return formatHeadlineTickerItems(extracted, effectiveCategory);
    }
    // Default fallback: combine breaking stories with financial tickers in the matching language
    return resolvedLang === "es"
      ? DEFAULT_NEWS_HEADLINES_ES
      : [
          {
            id: "default-1",
            headline: "Global AI Summit concludes with unprecedented international safety framework",
            category: "TECH POLICY",
            urgency: "breaking",
          },
          ...DEFAULT_FINANCIAL_TICKERS,
          {
            id: "default-2",
            headline: "Autonomous studio pipelines achieve real-time 4K broadcast synthesis",
            category: "BROADCAST",
            urgency: "standard",
          },
        ];
  }, [customTickerText, items, headlines, segments, effectiveCategory, resolvedLang]);

  // 3. Dynamic cycle measurement for mathematically seamless infinite looping
  const blockRef = React.useRef<HTMLDivElement>(null);
  const estimatedCycleWidth = React.useMemo(() => estimateTickerCycleWidth(resolvedItems), [resolvedItems]);
  const [measuredCycleWidth, setMeasuredCycleWidth] = React.useState<number>(0);

  React.useLayoutEffect(() => {
    if (blockRef.current) {
      const rect = blockRef.current.getBoundingClientRect();
      if (rect.width > 0 && Math.abs(rect.width - measuredCycleWidth) > 0.5) {
        setMeasuredCycleWidth(rect.width);
      }
    }
  }, [resolvedItems, measuredCycleWidth]);

  // Effective loop cycle width: measured DOM width > custom loopWidth (if not 1800 default) > estimated width
  const cycleWidth = React.useMemo(() => {
    if (measuredCycleWidth > 0) return measuredCycleWidth;
    if (loopWidth && loopWidth !== 1800) return loopWidth;
    return estimatedCycleWidth;
  }, [measuredCycleWidth, loopWidth, estimatedCycleWidth]);

  // Number of identical block copies needed to guarantee the viewport (even 4K/3840px)
  // is fully filled with no visual gaps at any frame
  const cycleCopies = React.useMemo(() => {
    return Math.max(3, Math.ceil(3840 / Math.max(cycleWidth, 200)) + 1);
  }, [cycleWidth]);

  // Smooth continuous horizontal translation wrapping at exact cycleWidth
  const translateX = calculateTickerTranslateX(frame, speed, cycleWidth);
  const pulse = Math.floor(frame / 12) % 2 === 0;

  const positionStyles: React.CSSProperties =
    position === "bottom"
      ? { bottom: offsetY || 0, left: 0, right: 0 }
      : { top: offsetY || 0, left: 0, right: 0 };

  return (
    <div
      style={{
        position: "absolute",
        height: "42px",
        zIndex: 55,
        backgroundColor: "rgba(8, 10, 15, 0.92)",
        backdropFilter: "blur(12px)",
        borderTop: position === "bottom" ? `2px solid ${accentColor}` : "none",
        borderBottom: position === "top" ? `2px solid ${accentColor}` : "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.8)",
        ...positionStyles,
      }}
      className="font-sans select-none"
    >
      {/* Pinned Broadcast Live Badge */}
      {showBadge && (
        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            height: "100%",
            padding: "0 18px",
            backgroundColor: accentColor,
            color: "#ffffff",
            fontWeight: 900,
            fontSize: "11px",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            boxShadow: "4px 0 16px rgba(0, 0, 0, 0.5)",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "50%",
              backgroundColor: "#ffffff",
              boxShadow: pulse ? "0 0 8px #ffffff" : "none",
              opacity: pulse ? 1 : 0.4,
              transition: "opacity 0.15s ease",
            }}
          />
          <span>{finalBadgeText}</span>
          <div
            style={{
              position: "absolute",
              right: "-10px",
              top: 0,
              bottom: 0,
              width: 0,
              height: 0,
              borderTop: "21px solid transparent",
              borderBottom: "21px solid transparent",
              borderLeft: `10px solid ${accentColor}`,
            }}
          />
        </div>
      )}

      {/* Continuous Scrolling Headline & Ticker Track */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          transform: `translateX(${translateX}px)`,
          whiteSpace: "nowrap",
          willChange: "transform",
        }}
      >
        {Array.from({ length: cycleCopies }).map((_, cycleIdx) => (
          <div
            key={`cycle-${cycleIdx}`}
            ref={cycleIdx === 0 ? blockRef : undefined}
            style={{
              display: "inline-flex",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            {resolvedItems.map((item, idx) => (
              <div
                key={`${item.id || item.symbol || item.headline}-${cycleIdx}-${idx}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "12px",
                  paddingRight: "40px",
                }}
              >
                {/* Story Headline Layout */}
                {item.headline ? (
                  <div className="flex items-center gap-2.5">
                    {item.category && (
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor:
                            item.urgency === "breaking" ? "rgba(239, 68, 68, 0.25)" : "rgba(6, 182, 212, 0.2)",
                          border: `1px solid ${
                            item.urgency === "breaking" ? "rgba(239, 68, 68, 0.6)" : "rgba(6, 182, 212, 0.4)"
                          }`,
                          color: item.urgency === "breaking" ? "#fca5a5" : "#67e8f9",
                          fontSize: "10px",
                          fontWeight: 800,
                          letterSpacing: "0.06em",
                          fontFamily: "monospace",
                        }}
                      >
                        {item.category.toUpperCase()}
                      </span>
                    )}
                    <span className="text-white text-xs font-semibold tracking-wide">
                      {item.headline}
                    </span>
                    <span className="text-zinc-600 text-xs font-mono ml-2">◆</span>
                  </div>
                ) : (
                  /* Financial / Stock Symbol Layout */
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="font-bold text-white uppercase tracking-wider">{item.symbol}</span>
                    <span className="text-zinc-300 font-semibold">{item.value}</span>
                    {item.change && (
                      <span
                        style={{
                          color: item.isPositive ? "#34d399" : "#f87171",
                          fontWeight: 700,
                        }}
                      >
                        {item.isPositive ? "▲" : "▼"} {item.change}
                      </span>
                    )}
                    <span className="text-zinc-600 text-xs ml-2">|</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
