import { describe, it, expect, vi } from "vitest";
import { buildLayersList } from "../layerTree/buildLayersList";
import type { EditorLayerTreeProps } from "../layerTree/types";

describe("EditorLayerTree Broadcast & Ecommerce Modes", () => {
  it("filters out e-commerce layers and returns only the 9 broadcast layers when mode is broadcast", () => {
    const props: EditorLayerTreeProps = {
      mode: "broadcast",
      selectedLayer: "avatar",
      onSelectLayer: vi.fn(),
      isOpen: true,
      onToggleOpen: vi.fn(),
      avatarVisible: true,
      onToggleAvatarVisible: vi.fn(),
      avatarOffsetX: 0,
      avatarOffsetY: 0,
      avatarScale: 1.0,
      avatarName: "Ruby Sterling",
      onUpdateAvatarOffsets: vi.fn(),
      onResetAvatar: vi.fn(),
      captionVisible: true,
      onToggleCaptionVisible: vi.fn(),
      captionOffsetX: 0,
      captionOffsetY: 0,
      onUpdateCaptionOffsets: vi.fn(),
      onResetCaption: vi.fn(),
      headlineVisible: true,
      onToggleHeadlineVisible: vi.fn(),
      headlineOffsetX: 0,
      headlineOffsetY: 0,
      headlineText: "Global Markets Update",
      onUpdateHeadlineOffsets: vi.fn(),
      onResetHeadline: vi.fn(),
      tickerTapeVisible: true,
      onToggleTickerTapeVisible: vi.fn(),
      brandLogoVisible: true,
      onToggleBrandLogoVisible: vi.fn(),
      badgeVisible: true,
      onToggleBadgeVisible: vi.fn(),
      introBumperVisible: true,
      onToggleIntroBumperVisible: vi.fn(),
      outroEndCardVisible: true,
      onToggleOutroEndCardVisible: vi.fn(),
      backdropVisible: true,
      onToggleBackdropVisible: vi.fn(),
    };

    const layers = buildLayersList(props);
    const layerIds = layers.map((l) => l.id);

    // Verify exactly the 9 broadcast layers are present
    expect(layerIds).toEqual([
      "introBumper",
      "brandLogo",
      "badge",
      "headline",
      "caption",
      "tickerTape",
      "avatar",
      "backdrop",
      "outroEndCard",
    ]);

    // Verify none of the commercial e-commerce layers leak into broadcast
    expect(layerIds).not.toContain("pricePromo");
    expect(layerIds).not.toContain("ctaButton");
    expect(layerIds).not.toContain("qrCode");
    expect(layerIds).not.toContain("featurePills");
    expect(layerIds).not.toContain("reviewCard");
    expect(layerIds).not.toContain("product");
    expect(layerIds).not.toContain("usVsThem");
    expect(layerIds).not.toContain("flashSale");
    expect(layerIds).not.toContain("socialPopup");
  });

  it("retains all commercial layers when mode is ecommerce", () => {
    const props: EditorLayerTreeProps = {
      mode: "ecommerce",
      selectedLayer: "avatar",
      onSelectLayer: vi.fn(),
      isOpen: true,
      onToggleOpen: vi.fn(),
      avatarVisible: true,
      onToggleAvatarVisible: vi.fn(),
      avatarOffsetX: 0,
      avatarOffsetY: 0,
      avatarScale: 1.0,
      onUpdateAvatarOffsets: vi.fn(),
      onResetAvatar: vi.fn(),
      captionVisible: true,
      onToggleCaptionVisible: vi.fn(),
      captionOffsetX: 0,
      captionOffsetY: 0,
      onUpdateCaptionOffsets: vi.fn(),
      onResetCaption: vi.fn(),
      headlineVisible: true,
      onToggleHeadlineVisible: vi.fn(),
      headlineOffsetX: 0,
      headlineOffsetY: 0,
      onUpdateHeadlineOffsets: vi.fn(),
      onResetHeadline: vi.fn(),
      productVisible: true,
      onToggleProductVisible: vi.fn(),
      productOffsetX: 0,
      productOffsetY: 0,
      productScale: 1.0,
      onUpdateProductOffsets: vi.fn(),
      onResetProduct: vi.fn(),
      showBadgeLayer: true,
      qrCodeVisible: true,
      onToggleQrCodeVisible: vi.fn(),
    };

    const layers = buildLayersList(props);
    const layerIds = layers.map((l) => l.id);

    expect(layerIds).toContain("product");
    expect(layerIds).toContain("pricePromo");
    expect(layerIds).toContain("ctaButton");
    expect(layerIds).toContain("qrCode");
    expect(layerIds).toContain("reviewCard");
    expect(layerIds).toContain("featurePills");
    expect(layerIds).toContain("usVsThem");
    expect(layerIds).toContain("flashSale");
    expect(layerIds).toContain("socialPopup");
  });

  it("wires up functional visibility toggle callbacks in broadcast mode", () => {
    const onToggleAvatarVisible = vi.fn();
    const onToggleCaptionVisible = vi.fn();
    const onToggleHeadlineVisible = vi.fn();
    const onToggleTickerTapeVisible = vi.fn();
    const onToggleBrandLogoVisible = vi.fn();
    const onToggleBadgeVisible = vi.fn();
    const onToggleIntroBumperVisible = vi.fn();
    const onToggleOutroEndCardVisible = vi.fn();
    const onToggleBackdropVisible = vi.fn();

    const props: EditorLayerTreeProps = {
      mode: "broadcast",
      selectedLayer: "avatar",
      onSelectLayer: vi.fn(),
      isOpen: true,
      onToggleOpen: vi.fn(),
      avatarVisible: true,
      onToggleAvatarVisible,
      avatarOffsetX: 0,
      avatarOffsetY: 0,
      avatarScale: 1.0,
      onUpdateAvatarOffsets: vi.fn(),
      onResetAvatar: vi.fn(),
      captionVisible: true,
      onToggleCaptionVisible,
      captionOffsetX: 0,
      captionOffsetY: 0,
      onUpdateCaptionOffsets: vi.fn(),
      onResetCaption: vi.fn(),
      headlineVisible: true,
      onToggleHeadlineVisible,
      headlineOffsetX: 0,
      headlineOffsetY: 0,
      onUpdateHeadlineOffsets: vi.fn(),
      onResetHeadline: vi.fn(),
      tickerTapeVisible: true,
      onToggleTickerTapeVisible,
      brandLogoVisible: true,
      onToggleBrandLogoVisible,
      badgeVisible: true,
      onToggleBadgeVisible,
      introBumperVisible: true,
      onToggleIntroBumperVisible,
      outroEndCardVisible: true,
      onToggleOutroEndCardVisible,
      backdropVisible: true,
      onToggleBackdropVisible,
    };

    const layers = buildLayersList(props);

    const avatarLayer = layers.find((l) => l.id === "avatar");
    avatarLayer?.onToggleVisible();
    expect(onToggleAvatarVisible).toHaveBeenCalledTimes(1);

    const captionLayer = layers.find((l) => l.id === "caption");
    captionLayer?.onToggleVisible();
    expect(onToggleCaptionVisible).toHaveBeenCalledTimes(1);

    const headlineLayer = layers.find((l) => l.id === "headline");
    headlineLayer?.onToggleVisible();
    expect(onToggleHeadlineVisible).toHaveBeenCalledTimes(1);

    const tickerLayer = layers.find((l) => l.id === "tickerTape");
    tickerLayer?.onToggleVisible();
    expect(onToggleTickerTapeVisible).toHaveBeenCalledTimes(1);

    const logoLayer = layers.find((l) => l.id === "brandLogo");
    logoLayer?.onToggleVisible();
    expect(onToggleBrandLogoVisible).toHaveBeenCalledTimes(1);

    const badgeLayer = layers.find((l) => l.id === "badge");
    badgeLayer?.onToggleVisible();
    expect(onToggleBadgeVisible).toHaveBeenCalledTimes(1);

    const introLayer = layers.find((l) => l.id === "introBumper");
    introLayer?.onToggleVisible();
    expect(onToggleIntroBumperVisible).toHaveBeenCalledTimes(1);

    const outroLayer = layers.find((l) => l.id === "outroEndCard");
    outroLayer?.onToggleVisible();
    expect(onToggleOutroEndCardVisible).toHaveBeenCalledTimes(1);

    const backdropLayer = layers.find((l) => l.id === "backdrop");
    backdropLayer?.onToggleVisible();
    expect(onToggleBackdropVisible).toHaveBeenCalledTimes(1);
  });
});
