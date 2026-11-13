import { describe, it, expect } from "vitest";
import fs from "fs";
import { getAllPersonas, getPersonaById } from "@/lib/tts/personas";
import { COMMERCIAL_VOICE_PERSONAS } from "../audioSynthesizer";
import { resolveAvatarPath } from "@/lib/ecommerce/avatarResolver";

describe("Persona Vault Integration Unit Tests", () => {
  it("loads 40+ official personas from the central Persona Vault", () => {
    const personas = getAllPersonas();
    expect(personas.length).toBeGreaterThanOrEqual(40);
  });

  it("successfully retrieves flagship anchors by ID", () => {
    const ruby = getPersonaById("ruby");
    expect(ruby).toBeDefined();
    expect(ruby?.name).toContain("Ruby");
    expect(ruby?.avatarUrl).toContain("ruby.png");

    const sofia = getPersonaById("sofia");
    expect(sofia).toBeDefined();
    expect(sofia?.name).toMatch(/Sof[ií]a/);

    const mateo = getPersonaById("mateo");
    expect(mateo).toBeDefined();
    expect(mateo?.name).toContain("Mateo");

    const blaze = getPersonaById("blaze");
    expect(blaze).toBeDefined();
    expect(blaze?.name).toContain("Blaze");
  });

  it("verifies physical avatar files exist on disk for vault anchors", () => {
    const vaultAnchors = ["ruby", "sofia", "blaze", "mateo", "camila", "diego", "austin", "isabel"];
    for (const id of vaultAnchors) {
      const avatarPath = resolveAvatarPath(id);
      expect(fs.existsSync(avatarPath)).toBe(true);
    }
  });

  it("COMMERCIAL_VOICE_PERSONAS includes flagship vault anchors", () => {
    const ids = COMMERCIAL_VOICE_PERSONAS.map((p) => p.id);
    expect(ids).toContain("ruby");
    expect(ids).toContain("sofia");
    expect(ids).toContain("camila");
    expect(ids).toContain("mateo");
    expect(ids).toContain("diego");
    expect(ids).toContain("blaze");
  });
});
