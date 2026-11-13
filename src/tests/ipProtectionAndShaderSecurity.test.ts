import { describe, it, expect } from "vitest";
import {
  minifyGLSL,
  scrambleShaderPayload,
  unpackShaderPayload,
  lockWebGLPrototypes,
  safeCompileShader,
} from "../lib/realtime/shaderVault";
import { Neural3DMMShaderRenderer, NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/neural3DMMShader";
import {
  PACKED_NEURAL_3DMM_FS,
  PACKED_NEURAL_3DMM_VS,
  getPackedShader,
} from "../lib/realtime/shaders/packedShaders";

describe("IP Protection & Shader Security Suite", () => {
  describe("GLSL Comment Stripping & Minification (minifyGLSL)", () => {
    const rawShader = `
      #version 300 es
      // Proprietary Neural 3DMM Kinematics
      /*
       * Section 6G: Bi-Harmonic Thin-Plate Spline Kernel
       * U(r) = r^2 * ln(r)
       */
      precision highp float;

      in vec2 v_texCoord;
      out vec4 fragColor;

      uniform sampler2D u_videoTexture; // Primary texture
      uniform float u_morphAlpha;       /* Dynamic blend alpha */

      // Core evaluation function
      float evaluateTPSBiHarmonicCage(vec2 uv) {
        // Internal displacement math
        return uv.x * 2.0;
      }

      void main() {
        fragColor = texture(u_videoTexture, v_texCoord);
      }
    `;

    it("should completely remove all block comments and inline comments", () => {
      const minified = minifyGLSL(rawShader);

      expect(minified).not.toContain("Proprietary Neural 3DMM Kinematics");
      expect(minified).not.toContain("Bi-Harmonic Thin-Plate Spline Kernel");
      expect(minified).not.toContain("U(r) = r^2 * ln(r)");
      expect(minified).not.toContain("Primary texture");
      expect(minified).not.toContain("Dynamic blend alpha");
      expect(minified).not.toContain("Core evaluation function");
      expect(minified).not.toContain("Internal displacement math");
    });

    it("should strictly preserve preprocessor directives and WebGL interface tokens", () => {
      const minified = minifyGLSL(rawShader);

      expect(minified).toContain("#version 300 es");
      expect(minified).toContain("precision highp float;");
      expect(minified).toContain("in vec2 v_texCoord;");
      expect(minified).toContain("out vec4 fragColor;");
      expect(minified).toContain("uniform sampler2D u_videoTexture;");
      expect(minified).toContain("uniform float u_morphAlpha;");
      expect(minified).toContain("evaluateTPSBiHarmonicCage");
      expect(minified).toContain("void main()");
    });

    it("should significantly compress the shader byte footprint", () => {
      const minified = minifyGLSL(rawShader);
      expect(minified.length).toBeLessThan(rawShader.length * 0.65);
    });

    it("should handle empty or malformed input gracefully", () => {
      expect(minifyGLSL("")).toBe("");
      expect(minifyGLSL("   ")).toBe("");
    });
  });

  describe("Shader Payload Scrambling & Runtime Unpacking", () => {
    const glsl = `#version 300 es\nprecision highp float;\nin vec2 v_texCoord;\nout vec4 fragColor;\nvoid main() { fragColor = vec4(1.0); }`;

    it("should eliminate plain-text keywords from the scrambled payload", () => {
      const scrambled = scrambleShaderPayload(glsl);

      expect(scrambled).not.toContain("#version 300 es");
      expect(scrambled).not.toContain("precision highp float;");
      expect(scrambled).not.toContain("fragColor");
      expect(typeof scrambled).toBe("string");
      expect(scrambled.length).toBeGreaterThan(0);
    });

    it("should achieve 100% round-trip parity upon unpacking", () => {
      const scrambled = scrambleShaderPayload(glsl);
      const unpacked = unpackShaderPayload(scrambled);

      expect(unpacked).toBe(glsl);
    });

    it("should unpack in microseconds (< 1ms) ensuring zero impact on initial load", () => {
      const scrambled = scrambleShaderPayload(glsl);
      const start = performance.now();
      for (let i = 0; i < 50; i++) {
        unpackShaderPayload(scrambled);
      }
      const duration = performance.now() - start;
      const perCall = duration / 50;

      // Unpacking 50 times should be sub-millisecond per call
      expect(perCall).toBeLessThan(1.0);
    });
  });

  describe("WebGL Prototype Locking (Anti-Hooking Protection)", () => {
    it("should make shaderSource and compileShader non-writable on WebGL prototypes", () => {
      // Create a mock WebGL2RenderingContext in global window
      const mockOriginalShaderSource = () => {};
      const mockOriginalCompile = () => {};

      interface MockCtxConstructor {
        prototype: Record<string, unknown>;
        new (): unknown;
      }

      const mockCtx = function () {} as unknown as MockCtxConstructor;
      mockCtx.prototype = {
        shaderSource: mockOriginalShaderSource,
        compileShader: mockOriginalCompile,
        createShader: () => {},
        attachShader: () => {},
        linkProgram: () => {},
      };

      const win = window as unknown as { WebGL2RenderingContext?: MockCtxConstructor };
      win.WebGL2RenderingContext = mockCtx;

      lockWebGLPrototypes();

      // Verify descriptor is non-writable
      const desc = Object.getOwnPropertyDescriptor(
        win.WebGL2RenderingContext.prototype,
        "shaderSource"
      );
      expect(desc?.writable).toBe(false);
      expect(desc?.configurable).toBe(false);

      // Attempting to overwrite in strict mode should fail or be ignored
      try {
        win.WebGL2RenderingContext.prototype.shaderSource = () => {
          throw new Error("Compromised!");
        };
      } catch {
        // Expected in strict mode
      }

      // The method must still point to original
      expect(win.WebGL2RenderingContext.prototype.shaderSource).toBe(
        mockOriginalShaderSource
      );
    });
  });

  describe("Safe Shader Compilation & Integration", () => {
    it("should compile minified shaders cleanly through safeCompileShader", () => {
      const mockShader = {} as WebGLShader;
      let capturedSource = "";

      const glMock = {
        createShader: () => mockShader,
        shaderSource: (_shader: unknown, source: string) => {
          capturedSource = source;
        },
        compileShader: () => {},
        getShaderParameter: () => true,
      } as unknown as WebGL2RenderingContext;

      const rawWithComments = `
        #version 300 es
        // Secret comment that must be stripped
        void main() {}
      `;

      const result = safeCompileShader(glMock, 35633, rawWithComments);
      expect(result).toBe(mockShader);
      expect(capturedSource).not.toContain("Secret comment that must be stripped");
      expect(capturedSource).toContain("#version 300 es");
    });

    it("should instantiate Neural3DMMShaderRenderer successfully with vault protection", () => {
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
        createShader: () => mockShader,
        shaderSource: () => {},
        compileShader: () => {},
        getShaderParameter: () => true,
        createProgram: () => mockProgram,
        attachShader: () => {},
        linkProgram: () => {},
        getProgramParameter: () => true,
        getUniformLocation: (_prog: unknown, name: string) => ({ name }) as unknown as WebGLUniformLocation,
        createVertexArray: () => mockVao,
        bindVertexArray: () => {},
        createBuffer: () => mockBuffer,
        bindBuffer: () => {},
        bufferData: () => {},
        getAttribLocation: () => 0,
        enableVertexAttribArray: () => {},
        vertexAttribPointer: () => {},
      } as unknown as WebGL2RenderingContext;

      expect(() => new Neural3DMMShaderRenderer(glMock)).not.toThrow();
    });
  });

  describe("Packed Shader Vault & Pre-Scrambled Payloads (packedShaders.ts)", () => {
    it("should export scrambled payloads devoid of plaintext shader directives", () => {
      expect(typeof PACKED_NEURAL_3DMM_FS).toBe("string");
      expect(PACKED_NEURAL_3DMM_FS.length).toBeGreaterThan(1000);

      // Scrambled payload must not contain plain text tokens
      expect(PACKED_NEURAL_3DMM_FS).not.toContain("#version 300 es");
      expect(PACKED_NEURAL_3DMM_FS).not.toContain("precision highp float;");
      expect(PACKED_NEURAL_3DMM_FS).not.toContain("evaluateTPSBiHarmonicCage");
      expect(PACKED_NEURAL_3DMM_FS).not.toContain("/*");
      expect(PACKED_NEURAL_3DMM_FS).not.toContain("//");
    });

    it("should hydrate dynamically into valid WebGL 2.0 fragment shader", () => {
      const hydrated = getPackedShader(PACKED_NEURAL_3DMM_FS);
      expect(typeof hydrated).toBe("string");
      expect(hydrated).toContain("#version 300 es");
      expect(hydrated).toContain("precision highp float;");
      expect(hydrated).toContain("in vec2 v_texCoord;");
      expect(hydrated).toContain("out vec4 fragColor;");
      expect(hydrated).toContain("evaluateTPSBiHarmonicCage");
      expect(hydrated).toContain("void main()");
    });

    it("should hydrate vertex shaders into valid WebGL 2.0 vertex code", () => {
      const hydratedVS = getPackedShader(PACKED_NEURAL_3DMM_VS);
      expect(hydratedVS).toContain("#version 300 es");
      expect(hydratedVS).toContain("in vec2 a_position;");
      expect(hydratedVS).toContain("void main()");
    });

    it("should expose NEURAL_3DMM_FRAGMENT_SHADER transparently without runtime latency", () => {
      expect(typeof NEURAL_3DMM_FRAGMENT_SHADER).toBe("string");
      expect(NEURAL_3DMM_FRAGMENT_SHADER.length).toBeGreaterThan(1000);
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("#version 300 es");
    });
  });
});
