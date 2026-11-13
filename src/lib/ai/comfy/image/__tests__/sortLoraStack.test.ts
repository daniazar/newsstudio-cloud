import { describe, it, expect } from "vitest";
import { sortLoraStack } from "../sortLoraStack";
import { LoraConfig } from "../loraManager";

describe("sortLoraStack (Task EX-3)", () => {
  it("should sort LoRAs into Character -> Photorealism -> Style order", () => {
    const unorderded: LoraConfig[] = [
      { name: "cinematic_style.safetensors", strength: 0.5 },
      { name: "ruby_vance_identity.safetensors", strength: 1.0 },
      { name: "add_detail_photo.safetensors", strength: 0.7 }
    ];

    const sorted = sortLoraStack(unorderded);

    expect(sorted[0].name).toBe("ruby_vance_identity.safetensors");
    expect(sorted[1].name).toBe("add_detail_photo.safetensors");
    expect(sorted[2].name).toBe("cinematic_style.safetensors");
  });
});
