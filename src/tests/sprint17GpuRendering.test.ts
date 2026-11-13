/**
 * src/tests/sprint17GpuRendering.test.ts
 *
 * Unit tests for Sprint 17: GPU Rendering, Optical Bokeh & Production UI
 * - E1: Sub-Pixel Atmospheric Shimmer & Shader Invariant Verification
 * - E2: 9-Tap Bilateral Edge Denoise on Chroma Key Matte Boundary
 * - N2: Auto-Coupled DoF Bokeh to Camera Zoom
 * - 5M: Merged Ocular + Biomechanical Viseme Synthesis Pass
 * - E3 / 5L: Standby Low-Power FBO Downsampling Mode
 * - R4: One-Click Broadcast Realism Presets
 */

import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "@/lib/realtime/shaders/neural3DMMFragmentShader";
import { CHROMA_COMPOSITOR_FS } from "@/lib/realtime/shaders/chromaCompositorPass";
import { OCULAR_VISEME_FS, OCULAR_VISEME_VS } from "@/lib/realtime/shaders/ocularVisemePass";
import { MultiCameraDirector } from "@/lib/realtime/multiCameraDirector";
import { ModularPipelineRenderer } from "@/lib/realtime/modularPipelineRenderer";
import { BROADCAST_REALISM_PRESETS } from "@/components/conversational/WebglNeuralVisemeStage";

describe("Sprint 17: GPU Rendering, Optical Bokeh & Production UI", () => {
  describe("E1: Sub-Pixel Atmospheric Shimmer & Shader Invariants", () => {
    it("declares u_camZoom and u_harmonicPhase in NEURAL_3DMM_FRAGMENT_SHADER", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_camZoom;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_harmonicPhase;");
    });

    it("injects sub-pixel harmonic shimmer in peripheral regions beyond head center", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("shimmerMask");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("smoothstep(0.6, 1.4, headDistSq)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("u_harmonicPhase * 1.5");
    });

    it("STRICT INVARIANT: does NOT declare furrowShadow or foreheadShadow", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain("furrowShadow");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain("foreheadShadow");
    });
  });

  describe("E2: 9-Tap Bilateral Edge Denoise on Chroma Key Matte Boundary", () => {
    it("contains 9-tap bilateral filter loop with spatial and range weights", () => {
      expect(CHROMA_COMPOSITOR_FS).toContain("E2: 9-Tap Bilateral Edge Denoise");
      expect(CHROMA_COMPOSITOR_FS).toContain("for (int dy = -1; dy <= 1; dy++)");
      expect(CHROMA_COMPOSITOR_FS).toContain("for (int dx = -1; dx <= 1; dx++)");
      expect(CHROMA_COMPOSITOR_FS).toContain("spatialWeight");
      expect(CHROMA_COMPOSITOR_FS).toContain("rangeWeight");
      expect(CHROMA_COMPOSITOR_FS).toContain("filteredAlpha");
    });

    it("evaluates bilateral filter strictly on edge transition boundary (0.01 < rawAlpha < 0.99)", () => {
      expect(CHROMA_COMPOSITOR_FS).toContain("if (rawAlpha > 0.01 && rawAlpha < 0.99)");
    });
  });

  describe("N2: Auto-Coupled DoF Bokeh to Camera Zoom", () => {
    it("computes dofBokehScale based on camera zoom factor in MultiCameraDirector", () => {
      const director = new MultiCameraDirector("CAM1_ANCHOR_CLOSE", false);
      const vp1 = director.update(1000);

      expect(vp1.dofBokehScale).toBeDefined();
      expect(vp1.zoom).toBeGreaterThan(1.1);
      // At zoom 1.25, dofBokehScale is ~1.25^2 ≈ 1.56
      expect(vp1.dofBokehScale).toBeGreaterThan(1.3);

      // Switch to Wide Camera
      director.switchCamera("CAM2_STUDIO_WIDE", "cut");
      const vp2 = director.update(2000);
      expect(vp2.zoom).toBeCloseTo(1.0, 1);
      // At zoom 1.0, dofBokehScale is ~1.0
      expect(vp2.dofBokehScale).toBeCloseTo(1.0, 1);
    });

    it("scales Stage 8 DoF optical blur offset by zoomBokehScale in NEURAL_3DMM_FRAGMENT_SHADER", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("zoomBokehScale");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("max(0.5, u_camZoom * 0.85)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("0.0028 * u_dofStrength * zoomBokehScale");
    });
  });

  describe("5M: Merged Ocular + Viseme Synthesis Pass", () => {
    it("exports valid OCULAR_VISEME_VS and OCULAR_VISEME_FS shaders", () => {
      expect(OCULAR_VISEME_VS).toContain("#version 300 es");
      expect(OCULAR_VISEME_FS).toContain("#version 300 es");
      expect(OCULAR_VISEME_FS).toContain("u_blinkLeft");
      expect(OCULAR_VISEME_FS).toContain("u_jawOpen");
      expect(OCULAR_VISEME_FS).toContain("ivoryEnamel");
      expect(OCULAR_VISEME_FS).toContain("applyEyeDynamics");
    });
  });

  describe("E3 / 5L: Standby Low-Power FBO Downsampling Mode", () => {
    it("allows toggling standby low-power mode in ModularPipelineRenderer", () => {
      const renderer = new ModularPipelineRenderer();
      expect(renderer.getStandbyLowPowerMode()).toBe(false);

      renderer.setStandbyLowPowerMode(true);
      expect(renderer.getStandbyLowPowerMode()).toBe(true);

      renderer.setStandbyLowPowerMode(false);
      expect(renderer.getStandbyLowPowerMode()).toBe(false);
    });
  });

  describe("R4: One-Click Broadcast Realism Presets", () => {
    it("defines the 3 canonical broadcast realism presets", () => {
      expect(BROADCAST_REALISM_PRESETS).toHaveLength(3);

      const anchor = BROADCAST_REALISM_PRESETS.find((p) => p.id === "anchor");
      expect(anchor).toBeDefined();
      expect(anchor?.camera).toBe("CAM1_ANCHOR_CLOSE");
      expect(anchor?.lightingTone).toBe(0);
      expect(anchor?.sentiment).toBe("auto");

      const interview = BROADCAST_REALISM_PRESETS.find((p) => p.id === "interview");
      expect(interview).toBeDefined();
      expect(interview?.camera).toBe("CAM2_STUDIO_WIDE");
      expect(interview?.lightingTone).toBe(1);
      expect(interview?.idlePreset).toBe("attentive_listener");

      const breaking = BROADCAST_REALISM_PRESETS.find((p) => p.id === "breaking");
      expect(breaking).toBeDefined();
      expect(breaking?.camera).toBe("CAM1_ANCHOR_CLOSE");
      expect(breaking?.lightingTone).toBe(3);
      expect(breaking?.idlePreset).toBe("breaking_urgent");
    });
  });
});
