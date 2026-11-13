/**
 * src/lib/realtime/__tests__/visemeHashing.test.ts
 *
 * Unit Test Suite for 64-bit Acoustic SimHash, Hamming Distance Parity,
 * Hermite Easing Curves, and Biomechanical Trajectory Disambiguation.
 */

import { describe, it, expect, beforeAll } from "vitest";
import fs from "fs";
import path from "path";
import { AcousticSimHashEngine } from "../visemeSimHash";
import { HermiteEasing } from "../hermiteEasing";
import { VisemeCodebookService, VisemeCodebookJson } from "../visemeCodebook";
import { AudioFeatureUnpacker } from "../audioFeatureUnpacker";

describe("AcousticSimHashEngine", () => {
  it("initializes exactly 64 deterministic hyperplanes in R^384", () => {
    const proj = AcousticSimHashEngine.getProjections();
    expect(proj.length).toBe(64);
    expect(proj[0].length).toBe(384);

    // Verify deterministic Gaussian projection values (Seed 42)
    expect(proj[0][0]).toBeCloseTo(0.026603, 5);

    // Verify each hyperplane is unit-normalized
    let normSq = 0;
    for (let j = 0; j < 384; j++) {
      normSq += proj[0][j] * proj[0][j];
    }
    expect(normSq).toBeCloseTo(1.0, 4);
  });

  it("produces an exact 16-hex lowercase zero-padded string", () => {
    // Synthetic 50x384 input of zeros
    const zeroSlice = new Float32Array(50 * 384);
    const hashZero = AcousticSimHashEngine.computeSimHash(zeroSlice);
    expect(hashZero).toBeDefined();
    expect(hashZero.length).toBe(16);
    expect(typeof hashZero).toBe("string");
    expect(/^[0-9a-f]{16}$/.test(hashZero)).toBe(true);

    // Synthetic slice of all 1.0s
    const onesSlice = new Float32Array(50 * 384).fill(1.0);
    const hashOnes = AcousticSimHashEngine.computeSimHash(onesSlice);
    expect(hashOnes.length).toBe(16);
    expect(/^[0-9a-f]{16}$/.test(hashOnes)).toBe(true);
  });

  it("is 100% deterministic on repeated evaluations", () => {
    const slice = new Float32Array(50 * 384);
    for (let i = 0; i < slice.length; i++) {
      slice[i] = Math.cos(i * 0.1);
    }
    const hash1 = AcousticSimHashEngine.computeSimHash(slice);
    const hash2 = AcousticSimHashEngine.computeSimHash(slice);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(16);
  });

  it("calculates exact bitwise popcount", () => {
    expect(AcousticSimHashEngine.popcnt(0)).toBe(0);
    expect(AcousticSimHashEngine.popcnt(1)).toBe(1);
    expect(AcousticSimHashEngine.popcnt(0x0f0f0f0f)).toBe(16);
    expect(AcousticSimHashEngine.popcnt(0xffffffff)).toBe(32);
    expect(AcousticSimHashEngine.popcnt(0x55555555)).toBe(16);
    expect(AcousticSimHashEngine.popcnt(0xaaaaaaaa)).toBe(16);
  });

  it("calculates Hamming distance with mathematical symmetry and identity", () => {
    const h1 = "c1e1f0f0787c3c1e";
    const h2 = "0f0787c3c1e1f0f0";

    // Identity: d(A, A) === 0
    expect(AcousticSimHashEngine.hammingDistance(h1, h1)).toBe(0);
    expect(AcousticSimHashEngine.hammingDistance(h2, h2)).toBe(0);

    // Symmetry: d(A, B) === d(B, A)
    expect(AcousticSimHashEngine.hammingDistance(h1, h2)).toBe(
      AcousticSimHashEngine.hammingDistance(h2, h1)
    );

    // 1-bit difference
    expect(
      AcousticSimHashEngine.hammingDistance("0000000000000000", "0000000000000001")
    ).toBe(1);

    // Full 64-bit difference
    expect(
      AcousticSimHashEngine.hammingDistance("0000000000000000", "ffffffffffffffff")
    ).toBe(64);

    // Handles unpadded strings without throwing
    expect(
      AcousticSimHashEngine.hammingDistance("1", "0000000000000001")
    ).toBe(0);
  });
});

