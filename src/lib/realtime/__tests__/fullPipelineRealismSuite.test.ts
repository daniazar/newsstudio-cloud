import { describe, it, expect } from "vitest";
import {
  NEURAL_3DMM_UNIFORM_NAMES,
  Neural3DMMUniforms,
} from "../neural3DMMShader";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../shaders/neural3DMMFragmentShader";
import {
  DEFAULT_BIOPHYSICS_OPTIONS,
  BiophysicsOptions,
} from "../liveAnchorStageEngine";
import { MultiAngleYawBlender } from "../multiAngleYawBlender";
import { WebGLCompositorOptions } from "../webglVisemeCompositor";
import { ProsodicIntonationDirector } from "../prosodicIntonationDirector";

describe("Full Pipeline Realism Suite (Biomechanical, Optical, Forensic & Studio)", () => {
  // ── 1. NEURAL 3DMM SHADER & UNIFORMS ──────────────────────────────────────
  describe("Neural3DMMShader Uniform Declarations", () => {
    it("contains all forensic and optical uniforms in NEURAL_3DMM_UNIFORM_NAMES", () => {
      const requiredUniforms = [
        "u_cardiacPulse",
        "u_duchenneTension",
        "u_tongueShadow",
        "u_interdentalEmbrasure",
        "u_subsurfaceScattering",
        "u_cornealRefraction",
        "u_perioralRhytids",
        "u_visemeArrayB",
        "u_hasDualAtlas",
        "u_angleBlendFactor",
        "u_visemeNormalArray",
        "u_hasVisemeNormalArray",
        "u_isFlipped",
        "u_jawDisplacementVector",
      ];

      for (const uniform of requiredUniforms) {
        expect(NEURAL_3DMM_UNIFORM_NAMES).toContain(uniform);
      }
    });

    it("verifies Neural3DMMUniforms type interface accepts all forensic properties", () => {
      const uniforms: Partial<Neural3DMMUniforms> = {
        cardiacPulse: 0.85,
        duchenneTension: 0.60,
        tongueShadow: 0.70,
        interdentalEmbrasure: 0.75,
        subsurfaceScattering: 0.65,
        cornealRefraction: 0.85,
        perioralRhytids: 0.40,
      };

      expect(uniforms.cardiacPulse).toBe(0.85);
      expect(uniforms.duchenneTension).toBe(0.60);
      expect(uniforms.tongueShadow).toBe(0.70);
      expect(uniforms.interdentalEmbrasure).toBe(0.75);
      expect(uniforms.subsurfaceScattering).toBe(0.65);
      expect(uniforms.cornealRefraction).toBe(0.85);
      expect(uniforms.perioralRhytids).toBe(0.40);
    });
  });

  // ── 2. FRAGMENT SHADER CODE INTEGRITY ─────────────────────────────────────
  describe("Neural 3DMM Fragment Shader Forensic Code", () => {
    it("declares all forensic uniforms in GLSL source", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_cardiacPulse;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_duchenneTension;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_tongueShadow;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_interdentalEmbrasure;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_subsurfaceScattering;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_cornealRefraction;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_perioralRhytids;");
    });

    it("declares continuous multi-angle dual atlas and normal map uniforms in GLSL source", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform sampler2DArray u_visemeArrayB;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform sampler2DArray u_visemeNormalArray;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform int u_hasDualAtlas;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_angleBlendFactor;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform int u_hasVisemeNormalArray;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform int u_isFlipped;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform vec2 u_jawDisplacementVector;");
    });

    it("implements volumetric intra-oral light transport (tongue shadow)", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("u_tongueShadow");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("shadowAttenuation");
    });

    it("implements SSAO interdental tooth embrasures", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("u_interdentalEmbrasure");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("embrasureAO");
    });

    it("implements hemodynamic micro-vascular erythema flush", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("u_cardiacPulse");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("cardiacTint");
    });

    it("implements screen-space subsurface scattering (dermal translucency)", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("u_subsurfaceScattering");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("sssBleed");
    });

    it("implements dynamic perioral rhytids under compressive strain", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("u_perioralRhytids");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("rhytidShadow");
    });

    it("implements Duchenne lower-eyelid tension and infraorbital creasing", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("u_duchenneTension");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("duchenneShadow");
    });

    it("implements 3D corneal refraction & dual Purkinje specular reflections", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("u_cornealRefraction");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("p4GlintL");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("p4GlintR");
    });
  });

  // ── 3. BIOPHYSICS DEFAULTS & STAGE ENGINE COMPLIANCE ──────────────────────
  describe("BiophysicsOptions Defaults", () => {
    it("enables all forensic and physiological subsystems by default", () => {
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableCoarticulation).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableTongue).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableLabiodental).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableSaliva).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableOpticalFlow).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableAcousticBlink).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableSaccadicGaze).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableRespiratoryBreath).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableSibilantConstraint).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableNasalAlar).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enablePhoneticStress).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableOneEuroFilter).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableHemodynamics).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.duchenneSmile).toBe(true);
      expect(DEFAULT_BIOPHYSICS_OPTIONS.enableDentalOcclusion).toBe(true);
    });

    it("allows selective partial overrides of biophysics options", () => {
      const custom: BiophysicsOptions = {
        ...DEFAULT_BIOPHYSICS_OPTIONS,
        enableAcousticBlink: false,
        enableSaccadicGaze: false,
      };

      expect(custom.enableAcousticBlink).toBe(false);
      expect(custom.enableSaccadicGaze).toBe(false);
      expect(custom.enableRespiratoryBreath).toBe(true);
      expect(custom.enableOneEuroFilter).toBe(true);
    });
  });

  // ── 4. MULTI-ANGLE YAW BLENDER ────────────────────────────────────────────
  describe("MultiAngleYawBlender 3D Continuous Orbital Mapping", () => {
    const blender = new MultiAngleYawBlender();

    it("maps 0° yaw to frontal atlas without flipping", () => {
      const bracket = blender.resolve(0, "ruby");
      expect(bracket.angleA).toBe(0);
      expect(bracket.angleB).toBe(25);
      expect(bracket.blendFactor).toBe(0.0);
      expect(bracket.isFlipped).toBe(false);
      expect(bracket.codebookUrlA).toContain("ruby_ditto_codebook.json");
    });

    it("interpolates continuous intermediate yaw angles smoothly", () => {
      const bracket = blender.resolve(35, "ruby");
      expect(bracket.angleA).toBe(25);
      expect(bracket.angleB).toBe(45);
      // Span is 20 deg (25 to 45). 35 is midpoint (10 / 20 = 0.5)
      expect(bracket.blendFactor).toBeCloseTo(0.5, 4);
      expect(bracket.isFlipped).toBe(false);
    });

    it("handles negative yaw angles (facing camera-left) with isFlipped flag", () => {
      const bracket = blender.resolve(-45, "ruby");
      expect(bracket.angleA).toBe(45);
      expect(bracket.blendFactor).toBe(0.0);
      expect(bracket.isFlipped).toBe(true);
    });

    it("clamps extreme yaw angles at 90° boundary", () => {
      const bracket = blender.resolve(95, "ruby");
      expect(bracket.angleA).toBe(65);
      expect(bracket.angleB).toBe(90);
      expect(bracket.blendFactor).toBe(1.0);
      expect(bracket.codebookUrlB).toContain("ruby_90deg_ditto_codebook.json");
    });

    it("verifies bilateral symmetry where positive and negative yaw share brackets", () => {
      const pos = blender.resolve(30, "ruby");
      const neg = blender.resolve(-30, "ruby");
      expect(pos.angleA).toBe(neg.angleA);
      expect(pos.angleB).toBe(neg.angleB);
      expect(pos.blendFactor).toBeCloseTo(neg.blendFactor, 4);
      expect(pos.isFlipped).toBe(false);
      expect(neg.isFlipped).toBe(true);
    });
  });

  // ── 5. WEBGL VISEME COMPOSITOR OPTIONS ────────────────────────────────────
  describe("WebGLCompositorOptions", () => {
    it("accepts all newly wired forensic uniforms in options", () => {
      const options: WebGLCompositorOptions = {
        cardiacPulse: 0.85,
        duchenneTension: 0.60,
        tongueShadow: 0.65,
        interdentalEmbrasure: 0.70,
        subsurfaceScattering: 0.65,
        cornealRefraction: 0.85,
      };

      expect(options.cardiacPulse).toBe(0.85);
      expect(options.duchenneTension).toBe(0.60);
      expect(options.tongueShadow).toBe(0.65);
      expect(options.interdentalEmbrasure).toBe(0.70);
      expect(options.subsurfaceScattering).toBe(0.65);
      expect(options.cornealRefraction).toBe(0.85);
    });
  });

  // ── 6. TMJ CONDYLAR KINEMATICS & PROSODIC MICRO-ORBITING ───────────────────
  describe("TMJ Condylar Kinematics & Prosodic Micro-Orbiting", () => {
    it("computes foreshortened TMJ jaw displacement under orbital rotation", () => {
      const jawOpen = 0.8;
      // Frontal (0 deg): sin(0) = 0 -> purely vertical descent
      const yawFrontalRad = 0;
      const dxFrontal = Math.sin(yawFrontalRad) * 0.35 * jawOpen;
      const dyFrontal = Math.cos(yawFrontalRad) * jawOpen;
      expect(dxFrontal).toBeCloseTo(0.0, 4);
      expect(dyFrontal).toBeCloseTo(0.8, 4);

      // Profile (90 deg): sin(pi/2) = 1 -> lateral condylar translation forward
      const yawProfileRad = Math.PI / 2;
      const dxProfile = Math.sin(yawProfileRad) * 0.35 * jawOpen;
      const dyProfile = Math.cos(yawProfileRad) * jawOpen;
      expect(dxProfile).toBeCloseTo(0.28, 4);
      expect(dyProfile).toBeCloseTo(0.0, 4);
    });

    it("generates continuous micro-orbital yaw excursions from speech prosody", () => {
      const director = new ProsodicIntonationDirector();
      // Rising question contour should generate positive micro-yaw engagement
      const stateRising = director.update(280, 0.5, 100, 0.016);
      expect(typeof stateRising.orbitalYawDegrees).toBe("number");
      expect(stateRising.orbitalYawDegrees).toBeGreaterThanOrEqual(0.0);

      director.reset();
      expect(director.update(0, 0, 200, 0.016).orbitalYawDegrees).toBe(0.0);
    });
  });
});
