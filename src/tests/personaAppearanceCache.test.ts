/**
 * src/tests/personaAppearanceCache.test.ts
 *
 * Vitest Verification Suite for Tier 2 Persona Appearance Caching (Anchor Warmup).
 * Tests pre-vectorized anchor VAE latents, SigLIP tokens, face boundary masks,
 * and GET /api/motion/persona-caches endpoint.
 */

import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { GET as getPersonaCachesRoute } from "@/app/api/motion/persona-caches/route";
import { PrecomputedPersonaCache } from "@/lib/ai/modernMotionClient";

describe("Modern Motion Tier 2 Persona Appearance Caching Suite", () => {
  const personaCacheDir = path.join(process.cwd(), "storage", "motion", "persona_caches");

  it("should have persona_caches directory populated with canonical anchors", () => {
    expect(fs.existsSync(personaCacheDir)).toBe(true);
    const personas = fs
      .readdirSync(personaCacheDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    const canonicalExpected = ["ruby", "marcus", "chloe", "sofia", "blaze", "camila", "aris", "abigail"];

    for (const expected of canonicalExpected) {
      expect(personas).toContain(expected);
    }
  });

  it("should validate that each persona cache contains required tensors and valid metadata", () => {
    const personaDirs = fs
      .readdirSync(personaCacheDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    expect(personaDirs.length).toBeGreaterThanOrEqual(4);

    for (const pId of personaDirs) {
      const pPath = path.join(personaCacheDir, pId);
      const metaPath = path.join(pPath, "metadata.json");

      expect(fs.existsSync(metaPath)).toBe(true);
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

      expect(meta.personaId).toBe(pId);
      expect(meta.name).toBeDefined();
      expect(meta.sha256).toBeDefined();
      expect(meta.sha256.length).toBe(64); // Valid SHA-256
      expect(meta.estimatedRuntimeSavingsSec).toBeGreaterThanOrEqual(1.5);

      // Verify appearance tensors exist
      const refLatentsPath = path.join(pPath, "ref_latents.pt");
      const siglipTokensPath = path.join(pPath, "siglip_tokens.pt");
      const faceMaskPath = path.join(pPath, "face_mask.npy");

      expect(fs.existsSync(refLatentsPath)).toBe(true);
      expect(fs.existsSync(siglipTokensPath)).toBe(true);
      expect(fs.existsSync(faceMaskPath)).toBe(true);

      // Verify non-zero file sizes
      expect(fs.statSync(refLatentsPath).size).toBeGreaterThan(1000);
      expect(fs.statSync(siglipTokensPath).size).toBeGreaterThan(1000);
      expect(fs.statSync(faceMaskPath).size).toBeGreaterThan(1000);
    }
  });

  it("should verify GET /api/motion/persona-caches responds with populated anchor list", async () => {
    const response = await getPersonaCachesRoute();
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.count).toBeGreaterThanOrEqual(4);
    expect(Array.isArray(json.caches)).toBe(true);

    const rubyCache = json.caches.find((c: PrecomputedPersonaCache) => c.personaId === "ruby");
    expect(rubyCache).toBeDefined();
    expect(rubyCache?.name).toContain("Ruby");
    expect(rubyCache?.tensors?.refLatents).toBe(true);
    expect(rubyCache?.tensors?.siglipTokens).toBe(true);
    expect(rubyCache?.tensors?.faceMask).toBe(true);
    expect(rubyCache?.estimatedRuntimeSavingsSec).toBe(1.8);
  });

  it("should benchmark that reading pre-warmed appearance tensor headers executes in <15ms", () => {
    const sampleMask = path.join(personaCacheDir, "ruby", "face_mask.npy");
    const t0 = performance.now();

    const fd = fs.openSync(sampleMask, "r");
    const buffer = Buffer.alloc(4096);
    fs.readSync(fd, buffer, 0, 4096, 0);
    fs.closeSync(fd);

    const elapsedMs = performance.now() - t0;
    expect(elapsedMs).toBeLessThan(15);
  });
});
