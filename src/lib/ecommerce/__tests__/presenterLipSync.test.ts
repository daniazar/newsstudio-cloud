import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { resolveAvatarPath } from "@/lib/ecommerce/avatarResolver";

describe("presenterLipSync Unit Tests", () => {
  const hasLocalAvatars = fs.existsSync(path.join(process.cwd(), "public/avatars/ruby.png"));

  it("resolves exact avatar paths (and verifies disk files when present locally)", () => {
    const sofiaPath = resolveAvatarPath("sofia");
    expect(sofiaPath).toContain(hasLocalAvatars ? "sofia.png" : "ruby.png");
    if (hasLocalAvatars) expect(fs.existsSync(sofiaPath)).toBe(true);

    const rubyPath = resolveAvatarPath("ruby");
    expect(rubyPath).toContain("ruby.png");
    if (hasLocalAvatars) expect(fs.existsSync(rubyPath)).toBe(true);
  });

  it("maps e-commerce personas to high-res avatar fallbacks", () => {
    const elenaPath = resolveAvatarPath("elena");
    expect(elenaPath).toMatch(/\.png$/);
    if (hasLocalAvatars) expect(fs.existsSync(elenaPath)).toBe(true);

    const brycePath = resolveAvatarPath("bryce");
    expect(brycePath).toMatch(/\.png$/);
    if (hasLocalAvatars) expect(fs.existsSync(brycePath)).toBe(true);

    const ryanPath = resolveAvatarPath("ryan");
    expect(ryanPath).toMatch(/\.png$/);
    if (hasLocalAvatars) expect(fs.existsSync(ryanPath)).toBe(true);
  });

  it("safely falls back to ruby for completely unknown personas", () => {
    const unknownPath = resolveAvatarPath("non_existent_persona_xyz");
    expect(unknownPath).toContain("ruby.png");
    if (hasLocalAvatars) expect(fs.existsSync(unknownPath)).toBe(true);
  });
});
