import { describe, it, expect } from "vitest";
import fs from "fs";
import { resolveAvatarPath } from "@/lib/ecommerce/avatarResolver";
import { parseArgs } from "../../../../scripts/ecommerce-ad-cli";

describe("presenterLipSync Unit Tests", () => {
  it("resolves exact avatar files when they exist in public/avatars/", () => {
    const sofiaPath = resolveAvatarPath("sofia");
    expect(fs.existsSync(sofiaPath)).toBe(true);
    expect(sofiaPath).toContain("sofia.png");

    const rubyPath = resolveAvatarPath("ruby");
    expect(fs.existsSync(rubyPath)).toBe(true);
    expect(rubyPath).toContain("ruby.png");
  });

  it("maps e-commerce personas to high-res avatar fallbacks", () => {
    const elenaPath = resolveAvatarPath("elena");
    expect(fs.existsSync(elenaPath)).toBe(true);

    const brycePath = resolveAvatarPath("bryce");
    expect(fs.existsSync(brycePath)).toBe(true);

    const ryanPath = resolveAvatarPath("ryan");
    expect(fs.existsSync(ryanPath)).toBe(true);
  });

  it("safely falls back to ruby for completely unknown personas", () => {
    const unknownPath = resolveAvatarPath("non_existent_persona_xyz");
    expect(fs.existsSync(unknownPath)).toBe(true);
    expect(unknownPath).toContain("ruby.png");
  });

  it("parses --musetalk flag in ecommerce-ad-cli", () => {
    const opts = parseArgs(["--sample=flooring", "--persona=sofia", "--musetalk"]);
    expect(opts.musetalk).toBe(true);

    const defaultOpts = parseArgs(["--sample=flooring"]);
    expect(defaultOpts.musetalk).toBe(false);
  });
});
