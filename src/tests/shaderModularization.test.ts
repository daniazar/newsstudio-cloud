import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_VERTEX_SHADER as VS_MODULAR } from "../lib/realtime/shaders/neural3DMMVertexShader";
import { NEURAL_3DMM_FRAGMENT_SHADER as FS_MODULAR } from "../lib/realtime/shaders/neural3DMMFragmentShader";
import {
  NEURAL_3DMM_VERTEX_SHADER as VS_BARREL,
  NEURAL_3DMM_FRAGMENT_SHADER as FS_BARREL
} from "../lib/realtime/shaders";
import {
  NEURAL_3DMM_VERTEX_SHADER as VS_REEXPORT,
  NEURAL_3DMM_FRAGMENT_SHADER as FS_REEXPORT,
  Neural3DMMShaderRenderer
} from "../lib/realtime/neural3DMMShader";

describe("Shader Modularization & File Separation", () => {
  describe("Dedicated Vertex Shader File (neural3DMMVertexShader.ts)", () => {
    it("should export a valid WebGL 2.0 vertex shader string", () => {
      expect(VS_MODULAR).toBeDefined();
      expect(typeof VS_MODULAR).toBe("string");
      expect(VS_MODULAR).toContain("#version 300 es");
      expect(VS_MODULAR).toContain("in vec2 a_position;");
      expect(VS_MODULAR).toContain("in vec2 a_texCoord;");
      expect(VS_MODULAR).toContain("uniform float u_camZoom;");
      expect(VS_MODULAR).toContain("uniform vec2 u_camPan;");
      expect(VS_MODULAR).toContain("void main()");
    });

    it("should match barrel export and neural3DMMShader re-export identically", () => {
      expect(VS_MODULAR).toBe(VS_BARREL);
      expect(VS_MODULAR).toBe(VS_REEXPORT);
    });
  });

  describe("Dedicated Fragment Shader File (neural3DMMFragmentShader.ts)", () => {
    it("should export a valid WebGL 2.0 fragment shader string", () => {
      expect(FS_MODULAR).toBeDefined();
      expect(typeof FS_MODULAR).toBe("string");
      expect(FS_MODULAR).toContain("#version 300 es");
      expect(FS_MODULAR).toContain("precision highp float;");
      expect(FS_MODULAR).toContain("in vec2 v_texCoord;");
      expect(FS_MODULAR).toContain("out vec4 fragColor;");
      expect(FS_MODULAR).toContain("uniform int u_enableTPS;");
      expect(FS_MODULAR).toContain("uniform int u_enableFabricDynamics;");
      expect(FS_MODULAR).toContain("evaluateTPSBiHarmonicCage");
      expect(FS_MODULAR).toContain("void main()");
    });

    it("should match barrel export and neural3DMMShader re-export identically", () => {
      expect(FS_MODULAR).toBe(FS_BARREL);
      expect(FS_MODULAR).toBe(FS_REEXPORT);
    });
  });

  describe("Neural3DMMShaderRenderer Architecture", () => {
    it("should construct Neural3DMMShaderRenderer without errors using modularized shaders", () => {
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
        getUniformLocation: (_prog: any, name: string) => ({ name }),
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
});
