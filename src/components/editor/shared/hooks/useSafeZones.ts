/**
 * src/components/editor/shared/hooks/useSafeZones.ts
 *
 * Safe Zones calculations for vertical, widescreen, and square video.
 * Models TikTok Shop, Instagram Reels, and YouTube Shorts UI overlays.
 */

import { useMemo } from "react";

export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

export type SafeZonePlatform =
  | "tiktok"
  | "reels"
  | "shorts"
  | "general"
  | "tiktok_shop"
  | "instagram_reels"
  | "youtube_shorts"
  | "broadcast_tv";

export interface SafeZoneMargins {
  topPercent: number;
  bottomPercent: number;
  leftPercent: number;
  rightPercent: number;
  rightInteractionGutterPercent: number;
  warnings: string[];
  // Convenience aliases
  top: number;
  bottom: number;
  left: number;
  right: number;
  isActionSafe: boolean;
}

export interface UseSafeZonesOptions {
  aspectRatio?: AspectRatio;
  platform?: SafeZonePlatform;
}

export function calculateSafeZones(
  aspectRatio: AspectRatio = "9:16",
  platform: SafeZonePlatform = "tiktok"
): SafeZoneMargins {
  let top = 5;
  let bottom = 8;
  let left = 5;
  let right = 5;
  let gutter = 0;
  let warnings: string[] = [];

  if (aspectRatio === "16:9") {
    top = 5;
    bottom = 8;
    left = 5;
    right = 5;
    gutter = 0;
    warnings = ["Keep lower-third graphics above 8% from bottom to avoid scrub bar occlusion."];
  } else if (aspectRatio === "1:1") {
    top = 4;
    bottom = 6;
    left = 4;
    right = 4;
    gutter = 0;
    warnings = ["Square 1:1 format — keep branding centered."];
  } else {
    // 9:16 Vertical
    switch (platform) {
      case "tiktok":
      case "tiktok_shop":
        top = 8;
        bottom = 24;
        left = 6;
        right = 18;
        gutter = 18;
        warnings = [
          "Avoid text within right 18% (engagement rail).",
          "Avoid critical CTAs within bottom 24% (TikTok Shop product tag & caption overlay).",
        ];
        break;
      case "reels":
      case "instagram_reels":
        top = 7;
        bottom = 20;
        left = 5;
        right = 16;
        gutter = 16;
        warnings = [
          "Avoid text within right 16% (Reels actions).",
          "Avoid critical text within bottom 20% (Audio title & creator handle).",
        ];
        break;
      case "shorts":
      case "youtube_shorts":
        top = 6;
        bottom = 18;
        left = 5;
        right = 16;
        gutter = 16;
        warnings = [
          "Avoid text within right 16% (Shorts actions).",
          "Keep bottom 18% clear for subscribe button.",
        ];
        break;
      case "general":
      case "broadcast_tv":
      default:
        top = 10;
        bottom = 10;
        left = 10;
        right = 10;
        gutter = 0;
        warnings = ["Standard 90% broadcast title-safe grid."];
        break;
    }
  }

  return {
    topPercent: top,
    bottomPercent: bottom,
    leftPercent: left,
    rightPercent: right,
    rightInteractionGutterPercent: gutter,
    warnings,
    top,
    bottom,
    left,
    right,
    isActionSafe: true,
  };
}

export function useSafeZones(
  arg1?: AspectRatio | UseSafeZonesOptions,
  arg2?: SafeZonePlatform
): SafeZoneMargins {
  const { aspectRatio, platform } = useMemo(() => {
    if (typeof arg1 === "object" && arg1 !== null) {
      return {
        aspectRatio: arg1.aspectRatio || "9:16",
        platform: arg1.platform || "tiktok",
      };
    }
    return {
      aspectRatio: (arg1 as AspectRatio) || "9:16",
      platform: arg2 || "tiktok",
    };
  }, [arg1, arg2]);

  return useMemo(() => calculateSafeZones(aspectRatio, platform), [aspectRatio, platform]);
}