describe("HermiteEasing", () => {
  it("returns 0.0 in deep silence and 1.0 in stable speech", () => {
    // 20 frames with silence between frames 10 and 15
    const mask = new Array(20).fill(false);
    for (let i = 10; i <= 15; i++) mask[i] = true;
    const total = mask.length;

    // Frame 12 is in deep silence
    const silenceVal = HermiteEasing.computeSpeechPresence(12, total, mask, 3);
    expect(silenceVal).toBe(0.0);

    // Frame 5 is in stable continuous speech (>3 frames from clip start and >3 frames from silence)
    const speechVal = HermiteEasing.computeSpeechPresence(5, total, mask, 3);
    expect(speechVal).toBe(1.0);
  });

  it("smooths onset and offset via cubic Hermite polynomial", () => {
    // 10 frames of speech
    const mask = new Array(10).fill(false);
    const weights = HermiteEasing.computePresenceWeights(10, mask, 4);

    // Attack from frame 0
    expect(weights[0]).toBe(0.0);
    expect(weights[1]).toBeGreaterThan(0.0);
    expect(weights[2]).toBeGreaterThan(weights[1]);
    expect(weights[3]).toBeCloseTo(0.844, 2);
    expect(weights[4]).toBe(1.0);
  });

  it("computes proportional aperture from audio RMS", () => {
    expect(HermiteEasing.computeTargetAperture(0.005, true)).toBe(0.08); // Silent
    expect(HermiteEasing.computeTargetAperture(0.01, false)).toBe(0.08); // Below threshold

    const midAp = HermiteEasing.computeTargetAperture(0.12, false);
    expect(midAp).toBeGreaterThan(4.0);
    expect(midAp).toBeLessThan(20.0);

    const loudAp = HermiteEasing.computeTargetAperture(0.35, false);
    expect(loudAp).toBeCloseTo(32.0, 0.5);

    const boundedAp = HermiteEasing.computeTargetAperture(0.35, false, 0.5, 18.0);
    expect(boundedAp).toBeCloseTo(18.0, 0.5);
  });
});

