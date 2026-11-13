/**
 * src/lib/ecommerce/presenterResolver.ts
 *
 * Presenter Resolution Engine:
 * Resolves the effective avatar/presenter configuration between video-level
 * (commercial-wide) defaults and scene-level overrides.
 *
 * Rules:
 *   1. "inherit" (Default): The scene uses the video-level presenterConfig.
 *   2. "custom" (Override): The scene overrides specific or all presenter parameters
 *      (e.g., Scene 1 = Full-Screen Sofia; Scene 3 = Circle PiP Mateo).
 *   3. "hidden": The avatar is explicitly hidden on that scene, even if the video has an active presenter.
 */

import type {
  AdPresenterConfig,
  ScenePresenterMode,
  ScenePresenterSettings,
} from "@/lib/types/ecommerce";
import { getPersonaById } from "@/lib/tts/personas";

/**
 * Determines the presenter mode of a scene: "inherit", "custom", or "hidden".
 */
export function getScenePresenterMode(
  scenePresenter?: ScenePresenterSettings | null
): ScenePresenterMode {
  if (!scenePresenter) return "inherit";
  if (scenePresenter.mode === "hidden" || scenePresenter.enabled === false) return "hidden";
  if (scenePresenter.overrideDefault === false) return "inherit";
  if (scenePresenter.overrideDefault === true) return "custom";
  if (scenePresenter.mode) return scenePresenter.mode;

  const hasOverrides = Boolean(
    scenePresenter.personaId ||
    scenePresenter.layoutMode ||
    scenePresenter.position ||
    scenePresenter.scale !== undefined ||
    scenePresenter.offsetX !== undefined ||
    scenePresenter.offsetY !== undefined ||
    scenePresenter.avatarSrc ||
    scenePresenter.avatarUrl ||
    scenePresenter.presenterName ||
    scenePresenter.roleTag ||
    scenePresenter.showNametag !== undefined ||
    scenePresenter.showNameBadge !== undefined ||
    scenePresenter.selectedPoseId
  );

  return hasOverrides ? "custom" : "inherit";
}

/**
 * Resolves the effective presenter configuration for a given scene.
 *
 * @param videoPresenter Commercial-wide default presenter configuration.
 * @param scenePresenter Scene-level override configuration.
 * @returns Effective AdPresenterConfig or undefined if the presenter is disabled/hidden.
 */
