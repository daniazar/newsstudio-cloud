import { describe, it, expect } from "vitest";
import { getQrCoordinates } from "@/remotion/layers/ecommerce/DynamicQrCodeLayer";
import { getPopupCoordinates } from "@/remotion/layers/ecommerce/SocialProofPopupLayer";
import { QrCodeConfig, SocialProofPopupConfig } from "@/lib/types/ecommerce";

describe("Commercial Remotion Layers Unit Tests", () => {
  it("computes accurate QR code coordinates for 9:16 vertical video", () => {
    const topRight = getQrCoordinates("top_right", "9:16");
    expect(topRight).toEqual({ top: 90, right: 24 });

    const bottomLeft = getQrCoordinates("bottom_left", "9:16");
    expect(bottomLeft).toEqual({ bottom: 80, left: 24 });
  });

  it("computes accurate QR code coordinates for 16:9 landscape video", () => {
    const topRight = getQrCoordinates("top_right", "16:9");
    expect(topRight).toEqual({ top: 24, right: 24 });

    const bottomRight = getQrCoordinates("bottom_right", "16:9");
    expect(bottomRight).toEqual({ bottom: 32, right: 24 });
  });

  it("computes accurate Social Proof popup coordinates", () => {
    const vertBottomLeft = getPopupCoordinates("bottom_left", "9:16");
    expect(vertBottomLeft).toEqual({ bottom: 95, left: 24 });

    const landBottomLeft = getPopupCoordinates("bottom_left", "16:9");
    expect(landBottomLeft).toEqual({ bottom: 32, left: 24 });
  });

  it("safely falls back for undefined position", () => {
    const fallbackQr = getQrCoordinates(undefined as unknown as QrCodeConfig["position"], "9:16");
    expect(fallbackQr).toEqual({ top: 90, right: 24 });

    const fallbackPopup = getPopupCoordinates(undefined as unknown as SocialProofPopupConfig["position"], "9:16");
    expect(fallbackPopup).toEqual({ bottom: 95, left: 24 });
  });
});
