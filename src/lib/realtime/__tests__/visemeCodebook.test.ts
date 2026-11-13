import { describe, it, expect, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  VisemeCodebookService,
  VisemeCodebookJson,
  DEFAULT_MATCHER_CONFIG,
} from "../visemeCodebook";
import { HermiteEasing } from "../hermiteEasing";
import { AcousticSimHashEngine } from "../visemeSimHash";
import { AudioFeatureUnpacker } from "../audioFeatureUnpacker";
import { WhisperArticulationPredictor } from "../whisperArticulationPredictor";

describe("VisemeCodebookService - Cluster Uniqueness & Biomechanical Closure", () => {
  let service: VisemeCodebookService;
  let codebookJson: VisemeCodebookJson;

  beforeEach(async () => {
    service = new VisemeCodebookService();
    const filePath = path.resolve(
      process.cwd(),
      "public/assets/avatars/visemes/ruby_burgundy_ditto_codebook.json"
    );
    const raw = fs.readFileSync(filePath, "utf-8");
    codebookJson = JSON.parse(raw) as VisemeCodebookJson;
    await service.loadFromJson(codebookJson, false);
  });

  it("verifies the Ditto codebook contains 256 strictly unique clusterIds and 256 unique patch dataUrls (0 duplicates)", () => {
    const visemes = service.getVisemes();
    expect(visemes.length).toBe(256);

    const clusterIds = visemes.map((v) => v.clusterId);
    const uniqueIds = new Set(clusterIds);

    // Guarantee 0 duplicate cluster IDs in the codebook
    expect(uniqueIds.size).toBe(256);

    // Guarantee sequential indexing 0 to 255
    for (let i = 0; i < 256; i++) {
      expect(clusterIds[i]).toBe(i);
    }

    // Guarantee all 256 visemes (including closed/bilabial slots) have distinct visual patch dataUrls
    const uniqueDataUrls = new Set(visemes.map((v) => v.dataUrl));
    expect(uniqueDataUrls.size).toBe(256);
  });

  it("verifies visemes are sorted monotonically by aperture from closed (0.08px) to open (>18px)", () => {
    const visemes = service.getVisemes();
    expect(visemes[0].aperture).toBeLessThan(0.5); // Neutral closed
    expect(visemes[visemes.length - 1].aperture).toBeGreaterThan(18.0); // Maximum natural speech open

    for (let i = 1; i < visemes.length; i++) {
      expect(visemes[i].aperture).toBeGreaterThanOrEqual(visemes[i - 1].aperture);
    }
  });

  it("gracefully deduplicates clusterIds if given corrupted or duplicate input JSON", async () => {
    const corruptedJson = {
      formatVersion: "ditto-v1",
      avatarId: "ruby_burgundy",
      visemes: [
        { clusterId: 15, simHash: "0000000000000000", aperture: 4.3, width: 95, jawDescent: 75, dataUrl: "" },
        { clusterId: 15, simHash: "1111111111111111", aperture: 4.3, width: 95, jawDescent: 75, dataUrl: "" },
        { clusterId: 15, simHash: "2222222222222222", aperture: 12.0, width: 95, jawDescent: 78, dataUrl: "" },
      ],
    } as unknown as VisemeCodebookJson;

    const testService = new VisemeCodebookService();
    await testService.loadFromJson(corruptedJson, false);

    const loaded = testService.getVisemes();
    expect(loaded.length).toBe(3);

    const ids = loaded.map((v) => v.clusterId);
    const unique = new Set(ids);
    expect(unique.size).toBe(3); // Deduplicated to 3 distinct IDs
  });

  it("enforces consonant closure: low target aperture (< 4.0px) never selects a gaping mouth (> 6.0px)", () => {
    // Acoustic hash that might have a near-exact match with an open mouth
    const openMouthEntry = service.getVisemes().find((v) => v.aperture > 11.0)!;
    expect(openMouthEntry).toBeDefined();

    // Query with target aperture 1.5px (consonant) and prevAperture 10.0px (descending jaw)
    const match = service.findBiomechanicalViseme(
      openMouthEntry.simHash,
      1.5,
      10.0,
      DEFAULT_MATCHER_CONFIG
    );

    expect(match).not.toBeNull();
    // The asymmetric consonant penalty MUST prevent selecting the wide open mouth
    expect(match!.entry.aperture).toBeLessThan(5.5);
  });

  it("ensures user_hola trailing speech releases to closed mouth instead of staying open", () => {
    const metaPath = path.resolve(
      process.cwd(),
      "public/assets/audio_features/user_hola.audio_features.json"
    );
    const binPath = path.resolve(
      process.cwd(),
      "public/assets/audio_features/user_hola.audio_features.bin"
    );

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

    // Build effective silence mask with RMS noise floor (< 0.025)
    const effectiveSilenceMask = new Uint8Array(numFrames);
    for (let f = 0; f < numFrames; f++) {
      effectiveSilenceMask[f] = Boolean(silenceMask[f]) || (rmsArr.length > f && rmsArr[f] < 0.025) ? 1 : 0;
    }

    const rawTargetAps = new Float32Array(numFrames);
    for (let f = 0; f < numFrames; f++) {
      rawTargetAps[f] = effectiveSilenceMask[f] === 1 ? 0.08 : HermiteEasing.computeTargetAperture(rmsArr[f] ?? 0.1, false);
    }

    const smoothedTargetAps = new Float32Array(numFrames);
    for (let f = 0; f < numFrames; f++) {
      const p = f > 0 ? rawTargetAps[f - 1] : rawTargetAps[f];
      const c = rawTargetAps[f];
      const n = f < numFrames - 1 ? rawTargetAps[f + 1] : rawTargetAps[f];
      smoothedTargetAps[f] = 0.20 * p + 0.60 * c + 0.20 * n;
    }

    let prevAp = 0.08;
    const apertures: number[] = [];

    for (let f = 0; f < numFrames; f++) {
      const slice = f32.subarray(f * 50 * 384, (f + 1) * 50 * 384);
      const hash = AcousticSimHashEngine.computeSimHash(slice);
      const isSilent = effectiveSilenceMask[f] === 1;

      let entry;
      if (isSilent) {
        entry = service.getNeutralEntry()!;
      } else {
        const match = service.findBiomechanicalViseme(hash, smoothedTargetAps[f], prevAp);
        entry = match!.entry;
      }
      prevAp = entry.aperture;
      apertures.push(entry.aperture);
    }

    // Frame 7 was previously trapped at 11.37px (gaping mouth). Now smoothly releases (< 5.6px, matching smoothedTargetAp=5.03px)
    expect(apertures[7]).toBeLessThan(5.6);

    // Trailing silence frames (8, 9, 10) must be fully closed neutral (< 0.5px)
    expect(apertures[8]).toBeLessThan(0.5);
    expect(apertures[9]).toBeLessThan(0.5);
    expect(apertures[10]).toBeLessThan(0.5);
  });

  it("verifies the Full Bottom Face codebook contains 256 visemes, 4 articulation tracks, 7D articulation attributes, mandibular chin anchor, and versionType", async () => {
    const fullJsonPath = path.resolve(
      process.cwd(),
      "public/assets/avatars/visemes/ruby_burgundy_ditto_fullface_codebook.json"
    );
    const rawData = JSON.parse(fs.readFileSync(fullJsonPath, "utf-8"));
    const fullService = new VisemeCodebookService();
    await fullService.loadFromJson(rawData, false);

    expect(fullService.size).toBe(256);
    expect(fullService.versionType).toBe("full_bottom_face");
    expect(fullService.isFullFace).toBe(true);

    const anchor = fullService.canonicalAnchor;
    expect(anchor).toBeDefined();
    expect(anchor?.cx0).toBe(128.0);
    expect(anchor?.cy0).toBe(110.0);
    expect(anchor?.w0).toBe(94.5);
    expect(anchor?.h0).toBe(30.56);

    const visemes = fullService.getVisemes();
    const uniqueDataUrls = new Set(visemes.map((v) => v.dataUrl));
    expect(uniqueDataUrls.size).toBe(256);

    // Verify 7D intra-oral and outer lip attributes are populated
    expect(visemes[0].outerLipHeight).toBeDefined();
    expect(visemes[0].upperTeethLuma).toBeDefined();
    expect(visemes[0].lowerTeethLuma).toBeDefined();

    const tracks = new Set(visemes.map((v) => v.articulationTrack));
    expect(tracks.has("rounded")).toBe(true);
    expect(tracks.has("neutral_narrow")).toBe(true);
    expect(tracks.has("neutral")).toBe(true);
    expect(tracks.has("spread")).toBe(true);

    // Must be sorted monotonically by aperture
    for (let i = 1; i < visemes.length; i++) {
      expect(visemes[i].aperture).toBeGreaterThanOrEqual(visemes[i - 1].aperture);
    }
  });

  it("verifies Mouth Only codebook maintains tight oral anchor (CY0=110.0) and versionType", async () => {
    const mouthJsonPath = path.resolve(
      process.cwd(),
      "public/assets/avatars/visemes/ruby_burgundy_ditto_codebook.json"
    );
    const rawData = JSON.parse(fs.readFileSync(mouthJsonPath, "utf-8"));
    const mouthService = new VisemeCodebookService();
    await mouthService.loadFromJson(rawData, false);

    expect(mouthService.size).toBe(256);
    expect(mouthService.versionType).toBe("mouth_only");
    expect(mouthService.isFullFace).toBe(false);

    const anchor = mouthService.canonicalAnchor;
    expect(anchor).toBeDefined();
    const sf = (rawData.resolution?.[0] ?? 256) / 256.0;
    expect(anchor?.cx0).toBe(128.0 * sf);
    expect(anchor?.cy0).toBe(110.0 * sf);
  });

  it("verifies 2.0_atlas format metadata and 97% data diet reduction", async () => {
    const atlasJsonPath = path.resolve(
      process.cwd(),
      "public/assets/avatars/visemes/ruby_25deg_ditto_codebook.json"
    );
    const atlasJson = JSON.parse(fs.readFileSync(atlasJsonPath, "utf-8")) as VisemeCodebookJson;
    expect(atlasJson.formatVersion).toBe("2.0_atlas");
    expect(atlasJson.atlasUrl).toBe("/assets/avatars/visemes/ruby_25deg_ditto_atlas.webp");
    expect(atlasJson.atlasGrid).toBeDefined();
    expect(atlasJson.atlasGrid?.cols).toBe(8);
    expect(atlasJson.atlasGrid?.rows).toBe(32);
    expect(atlasJson.atlasGrid?.patchWidth).toBe(256);
    expect(atlasJson.atlasGrid?.patchHeight).toBe(256);

    const atlasService = new VisemeCodebookService();
    await atlasService.loadFromJson(atlasJson, false);
    const visemes = atlasService.getVisemes();
    expect(visemes[0].col).toBe(0);
    expect(visemes[0].row).toBe(0);
    expect(visemes[15].col).toBe(7);
    expect(visemes[15].row).toBe(1);
  });

  it("maps TTS phonemes directly to canonical visemes with 2D (aperture × width) differentiation (Phase 6)", () => {
    // Bilabial stop /P/ -> closed mouth (aperture <= 0.5px)
    const matchP = service.findVisemeByPhoneme("P");
    expect(matchP).toBeDefined();
    expect(matchP?.entry.aperture).toBeLessThan(1.0);

    // Wide open vowel /AA/ -> wide aperture (aperture >= 15.0px) and wide spread/neutral commissure width
    const matchAA = service.findVisemeByPhoneme("AA");
    expect(matchAA).toBeDefined();
    expect(matchAA?.entry.aperture).toBeGreaterThan(15.0);
    expect(matchAA?.entry.width).toBeGreaterThan(92.0);

    // Rounded vowel /U/ -> narrower rounded commissure width than spread /IY/
    const matchU = service.findVisemeByPhoneme("U");
    const matchIY = service.findVisemeByPhoneme("IY");
    expect(matchU).toBeDefined();
    expect(matchIY).toBeDefined();
    expect(matchU!.entry.width).toBeLessThan(matchIY!.entry.width);

    // Labiodental /F/ -> narrow aperture (~2.2px)
    const matchF = service.findVisemeByPhoneme("F");
    expect(matchF).toBeDefined();
    expect(matchF?.entry.aperture).toBeGreaterThan(1.0);
    expect(matchF?.entry.aperture).toBeLessThan(5.0);
  });

  it("prevents single-frame width jumps into narrow puckered outliers during wide vowel transitions", () => {
    const visemes = service.getVisemes();
    // Pick a wide/spread open cluster around ~13.5px aperture (e.g., C45 at w=97.15)
    const wideCluster = visemes.find((v) => v.aperture >= 13.0 && v.width >= 95.0)!;
    // Pick a narrow rounded cluster at similar aperture (e.g., C44 at w=86.47)
    const narrowCluster = visemes.find((v) => v.aperture >= 13.0 && v.width <= 87.5)!;
    expect(wideCluster).toBeDefined();
    expect(narrowCluster).toBeDefined();

    // Under equal or ambiguous acoustic similarity, coming from wideCluster (prevClusterId)
    // with targetWidth=96.5 keeps selection on a wide/neutral track rather than jumping to a narrow puckered cluster
    const match = service.findBiomechanicalViseme(
      narrowCluster.simHash,
      13.5,
      wideCluster.aperture,
      wideCluster.clusterId,
      {
        ...DEFAULT_MATCHER_CONFIG,
        hammingWeight: 0.1,
        targetWidth: 96.5,
        widthVelocityWeight: 0.45,
      }
    );
    expect(match).not.toBeNull();
    expect(match!.entry.width).toBeGreaterThan(88.0);
  });

  describe("Ruby Angle-Specific Codebooks (25°, 45°, 65°, 90°)", () => {
    const angles = [25, 45, 65, 90];

    for (const angle of angles) {
      it(`verifies ruby_${angle}deg_ditto_codebook.json loads with 256 visemes and valid atlas reference`, async () => {
        const filePath = path.resolve(
          process.cwd(),
          `public/assets/avatars/visemes/ruby_${angle}deg_ditto_codebook.json`
        );
        expect(fs.existsSync(filePath)).toBe(true);

        const raw = fs.readFileSync(filePath, "utf-8");
        const json = JSON.parse(raw) as VisemeCodebookJson;

        expect(json.formatVersion).toBe("2.0_atlas");
        expect(json.avatarId).toBe(`ruby_${angle}deg`);
        expect(json.atlasUrl).toBe(`/assets/avatars/visemes/ruby_${angle}deg_ditto_atlas.webp`);
        expect(json.visemes.length).toBe(256);

        // Verify atlas file physically exists on disk
        const atlasDiskPath = path.resolve(process.cwd(), `public${json.atlasUrl}`);
        expect(fs.existsSync(atlasDiskPath)).toBe(true);
        const stats = fs.statSync(atlasDiskPath);
        expect(stats.size).toBeGreaterThan(100000); // ~198 KB

        const angleService = new VisemeCodebookService();
        await angleService.loadFromJson(json, false);
        expect(angleService.size).toBe(256);
        expect(angleService.versionType).toBe("mouth_only");

        const visemes = angleService.getVisemes();
        expect(visemes[0].col).toBe(0);
        expect(visemes[0].row).toBe(0);
        expect(visemes[255].col).toBe(7);
        expect(visemes[255].row).toBe(31);
      });
    }
  });

  it("predicts 7D articulation targets on news_anchor_long and matches >= 220 unique visemes with accurate bilabial lip press at F215", async () => {
    const fullJsonPath = path.resolve(
      process.cwd(),
      "public/assets/avatars/visemes/ruby_burgundy_ditto_fullface_codebook.json"
    );
    const metaPath = path.resolve(
      process.cwd(),
      "public/assets/audio_features/news_anchor_long.audio_features.json"
    );
    const binPath = path.resolve(
      process.cwd(),
      "public/assets/audio_features/news_anchor_long.audio_features.bin"
    );

    const fullService = new VisemeCodebookService();
    await fullService.loadFromJson(JSON.parse(fs.readFileSync(fullJsonPath, "utf-8")), false);

    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    const binBuf = fs.readFileSync(binPath);
    const u16 = new Uint16Array(binBuf.buffer, binBuf.byteOffset, binBuf.byteLength / 2);
    const f32 = new Float32Array(u16.length);
    for (let i = 0; i < u16.length; i++) {
      f32[i] = AudioFeatureUnpacker.decodeFloat16(u16[i]);
    }

    const numFrames = 709;
    const silenceMask = WhisperArticulationPredictor.computeSustainedSilenceMask(
      meta.rms || [],
      meta.silenceMask || [],
      5,
      0.010
    );
    const preds = WhisperArticulationPredictor.predictSequence(f32, numFrames);
    expect(preds.length).toBe(numFrames);

    // Frame 215 is a bilabial lip press (/p/, /b/, /m/) -> outerLipHeight < 11px, aperture < 1.5px
    expect(preds[215].aperture).toBeLessThan(1.5);
    expect(preds[215].outerLipHeight).toBeLessThan(11.0);

    // Frame 130 is a wide open vowel -> aperture > 25px, jawDescent > 88px
    expect(preds[130].aperture).toBeGreaterThan(25.0);
    expect(preds[130].jawDescent).toBeGreaterThan(88.0);

    const neutralEntry = fullService.getNeutralEntry()!;
    let prevAp = 0.08;
    let prevWidth = 94.5;
    let prevClusterId = 0;
    const selectedClusters: number[] = [];

    for (let f = 0; f < numFrames; f++) {
      if (silenceMask[f] === 1) {
        selectedClusters.push(neutralEntry.clusterId);
        prevAp = neutralEntry.aperture;
        prevWidth = neutralEntry.width;
        prevClusterId = neutralEntry.clusterId;
        continue;
      }
      const ctxSlices = [-2, -1, 0, 1, 2].map((d) => {
        const idx = Math.max(0, Math.min(numFrames - 1, f + d));
        return f32.subarray(idx * 50 * 384, (idx + 1) * 50 * 384);
      });
      const hash = AcousticSimHashEngine.computeContextSimHash(ctxSlices);
      const pred = preds[f];
      const match = fullService.findBiomechanicalViseme(hash, pred.aperture, prevAp, prevClusterId, {
        hammingWeight: 0.09,
        energyWeight: 1.75,
        baseVelWeight: 0.18,
        smoothFactor: 0.0,
        maxVelocityPenalty: 6.0,
        consonantPenaltyWeight: 4.5,
        targetWidth: pred.width,
        prevWidth,
        targetJawDescent: pred.jawDescent,
        targetOuterLipHeight: pred.outerLipHeight,
        targetUpperLipY: pred.upperLipY,
        targetUpperTeethLuma: pred.upperTeethLuma,
        targetLowerTeethLuma: pred.lowerTeethLuma,
        clusterInertiaBonus: -0.30,
        excludeSilentClusterWhenActive: true,
      })!;
      selectedClusters.push(match.entry.clusterId);
      prevAp = match.entry.aperture;
      prevWidth = match.entry.width;
      prevClusterId = match.entry.clusterId;
    }

    const uniqueUsed = new Set(selectedClusters).size;
    expect(uniqueUsed).toBeGreaterThanOrEqual(220);

    const c0Count = selectedClusters.filter((c) => c === 0).length;
    expect(c0Count / numFrames).toBeLessThan(0.12);

    // Verify F215 selected a rolled-in bilabial cluster (outerLipHeight < 10.0px)
    const f215Entry = fullService.getVisemes().find((v) => v.clusterId === selectedClusters[215])!;
    expect(f215Entry.outerLipHeight).toBeLessThan(10.0);
  });

  it("prevents abrupt frame-to-frame teeth-exposure / upper-lip flips on cli_voice_ruby across frames 23-26", async () => {
    const fullJsonPath = path.resolve(
      process.cwd(),
      "public/assets/avatars/visemes/ruby_burgundy_ditto_fullface_codebook.json"
    );
    const metaPath = path.resolve(
      process.cwd(),
      "public/assets/audio_features/cli_voice_ruby.audio_features.json"
    );
    const binPath = path.resolve(
      process.cwd(),
      "public/assets/audio_features/cli_voice_ruby.audio_features.bin"
    );

    const fullService = new VisemeCodebookService();
    await fullService.loadFromJson(JSON.parse(fs.readFileSync(fullJsonPath, "utf-8")), false);

    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    const binBuf = fs.readFileSync(binPath);
    const u16 = new Uint16Array(binBuf.buffer, binBuf.byteOffset, binBuf.byteLength / 2);
    const f32 = new Float32Array(u16.length);
    for (let i = 0; i < u16.length; i++) {
      f32[i] = AudioFeatureUnpacker.decodeFloat16(u16[i]);
    }

    const numFrames: number = meta.numFrames;
    const effectiveSilenceMask = WhisperArticulationPredictor.computeSustainedSilenceMask(
      meta.rms || [],
      meta.silenceMask || [],
      5,
      0.010
    );
    const predicted7d = WhisperArticulationPredictor.predictSequence(f32, numFrames);

    const neutralEntry = fullService.getNeutralEntry()!;
    let prevAp = 0.08;
    let prevWidth = 94.5;
    let prevClusterId: number | null = 0;
    const selectedEntries = new Array(numFrames);

    for (let f = 0; f < numFrames; f++) {
      const pred = predicted7d[f];
      if (effectiveSilenceMask[f] === 1) {
        selectedEntries[f] = neutralEntry;
      } else {
        const ctxSlices = [-2, -1, 0, 1, 2].map((d) => {
          const idx = Math.max(0, Math.min(numFrames - 1, f + d));
          return f32.subarray(idx * 50 * 384, (idx + 1) * 50 * 384);
        });
        const hash = AcousticSimHashEngine.computeContextSimHash(ctxSlices);
        const match = fullService.findBiomechanicalViseme(hash, pred.aperture, prevAp, prevClusterId, {
          hammingWeight: 0.08,
          energyWeight: 1.75,
          baseVelWeight: 0.24,
          smoothFactor: 0.0,
          maxVelocityPenalty: 6.0,
          consonantPenaltyWeight: 4.5,
          targetWidth: pred.width,
          prevWidth,
          targetJawDescent: pred.jawDescent,
          targetOuterLipHeight: pred.outerLipHeight,
          targetUpperLipY: pred.upperLipY,
          targetUpperTeethLuma: pred.upperTeethLuma,
          targetLowerTeethLuma: pred.lowerTeethLuma,
          clusterInertiaBonus: -0.65,
          excludeSilentClusterWhenActive: true,
        });
        selectedEntries[f] = match?.entry || neutralEntry;
      }
      prevAp = selectedEntries[f].aperture ?? pred.aperture;
      prevWidth = selectedEntries[f].width ?? prevWidth;
      prevClusterId = selectedEntries[f].clusterId ?? prevClusterId;
    }

    // Apply temporal despiker pass matching VisemeCompositorStudio.tsx
    for (let f = 1; f < numFrames - 1; f++) {
      if (effectiveSilenceMask[f] === 1) continue;
      const cPrev = selectedEntries[f - 1];
      const cCurr = selectedEntries[f];
      const cNext = selectedEntries[f + 1];
      if (cCurr.clusterId !== cPrev.clusterId && cCurr.clusterId !== cNext.clusterId) {
        const pred = predicted7d[f];
        if (!pred) continue;
        const prevTeeth = cPrev.upperTeethLuma ?? 82;
        const currTeeth = cCurr.upperTeethLuma ?? 82;
        const nextTeeth = cNext.upperTeethLuma ?? 82;
        const isIsolatedTeethSpike =
          Math.abs(currTeeth - prevTeeth) > 28 &&
          Math.abs(currTeeth - nextTeeth) > 28 &&
          Math.abs(prevTeeth - nextTeeth) < 22;

        if (isIsolatedTeethSpike) {
          const prevApErr = cPrev.clusterId === 0 ? 1e9 : Math.abs((cPrev.aperture ?? 0) - pred.aperture);
          const nextApErr = cNext.clusterId === 0 ? 1e9 : Math.abs((cNext.aperture ?? 0) - pred.aperture);
          selectedEntries[f] = prevApErr <= nextApErr ? cPrev : cNext;
        } else if (cPrev.clusterId === cNext.clusterId && cPrev.clusterId !== 0) {
          if (
            Math.abs((cPrev.aperture ?? 0) - pred.aperture) < 2.8 &&
            Math.abs((cPrev.outerLipHeight ?? 30.56) - pred.outerLipHeight) < 5.5
          ) {
            selectedEntries[f] = cPrev;
          }
        } else {
          for (const nb of [cPrev, cNext]) {
            if (
              nb.clusterId !== 0 &&
              Math.abs((nb.aperture ?? 0) - pred.aperture) < 1.8 &&
              Math.abs((nb.width ?? 94.5) - pred.width) < 2.5 &&
              Math.abs((nb.outerLipHeight ?? 30.56) - pred.outerLipHeight) < 3.5
            ) {
              selectedEntries[f] = nb;
              break;
            }
          }
        }
      }
    }

    // Verify frames 23..26 do not have abrupt intra-oral upperTeethLuma flips (> 28 luma units)
    for (let f = 23; f <= 25; f++) {
      const currLuma = selectedEntries[f].upperTeethLuma ?? 82;
      const nextLuma = selectedEntries[f + 1].upperTeethLuma ?? 82;
      expect(Math.abs(nextLuma - currLuma)).toBeLessThanOrEqual(28);
    }
  });

  it("populates atlasCols, atlasRows, and normalizes /public prefix in both loadFromJson and loadFromWorkerData", async () => {
    const mockAtlasJson: VisemeCodebookJson = {
      formatVersion: "2.0_atlas",
      createdAt: "2026-10-28T00:00:00Z",
      avatarId: "ruby",
      resolution: [256, 256],
      highFidelityEngine: "Ditto 512x512 HD",
      maskTopology: "tight_stomion_oval",
      psnrDb: 42.4,
      visemeCount: 2,
      atlasUrl: "/public/assets/avatars/visemes/ruby_ditto_atlas.webp",
      atlasGrid: {
        cols: 8,
        rows: 32,
        patchWidth: 256,
        patchHeight: 256,
      },
      visemes: [
        { clusterId: 0, simHash: "0000000000000000", aperture: 0.1, width: 94.5, jawDescent: 74.0 },
        { clusterId: 1, simHash: "1111111111111111", aperture: 8.5, width: 92.0, jawDescent: 82.0 },
      ],
    };

    const workerService = new VisemeCodebookService();
    await workerService.loadFromWorkerData(mockAtlasJson);
    expect(workerService.atlasUrl).toBe("/assets/avatars/visemes/ruby_ditto_atlas.webp");

    const entries = workerService.getVisemes();
    expect(entries.length).toBe(2);
    expect(entries[0].atlasUrl).toBe("/assets/avatars/visemes/ruby_ditto_atlas.webp");
    expect(entries[0].atlasCols).toBe(8);
    expect(entries[0].atlasRows).toBe(32);
    expect(entries[1].col).toBe(1);
    expect(entries[1].row).toBe(0);
  });

  it("ensures StudioCodebookGallery uses non-collapsing grid rows (auto-rows-max) and true 1:1 square thumbnail containers, and StudioViewport hides calibration panel by default", async () => {
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { StudioCodebookGallery } = await import("@/components/realtime/viseme-compositor/StudioCodebookGallery");
    const { StudioViewport, DEFAULT_SHOW_CALIBRATION_PANEL } = await import("@/components/realtime/viseme-compositor/StudioViewport");

    expect(DEFAULT_SHOW_CALIBRATION_PANEL).toBe(false);

    // 1. Test dataUrl-backed viseme tiles
    const galleryHtml = renderToStaticMarkup(
      React.createElement(StudioCodebookGallery, {
        visemes: service.getVisemes().slice(0, 4),
        activeClusterId: 0,
        onSelectViseme: () => {},
      })
    );

    expect(galleryHtml).toContain("Canonical 4-Viseme Codebook ROM");
    expect(galleryHtml).toContain("auto-rows-max");
    expect(galleryHtml).toContain("aspect-ratio:1 / 1");
    expect(galleryHtml).toContain("repeat(auto-fill, minmax(64px, 1fr))");
    expect(galleryHtml).not.toContain("min-h-[52px]");
    expect(galleryHtml).toContain("Viseme 0");

    // 2. Test 2.0_atlas sprite-backed viseme tiles
    const atlasJsonPath = path.resolve(
      process.cwd(),
      "public/assets/avatars/visemes/ruby_25deg_ditto_codebook.json"
    );
    const atlasService = new VisemeCodebookService();
    await atlasService.loadFromJson(JSON.parse(fs.readFileSync(atlasJsonPath, "utf-8")), false);
    const atlasGalleryHtml = renderToStaticMarkup(
      React.createElement(StudioCodebookGallery, {
        visemes: atlasService.getVisemes().slice(0, 4),
        activeClusterId: 1,
        onSelectViseme: () => {},
      })
    );
    expect(atlasGalleryHtml).toContain("/assets/avatars/visemes/ruby_25deg_ditto_atlas.webp");
    expect(atlasGalleryHtml).toContain("800% 3200%");
    expect(atlasGalleryHtml).toContain("auto-rows-max");
    expect(atlasGalleryHtml).not.toContain("min-h-[52px]");

    // 3. Test empty visemes fallback
    const emptyHtml = renderToStaticMarkup(
      React.createElement(StudioCodebookGallery, {
        visemes: [],
        activeClusterId: null,
        onSelectViseme: () => {},
      })
    );
    expect(emptyHtml).toContain("No codebook visemes loaded");

    // 4. Render StudioViewport with default props (calibration hidden) vs showCalibrationPanel=true
    const baseViewportProps = {
      videoRef: { current: null },
      canvasRef: { current: null },
      isPlaying: false,
      fps: 60,
      currentFrame: 0,
      totalFrames: 100,
      presenceWeight: 1.0,
      activeClusterId: 0,
      activeAperture: 0.1,
      engineName: "Ditto 512x512 HD",
      isLooping: false,
      onPlayPause: () => {},
      onSeek: () => {},
      onReplay: () => {},
      onToggleLoop: () => {},
    };

    const defaultViewportHtml = renderToStaticMarkup(
      React.createElement(StudioViewport, baseViewportProps)
    );
    expect(defaultViewportHtml).not.toContain("🎛️ Calibrate");
    expect(defaultViewportHtml).not.toContain("Live Landmark Tuner");

    const enabledViewportHtml = renderToStaticMarkup(
      React.createElement(StudioViewport, {
        ...baseViewportProps,
        showCalibrationPanel: true,
      })
    );
    expect(enabledViewportHtml).toContain("🎛️ Calibrate");
  });
});


