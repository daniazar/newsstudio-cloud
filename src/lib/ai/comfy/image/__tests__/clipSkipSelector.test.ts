import { describe, it, expect } from "vitest";
import { resolveClipSkipForModel, applyClipSkipToWorkflow } from "../clipSkipSelector";

describe("clipSkipSelector (Task AD-1)", () => {
  it("should resolve CLIP Skip 2 for Pony checkpoints", () => {
    const res = resolveClipSkipForModel("cyberrealisticPony_v180Coreshift.safetensors");
    expect(res.clipSkip).toBe(2);
    expect(res.stopAtClipLayer).toBe(-2);
  });

  it("should resolve CLIP Skip 1 for Standard SDXL checkpoints", () => {
    const res = resolveClipSkipForModel("realvisxl_v50.safetensors");
    expect(res.clipSkip).toBe(1);
    expect(res.stopAtClipLayer).toBe(-1);
  });

  it("should inject CLIPSetLastLayer node into workflow graph", () => {
    const workflow: Record<string, any> = {
      "2": { class_type: "CLIPLoader", inputs: {} },
      "6": { class_type: "CLIPTextEncode", inputs: { clip: ["2", 0] } }
    };

    const success = applyClipSkipToWorkflow(workflow, "cyberrealisticPony.safetensors", "2");

    expect(success).toBe(true);
    expect(workflow["clip_skip_node"]).toBeDefined();
    expect(workflow["clip_skip_node"].inputs.stop_at_clip_layer).toBe(-2);
    expect(workflow["6"].inputs.clip).toEqual(["clip_skip_node", 0]);
  });
});
