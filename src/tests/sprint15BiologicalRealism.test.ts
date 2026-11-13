import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/shaders/neural3DMMFragmentShader";
import { CHROMA_COMPOSITOR_FS } from "../lib/realtime/shaders/chromaCompositorPass";
import { OnnxAudioVisemeEngine } from "../lib/realtime/onnxAudioVisemeEngine";
import { ProceduralLivePortraitDriver } from "../lib/realtime/proceduralLivePortraitDriver";

describe("Sprint 15: Biological Skin & Facial Realism", () => {
  describe("C1: Nasolabial Folds & Marionette Lines", () => {
    it("should declare applyDynamicExpressionCreases with parabolic alar folds and marionette lines", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec3 applyDynamicExpressionCreases(");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("smile > 0.04");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("smile < -0.04");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("nasolabialShadowL");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("marionetteShadowL");
    });

    it("should enforce naming constraint: NO furrowShadow or foreheadShadow declared", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain("furrowShadow");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain("foreheadShadow");
    });

    it("should execute dynamic creases on smile, frown, furrow, brow raise, or jaw open", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("abs(u_smileExpression) > 0.04");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("applyDynamicExpressionCreases(");
    });
  });

  describe("C4: Studio Ambient Shadow Undertone Bounce", () => {
    it("should declare getStudioAmbientBounce mapping u_lightingTone", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec3 getStudioAmbientBounce(int tone)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec3(1.08, 0.98, 0.90)"); // Warm bounce
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec3(0.88, 0.98, 1.10)"); // Cyan bounce
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec3(1.12, 0.88, 0.92)"); // Red Alert bounce
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec3(0.98, 0.98, 1.02)"); // Neutral bounce
    });

    it("should blend studio ambient bounce into deep facial shadows (luminance < 0.40)", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("shadowLum < 0.40");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("getStudioAmbientBounce(u_lightingTone)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("0.22");
    });
  });

  describe("C5: Ear Edge & Peripheral Backlight Translucency", () => {
    it("should apply warm cartilage forward-scattering in fragment shader edge band", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("alpha > 0.12 && alpha < 0.75");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec3(1.18, 0.72, 0.52)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("cartilageScatter");
    });

    it("should apply forward-scattering in chromaCompositorPass", () => {
      expect(CHROMA_COMPOSITOR_FS).toContain("alpha > 0.12 && alpha < 0.75");
      expect(CHROMA_COMPOSITOR_FS).toContain("vec3(1.18, 0.72, 0.52)");
      expect(CHROMA_COMPOSITOR_FS).toContain("cartilageScatter");
    });
  });

  describe("E6: Specular Roughness Zones Across Face", () => {
    it("should define getSkinRoughness with T-zone vs cheek distribution", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float getSkinRoughness(");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("0.44"); // T-Zone glossy
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("0.78"); // Cheeks diffuse
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("0.62"); // Base / perioral
    });

    it("should modulate skin micro-glint by anatomical roughness in Stage 6F", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float skinRoughness = getSkinRoughness(");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("roughnessSpecGain");
    });
  });

  describe("A2: Dry Mouth Transitional Saliva Model", () => {
    it("should initialize lipMoisture at 0.85 and allow manual override", () => {
      const engine = new OnnxAudioVisemeEngine();
      expect(engine.getLipMoisture()).toBeCloseTo(0.85, 2);

      engine.setLipMoisture(0.50);
      expect(engine.getLipMoisture()).toBeCloseTo(0.50, 2);

      // Clamp limits [0.40, 1.0]
      engine.setLipMoisture(0.10);
      expect(engine.getLipMoisture()).toBeCloseTo(0.40, 2);

      engine.setLipMoisture(1.50);
      expect(engine.getLipMoisture()).toBeCloseTo(1.0, 2);
    });

    it("should decay lipMoisture during continuous speech and recover during pauses", () => {
      const engine = new OnnxAudioVisemeEngine();
      engine.setLipMoisture(0.85);

      // 10 seconds of speech
      let now = 1000;
      for (let i = 0; i < 20; i++) {
        now += 500;
        engine.extractFrame(null, null, true, now);
      }
      expect(engine.getLipMoisture()).toBeLessThan(0.85);
      const postSpeechMoisture = engine.getLipMoisture();

      // 10 seconds of silence / pause
      for (let i = 0; i < 20; i++) {
        now += 500;
        engine.extractFrame(null, null, false, now);
      }
      expect(engine.getLipMoisture()).toBeGreaterThan(postSpeechMoisture);
    });

    it("should include lipMoisture in Neural3DMMFrame and fragment shader uniforms", () => {
      const engine = new OnnxAudioVisemeEngine();
      const frame = engine.extractFrame(null, null, false);
      expect(typeof frame.lipMoisture).toBe("number");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_lipMoisture;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("u_lipMoisture");
    });
  });

  describe("B4: Slow / Tired Blink Variants", () => {
    it("should track sessionDurationSec across updates", () => {
      const driver = new ProceduralLivePortraitDriver();
      expect(driver.getSessionDuration()).toBe(0);

      driver.update(1.0);
      driver.update(2.5);
      expect(driver.getSessionDuration()).toBeGreaterThan(1.0);

      driver.setSessionDuration(500);
      expect(driver.getSessionDuration()).toBe(500);
    });

    it("should support reflex, deliberate, and tired blink triggers with correct crease depth", () => {
      const driver = new ProceduralLivePortraitDriver();

      // Reflex blink
      driver.triggerBlink("reflex", 1.0);
      expect(driver.getBlinkVariant()).toBe("reflex");
      expect(driver.getEyelidCreaseDepth()).toBeCloseTo(1.0, 2);

      // Deliberate blink
      driver.triggerBlink("deliberate", 2.0);
      expect(driver.getBlinkVariant()).toBe("deliberate");
      expect(driver.getEyelidCreaseDepth()).toBeCloseTo(1.15, 2);

      // Tired blink
      driver.triggerBlink("tired", 3.0);
      expect(driver.getBlinkVariant()).toBe("tired");
      expect(driver.getEyelidCreaseDepth()).toBeCloseTo(1.20, 2);
    });

    it("should include blinkVariant and eyelidCreaseDepth in LivePortraitState", () => {
      const driver = new ProceduralLivePortraitDriver();
      driver.triggerBlink("tired", 1.0);
      const state = driver.update(1.05);

      expect(state.blinkVariant).toBe("tired");
      expect(state.eyelidCreaseDepth).toBeCloseTo(1.20, 2);
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_eyelidCreaseDepth;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("creaseDepthScale");
    });
  });
});
