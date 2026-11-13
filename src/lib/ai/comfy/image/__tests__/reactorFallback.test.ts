import { describe, it, expect } from "vitest";
import { shouldTriggerReActorFallback, injectReActorFallbackNode } from "../reactorFallback";

describe("reactorFallback (Task EX-8)", () => {
  it("should trigger fallback when identity score < 0.80", () => {
    const res = shouldTriggerReActorFallback(0.72, 0.80);
    expect(res.shouldTrigger).toBe(true);
  });

  it("should skip fallback when identity score >= 0.80", () => {
    const res = shouldTriggerReActorFallback(0.91, 0.80);
    expect(res.shouldTrigger).toBe(false);
  });

  it("should inject ReActorFaceSwap node into workflow graph", () => {
    const workflow: Record<string, any> = {
      "8": { class_type: "VAEDecode", inputs: {} }
    };

    const success = injectReActorFallbackNode(workflow, "8", "ruby.png");

    expect(success).toBe(true);
    expect(workflow["reactor_face_swap"]).toBeDefined();
    expect(workflow["reactor_face_swap"].inputs.swap_model).toBe("inswapper_128.onnx");
  });
});
