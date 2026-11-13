/**
 * src/lib/ai/comfy/image/contactModeGate.ts
 *
 * Task SW-6 (IMAGE_ROADMAP.md Part 17).
 * Mode-Aware Contact Mode Gate Engine.
 * Gates multi-persona contact modes and caps interaction intensity based on ContentMode
 * (SFW caps at HYBRID/30 intensity, NSFW_SOFT caps at FULL_CONTACT/60, NSFW_EXPLICIT unlocks all).
 */

import { ContentMode } from "./contentMode";
import { comfyLog } from "../api";

export type ContactStrategy = "SEQUENTIAL" | "SIMULTANEOUS" | "HYBRID" | "FULL_CONTACT" | "TANDEM_SKELETON";

export interface ContactGateResult {
  allowedMode: ContactStrategy;
  cappedIntensity: number;
  isCappedOrBlocked: boolean;
}

/**
 * Task SW-6: Enforces contact mode restrictions and intensity caps based on ContentMode.
 */
export function enforceContactModeGate(
  requestedMode: ContactStrategy,
  contentMode: ContentMode,
  requestedIntensity: number = 50
): ContactGateResult {
  let allowedMode: ContactStrategy = requestedMode;
  let cappedIntensity = requestedIntensity;
  let isCappedOrBlocked = false;

  if (contentMode === "SFW") {
    if (requestedMode === "FULL_CONTACT" || requestedMode === "TANDEM_SKELETON") {
      allowedMode = "HYBRID";
      isCappedOrBlocked = true;
    }
    if (cappedIntensity > 30) {
      cappedIntensity = 30;
      isCappedOrBlocked = true;
    }
  } else if (contentMode === "NSFW_SOFT") {
    if (requestedMode === "TANDEM_SKELETON") {
      allowedMode = "FULL_CONTACT";
      isCappedOrBlocked = true;
    }
    if (cappedIntensity > 60) {
      cappedIntensity = 60;
      isCappedOrBlocked = true;
    }
  }

  comfyLog(`[ContactModeGate] 🚧 Contact Gate (${contentMode}): Mode [${requestedMode} -> ${allowedMode}], Intensity [${requestedIntensity} -> ${cappedIntensity}]`);

  return {
    allowedMode,
    cappedIntensity,
    isCappedOrBlocked
  };
}