export function resolveEffectivePresenter(
  videoPresenter?: AdPresenterConfig | null,
  scenePresenter?: ScenePresenterSettings | null,
  sceneVideoUrl?: string
): AdPresenterConfig | undefined {
  const mode = getScenePresenterMode(scenePresenter);

  // 1. Explicitly hidden on this scene
  if (mode === "hidden") {
    return undefined;
  }

  // If video-level presenter is disabled, scenes without explicit enabled: true or overrideDefault: true must remain hidden
  if (
    videoPresenter &&
    videoPresenter.enabled === false &&
    scenePresenter?.enabled !== true &&
    !scenePresenter?.overrideDefault
  ) {
    return undefined;
  }

  // 2. Custom scene-level override
  if (mode === "custom" && scenePresenter) {
    const base: AdPresenterConfig = videoPresenter || {
      enabled: true,
      personaId: "sofia",
      position: "bottom_right",
      layoutMode: "bottom_right",
    };

    const personaId = (scenePresenter.personaId || base.personaId || "sofia").toLowerCase();
    const vaultPersona = getPersonaById(personaId);

    // Resolve avatar URL:
    // If the scene specified an avatarSrc or avatarUrl, use it.
    // If personaId changed, resolve from vault persona.
    // Otherwise fall back to base avatar.
    let avatarUrl = scenePresenter.avatarSrc || scenePresenter.avatarUrl;
    if (!avatarUrl && scenePresenter.personaId && vaultPersona?.avatarUrl) {
      avatarUrl = vaultPersona.avatarUrl;
    }
    if (!avatarUrl) {
      avatarUrl = base.avatarSrc || base.avatarUrl || `/avatars/${personaId}.png`;
    }

    const layoutMode =
      scenePresenter.layoutMode ||
      scenePresenter.position ||
      base.layoutMode ||
      base.position ||
      "bottom_right";

    const presenterName =
      scenePresenter.presenterName ||
      (scenePresenter.personaId && vaultPersona ? vaultPersona.name : base.presenterName);

    const roleTag =
      scenePresenter.roleTag ||
      (scenePresenter.personaId && vaultPersona ? vaultPersona.title : base.roleTag);

    return {
      ...base,
      ...scenePresenter,
      enabled: scenePresenter.enabled !== undefined ? scenePresenter.enabled : true,
      personaId,
      position: layoutMode,
      layoutMode,
      avatarUrl,
      avatarSrc: avatarUrl,
      scale: scenePresenter.scale !== undefined ? scenePresenter.scale : (base.scale ?? 1.0),
      offsetX: scenePresenter.offsetX !== undefined ? scenePresenter.offsetX : (base.offsetX ?? 0),
      offsetY: scenePresenter.offsetY !== undefined ? scenePresenter.offsetY : (base.offsetY ?? 0),
      showNametag:
        scenePresenter.showNametag !== undefined
          ? scenePresenter.showNametag
          : (base.showNametag ?? true),
      showNameBadge:
        scenePresenter.showNameBadge !== undefined
          ? scenePresenter.showNameBadge
          : (base.showNameBadge ?? true),
      presenterName,
      nameTag: presenterName,
      roleTag,
      selectedPoseId: scenePresenter.selectedPoseId || base.selectedPoseId,
      videoUrl: scenePresenter.videoUrl || sceneVideoUrl || base.videoUrl,
      bubbleFaceZoom:
        scenePresenter.bubbleFaceZoom !== undefined
          ? scenePresenter.bubbleFaceZoom
          : base.bubbleFaceZoom,
      bubbleFaceOffsetY:
        scenePresenter.bubbleFaceOffsetY !== undefined
          ? scenePresenter.bubbleFaceOffsetY
          : base.bubbleFaceOffsetY,
      bubbleFaceOffsetX:
        scenePresenter.bubbleFaceOffsetX !== undefined
          ? scenePresenter.bubbleFaceOffsetX
          : base.bubbleFaceOffsetX,
    };
  }

  // 3. Inherit video-level presenter
  if (videoPresenter && videoPresenter.enabled) {
    const isExplicitInherit = scenePresenter?.overrideDefault === false;
    const effectiveVideoUrl = scenePresenter?.videoUrl || sceneVideoUrl || videoPresenter.videoUrl;
    const hasTransformOverrides =
      !isExplicitInherit &&
      ((scenePresenter?.scale !== undefined && scenePresenter.scale !== videoPresenter.scale) ||
        (scenePresenter?.offsetX !== undefined && scenePresenter.offsetX !== videoPresenter.offsetX) ||
        (scenePresenter?.offsetY !== undefined && scenePresenter.offsetY !== videoPresenter.offsetY) ||
        (scenePresenter?.bubbleFaceZoom !== undefined && scenePresenter.bubbleFaceZoom !== videoPresenter.bubbleFaceZoom) ||
        (scenePresenter?.bubbleFaceOffsetY !== undefined && scenePresenter.bubbleFaceOffsetY !== videoPresenter.bubbleFaceOffsetY) ||
        (scenePresenter?.bubbleFaceOffsetX !== undefined && scenePresenter.bubbleFaceOffsetX !== videoPresenter.bubbleFaceOffsetX));

    if (
      effectiveVideoUrl !== videoPresenter.videoUrl ||
      (!isExplicitInherit && (scenePresenter?.selectedActionLoopId || scenePresenter?.actionLoopSlices)) ||
      hasTransformOverrides
    ) {
      return {
        ...videoPresenter,
        videoUrl: effectiveVideoUrl,
        selectedActionLoopId:
          (!isExplicitInherit && scenePresenter?.selectedActionLoopId) || videoPresenter.selectedActionLoopId,
        actionLoopSlices:
          (!isExplicitInherit && scenePresenter?.actionLoopSlices) || videoPresenter.actionLoopSlices,
        scale:
          !isExplicitInherit && scenePresenter?.scale !== undefined
            ? scenePresenter.scale
            : (videoPresenter.scale ?? 1.0),
        offsetX:
          !isExplicitInherit && scenePresenter?.offsetX !== undefined
            ? scenePresenter.offsetX
            : (videoPresenter.offsetX ?? 0),
        offsetY:
          !isExplicitInherit && scenePresenter?.offsetY !== undefined
            ? scenePresenter.offsetY
            : (videoPresenter.offsetY ?? 0),
        bubbleFaceZoom:
          !isExplicitInherit && scenePresenter?.bubbleFaceZoom !== undefined
            ? scenePresenter.bubbleFaceZoom
            : videoPresenter.bubbleFaceZoom,
        bubbleFaceOffsetY:
          !isExplicitInherit && scenePresenter?.bubbleFaceOffsetY !== undefined
            ? scenePresenter.bubbleFaceOffsetY
            : videoPresenter.bubbleFaceOffsetY,
        bubbleFaceOffsetX:
          !isExplicitInherit && scenePresenter?.bubbleFaceOffsetX !== undefined
            ? scenePresenter.bubbleFaceOffsetX
            : videoPresenter.bubbleFaceOffsetX,
      };
    }
    return videoPresenter;
  }

  return undefined;
}

/**
 * Creates a new scene presenter settings object based on the desired mode.
 */
export function createScenePresenterOverride(
  mode: ScenePresenterMode,
  basePresenter?: AdPresenterConfig | null
): ScenePresenterSettings {
  if (mode === "hidden") {
    return {
      mode: "hidden",
      enabled: false,
    };
  }

  if (mode === "custom") {
    return {
      ...(basePresenter || {
        personaId: "sofia",
        layoutMode: "bottom_right",
        position: "bottom_right",
        scale: 1.0,
      }),
      mode: "custom",
      enabled: true,
    };
  }

  return {
    mode: "inherit",
    enabled: true,
  };
}
