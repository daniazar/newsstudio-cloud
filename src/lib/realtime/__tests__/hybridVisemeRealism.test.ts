/**
 * src/lib/realtime/__tests__/hybridVisemeRealism.test.ts
 *
 * Verifies the hybrid realism architecture:
 * 1. LiveAnchorStageEngine auto-kinematics with disableMouthChanges=true (no 3D jaw/lip distortion)
 * 2. 60 FPS onMouthLandmark dispatch with screen-space coordinates
 * 3. Photorealistic 2D Affine / WebGL Codebook mouth compositing overlaid without 3D warps
 */

import { describe, it, expect, vi } from "vitest";
import { LiveAnchorStageEngine, LandmarkTarget, resolveBlendshape, resolveClusterByJawDescent } from "../liveAnchorStageEngine";
import { AcousticSentimentEngine } from "../acousticSentimentEngine";
import { STAGE_3_OCULAR_GAZE } from "../shaders/stages/stage3OcularGaze";
import { STAGE_4_MOUTH_EXPRESSIONS } from "../shaders/stages/stage4MouthExpressions";
import { STAGE_5E_MANDIBULAR_CODEBOOK } from "../shaders/stages/stage5EMandibularCodebook";



describe("Hybrid Realism & 60 FPS Landmark Tracking", () => {
  it("registers onMouthLandmark callback via options and setOnMouthLandmark", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;

    const mockCallback = vi.fn();
    const engine = new LiveAnchorStageEngine(canvas, null, {
      disableMouthChanges: true,
      onMouthLandmark: mockCallback,
    });

    expect(engine).toBeDefined();

    const secondCallback = vi.fn();
    engine.setOnMouthLandmark(secondCallback);
    expect((engine as any).onMouthLandmark).toBe(secondCallback);

    engine.dispose();
  });

  it("ensures disableMouthChanges zeroes out 3DMM mouth deformation parameters", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;

    const engine = new LiveAnchorStageEngine(canvas, null, {
      disableMouthChanges: true,
    });

    expect(engine.getDisableMouthChanges()).toBe(true);

    // Dynamic toggle
    engine.setDisableMouthChanges(false);
    expect(engine.getDisableMouthChanges()).toBe(false);

    engine.setDisableMouthChanges(true);
    expect(engine.getDisableMouthChanges()).toBe(true);

    engine.dispose();
  });

  it("calculates accurate screen-space landmarks from camera and head rotation", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1920;

    let receivedLandmark: LandmarkTarget | null = null;
    const engine = new LiveAnchorStageEngine(canvas, null, {
      disableMouthChanges: true,
      onMouthLandmark: (lm) => {
        receivedLandmark = lm;
      },
    });

    // Mock uniforms
    const mockUniforms = {
      mouthCenter: [0.51, 0.45] as [number, number],
      camPan: [0.0, 0.0] as [number, number],
      camZoom: 1.0,
      headRoll: -2.5,
    };

    // Calculate expected screen landmark coordinates
    const expectedCx = (mockUniforms.mouthCenter[0] + mockUniforms.camPan[0]) * canvas.width * mockUniforms.camZoom;
    const expectedCy = (mockUniforms.mouthCenter[1] + mockUniforms.camPan[1]) * canvas.height * mockUniforms.camZoom;

    expect(expectedCx).toBeCloseTo(0.51 * 1080);
    expect(expectedCy).toBeCloseTo(0.45 * 1920);

    engine.dispose();
  });

  it("exposes renderSingleFrame method on LiveAnchorStageEngine", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;

    const engine = new LiveAnchorStageEngine(canvas, null, {});
    expect(typeof engine.renderSingleFrame).toBe("function");
    // Should not throw even in headless / contextless environment
    expect(() => engine.renderSingleFrame()).not.toThrow();

    engine.dispose();
  });

  it("applies 3DMM yaw and pitch shifts unconditionally regardless of targetLandmark", () => {
    // Stage geometry
    const targetW = 1024;
    const targetH = 1024;
    const aspect = targetW / targetH;
    const hx = 0.5;
    const hy = 0.45;
    const normMx = 0.51;
    const normMy = 0.67;

    const testYawDeg = 25.0;
    const testPitchDeg = 15.0;
    const yawRad = (testYawDeg * Math.PI) / 180;
    const pitchRad = (testPitchDeg * Math.PI) / 180;

    // Both with and without targetLandmark, yawShift and pitchShift must be non-zero
    const yawShift = yawRad * 0.075 * (1.0 - Math.abs(normMx - hx) * 0.35);
    const pitchShift = pitchRad * 0.055 * (1.0 - Math.abs(normMy - hy) * 0.35);

    expect(yawShift).toBeGreaterThan(0.01);
    expect(pitchShift).toBeGreaterThan(0.005);

    // Rel coords
    const pivotY = hy + 0.15;
    const relX = (normMx + yawShift - hx) * aspect;
    const relY = normMy + pitchShift - pivotY;

    // Norm coords
    const normX = hx + (relX / aspect);
    const normY = pivotY + relY;

    const screenCx = normX * targetW;
    const screenCy = normY * targetH;

    // The mouth center must move with yaw and pitch
    expect(screenCx).toBeGreaterThan(normMx * targetW);
    expect(screenCy).toBeGreaterThan(normMy * targetH);
  });

  it("applies 3D perspective foreshortening to mouth dimensions under yaw and pitch", () => {
    const baseW = 160;
    const baseH = 50;

    // Under 45° yaw turn, mouth width should compress by cos(45°) ~ 0.707
    const yawDeg = 45;
    const yawRad = (yawDeg * Math.PI) / 180;
    const compressedW = baseW * Math.max(0.35, Math.cos(yawRad));
    expect(compressedW).toBeCloseTo(baseW * Math.SQRT1_2, 1);
    expect(compressedW).toBeLessThan(baseW);

    // Under extreme 90° turn, mouth width should clamp to 0.35 minimum
    const extremeYawRad = (90 * Math.PI) / 180;
    const clampedW = baseW * Math.max(0.35, Math.cos(extremeYawRad));
    expect(clampedW).toBeCloseTo(baseW * 0.35, 1);

    // Under 20° pitch nod, mouth height should compress by cos(20°) ~ 0.939
    const pitchDeg = 20;
    const pitchRad = (pitchDeg * Math.PI) / 180;
    const compressedH = baseH * Math.max(0.35, Math.cos(pitchRad));
    expect(compressedH).toBeLessThan(baseH);
    expect(compressedH).toBeGreaterThan(baseH * 0.9);
  });

  it("dispatches transformed screen landmarks from LiveAnchorStageEngine with targetLandmark present", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;

    let receivedLandmark: LandmarkTarget | null = null;
    const engine = new LiveAnchorStageEngine(canvas, null, {
      targetLandmark: { cx: 512, cy: 650, w: 100, h: 32, angle: 0 },
      onMouthLandmark: (lm) => {
        receivedLandmark = lm;
      },
    });

    // Mock WebGL and renderer pipeline so renderFrame proceeds in JSDOM
    (engine as any).gl = {
      enable: () => {},
      disable: () => {},
      viewport: () => {},
      clearColor: () => {},
      clear: () => {},
      bindTexture: () => {},
      blendFunc: () => {},
      deleteTexture: () => {},
    };
    (engine as any).renderer = {
      render: () => {},
      destroy: () => {},
    };
    (engine as any).videoTexture = {};

    // Disable procedural auto-motion for exact deterministic manual pose inspection
    engine.setAutoMotionActive(false);

    // 1. Neutral pose render
    engine.setManualPose({ headYaw: 0, headPitch: 0, headRoll: 0 });
    engine.renderSingleFrame();

    expect(receivedLandmark).not.toBeNull();
    const neutralCx = receivedLandmark!.cx;
    const neutralCy = receivedLandmark!.cy;
    const neutralW = receivedLandmark!.w;
    const neutralH = receivedLandmark!.h ?? 0;

    // 2. Rotate head with yaw = 25deg, pitch = 15deg
    engine.setManualPose({ headYaw: 25, headPitch: 15 });
    engine.renderSingleFrame();

    expect(receivedLandmark!.cx).not.toEqual(neutralCx);
    expect(receivedLandmark!.cy).not.toEqual(neutralCy);
    // Yaw shifts mouth horizontally
    expect(receivedLandmark!.cx).toBeGreaterThan(neutralCx);
    // Pitch shifts mouth vertically
    expect(receivedLandmark!.cy).toBeGreaterThan(neutralCy);
    // Foreshortening compresses width and height
    expect(receivedLandmark!.w).toBeLessThan(neutralW);
    expect(receivedLandmark!.h ?? 0).toBeLessThan(neutralH);
    expect(receivedLandmark!.yawDeg ?? 0).toBeCloseTo(25, 4);
    expect(receivedLandmark!.pitchDeg ?? 0).toBeCloseTo(15, 4);

    // 3. Continuous orbital yaw combines with active yaw
    engine.setContinuousOrbitalYaw(20);
    engine.renderSingleFrame();
    expect(receivedLandmark!.yawDeg ?? 0).toBeCloseTo(45, 4); // 20 + 25

    engine.dispose();
  });

  it("preserves baseline landmark position on rotated preset and combines base yaw with delta pose", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;

    let receivedLandmark: LandmarkTarget | null = null;
    // Preset with pre-rotated plate (e.g. ruby_25deg at cx: 389.9, cy: 621.4, yawDeg: -25)
    const basePresetLandmark = { cx: 389.9, cy: 621.4, w: 148.6, h: 68.0, angle: 0.93, yawDeg: -25.0, pitchDeg: 0.0 };
    const engine = new LiveAnchorStageEngine(canvas, null, {
      targetLandmark: basePresetLandmark,
      onMouthLandmark: (lm) => {
        receivedLandmark = lm;
      },
    });

    (engine as any).gl = {
      enable: () => {},
      disable: () => {},
      viewport: () => {},
      clearColor: () => {},
      clear: () => {},
      bindTexture: () => {},
      blendFunc: () => {},
      deleteTexture: () => {},
    };
    (engine as any).renderer = {
      render: () => {},
      destroy: () => {},
    };
    (engine as any).videoTexture = {};

    engine.setAutoMotionActive(false);

    // 1. With neutral manual pose, the mouth center should match the preset position without being displaced by base yaw
    engine.setManualPose({ headYaw: 0, headPitch: 0, headRoll: 0 });
    engine.renderSingleFrame();

    expect(receivedLandmark).not.toBeNull();
    // Mouth center stays close to preset position (within 2px camera breathing tolerance) without large baseline jump
    expect(Math.abs(receivedLandmark!.cx - basePresetLandmark.cx)).toBeLessThan(3.0);
    expect(Math.abs(receivedLandmark!.cy - basePresetLandmark.cy)).toBeLessThan(3.0);
    expect(Math.abs(receivedLandmark!.w - basePresetLandmark.w)).toBeLessThan(3.0);
    expect(Math.abs(receivedLandmark!.h! - basePresetLandmark.h)).toBeLessThan(3.0);
    // Dispatched yawDeg must reflect the plate's base angle (-25°) for codebook bank resolution
    expect(receivedLandmark!.yawDeg).toBeCloseTo(-25.0, 2);

    // 2. Dragging manual yaw by +10° turns head towards frontal, shifting mouth to the right
    engine.setManualPose({ headYaw: 10, headPitch: 0 });
    engine.renderSingleFrame();

    expect(receivedLandmark!.cx).toBeGreaterThan(basePresetLandmark.cx);
    // Combined effective yaw is -25 + 10 = -15°
    expect(receivedLandmark!.yawDeg).toBeCloseTo(-15.0, 2);

    // 3. Positive roll angle rotates screenAngle negatively to match 3DMM kinematics
    engine.setManualPose({ headYaw: 0, headPitch: 0, headRoll: 15 });
    engine.renderSingleFrame();
    expect(receivedLandmark!.angle).toBeLessThan(basePresetLandmark.angle);

    engine.dispose();
  });

  it("verifies yawShift does not scale inversely by aspect ratio", () => {
    const yawDeg = 20.0;
    const yawRad = (yawDeg * Math.PI) / 180;
    const normMx = 0.5;
    const hx = 0.5;
    const yawShift = yawRad * 0.075 * (1.0 - Math.abs(normMx - hx) * 0.35);
    // Under portrait aspect (e.g. 0.566), yawShift must remain uninflated in normalized space
    const aspectPortrait = 9 / 16;
    const oldDistortedShift = yawShift / aspectPortrait;
    expect(yawShift).toBeLessThan(oldDistortedShift);
    expect(yawShift).toBeCloseTo(yawRad * 0.075, 4);
  });

  it("scales u.jawOpen proportionally to aperture and jawDescentFactor without hardcoding viseme 47 to 1.0", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;

    let capturedUniforms: any = null;
    const engine = new LiveAnchorStageEngine(canvas, null, {
      targetLandmark: { cx: 517.8, cy: 687.4, w: 153.2, h: 61.2, angle: 0.78 },
    });

    (engine as any).gl = {
      enable: () => {},
      disable: () => {},
      viewport: () => {},
      clearColor: () => {},
      clear: () => {},
      bindTexture: () => {},
      blendFunc: () => {},
      deleteTexture: () => {},
    };
    (engine as any).renderer = {
      render: (u: any) => {
        capturedUniforms = { ...u };
      },
      destroy: () => {},
    };
    (engine as any).videoTexture = {};
    engine.setAutoMotionActive(false);

    // Viseme 47 with moderate aperture (ap = 11 -> rawJawDrop = 5.0) and jawDescentFactor = 1.0
    engine.setGeometricTuning({ jawDescentFactor: 1.0 });
    engine.setExplicitViseme(47, 47, 0.0, 1.0, 5.0);
    engine.renderSingleFrame();
    expect(capturedUniforms).not.toBeNull();
    expect(capturedUniforms.jawOpen).toBeCloseTo(0.5, 2);

    // Increasing jawDescentFactor to 1.5 scales jawOpen proportionally to 0.75
    engine.setGeometricTuning({ jawDescentFactor: 1.5 });
    engine.renderSingleFrame();
    expect(capturedUniforms.jawOpen).toBeCloseTo(0.75, 2);

    // Increasing jawDescentFactor to 2.4 clamps u.jawOpen strictly at <= 1.0 so chin never stretches past 1.0x
    engine.setExplicitViseme(47, 47, 0.0, 1.0, 7.0);
    engine.setGeometricTuning({ jawDescentFactor: 2.4 });
    engine.renderSingleFrame();
    expect(capturedUniforms.jawOpen).toBeCloseTo(1.0, 2);

    // Zero aperture produces zero jawOpen even on viseme 47
    engine.setExplicitViseme(47, 47, 0.0, 0.0, 0.0);
    engine.renderSingleFrame();
    expect(capturedUniforms.jawOpen).toBeCloseTo(0.0, 3);

    // Verify resolveClusterByJawDescent selects closed -> mid -> wide open codebook clusters without 2D stretching
    expect(resolveClusterByJawDescent(25, 5.52, 0.0).clusterId).toBe(0);
    expect(resolveClusterByJawDescent(25, 5.52, 0.5).clusterId).toBe(18);
    expect(resolveClusterByJawDescent(25, 5.52, 1.0).clusterId).toBe(25);
    expect(resolveClusterByJawDescent(25, 5.52, 2.4).clusterId).toBe(36);
    expect(resolveClusterByJawDescent(35, 12.22, 2.5).clusterId).toBe(47);

    // With preserveWidthTrack=true, scaling from a wide/neutral cluster (C26 at w=95.44) by 2.4x (~13.5px)
    // avoids the narrow puckered outlier C36 (w=76.27) and selects a neutral-width open cluster (C37 at w=89.26)
    expect(resolveClusterByJawDescent(26, 5.52, 2.4, { preserveWidthTrack: true }).clusterId).toBe(37);

    engine.dispose();
  });

  it("smooths precomputed video landmark tracks and resolves dictionary-keyed FSM tracks", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;

    const engine = new LiveAnchorStageEngine(canvas, null, {});
    const rawFrames: LandmarkTarget[] = [
      { cx: 500, cy: 680, w: 150, h: 60, angle: 0.0 },
      { cx: 510, cy: 682, w: 165, h: 66, angle: 2.0 }, // noisy frame spike
      { cx: 502, cy: 680, w: 150, h: 60, angle: 0.0 },
      { cx: 504, cy: 680, w: 150, h: 60, angle: 0.0 },
    ];

    const smoothed = (engine as any).smoothLandmarkTrack(rawFrames) as LandmarkTarget[];
    expect(smoothed.length).toBe(4);
    // Gaussian temporal filter attenuates single-frame width/angle spikes
    expect(smoothed[1].w).toBeLessThan(165);
    expect(smoothed[1].w).toBeGreaterThan(150);
    expect((smoothed[1].angle ?? 0)).toBeLessThan(2.0);

    // Also verifies dictionary-keyed FSM landmark resolution
    (engine as any).fsmLandmarksMap = {
      ruby_burgundy_m1_beat: smoothed,
    };
    const resolved = (engine as any).resolveClipLandmarksFromMap(
      "/avatars/attire/ruby_burgundy_m1_beat.mp4?t=123"
    );
    expect(resolved).not.toBeNull();
    expect(resolved!.length).toBe(4);

    engine.dispose();
  });

  it("includes anatomical lower-chin warp reach in Stage 4 and vertical mandibular mouth expansion in Stage 5E", () => {
    expect(STAGE_4_MOUTH_EXPRESSIONS).toContain("mouthDistSq < 38.0");
    expect(STAGE_4_MOUTH_EXPRESSIONS).toContain("float dispY_chin = -u_jawOpen * max(ry * 0.42, rx * 0.15) * chinWeight;");
    expect(STAGE_5E_MANDIBULAR_CODEBOOK).toContain("float dynamicDescentOffset = 0.0;");
    expect(STAGE_5E_MANDIBULAR_CODEBOOK).toContain("float mandibleStretch = 1.0;");
    expect(STAGE_5E_MANDIBULAR_CODEBOOK).toContain("vec2 casStep = vec2(0.62 / res.x, 0.62 / res.y);");
  });

  it("Phase 3: resolves blendshape priority hierarchy (Manual > Webcam > Autonomous)", () => {
    // 1. Auto mode when manual and webcam are null
    expect(resolveBlendshape(0.42, null, null, false)).toBeCloseTo(0.42, 4);
    // 2. Webcam overrides auto when webcamActive=true
    expect(resolveBlendshape(0.42, 0.78, null, true)).toBeCloseTo(0.78, 4);
    // 3. Webcam ignored when webcamActive=false
    expect(resolveBlendshape(0.42, 0.78, null, false)).toBeCloseTo(0.42, 4);
    // 4. Manual override beats both webcam and auto
    expect(resolveBlendshape(0.42, 0.78, 0.95, true)).toBeCloseTo(0.95, 4);
  });

  it("Phase 3: drives ConversationalTurnState ('listening', 'thinking') and manual FACS overrides", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;

    let capturedUniforms: any = null;
    const engine = new LiveAnchorStageEngine(canvas, null, {
      targetLandmark: { cx: 517.8, cy: 687.4, w: 153.2, h: 61.2, angle: 0.78 },
    });

    (engine as any).gl = {
      enable: () => {},
      disable: () => {},
      viewport: () => {},
      clearColor: () => {},
      clear: () => {},
      bindTexture: () => {},
      blendFunc: () => {},
      deleteTexture: () => {},
    };
    (engine as any).renderer = {
      render: (u: any) => {
        capturedUniforms = { ...u };
      },
      destroy: () => {},
    };
    (engine as any).videoTexture = {};
    engine.setAutoMotionActive(false);

    // 1. Listening turn state activates backchannel warm smile, brow lift, and silent lip compression
    engine.setConversationalState("listening");
    expect(engine.getConversationalState()).toBe("listening");
    engine.renderSingleFrame();
    expect(capturedUniforms.smileExpression).toBeGreaterThanOrEqual(0.12);
    expect(capturedUniforms.eyebrowRaise).toBeGreaterThanOrEqual(0.03);
    expect(capturedUniforms.lipCompression).toBeGreaterThanOrEqual(0.12);

    // 2. Thinking turn state activates cognitive gaze aversion, brow asymmetry, and mentalis chin raise
    engine.setConversationalState("thinking");
    expect(engine.getConversationalState()).toBe("thinking");
    engine.renderSingleFrame();
    expect(capturedUniforms.eyebrowAsymmetry).toBeGreaterThanOrEqual(0.05);
    expect(capturedUniforms.chinRaise).toBeGreaterThanOrEqual(0.10);
    expect(capturedUniforms.gazeY).toBeGreaterThan(0.1);

    // 3. Manual FACS overrides supersede autonomous channels and can be cleared back to auto
    engine.setFacsOverrides({ noseSneer: 0.65, cheekPuff: 0.55, duchenneTension: 0.80 });
    engine.renderSingleFrame();
    expect(capturedUniforms.noseSneer).toBeCloseTo(0.65, 2);
    expect(capturedUniforms.cheekPuff).toBeCloseTo(0.55, 2);
    expect(capturedUniforms.duchenneTension).toBeCloseTo(0.80, 2);

    engine.clearFacsOverrides();
    expect(Object.keys(engine.getFacsOverrides()).length).toBe(0);

    engine.dispose();
  });

  it("Phase 3: synthesizes targetChinRaise in AcousticSentimentEngine ('somber' & 'auto') and Stage 3/4/5E shaders", () => {
    const sentiment = new AcousticSentimentEngine();
    sentiment.setMode("somber");
    sentiment.setIntensity(1.0);
    // Run a few frames for exponential smoothing to advance
    let state = sentiment.update(null, false);
    for (let i = 0; i < 20; i++) {
      state = sentiment.update(null, false);
    }
    expect(state.modulation.chinRaise).toBeGreaterThan(0.01);

    // Stage 3 Ocular Gaze supports independent AU6/AU7 u_duchenneTension squint
    expect(STAGE_3_OCULAR_GAZE).toContain("max(u_smileExpression, u_duchenneTension)");
    // Stage 4 Mouth Expressions keeps paranasal (u_noseSneer), buccal (u_cheekPuff), and mentalis (u_chinRaise) active during neural codebook playback
    expect(STAGE_4_MOUTH_EXPRESSIONS).toContain("u_noseSneer > 0.001");
    expect(STAGE_4_MOUTH_EXPRESSIONS).toContain("dispY_chin += chinBossWeight * u_chinRaise * ry * 0.28;");
    // Stage 5E Mandibular Codebook computes base mouth position first, then applies all FACS warps (AU9, AU10, AU12, AU14, AU16, AU17, AU18, AU20, AU24, AU34)
    const basePosIdx = STAGE_5E_MANDIBULAR_CODEBOOK.indexOf("float patchPixelY = anchor.y + effRelY * scale;");
    const upperLipIdx = STAGE_5E_MANDIBULAR_CODEBOOK.indexOf("if (u_upperLipLift > 0.005 && dPatchY < 0.0)");
    const lowerLipIdx = STAGE_5E_MANDIBULAR_CODEBOOK.indexOf("if (u_lowerLipDepress > 0.005 && dPatchY > 0.0)");
    const chinRaiseIdx = STAGE_5E_MANDIBULAR_CODEBOOK.indexOf("patchPixelY += u_chinRaise * mentalisZone * 6.5 * scaleFactor;");
    expect(basePosIdx).toBeGreaterThan(0);
    expect(upperLipIdx).toBeGreaterThan(basePosIdx);
    expect(lowerLipIdx).toBeGreaterThan(basePosIdx);
    expect(chinRaiseIdx).toBeGreaterThan(basePosIdx);
  });

  it("maintains targetPresence === 1.0 during silence when codebook texture array is loaded and interpolates sub-frame visemeBlend across [0.05, 0.95]", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;

    let capturedUniforms: Record<string, unknown> | null = null;
    const engine = new LiveAnchorStageEngine(canvas, null, {
      targetLandmark: { cx: 517.8, cy: 687.4, w: 153.2, h: 61.2, angle: 0.78 },
    });

    const engineInternal = engine as unknown as {
      gl: Record<string, () => void>;
      renderer: { render: (u: Record<string, unknown>) => void; destroy: () => void };
      videoTexture: Record<string, unknown>;
      isVisemeArrayLoaded: boolean;
      visemeTextureArray: Record<string, unknown>;
      loadedClusterApertures: number[];
      loadedClusterWidths: number[];
    };

    engineInternal.gl = {
      enable: () => {},
      disable: () => {},
      viewport: () => {},
      clearColor: () => {},
      clear: () => {},
      bindTexture: () => {},
      blendFunc: () => {},
      deleteTexture: () => {},
    };
    engineInternal.renderer = {
      render: (u: Record<string, unknown>) => {
        capturedUniforms = { ...u };
      },
      destroy: () => {},
    };
    engineInternal.videoTexture = {};
    engineInternal.isVisemeArrayLoaded = true;
    engineInternal.visemeTextureArray = {};
    engineInternal.loadedClusterApertures = Array.from({ length: 256 }, (_, i) => i * 0.12);
    engineInternal.loadedClusterWidths = Array.from({ length: 256 }, () => 94.5);

    engine.setAutoMotionActive(false);
    engine.setSpeaking(false);

    // 1. In fallback mode with silence (isSpeaking=false, jawOpen=0), visemePresence stays 1.0 on Cluster 0
    engine.renderSingleFrame();
    expect(capturedUniforms).not.toBeNull();
    expect(capturedUniforms!.visemePresence).toBeCloseTo(1.0, 4);
    expect(capturedUniforms!.visemeLayerA).toBe(0);
    expect(capturedUniforms!.visemeLayerB).toBe(0);

    // 2. In timeline mode with 256-cluster entries, sub-frame export interpolates visemeBlend across [0.05, 0.95]
    const timeline = new Map();
    timeline.set(0, { clusterId: 0, clusterB: 0, blend: 0.72, aperture: 0.08, jawDrop: 0.0, presence: 1.0 });
    timeline.set(1, { clusterId: 0, clusterB: 210, blend: 0.85, aperture: 25.2, jawDrop: 9.5, presence: 1.0 });
    timeline.set(2, { clusterId: 210, clusterB: 245, blend: 0.72, aperture: 29.4, jawDrop: 10.0, presence: 1.0 });
    engine.setTimelineFrames(timeline);

    // Silent frame 0 (t = 0.0s -> frame 0.0)
    engine.setExportAudioTime(0.0);
    engine.renderSingleFrame();
    expect(capturedUniforms!.visemePresence).toBeCloseTo(1.0, 4);
    expect(capturedUniforms!.visemeLayerA).toBe(0);
    expect(capturedUniforms!.visemeLayerB).toBe(0);

    // Transition frame 1 at subFrameBlend = 0.0 (t = 0.04s -> frame 1.0)
    engine.setExportAudioTime(1.0 / 25.0);
    engine.renderSingleFrame();
    expect(capturedUniforms!.visemeLayerA).toBe(0);
    expect(capturedUniforms!.visemeLayerB).toBe(210);
    expect(capturedUniforms!.visemeBlend as number).toBeCloseTo(0.05, 2);

    // Transition frame 1 at subFrameBlend = 0.5 (t = 0.06s -> frame 1.5)
    engine.setExportAudioTime(1.5 / 25.0);
    engine.renderSingleFrame();
    expect(capturedUniforms!.visemeBlend as number).toBeCloseTo(0.50, 2);

    // Transition frame 1 near end of frame (frame 1.99)
    engine.setExportAudioTime(1.99 / 25.0);
    engine.renderSingleFrame();
    expect(capturedUniforms!.visemeBlend as number).toBeCloseTo(0.941, 2);

    // 3. Clear timeline and verify live/fallback speech remaps 48-cluster phonemes across the full 256-cluster codebook
    engine.setTimelineFrames(null);
    engine.setExportAudioTime(null);
    const onnxInternal = (engine as unknown as {
      onnxEngine: {
        extractFrame: (analyser: unknown, fft: unknown, speaking: boolean, now: number) => Record<string, unknown>;
      };
    }).onnxEngine;
    const origExtractFrame = onnxInternal.extractFrame.bind(onnxInternal);
    onnxInternal.extractFrame = (_a, _f, speaking, now) => {
      const base = origExtractFrame(_a, _f, speaking, now);
      if (speaking) {
        return { ...base, jawOpen: 0.75, dominantViseme: "aa" };
      }
      return { ...base, jawOpen: 0.0, dominantViseme: "sil" };
    };

    engine.setSpeaking(true);
    engine.renderSingleFrame();
    expect(capturedUniforms!.visemePresence).toBeCloseTo(1.0, 4);
    expect(capturedUniforms!.visemeLayerB as number).toBeGreaterThan(100);

    // Advance enough frames in silence for visemeBlendFactor to reach 1.0 and sync visemeLayerA = 0
    engine.setSpeaking(false);
    for (let i = 0; i < 42; i++) {
      engine.renderSingleFrame();
    }
    expect(capturedUniforms!.visemePresence).toBeCloseTo(1.0, 4);
    expect(capturedUniforms!.visemeLayerA).toBe(0);
    expect(capturedUniforms!.visemeLayerB).toBe(0);

    engine.dispose();
  });

  it("displays explicitly selected small-aperture visemes (#0..#10) instead of falling back to the raw base mouth, and guards against commissure bleed", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;

    let capturedUniforms: Record<string, unknown> | null = null;
    const engine = new LiveAnchorStageEngine(canvas, null, {
      targetLandmark: { cx: 523.4, cy: 687.4, w: 193.8, h: 66.28, angle: 0.0 },
    });

    const engineInternal = engine as unknown as {
      gl: Record<string, () => void>;
      renderer: { render: (u: Record<string, unknown>) => void; destroy: () => void };
      videoTexture: Record<string, unknown>;
      isVisemeArrayLoaded: boolean;
      visemeTextureArray: Record<string, unknown>;
      loadedClusterApertures: number[];
      loadedClusterWidths: number[];
    };

    engineInternal.gl = {
      enable: () => {},
      disable: () => {},
      viewport: () => {},
      clearColor: () => {},
      clear: () => {},
      bindTexture: () => {},
      blendFunc: () => {},
      deleteTexture: () => {},
    };
    engineInternal.renderer = {
      render: (u: Record<string, unknown>) => {
        capturedUniforms = { ...u };
      },
      destroy: () => {},
    };
    engineInternal.videoTexture = {};
    engineInternal.isVisemeArrayLoaded = true;
    engineInternal.visemeTextureArray = {};
    // Match Ruby's 256-cluster aperture curve where #0..#10 have apertures 0.08..0.1999 (<= 0.2px)
    engineInternal.loadedClusterApertures = Array.from({ length: 256 }, (_, i) =>
      i <= 2 ? 0.08 : i <= 10 ? 0.08 + (i - 2) * 0.015 : 0.21 + (i - 11) * 0.12
    );
    engineInternal.loadedClusterWidths = Array.from({ length: 256 }, (_, i) =>
      i === 1 ? 64.75 : i === 2 ? 78.67 : i === 9 ? 67.2 : 84.0
    );

    engine.setAutoMotionActive(false);

    // Selecting Cluster #0 (resting codebook mouth, jawDrop = 0.0, presence = 1.0) must keep visemePresence = 1.0
    engine.setExplicitViseme(0, 0, 1.0, 1.0, 0.0);
    engine.renderSingleFrame();
    expect(capturedUniforms!.visemePresence).toBeCloseTo(1.0, 4);
    expect(capturedUniforms!.visemeLayerA).toBe(0);

    // Selecting Clusters #1..#10 (small apertures <= 0.2px) must render each distinct cluster with visemePresence = 1.0
    for (const cid of [1, 2, 5, 9, 10]) {
      const ap = engineInternal.loadedClusterApertures[cid];
      const jawDrop = (ap / 22.0) * 10.0;
      engine.setExplicitViseme(cid, cid, 1.0, 1.0, jawDrop);
      engine.renderSingleFrame();
      expect(capturedUniforms!.visemePresence).toBeCloseTo(1.0, 4);
      expect(capturedUniforms!.visemeLayerA).toBe(cid);
      expect(capturedUniforms!.visemeLayerB).toBe(cid);
    }

    // Even under non-unity jawDescentFactor (e.g. 0.98, 0.85, 0.50), small-aperture cluster #1 (narrow 64.75px) is preserved and not snapped to #0
    for (const jawFactor of [0.98, 0.85, 0.5]) {
      engine.setGeometricTuning({ jawDescentFactor: jawFactor });
      engine.setExplicitViseme(1, 1, 1.0, 1.0, (0.08 / 22.0) * 10.0);
      engine.renderSingleFrame();
      expect(capturedUniforms!.visemePresence).toBeCloseTo(1.0, 4);
      expect(capturedUniforms!.visemeLayerA).toBe(1);
    }

    // Setting jawDescentFactor to 0.0 suppresses codebook overlay cleanly
    engine.setGeometricTuning({ jawDescentFactor: 0.0 });
    engine.renderSingleFrame();
    expect(capturedUniforms!.visemePresence).toBeCloseTo(0.0, 4);

    // Shader commissure bleed, nasolabial preservation, pucker sign, and vermilion-masked sulci checks
    expect(STAGE_5E_MANDIBULAR_CODEBOOK).toContain("restingCommissureZone");
    expect(STAGE_5E_MANDIBULAR_CODEBOOK).toContain("safeBaseSkinGate");
    expect(STAGE_5E_MANDIBULAR_CODEBOOK).toContain("1.0 + u_lipPucker * widthEnvelope * 0.22 - u_lipWidth * widthEnvelope * 0.16");
    expect(STAGE_5E_MANDIBULAR_CODEBOOK).toContain("float sulcusMask =");
    expect(STAGE_4_MOUTH_EXPRESSIONS).toContain("mouthDistSq < 1.32");

    engine.dispose();
  });

  it("preserves 512x512 canonicalAnchor (cx0=256, cy0=220, w0=189) when loading Ultra-HD mouth_only codebooks", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 1024;

    const engine = new LiveAnchorStageEngine(canvas, null);

    const engineInternal = engine as unknown as {
      gl: Record<string, unknown> | null;
      visemeCodebookMode: string;
      uploadCodebookTextureArray: () => Promise<{ texArray: unknown; normalTexArray: null }>;
      codebookResolution: [number, number];
      codebookAnchor: [number, number];
      codebookCanonicalW0: number;
      loadVisemeCodebook: (personaId?: string, mediaSrc?: string, explicitCodebookUrl?: string) => Promise<void>;
    };

    engineInternal.visemeCodebookMode = "mouth_only";

    engineInternal.gl = {
      deleteTexture: vi.fn(),
      deleteBuffer: vi.fn(),
      deleteVertexArray: vi.fn(),
      deleteProgram: vi.fn(),
    };
    engineInternal.uploadCodebookTextureArray = vi.fn().mockResolvedValue({
      texArray: {},
      normalTexArray: null,
    });

    const origFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        formatVersion: "2.0_atlas",
        avatarId: "ruby",
        resolution: [512, 512],
        versionType: "mouth_only",
        highFidelityEngine: "ditto-spade-512-mouth_only",
        canonicalAnchor: { cx0: 256.0, cy0: 220.0, w0: 189.0, h0: 61.12, theta0Deg: 0.0 },
        atlasGrid: { cols: 16, rows: 16, patchWidth: 512, patchHeight: 512 },
        visemes: [{ clusterId: 0, aperture: 0.08, width: 84.0 }],
      }),
    }) as unknown as typeof fetch;

    try {
      await engineInternal.loadVisemeCodebook(
        "ruby",
        "/avatars/ruby.png",
        "/assets/avatars/visemes/ruby_512_test_ditto_codebook.json"
      );
      expect(engineInternal.codebookResolution).toEqual([512, 512]);
      expect(engineInternal.codebookAnchor).toEqual([256.0, 220.0]);
      expect(engineInternal.codebookCanonicalW0).toBeCloseTo(189.0, 3);
    } finally {
      globalThis.fetch = origFetch;
      engineInternal.gl = null;
      engine.dispose();
    }
  });
});



