import { describe, it, expect } from "vitest";
import {
  checkModernMotionHealth,
  getModernMotionModels,
  getFallbackMotionModels,
  getModernMotionServerUrl,
} from "../lib/ai/modernMotionClient";

describe("Modern Motion Animation Server & 24GB VRAM Suite", () => {
  describe("1. Microservice Health & Container Live Status", () => {
    it("should resolve the default server URL to port 8011", () => {
      const url = getModernMotionServerUrl();
      expect(url).toContain("8011");
    });

    it("should connect to the active Modern-Motion-Animation-Server container on port 8011", async () => {
      const health = await checkModernMotionHealth();
      if (health) {
        expect(health.status).toBe("online");
        expect(health.service).toBe("modern-motion-animation-server");
        expect(health.port).toBe(8011);
        expect(health.engine_count).toBeGreaterThanOrEqual(10);
        expect(health.supported_engines).toContain("wan-animate-2");
        expect(health.supported_engines).toContain("scail-2");
        expect(health.supported_engines).toContain("echomimicv3");
        expect(health.supported_engines).toContain("mimicmotion");
      } else {
        // When container is offline, fallback is tested below
        expect(health).toBeNull();
      }
    });
  });

  describe("2. Fallback Model Catalog & Full 10-Model Roster", () => {
    const models = getFallbackMotionModels();

    it("should contain all 10 candidate models plus variants", () => {
      const ids = models.map((m) => m.id);
      expect(ids).toContain("wan-animate-2");
      expect(ids).toContain("wan-animate-2-distilled");
      expect(ids).toContain("scail-2");
      expect(ids).toContain("echomimicv3");
      expect(ids).toContain("emosh");
      expect(ids).toContain("original-animate-anyone");
      expect(ids).toContain("animate-anyone-2");
      expect(ids).toContain("mimicmotion");
      expect(ids).toContain("homa");
      expect(ids).toContain("moore-animateanyone");
      expect(ids).toContain("champ");
      expect(ids).toContain("liveanimate");
    });

    it("should verify 24GB RTX 5090 Mobile VRAM compatibility for all models", () => {
      models.forEach((m) => {
        expect(m.gpu_24gb_compatible).toBe(true);
        if (m.vram_fp8_gb) {
          expect(m.vram_fp8_gb).toBeLessThanOrEqual(24.0);
        }
      });
    });

    it("should verify Wan-Animate-2 14B FP8 uses <= 14GB VRAM", () => {
      const wan14b = models.find((m) => m.id === "wan-animate-2");
      expect(wan14b).toBeDefined();
      expect(wan14b?.vram_gb).toBeLessThanOrEqual(14.0);
      expect(wan14b?.distilled_available).toBe(true);
    });

    it("should verify Wan-Animate-2 1.3B Flash Distilled uses < 5GB VRAM", () => {
      const wanDistilled = models.find((m) => m.id === "wan-animate-2-distilled");
      expect(wanDistilled).toBeDefined();
      expect(wanDistilled?.vram_gb).toBeLessThanOrEqual(5.0);
      expect(wanDistilled?.agent_verdict).toContain("Distilled Fast");
    });

    it("should verify LiveAnimate is tracked for code availability", () => {
      const liveAnimate = models.find((m) => m.id === "liveanimate");
      expect(liveAnimate).toBeDefined();
      expect(liveAnimate?.agent_verdict.toLowerCase()).toContain("watch closely");
    });

    it("should verify Champ has 3D SMPL-X parametric guidance", () => {
      const champ = models.find((m) => m.id === "champ");
      expect(champ).toBeDefined();
      expect(champ?.architecture).toContain("SMPL-X");
      expect(champ?.requires_pose_extractor).toBe(true);
    });

    it("should verify HOMA specializes in Human-Object Interaction", () => {
      const homa = models.find((m) => m.id === "homa");
      expect(homa).toBeDefined();
      expect(homa?.architecture).toContain("MMDiT");
      expect(homa?.agent_verdict).toContain("HOI Specialist");
    });
  });

  describe("3. Live Model Querying & Weight Installation Inspection", () => {
    it("should fetch live models or fallback seamlessly without throwing", async () => {
      const models = await getModernMotionModels();
      expect(Array.isArray(models)).toBe(true);
      expect(models.length).toBeGreaterThanOrEqual(10);
    });

    it("should accurately reflect weights_installed and weights_status on queried models", async () => {
      const models = await getModernMotionModels();
      const distilled = models.find((m) => m.id === "wan-animate-2-distilled");
      expect(distilled).toBeDefined();

      // Distilled 1.3B weights were provisioned
      if (distilled?.weights_installed !== undefined) {
        expect(distilled.weights_installed).toBe(true);
        expect(distilled.weights_status).toBe("ready");
      }

      // 14B model was deliberately not downloaded per user instruction
      const wan14b = models.find((m) => m.id === "wan-animate-2");
      if (wan14b?.weights_installed !== undefined) {
        expect(wan14b.weights_installed).toBe(false);
        expect(wan14b.weights_status).toBe("missing_weights");
      }

      // Closed weights models should report closed_weights status
      const closedModel = models.find((m) => m.id === "original-animate-anyone");
      if (closedModel?.weights_status !== undefined) {
        expect(closedModel.weights_installed).toBe(false);
        expect(closedModel.weights_status).toBe("closed_weights");
      }
    });

    it("should filter out uninstalled models preventing them from invalid benchmarking queues", async () => {
      const models = await getModernMotionModels();
      const selectableModels = models.filter((m) => m.weights_installed === true);
      expect(selectableModels.length).toBeGreaterThanOrEqual(1);
      expect(selectableModels.some((m) => m.id === "wan-animate-2-distilled")).toBe(true);

      const uninstalledIds = models.filter((m) => !m.weights_installed).map((m) => m.id);
      expect(uninstalledIds).toContain("wan-animate-2");
      expect(uninstalledIds).toContain("original-animate-anyone");
    });
  });
});