describe("VisemeCodebookService", () => {
  let service: VisemeCodebookService;
  const codebookPath = path.resolve(
    process.cwd(),
    "public/assets/avatars/visemes/ruby_burgundy_ditto_codebook.json"
  );

  beforeAll(async () => {
    service = new VisemeCodebookService();
    const raw = fs.readFileSync(codebookPath, "utf-8");
    const json = JSON.parse(raw) as VisemeCodebookJson;
    await service.loadFromJson(json, false);
  });

  it("loads 256 canonical visemes from Ditto codebook", () => {
    expect(service.size).toBe(256);
    const visemes = service.getVisemes();
    expect(visemes.length).toBe(256);

    // Verify all hashes are 16 hex chars
    for (const v of visemes) {
      expect(v.simHash.length).toBe(16);
      expect(/^[0-9a-f]{16}$/.test(v.simHash)).toBe(true);
      expect(v.aperture).toBeGreaterThanOrEqual(0.0);
    }
  });

  it("finds exact 0-distance match for all canonical codebook hashes", () => {
    const visemes = service.getVisemes();
    for (const v of visemes) {
      const match = service.findNearestViseme(v.simHash);
      expect(match).not.toBeNull();
      expect(match!.dist).toBe(0);
    }
  });

  it("never gets trapped in hysteresis (hysteresis immunity test)", () => {
    // Starting with closed mouth (0.08px)
    const prevAp = 0.08;
    // An incoming vowel sound with high energy target aperture (16.0px)
    const targetAp = 16.0;
    // Query with an open vowel hash from the codebook
    const openViseme = service.getVisemes().find(v => (v.aperture ?? 0) > 20.0);
    expect(openViseme).toBeDefined();
    const queryHash = openViseme!.simHash;

    const match = service.findBiomechanicalViseme(queryHash, targetAp, prevAp);
    expect(match).not.toBeNull();
    // Aperture must open up, not remain stuck at 0.08!
    expect(match!.entry.aperture).toBeGreaterThanOrEqual(12.0);
  });

  it("articulates dynamically across real Whisper features without sticking", () => {
    // Test user_hello audio features
    const metaPath = path.resolve(
      process.cwd(),
      "public/assets/audio_features/user_hello.audio_features.json"
    );
    const binPath = path.resolve(
      process.cwd(),
      "public/assets/audio_features/user_hello.audio_features.bin"
    );

    if (fs.existsSync(metaPath) && fs.existsSync(binPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      const binBuf = fs.readFileSync(binPath);
      const u16 = new Uint16Array(binBuf.buffer, binBuf.byteOffset, binBuf.byteLength / 2);
      const f32 = new Float32Array(u16.length);
      for (let i = 0; i < u16.length; i++) {
        f32[i] = AudioFeatureUnpacker.decodeFloat16(u16[i]);
      }

      const numFrames = meta.numFrames;
      const rmsArr = meta.rms || [];
      const silenceMask = meta.silenceMask || [];

      const visitedClusters: number[] = [];
      const apertures: number[] = [];
      let prevAp = 0.08;

      for (let f = 0; f < numFrames; f++) {
        const slice = f32.subarray(f * 50 * 384, (f + 1) * 50 * 384);
        const hash = AcousticSimHashEngine.computeSimHash(slice);
        const isSilent = Boolean(silenceMask[f]) || (rmsArr.length > f && rmsArr[f] < 0.015);

        let match;
        if (isSilent) {
          match = { entry: service.getNeutralEntry()!, dist: 0, cost: 0 };
        } else {
          const rms = rmsArr.length > f ? rmsArr[f] : 0.10;
          const targetAp = HermiteEasing.computeTargetAperture(rms, false);
          match = service.findBiomechanicalViseme(hash, targetAp, prevAp);
        }

        expect(match).not.toBeNull();
        prevAp = match!.entry.aperture;
        visitedClusters.push(match!.entry.clusterId);
        apertures.push(match!.entry.aperture);
      }

      const uniqueClusters = new Set(visitedClusters);
      // Assert speech diversity: must visit at least 5 different mouth shapes!
      expect(uniqueClusters.size).toBeGreaterThanOrEqual(5);

      // Assert vowel openness: maximum aperture must reach at least 14.0px
      const maxAp = Math.max(...apertures);
      expect(maxAp).toBeGreaterThanOrEqual(14.0);

      // Assert resting close: last frame of hello finishes closed or near closed (< 1.5px)
      const lastAp = apertures[apertures.length - 1];
      expect(lastAp).toBeLessThan(1.5);
    }
  });

  it("articulates Spanish and longer speech without sticking or freezing", () => {
    for (const testName of ["user_hola", "cli_voice_ruby"]) {
      const metaPath = path.resolve(
        process.cwd(),
        `public/assets/audio_features/${testName}.audio_features.json`
      );
      const binPath = path.resolve(
        process.cwd(),
        `public/assets/audio_features/${testName}.audio_features.bin`
      );

      if (!fs.existsSync(metaPath) || !fs.existsSync(binPath)) continue;

      const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      const binBuf = fs.readFileSync(binPath);
      const u16 = new Uint16Array(binBuf.buffer, binBuf.byteOffset, binBuf.byteLength / 2);
      const f32 = new Float32Array(u16.length);
      for (let i = 0; i < u16.length; i++) {
        f32[i] = AudioFeatureUnpacker.decodeFloat16(u16[i]);
      }

      const numFrames = meta.numFrames;
      const rmsArr = meta.rms || [];
      const silenceMask = meta.silenceMask || [];
      const clusters: number[] = [];
      const apertures: number[] = [];
      let prevAp = 0.08;

      for (let f = 0; f < numFrames; f++) {
        const slice = f32.subarray(f * 50 * 384, (f + 1) * 50 * 384);
        const hash = AcousticSimHashEngine.computeSimHash(slice);
        const isSilent = Boolean(silenceMask[f]) || (rmsArr.length > f && rmsArr[f] < 0.015);

        let match;
        if (isSilent) {
          match = { entry: service.getNeutralEntry()!, dist: 0, cost: 0 };
        } else {
          const rms = rmsArr.length > f ? rmsArr[f] : 0.10;
          const targetAp = HermiteEasing.computeTargetAperture(rms, false);
          match = service.findBiomechanicalViseme(hash, targetAp, prevAp);
        }

        expect(match).not.toBeNull();
        prevAp = match!.entry.aperture;
        clusters.push(match!.entry.clusterId);
        apertures.push(match!.entry.aperture);
      }

      const unique = new Set(clusters);
      if (testName === "user_hola") {
        expect(unique.size).toBeGreaterThanOrEqual(4);
      } else if (testName === "cli_voice_ruby") {
        expect(unique.size).toBeGreaterThanOrEqual(10);
      }
      expect(Math.max(...apertures)).toBeGreaterThanOrEqual(15.0);
    }
  });

  describe("HermiteEasing Anticipatory Coarticulation", () => {
    it("shapes aperture ahead of upcoming loud vowels via 4-tap lookahead", () => {
      // Create a sequence with gradual vowel onset at frame 5
      const rawAps = new Float32Array([0.08, 0.08, 0.08, 0.08, 5.0, 15.0, 18.0, 18.0, 0.08, 0.08]);
      const rms = [0.03, 0.03, 0.04, 0.06, 0.10, 0.18, 0.25, 0.25, 0.03, 0.03];

      const smoothed = HermiteEasing.computeAnticipatoryAperture(rawAps, rms);

      // Frame 2 and Frame 3 must already begin opening anticipatorily before the loud vowel arrives
      expect(smoothed[2]).toBeGreaterThan(rawAps[2]);
      expect(smoothed[3]).toBeGreaterThan(smoothed[2]);
      expect(smoothed[4]).toBeGreaterThan(smoothed[3]);
    });

    it("clamps aperture to bilabial pre-closure prior to plosive sound bursts (/p/, /b/, /m/)", () => {
      // Silence -> Sharp plosive burst at frame 3
      const rawAps = new Float32Array([0.08, 0.08, 0.08, 15.0, 15.0, 15.0]);
      const rms = [0.01, 0.01, 0.02, 0.22, 0.22, 0.22];

      const smoothed = HermiteEasing.computeAnticipatoryAperture(rawAps, rms, {
        plosiveSurgeThreshold: 0.12,
        plosiveClampAperture: 0.40,
      });

      // Frame 2 (immediately prior to burst at frame 3) must be clamped to <= 0.40px for bilabial seal
      expect(smoothed[2]).toBeLessThanOrEqual(0.4001);
    });

    it("strictly bounds opening velocity <= 4.5px/frame and closing velocity <= 3.0px/frame", () => {
      // Extreme step from 0.08 to 30.0 back to 0.08
      const rawAps = new Float32Array([0.08, 30.0, 30.0, 0.08, 0.08]);
      const rms = [0.01, 0.30, 0.30, 0.01, 0.01];

      const smoothed = HermiteEasing.computeAnticipatoryAperture(rawAps, rms, {
        maxOpenVelocity: 4.5,
        maxCloseVelocity: 3.0,
      });

      for (let f = 1; f < smoothed.length; f++) {
        const delta = smoothed[f] - smoothed[f - 1];
        expect(delta).toBeLessThanOrEqual(4.5001);
        expect(delta).toBeGreaterThanOrEqual(-3.0001);
      }
    });

    it("computes 64-bit coarticulation-aware SimHash across multi-frame sliding context (Phase 6)", () => {
      const sliceA = new Float32Array(50 * 384).fill(0.2);
      const sliceB = new Float32Array(50 * 384).fill(0.8);
      const sliceC = new Float32Array(50 * 384).fill(0.5);

      const contextHash = AcousticSimHashEngine.computeContextSimHash([sliceA, sliceB, sliceC], 1);
      expect(contextHash).toHaveLength(16);
      expect(/^[0-9a-f]{16}$/.test(contextHash)).toBe(true);

      // Single frame fallback
      const singleHash = AcousticSimHashEngine.computeContextSimHash([sliceA], 0);
      const directHash = AcousticSimHashEngine.computeSimHash(sliceA);
      expect(singleHash).toBe(directHash);
    });
  });
});

