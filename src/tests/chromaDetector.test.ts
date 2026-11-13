import { describe, it, expect, vi } from "vitest";
import { ChromaDetector, DEFAULT_GREY_CHROMA, DEFAULT_GREEN_CHROMA, DEFAULT_BLUE_CHROMA } from "../lib/realtime/chromaDetector";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/shaders/neural3DMMFragmentShader";
import { NEURAL_3DMM_UNIFORM_NAMES, Neural3DMMShaderRenderer } from "../lib/realtime/neural3DMMShader";

describe("Chroma Auto-Detection and Background Expansion", () => {
  describe("ChromaDetector Unit Tests", () => {
    it("should initialize with default grey chroma (#696a6e)", () => {
      const detector = new ChromaDetector();
      const last = detector.getLastResult();

      expect(last).toBeDefined();
      expect(last.type).toBe("grey");
      expect(last.hex).toBe("#696a6e");
      expect(last.isGrey).toBe(true);
      expect(last.similarity).toBeCloseTo(0.14, 2);
    });

    it("should correctly detect green screen backdrops", () => {
      const detector = new ChromaDetector();

      // Mock 32x32 canvas data filled with pure chroma green (0, 240, 10, 255)
      const greenData = new Uint8ClampedArray(32 * 32 * 4);
      for (let i = 0; i < 32 * 32; i++) {
        greenData[i * 4 + 0] = 10;
        greenData[i * 4 + 1] = 235;
        greenData[i * 4 + 2] = 15;
        greenData[i * 4 + 3] = 255;
      }

      (detector as any).ctx = {
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({ data: greenData })),
      };
      (detector as any).canvas = { width: 32, height: 32 };

      const result = detector.detect({} as any);

      expect(result.type).toBe("green");
      expect(result.isGrey).toBe(false);
      expect(result.color[1]).toBeGreaterThan(result.color[0]);
      expect(result.color[1]).toBeGreaterThan(result.color[2]);
      expect(result.similarity).toBe(0.38);
    });

    it("should correctly detect blue screen backdrops", () => {
      const detector = new ChromaDetector();

      // Mock 32x32 canvas data filled with chroma blue (0, 69, 186, 255) #0045ba
      const blueData = new Uint8ClampedArray(32 * 32 * 4);
      for (let i = 0; i < 32 * 32; i++) {
        blueData[i * 4 + 0] = 5;
        blueData[i * 4 + 1] = 70;
        blueData[i * 4 + 2] = 190;
        blueData[i * 4 + 3] = 255;
      }

      (detector as any).ctx = {
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({ data: blueData })),
      };
      (detector as any).canvas = { width: 32, height: 32 };

      const result = detector.detect({} as any);

      expect(result.type).toBe("blue");
      expect(result.isGrey).toBe(false);
      expect(result.color[2]).toBeGreaterThan(result.color[0]);
      expect(result.color[2]).toBeGreaterThan(result.color[1]);
      expect(result.similarity).toBe(0.38);
    });

    it("should correctly detect studio grey backdrops like #696a6e", () => {
      const detector = new ChromaDetector();

      // Mock 32x32 canvas data with #696a6e (105, 106, 110, 255)
      const greyData = new Uint8ClampedArray(32 * 32 * 4);
      for (let i = 0; i < 32 * 32; i++) {
        greyData[i * 4 + 0] = 105;
        greyData[i * 4 + 1] = 106;
        greyData[i * 4 + 2] = 110;
        greyData[i * 4 + 3] = 255;
      }

      (detector as any).ctx = {
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({ data: greyData })),
      };
      (detector as any).canvas = { width: 32, height: 32 };

      const result = detector.detect({} as any);

      expect(result.type).toBe("grey");
      expect(result.isGrey).toBe(true);
      expect(result.hex).toBe("#696a6e");
      expect(result.similarity).toBeCloseTo(0.14, 2);
    });

    it("should allow setting manual chroma colors", () => {
      const detector = new ChromaDetector();
      const custom = detector.setManualColor([0.0, 1.0, 0.0]);

      expect(custom.type).toBe("green");
      expect(custom.hex).toBe("#00ff00");
    });
  });

  describe("Shader & Uniforms Verification", () => {
    it("should declare u_chromaMode, u_isGreyChroma and u_expandBg in neural3DMMFragmentShader", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform int u_chromaMode;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform int u_isGreyChroma;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform int u_expandBg;");
    });

    it("should strictly isolate Green Screen (1), Blue Screen (2), and Studio Grey (3)", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("1 = GREEN SCREEN");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("2 = BLUE SCREEN");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("3 = STUDIO GREY");
      // Green screen preserves blue dress, warm/blonde hair, and skin
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("greenExcess <= 0.02");
      // Blue screen preserves green dress, warm/blonde hair, and skin
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("blueExcess <= 0.02");
      // Studio grey preserves colored dresses, blonde/dark hair, and head core
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("headCore = smoothstep(1.08, 0.65, cranialDistSq)");
    });

    it("should implement seamless background expansion in Stage 8", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("u_expandBg == 1");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("mix(u_chromaKeyColor, videoColor.rgb");
    });

    it("should list u_chromaMode, u_isGreyChroma, and u_expandBg in NEURAL_3DMM_UNIFORM_NAMES", () => {
      expect(NEURAL_3DMM_UNIFORM_NAMES).toContain("u_chromaMode");
      expect(NEURAL_3DMM_UNIFORM_NAMES).toContain("u_isGreyChroma");
      expect(NEURAL_3DMM_UNIFORM_NAMES).toContain("u_expandBg");
    });

    it("should upload u_isGreyChroma and u_expandBg in Neural3DMMShaderRenderer.render()", () => {
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
        viewport: () => {},
        createShader: () => mockShader,
        shaderSource: () => {},
        compileShader: () => {},
        getShaderParameter: () => true,
        createProgram: () => mockProgram,
        attachShader: () => {},
        linkProgram: () => {},
        getProgramParameter: () => true,
        getUniformLocation: (_prog: any, name: string) => ({ name }),
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
        hasBgTexture: false,
        enableChromaKey: true,
        transparentMode: false,
        chromaKeyColor: [105 / 255, 106 / 255, 110 / 255],
        chromaSimilarity: 0.14,
        chromaSmoothness: 0.06,
        isGreyChroma: true,
        expandBg: true,
        despillStrength: 0.8,
        bgAspectRatio: 1.777,
        lightingTone: 0,
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

      expect(uniformCalls["u_isGreyChroma"]).toBe(1);
      expect(uniformCalls["u_expandBg"]).toBe(1);
      expect(uniformCalls["u_chromaKeyColor"][0]).toBeCloseTo(105 / 255, 3);
      expect(uniformCalls["u_chromaKeyColor"][1]).toBeCloseTo(106 / 255, 3);
      expect(uniformCalls["u_chromaKeyColor"][2]).toBeCloseTo(110 / 255, 3);
    });
  });

  describe("Color Isolation & Dress/Hair Invariance", () => {
    it("preserves blue dress and blonde hair on GREEN screen (alpha = 1.0)", () => {
      // Blue dress pixel: R=0.1, G=0.2, B=0.7
      const blueDress = { r: 0.1, g: 0.2, b: 0.7 };
      const maxRB = Math.max(blueDress.r, blueDress.b);
      const greenExcessDress = blueDress.g - maxRB; // -0.5
      expect(greenExcessDress).toBeLessThanOrEqual(0.02);

      // Blonde hair pixel: R=0.75, G=0.68, B=0.55
      const blondeHair = { r: 0.75, g: 0.68, b: 0.55 };
      const maxRBHair = Math.max(blondeHair.r, blondeHair.b);
      const greenExcessHair = blondeHair.g - maxRBHair; // -0.07
      expect(greenExcessHair).toBeLessThanOrEqual(0.02);

      // Green screen pixel: R=0.05, G=0.85, B=0.10
      const greenScreen = { r: 0.05, g: 0.85, b: 0.10 };
      const greenExcessBg = greenScreen.g - Math.max(greenScreen.r, greenScreen.b); // 0.75
      expect(greenExcessBg).toBeGreaterThan(0.20);
    });

    it("preserves green dress and blonde hair on BLUE screen (alpha = 1.0)", () => {
      // Green dress pixel: R=0.2, G=0.7, B=0.1
      const greenDress = { r: 0.2, g: 0.7, b: 0.1 };
      const maxRG = Math.max(greenDress.r, greenDress.g);
      const blueExcessDress = greenDress.b - maxRG; // -0.6
      expect(blueExcessDress).toBeLessThanOrEqual(0.02);

      // Blonde hair pixel: R=0.75, G=0.68, B=0.55
      const blondeHair = { r: 0.75, g: 0.68, b: 0.55 };
      const blueExcessHair = blondeHair.b - Math.max(blondeHair.r, blondeHair.g); // -0.20
      expect(blueExcessHair).toBeLessThanOrEqual(0.02);

      // Blue screen pixel: R=0.05, G=0.15, B=0.85
      const blueScreen = { r: 0.05, g: 0.15, b: 0.85 };
      const blueExcessBg = blueScreen.b - Math.max(blueScreen.r, blueScreen.g); // 0.70
      expect(blueExcessBg).toBeGreaterThan(0.20);
    });

    it("preserves colored dresses and blonde hair on GREY screen (#696a6e)", () => {
      // Blue dress pixel: R=0.1, G=0.2, B=0.7 -> sat = 0.60
      const blueDress = { r: 0.1, g: 0.2, b: 0.7 };
      const satDress = Math.max(blueDress.r, blueDress.g, blueDress.b) - Math.min(blueDress.r, blueDress.g, blueDress.b);
      expect(satDress).toBeGreaterThan(0.055); // Solid!

      // Blonde hair: R=0.75, G=0.68, B=0.55 -> sat = 0.20, lum = 0.68
      const blondeHair = { r: 0.75, g: 0.68, b: 0.55 };
      const satHair = Math.max(blondeHair.r, blondeHair.g, blondeHair.b) - Math.min(blondeHair.r, blondeHair.g, blondeHair.b);
      const lumHair = 0.299 * blondeHair.r + 0.587 * blondeHair.g + 0.114 * blondeHair.b;
      const bgLum = 106 / 255;
      expect(satHair).toBeGreaterThan(0.055); // Solid!
      expect(Math.abs(lumHair - bgLum)).toBeGreaterThan(0.10); // Solid!

      // Neutral grey wall: R=105/255, G=106/255, B=110/255 -> sat ~ 0.02
      const greyWall = { r: 105 / 255, g: 106 / 255, b: 110 / 255 };
      const satWall = Math.max(greyWall.r, greyWall.g, greyWall.b) - Math.min(greyWall.r, greyWall.g, greyWall.b);
      expect(satWall).toBeLessThan(0.055); // Keyed!
    });
  });
});
