import { describe, it, expect } from "vitest";
import {
  getScenePresenterMode,
  resolveEffectivePresenter,
  createScenePresenterOverride,
} from "@/lib/ecommerce/presenterResolver";
import type { AdPresenterConfig, ScenePresenterSettings } from "@/lib/types/ecommerce";

describe("ScenePresenterControls Logic & Fallback Behavior", () => {
  const videoPresenter: AdPresenterConfig = {
    enabled: true,
    personaId: "sofia",
    layoutMode: "bottom_right",
    position: "bottom_right",
    scale: 1.0,
    presenterName: "Sofia Alvarez",
    avatarSrc: "/avatars/sofia.png",
  };

  it("handles mode switching from inherit to custom override", () => {
    // 1. Initially inheriting
    let currentOverride: ScenePresenterSettings | null = null;
    expect(getScenePresenterMode(currentOverride)).toBe("inherit");
    expect(resolveEffectivePresenter(videoPresenter, currentOverride)?.personaId).toBe("sofia");

    // 2. User sets custom override for Mateo in Circle PiP
    currentOverride = {
      mode: "custom",
      enabled: true,
      personaId: "mateo",
      layoutMode: "circle_pip",
    };
    expect(getScenePresenterMode(currentOverride)).toBe("custom");
    const effective = resolveEffectivePresenter(videoPresenter, currentOverride);
    expect(effective?.personaId).toBe("mateo");
    expect(effective?.layoutMode).toBe("circle_pip");

    // 3. User switches to hidden
    currentOverride = {
      mode: "hidden",
      enabled: false,
    };
    expect(getScenePresenterMode(currentOverride)).toBe("hidden");
    expect(resolveEffectivePresenter(videoPresenter, currentOverride)).toBeUndefined();

    // 4. User resets back to inherit (null)
    currentOverride = null;
    expect(getScenePresenterMode(currentOverride)).toBe("inherit");
    expect(resolveEffectivePresenter(videoPresenter, currentOverride)?.personaId).toBe("sofia");
  });

  it("ensures scene override preserves video presenter unchanged", () => {
    const sceneOverride: ScenePresenterSettings = {
      mode: "custom",
      layoutMode: "full_screen",
      scale: 1.25,
    };
    const effective = resolveEffectivePresenter(videoPresenter, sceneOverride);
    expect(effective?.layoutMode).toBe("full_screen");
    expect(effective?.scale).toBe(1.25);

    // Video presenter itself remains intact with its defaults
    expect(videoPresenter.layoutMode).toBe("bottom_right");
    expect(videoPresenter.scale).toBe(1.0);
  });
});
