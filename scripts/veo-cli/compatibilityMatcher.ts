/**
 * scripts/veo-cli/compatibilityMatcher.ts
 *
 * Smart Compatibility Matching Engine for Motion Beats and First-Last Frame (FLF) Transitions.
 * Prevents invalid video prompts (e.g. typing on a laptop without a desk, or morphing across disparate studio sets).
 */

import { ActionPoseState, ImageAuditResult } from "./types";

export interface CompatibilityValidationResult {
  permitted: boolean;
  reason?: string;
  suggestedAlternatives?: ActionPoseState[];
}

/**
 * Validates whether a specific Motion Beat is physically compatible with an audited Master Image
 */
export function validateBeatCompatibility(
  imageAudit: ImageAuditResult,
  pose: ActionPoseState,
  allPoses: ActionPoseState[] = []
): CompatibilityValidationResult {
  // 1. Domain Check
  if (pose.domain !== imageAudit.domain) {
    const validInDomain = allPoses.filter((p) => p.domain === imageAudit.domain);
    return {
      permitted: false,
      reason: `Domain Mismatch: Image is classified as [${imageAudit.domain}], but motion beat [${pose.poseCode}] belongs to [${pose.domain}].`,
      suggestedAlternatives: validInDomain.slice(0, 3),
    };
  }

  // 2. Desk & Furniture Physical Pre-Conditions
  if (pose.requiresDesk && !imageAudit.hasDesk) {
    const validStanding = allPoses.filter((p) => p.domain === "chroma_wall_standing");
    return {
      permitted: false,
      reason: `Desk Missing: Motion beat [${pose.poseCode}] requires a physical desk/table, but image has no desk.`,
      suggestedAlternatives: validStanding.slice(0, 3),
    };
  }

  if (pose.prohibitsDesk && imageAudit.hasDesk) {
    const validSeated = allPoses.filter((p) => p.domain === "seated_broadcast_desk" || p.domain === "chroma_wall_seated_desk");
    return {
      permitted: false,
      reason: `Desk Conflict: Motion beat [${pose.poseCode}] prohibits desks (pure standing pose), but image contains a desk.`,
      suggestedAlternatives: validSeated.slice(0, 3),
    };
  }

  // 3. Prop Requirements (Laptop, Tablet, Papers, Microphone)
  if (pose.requiredProps && pose.requiredProps.length > 0) {
    for (const prop of pose.requiredProps) {
      if (prop === "laptop" && !imageAudit.hasLaptop) {
        return {
          permitted: false,
          reason: `Prop Missing: Motion beat [${pose.poseCode}] requires a laptop keyboard, but no laptop is present.`,
        };
      }
      if (prop === "tablet" && !imageAudit.hasTablet) {
        return {
          permitted: false,
          reason: `Prop Missing: Motion beat [${pose.poseCode}] requires a digital tablet, but no tablet is present.`,
        };
      }
    }
  }

  return { permitted: true };
}

/**
 * Validates whether a First-Last Frame (FLF) Transition between two audited images is permitted
 */
export function validateTransitionCompatibility(
  fromAudit: ImageAuditResult,
  toAudit: ImageAuditResult
): CompatibilityValidationResult {
  // 1. Set Cohesion: Attire Check
  if (fromAudit.attireDescription !== toAudit.attireDescription) {
    return {
      permitted: false,
      reason: `Attire Mismatch: Start image wears [${fromAudit.attireDescription}] while end image wears [${toAudit.attireDescription}]. Video morphs across different clothing will artifact.`,
    };
  }

  // 2. Cross-Environment Check
  if (fromAudit.environmentGroup !== toAudit.environmentGroup) {
    return {
      permitted: false,
      reason: `Cross-Environment Morph Blocked: Cannot transition between [${fromAudit.environmentGroup}] and [${toAudit.environmentGroup}]. Use Remotion camera cut instead.`,
    };
  }

  // 3. Intra-Domain Transition (Standard Any-to-Any within same domain)
  if (fromAudit.domain === toAudit.domain) {
    return { permitted: true };
  }

  // 4. Designated Bridge Posture Transitions (Sit <-> Stand)
  const isStudioDeskBridge =
    (fromAudit.isBridgeBase && fromAudit.domain === "seated_broadcast_desk" &&
     toAudit.isBridgeBase && toAudit.domain === "standing_broadcast_desk") ||
    (fromAudit.isBridgeBase && fromAudit.domain === "standing_broadcast_desk" &&
     toAudit.isBridgeBase && toAudit.domain === "seated_broadcast_desk");

  const isLoungeBridge =
    (fromAudit.isBridgeBase && fromAudit.domain === "interview_lounge_seated_sofa" &&
     toAudit.isBridgeBase && toAudit.domain === "interview_lounge_standing") ||
    (fromAudit.isBridgeBase && fromAudit.domain === "interview_lounge_standing" &&
     toAudit.isBridgeBase && toAudit.domain === "interview_lounge_seated_sofa");

  if (isStudioDeskBridge || isLoungeBridge) {
    return { permitted: true };
  }

  return {
    permitted: false,
    reason: `Invalid Posture Transition: Cannot transition directly from [${fromAudit.domain}] to [${toAudit.domain}]. Posture transitions must route through designated bridge base master images.`,
  };
}
