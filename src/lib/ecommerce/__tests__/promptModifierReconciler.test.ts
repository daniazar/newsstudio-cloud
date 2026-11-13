import { describe, it, expect } from "vitest";
import {
  reconcileLightingModifier,
  isLightingModifierActive,
  reconcileCameraCue,
} from "../promptModifierReconciler";
import { ENVIRONMENT_LIGHTING_MODIFIERS } from "../productMediaPresets";

describe("promptModifierReconciler", () => {
  const sunlitMod = ENVIRONMENT_LIGHTING_MODIFIERS.find((m) => m.id === "sunlit_daylight")!;
  const twilightMod = ENVIRONMENT_LIGHTING_MODIFIERS.find((m) => m.id === "moody_twilight")!;
  const studioMod = ENVIRONMENT_LIGHTING_MODIFIERS.find((m) => m.id === "studio_softbox")!;

  it("appends lighting modifier when none exists", () => {
    const base = "Photorealistic architectural interior photograph of an expansive room with installed flooring.";
    const result = reconcileLightingModifier(base, "sunlit_daylight");
    expect(result).toContain(sunlitMod.phrase);
    expect(isLightingModifierActive(result, "sunlit_daylight")).toBe(true);
  });

  it("toggles off modifier if clicked again when active", () => {
    const base = `Photorealistic room with flooring, ${sunlitMod.phrase}`;
    const result = reconcileLightingModifier(base, "sunlit_daylight");
    expect(result).not.toContain(sunlitMod.phrase);
    expect(isLightingModifierActive(result, "sunlit_daylight")).toBe(false);
  });

  it("switches from Sunlit to Moody Twilight and removes sunlit conflicts from base text", () => {
    const sunlitPrompt = `Photorealistic architectural interior photograph of an expansive sunlit Scandinavian living room with floor-to-ceiling windows, natural blonde oak finishes, and flooring seamlessly installed, ${sunlitMod.phrase}`;

    const twilightResult = reconcileLightingModifier(sunlitPrompt, "moody_twilight");

    // 1. Prior canonical sunlit phrase must be removed
    expect(twilightResult).not.toContain(sunlitMod.phrase);
    // 2. New twilight phrase must be present
    expect(twilightResult).toContain(twilightMod.phrase);
    // 3. Contradictory "sunlit" words in base text must be neutralized
    expect(twilightResult).not.toContain("sunlit Scandinavian");
    expect(twilightResult).toContain("an expansive architectural Scandinavian living room");
    expect(twilightResult).not.toContain("sunlit");
  });

  it("switches from Moody Twilight to Clean Studio Softbox without conflicting shadows", () => {
    const twilightPrompt = `Photorealistic room, ${twilightMod.phrase}`;
    const studioResult = reconcileLightingModifier(twilightPrompt, "studio_softbox");

    expect(studioResult).not.toContain(twilightMod.phrase);
    expect(studioResult).toContain(studioMod.phrase);
  });

  it("reconciles camera cues without duplicating 'Camera:'", () => {
    const base = "Smooth floating aerial glide moving steadily forward across an expansive room. Camera: Cinematic slow dolly push into.";
    const updated = reconcileCameraCue(base, "Smooth robotic studio crane shot gently booming downward from high angle.");

    expect(updated).not.toContain("Cinematic slow dolly push into");
    expect(updated).toContain("Camera: Smooth robotic studio crane shot gently booming downward from high angle");
    // Verify only one "Camera:" occurs
    const occurrences = (updated.match(/Camera:/g) || []).length;
    expect(occurrences).toBe(1);
  });
});
