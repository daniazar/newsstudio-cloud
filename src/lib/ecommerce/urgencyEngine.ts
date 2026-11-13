/**
 * src/lib/ecommerce/urgencyEngine.ts
 *
 * Dynamic Flash Sale Urgency & Live Stock Counter Engine.
 * Calculates deterministic frame-accurate countdown clocks, dynamic inventory
 * scarcity curves, and theme styles for high-converting e-commerce video ads.
 */

import {
  FlashSaleUrgencyConfig,
  StockScarcityConfig,
  UrgencyTheme,
  ProductSpec,
} from "@/lib/types/ecommerce";

export interface CountdownTimeComponents {
  hours: number;
  minutes: number;
  seconds: number;
  centiseconds: number;
  hoursStr: string;
  minutesStr: string;
  secondsStr: string;
  centisecondsStr: string;
  formattedClock: string;
}

export interface StockProgressResult {
  remainingStock: number;
  totalStock: number;
  claimedPercentage: number;
  isLowStock: boolean;
  stockLabel: string;
}

export interface UrgencyThemeStyles {
  primaryColor: string;
  gradient: string;
  glowColor: string;
  textColor: string;
  accentBg: string;
  iconSymbol: string;
  badgeLabel: string;
}

// ============================================================================
// 1. FRAME-ACCURATE COUNTDOWN TIMER
// ============================================================================

/**
 * Computes deterministic countdown clock components from frame and FPS.
 */
export function computeFrameCountdown(
  initialSeconds = 7200,
  currentFrame: number,
  fps = 30,
  showMilliseconds = true
): CountdownTimeComponents {
  const elapsedSeconds = currentFrame / fps;
  const remainingTotalSeconds = Math.max(0, initialSeconds - elapsedSeconds);

  const hours = Math.floor(remainingTotalSeconds / 3600);
  const minutes = Math.floor((remainingTotalSeconds % 3600) / 60);
  const seconds = Math.floor(remainingTotalSeconds % 60);

  // Deterministic centiseconds (00-99) derived from frame position
  const subSecondFraction = remainingTotalSeconds % 1;
  const centiseconds = Math.floor(subSecondFraction * 100);

  const hoursStr = String(hours).padStart(2, "0");
  const minutesStr = String(minutes).padStart(2, "0");
  const secondsStr = String(seconds).padStart(2, "0");
  const centisecondsStr = String(centiseconds).padStart(2, "0");

  const formattedClock = showMilliseconds
    ? `${hoursStr}:${minutesStr}:${secondsStr}.${centisecondsStr}`
    : `${hoursStr}:${minutesStr}:${secondsStr}`;

  return {
    hours,
    minutes,
    seconds,
    centiseconds,
    hoursStr,
    minutesStr,
    secondsStr,
    centisecondsStr,
    formattedClock,
  };
}

// ============================================================================
// 2. INVENTORY SCARCITY & DYNAMIC STOCK DEPLETION
// ============================================================================

/**
 * Computes current remaining inventory and claimed progress percentage.
 * When `dynamicDepletion` is enabled, simulates live purchases dropping stock during playback.
 */
export function computeStockProgress(
  scarcity: StockScarcityConfig,
  currentFrame = 0,
  totalFrames = 600
): StockProgressResult {
  const totalStock = Math.max(1, scarcity.totalStock ?? 50);
  let remaining = Math.max(0, scarcity.remainingStock);

  // Dynamic stock drop during video: drop 1 unit at 35% and another at 70% duration
  if (scarcity.dynamicDepletion && totalFrames > 0) {
    const progress = currentFrame / totalFrames;
    if (progress >= 0.7 && remaining > 1) {
      remaining = Math.max(1, remaining - 2);
    } else if (progress >= 0.35 && remaining > 1) {
      remaining = Math.max(1, remaining - 1);
    }
  }

  // Calculate claimed percentage
  let claimedPct = scarcity.claimedPercentage;
  if (claimedPct === undefined || claimedPct === null) {
    claimedPct = Math.round(((totalStock - remaining) / totalStock) * 100);
  } else if (scarcity.dynamicDepletion) {
    // Dynamically increase claimed percentage as remaining drops
    const unitsSold = totalStock - remaining;
    claimedPct = Math.min(99, Math.round((unitsSold / totalStock) * 100));
  }

  claimedPct = Math.min(99, Math.max(1, claimedPct));
  const lowThreshold = scarcity.lowStockThreshold ?? 10;
  const isLowStock = remaining <= lowThreshold;

  const stockLabel =
    remaining <= 3
      ? `ALMOST GONE: ONLY ${remaining} LEFT!`
      : `ONLY ${remaining} UNITS REMAINING (${claimedPct}% CLAIMED)`;

  return {
    remainingStock: remaining,
    totalStock,
    claimedPercentage: claimedPct,
    isLowStock,
    stockLabel,
  };
}

// ============================================================================
// 3. AESTHETIC THEME STYLES
// ============================================================================

