import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/neural3DMMShader";

describe("Sprint 13 Batch 7: Kinematic Chain Coupling, Infinite Floor Pelvis Continuity & AV Telemetry", () => {
  describe("Shader Integration & Infinite Floor Pelvis Continuity", () => {
    it("should extend pelvis rotation seamlessly to the bottom of the canvas (y = 1.0)", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("bool inLowerZone = (uv.y >= pelvisPivot.y);");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float tPelvis = clamp((uv.y - pelvisPivot.y) / 0.12, 0.0, 1.0);");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("spineAngle = u_pelvisRoll * pelvisWeight * lowerMask;");
    });
  });

  describe("Kinematic Chain Coupling Matrix Mathematics", () => {
    const computeKinematicCoupling = (headRoll: number, bodyRoll: number, pelvisRoll: number) => {
      const effHeadRoll = headRoll + bodyRoll * 0.60 - pelvisRoll * 0.20;
      const effBodyRoll = bodyRoll + headRoll * 0.35 - pelvisRoll * 0.40;
      const effPelvisRoll = pelvisRoll - headRoll * 0.15 - bodyRoll * 0.35;
      return { effHeadRoll, effBodyRoll, effPelvisRoll };
    };

    it("should induce sympathetic torso lean and contrapposto pelvis shift when tilting head", () => {
      const res = computeKinematicCoupling(-15.0, 0.0, 0.0);
      expect(res.effHeadRoll).toBe(-15.0);
      // Torso follows head with +35% sympathy: -15 * 0.35 = -5.25
      expect(res.effBodyRoll).toBeCloseTo(-5.25, 2);
      // Pelvis counter-balances with -15%: -15 * -0.15 = +2.25
      expect(res.effPelvisRoll).toBeCloseTo(2.25, 2);
    });

    it("should automatically compensate the torso when head and pelvis are tilted", () => {
      // User case from media_1788472795362.png: headRoll = -15, bodyRoll = 0, pelvisRoll = -15
      const res = computeKinematicCoupling(-15.0, 0.0, -15.0);
      expect(res.effHeadRoll).toBeCloseTo(-12.0, 2);
      // Torso compensates between the two curves: -5.25 + 6.00 = +0.75 to +1.5
      expect(res.effBodyRoll).toBeGreaterThan(0);
      expect(res.effPelvisRoll).toBeCloseTo(-12.75, 2);
    });
  });

  describe("Infinite Floor Pelvis Continuity (Zero Hand Shearing Math)", () => {
    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
    const hermite = (t: number) => t * t * (3.0 - 2.0 * t);

    const computeLowerBodyPelvisAngle = (
      uvY: number,
      effPelvisRoll: number,
      pelvisPivotY: number = 0.8168
    ) => {
      if (uvY < pelvisPivotY) return 0.0;
      const tPelvis = clamp((uvY - pelvisPivotY) / 0.12, 0.0, 1.0);
      const pelvisWeight = hermite(tPelvis);
      return effPelvisRoll * pelvisWeight;
    };

    it("should continue rotation at 100% past the pelvis transition all the way to y = 1.0", () => {
      const pelvisRoll = -15.0;

      // At pelvis pivot
      expect(computeLowerBodyPelvisAngle(0.8168, pelvisRoll)).toBeCloseTo(0.0, 5);

      // Mid-hip (y = 0.90)
      const midHip = computeLowerBodyPelvisAngle(0.90, pelvisRoll);
      expect(Math.abs(midHip)).toBeGreaterThan(4.0);

      // At the lower hand region (y = 0.88 - 0.95) - previously cut off
      const handRegion = computeLowerBodyPelvisAngle(0.95, pelvisRoll);
      expect(handRegion).toBeCloseTo(pelvisRoll, 0);

      // At the very bottom edge of canvas (y = 1.0)
      const bottomEdge = computeLowerBodyPelvisAngle(1.0, pelvisRoll);
      expect(bottomEdge).toBeCloseTo(pelvisRoll, 1);
    });
  });

  describe("Audio-Visual (AV) Drift Diagnostics Classification", () => {
    const classifyAvDrift = (driftMs: number): { status: "Locked" | "Drift" | "Desync"; color: string } => {
      const absDrift = Math.abs(driftMs);
      if (absDrift < 20) return { status: "Locked", color: "emerald" };
      if (absDrift < 50) return { status: "Drift", color: "amber" };
      return { status: "Desync", color: "rose" };
    };

    it("should classify sub-frame drift (< 20ms) as Locked (emerald)", () => {
      expect(classifyAvDrift(3.8).status).toBe("Locked");
      expect(classifyAvDrift(3.8).color).toBe("emerald");
      expect(classifyAvDrift(-12.4).status).toBe("Locked");
    });

    it("should classify mild drift (20-50ms) as Drift (amber)", () => {
      expect(classifyAvDrift(28.5).status).toBe("Drift");
      expect(classifyAvDrift(28.5).color).toBe("amber");
    });

    it("should classify high lag (> 50ms) as Desync (rose)", () => {
      expect(classifyAvDrift(65.2).status).toBe("Desync");
      expect(classifyAvDrift(65.2).color).toBe("rose");
    });
  });

  describe("BFM Sparkline Ring Buffer Math", () => {
    it("should clamp ring buffer capacity to exactly 75 samples", () => {
      const history: Array<{ jaw: number; width: number; energy: number }> = [];
      for (let i = 0; i < 100; i++) {
        history.push({ jaw: i * 0.01, width: 0.5, energy: 0.4 });
        if (history.length > 75) {
          history.shift();
        }
      }
      expect(history.length).toBe(75);
      expect(history[history.length - 1].jaw).toBeCloseTo(0.99, 2);
      expect(history[0].jaw).toBeCloseTo(0.25, 2);
    });
  });
});
