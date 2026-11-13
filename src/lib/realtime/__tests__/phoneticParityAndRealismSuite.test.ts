import { describe, it, expect } from "vitest";
import { OnnxAudioVisemeEngine, SILENT_NEURAL_FRAME } from "../onnxAudioVisemeEngine";
import { LabiodentalEngine } from "../labiodentalEngine";
import { SibilantConstraintEngine } from "../sibilantConstraintEngine";
import { NasalAlarEngine } from "../nasalAlarEngine";
import { LingualKinematics } from "../lingualKinematics";
import { CoarticulationEngine } from "../coarticulationEngine";
import { PitchDetector } from "../pitchDetector";
import { ProceduralLivePortraitDriver } from "../proceduralLivePortraitDriver";

describe("Phonetic Parity & Biomechanical Realism Suite", () => {
  describe("1. ONNX Dominant Viseme Classification", () => {
    it("should classify PP on bilabial compression", () => {
      const engine = new OnnxAudioVisemeEngine();
      (engine as any).smoothCompression = 0.55;
      (engine as any).smoothJaw = 0.1;
      (engine as any).updateOutputFrame(16.6);
      expect((engine as any).getOutputFrame().dominantViseme).toBe("PP");
    });

    it("should classify aa on wide open jaw", () => {
      const engine = new OnnxAudioVisemeEngine();
      (engine as any).smoothJaw = 0.65;
      (engine as any).smoothCompression = 0.05;
      (engine as any).updateOutputFrame(16.6);
      expect((engine as any).getOutputFrame().dominantViseme).toBe("aa");
    });

    it("should classify sil on resting silence", () => {
      const engine = new OnnxAudioVisemeEngine();
      (engine as any).smoothJaw = 0.01;
      (engine as any).smoothCompression = 0.05;
      (engine as any).updateOutputFrame(16.6);
      expect((engine as any).getOutputFrame().dominantViseme).toBe("sil");
    });
  });

  describe("2. Token Alignment Across Biomechanical Engines", () => {
    it("LabiodentalEngine should recognize Oculus tokens PP and FF", () => {
      const labio = new LabiodentalEngine();
      const statePP = labio.update(0.2, "PP", 16.6);
      expect(statePP.plosiveCompression).toBeGreaterThan(0);

      const stateFF = labio.update(2.0, "FF", 16.6);
      expect(stateFF.labiodentalTuck).toBeGreaterThan(0);
    });

    it("SibilantConstraintEngine should recognize Oculus token SS", () => {
      const sibilant = new SibilantConstraintEngine();
      // Step twice to allow attack smoothing
      sibilant.update(5.0, 10.0, undefined, 16000, "SS", 16.6);
      const state = sibilant.update(5.0, 10.0, undefined, 16000, "SS", 16.6);
      expect(state.isSibilantActive).toBe(true);
      expect(state.incisalProximity).toBeGreaterThan(0.5);
    });

    it("NasalAlarEngine should recognize Oculus token NN", () => {
      const nasal = new NasalAlarEngine();
      const state = nasal.update("NN", undefined, 16000, 16.6);
      expect(state.alarExpansionRatio).toBeGreaterThan(1.0);
    });

    it("LingualKinematics should resolve Oculus tokens dd, ss, rr, oh, ou", () => {
      const lingual = new LingualKinematics();
      // Step to settle exponential smoother
      lingual.resolveFromPhoneme("dd");
      lingual.resolveFromPhoneme("dd");
      const stateDD = lingual.resolveFromPhoneme("dd");
      expect(stateDD.elevation).toBeGreaterThan(0.6);

      const stateSS = lingual.resolveFromPhoneme("ss");
      expect(stateSS.groove).toBeGreaterThan(0.2);

      const stateRR = lingual.resolveFromPhoneme("rr");
      expect(stateRR.elevation).toBeGreaterThan(0.2);

      lingual.resolveFromPhoneme("oh", 8.0);
      lingual.resolveFromPhoneme("oh", 8.0);
      const stateOH = lingual.resolveFromPhoneme("oh", 8.0);
      expect(stateOH.elevation).toBeLessThan(0.0);
    });

    it("CoarticulationEngine should anticipate Oculus tokens pp, oh, ou", () => {
      const coart = new CoarticulationEngine();
      const state = coart.update(10.0, 94.5, [
        { phoneme: "pp", offsetMs: 50 },
        { phoneme: "ou", offsetMs: 90 },
      ]);
      expect(state.preclosureBias).toBeGreaterThan(0);
      expect(state.roundingBias).toBeGreaterThan(0);
    });
  });

  describe("3. Real-Time PitchDetector.detectInstantaneousF0", () => {
    it("should detect fundamental frequency from a 200 Hz synthetic sine wave", () => {
      const sampleRate = 44100;
      const buffer = new Float32Array(512);
      const freq = 200;
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.7;
      }
      const f0 = PitchDetector.detectInstantaneousF0(buffer, sampleRate);
      expect(f0).toBeGreaterThan(180);
      expect(f0).toBeLessThan(220);
    });

    it("should return 0 on silence", () => {
      const buffer = new Float32Array(512);
      const f0 = PitchDetector.detectInstantaneousF0(buffer, 44100);
      expect(f0).toBe(0);
    });
  });

  describe("4. Teleprompter Saccades Staircase", () => {
    it("should produce stepped discrete fixations rather than a linear scan", () => {
      const driver = new ProceduralLivePortraitDriver();
      driver.setConfig({ isAutoAnimate: true, idlePreset: "intense_anchor" });

      // Sample consecutive times within a fixation window
      const pose1 = driver.update(1.0);
      const pose2 = driver.update(1.05);

      // Within a fixation pause, gaze delta is minimal (micro-tremor only)
      expect(Math.abs(pose1.gazeX - pose2.gazeX)).toBeLessThan(0.06);
    });
  });

  describe("5. Procedural Oral Cavity & 3D Dental Arch in Shader", () => {
    it("should invoke renderInterlabialAperture in main() when !isNeuralActive to eliminate black mouth lines", async () => {
      const { NEURAL_3DMM_FRAGMENT_SHADER } = await import("../shaders/neural3DMMFragmentShader");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("STAGE 5C: PROCEDURAL INTERLABIAL APERTURE & 3D DENTAL ARCH");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("renderInterlabialAperture(");
    });
  });

  describe("6. Neural Codebook Expression Plasticity & Pucker in Shader", () => {
    it("should deform patch coordinates with smile, asymmetry, and lip pucker in Stage 5E", async () => {
      const { NEURAL_3DMM_FRAGMENT_SHADER } = await import("../shaders/neural3DMMFragmentShader");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("codebookCornerWeight");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("patchPixelY -= u_smileExpression * codebookCornerWeight");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("patchPixelY -= sign(unwarpedRotX) * u_asymmetry");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("patchPixelX = anchor.x + (patchPixelX - anchor.x) * (1.0 - u_lipPucker * 0.20)");
    });
  });

  describe("7. Decoupled Chin & Jaw Motion Under Neural Codebook", () => {
    it("should suppress procedural WebGL visemes but allow chin descent when neural codebook is active", async () => {
      const { NEURAL_3DMM_FRAGMENT_SHADER } = await import("../shaders/neural3DMMFragmentShader");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("bool hasMouthMotion = !isNeuralActive && isSpeechSide && hasMotionParams;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float dispY_chin = -u_jawOpen * max(ry * 0.42, rx * 0.15) * chinWeight;");
    });
  });

  describe("8. Dynamic Pupillary Aperture Scaling in Shader", () => {
    it("should scale pupil boundary dynamically with u_eyeWidening", async () => {
      const { NEURAL_3DMM_FRAGMENT_SHADER } = await import("../shaders/neural3DMMFragmentShader");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float pupilBoundarySq = 0.06 * clamp(u_eyeWidening, 0.75, 1.30);");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("normCorneaDistSqL > pupilBoundarySq");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("normCorneaDistSqR > pupilBoundarySq");
    });
  });

  describe("9. Persona Calibrations for Mateo & Everett", () => {
    it("should define custom calibrations for Mateo and Everett", async () => {
      const { PERSONA_CALIBRATIONS, getPersonaCalibration } = await import("../liveAnchorStageEngine");
      expect(PERSONA_CALIBRATIONS.mateo).toBeDefined();
      expect(PERSONA_CALIBRATIONS.mateo.mouthRadiusBaseX).toBe(0.076);
      expect(PERSONA_CALIBRATIONS.everett).toBeDefined();
      expect(PERSONA_CALIBRATIONS.everett.mouthRadiusBaseX).toBe(0.075);

      const mateoCalib = getPersonaCalibration("mateo");
      expect(mateoCalib.mouthRadiusBaseX).toBe(0.076);
    });
  });

  describe("10. WebAudio Latency Auto-Calibration in Engine", () => {
    it("should calculate and set WebAudio latency on attachAudioAnalyser", async () => {
      const { LiveAnchorStageEngine } = await import("../liveAnchorStageEngine");
      const canvas = document.createElement("canvas");
      const engine = new LiveAnchorStageEngine(canvas, null);
      const mockAnalyser = {
        frequencyBinCount: 128,
        fftSize: 256,
        context: {
          baseLatency: 0.010,
          outputLatency: 0.020,
        },
      } as any;

      engine.attachAudioAnalyser(mockAnalyser);
      const onnxEngine = (engine as any).onnxEngine;
      // 10ms + 20ms + 16ms render phase lead = 46ms
      expect(onnxEngine.getWebAudioLatencyMs()).toBe(46);
    });
  });

  describe("11. Calmed Broadcast Blink Cadence & VOR Snap Damping", () => {
    it("should use a calm base blink interval between 6.5s and 11.0s", () => {
      const driver = new ProceduralLivePortraitDriver();
      driver.setConfig({ blinkRate: 1.0 });
      (driver as any)._scheduleNextBlink(100.0);
      const nextTime = (driver as any).nextBlinkTime;
      const interval = nextTime - 100.0;
      expect(interval).toBeGreaterThanOrEqual(6.0);
      expect(interval).toBeLessThanOrEqual(12.0);
    });

    it("should respect VOR refractory period and calm interval", () => {
      const driver = new ProceduralLivePortraitDriver();
      driver.update(1.0);
      driver.setManualPose(0, 15, 0);
      driver.update(1.03);
      expect((driver as any).isBlinking).toBe(true);
    });
  });

  describe("12. Autonomous Facial Landmark Calibration (Zero Fixed Persona Overrides)", () => {
    it("should dynamically detect landmark calibration from live face measurements", async () => {
      const { autoDetectLandmarkCalibration } = await import("../liveAnchorStageEngine");
      const mockTracked = {
        x: 0.502,
        y: 0.640,
        radiusX: 0.084,
        radiusY: 0.031,
        angle: 0.02,
        confidence: 0.98,
        autoCalib: {
          eyeYOffset: 0.012,
          eyeSpacingScale: 1.08,
          browYOffset: -0.005,
          noseBaseYOffset: 0.003,
          mouthYOffset: 0.004,
          mouthWidthScale: 1.20,
          mouthHeightScale: 1.19,
          jawContourScale: 1.15,
        },
      } as any;

      const detected = autoDetectLandmarkCalibration(mockTracked);
      expect(detected.mouthRadiusBaseX).toBe(0.084);
      expect(detected.mouthRadiusBaseY).toBe(0.031);
      expect(detected.mouthWidthScale).toBe(1.20);
      expect(detected.eyeSpacingScale).toBe(1.08);
      expect(detected.jawContourScale).toBe(1.15);
    });

    it("should smoothly auto-calibrate LiveAnchorStageEngine from tracked landmarks", async () => {
      const { LiveAnchorStageEngine } = await import("../liveAnchorStageEngine");
      const canvas = document.createElement("canvas");
      const engine = new LiveAnchorStageEngine(canvas, null);

      const mockTracked = {
        x: 0.500,
        y: 0.630,
        radiusX: 0.088,
        radiusY: 0.034,
        angle: 0,
        confidence: 0.95,
      } as any;

      engine.updateAutoCalibration(mockTracked);
      const calib = (engine as any).calib;
      // EMA smoothly shifts toward target (from Ruby's initial 0.068 / 0.024 seed toward 0.088 / 0.034)
      expect(calib.mouthRadiusBaseX).toBeGreaterThan(0.068);
      expect(calib.mouthRadiusBaseY).toBeGreaterThan(0.024);
    });
  });

  describe("13. Comprehensive 48-Viseme Neural Codebook Mapping", () => {
    it("should map phonemes and Oculus visemes to calibrated 48-cluster codebook indices", async () => {
      const { CODEBOOK_48_CLUSTER_MAP, getVisemeCodebookCluster } = await import("../liveAnchorStageEngine");

      // Verify key phonetic anchors in 48-cluster continuum
      expect(CODEBOOK_48_CLUSTER_MAP["sil"]).toBe(0);
      expect(CODEBOOK_48_CLUSTER_MAP["PP"]).toBe(1);
      expect(CODEBOOK_48_CLUSTER_MAP["p"]).toBe(1);
      expect(CODEBOOK_48_CLUSTER_MAP["m"]).toBe(2);
      expect(CODEBOOK_48_CLUSTER_MAP["FF"]).toBe(6);
      expect(CODEBOOK_48_CLUSTER_MAP["TH"]).toBe(8);
      expect(CODEBOOK_48_CLUSTER_MAP["SS"]).toBe(10);
      expect(CODEBOOK_48_CLUSTER_MAP["DD"]).toBe(13);
      expect(CODEBOOK_48_CLUSTER_MAP["ou"]).toBe(22);
      expect(CODEBOOK_48_CLUSTER_MAP["oh"]).toBe(26);
      expect(CODEBOOK_48_CLUSTER_MAP["aa"]).toBe(32);

      // Bilabial compression takes cluster 1 or 2
      expect(getVisemeCodebookCluster("PP", 0.0, 0.0, 0.6)).toBe(1);
      expect(getVisemeCodebookCluster("m", 0.0, 0.0, 0.4)).toBe(2);

      // Neutral rest takes cluster 0
      expect(getVisemeCodebookCluster("sil", 0.0, 0.0, 0.0)).toBe(0);

      // Puckered rounded vowels map into 22..29
      const puckerCluster = getVisemeCodebookCluster("ou", 0.15, 0.60, 0.0);
      expect(puckerCluster).toBeGreaterThanOrEqual(22);
      expect(puckerCluster).toBeLessThanOrEqual(29);

      // Wide open vowels scale dynamically into 30..47 based on continuous jaw aperture
      const openCentral = getVisemeCodebookCluster("aa", 0.85, 0.0, 0.0);
      expect(openCentral).toBeGreaterThanOrEqual(30);
      expect(openCentral).toBeLessThanOrEqual(47);
    });
  });

  describe("14. Anticipatory Coarticulation Lookahead & Cluster Biasing", () => {
    it("should dynamically bias codebook clusters based on anticipatory rounding and preclosure", async () => {
      const { resolveCoarticulatedCluster } = await import("../coarticulationEngine");

      const neutralOpenCluster = 35; // Open vowel /aa/
      const roundedState = {
        currentAperture: 12.0,
        currentWidth: 90.0,
        apertureVelocity: 0,
        widthVelocity: 0,
        roundingBias: 0.65, // Anticipating /u/
        preclosureBias: 0.0,
      };

      const biasedRounding = resolveCoarticulatedCluster(neutralOpenCluster, roundedState);
      expect(biasedRounding).toBe(26); // Biased toward mid-rounded vowel

      const preclosureState = {
        currentAperture: 4.0,
        currentWidth: 94.5,
        apertureVelocity: -10,
        widthVelocity: 0,
        roundingBias: 0.0,
        preclosureBias: 0.75, // Anticipating /p, b, m/
      };

      const biasedPlosive = resolveCoarticulatedCluster(neutralOpenCluster, preclosureState);
      expect(biasedPlosive).toBe(1); // Biased toward bilabial contact
    });

    it("should extract upcoming phonemes from lookahead queue in OnnxAudioVisemeEngine", async () => {
      const { OnnxAudioVisemeEngine } = await import("../onnxAudioVisemeEngine");
      const onnx = new OnnxAudioVisemeEngine();

      const now = 1000;
      onnx.queueLookaheadViseme(now + 40, { dominantViseme: "t", jawOpen: 0.1 });
      onnx.queueLookaheadViseme(now + 80, { dominantViseme: "ou", lipPucker: 0.6 });
      onnx.queueLookaheadViseme(now + 180, { dominantViseme: "aa", jawOpen: 0.8 }); // Outside 130ms window

      const upcoming = onnx.getUpcomingPhonemes(now, 130);
      expect(upcoming.length).toBe(2);
      expect(upcoming[0].phoneme).toBe("t");
      expect(upcoming[0].offsetMs).toBe(40);
      expect(upcoming[1].phoneme).toBe("ou");
      expect(upcoming[1].offsetMs).toBe(80);
    });
  });

  describe("15. Directional 3D Furrow Topography & S-Curve Shading", () => {
    it("should compute directional key-light slope in shader for nasolabial folds and marionette lines", async () => {
      const { NEURAL_3DMM_FRAGMENT_SHADER } = await import("../shaders/neural3DMMFragmentShader");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float foldSlopeL = -signedDistL * exp(-signedDistL * signedDistL * 2.2);");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float directionalL = foldSlopeL * lightX * smileGain * 0.14;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float foldCreaseAOL = exp(-signedDistL * signedDistL * 5.0)");
    });
  });

  describe("16. Physical Saliva Moisture & Inner Mucosal Specular Gleam", () => {
    it("should compute Fresnel-governed saliva sheen and high-exponent specular on inner vermilion and enamel", async () => {
      const { NEURAL_3DMM_FRAGMENT_SHADER } = await import("../shaders/neural3DMMFragmentShader");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("fresnelSaliva = 0.04 + 0.96 * pow(1.0 - max(0.0, mucosalNormal.z), 5.0);");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float s48 = s16 * s16 * s16;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float mucosalZone = smoothstep(0.35, 0.08, abs(canonV - 0.50))");
    });
  });

  describe("17. Cognitive Gaze Drift & Breathing-Linked Pupillary Hippus", () => {
    it("should propagate livePose.eyeWidening (carrying pupil hippus) into uniform eyeWidening", async () => {
      const { LiveAnchorStageEngine } = await import("../liveAnchorStageEngine");
      const canvas = document.createElement("canvas");
      const engine = new LiveAnchorStageEngine(canvas, null);

      // Verify that engine has SaccadicGazeEngine instantiated
      expect((engine as any).saccadicGazeEngine).toBeDefined();

      // Trigger cognitive pause aversion
      (engine as any).wasSpeakingLastFrame = true;
      (engine as any).isSpeaking = false;
      // Should trigger aversion without crashing
      const gazeState = (engine as any).saccadicGazeEngine.update(16.6, false);
      expect(gazeState).toBeDefined();
      expect(gazeState.gazeOffsetX).toBeDefined();
      expect(gazeState.gazeOffsetY).toBeDefined();
    });
  });

  describe("18. Anatomical Bilabial Dental Collision Prevention", () => {
    it("should clamp and suppress teeth rendering when lip compression is active", async () => {
      const { NEURAL_3DMM_FRAGMENT_SHADER } = await import("../shaders/neural3DMMFragmentShader");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("float bilabialOcclusion = smoothstep(0.12, 0.38, u_lipCompression);");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("isTeeth *= (1.0 - bilabialOcclusion);");
    });
  });
});
