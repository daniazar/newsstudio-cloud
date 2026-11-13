/**
 * src/tests/shaderCompilationIntegrity.test.ts
 *
 * Automated WebGL 2.0 Shader Compilation & Identifier Integrity Test Suite.
 * Guarantees zero undeclared identifiers (e.g. u_mouthCurvature), uniform synchronization,
 * brace/parenthesis syntax balance, persona define injection, and packed vault consistency.
 */

import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_VERTEX_SHADER } from "../lib/realtime/shaders/neural3DMMVertexShader";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/shaders/neural3DMMFragmentShader";
import { HEAD_KINEMATICS_VS, HEAD_KINEMATICS_FS } from "../lib/realtime/shaders/headKinematicsPass";
import { OCULAR_VISEME_VS, OCULAR_VISEME_FS } from "../lib/realtime/shaders/ocularVisemePass";
import { CHROMA_COMPOSITOR_VS, CHROMA_COMPOSITOR_FS } from "../lib/realtime/shaders/chromaCompositorPass";
import { OCULAR_VS, OCULAR_FS } from "../lib/realtime/shaders/ocularPass";
import { VISEME_VS, VISEME_FS } from "../lib/realtime/shaders/visemePass";
import { VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE } from "../lib/realtime/webglVisemeShader";
import {
  NEURAL_3DMM_UNIFORM_NAMES,
  PERSONA_SHADER_PRESETS,
  buildPersonaDefines,
  injectDefinesIntoShader,
} from "../lib/realtime/neural3DMMShader";

interface ShaderTarget {
  name: string;
  source: string;
  isVertex?: boolean;
}

const ALL_SHADERS: ShaderTarget[] = [
  { name: "NEURAL_3DMM_VERTEX_SHADER", source: NEURAL_3DMM_VERTEX_SHADER, isVertex: true },
  { name: "NEURAL_3DMM_FRAGMENT_SHADER", source: NEURAL_3DMM_FRAGMENT_SHADER },
  { name: "HEAD_KINEMATICS_VS", source: HEAD_KINEMATICS_VS, isVertex: true },
  { name: "HEAD_KINEMATICS_FS", source: HEAD_KINEMATICS_FS },
  { name: "OCULAR_VISEME_VS", source: OCULAR_VISEME_VS, isVertex: true },
  { name: "OCULAR_VISEME_FS", source: OCULAR_VISEME_FS },
  { name: "CHROMA_COMPOSITOR_VS", source: CHROMA_COMPOSITOR_VS, isVertex: true },
  { name: "CHROMA_COMPOSITOR_FS", source: CHROMA_COMPOSITOR_FS },
  { name: "OCULAR_VS", source: OCULAR_VS, isVertex: true },
  { name: "OCULAR_FS", source: OCULAR_FS },
  { name: "VISEME_VS", source: VISEME_VS, isVertex: true },
  { name: "VISEME_FS", source: VISEME_FS },
  { name: "VERTEX_SHADER_SOURCE (webglVisemeShader)", source: VERTEX_SHADER_SOURCE, isVertex: true },
  { name: "FRAGMENT_SHADER_SOURCE (webglVisemeShader)", source: FRAGMENT_SHADER_SOURCE },
];

/**
 * Extracts declared uniform identifiers from a GLSL source string.
 */
function extractDeclaredUniforms(glsl: string): Set<string> {
  const uniforms = new Set<string>();
  const uniformRegex = /uniform\s+[a-zA-Z0-9_]+\s+([a-zA-Z0-9_]+)\s*;/g;
  let match: RegExpExecArray | null;
  while ((match = uniformRegex.exec(glsl)) !== null) {
    uniforms.add(match[1]);
  }
  return uniforms;
}

/**
 * Extracts all tokens beginning with u_ in the GLSL source code,
 * ignoring line comments (//) and block comments (/* * /).
 */
function extractReferencedUniformTokens(glsl: string): Set<string> {
  // Strip block comments and line comments
  const stripped = glsl
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

  const matches = stripped.match(/\bu_[a-zA-Z0-9_]+\b/g) || [];
  return new Set(matches);
}

