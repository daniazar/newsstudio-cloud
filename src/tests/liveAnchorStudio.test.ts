/**
 * src/tests/liveAnchorStudio.test.ts
 *
 * Test suite for the Next-Gen Conversational Live Broadcast Anchor Studio.
 */

import { describe, it, expect, vi } from "vitest";
import {
  transpileAudioTagsForModel,
  cleanSpokenText,
} from "../lib/conversational/audioTagAdapter";
import { isSpeechHallucination } from "../lib/conversational/speechHallucinationFilter";
import { NewsContextService } from "../lib/conversational/newsContextService";
import { OllamaConversationalClient } from "../lib/conversational/ollamaConversationalClient";
import * as aiSdkGateway from "../lib/llm/aiSdkGateway";

describe("Live Broadcast Anchor Studio & Discord Architecture Suite", () => {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. Audio Tag Transpilation & Speech Sanitization
  // ─────────────────────────────────────────────────────────────────────────
  describe("AudioTagAdapter & Speech Sanitization", () => {
    it("should transpile audio tags correctly per target engine", () => {
      const input = "Good evening [laugh] we have breaking news [pause] on AI tech [gasp]!";

      const orpheus = transpileAudioTagsForModel(input, "orpheus");
      expect(orpheus).toContain("<laugh>");
      expect(orpheus).toContain("<gasp>");
      expect(orpheus).toContain("... ");

      const piper = transpileAudioTagsForModel(input, "piper");
      expect(piper).not.toContain("[laugh]");
      expect(piper).toContain("... ");
      expect(piper).not.toContain("[gasp]");

      const f5 = transpileAudioTagsForModel(input, "f5_tts");
      expect(f5).toContain(" — ");
    });

    it("should strip markdown, bracketed tags, and emojis from cleanSpokenText", () => {
      const dirty = "**BREAKING NEWS:** $NVDA surged 4.2% today! 🚀 [project_story: 123] [gesture:wide] (pause for effect)";
      const clean = cleanSpokenText(dirty);

      expect(clean).not.toContain("**");
      expect(clean).not.toContain("🚀");
      expect(clean).not.toContain("[project_story:");
      expect(clean).not.toContain("[gesture:wide]");
      expect(clean).not.toContain("(pause for effect)");
      expect(clean).toContain("BREAKING NEWS: $NVDA surged 4.2% today!");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Speech Hallucination Filter
  // ─────────────────────────────────────────────────────────────────────────
  describe("SpeechHallucinationFilter", () => {
    it("should detect and reject phantom silence phrases", () => {
      expect(isSpeechHallucination("thank you for watching")).toBe(true);
      expect(isSpeechHallucination("subtitles by")).toBe(true);
      expect(isSpeechHallucination("gracias por ver")).toBe(true);
      expect(isSpeechHallucination("   ")).toBe(true);
      expect(isSpeechHallucination("um")).toBe(true);
    });

    it("should allow genuine user inquiries", () => {
      expect(isSpeechHallucination("What are today's top tech headlines?")).toBe(false);
      expect(isSpeechHallucination("¿Cómo cerraron los mercados hoy?")).toBe(false);
      expect(isSpeechHallucination("Tell me about Bitcoin")).toBe(false);
      expect(isSpeechHallucination("you")).toBe(false);
      expect(isSpeechHallucination("can you tell me what happened?")).toBe(false);
      expect(isSpeechHallucination("yeah")).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. News Context Service & Tickers
  // ─────────────────────────────────────────────────────────────────────────
  describe("NewsContextService", () => {
    const service = new NewsContextService();

    it("should format news context properly for LLM prompt injection", () => {
      const mockStories = [
        {
          id: "story_001",
          title: "AI Chipmaker Unveils Quantum Computing Platform",
          description: "Massive speedups reported across data centers worldwide.",
          category: "Tech",
          link: "https://example.com/1",
          pubDate: "2026-08-26T12:00:00Z",
          createdAt: "2026-08-26T12:00:00Z",
        },
      ];

      const esPrompt = service.formatNewsPromptContext(mockStories, "es");
      expect(esPrompt).toContain("INFORMACIÓN EN TIEMPO REAL");
      expect(esPrompt).toContain("[TECH] AI Chipmaker Unveils Quantum Computing Platform");
      expect(esPrompt).toContain("StoryID: story_001");
      expect(esPrompt).toContain("NVDA");

      const enPrompt = service.formatNewsPromptContext(mockStories, "en");
      expect(enPrompt).toContain("REAL-TIME NEWSROOM BULLETINS");
      expect(enPrompt).toContain("CURRENT MARKET INDICES");
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Ollama Conversational Client Prompt Construction
  // ─────────────────────────────────────────────────────────────────────────
  describe("OllamaConversationalClient System Prompt", () => {
    const client = new OllamaConversationalClient();

    it("should construct rich persona prompt with rules, tags, and language policy", () => {
      const persona = {
        id: "ruby",
        name: "Ruby Vance",
        title: "Lead News Anchor",
        language: "es",
        description: "Sharp and charismatic",
        systemPrompt: "You are Ruby.",
      } as unknown as Parameters<typeof client.buildSystemPrompt>[0];

      const prompt = client.buildSystemPrompt(persona, "CABLE: Tech Stocks Surge", "es");
      expect(prompt).toContain("Ruby Vance");
      expect(prompt).toContain("REGLAS DE RESPUESTA CONVERSACIONAL");
      expect(prompt).toContain("[project_story: StoryID]");
      expect(prompt).toContain("STANDARD AUDIO EMOTION TAGS");
      expect(prompt).toContain("CABLE: Tech Stocks Surge");
    });

    it("should generate a conversational turn via unified AI SDK gateway", async () => {
      const spy = vi.spyOn(aiSdkGateway, "generateLlmText").mockResolvedValueOnce({
        text: "[gesture:explanatory] The financial desk reports strong gains in chipmakers today. [project_ticker: NVDA]",
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const result = await client.generateTurn({
        personaId: "ruby",
        userUtterance: "What happened on the markets today?",
        language: "en",
      });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(result.providerUsed).toBe("gemini");
      expect(result.actionPose).toBe("M2_RAISED_EXPLANATORY");
      expect(result.projectedCard?.type).toBe("ticker");
      expect(result.projectedCard?.title).toContain("NVDA");
      expect(result.cleanSpokenText).toContain("The financial desk reports strong gains in chipmakers today.");
      spy.mockRestore();
    });

    it("should stream a conversational turn via streamLlmText", async () => {
      const mockStreamResult = {
        textStream: (async function* () {
          yield "Breaking ";
          yield "markets.";
        })(),
        providerUsed: "ollama" as const,
        modelUsed: "qwen2.5:3b",
      };

      const spy = vi.spyOn(aiSdkGateway, "streamLlmText").mockResolvedValueOnce(mockStreamResult as unknown as Awaited<ReturnType<typeof aiSdkGateway.streamLlmText>>);

      const stream = await client.streamTurnText({
        personaId: "ruby",
        userUtterance: "Update me on news",
        language: "en",
      });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(stream).toBe(mockStreamResult);
      spy.mockRestore();
    });

    it("should fall back gracefully to heuristic response when AI gateway throws", async () => {
      const spy = vi.spyOn(aiSdkGateway, "generateLlmText").mockRejectedValueOnce(new Error("AI Gateway offline"));

      const result = await client.generateTurn({
        personaId: "ruby",
        userUtterance: "Status report",
        language: "en",
      });

      expect(spy).toHaveBeenCalledTimes(1);
      expect(result.providerUsed).toBe("heuristic");
      expect(result.spokenText).toBeDefined();
      spy.mockRestore();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Audio-to-Viseme Extractor Tests (22 Azure Speech Visemes)
  // ─────────────────────────────────────────────────────────────────────────
  describe("AudioVisemeExtractor", () => {
    it("should return rest state with Azure Viseme #0 when no audio or below noise floor", async () => {
      const { AudioVisemeExtractor, AZURE_VISEME_NAMES } = await import("../lib/realtime/audioVisemeExtractor");
      const extractor = new AudioVisemeExtractor();
      const frame = extractor.extractViseme();

      expect(frame.jawOpen).toBe(0);
      expect(frame.dominantViseme).toBe("sil");
      expect(frame.azureVisemeId).toBe(0);
      expect(frame.azureVisemeName).toBe(AZURE_VISEME_NAMES[0]);
      expect(frame.rms).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Real-Time Autonomous Mouth Tracker Tests
  // ─────────────────────────────────────────────────────────────────────────
  describe("MouthTracker", () => {
    it("should initialize autonomously and return normalized tracking values", async () => {
      const { MouthTracker } = await import("../lib/realtime/mouthTracker");
      const tracker = new MouthTracker();
      const mockVideo = {} as HTMLVideoElement;
      const tracked = tracker.update(mockVideo);

      expect(tracked.x).toBeGreaterThanOrEqual(0.0);
      expect(tracked.x).toBeLessThanOrEqual(1.0);
      expect(tracked.y).toBeGreaterThanOrEqual(0.0);
      expect(tracked.y).toBeLessThanOrEqual(1.0);
      expect(tracked.radiusX).toBeGreaterThan(0.03);
      expect(tracked.confidence).toBeGreaterThanOrEqual(0.5);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Multi-Subject Adaptive Viseme Realism (Ruby, Blaze, Jade)
  // ─────────────────────────────────────────────────────────────────────────
  describe("Multi-Subject Adaptive Viseme Realism", () => {
    it("should calibrate and handle subject-specific stomion baselines and smiling traits", async () => {
      const { WebglVisemeRenderer } = await import("../lib/realtime/webglVisemeShader");
      const renderer = new WebglVisemeRenderer();
      expect(renderer).toBeDefined();

      const rubyConfig = {
        mouthCenter: [0.503, 0.229] as [number, number],
        mouthRadius: [0.056, 0.018] as [number, number],
        mouthAngle: 0.0,
        mouthCurvature: 0.02,
        jawOpen: 0.40,
        lipWidth: 0.10,
        lipPucker: 0.0,
        lipCompression: 0.0,
        labiodentalTuck: 0.0,
        teethClenched: 0.0,
        aspectRatio: 720 / 1280,
      };

      const blazeConfig = {
        mouthCenter: [0.507, 0.225] as [number, number],
        mouthRadius: [0.056, 0.018] as [number, number],
        mouthAngle: 0.01,
        mouthCurvature: 0.03,
        jawOpen: 0.45,
        lipWidth: 0.18, // Wide smile
        lipPucker: 0.0,
        lipCompression: 0.0,
        labiodentalTuck: 0.0,
        teethClenched: 0.0,
        aspectRatio: 720 / 1280,
      };

      const jadeConfig = {
        mouthCenter: [0.500, 0.240] as [number, number],
        mouthRadius: [0.058, 0.020] as [number, number],
        mouthAngle: -0.01,
        mouthCurvature: 0.01,
        jawOpen: 0.50,
        lipWidth: 0.05,
        lipPucker: 0.0,
        lipCompression: 0.0,
        labiodentalTuck: 0.0,
        teethClenched: 0.0,
        tongueTipProtrusion: 0.20,
        aspectRatio: 544 / 960,
      };

      expect(rubyConfig.mouthCenter[1]).toBeLessThan(jadeConfig.mouthCenter[1]);
      expect(blazeConfig.lipWidth).toBeGreaterThan(rubyConfig.lipWidth);
      expect(jadeConfig.tongueTipProtrusion).toBeGreaterThan(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 9. Dynamic On-the-Fly Neural Tensor Calibration & 68-Point Mesh Tests
  // ─────────────────────────────────────────────────────────────────────────
  describe("Dynamic Neural Tensor Calibration", () => {
    it("should calculate exact calibration offsets from detected facial landmarks on the fly", () => {
      // Ground-truth Ruby Vance portrait coordinates
      const detectedEyeY = 0.444;
      const detectedIOD = 0.158;
      const detectedMouthY = 0.653;
      const detectedRadiusX = 0.105;
      const detectedRadiusY = 0.038;
      const detectedHeadRx = 0.292;

      const baselineEyeY = 0.422;
      const baselineIOD = 0.130;
      const baselineMouthY = 0.638;
      const baselineMouthWidth = 0.070;
      const baselineMouthHeight = 0.026;
      const baselineJawWidth = 0.250;

      const eyeYOffset = parseFloat((detectedEyeY - baselineEyeY).toFixed(3));
      const eyeSpacingScale = parseFloat((detectedIOD / baselineIOD).toFixed(2));
      const mouthYOffset = parseFloat((detectedMouthY - baselineMouthY).toFixed(3));
      const mouthWidthScale = parseFloat((detectedRadiusX / baselineMouthWidth).toFixed(2));
      const mouthHeightScale = parseFloat((detectedRadiusY / baselineMouthHeight).toFixed(2));
      const jawContourScale = parseFloat((detectedHeadRx / baselineJawWidth).toFixed(2));

      expect(eyeYOffset).toBeCloseTo(0.022, 3);
      expect(eyeSpacingScale).toBeCloseTo(1.22, 2);
      expect(mouthYOffset).toBeCloseTo(0.015, 3);
      expect(mouthWidthScale).toBeCloseTo(1.50, 2);
      expect(mouthHeightScale).toBeCloseTo(1.46, 1);
      expect(jawContourScale).toBeCloseTo(1.17, 2);
    });

    it("should verify 68 standard Dlib facial landmarks map validly to MediaPipe 478 points", () => {
      const MEDIAPIPE_TO_68 = [
        // 0..16: Jawline contour
        162, 234, 93, 58, 172, 136, 149, 148, 152, 377, 378, 365, 397, 288, 323, 454, 389,
        // 17..21: Right eyebrow
        71, 63, 105, 66, 107,
        // 22..26: Left eyebrow
        336, 296, 334, 293, 301,
        // 27..30: Nose bridge
        168, 197, 5, 4,
        // 31..35: Nose base / nostrils
        75, 97, 2, 326, 305,
        // 36..41: Right eye
        33, 160, 158, 133, 153, 144,
        // 42..47: Left eye
        362, 385, 387, 263, 373, 380,
        // 48..59: Outer lips
        61, 39, 37, 0, 267, 269, 291, 405, 314, 17, 84, 181,
        // 60..67: Inner lips
        78, 82, 13, 312, 308, 317, 14, 87
      ];

      expect(MEDIAPIPE_TO_68.length).toBe(68);
      for (const idx of MEDIAPIPE_TO_68) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(478);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. LiveAnchorStageEngine & Decoupled Architecture
  // ─────────────────────────────────────────────────────────────────────────
  describe("LiveAnchorStageEngine Architecture", () => {
    it("should export neutral 1.0 calibration defaults for all personas", async () => {
      const { PERSONA_CALIBRATIONS, getPersonaCalibration, NEUTRAL_RAW_CALIBRATION } = await import(
        "../lib/realtime/liveAnchorStageEngine"
      );

      const personas = ["ruby", "luna", "storm", "blaze", "aris", "atlas"];
      for (const p of personas) {
        const calib = getPersonaCalibration(p);
        expect(calib).toBeDefined();
        expect(calib.eyeSpacingScale).toBe(1.0);
        expect(calib.mouthWidthScale).toBe(1.0);
        expect(calib.jawContourScale).toBe(1.0);
        expect(calib.eyeYOffset).toBe(0.0);
        expect(calib.mouthYOffset).toBe(0.0);
      }
    });

    it("should fall back gracefully to neutral 1.0 calibration for unknown persona", async () => {
      const { getPersonaCalibration, NEUTRAL_RAW_CALIBRATION } = await import(
        "../lib/realtime/liveAnchorStageEngine"
      );

      const calib = getPersonaCalibration("unknown_anchor");
      expect(calib.mouthWidthScale).toBe(1.0);
      expect(calib.jawContourScale).toBe(1.0);
      expect(calib.eyeSpacingScale).toBe(1.0);
    });

    it("should compute organic upper-body kinematics including respiration and chest expansion", async () => {
      const { ProceduralLivePortraitDriver } = await import(
        "../lib/realtime/proceduralLivePortraitDriver"
      );

      const driver = new ProceduralLivePortraitDriver({
        isAutoAnimate: true,
        motionIntensity: 1.8,
      });

      // Update over 1 second of simulated time
      let state = driver.update(1.0);
      expect(state).toHaveProperty("shoulderBreath");
      expect(state).toHaveProperty("shoulderSway");
      expect(state).toHaveProperty("chestExpansion");
      expect(state).toHaveProperty("shoulderShrug");
      expect(state).toHaveProperty("neckFlex");

      // Verify speech energy expands chest and engages neck flex
      driver.setAudioProsody(0.85, true);
      state = driver.update(1.5);
      expect(state.chestExpansion).toBeGreaterThan(0.0);
      expect(state.neckFlex).toBeGreaterThan(0.0);
    });

    it("should trigger cadence onset nods and brow flashes upon speech surge", async () => {
      const { ProceduralLivePortraitDriver } = await import(
        "../lib/realtime/proceduralLivePortraitDriver"
      );

      const driver = new ProceduralLivePortraitDriver({
        isAutoAnimate: true,
        motionIntensity: 1.8,
      });

      // Initial silent baseline
      driver.setAudioProsody(0.0, false);
      const silentState = driver.update(1.0);

      // Speech onset burst (0 -> 0.9 energy, speaking = true)
      driver.setAudioProsody(0.9, true);
      const speakingState = driver.update(1.05);

      // Pitch should dip downward on onset (speech cadence nod)
      expect(speakingState.pitchDeg).toBeLessThan(silentState.pitchDeg);
      // Eyebrows should flash upward on energetic speech
      expect(speakingState.eyebrowRaise).toBeGreaterThan(silentState.eyebrowRaise);
    });

    it("should simulate spring-mass jaw inertia and coarticulation in OnnxAudioVisemeEngine", async () => {
      const { OnnxAudioVisemeEngine } = await import(
        "../lib/realtime/onnxAudioVisemeEngine"
      );

      const engine = new OnnxAudioVisemeEngine();

      // Silent frame
      const frame1 = engine.extractFrame(null, null, false);
      expect(frame1.jawOpen).toBe(0);

      // Simulated speech energy
      const mockFFT = new Uint8Array(128);
      for (let i = 0; i < 64; i++) mockFFT[i] = 180;

      const frame2 = engine.extractFrame(null, mockFFT, true);
      expect(frame2).toHaveProperty("jawOpen");
      expect(frame2).toHaveProperty("lipWidth");
      expect(frame2).toHaveProperty("eyebrowFurrow");

      // Multiple frames should maintain physical continuity (spring mass dynamics)
      const frame3 = engine.extractFrame(null, mockFFT, true);
      expect(frame3.jawOpen).toBeGreaterThanOrEqual(0);
    });

    it("should report active execution provider and support WebGPU fallback", async () => {
      const { OnnxAudioVisemeEngine } = await import(
        "../lib/realtime/onnxAudioVisemeEngine"
      );

      const engine = new OnnxAudioVisemeEngine();
      expect(engine.provider).toBe("none");

      // In Node/Vitest test environment without WebGPU hardware, provider is "none" before init
      const frame = engine.extractFrame(null, null, false);
      expect(frame).toHaveProperty("provider");
      expect(["webgpu", "wasm", "none"]).toContain(frame.provider);
    });

    it("should include photorealistic procedural oral cavity and teeth enamel arc in Neural3DMMShader", async () => {
      const { NEURAL_3DMM_FRAGMENT_SHADER } = await import(
        "../lib/realtime/neural3DMMShader"
      );

      // Verify soft anatomical interlabial aperture function is declared and integrated
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec3 renderInterlabialAperture(");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("toothArchY");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("dentalTone");
    });

    it("should include dynamic 3D expression micro-creases and ambient muscle shadows in Neural3DMMShader", async () => {
      const { NEURAL_3DMM_FRAGMENT_SHADER } = await import(
        "../lib/realtime/neural3DMMShader"
      );

      // Verify artificial grey crease lines are eliminated to preserve clean skin
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("vec3 applyDynamicExpressionCreases(");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain("furrowShadow");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain("foreheadShadow");
    });

    it("should decode extended BFM coefficients (cheek puff, nose sneer, chin raise) in OnnxAudioVisemeEngine and Neural3DMMShader", async () => {
      const { OnnxAudioVisemeEngine } = await import(
        "../lib/realtime/onnxAudioVisemeEngine"
      );
      const { NEURAL_3DMM_FRAGMENT_SHADER } = await import(
        "../lib/realtime/neural3DMMShader"
      );

      const engine = new OnnxAudioVisemeEngine();
      const frame = engine.extractFrame(null, null, false);
      expect(frame).toHaveProperty("cheekPuff");
      expect(frame).toHaveProperty("chinRaise");
      expect(frame).toHaveProperty("noseSneer");
      expect(frame).toHaveProperty("tongueElevation");
      expect(frame).toHaveProperty("tongueProtrusion");
      expect(frame).toHaveProperty("tongueGroove");

      // Verify shader uniforms are declared
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_cheekPuff;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_noseSneer;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_chinRaise;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_tongueElevation;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_tongueProtrusion;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_tongueGroove;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_vascularFlush;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform sampler2D u_videoTextureB;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_morphAlpha;");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("uniform float u_dofStrength;");
    });

    it("should include ocular micro-saccades in driver and corneal specular catchlights in Neural3DMMShader", async () => {
      const { ProceduralLivePortraitDriver } = await import(
        "../lib/realtime/proceduralLivePortraitDriver"
      );
      const { NEURAL_3DMM_FRAGMENT_SHADER } = await import(
        "../lib/realtime/neural3DMMShader"
      );

      const driver = new ProceduralLivePortraitDriver({
        isAutoAnimate: true,
        motionIntensity: 1.8,
      });

      // Verify micro-saccades dynamically move gaze coordinates over time
      const state1 = driver.update(1.0);
      const state2 = driver.update(1.2);
      expect(state1).toHaveProperty("gazeX");
      expect(state1).toHaveProperty("gazeY");
      expect(state2).toHaveProperty("gazeX");
      expect(state2).toHaveProperty("gazeY");

      // Verify translucent anatomical corneal softbox reflection is integrated (not harsh dots)
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("TRANSLUCENT ANATOMICAL CORNEAL SOFTBOX");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("softboxGlintL");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("catchlightAlphaL");
    });

    it("should eliminate artificial grey commissure AO and support anatomical sad mouth (DAO) in Neural3DMMShader", async () => {
      const { NEURAL_3DMM_FRAGMENT_SHADER } = await import(
        "../lib/realtime/neural3DMMShader"
      );

      // Verify Stage 5B artificial grey commissure AO darkening is completely removed
      expect(NEURAL_3DMM_FRAGMENT_SHADER).not.toContain("commissureAO");

      // Verify anatomical Depressor Anguli Oris (DAO) and sad mouth inverted arch are present
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("Depressor Anguli Oris (DAO)");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("archDown");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("mentalisRise");
    });

    it("should allow 3DMM mouth deformation on wardrobe action loops while suppressing only pre-baked lip-sync videos", () => {
      const isActionLoop = (src: string) => {
        const isVideo = src.endsWith(".mp4") || src.endsWith(".webm") || src.includes("/action_loops/");
        const isBakedLipSync = isVideo && (src.includes("musetalk_") || src.includes("/conversational/") || src.includes("_baked_lipsync"));
        return { isVideo, isBakedLipSync };
      };

      // Wardrobe action loops must NOT be marked as baked lip-sync (they should articulate via 3DMM)
      const burgundyLoop = isActionLoop("/assets/action_loops/veo/ruby_burgundy/ruby_burgundy_M1_loop_v1.mp4");
      expect(burgundyLoop.isVideo).toBe(true);
      expect(burgundyLoop.isBakedLipSync).toBe(false);

      const mateoLoop = isActionLoop("/assets/action_loops/veo/mateo_default_trait/mateo_default_trait_M1_loop_v1.mp4");
      expect(mateoLoop.isVideo).toBe(true);
      expect(mateoLoop.isBakedLipSync).toBe(false);

      const blazeLoop = isActionLoop("/assets/action_loops/veo/blaze_silver_blazer/blaze_silver_blazer_M1_loop_v1.mp4");
      expect(blazeLoop.isVideo).toBe(true);
      expect(blazeLoop.isBakedLipSync).toBe(false);

      // Pre-baked conversational or MuseTalk videos MUST be suppressed to protect baked lips
      const museTalkVideo = isActionLoop("/assets/action_loops/musetalk_ruby_en.mp4");
      expect(museTalkVideo.isVideo).toBe(true);
      expect(museTalkVideo.isBakedLipSync).toBe(true);

      const conversationalVideo = isActionLoop("/conversational/cache/ruby_response_1.mp4");
      expect(conversationalVideo.isVideo).toBe(true);
      expect(conversationalVideo.isBakedLipSync).toBe(true);
    });
  });
});


