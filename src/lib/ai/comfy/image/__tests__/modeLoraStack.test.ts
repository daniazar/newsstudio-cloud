import { describe, it, expect } from "vitest";
import { buildModeLoraStack } from "../modeLoraStack";

describe("modeLoraStack (Task SW-3)", () => {
  it("should build SFW LoRA stack with 0 unlockers", () => {
    const stack = buildModeLoraStack("SFW", "ruby");

    expect(stack.length).toBe(3);
    expect(stack.some(l => l.category === "unlocker")).toBe(false);
    expect(stack[0].category).toBe("character");
  });

  it("should include nsfw_master_pony unlocker for NSFW_EXPLICIT mode", () => {
    const stack = buildModeLoraStack("NSFW_EXPLICIT", "ruby");

    expect(stack.some(l => l.name.includes("nsfw_master_pony"))).toBe(true);
    expect(stack[0].category).toBe("character"); // Identity first
  });
});
