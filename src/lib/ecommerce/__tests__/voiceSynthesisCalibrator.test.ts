/**
 * src/lib/ecommerce/__tests__/voiceSynthesisCalibrator.test.ts
 *
 * Unit tests for voice synthesis duration estimation, RIFF WAV generation,
 * decoded audio duration measurement, and timeline ripple shifting.
 */

import { describe, it, expect } from "vitest";
import {
  estimateSpeechDuration,
  createSpeechTimedWavBlob,
  getDecodedAudioDuration,
  calculateRippleShiftedScenes,
  synthesizeSceneVoice,
  batchSynthesizeAllScenes,
  computeAudioCacheKey,
  isVideoScene,
  isVideoMediaUrl,
  getVideoSceneMediaUrl,
  deleteSceneAudioFileAndCache,
  clearAudioCacheEntry,
  audioCacheStore,
} from "../voiceSynthesisCalibrator";
import { AdScene } from "@/lib/types/ecommerce";

describe("Voice Synthesis & Timeline Calibration Engine", () => {
  const mockScenes: AdScene[] = [
    {
      id: "scene_0",
      sceneIndex: 0,
      startFrame: 0,
      durationFrames: 90, // 3.0s initial default
      sceneType: "pattern_interrupt_hook",
      headline: "Stop Scrolling",
      voiceoverScript: "¿Buscás transformar tus espacios sin obra molesta?! Mirá cómo esto transforma todo por completo.",
      primaryMediaUrl: "/sample.png",
      visualActionPrompt: "Camera zooms in",
    },
    {
      id: "scene_1",
      sceneIndex: 1,
      startFrame: 90,
      durationFrames: 120, // 4.0s initial default
      sceneType: "product_turntable",
      headline: "360 Rotation",
      voiceoverScript: "100% impermeable, resistente a rayones y fácil de limpiar.",
      primaryMediaUrl: "/sample.png",
      visualActionPrompt: "Turntable spins",
    },
    {
      id: "scene_2",
      sceneIndex: 2,
      startFrame: 210,
      durationFrames: 90,
      sceneType: "price_promo_outro",
      headline: "Limited Offer",
      voiceoverScript: "Aprovechá 10% de descuento y cuotas sin interés.",
      primaryMediaUrl: "/sample.png",
      visualActionPrompt: "CTA button bounces",
    },
  ];

  describe("estimateSpeechDuration", () => {
    it("estimates realistic speech duration based on commercial words-per-minute cadence", () => {
      const shortText = "Hola Mundo.";
      const duration = estimateSpeechDuration(shortText);
      expect(duration).toBeGreaterThanOrEqual(1.5); // Minimum threshold

      const longerText = "Este piso vinílico de alta resistencia es ideal para hogares con mascotas y niños. No se raya y se instala en el día.";
      const longerDuration = estimateSpeechDuration(longerText);
      // 21 words + punctuation pauses should be around 8-10 seconds
      expect(longerDuration).toBeGreaterThan(6.0);
      expect(longerDuration).toBeLessThan(14.0);
    });

    it("adjusts duration proportionally when speed factor is modified", () => {
      const text = "Aprovechá nuestras ofertas exclusivas de temporada antes de que se agoten.";
      const normal = estimateSpeechDuration(text, 1.0);
      const fast = estimateSpeechDuration(text, 1.5);
      const slow = estimateSpeechDuration(text, 0.75);

      expect(fast).toBeLessThan(normal);
      expect(slow).toBeGreaterThan(normal);
    });
  });

  describe("createSpeechTimedWavBlob & getDecodedAudioDuration", () => {
    it("creates a valid 16-bit PCM RIFF WAV audio blob", async () => {
      const text = "Transformá tus pisos en horas sin polvo.";
      const blob = createSpeechTimedWavBlob(text, 1.0, 24000);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("audio/wav");
      expect(blob.size).toBeGreaterThan(44); // Larger than WAV header

      // Verify RIFF header bytes
      const buffer = await blob.arrayBuffer();
      const view = new DataView(buffer);
      const riffHeader = String.fromCharCode(
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3)
      );
      expect(riffHeader).toBe("RIFF");

      const waveFormat = String.fromCharCode(
        view.getUint8(8),
        view.getUint8(9),
        view.getUint8(10),
        view.getUint8(11)
      );
      expect(waveFormat).toBe("WAVE");
    });

    it("decodes the exact duration from the WAV header fallback", async () => {
      const text = "Envíos gratis a todo el país comprando hoy.";
      const expectedSeconds = estimateSpeechDuration(text, 1.0);
      const blob = createSpeechTimedWavBlob(text, 1.0, 24000);

      const decodedDuration = await getDecodedAudioDuration(blob);
      expect(decodedDuration).toBeCloseTo(expectedSeconds, 1);
    });
  });

  describe("calculateRippleShiftedScenes", () => {
    it("updates target scene duration and ripple-shifts subsequent scenes", () => {
      // Scene 0 calibrated to 150 frames (5.0s) instead of 90 frames
      const calibrated = calculateRippleShiftedScenes(
        mockScenes,
        0,
        150,
        "blob:http://localhost:3000/audio-0",
        5.0
      );

      // Scene 0
      expect(calibrated[0].startFrame).toBe(0);
      expect(calibrated[0].durationFrames).toBe(150);
      expect(calibrated[0].audioUrl).toBe("blob:http://localhost:3000/audio-0");
      expect(calibrated[0].audioDuration).toBe(5.0);

      // Scene 1 (starts right after scene 0 ends: 0 + 150 = 150)
      expect(calibrated[1].startFrame).toBe(150);
      expect(calibrated[1].durationFrames).toBe(120);

      // Scene 2 (starts right after scene 1 ends: 150 + 120 = 270)
      expect(calibrated[2].startFrame).toBe(270);
      expect(calibrated[2].durationFrames).toBe(90);
    });

    it("leaves prior scenes intact when a middle scene is calibrated", () => {
      // Scene 1 calibrated to 90 frames instead of 120 frames
      const calibrated = calculateRippleShiftedScenes(
        mockScenes,
        1,
        90,
        "blob:http://localhost:3000/audio-1",
        3.0
      );

      // Scene 0 unchanged
      expect(calibrated[0].startFrame).toBe(0);
      expect(calibrated[0].durationFrames).toBe(90);

      // Scene 1 updated
      expect(calibrated[1].startFrame).toBe(90);
      expect(calibrated[1].durationFrames).toBe(90);

      // Scene 2 shifted backward: 90 + 90 = 180 (previously 210)
      expect(calibrated[2].startFrame).toBe(180);
      expect(calibrated[2].durationFrames).toBe(90);
    });

    it("preserves video duration (minimum 8.0s / 240 frames) for generated video scenes when audio is shorter", () => {
      const videoScenes: AdScene[] = [
        {
          id: "scene_veo_0",
          sceneIndex: 0,
          startFrame: 0,
          durationFrames: 240, // 8.0s Veo video
          sceneType: "custom_veo_hero",
          headline: "Transformá Tus Espacios",
          voiceoverScript: "Descubrí la textura y calidez de este piso.",
          primaryMediaUrl: "/assets/ecommerce/veo_scenes/veo_custom_123.mp4",
          customVeoVideoUrl: "/assets/ecommerce/veo_scenes/veo_custom_123.mp4",
          visualActionPrompt: "Cinematic flyover",
        },
        {
          id: "scene_1",
          sceneIndex: 1,
          startFrame: 240,
          durationFrames: 120,
          sceneType: "pattern_interrupt_hook",
          headline: "Second Scene",
          voiceoverScript: "Segunda escena",
          primaryMediaUrl: "/sample.png",
          visualActionPrompt: "Zoom in",
        },
      ];

      expect(isVideoScene(videoScenes[0])).toBe(true);
      expect(isVideoScene(videoScenes[1])).toBe(false);

      // Calibrate scene 0 with short 3.2s audio (96 frames)
      const calibrated = calculateRippleShiftedScenes(
        videoScenes,
        0,
        96,
        "blob:http://localhost:3000/audio-short",
        3.2
      );

      // Scene 0 MUST preserve its 240 frames (8.0s) rather than shrinking to 96 frames
      expect(calibrated[0].durationFrames).toBe(240);
      expect(calibrated[0].startFrame).toBe(0);
      expect(calibrated[0].audioUrl).toBe("blob:http://localhost:3000/audio-short");
      expect(calibrated[0].audioDuration).toBe(3.2);

      // Subsequent scene must start after the 240-frame video scene
      expect(calibrated[1].startFrame).toBe(240);
      expect(calibrated[1].durationFrames).toBe(120);
    });

    it("expands video scene duration if audio is longer than 8.0s (240 frames)", () => {
      const videoScenes: AdScene[] = [
        {
          id: "scene_veo_0",
          sceneIndex: 0,
          startFrame: 0,
          durationFrames: 240,
          sceneType: "custom_veo_hero",
          headline: "Transformá Tus Espacios",
          voiceoverScript: "Un texto muy largo que toma más de 8 segundos en ser pronunciado.",
          primaryMediaUrl: "/assets/ecommerce/veo_scenes/veo_custom_123.mp4",
          customVeoVideoUrl: "/assets/ecommerce/veo_scenes/veo_custom_123.mp4",
          visualActionPrompt: "Cinematic flyover",
        },
        {
          id: "scene_1",
          sceneIndex: 1,
          startFrame: 240,
          durationFrames: 120,
          sceneType: "pattern_interrupt_hook",
          headline: "Second Scene",
          voiceoverScript: "Segunda escena",
          primaryMediaUrl: "/sample.png",
          visualActionPrompt: "Zoom in",
        },
      ];

      // Calibrate scene 0 with 10.0s audio (300 frames)
      const calibrated = calculateRippleShiftedScenes(
        videoScenes,
        0,
        300,
        "blob:http://localhost:3000/audio-long",
        10.0
      );

      // Must expand to 300 frames to prevent audio clipping
      expect(calibrated[0].durationFrames).toBe(300);
      expect(calibrated[1].startFrame).toBe(300);
    });

    it("correctly identifies video media URLs and scenes", () => {
      expect(isVideoMediaUrl("https://domain.com/video.mp4")).toBe(true);
      expect(isVideoMediaUrl("https://domain.com/video.webm")).toBe(true);
      expect(isVideoMediaUrl("/assets/ecommerce/veo_scenes/sample.mp4?v=1")).toBe(true);
      expect(isVideoMediaUrl("/assets/images/photo.png")).toBe(false);
      expect(isVideoMediaUrl(undefined)).toBe(false);

      expect(getVideoSceneMediaUrl({
        id: "1",
        sceneIndex: 0,
        startFrame: 0,
        durationFrames: 240,
        sceneType: "custom_veo_hero",
        headline: "Veo Video",
        visualActionPrompt: "Prompt 1",
        primaryMediaUrl: "/storage/veo_123.mp4",
        customVeoVideoUrl: "/storage/veo_123.mp4",
      })).toBe("/storage/veo_123.mp4");

      expect(getVideoSceneMediaUrl({
        id: "2",
        sceneIndex: 1,
        startFrame: 0,
        durationFrames: 240,
        sceneType: "custom_veo_hero",
        headline: "Hero Video",
        visualActionPrompt: "Prompt 2",
        primaryMediaUrl: "/storage/bg_video.webm",
      })).toBe("/storage/bg_video.webm");

      expect(getVideoSceneMediaUrl({
        id: "3",
        sceneIndex: 2,
        startFrame: 0,
        durationFrames: 90,
        sceneType: "pattern_interrupt_hook",
        headline: "Pattern Hook",
        visualActionPrompt: "Prompt 3",
        primaryMediaUrl: "/photo.png",
      })).toBeUndefined();
    });
  });

  describe("synthesizeSceneVoice fallback & batch calibration", () => {
    it("synthesizes scene voice using self-healing speech calibrator fallback", async () => {
      // Offline fallback
      const result = await synthesizeSceneVoice(
        "Renová tus pisos hoy con Garantía Oficial.",
        { speed: 1.0 }
      );

      expect(result.blob).toBeDefined();
      expect(result.durationSeconds).toBeGreaterThan(1.5);
      expect(result.durationFrames).toBe(Math.round(result.durationSeconds * 30));
      expect(result.url).toBeDefined();
    });

    it("batch calibrates all scenes and updates cumulative timeline frames", async () => {
      let progressCount = 0;
      const calibrated = await batchSynthesizeAllScenes(
        mockScenes,
        { speed: 1.0 },
        () => {
          progressCount++;
        }
      );

      expect(calibrated.length).toBe(3);
      expect(progressCount).toBeGreaterThan(0);

      // Verify strict continuity: scene[i].startFrame === scene[i-1].startFrame + scene[i-1].durationFrames
      expect(calibrated[0].startFrame).toBe(0);
      expect(calibrated[1].startFrame).toBe(calibrated[0].startFrame + calibrated[0].durationFrames);
      expect(calibrated[2].startFrame).toBe(calibrated[1].startFrame + calibrated[1].durationFrames);

      // Verify each scene has its audioUrl populated
      calibrated.forEach((s) => {
        expect(s.audioUrl).toBeDefined();
        expect(s.durationFrames).toBeGreaterThan(30);
      });
    });

    it("skips audio synthesis for video scenes and assigns native video audio track", async () => {
      const mixedScenes: AdScene[] = [
        {
          id: "scene_veo",
          sceneIndex: 0,
          startFrame: 0,
          durationFrames: 240, // 8.0s Veo video
          sceneType: "custom_veo_hero",
          headline: "Veo Generated Video",
          voiceoverScript: "Texto de la escena de video con diálogo nativo generado",
          customVeoVideoUrl: "/storage/ecommerce/veo/scene_0_veo.mp4",
          primaryMediaUrl: "/storage/ecommerce/veo/scene_0_veo.mp4",
          visualActionPrompt: "Presenter demonstrates flooring",
        },
        {
          id: "scene_photo",
          sceneIndex: 1,
          startFrame: 240,
          durationFrames: 90,
          sceneType: "pattern_interrupt_hook",
          headline: "Photo Scene",
          voiceoverScript: "Oferta especial por tiempo limitado.",
          primaryMediaUrl: "/sample.png",
          visualActionPrompt: "Product photo",
        },
      ];

      const calibrated = await batchSynthesizeAllScenes(mixedScenes, { speed: 1.0 });

      expect(calibrated.length).toBe(2);

      // Scene 0 (Video scene): Must use the video URL as its audio track and preserve 240f duration!
      expect(calibrated[0].audioUrl).toBe("/storage/ecommerce/veo/scene_0_veo.mp4");
      expect(calibrated[0].audioCacheKey).toBe("video::/storage/ecommerce/veo/scene_0_veo.mp4");
      expect(calibrated[0].durationFrames).toBe(240);
      expect(calibrated[0].startFrame).toBe(0);

      // Scene 1 (Photo scene): Must have synthesized audio and ripple shifted after Scene 0
      expect(calibrated[1].startFrame).toBe(240);
      expect(calibrated[1].audioUrl).toBeDefined();
      expect(calibrated[1].audioUrl).not.toBe(mixedScenes[1].primaryMediaUrl);
    });

    it("generates deterministic cache keys containing language and checkpoint", () => {
      const spanishKey = computeAudioCacheKey("Che, mirá este piso increíble", {
        personaId: "ruby",
        engine: "piper",
        model: "es_AR-daniela-high",
        language: "es",
      });
      expect(spanishKey).toContain("ruby");
      expect(spanishKey).toContain("piper");
      expect(spanishKey).toContain("es_AR-daniela-high");
      expect(spanishKey).toContain("es");

      const englishKey = computeAudioCacheKey("Check out this amazing floor", {
        personaId: "ruby",
        engine: "piper",
        model: "en_US-amy-medium",
        language: "en",
      });
      expect(englishKey).toContain("ruby");
      expect(englishKey).toContain("en_US-amy-medium");
      expect(englishKey).toContain("en");
      expect(spanishKey).not.toBe(englishKey);

      // Partitions cache key when cloning is disabled
      const noCloneKey = computeAudioCacheKey("Che, mirá este piso increíble", {
        personaId: "ruby",
        engine: "omni",
        model: "k2-fsa/OmniVoice",
        language: "es",
        disableCloningIfDifferentLanguage: true,
      });
      const cloneKey = computeAudioCacheKey("Che, mirá este piso increíble", {
        personaId: "ruby",
        engine: "omni",
        model: "k2-fsa/OmniVoice",
        language: "es",
        disableCloningIfDifferentLanguage: false,
      });
      expect(noCloneKey).toContain("::noclone");
      expect(cloneKey).not.toContain("::noclone");
      expect(noCloneKey).not.toBe(cloneKey);
    });

    it("clears cached entries and permanently purges corrupted audio via deleteSceneAudioFileAndCache", async () => {
      const mockKey = "test-corrupt-audio-key";
      const mockUrl = "/storage/ecommerce/audio/ruby_corrupt_test.wav";

      // Populate dummy entry in audioCacheStore
      audioCacheStore.set(mockKey, {
        blob: new Blob(["dummy"]),
        url: mockUrl,
        durationSeconds: 3.5,
        durationFrames: 105,
        source: "modern_tts",
        cacheKey: mockKey,
      });

      expect(audioCacheStore.has(mockKey)).toBe(true);

      // Invoke deleteSceneAudioFileAndCache with the cacheKey and audioUrl
      const success = await deleteSceneAudioFileAndCache({
        cacheKey: mockKey,
        audioUrl: mockUrl,
        productId: "prod_123",
        sceneIndex: 0,
      });

      expect(success).toBe(true);
      expect(audioCacheStore.has(mockKey)).toBe(false);
    });
  });
});


