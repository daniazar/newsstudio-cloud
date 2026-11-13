import { describe, it, expect } from "vitest";
import { generateSemanticSegMap } from "../semanticSegMapGenerator";

describe("semanticSegMapGenerator (Task EX-10)", () => {
  it("should generate ADE20K semantic segmentation map path", () => {
    const res = generateSemanticSegMap([
      { label: "bar_counter", ade20kClassId: 44, hexColor: "#804000" }
    ]);

    expect(res.objectCount).toBe(1);
    expect(res.segMapPath).toContain("ade20k_seg_map.png");
    expect(res.mappedClasses).toContain("bar_counter");
  });
});