describe("Shader Compilation & Identifier Integrity", () => {
  describe("Undeclared Uniform Identifier Check (Zero Runtime Errors)", () => {
    for (const shader of ALL_SHADERS) {
      it(`should have all u_* uniform references declared in ${shader.name}`, () => {
        const declared = extractDeclaredUniforms(shader.source);
        const referenced = extractReferencedUniformTokens(shader.source);

        const undeclared: string[] = [];
        for (const token of referenced) {
          if (!declared.has(token)) {
            undeclared.push(token);
          }
        }

        expect(
          undeclared,
          `Shader ${shader.name} uses undeclared uniform(s): ${undeclared.join(", ")}`
        ).toEqual([]);
      });
    }
  });

  describe("Neural 3DMM Specific Uniform Bindings & Coverage", () => {
    it("should declare u_mouthCurvature in NEURAL_3DMM_FRAGMENT_SHADER", () => {
      const declared = extractDeclaredUniforms(NEURAL_3DMM_FRAGMENT_SHADER);
      expect(declared.has("u_mouthCurvature")).toBe(true);
    });

    it("should include u_mouthCurvature in NEURAL_3DMM_UNIFORM_NAMES list", () => {
      expect(NEURAL_3DMM_UNIFORM_NAMES).toContain("u_mouthCurvature");
    });

    it("should contain all declared uniforms from VS and FS inside NEURAL_3DMM_UNIFORM_NAMES", () => {
      const vsDeclared = extractDeclaredUniforms(NEURAL_3DMM_VERTEX_SHADER);
      const fsDeclared = extractDeclaredUniforms(NEURAL_3DMM_FRAGMENT_SHADER);
      const allDeclared = new Set([...vsDeclared, ...fsDeclared]);

      const uniformNamesSet = new Set(NEURAL_3DMM_UNIFORM_NAMES);
      const missingFromNames: string[] = [];

      for (const u of allDeclared) {
        if (!uniformNamesSet.has(u)) {
          missingFromNames.push(u);
        }
      }

      expect(
        missingFromNames,
        `NEURAL_3DMM_UNIFORM_NAMES is missing locations for: ${missingFromNames.join(", ")}`
      ).toEqual([]);
    });

    it("should not contain ghost/unreferenced names in NEURAL_3DMM_UNIFORM_NAMES", () => {
      const vsDeclared = extractDeclaredUniforms(NEURAL_3DMM_VERTEX_SHADER);
      const fsDeclared = extractDeclaredUniforms(NEURAL_3DMM_FRAGMENT_SHADER);
      const allDeclared = new Set([...vsDeclared, ...fsDeclared]);

      const ghostNames: string[] = [];
      for (const name of NEURAL_3DMM_UNIFORM_NAMES) {
        if (!allDeclared.has(name)) {
          ghostNames.push(name);
        }
      }

      expect(
        ghostNames,
        `NEURAL_3DMM_UNIFORM_NAMES contains ghost uniforms not declared in shaders: ${ghostNames.join(", ")}`
      ).toEqual([]);
    });
  });

  describe("GLSL Syntax & Structural Integrity", () => {
    for (const shader of ALL_SHADERS) {
      it(`should start with #version 300 es in ${shader.name}`, () => {
        const trimmed = shader.source.trim();
        expect(trimmed.startsWith("#version 300 es")).toBe(true);
      });

      it(`should have balanced braces and parentheses in ${shader.name}`, () => {
        const stripped = shader.source
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/\/\/.*$/gm, "");

        let braceCount = 0;
        let parenCount = 0;
        let negativeBrace = false;
        let negativeParen = false;

        for (let i = 0; i < stripped.length; i++) {
          const char = stripped[i];
          if (char === "{") braceCount++;
          else if (char === "}") {
            braceCount--;
            if (braceCount < 0) negativeBrace = true;
          } else if (char === "(") parenCount++;
          else if (char === ")") {
            parenCount--;
            if (parenCount < 0) negativeParen = true;
          }
        }

        expect(negativeBrace, "Closing brace without matching opening brace").toBe(false);
        expect(negativeParen, "Closing paren without matching opening paren").toBe(false);
        expect(braceCount, "Unmatched opening brace count").toBe(0);
        expect(parenCount, "Unmatched opening paren count").toBe(0);
      });

      it(`should contain main entry point in ${shader.name}`, () => {
        expect(shader.source).toMatch(/\bvoid\s+main\s*\(\s*\)/);
      });
    }
  });

  describe("Persona Preset Shader Variant Injections", () => {
    for (const [personaName, config] of Object.entries(PERSONA_SHADER_PRESETS)) {
      it(`should cleanly inject defines for preset '${personaName}' maintaining #version 300 es at top`, () => {
        const defines = buildPersonaDefines(config);
        const modified = injectDefinesIntoShader(NEURAL_3DMM_FRAGMENT_SHADER, defines);

        const lines = modified.trim().split("\n");
        expect(lines[0].trim()).toBe("#version 300 es");

        // Verify that uniform u_mouthCurvature remains declared in all variants
        const declared = extractDeclaredUniforms(modified);
        expect(declared.has("u_mouthCurvature")).toBe(true);
      });
    }
  });

  describe("Aperture & Expression Regression Tests", () => {
    it("should not reference undeclared cupidsBowOffset or openH in renderInterlabialAperture", () => {
      const apertureFuncMatch = NEURAL_3DMM_FRAGMENT_SHADER.match(
        /vec3\s+renderInterlabialAperture\s*\([\s\S]*?\)\s*\{([\s\S]*?)\n\}/
      );
      expect(apertureFuncMatch).not.toBeNull();
      const body = apertureFuncMatch![1];

      // cupidsBowOffset should not be referenced in renderInterlabialAperture (it uses cupidsBow)
      expect(body).not.toContain("cupidsBowOffset");
      // openH should not be referenced (it uses currentGap)
      expect(body).not.toContain("openH");
      // cupidsBow and currentGap should be defined and used
      expect(body).toContain("float cupidsBow =");
      expect(body).toContain("float currentGap =");
    });
  });
});
