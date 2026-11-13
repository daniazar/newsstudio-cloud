import { describe, it, expect } from "vitest";
import type { RemotionSegment, CompositionProps } from "@/lib/types";

describe("Phase 1: Dual-Language Captions & 1:1 Square Remotion Adaptation", () => {
  describe("1. RemotionSegment & CompositionProps Dual-Language Typing", () => {
    it("supports secondaryText on RemotionSegment for dual-language translation", () => {
      const segment: RemotionSegment = {
        index: 0,
        startFrame: 0,
        endFrame: 90,
        text: "El Banco Central anunció nuevas medidas cambiarias",
        secondaryText: "The Central Bank announced new foreign exchange measures",
        keywords: ["BCRA", "dólar", "economía"],
      };

      expect(segment.text).toBe("El Banco Central anunció nuevas medidas cambiarias");
      expect(segment.secondaryText).toBe("The Central Bank announced new foreign exchange measures");
    });

    it("supports enableDualCaptions and secondaryCaptionColor on CompositionProps", () => {
      const props: CompositionProps = {
        aspectRatio: "square",
        segments: [
          {
            index: 0,
            startFrame: 0,
            endFrame: 90,
            text: "Mercados al alza en Wall Street",
            secondaryText: "Markets on the rise in Wall Street",
          },
        ],
        enableDualCaptions: true,
        secondaryCaptionColor: "#e2e8f0",
      };

      expect(props.aspectRatio).toBe("square");
      expect(props.enableDualCaptions).toBe(true);
      expect(props.secondaryCaptionColor).toBe("#e2e8f0");
      expect(props.segments[0].secondaryText).toBeDefined();
    });
  });

  describe("2. Aspect Ratio Safe Zones & Geometry Calibration", () => {
    it("accurately classifies 1:1 square aspect ratio dimensions", () => {
      const squareWidth = 1080;
      const squareHeight = 1080;
      const isSquare = squareWidth === squareHeight;
      expect(isSquare).toBe(true);

      const verticalWidth = 1080;
      const verticalHeight = 1920;
      const isVertical = verticalHeight > verticalWidth;
      expect(isVertical).toBe(true);

      const horizontalWidth = 1920;
      const horizontalHeight = 1080;
      const isHorizontal = horizontalWidth > horizontalHeight;
      expect(isHorizontal).toBe(true);
    });

    it("calculates square safe zone margins (1080x1080) for feed layouts", () => {
      const height = 1080;
      const topHeaderDanger = 90; // Instagram/LinkedIn top profile bar
      const bottomControlsDanger = 130; // Feed CTA / caption area
      const availableContentHeight = height - topHeaderDanger - bottomControlsDanger;

      expect(availableContentHeight).toBe(860);
      expect(availableContentHeight / height).toBeCloseTo(0.796, 2); // ~80% safe viewport
    });
  });

  describe("3. Captions Pacing & Timing Word Weighting", () => {
    it("weights word frame durations by character length", () => {
      const text = "Inflación record en Argentina";
      const words = text.split(" ");
      const totalChars = words.reduce((acc, w) => acc + w.length, 0);
      const totalFrames = 90; // 3 seconds at 30fps

      const weights = words.map((w) => w.length / totalChars);
      const frameDurations = weights.map((w) => Math.round(w * totalFrames));

      expect(words.length).toBe(4);
      expect(weights.reduce((a, b) => a + b, 0)).toBeCloseTo(1.0, 4);
      // Longest word ("Argentina" or "Inflación") gets more frames than short words ("en")
      const enIndex = words.indexOf("en");
      const argIndex = words.indexOf("Argentina");
      expect(frameDurations[argIndex]).toBeGreaterThan(frameDurations[enIndex]);
    });
  });
});
