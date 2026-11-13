import { describe, it, expect } from "vitest";
import { getOrCreatePhotoshootSession } from "../photoshootSession";

describe("photoshootSession (Task EV-10)", () => {
  it("should initialize new photoshoot session with frozen latent cache paths", () => {
    const session = getOrCreatePhotoshootSession("ruby_bar_shoot", "ruby", 987654);

    expect(session.sessionId).toBe("ruby_bar_shoot");
    expect(session.imagesCount).toBe(1);
    expect(session.stage1LatentCachePath).toContain("ruby_bar_shoot_stage1.latent");
  });

  it("should reuse frozen Stage 1 & Stage 2 latents on subsequent session requests", () => {
    const session1 = getOrCreatePhotoshootSession("session_reuse_test", "ruby");
    const session2 = getOrCreatePhotoshootSession("session_reuse_test", "ruby");

    expect(session2.imagesCount).toBe(2);
    expect(session2.stage1LatentCachePath).toBe(session1.stage1LatentCachePath);
  });
});
