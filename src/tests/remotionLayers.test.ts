import { describe, it, expect } from "vitest";
import {
  calculateDuckingMultiplier,
  getDuckedVolume,
  calculateDynamicMusicVolume,
  calculateBroadcastGainCurve,
} from "@/remotion/components/AudioDuckingLayer";
import {
  calculateTickerTranslateX,
  formatHeadlineTickerItems,
  extractHeadlinesFromSegments,
  DEFAULT_FINANCIAL_TICKERS,
  DEFAULT_FINANCIAL_TICKERS_ES,
  resolveTickerLanguage,
  estimateTickerCycleWidth,
  TICKER_LOCALIZATIONS,
} from "@/remotion/layers/TickerTapeLayer";
import {
  formatCitationSource,
  getConfidenceScoreLabel,
  getCitationPositionStyles,
  calculateBadgeEntrance,
} from "@/remotion/layers/CitationBadgeLayer";
import {
  calculateSpeakerGlow,
  calculateVuMeterBars,
  DEFAULT_LEFT_FEED,
  DEFAULT_RIGHT_FEED,
} from "@/remotion/layers/SplitScreenSatelliteLayer";
import type { RemotionSegment } from "@/lib/types";

describe("Stream 3: Remotion Studio Broadcast Layer Calibration", () => {
  // =========================================================================
  // 1. AudioDuckingLayer: Dynamic -14dB Dips & -2dB Swell Curves
  // =========================================================================
  describe("AudioDuckingLayer Decibel Mathematics & Dynamic Gain Curve", () => {
    it("calculates exact decibel attenuation multipliers", () => {
      // -14dB active dialogue dip: 10^(-14/20) ~= 0.199526
      const mult14 = calculateDuckingMultiplier(-14);
      expect(mult14).toBeCloseTo(0.1995, 3);

      // -2dB breath pause & scene transition swell: 10^(-2/20) ~= 0.794328
      const mult2 = calculateDuckingMultiplier(-2);
      expect(mult2).toBeCloseTo(0.7943, 3);

      // 0dB full unity: 1.0
      expect(calculateDuckingMultiplier(0)).toBe(1.0);

      // -6dB approx half volume
      expect(calculateDuckingMultiplier(-6)).toBeCloseTo(0.501, 2);
    });

    it("calculates ducked volume during speech and swell during pauses", () => {
      const baseVolume = 0.40;

      // Active speech with -14dB dip: ~0.40 * 0.1995 = 0.0798
      const ducked = getDuckedVolume(baseVolume, true, -14, -2);
      expect(ducked).toBeCloseTo(0.0798, 3);

      // Breath pause with -2dB swell: ~0.40 * 0.7943 = 0.3177
      const swelled = getDuckedVolume(baseVolume, false, -14, -2);
      expect(swelled).toBeCloseTo(0.3177, 3);

      // Pause with default 0dB unity: 0.40
      const unity = getDuckedVolume(baseVolume, false, -14, 0);
      expect(unity).toBe(0.40);
    });

    it("smoothly executes attack dips into dialogue and release swells into breath pauses", () => {
      const baseVolume = 0.35;
      const speechIntervals = [{ startFrame: 30, endFrame: 90 }];
      const swellDb = -2;
      const duckingDb = -14;

      const swellVol = baseVolume * calculateDuckingMultiplier(swellDb); // ~0.2780
      const duckVol = baseVolume * calculateDuckingMultiplier(duckingDb);  // ~0.0698

      // Frame 10 (Before speech): Swelled to -2dB
      const volBefore = calculateDynamicMusicVolume(10, {
        baseVolume,
        duckingDb,
        swellDb,
        speechIntervals,
        attackFrames: 8,
        releaseFrames: 12,
      });
      expect(volBefore).toBeCloseTo(swellVol, 3);

      // Frame 34 (Mid-attack ramp): Between -2dB and -14dB
      const volAttack = calculateDynamicMusicVolume(34, {
        baseVolume,
        duckingDb,
        swellDb,
        speechIntervals,
        attackFrames: 8,
        releaseFrames: 12,
      });
      expect(volAttack).toBeLessThan(swellVol);
      expect(volAttack).toBeGreaterThan(duckVol);

      // Frame 60 (Mid-speech): Fully ducked at -14dB
      const volSpeech = calculateDynamicMusicVolume(60, {
        baseVolume,
        duckingDb,
        swellDb,
        speechIntervals,
        attackFrames: 8,
        releaseFrames: 12,
      });
      expect(volSpeech).toBeCloseTo(duckVol, 3);

      // Frame 96 (Mid-release ramp): Smoothly rising from -14dB to -2dB
      const volRelease = calculateDynamicMusicVolume(96, {
        baseVolume,
        duckingDb,
        swellDb,
        speechIntervals,
        attackFrames: 8,
        releaseFrames: 12,
      });
      expect(volRelease).toBeGreaterThan(duckVol);
      expect(volRelease).toBeLessThan(swellVol);

      // Frame 115 (After release): Recovered to -2dB swell
      const volRecovered = calculateDynamicMusicVolume(115, {
        baseVolume,
        duckingDb,
        swellDb,
        speechIntervals,
        attackFrames: 8,
        releaseFrames: 12,
      });
      expect(volRecovered).toBeCloseTo(swellVol, 3);
    });

    it("handles explicit breath pauses and multi-segment gain curves", () => {
      const segments: RemotionSegment[] = [
        { index: 0, startFrame: 0, endFrame: 60, text: "Lead story announcement." },
        { index: 1, startFrame: 90, endFrame: 150, text: "Second story details." },
      ];

      // Segment 0 active dialogue (frame 30): -14dB dip (~0.0698)
      const speech1Vol = calculateBroadcastGainCurve(30, segments, 0.35);
      expect(speech1Vol).toBeCloseTo(0.35 * calculateDuckingMultiplier(-14), 3);

      // Scene transition / breath pause between segments (frame 75): -2dB swell (~0.2780)
      const pauseVol = calculateBroadcastGainCurve(75, segments, 0.35);
      expect(pauseVol).toBeCloseTo(0.35 * calculateDuckingMultiplier(-2), 3);

      // Segment 1 active dialogue (frame 120): -14dB dip (~0.0698)
      const speech2Vol = calculateBroadcastGainCurve(120, segments, 0.35);
      expect(speech2Vol).toBeCloseTo(0.35 * calculateDuckingMultiplier(-14), 3);
    });
  });

  // =========================================================================
  // 2. TickerTapeLayer: Story Headline Integration & Horizontal Marquee
  // =========================================================================
  describe("TickerTapeLayer Continuous Horizontal Scrolling & Headline Parsing", () => {
    it("calculates smooth continuous translateX horizontal scroll offsets", () => {
      // Speed: 2.5px/frame, loopWidth: 1800px
      expect(calculateTickerTranslateX(0, 2.5, 1800)).toBe(-0);
      expect(calculateTickerTranslateX(10, 2.5, 1800)).toBe(-25);
      expect(calculateTickerTranslateX(100, 2.5, 1800)).toBe(-250);

      // Frame 720: 720 * 2.5 = 1800 -> wraps seamlessly back to 0
      expect(calculateTickerTranslateX(720, 2.5, 1800)).toBe(-0);

      // Frame 730: 730 * 2.5 = 1825 -> modulo 1800 = 25 -> offset -25
      expect(calculateTickerTranslateX(730, 2.5, 1800)).toBe(-25);
    });

    it("formats raw headline strings into structured broadcast ticker items", () => {
      const headlines = [
        "Nvidia announces next-generation Blackwell Ultra architecture",
        "European Union establishes landmark AI regulatory framework",
        "SpaceX successfully catches Super Heavy booster",
      ];

      const items = formatHeadlineTickerItems(headlines, "WORLD TECH");
      expect(items).toHaveLength(3);
      expect(items[0].headline).toBe("Nvidia announces next-generation Blackwell Ultra architecture");
      expect(items[0].category).toBe("WORLD TECH");
      expect(items[0].urgency).toBe("breaking"); // First item tagged breaking
      expect(items[1].urgency).toBe("standard");
    });

    it("extracts clean story headlines from Remotion timeline segments", () => {
      const segments: RemotionSegment[] = [
        {
          index: 0,
          startFrame: 0,
          endFrame: 90,
          text: "Quantum computing researchers have achieved true fault-tolerant qubits. This is a massive milestone.",
        },
        {
          index: 1,
          startFrame: 90,
          endFrame: 180,
          text: "Stock markets reacted strongly to today's tech earnings. Indices reached all-time highs.",
        },
      ];

      const extracted = extractHeadlinesFromSegments(segments);
      expect(extracted).toHaveLength(2);
      expect(extracted[0]).toBe("Quantum computing researchers have achieved true fault-tolerant qubits");
      expect(extracted[1]).toBe("Stock markets reacted strongly to today's tech earnings");
    });

    it("includes default financial indices in fallback catalog", () => {
      expect(DEFAULT_FINANCIAL_TICKERS.length).toBeGreaterThanOrEqual(4);
      expect(DEFAULT_FINANCIAL_TICKERS.some((t) => t.symbol === "NVDA")).toBe(true);
      expect(DEFAULT_FINANCIAL_TICKERS.some((t) => t.symbol === "BTC")).toBe(true);
    });

    it("resolves video language and provides localized badge & category", () => {
      // Spanish segments detection
      const spanishSegments: RemotionSegment[] = [
        {
          index: 0,
          text: "¡Atención! La empresa aeroespacial acaba de lograr un hito histórico.",
          startFrame: 0,
          endFrame: 90,
        },
      ];
      expect(resolveTickerLanguage({ segments: spanishSegments })).toBe("es");
      expect(TICKER_LOCALIZATIONS.es.badgeText).toBe("EN VIVO");
      expect(TICKER_LOCALIZATIONS.es.category).toBe("ÚLTIMO MOMENTO");

      // Persona language detection (Ruby is Argentine Spanish)
      const rubySegment: RemotionSegment[] = [
        {
          index: 0,
          text: "Short text",
          personaId: "ruby",
          startFrame: 0,
          endFrame: 90,
        },
      ];
      expect(resolveTickerLanguage({ segments: rubySegment })).toBe("es");

      // English fallback
      const englishSegments: RemotionSegment[] = [
        {
          index: 0,
          text: "Global markets rallied today following tech earnings reports.",
          startFrame: 0,
          endFrame: 90,
        },
      ];
      expect(resolveTickerLanguage({ segments: englishSegments })).toBe("en");
      expect(TICKER_LOCALIZATIONS.en.badgeText).toBe("LIVE WIRE");
      expect(TICKER_LOCALIZATIONS.en.category).toBe("BREAKING NEWS");

      // Spanish financial fallback tickers
      expect(DEFAULT_FINANCIAL_TICKERS_ES.some((t) => t.symbol === "INFLACIÓN")).toBe(true);
    });

    it("calculates dynamic cycle width and wraps seamlessly without jump at cycle boundary", () => {
      const items = formatHeadlineTickerItems([
        "NASA announces Artemis moon mission crew",
        "SpaceX Starship orbital launch test successful",
      ]);

      const cycleWidth = estimateTickerCycleWidth(items);
      expect(cycleWidth).toBeGreaterThan(600);

      // Frame 0: offset 0
      expect(calculateTickerTranslateX(0, 2.5, cycleWidth)).toBe(-0);

      // At exact cycle boundary, wraps seamlessly back to 0 (where identical Cycle 1 begins)
      const framesPerCycle = cycleWidth / 2.5;
      expect(calculateTickerTranslateX(framesPerCycle, 2.5, cycleWidth)).toBe(-0);

      // Right after cycle boundary, continuous scroll continues smoothly with zero jump
      expect(calculateTickerTranslateX(framesPerCycle + 1, 2.5, cycleWidth)).toBe(-2.5);
    });
  });

  // =========================================================================
  // 3. CitationBadgeLayer: Branded Fact-Check & Wire Citations
  // =========================================================================
  describe("CitationBadgeLayer Fact-Check Verification & Spring Entrance", () => {
    it("normalizes and sanitizes wire source citations", () => {
      expect(formatCitationSource("Verified Source: Reuters")).toBe("REUTERS");
      expect(formatCitationSource("Associated Press Wire")).toBe("ASSOCIATED PRESS WIRE");
      expect(formatCitationSource("Bloomberg Terminal")).toBe("BLOOMBERG TERMINAL");
      expect(formatCitationSource(undefined)).toBe("VERIFIED NEWS WIRE");
    });

    it("formats confidence score percentages correctly", () => {
      expect(getConfidenceScoreLabel(0.96)).toBe("96%");
      expect(getConfidenceScoreLabel(1.0)).toBe("100%");
      expect(getConfidenceScoreLabel(0.854)).toBe("85%");
      expect(getConfidenceScoreLabel(0.70)).toBe("70%");
    });

    it("returns accurate CSS positions for all 4 viewport corners", () => {
      const topLeft = getCitationPositionStyles("top-left");
      expect(topLeft.top).toBe("36px");
      expect(topLeft.left).toBe("36px");

      const topRight = getCitationPositionStyles("top-right");
      expect(topRight.top).toBe("36px");
      expect(topRight.right).toBe("36px");

      const bottomLeft = getCitationPositionStyles("bottom-left");
      expect(bottomLeft.bottom).toBe("110px");
      expect(bottomLeft.left).toBe("36px");

      const bottomRight = getCitationPositionStyles("bottom-right");
      expect(bottomRight.bottom).toBe("110px");
      expect(bottomRight.right).toBe("36px");
    });

    it("computes smooth entrance spring physics and opacity ramp", () => {
      // Frame 10 (before startFrame 15): Hidden
      const before = calculateBadgeEntrance(10, 30, 15);
      expect(before.scale).toBe(0);
      expect(before.opacity).toBe(0);

      // Frame 15 (startFrame): Beginning entrance
      const start = calculateBadgeEntrance(15, 30, 15);
      expect(start.opacity).toBe(0);
      expect(start.scale).toBeGreaterThanOrEqual(0);

      // Frame 35 (fully entered): Scale ~ 1, Opacity = 1
      const entered = calculateBadgeEntrance(35, 30, 15);
      expect(entered.opacity).toBe(1.0);
      expect(entered.scale).toBeCloseTo(1.0, 1);
    });
  });

  // =========================================================================
  // 4. SplitScreenSatelliteLayer: Dual-Anchor Layout & Dynamic Active Glow
  // =========================================================================
  describe("SplitScreenSatelliteLayer Dual-Anchor Layout & Active Speaker Glow", () => {
    it("calculates distinct speaker glow styles for active vs inactive speakers", () => {
      const activeGlow = calculateSpeakerGlow(true, 15, "#22d3ee");
      const inactiveGlow = calculateSpeakerGlow(false, 15, "#22d3ee");

      // Active speaker: Vibrant cyan border, high opacity, pulsing shadow glow, scale punch
      expect(activeGlow.borderColor).toBe("#22d3ee");
      expect(activeGlow.opacity).toBe(1.0);
      expect(activeGlow.scale).toBeGreaterThan(1.0);
      expect(activeGlow.boxShadow).toContain("rgba(34, 211, 238");

      // Inactive speaker: Subdued translucent border, lower opacity, neutral scale
      expect(inactiveGlow.borderColor).toBe("rgba(255, 255, 255, 0.18)");
      expect(inactiveGlow.opacity).toBe(0.85);
      expect(inactiveGlow.scale).toBe(1.0);
    });

    it("calculates realistic audio VU meter bar heights", () => {
      // Inactive speaker: Baseline idle bars (15%)
      const idleBars = calculateVuMeterBars(20, false, 5);
      expect(idleBars).toHaveLength(5);
      idleBars.forEach((bar) => expect(bar).toBe(15));

      // Active speaker: Dynamic fluctuation between 22% and 100%
      const activeBars = calculateVuMeterBars(20, true, 5);
      expect(activeBars).toHaveLength(5);
      activeBars.forEach((bar) => {
        expect(bar).toBeGreaterThanOrEqual(22);
        expect(bar).toBeLessThanOrEqual(100);
      });
    });

    it("provides valid default satellite feeds with location and latency metadata", () => {
      expect(DEFAULT_LEFT_FEED.name).toBe("Ruby Sterling");
      expect(DEFAULT_LEFT_FEED.isSpeaking).toBe(true);
      expect(DEFAULT_LEFT_FEED.location).toContain("NEW YORK");

      expect(DEFAULT_RIGHT_FEED.name).toBe("Blaze Wilder");
      expect(DEFAULT_RIGHT_FEED.isSpeaking).toBe(false);
      expect(DEFAULT_RIGHT_FEED.location).toContain("SILICON VALLEY");
    });
  });
});
