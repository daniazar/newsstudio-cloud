import { describe, it, expect, beforeEach } from "vitest";
import {
  computeWireHash,
  evaluateOsintAlert,
  processOsintStream,
  OsintDeduplicationCache,
  OsintWireItem,
} from "@/lib/osint/situationRoomDaemon";
import {
  switchObsScene,
  toggleObsSource,
  triggerBroadcastStinger,
  checkObsHealth,
} from "@/lib/obs/obsWebSocketBridge";

describe("Phase 9: 24/7 OSINT Situation Room Daemon & Live Stream Deck OBS Bridge", () => {
  describe("1. OSINT Urgency Scoring & Deduplication", () => {
    let testCache: OsintDeduplicationCache;

    beforeEach(() => {
      testCache = new OsintDeduplicationCache(1000); // 1-second TTL for testing
    });

    it("evaluates a high-impact breaking alert with urgency score >= 85", () => {
      const breakingWire: OsintWireItem = {
        headline: "BREAKING: Global Telecom Outage and Cloud Infrastructure Crash Sparks Critical Emergency",
        summary: "Reuters reports unprecedented network blackout across major transit systems.",
        source: "Reuters",
        url: "https://reuters.com/breaking-telecom-outage-2026",
      };

      const alert = evaluateOsintAlert(breakingWire);

      expect(alert.urgencyScore).toBeGreaterThanOrEqual(85);
      expect(alert.isBreaking).toBe(true);
      expect(alert.suggestedFormat).toBe("breaking_bulletin");
      expect(alert.confidence).toBe(0.95);
      expect(alert.detectedKeywords).toContain("breaking");
    });

    it("evaluates a routine news item as standard wire", () => {
      const routineWire: OsintWireItem = {
        headline: "Local Community Center Unveils Weekend Gardening Program",
        summary: "Organizers invite neighborhood residents for seasonal flower planting.",
        source: "Community Gazette",
        url: "https://communitygazette.org/gardening-program",
      };

      const alert = evaluateOsintAlert(routineWire);

      expect(alert.urgencyScore).toBeLessThan(60);
      expect(alert.isBreaking).toBe(false);
      expect(alert.suggestedFormat).toBe("standard_wire");
    });

    it("deduplicates identical wire items within cache TTL window", () => {
      const wire: OsintWireItem = {
        headline: "Federal Reserve Announces Surprise Emergency Rate Adjustment",
        summary: "Bloomberg wire report.",
        source: "Bloomberg",
        url: "https://bloomberg.com/fed-emergency-rate-2026",
      };

      const resultFirst = processOsintStream([wire], testCache);
      expect(resultFirst.totalEvaluated).toBe(1);
      expect(resultFirst.alerts).toHaveLength(1);
      expect(resultFirst.duplicatesIgnored).toBe(0);

      // Same item submitted again
      const resultSecond = processOsintStream([wire], testCache);
      expect(resultSecond.totalEvaluated).toBe(1);
      expect(resultSecond.alerts).toHaveLength(0);
      expect(resultSecond.duplicatesIgnored).toBe(1);
    });

    it("expires deduplication cache entries after TTL duration", async () => {
      const wire: OsintWireItem = {
        headline: "Antitrust Regulators File Landmark Lawsuit",
        summary: "Associated Press wire report.",
        source: "Associated Press",
        url: "https://apnews.com/antitrust-lawsuit-2026",
      };

      const hash = computeWireHash(wire);
      testCache.add(hash);
      expect(testCache.has(hash)).toBe(true);

      // Wait 1100ms for 1000ms TTL to expire
      await new Promise((res) => setTimeout(res, 1100));
      expect(testCache.has(hash)).toBe(false);
    });
  });

  describe("2. OBS Studio WebSocket v5 Bridge", () => {
    it("reports offline gracefully when OBS Studio server is unreachable", async () => {
      const isOnline = await checkObsHealth("ws://127.0.0.1:4499");
      expect(isOnline).toBe(false);
    });

    it("switches OBS program scene with simulated mock response when offline", async () => {
      const result = await switchObsScene("Anchor Solo Cam 1", {
        serverUrl: "ws://127.0.0.1:4499",
      });

      expect(result.success).toBe(true);
      expect(result.isMock).toBe(true);
      expect(result.requestType).toBe("SetCurrentProgramScene");
      expect(result.responseData.requestData.sceneName).toBe("Anchor Solo Cam 1");
    });

    it("toggles overlay source visibility in OBS program scene", async () => {
      const result = await toggleObsSource("Main Program", "Breaking News Lower Third", true, {
        serverUrl: "ws://127.0.0.1:4499",
      });

      expect(result.success).toBe(true);
      expect(result.isMock).toBe(true);
      expect(result.requestType).toBe("SetSceneItemEnabled");
      expect(result.responseData.requestData.sceneItemEnabled).toBe(true);
    });

    it("triggers broadcast stinger transition", async () => {
      const result = await triggerBroadcastStinger("Breaking Stinger", {
        serverUrl: "ws://127.0.0.1:4499",
      });

      expect(result.success).toBe(true);
      expect(result.isMock).toBe(true);
      expect(result.requestType).toBe("TriggerStudioModeTransition");
      expect(result.responseData.requestData.transitionName).toBe("Breaking Stinger");
    });
  });
});
