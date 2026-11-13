import { describe, it, expect, beforeEach } from "vitest";
import { WebglLipDetector } from "@/lib/realtime/webglLipDetector";
import { MouthTracker } from "@/lib/realtime/mouthTracker";
import { drawLandmarks2D } from "@/lib/realtime/liveAnchorStageEngine";

describe("Dynamic Face Tracking & Stale Landmark Elimination", () => {
  let detector: WebglLipDetector;
  let tracker: MouthTracker;

  beforeEach(() => {
    detector = new WebglLipDetector("ruby");
    tracker = new MouthTracker("ruby");
  });

  it("initializes without preserved landmarks until face is detected", () => {
    const res = detector.detect({} as any, "");
    expect(res.landmarks68).toBeUndefined();
    expect((detector as any).hasAcquiredFace).toBe(false);
  });

  it("clears cached landmarks and resets acquired face when clearMedia() is called", () => {
    // Simulate an acquired face from an image
    (detector as any).hasAcquiredFace = true;
    (detector as any).targetLandmarks68 = new Float32Array(136).fill(0.65);
    (detector as any).cachedResult.landmarks68 = (detector as any).targetLandmarks68;
    (detector as any).cachedResult.confidence = 0.99;

    expect(detector.detect({} as any, "").landmarks68).toBeDefined();

    // Now clear media (simulating switch from image to video)
    detector.clearMedia();

    const clearedRes = detector.detect({} as any, "");
    expect(clearedRes.landmarks68).toBeUndefined();
    expect((detector as any).hasAcquiredFace).toBe(false);
  });

  it("automatically detects media source URL switch and clears stale image landmarks", () => {
    // Simulate an acquired face on an image
    (detector as any).lastMediaSrc = "/avatars/ruby.png";
    (detector as any).hasAcquiredFace = true;
    (detector as any).targetLandmarks68 = new Float32Array(136).fill(0.65);

    // Call detect with a new video URL
    const videoSrc = "/assets/action_loops/ruby_master_suite/ruby_idle.mp4";
    const res = detector.detect({} as any, videoSrc);

    // Old image landmarks must be immediately cleared, NOT preserved!
    expect(res.landmarks68).toBeUndefined();
    expect((detector as any).hasAcquiredFace).toBe(false);
  });

  it("instantly snaps to new detected face coordinates on first detection after media change", () => {
    const videoSrc = "/assets/action_loops/ruby_idle.mp4";
    // 1. Media is presented
    detector.detect({} as any, videoSrc);
    expect((detector as any).needsSnap).toBe(true);

    // 2. Simulate worker returning detection for a video face in top third (y = 0.22)
    (detector as any).onWorkerResult({
      success: true,
      x: 0.505,
      y: 0.224,
      radiusX: 0.055,
      radiusY: 0.019,
      angle: 0.02,
      headCenter: [0.505, 0.198],
      headRadius: [0.168, 0.238],
      leftEyeCenter: [0.458, 0.162],
      rightEyeCenter: [0.552, 0.162],
      landmarks68: new Float32Array(136).fill(0.22),
    });

    // Verify it snapped instantly (smooth values equal target values immediately, no 30-frame lag)
    expect((detector as any).smoothY).toBeCloseTo(0.224, 3);
    expect((detector as any).smoothHeadCy).toBeCloseTo(0.198, 3);
    expect((detector as any).needsSnap).toBe(false);

    // 3. Next frame with same media source has acquired face
    const res = detector.detect({} as any, videoSrc);
    expect(res.confidence).toBe(0.99);
    expect(res.landmarks68).toBeDefined();
    expect(res.landmarks68![0]).toBeCloseTo(0.22, 2);
  });

  it("MouthTracker clears landmarks on clearMedia()", () => {
    (tracker as any).cachedMouth.landmarks68 = new Float32Array(136).fill(0.64);
    (tracker as any).cachedMouth.confidence = 0.95;

    tracker.clearMedia();

    expect((tracker as any).cachedMouth.landmarks68).toBeUndefined();
    expect((tracker as any).cachedMouth.confidence).toBe(0.0);
  });

  it("accurately computes multi-point facial consensus rotation from lips, eyes, and nose landmarks", () => {
    const aspect = 544 / 960; // 0.5667 portrait aspect
    const tiltDeg = -10.0;
    const tiltRad = (tiltDeg * Math.PI) / 180;
    const cosT = Math.cos(tiltRad);
    const sinT = Math.sin(tiltRad);

    // Construct a tilted 68-point landmark array centered at (0.5, 0.5)
    const lm = new Float32Array(136);
    const setPoint = (idx: number, unrotatedRelX: number, unrotatedRelY: number) => {
      // In normalized coords, x distance is unrotatedRelX / aspect
      const rx = (unrotatedRelX * cosT - unrotatedRelY * sinT) / aspect;
      const ry = unrotatedRelX * sinT + unrotatedRelY * cosT;
      lm[idx * 2] = 0.5 + rx;
      lm[idx * 2 + 1] = 0.5 + ry;
    };

    // Mouth corners: 48 (outer L: -0.06), 54 (outer R: +0.06), 60 (inner L: -0.05), 64 (inner R: +0.05)
    setPoint(48, -0.06, 0.0);
    setPoint(54, 0.06, 0.0);
    setPoint(60, -0.05, 0.0);
    setPoint(64, 0.05, 0.0);

    // Eyes: Right eye 36..41 (-0.08 relX, -0.15 relY), Left eye 42..47 (+0.08 relX, -0.15 relY)
    for (let i = 36; i <= 41; i++) setPoint(i, -0.08, -0.15);
    for (let i = 42; i <= 47; i++) setPoint(i, 0.08, -0.15);

    // Nose base: 31 (-0.025 relX, -0.05 relY), 35 (+0.025 relX, -0.05 relY)
    setPoint(31, -0.025, -0.05);
    setPoint(35, 0.025, -0.05);

    // Compute consensus orientation
    const cornerLx = (lm[48 * 2] + lm[60 * 2]) * 0.5;
    const cornerLy = (lm[48 * 2 + 1] + lm[60 * 2 + 1]) * 0.5;
    const cornerRx = (lm[54 * 2] + lm[64 * 2]) * 0.5;
    const cornerRy = (lm[54 * 2 + 1] + lm[64 * 2 + 1]) * 0.5;
    const mdx = (cornerRx - cornerLx) * aspect;
    const mdy = cornerRy - cornerLy;
    const lipAngle = Math.atan2(mdy, mdx);

    let sumLx = 0, sumLy = 0;
    for (let i = 36; i <= 41; i++) {
      sumLx += lm[i * 2];
      sumLy += lm[i * 2 + 1];
    }
    let sumRx = 0, sumRy = 0;
    for (let i = 42; i <= 47; i++) {
      sumRx += lm[i * 2];
      sumRy += lm[i * 2 + 1];
    }
    const edx = ((sumRx / 6) - (sumLx / 6)) * aspect;
    const edy = (sumRy / 6) - (sumLy / 6);
    const eyeAngle = Math.atan2(edy, edx);

    const ndx = (lm[35 * 2] - lm[31 * 2]) * aspect;
    const ndy = lm[35 * 2 + 1] - lm[31 * 2 + 1];
    const noseAngle = Math.atan2(ndy, ndx);

    const consensusAngle = lipAngle * 0.65 + eyeAngle * 0.20 + noseAngle * 0.15;

    expect(lipAngle).toBeCloseTo(tiltRad, 3);
    expect(eyeAngle).toBeCloseTo(tiltRad, 3);
    expect(noseAngle).toBeCloseTo(tiltRad, 3);
    expect(consensusAngle).toBeCloseTo(tiltRad, 3);
  });

  it("reflects expression sliders (jawOpen, browLift, blinks) in 2D tracking mesh", () => {
    const recordedArcs: Array<{ x: number; y: number }> = [];
    const mockCtx = {
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      arc: (x: number, y: number) => {
        recordedArcs.push({ x, y });
      },
      fill: () => {},
      save: () => {},
      restore: () => {},
      clearRect: () => {},
    } as unknown as CanvasRenderingContext2D;

    const testLm = new Float32Array(136).fill(0.5);
    testLm[38 * 2 + 1] = 0.47; // Anatomical upper eyelid is positioned above eye center 0.50

    const baseTracked = {
      x: 0.5,
      y: 0.6,
      radiusX: 0.06,
      radiusY: 0.025,
      confidence: 0.95,
      headCenter: [0.5, 0.45] as [number, number],
      headRadius: [0.25, 0.32] as [number, number],
      leftEyeCenter: [0.44, 0.38] as [number, number],
      rightEyeCenter: [0.56, 0.38] as [number, number],
      landmarks68: testLm,
    };

    const neutralCalib = {
      eyeYOffset: 0,
      eyeSpacingScale: 1.0,
      browYOffset: 0,
      noseBaseYOffset: 0,
      mouthYOffset: 0,
      mouthWidthScale: 1.0,
      mouthHeightScale: 1.0,
      jawContourScale: 1.0,
    };

    // 1. Render neutral frame
    const neutralFrame = {
      jawOpen: 0,
      lipWidth: 0,
      lipPucker: 0,
      lipCompression: 0,
      eyebrowRaise: 0,
      eyebrowFurrow: 0,
      smileExpression: 0,
    } as any;

    recordedArcs.length = 0;
    drawLandmarks2D(mockCtx, baseTracked as any, neutralFrame, neutralCalib, 0, 0, 1000, 1000, 0, 0, 0, 1.0, 0, 0);
    const neutralPoints = [...recordedArcs];

    // 2. Render open jaw frame
    const openJawFrame = {
      ...neutralFrame,
      jawOpen: 0.85,
    };
    recordedArcs.length = 0;
    drawLandmarks2D(mockCtx, baseTracked as any, openJawFrame, neutralCalib, 0, 0, 1000, 1000, 0, 0, 0, 1.0, 0, 0);
    const openJawPoints = [...recordedArcs];

    // Chin point (8) must move downwards (increasing Y)
    expect(openJawPoints[8].y).toBeGreaterThan(neutralPoints[8].y);

    // Outer lower lip (57) and inner lower lip (66) must move downwards (increasing Y)
    expect(openJawPoints[57].y).toBeGreaterThan(neutralPoints[57].y);
    expect(openJawPoints[66].y).toBeGreaterThan(neutralPoints[66].y);

    // Outer upper lip (51) and inner upper lip (62) must lift upwards (decreasing Y)
    expect(openJawPoints[51].y).toBeLessThan(neutralPoints[51].y);
    expect(openJawPoints[62].y).toBeLessThan(neutralPoints[62].y);

    // 3. Render raised eyebrow frame
    const raisedBrowFrame = {
      ...neutralFrame,
      eyebrowRaise: 0.90,
    };
    recordedArcs.length = 0;
    drawLandmarks2D(mockCtx, baseTracked as any, raisedBrowFrame, neutralCalib, 0, 0, 1000, 1000, 0, 0, 0, 1.0, 0, 0);
    const raisedBrowPoints = [...recordedArcs];

    // Eyebrow center (19 right brow, 24 left brow) must move upwards (decreasing Y)
    expect(raisedBrowPoints[19].y).toBeLessThan(neutralPoints[19].y);
    expect(raisedBrowPoints[24].y).toBeLessThan(neutralPoints[24].y);

    // 4. Render blink frame
    recordedArcs.length = 0;
    drawLandmarks2D(mockCtx, baseTracked as any, neutralFrame, neutralCalib, 1.0, 1.0, 1000, 1000, 0, 0, 0, 1.0, 0, 0);
    const blinkPoints = [...recordedArcs];

    // Right upper eyelid (point 38) must move downwards toward eye center (increasing Y)
    expect(blinkPoints[38].y).toBeGreaterThan(neutralPoints[38].y);
  });
});
