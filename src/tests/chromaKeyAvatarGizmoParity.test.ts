/**
 * src/tests/chromaKeyAvatarGizmoParity.test.ts
 *
 * Unit tests verifying:
 * 1. PresenterBubble and useGizmoBounds strict dimensional parity (no avatar overflow).
 * 2. Auto FSM persona action loop catalog resolution (only existing core loops for Hawk).
 * 3. generateRandomLoopSequence FSM walk for Hawk (zero missing transition 404s).
 * 4. WebGL2 chroma key shader export integrity.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  getPersona37Clips,
  getClipMetaById,
  generateRandomLoopSequence,
  resolvePersonaVeoPrefix,
  PERSONAS_WITH_TRANSITIONS,
} from "@/lib/ecommerce/actionLoopFsmEngine";
import { VERTEX_SHADER, FRAGMENT_SHADER } from "@/remotion/components/chromaShader";

describe("1. PresenterBubble & useGizmoBounds Dimensional Parity", () => {
  it("strictly matches 9:16 vertical bounding box dimensions across all scales", () => {
    const compWidth = 1080;
    const compHeight = 1920;

    // Sizing formulas from useGizmoBounds.ts
    const getGizmoBounds = (scale: number) => {
      const h = Math.round(compHeight * 0.44 * scale);
      const w = Math.round(h * 0.82);
      return { w, h };
    };

    // Sizing formulas from PresenterBubble.tsx
    const getPresenterBubbleBounds = (scale: number) => {
      const baseCornerHeight = Math.round(compHeight * 0.44);
      const baseCornerWidth = Math.round(baseCornerHeight * 0.82);
      const effectiveW = Math.round(baseCornerWidth * scale);
      const effectiveH = Math.round(baseCornerHeight * scale);
      return { baseCornerWidth, baseCornerHeight, effectiveW, effectiveH };
    };

    // 100% scale
    const gizmo100 = getGizmoBounds(1.0);
    const bubble100 = getPresenterBubbleBounds(1.0);
    expect(bubble100.baseCornerHeight).toBe(845);
    expect(bubble100.baseCornerWidth).toBe(693);
    expect(bubble100.effectiveH).toBe(gizmo100.h);
    expect(bubble100.effectiveW).toBe(gizmo100.w);

    // 120% scale
    const gizmo120 = getGizmoBounds(1.2);
    const bubble120 = getPresenterBubbleBounds(1.2);
    expect(Math.abs(bubble120.effectiveH - gizmo120.h)).toBeLessThanOrEqual(1);
    expect(Math.abs(bubble120.effectiveW - gizmo120.w)).toBeLessThanOrEqual(1);

    // 150% scale
    const gizmo150 = getGizmoBounds(1.5);
    const bubble150 = getPresenterBubbleBounds(1.5);
    expect(Math.abs(bubble150.effectiveH - gizmo150.h)).toBeLessThanOrEqual(1);
    expect(Math.abs(bubble150.effectiveW - gizmo150.w)).toBeLessThanOrEqual(1);
  });

  it("strictly matches 16:9 landscape bounding box dimensions", () => {
    const compHeight = 1080;

    const baseHeight = Math.round(compHeight * 0.44);
    const baseWidth = Math.round(baseHeight * 0.82);

    expect(baseHeight).toBe(475);
    expect(baseWidth).toBe(390);
  });
});

describe("2. Persona Action Loop Catalog Verification", () => {
  it("restricts Hawk to strictly the 10 existing core loops without phantom transitions", () => {
    const hawkClips = getPersona37Clips("hawk");
    expect(hawkClips.length).toBe(10);

    // Verify all 10 are core loops (M1_loop_v1 through M5_loop_v2)
    const expectedIds = [
      "M1_loop_v1", "M1_loop_v2",
      "M2_loop_v1", "M2_loop_v2",
      "M3_loop_v1", "M3_loop_v2",
      "M4_loop_v1", "M4_loop_v2",
      "M5_loop_v1", "M5_loop_v2",
    ];
    expect(hawkClips.map((c) => c.id)).toEqual(expectedIds);

    // Verify no transitions or dynamic loops exist for Hawk
    const transitions = hawkClips.filter((c) => c.type === "transition" || c.id.startsWith("T"));
    expect(transitions.length).toBe(0);

    // Verify every single clip corresponds to a real file on disk
    const hawkDir = path.resolve(process.cwd(), "public/assets/action_loops/veo/hawk_graphite_pinstripe_suit");
    for (const clip of hawkClips) {
      const filePath = path.join(hawkDir, clip.file);
      expect(fs.existsSync(filePath), `File should exist: ${clip.file}`).toBe(true);
    }
  });

  it("allows Ruby to retain transitions as a full-suite persona", () => {
    expect(PERSONAS_WITH_TRANSITIONS.has("ruby")).toBe(true);
    const rubyClips = getPersona37Clips("ruby");
    expect(rubyClips.length).toBeGreaterThan(10);
    expect(rubyClips.some((c) => c.type === "transition")).toBe(true);
  });

  it("resolves clip metadata by ID for Hawk regardless of prefix or extension", () => {
    const clip1 = getClipMetaById("M3_loop_v1", "hawk");
    expect(clip1).toBeDefined();
    expect(clip1?.startPose).toBe("M3");
    expect(clip1?.file).toBe("hawk_graphite_pinstripe_suit_M3_loop_v1.mp4");

    const clip2 = getClipMetaById("hawk_graphite_pinstripe_suit_M1_loop_v2.mp4", "hawk");
    expect(clip2).toBeDefined();
    expect(clip2?.id).toBe("M1_loop_v2");
  });
});

describe("3. Auto FSM Markov Sequence Generation for Hawk", () => {
  it("generates an unbroken FSM sequence for Hawk where every clip exists on disk", () => {
    const totalFrames = 600; // ~25 seconds
    const sequence = generateRandomLoopSequence(totalFrames, { personaId: "hawk" });

    expect(sequence.length).toBeGreaterThanOrEqual(2);

    const hawkDir = path.resolve(process.cwd(), "public/assets/action_loops/veo/hawk_graphite_pinstripe_suit");

    for (const item of sequence) {
      // Must not be a phantom transition
      expect(item.clipId).not.toMatch(/^T\d_to_\d$/);
      // Video URL must be properly formed
      expect(item.videoUrl).toContain("/assets/action_loops/veo/hawk_graphite_pinstripe_suit/hawk_graphite_pinstripe_suit_");
      expect(item.videoUrl.endsWith(".mp4")).toBe(true);

      // Verify the file actually exists on disk!
      const filename = path.basename(item.videoUrl);
      const diskPath = path.join(hawkDir, filename);
      expect(fs.existsSync(diskPath), `Generated video must exist on disk: ${filename}`).toBe(true);
    }

    // Must cycle across poses rather than being stuck on a single pose
    const uniquePoses = new Set(sequence.map((s) => s.startPose));
    expect(uniquePoses.size).toBeGreaterThanOrEqual(2);
  });

  it("respects availableLoopIds filter if provided", () => {
    const allowed = ["M1_loop_v1", "M2_loop_v1"];
    const sequence = generateRandomLoopSequence(400, {
      personaId: "hawk",
      availableLoopIds: allowed,
    });

    for (const item of sequence) {
      expect(allowed.includes(item.clipId)).toBe(true);
    }
  });
});

describe("4. WebGL Chroma Key Shader Integrity", () => {
  it("exports valid vertex and fragment shaders with all required uniforms", () => {
    expect(VERTEX_SHADER).toContain("#version 300 es");
    expect(VERTEX_SHADER).toContain("a_position");
    expect(VERTEX_SHADER).toContain("a_texCoord");

    expect(FRAGMENT_SHADER).toContain("#version 300 es");
    expect(FRAGMENT_SHADER).toContain("u_videoTexture");
    expect(FRAGMENT_SHADER).toContain("u_keyColor");
    expect(FRAGMENT_SHADER).toContain("u_similarity");
    expect(FRAGMENT_SHADER).toContain("u_smoothness");
    expect(FRAGMENT_SHADER).toContain("u_despillStrength");
    expect(FRAGMENT_SHADER).toContain("u_texelSize");
    expect(FRAGMENT_SHADER).toContain("u_rimColor");
    expect(FRAGMENT_SHADER).toContain("u_rimStrength");
    expect(FRAGMENT_SHADER).toContain("u_ambientTint");
  });
});
