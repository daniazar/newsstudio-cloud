/**
 * src/tests/sprint19MouthMeniscus.test.ts
 *
 * Dedicated unit test suite for Sprint 19:
 * - 5B: Wet Inner Lip Parting Meniscus Strip (GLSL shader & viseme pass)
 * - P4: Nose Sneer Nasal Bridge Diagonal Wrinkle Creases
 * - P5: Mentalis Chin Pebbling Micro-Texture ("Orange-Peel" dimple)
 * - LiveAnchorStageEngine Sentiment Delay Buffer & Uniform Propagation
 */

import { describe, it, expect, vi } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/shaders/neural3DMMFragmentShader";
import { VISEME_FS } from "../lib/realtime/shaders/visemePass";
import {
  Neural3DMMShaderRenderer,
  Neural3DMMUniforms,
} from "../lib/realtime/neural3DMMShader";

describe("Sprint 19: Micro-Anatomical WebGL Mouth Physics & Creases", () => {
  describe("5B: Wet Inner Lip Parting Meniscus Strip", () => {
    it("should declare 5B meniscus strip in NEURAL_3DMM_FRAGMENT_SHADER", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("5B: WET INNER LIP PARTING MENISCUS STRIP");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("u_jawOpen > 0.008 && u_jawOpen < 0.16");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("upperMeniscus");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("lowerMeniscus");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec3(1.00, 0.97, 0.94)"); // Warm liquid tint
    });

    it("should declare 5B meniscus strip in VISEME_FS for WebGL fallback parity", () => {
      expect(VISEME_FS).toContain("5B: WET INNER LIP PARTING MENISCUS STRIP");
      expect(VISEME_FS).toContain("u_jawOpen > 0.008 && u_jawOpen < 0.16");
      expect(VISEME_FS).toContain("upperMeniscus");
      expect(VISEME_FS).toContain("lowerMeniscus");
      expect(VISEME_FS).toContain("vec3(1.00, 0.97, 0.94)");
    });

    it("should modulate 5B meniscus intensity by u_lipMoisture in NEURAL_3DMM_FRAGMENT_SHADER", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("clamp(u_lipMoisture, 0.40, 1.0)");
    });
  });

  describe("P4: Nose Sneer Nasal Bridge Wrinkle Bands", () => {
    it("should declare P4 nasal bridge creases in NEURAL_3DMM_FRAGMENT_SHADER", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("P4: NOSE SNEER NASAL BRIDGE WRINKLE BANDS");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("u_noseSneer > 0.05");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("sneerMask");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("sneerNorm");
    });
  });

  describe("P5: Mentalis Chin Pebbling Micro-Texture", () => {
    it("should declare P5 chin pebbling in NEURAL_3DMM_FRAGMENT_SHADER", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("P5: MENTALIS CHIN PEBBLING MICRO-TEXTURE");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("u_chinRaise > 0.05");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("chinBossZone");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("pebbling");
    });
  });

  describe("Renderer Uniform Pipeline & Sentiment Propagation", () => {
    function createMockGl(): WebGL2RenderingContext {
      let programCount = 0;
      let shaderCount = 0;
      return {
        VERTEX_SHADER: 35633,
        FRAGMENT_SHADER: 35632,
        ARRAY_BUFFER: 34962,
        STATIC_DRAW: 35044,
        FLOAT: 5126,
        TRIANGLES: 4,
        TEXTURE0: 33984,
        TEXTURE1: 33985,
        TEXTURE2: 33986,
        TEXTURE3: 33987,
        TEXTURE_2D: 3553,
        LINK_STATUS: 35714,
        COMPILE_STATUS: 35713,
        createShader: vi.fn(() => ({ id: ++shaderCount })),
        shaderSource: vi.fn(),
        compileShader: vi.fn(),
        getShaderParameter: vi.fn().mockReturnValue(true),
        getShaderInfoLog: vi.fn().mockReturnValue(""),
        deleteShader: vi.fn(),
        createProgram: vi.fn(() => ({ id: ++programCount })),
        attachShader: vi.fn(),
        linkProgram: vi.fn(),
        getProgramParameter: vi.fn().mockReturnValue(true),
        getProgramInfoLog: vi.fn().mockReturnValue(""),
        deleteProgram: vi.fn(),
        useProgram: vi.fn(),
        getUniformLocation: vi.fn((prog: any, name: string) => ({ name, progId: prog.id })),
        createVertexArray: vi.fn().mockReturnValue({ id: "vao-1" }),
        bindVertexArray: vi.fn(),
        deleteVertexArray: vi.fn(),
        createBuffer: vi.fn().mockReturnValue({ id: "vbo-1" }),
        bindBuffer: vi.fn(),
        bufferData: vi.fn(),
        getAttribLocation: vi.fn().mockReturnValue(0),
        enableVertexAttribArray: vi.fn(),
        vertexAttribPointer: vi.fn(),
        activeTexture: vi.fn(),
        bindTexture: vi.fn(),
        drawArrays: vi.fn(),
        uniform1f: vi.fn(),
        uniform1i: vi.fn(),
        uniform2f: vi.fn(),
        uniform3f: vi.fn(),
      } as unknown as WebGL2RenderingContext;
    }

    it("should upload u_noseSneer and u_chinRaise uniforms in Neural3DMMShaderRenderer", () => {
      const gl = createMockGl();
      const renderer = new Neural3DMMShaderRenderer(gl);

      const uniforms: Neural3DMMUniforms = {
        videoTexture: {} as WebGLTexture,
        hasBgTexture: false,
        enableChromaKey: false,
        transparentMode: false,
        chromaKeyColor: [0.0, 0.95, 0.0],
        chromaSimilarity: 0.38,
        chromaSmoothness: 0.08,
        despillStrength: 0.85,
        bgAspectRatio: 16 / 9,
        lightingTone: 0,
        mouthCenter: [0.5, 0.638],
        mouthRadius: [0.070, 0.026],
        mouthAngle: 0.0,
        jawOpen: 0.04, // In 5B meniscus window
        lipWidth: 0.0,
        lipPucker: 0.0,
        lipCompression: 0.0,
        smileExpression: 0.0,
        asymmetry: 0.0,
        upperLipLift: 0.0,
        lowerLipDepress: 0.0,
        cheekPuff: 0.0,
        noseSneer: 0.35, // P4 active
        chinRaise: 0.40, // P5 active
        headCenter: [0.5, 0.45],
        headRadius: [0.25, 0.32],
        headPitch: 0.0,
        headYaw: 0.0,
        headRoll: 0.0,
        headLeanZ: 0.0,
        headShiftX: 0.0,
        headShiftY: 0.0,
        blinkLeft: 0.0,
        blinkRight: 0.0,
        gazeX: 0.0,
        gazeY: 0.0,
        eyeWidening: 1.0,
        eyebrowRaise: 0.0,
        eyebrowFurrow: 0.0,
        leftEyeCenter: [0.435, 0.428],
        rightEyeCenter: [0.565, 0.428],
        shoulderCenter: [0.5, 0.75],
        shoulderRadius: [0.35, 0.28],
        shoulderBreath: 0.0,
        shoulderSway: 0.0,
        chestExpansion: 0.0,
        shoulderShrug: 0.0,
        neckFlex: 0.0,
        aspectRatio: 544 / 960,
        debugCrosshair: false,
      };

      renderer.render(uniforms);

      // Verify that gl.uniform1f was called for u_noseSneer and u_chinRaise
      const uniformCalls = vi.mocked(gl.uniform1f).mock.calls;
      expect(uniformCalls.some(call => call[1] === 0.35)).toBe(true);
      expect(uniformCalls.some(call => call[1] === 0.40)).toBe(true);
    });
  });
});
