import { describe, it, expect, vi } from "vitest";
import { AffineMouthCompositor, CANONICAL_FRAME_0_ANCHOR } from "../affineMouthCompositor";

describe("AffineMouthCompositor - Conformal Isotropic Alignment", () => {
  it("verifies canonical constants are locked to Ruby anatomy (W0=94.5, H0=30.56)", () => {
    expect(CANONICAL_FRAME_0_ANCHOR.W0).toBe(94.50);
    expect(CANONICAL_FRAME_0_ANCHOR.H0).toBe(30.56);
    expect(CANONICAL_FRAME_0_ANCHOR.theta0Rad).toBeCloseTo(-2.87 * (Math.PI / 180.0), 4);
  });

  it("applies exact conformal transform matrix with zero vertical elongation (sx = sy)", () => {
    const compositor = new AffineMouthCompositor();

    let setTransformArgs: number[] = [];
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn((m00, m10, m01, m11, m02, m12) => {
        setTransformArgs = [m00, m10, m01, m11, m02, m12];
      }),
      drawImage: vi.fn(),
      globalAlpha: 1.0,
    } as unknown as CanvasRenderingContext2D;

    const mockBitmap = {} as CanvasImageSource;
    const landmark = {
      cx: 551.88,
      cy: 438.19,
      w: 94.50,
      angle: -3.98,
    };

    compositor.render(mockCtx, mockBitmap, null, landmark, 0, 1.0, {
      canonicalAnchor: {
        cx0: 128.0,
        cy0: 110.0,
        w0: 94.50,
        h0: 30.56,
        theta0Deg: -2.87,
      },
      isFullFace: true,
    });

    expect(mockCtx.setTransform).toHaveBeenCalled();
    const [m00, m10, m01, m11, m02, m12] = setTransformArgs;

    // For conformal transform: m00^2 + m10^2 should equal m01^2 + m11^2 (isotropic scaling s^2)
    const scaleX = Math.sqrt(m00 * m00 + m10 * m10);
    const scaleY = Math.sqrt(m01 * m01 + m11 * m11);
    expect(scaleX).toBeCloseTo(1.0, 3);
    expect(scaleY).toBeCloseTo(1.0, 3);
    expect(scaleY / scaleX).toBeCloseTo(1.0, 5); // Zero vertical elongation!

    // Dot product between columns must be 0 (orthogonality / zero shear)
    const dotProduct = m00 * m01 + m10 * m11;
    expect(dotProduct).toBeCloseTo(0.0, 5);

    // Verify canonical anchor (CX0, CY0) = (128, 110) maps exactly to target (551.88, 438.19)
    const mappedX = m00 * 128.0 + m01 * 110.0 + m02;
    const mappedY = m10 * 128.0 + m11 * 110.0 + m12;
    expect(mappedX).toBeCloseTo(landmark.cx, 2);
    expect(mappedY).toBeCloseTo(landmark.cy, 2);
  });

  it("strictly suppresses ROI bounding box overlay when showBoundingBoxes is false or omitted", () => {
    const compositor = new AffineMouthCompositor();
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      strokeRect: vi.fn(),
      globalAlpha: 1.0,
      strokeStyle: "",
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;

    const mockBitmap = {} as CanvasImageSource;
    const landmark = { cx: 550, cy: 440, w: 94, h: 32, angle: 0 };

    // Test with showBoundingBoxes: false
    compositor.render(mockCtx, mockBitmap, null, landmark, 0, 1.0, {
      showBoundingBoxes: false,
    });
    expect(mockCtx.strokeRect).not.toHaveBeenCalled();

    // Test with omitted option
    compositor.render(mockCtx, mockBitmap, null, landmark, 0, 1.0, {});
    expect(mockCtx.strokeRect).not.toHaveBeenCalled();
  });

  it("renders ROI bounding box with cyan styling when showBoundingBoxes is explicitly true", () => {
    const compositor = new AffineMouthCompositor();
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      strokeRect: vi.fn(),
      globalAlpha: 1.0,
      strokeStyle: "",
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;

    const mockBitmap = {} as CanvasImageSource;
    const landmark = { cx: 550, cy: 440, w: 94, h: 32, angle: 0 };

    compositor.render(mockCtx, mockBitmap, null, landmark, 0, 1.0, {
      showBoundingBoxes: true,
      offsetX: 10,
      offsetY: -5,
    });

    expect(mockCtx.strokeRect).toHaveBeenCalledTimes(1);
    expect(mockCtx.strokeStyle).toBe("#06b6d4");
    expect(mockCtx.lineWidth).toBe(2);
    // targetCX = 550 + 10 = 560; targetW = 94; left = 560 - 47 = 513
    // targetCY = 440 - 5 = 435; targetH = 32; top = 435 - 16 = 419
    expect(mockCtx.strokeRect).toHaveBeenCalledWith(513, 419, 94, 32);
  });

  it("anchors upper lip to cranium during jaw opening (18% philtrum compliance)", () => {
    const compositor = new AffineMouthCompositor();
    let setTransformArgs: number[] = [];
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn((...args: number[]) => {
        setTransformArgs = args;
      }),
      drawImage: vi.fn(),
      globalAlpha: 1.0,
    } as unknown as CanvasRenderingContext2D;

    const mockBitmap = {} as CanvasImageSource;
    const landmark = { cx: 500, cy: 400, w: 94.5, angle: 0 };
    const jawDrop = 10.0; // 10px mandibular drop

    compositor.render(mockCtx, mockBitmap, null, landmark, jawDrop, 1.0, {
      canonicalAnchor: { cx0: 123.84, cy0: 189.57, w0: 94.5, h0: 30.56, theta0Deg: 0 },
      isFullFace: false,
    });

    const [m00, m10, m01, m11, m02, m12] = setTransformArgs;
    // Mapped Y at canonical stomion (123.84, 189.57):
    const mappedY = m10 * 123.84 + m11 * 189.57 + m12;
    // Upper lip stomion shifts by only 18% (1.8px) instead of the full 10px:
    expect(mappedY).toBeCloseTo(400 + 10.0 * 0.18, 2);
  });

  it("applies procedural mandibular chin descent across horizontal slices", () => {
    const compositor = new AffineMouthCompositor();
    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const mockSource = {} as CanvasImageSource;
    const landmark = { cx: 500, cy: 400, w: 100, h: 40, angle: 0 };

    compositor.applyMandibularChinDescent(mockCtx, mockSource, landmark, 8.0, {
      isFullFace: false,
    });

    // 6 slices drawn
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(6);
    expect(mockCtx.save).toHaveBeenCalledTimes(1);
    expect(mockCtx.restore).toHaveBeenCalledTimes(1);
  });

  it("eliminates ghosting by snapping dominant viseme to 100% opacity at transition boundaries", () => {
    const compositor = new AffineMouthCompositor();
    const drawnAlphas: number[] = [];

    const mockCtx = {
      save: vi.fn(),
      restore: vi.fn(),
      setTransform: vi.fn(),
      drawImage: vi.fn(),
      globalAlpha: 1.0,
    } as unknown as CanvasRenderingContext2D;

    const mockMorphCanvas = {
      width: 256,
      height: 256,
      getContext: vi.fn(() => ({
        clearRect: vi.fn(),
        drawImage: vi.fn(),
        set globalAlpha(val: number) {
          drawnAlphas.push(val);
        },
      })),
    };
    (compositor as unknown as { morphCanvas: unknown }).morphCanvas = mockMorphCanvas;
    (compositor as unknown as { morphCtx: unknown }).morphCtx = mockMorphCanvas.getContext();

    const patchA = { width: 256, height: 256 } as CanvasImageSource;
    const patchB = { width: 256, height: 256 } as CanvasImageSource;
    const landmark = { cx: 500, cy: 400, w: 94.5, angle: 0 };

    // At progress = 0.85 (t >= 0.72 established), incoming patch is drawn cleanly at 1.0 without ghosting
    compositor.render(mockCtx, patchB, null, landmark, 0, 1.0, {
      prevPatchBitmap: patchA,
      transitionProgress: 0.85,
      antiGhosting: true,
    });

    expect(drawnAlphas).toContain(1.0);
  });
});


