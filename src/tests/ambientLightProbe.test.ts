import { describe, it, expect, vi } from "vitest";
import { AmbientLightProbe } from "../lib/realtime/ambientLightProbe";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/shaders/neural3DMMFragmentShader";
import { NEURAL_3DMM_UNIFORM_NAMES, Neural3DMMShaderRenderer } from "../lib/realtime/neural3DMMShader";

describe("Dynamic Spherical Harmonic Ambient Light Probe (I3)", () => {
  describe("AmbientLightProbe Unit Tests", () => {
    it("should initialize with default neutral studio SH coefficients", () => {
      const probe = new AmbientLightProbe();
      const coeffs = probe.getCoefficients();

      expect(coeffs).toBeDefined();
      expect(coeffs.l0).toEqual([0.98, 0.98, 1.02]);
      expect(coeffs.l1x).toEqual([0.0, 0.0, 0.0]);
      expect(coeffs.l1y).toEqual([0.0, 0.0, 0.0]);
      expect(coeffs.l1z).toEqual([0.15, 0.15, 0.18]);
    });

    it("should safely return current coefficients when source is null or undefined", () => {
      const probe = new AmbientLightProbe();
      const c1 = probe.update(null);
      expect(c1.l0).toEqual([0.98, 0.98, 1.02]);

      const c2 = probe.update(undefined);
      expect(c2.l0).toEqual([0.98, 0.98, 1.02]);
    });

    it("should compute dynamic SH coefficients from a 3x3 pixel canvas context", () => {
      const probe = new AmbientLightProbe();

      // Mock canvas and 2d context for Node / Vitest environment
      const mockImgData = new Uint8ClampedArray(3 * 3 * 4);
      // Fill with warm orange-tinted pixels: R=240, G=140, B=50, A=255
      for (let i = 0; i < 9; i++) {
        mockImgData[i * 4 + 0] = 240;
        mockImgData[i * 4 + 1] = 140;
        mockImgData[i * 4 + 2] = 50;
        mockImgData[i * 4 + 3] = 255;
      }

      const mockCtx = {
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({ data: mockImgData })),
      };

      (probe as any).ctx = mockCtx;

      // Force update to bypass 100ms throttle and EMA lag
      const updated = probe.update({} as any, true);

      expect(mockCtx.drawImage).toHaveBeenCalled();
      expect(mockCtx.getImageData).toHaveBeenCalledWith(0, 0, 3, 3);

      // Warm tone: Red channel should dominate over Blue in L0
      expect(updated.l0[0]).toBeGreaterThan(updated.l0[1]);
      expect(updated.l0[1]).toBeGreaterThan(updated.l0[2]);
    });

    it("should smooth coefficients over consecutive frames using EMA when not forced", () => {
      const probe = new AmbientLightProbe();

      const blueImgData = new Uint8ClampedArray(3 * 3 * 4);
      // Bright Blue pixels
      for (let i = 0; i < 9; i++) {
        blueImgData[i * 4 + 0] = 10;
        blueImgData[i * 4 + 1] = 20;
        blueImgData[i * 4 + 2] = 250;
        blueImgData[i * 4 + 3] = 255;
      }

      const mockCtx = {
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({ data: blueImgData })),
      };

      (probe as any).ctx = mockCtx;

      // Step 1: Force reset to initial state
      const initial = probe.getCoefficients();
      const initialBlue = initial.l0[2];

      // Step 2: Unforced update (EMA alpha = 0.18)
      (probe as any).lastUpdateTime = 0;
      const step1 = probe.update({} as any, false);

      // Step 1 blue should be higher than initial neutral, but smoothed (not instantly jumping to 100%)
      expect(step1.l0[2]).not.toBe(initialBlue);

      // Step 3: Advance time and update again
      (probe as any).lastUpdateTime = 0;
      const step2 = probe.update({} as any, false);
      expect(step2.l0[2]).toBeGreaterThanOrEqual(step1.l0[2]);
    });
  });

  describe("Shader & Uniform Declarations", () => {
    it("should declare Spherical Harmonic uniforms in neural3DMMFragmentShader", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform vec3 u_shL0;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform vec3 u_shL1x;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform vec3 u_shL1y;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform vec3 u_shL1z;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform int u_hasSHProbe;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("u_shL0 + nx * u_shL1x + ny * u_shL1y + nz * u_shL1z");
    });

    it("should list all SH probe uniforms in NEURAL_3DMM_UNIFORM_NAMES", () => {
      expect(NEURAL_3DMM_UNIFORM_NAMES).toContain("u_shL0");
      expect(NEURAL_3DMM_UNIFORM_NAMES).toContain("u_shL1x");
      expect(NEURAL_3DMM_UNIFORM_NAMES).toContain("u_shL1y");
      expect(NEURAL_3DMM_UNIFORM_NAMES).toContain("u_shL1z");
      expect(NEURAL_3DMM_UNIFORM_NAMES).toContain("u_hasSHProbe");
    });

    it("should upload SH uniforms in Neural3DMMShaderRenderer.render()", () => {
      const uniformCalls: Record<string, any> = {};
      const mockProgram = {} as WebGLProgram;
      const mockShader = {} as WebGLShader;
      const mockVao = {} as WebGLVertexArrayObject;
      const mockBuffer = {} as WebGLBuffer;

      const glMock = {
        VERTEX_SHADER: 35633,
        FRAGMENT_SHADER: 35632,
        LINK_STATUS: 35714,
        COMPILE_STATUS: 35713,
        ARRAY_BUFFER: 34962,
        STATIC_DRAW: 35044,
        FLOAT: 5126,
        TRIANGLES: 4,
        TEXTURE_2D: 3553,
        TEXTURE0: 33984,
        createShader: () => mockShader,
        shaderSource: () => {},
        compileShader: () => {},
        getShaderParameter: () => true,
        createProgram: () => mockProgram,
        attachShader: () => {},
        linkProgram: () => {},
        getProgramParameter: () => true,
        getUniformLocation: (_prog: any, name: string) => {
          return { name };
        },
        createVertexArray: () => mockVao,
        bindVertexArray: () => {},
        createBuffer: () => mockBuffer,
        bindBuffer: () => {},
        bufferData: () => {},
        getAttribLocation: () => 0,
        enableVertexAttribArray: () => {},
        vertexAttribPointer: () => {},
        useProgram: () => {},
        activeTexture: () => {},
        bindTexture: () => {},
        uniform1i: (loc: any, val: number) => {
          if (loc?.name) uniformCalls[loc.name] = val;
        },
        uniform1f: (loc: any, val: number) => {
          if (loc?.name) uniformCalls[loc.name] = val;
        },
        uniform2f: (loc: any, x: number, y: number) => {
          if (loc?.name) uniformCalls[loc.name] = [x, y];
        },
        uniform3f: (loc: any, x: number, y: number, z: number) => {
          if (loc?.name) uniformCalls[loc.name] = [x, y, z];
        },
        drawArrays: () => {},
      } as unknown as WebGL2RenderingContext;

      const renderer = new Neural3DMMShaderRenderer(glMock);

      renderer.render({
        videoTexture: null,
        hasBgTexture: true,
        enableChromaKey: true,
        transparentMode: false,
        chromaKeyColor: [0, 1, 0],
        chromaSimilarity: 0.4,
        chromaSmoothness: 0.1,
        despillStrength: 0.8,
        bgAspectRatio: 1.777,
        lightingTone: 1,
        shL0: [1.1, 1.0, 0.9],
        shL1x: [0.2, 0.1, 0.0],
        shL1y: [0.0, 0.3, 0.1],
        shL1z: [0.1, 0.1, 0.2],
        hasSHProbe: true,
        mouthCenter: [0.5, 0.5],
        mouthRadius: [0.1, 0.05],
        mouthAngle: 0,
        jawOpen: 0,
        lipWidth: 0,
        lipPucker: 0,
        lipCompression: 0,
        smileExpression: 0,
        asymmetry: 0,
        upperLipLift: 0,
        lowerLipDepress: 0,
        headCenter: [0.5, 0.5],
        headRadius: [0.2, 0.3],
        headPitch: 0,
        headYaw: 0,
        headRoll: 0,
        headLeanZ: 0,
        headShiftX: 0,
        headShiftY: 0,
        blinkLeft: 0,
        blinkRight: 0,
        gazeX: 0,
        gazeY: 0,
        eyeWidening: 1,
        eyebrowRaise: 0,
        eyebrowFurrow: 0,
        leftEyeCenter: [0.45, 0.45],
        rightEyeCenter: [0.55, 0.45],
        shoulderCenter: [0.5, 0.8],
        shoulderRadius: [0.3, 0.2],
        shoulderBreath: 0,
        shoulderSway: 0,
        chestExpansion: 0,
        shoulderShrug: 0,
        neckFlex: 0,
        aspectRatio: 1.0,
        debugCrosshair: false,
      });

      expect(uniformCalls["u_hasSHProbe"]).toBe(1);
      expect(uniformCalls["u_shL0"]).toEqual([1.1, 1.0, 0.9]);
      expect(uniformCalls["u_shL1x"]).toEqual([0.2, 0.1, 0.0]);
      expect(uniformCalls["u_shL1y"]).toEqual([0.0, 0.3, 0.1]);
      expect(uniformCalls["u_shL1z"]).toEqual([0.1, 0.1, 0.2]);
    });
  });
});
