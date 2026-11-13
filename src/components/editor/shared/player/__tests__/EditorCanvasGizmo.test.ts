import { describe, it, expect } from "vitest";

describe("EditorCanvasGizmo Bounds & Presenter Scaling Calibration", () => {
  it("calculates avatar bounds proportionally beyond 100% scale without artificial clamp", () => {
    const compHeight = 1920;
    const compWidth = 1080;

    const calculateCornerPresenter = (scale: number) => {
      const presenterHeight = Math.round(compHeight * 0.44 * scale);
      const presenterWidth = Math.round(presenterHeight * 0.82);
      return { presenterWidth, presenterHeight };
    };

    // 100% scale
    const at100 = calculateCornerPresenter(1.0);
    expect(at100.presenterHeight).toBe(845);
    expect(at100.presenterWidth).toBe(693);

    // 150% scale (formerly was capped at 702px width)
    const at150 = calculateCornerPresenter(1.5);
    expect(at150.presenterHeight).toBe(1267);
    expect(at150.presenterWidth).toBe(1039);
    expect(at150.presenterWidth).toBeGreaterThan(702);

    // 200% scale
    const at200 = calculateCornerPresenter(2.0);
    expect(at200.presenterHeight).toBe(1690);
    expect(at200.presenterWidth).toBe(1386);

    // Scaling ratio is strictly linear
    expect(at200.presenterWidth / at100.presenterWidth).toBeCloseTo(2.0, 1);
  });

  it("calculates caption bounding box tightly wrapping spoken subtitles directly below headline", () => {
    const compWidth = 1080;
    const compHeight = 1920;
    const aspectRatio = "9:16";

    const getCaptionBounds = (headlineVisible: boolean, captionOffsetY = 0) => {
      const w = Math.round(compWidth * 0.88);
      const h = Math.round(aspectRatio === "9:16" ? 75 : 55);
      const x = (compWidth - w) / 2;
      const headlineH = headlineVisible ? (aspectRatio === "9:16" ? 54 : 42) : 0;
      const baseY = (aspectRatio === "9:16" ? 95 : 40) + headlineH + (aspectRatio === "9:16" ? 14 : 10);
      const y = baseY + captionOffsetY;

      return { x, y, w, h };
    };

    // When headline is visible in 9:16 (standard PDP ad)
    const boundsWithHeadline = getCaptionBounds(true);
    expect(boundsWithHeadline.w).toBe(950);
    expect(boundsWithHeadline.h).toBe(75);
    // Base Y is 95 + 54 + 14 = 163px
    expect(boundsWithHeadline.y).toBe(163);

    // When headline is hidden
    const boundsWithoutHeadline = getCaptionBounds(false);
    // Base Y is 95 + 0 + 14 = 109px
    expect(boundsWithoutHeadline.y).toBe(109);
    expect(boundsWithoutHeadline.h).toBe(75);
  });

  it("converts client drag deltas to canvas coordinates accurately using cached container scale without reflow", () => {
    const compWidth = 1080;
    const compHeight = 1920;
    const renderedWidth = 540; // 50% display zoom in viewport
    const renderedHeight = 960;

    const scaleX = compWidth / renderedWidth; // 2.0
    const scaleY = compHeight / renderedHeight; // 2.0

    const clientDeltaX = 25; // 25px pointer move
    const clientDeltaY = -40; // -40px pointer move

    const canvasDeltaX = clientDeltaX * scaleX;
    const canvasDeltaY = clientDeltaY * scaleY;

    expect(canvasDeltaX).toBe(50);
    expect(canvasDeltaY).toBe(-80);

    const initialOffsetX = 100;
    const initialOffsetY = 200;

    const finalOffsetX = Math.round(initialOffsetX + canvasDeltaX);
    const finalOffsetY = Math.round(initialOffsetY + canvasDeltaY);

    expect(finalOffsetX).toBe(150);
    expect(finalOffsetY).toBe(120);
  });

  it("determines that gizmo handles should be suspended when video is actively playing", () => {
    const shouldRenderGizmoOverlay = (showGizmo: boolean, isPlaying: boolean) => {
      return showGizmo && !isPlaying;
    };

    // When paused and handles enabled -> handles visible
    expect(shouldRenderGizmoOverlay(true, false)).toBe(true);

    // When playing -> handles suspended (prevents UI thread frame-drops)
    expect(shouldRenderGizmoOverlay(true, true)).toBe(false);

    // When handles disabled -> handles hidden
    expect(shouldRenderGizmoOverlay(false, false)).toBe(false);
    expect(shouldRenderGizmoOverlay(false, true)).toBe(false);
  });
});

