import { describe, it, expect } from "vitest";
import { MultiAngleYawBlender, SUPPORTED_ANGLE_PERSONAS } from "@/lib/realtime/multiAngleYawBlender";

describe("MultiAngleYawBlender Persona Safety", () => {
  it("only enables multi-angle brackets for ruby", () => {
    expect(SUPPORTED_ANGLE_PERSONAS.has("ruby")).toBe(true);
    expect(SUPPORTED_ANGLE_PERSONAS.has("blaze")).toBe(false);
    expect(SUPPORTED_ANGLE_PERSONAS.has("mateo")).toBe(false);
  });

  it("safely falls back to 0deg canonical codebook for blaze and other non-ruby personas", () => {
    const blender = new MultiAngleYawBlender();
    const blazeRes = blender.resolve(25, "blaze");
    expect(blazeRes.angleA).toBe(0);
    expect(blazeRes.angleB).toBe(0);
    expect(blazeRes.blendFactor).toBe(0.0);
    expect(blazeRes.codebookUrlA).toBe("/assets/avatars/visemes/blaze_ditto_codebook.json");
    expect(blazeRes.codebookUrlB).toBe("/assets/avatars/visemes/blaze_ditto_codebook.json");

    const blaze90 = blender.resolve(-90, "blaze");
    expect(blaze90.angleA).toBe(0);
    expect(blaze90.angleB).toBe(0);
    expect(blaze90.isFlipped).toBe(true);
    expect(blaze90.codebookUrlA).toBe("/assets/avatars/visemes/blaze_ditto_codebook.json");
  });

  it("properly resolves angle brackets for ruby", () => {
    const blender = new MultiAngleYawBlender();
    const ruby25 = blender.resolve(25, "ruby");
    expect(ruby25.angleA).toBe(25);
    expect(ruby25.angleB).toBe(45);
    expect(ruby25.blendFactor).toBe(0.0);
    expect(ruby25.codebookUrlA).toBe("/assets/avatars/visemes/ruby_25deg_ditto_codebook.json");
    expect(ruby25.codebookUrlB).toBe("/assets/avatars/visemes/ruby_45deg_ditto_codebook.json");

    const ruby10 = blender.resolve(10, "ruby");
    expect(ruby10.angleA).toBe(0);
    expect(ruby10.angleB).toBe(25);
    expect(ruby10.blendFactor).toBeCloseTo(10 / 25, 2);
    expect(ruby10.codebookUrlA).toBe("/assets/avatars/visemes/ruby_ditto_codebook.json");
    expect(ruby10.codebookUrlB).toBe("/assets/avatars/visemes/ruby_25deg_ditto_codebook.json");
  });

  it("properly resolves fullface codebooks when mode is fullface or true", () => {
    const blender = new MultiAngleYawBlender();
    const ruby25Full = blender.resolve(25, "ruby", "fullface");
    expect(ruby25Full.angleA).toBe(25);
    expect(ruby25Full.angleB).toBe(45);
    expect(ruby25Full.codebookUrlA).toBe("/assets/avatars/visemes/ruby_25deg_ditto_fullface_codebook.json");
    expect(ruby25Full.codebookUrlB).toBe("/assets/avatars/visemes/ruby_45deg_ditto_fullface_codebook.json");

    const ruby0Full = blender.resolve(0, "ruby", true);
    expect(ruby0Full.codebookUrlA).toBe("/assets/avatars/visemes/ruby_ditto_fullface_codebook.json");

    const blazeFull = blender.resolve(25, "blaze", "fullface");
    expect(blazeFull.codebookUrlA).toBe("/assets/avatars/visemes/blaze_ditto_fullface_codebook.json");
  });
});
