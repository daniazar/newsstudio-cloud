import { describe, it, expect } from "vitest";
import {
  computeAudioCacheKey,
  audioCacheStore,
  calculateRippleShiftedScenes,
} from "@/lib/ecommerce/voiceSynthesisCalibrator";
import { AdScene } from "@/lib/types/ecommerce";

describe("BatchVoiceGenerationCard & Audio Caching Logic", () => {
  const mockScenes: AdScene[] = [
    {
      id: "scene-1",
      sceneIndex: 0,
      startFrame: 0,
      durationFrames: 90,
      sceneType: "pattern_interrupt_hook",
      headline: "¿Buscás renovar tu espacio?",
      visualActionPrompt: "Prompt 1",
      voiceoverScript: "¡Atención! La revolución en pisos ya llegó a tu casa.",
      primaryMediaUrl: "https://example.com/hero.jpg",
    },
    {
      id: "scene-2",
      sceneIndex: 1,
      startFrame: 90,
      durationFrames: 90,
      sceneType: "3d_exploded_blueprint",
      headline: "100% Impermeable y de Alto Tránsito",
      visualActionPrompt: "Prompt 2",
      voiceoverScript: "Garantía de por vida, resistente a rayones y fácil instalación.",
      primaryMediaUrl: "https://example.com/texture.jpg",
    },
  ];

  it("computes deterministic audio cache keys based on text and voice params", () => {
    const key1 = computeAudioCacheKey("Texto de prueba", {
      personaId: "sofia",
      speed: 1.0,
      pitchShift: 0,
      engine: "omni",
      language: "es",
    });

    const key2 = computeAudioCacheKey("Texto de prueba", {
      personaId: "sofia",
      speed: 1.0,
      pitchShift: 0,
      engine: "omni",
      language: "es",
    });

    const keyDifferentPersona = computeAudioCacheKey("Texto de prueba", {
      personaId: "mateo",
      speed: 1.0,
      pitchShift: 0,
      engine: "omni",
      language: "es",
    });

    expect(key1).toBe(key2);
    expect(key1).not.toBe(keyDifferentPersona);
  });

  it("correctly ripple-shifts scene frames when a scene duration is calibrated", () => {
    // Calibrate scene 0 from 90 frames (3s) to 120 frames (4s)
    const shifted = calculateRippleShiftedScenes(
      mockScenes,
      0,
      120,
      "https://example.com/audio1.wav",
      4.0,
      "cache-key-1"
    );

    expect(shifted[0].durationFrames).toBe(120);
    expect(shifted[0].startFrame).toBe(0);
    expect(shifted[0].audioUrl).toBe("https://example.com/audio1.wav");
    expect(shifted[0].audioCacheKey).toBe("cache-key-1");

    // Scene 1 must ripple-shift from 90 to 120
    expect(shifted[1].startFrame).toBe(120);
    expect(shifted[1].durationFrames).toBe(90);
  });

  it("stores and retrieves cached voice results in audioCacheStore", () => {
    const testKey = "audio::test-persona::key";
    audioCacheStore.set(testKey, {
      blob: new Blob(["dummy"]),
      url: "blob:http://localhost/test",
      durationSeconds: 3.5,
      durationFrames: 105,
      source: "speech_calibrator",
      cacheKey: testKey,
    });

    expect(audioCacheStore.has(testKey)).toBe(true);
    const cached = audioCacheStore.get(testKey);
    expect(cached?.durationSeconds).toBe(3.5);
    expect(cached?.durationFrames).toBe(105);

    audioCacheStore.delete(testKey);
    expect(audioCacheStore.has(testKey)).toBe(false);
  });

  it("preserves video baseline duration and handles video scenes properly in ripple shift", () => {
    const videoScenes: AdScene[] = [
      {
        id: "scene-video",
        sceneIndex: 0,
        startFrame: 0,
        durationFrames: 240,
        sceneType: "custom_veo_hero",
        headline: "Veo Scene",
        voiceoverScript: "Script",
        visualActionPrompt: "Presenter demonstrates product",
        primaryMediaUrl: "/storage/veo.mp4",
        customVeoVideoUrl: "/storage/veo.mp4",
      },
      {
        id: "scene-next",
        sceneIndex: 1,
        startFrame: 240,
        durationFrames: 90,
        sceneType: "pattern_interrupt_hook",
        headline: "Next",
        voiceoverScript: "Next",
        visualActionPrompt: "Photo zoom",
        primaryMediaUrl: "/photo.png",
      },
    ];

    const shifted = calculateRippleShiftedScenes(
      videoScenes,
      0,
      240,
      "/storage/veo.mp4",
      8.0,
      "video::/storage/veo.mp4"
    );

    expect(shifted[0].durationFrames).toBe(240);
    expect(shifted[0].audioUrl).toBe("/storage/veo.mp4");
    expect(shifted[0].audioCacheKey).toBe("video::/storage/veo.mp4");
    expect(shifted[1].startFrame).toBe(240);
  });
});