const THEME_PRESETS: Record<UrgencyTheme, UrgencyThemeStyles> = {
  neon_fire: {
    primaryColor: "#ef4444",
    gradient: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
    glowColor: "rgba(239, 68, 68, 0.45)",
    textColor: "#ffffff",
    accentBg: "rgba(239, 68, 68, 0.18)",
    iconSymbol: "🔥",
    badgeLabel: "FLASH SALE",
  },
  cyber_amber: {
    primaryColor: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b 0%, #eab308 100%)",
    glowColor: "rgba(245, 158, 11, 0.45)",
    textColor: "#ffffff",
    accentBg: "rgba(245, 158, 11, 0.18)",
    iconSymbol: "⚡",
    badgeLabel: "LIMITED INVENTORY",
  },
  emerald_surge: {
    primaryColor: "#10b981",
    gradient: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
    glowColor: "rgba(16, 185, 129, 0.45)",
    textColor: "#ffffff",
    accentBg: "rgba(16, 185, 129, 0.18)",
    iconSymbol: "✨",
    badgeLabel: "EARLY ACCESS VIP",
  },
  midnight_crimson: {
    primaryColor: "#e11d48",
    gradient: "linear-gradient(135deg, #e11d48 0%, #881337 100%)",
    glowColor: "rgba(225, 29, 72, 0.45)",
    textColor: "#ffffff",
    accentBg: "rgba(225, 29, 72, 0.18)",
    iconSymbol: "⏳",
    badgeLabel: "PRICE HIKE AT MIDNIGHT",
  },
};

/**
 * Resolves CSS styling parameters for the chosen urgency theme.
 */
export function getUrgencyThemeStyles(theme: UrgencyTheme = "neon_fire"): UrgencyThemeStyles {
  return THEME_PRESETS[theme] || THEME_PRESETS.neon_fire;
}

// ============================================================================
// 4. PRESET GENERATOR
// ============================================================================

export interface UrgencyPreset {
  id: string;
  name: string;
  description: string;
  config: FlashSaleUrgencyConfig;
}

/**
 * Generates 4 curated urgency presets tailored to common promotional strategies.
 */
export function generateUrgencyPresets(productSpec?: ProductSpec): UrgencyPreset[] {
  const discount =
    productSpec?.compareAtPrice && productSpec.compareAtPrice > productSpec.price
      ? Math.round(((productSpec.compareAtPrice - productSpec.price) / productSpec.compareAtPrice) * 100)
      : 35;

  return [
    {
      id: "flash_sale_tonight",
      name: "🔥 Flash Sale Tonight",
      description: `Urgent ${discount}% discount ending in 2 hours with live stock depletion`,
      config: {
        enabled: true,
        headline: `⚡ FLASH SALE: ${discount}% OFF ENDS TONIGHT`,
        initialSeconds: 7200,
        theme: "neon_fire",
        position: "top_banner",
        showMilliseconds: true,
        stockScarcity: {
          enabled: true,
          totalStock: 60,
          remainingStock: 7,
          claimedPercentage: 88,
          dynamicDepletion: true,
          lowStockThreshold: 10,
        },
      },
    },
    {
      id: "limited_batch_drop",
      name: "⚡ Limited Batch Drop",
      description: "Low-stock countdown with glowing amber warning indicator",
      config: {
        enabled: true,
        headline: "LIMITED BATCH DROP • ALMOST SOLD OUT",
        initialSeconds: 3600 * 4,
        theme: "cyber_amber",
        position: "top_banner",
        showMilliseconds: false,
        stockScarcity: {
          enabled: true,
          totalStock: 45,
          remainingStock: 4,
          claimedPercentage: 91,
          dynamicDepletion: true,
          lowStockThreshold: 8,
        },
      },
    },
    {
      id: "midnight_price_hike",
      name: "⏳ Midnight Price Increase",
      description: "Deep velvet crimson alert warning price jumps at midnight",
      config: {
        enabled: true,
        headline: "CURRENT PRICING EXPIRES AT MIDNIGHT",
        initialSeconds: 3600 * 3 + 1800,
        theme: "midnight_crimson",
        position: "top_banner",
        showMilliseconds: true,
        stockScarcity: {
          enabled: false,
          remainingStock: 15,
        },
      },
    },
    {
      id: "vip_early_access",
      name: "✨ VIP Early Access",
      description: "Emerald futuristic badge for exclusive subscriber drops",
      config: {
        enabled: true,
        headline: "VIP SUBSCRIBER EXCLUSIVE • 24 HOURS ONLY",
        initialSeconds: 3600 * 24,
        theme: "emerald_surge",
        position: "floating_pill",
        showMilliseconds: false,
        stockScarcity: {
          enabled: true,
          totalStock: 100,
          remainingStock: 18,
          claimedPercentage: 82,
          dynamicDepletion: false,
          lowStockThreshold: 20,
        },
      },
    },
  ];
}
