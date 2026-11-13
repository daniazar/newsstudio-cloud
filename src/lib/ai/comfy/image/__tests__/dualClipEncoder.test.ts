import { describe, it, expect } from "vitest";
import { injectDualClipEncoderSDXL } from "../workflowMutator";

describe("injectDualClipEncoderSDXL (Task QA-2)", () => {
  it("should inject CLIPTextEncodeSDXL node with text_l and text_g inputs and rewire KSampler positive conditioning", () => {
    const workflow: Record<string, any> = {
      "6": { inputs: { text: "original prompt" } },
      "8": { inputs: { positive: ["6", 0] } }
    };

    const textL = "1girl, copper_hair, green_eyes, dark_blazer, news_desk";
    const textG = "A photorealistic portrait of Ruby Vance sitting at a newsroom broadcast desk under studio lighting.";

    injectDualClipEncoderSDXL(workflow, textL, textG, ["2", 1]);

    expect(workflow["sdxl_dual_clip_positive"]).toBeDefined();
    expect(workflow["sdxl_dual_clip_positive"].class_type).toBe("CLIPTextEncodeSDXL");
    expect(workflow["sdxl_dual_clip_positive"].inputs.text_l).toBe(textL);
    expect(workflow["sdxl_dual_clip_positive"].inputs.text_g).toBe(textG);
    expect(workflow["8"].inputs.positive).toEqual(["sdxl_dual_clip_positive", 0]);
  });
});
