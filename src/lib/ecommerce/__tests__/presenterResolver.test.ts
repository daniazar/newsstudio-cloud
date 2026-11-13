import { describe, it, expect } from "vitest";
import {
  resolveEffectivePresenter,
  getScenePresenterMode,
  createScenePresenterOverride,
} from "../presenterResolver";
import type { AdPresenterConfig, ScenePresenterSettings } from "@/lib/types/ecommerce";

describe("presenterResolver (Per-Scene Avatar Overrides)", () => {
  const defaultVideoPresenter: AdPresenterConfig = {
    enabled: true,
    personaId: "sofia",
    position: "bottom_right",
    layoutMode: "bottom_right",
    scale: 1.0,
    offsetX: 0,
    offsetY: 0,
    presenterName: "Sofia Alvarez",
    roleTag: "Lead Anchor",
    showNametag: true,
    showNameBadge: true,
    avatarSrc: "/avatars/sofia.png",
  };

  it("inherits video-level presenter when scene presenter is not specified", () => {
    const effective = resolveEffectivePresenter(defaultVideoPresenter, null);
    expect(effective).toEqual(defaultVideoPresenter);
    expect(effective?.enabled).toBe(true);
    expect(effective?.personaId).toBe("sofia");
    expect(effective?.layoutMode).toBe("bottom_right");
  });

  it("inherits video-level presenter when scene presenter mode is explicitly 'inherit'", () => {
    const sceneOverride: ScenePresenterSettings = {
      mode: "inherit",
    };
    const effective = resolveEffectivePresenter(defaultVideoPresenter, sceneOverride);
    expect(effective).toEqual(defaultVideoPresenter);
  });

  it("overrides layout mode on a specific scene (e.g., circle_pip or full_screen)", () => {
    const sceneOverride: ScenePresenterSettings = {
      mode: "custom",
      layoutMode: "circle_pip",
    };
    const effective = resolveEffectivePresenter(defaultVideoPresenter, sceneOverride);
    expect(effective).toBeDefined();
    expect(effective?.layoutMode).toBe("circle_pip");
    expect(effective?.position).toBe("circle_pip");
    // Other properties remain inherited from video presenter
    expect(effective?.personaId).toBe("sofia");
    expect(effective?.scale).toBe(1.0);
  });

  it("overrides persona on a specific scene (e.g., from sofia to mateo)", () => {
    const sceneOverride: ScenePresenterSettings = {
      mode: "custom",
      personaId: "mateo",
      layoutMode: "full_screen",
    };
    const effective = resolveEffectivePresenter(defaultVideoPresenter, sceneOverride);
    expect(effective).toBeDefined();
    expect(effective?.personaId).toBe("mateo");
    expect(effective?.layoutMode).toBe("full_screen");
    expect(effective?.presenterName).toBe("Mateo Beltrán");
  });

  it("overrides scale, offset, and nametag visibility per scene", () => {
    const sceneOverride: ScenePresenterSettings = {
      mode: "custom",
      scale: 1.35,
      offsetX: -40,
      offsetY: 20,
      showNametag: false,
    };
    const effective = resolveEffectivePresenter(defaultVideoPresenter, sceneOverride);
    expect(effective).toBeDefined();
    expect(effective?.scale).toBe(1.35);
    expect(effective?.offsetX).toBe(-40);
    expect(effective?.offsetY).toBe(20);
    expect(effective?.showNametag).toBe(false);
    expect(effective?.personaId).toBe("sofia");
  });

  it("explicitly hides avatar on scene when mode is 'hidden'", () => {
    const sceneOverride: ScenePresenterSettings = {
      mode: "hidden",
      enabled: false,
    };
    const effective = resolveEffectivePresenter(defaultVideoPresenter, sceneOverride);
    expect(effective).toBeUndefined();
  });

  it("explicitly hides avatar on scene when enabled is set to false", () => {
    const sceneOverride: ScenePresenterSettings = {
      enabled: false,
    };
    const effective = resolveEffectivePresenter(defaultVideoPresenter, sceneOverride);
    expect(effective).toBeUndefined();
  });

  it("allows scene to enable avatar even when video-level presenter is disabled", () => {
    const disabledVideoPresenter: AdPresenterConfig = {
      ...defaultVideoPresenter,
      enabled: false,
    };
    const sceneOverride: ScenePresenterSettings = {
      mode: "custom",
      enabled: true,
      personaId: "valentina",
      layoutMode: "side_full_left",
    };
    const effective = resolveEffectivePresenter(disabledVideoPresenter, sceneOverride);
    expect(effective).toBeDefined();
    expect(effective?.enabled).toBe(true);
    expect(effective?.personaId).toBe("valentina");
    expect(effective?.layoutMode).toBe("side_full_left");
  });

  it("returns undefined when both video presenter and scene presenter are disabled or missing", () => {
    expect(resolveEffectivePresenter(null, null)).toBeUndefined();
    expect(resolveEffectivePresenter({ ...defaultVideoPresenter, enabled: false }, null)).toBeUndefined();
  });

  it("correctly identifies scene presenter mode using getScenePresenterMode", () => {
    expect(getScenePresenterMode(null)).toBe("inherit");
    expect(getScenePresenterMode({ mode: "inherit" })).toBe("inherit");
    expect(getScenePresenterMode({ mode: "hidden" })).toBe("hidden");
    expect(getScenePresenterMode({ enabled: false })).toBe("hidden");
    expect(getScenePresenterMode({ mode: "custom" })).toBe("custom");
    expect(getScenePresenterMode({ layoutMode: "circle_pip" })).toBe("custom");
    expect(getScenePresenterMode({ personaId: "ruby" })).toBe("custom");
  });

  it("inherits video default when overrideDefault is explicitly false even if properties are set", () => {
    const scenePresenter: ScenePresenterSettings = {
      overrideDefault: false,
      personaId: "mateo",
      scale: 1.5,
      layoutMode: "full_screen",
    };
    const effective = resolveEffectivePresenter(defaultVideoPresenter, scenePresenter);
    expect(effective?.personaId).toBe("sofia");
    expect(effective?.scale).toBe(1.0);
    expect(effective?.layoutMode).toBe("bottom_right");
  });

  it("activates custom override when overrideDefault is true", () => {
    const scenePresenter: ScenePresenterSettings = {
      overrideDefault: true,
      scale: 1.25,
      layoutMode: "circle_pip",
    };
    const effective = resolveEffectivePresenter(defaultVideoPresenter, scenePresenter);
    expect(effective?.scale).toBe(1.25);
    expect(effective?.layoutMode).toBe("circle_pip");
    expect(effective?.personaId).toBe("sofia");
  });

  it("creates valid override templates with createScenePresenterOverride", () => {
    const inheritConfig = createScenePresenterOverride("inherit");
    expect(inheritConfig.mode).toBe("inherit");

    const customConfig = createScenePresenterOverride("custom", defaultVideoPresenter);
    expect(customConfig.mode).toBe("custom");
    expect(customConfig.enabled).toBe(true);
    expect(customConfig.personaId).toBe("sofia");
  });

  it("inherits video-level offsets and scale while preserving sceneVideoUrl", () => {
    const videoPresenterWithOffsets: AdPresenterConfig = {
      ...defaultVideoPresenter,
      offsetX: -52,
      offsetY: -621,
      scale: 1.15,
    };
    const scenePresenter: ScenePresenterSettings = {
      overrideDefault: false,
    };
    const effective = resolveEffectivePresenter(
      videoPresenterWithOffsets,
      scenePresenter,
      "/assets/action_loops/veo/mateo/mateo_M4.mp4"
    );
    expect(effective?.offsetX).toBe(-52);
    expect(effective?.offsetY).toBe(-621);
    expect(effective?.scale).toBe(1.15);
    expect(effective?.videoUrl).toBe("/assets/action_loops/veo/mateo/mateo_M4.mp4");
  });

  it("returns undefined for raw LLM scene with personaId when video presenter is globally disabled", () => {
    const disabledVideo: AdPresenterConfig = {
      ...defaultVideoPresenter,
      enabled: false,
    };
    const implicitScenePresenter: ScenePresenterSettings = {
      personaId: "ruby",
    };
    const effective = resolveEffectivePresenter(disabledVideo, implicitScenePresenter);
    expect(effective).toBeUndefined();
  });

  it("merges and overrides bubble face framing parameters (zoom, offsetY, offsetX)", () => {
    const videoPresenterWithBubble: AdPresenterConfig = {
      ...defaultVideoPresenter,
      layoutMode: "circle_pip",
      position: "circle_pip",
      bubbleFaceZoom: 1.85,
      bubbleFaceOffsetY: 5,
      bubbleFaceOffsetX: 0,
    };

    // 1. Inherits defaults when scene has no overrides
    const effectiveDefault = resolveEffectivePresenter(videoPresenterWithBubble, null);
    expect(effectiveDefault?.bubbleFaceZoom).toBe(1.85);
    expect(effectiveDefault?.bubbleFaceOffsetY).toBe(5);
    expect(effectiveDefault?.bubbleFaceOffsetX).toBe(0);

    // 2. Custom scene-level override
    const sceneOverride: ScenePresenterSettings = {
      mode: "custom",
      bubbleFaceZoom: 2.1,
      bubbleFaceOffsetY: -8,
      bubbleFaceOffsetX: 4,
    };
    const effectiveCustom = resolveEffectivePresenter(videoPresenterWithBubble, sceneOverride);
    expect(effectiveCustom?.bubbleFaceZoom).toBe(2.1);
    expect(effectiveCustom?.bubbleFaceOffsetY).toBe(-8);
    expect(effectiveCustom?.bubbleFaceOffsetX).toBe(4);
  });
});
