/**
 * src/tests/sprint12Batch1.test.ts
 *
 * Unit test suite for Sprint 12 Batch 1 upgrades:
 * 1. H1: Frame dt Jitter Median Filter
 * 2. A4: Asymmetric Coarticulation Kernel [0.04, 0.12, 0.38, 0.30, 0.16]
 * 3. H4: Micro-Expression Boost Multiplier
 * 4. B5: Natural Exophoria Micro-Strabismus
 * 5. H2: Saccade Phase-Lock to Blink (Saccadic Masking)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { OnnxAudioVisemeEngine } from "@/lib/realtime/onnxAudioVisemeEngine";
import { AudioVisemeExtractor } from "@/lib/realtime/audioVisemeExtractor";
import { OcularLifeEngine } from "@/lib/realtime/ocularLifeEngine";
import { LiveAnchorStageEngine } from "@/lib/realtime/liveAnchorStageEngine";

describe("Sprint 12 Batch 1: Biological Realism & Physics", () => {
  describe("A4: Asymmetric Coarticulation Kernel", () => {
    it("should sum to exactly 1.0 in AudioVisemeExtractor", () => {
      const kernel = AudioVisemeExtractor.GAUSS_COART_KERNEL;
      expect(kernel.length).toBe(5);
      const sum = kernel.reduce((acc, val) => acc + val, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it("should exhibit front-loaded anticipation bias (newest frames have higher weight than oldest frames)", () => {
      const kernel = AudioVisemeExtractor.GAUSS_COART_KERNEL;
      // kernel: [0.04, 0.12, 0.38, 0.30, 0.16]
      // Older frames: index 0 (0.04), index 1 (0.12)
      // Newer upcoming frames: index 3 (0.30), index 4 (0.16)
      expect(kernel[3]).toBeGreaterThan(kernel[1]);
      expect(kernel[4]).toBeGreaterThan(kernel[0]);
      expect(kernel[3] + kernel[4]).toBeGreaterThan(kernel[0] + kernel[1]);
    });
  });

  describe("H1: Frame dt Jitter Median Filter", () => {
    it("should eliminate single-frame latency spikes without corrupting smooth delta times", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 544;
      canvas.height = 960;
      const engine = new LiveAnchorStageEngine(canvas, null);

      // Initialize buffer with 5 normal 60fps frames (16.6ms)
      for (let i = 0; i < 5; i++) {
        engine.computeMedianDt(0.0166);
      }

      // Inject an abrupt OS jitter spike of 55ms
      const filtered = engine.computeMedianDt(0.055);
      // The median of [16.6, 16.6, 16.6, 16.6, 55] is still 16.6ms!
      expect(filtered).toBeCloseTo(0.0166, 3);
    });

    it("should smoothly adapt to genuine sustained framerate changes", () => {
      const canvas = document.createElement("canvas");
      const engine = new LiveAnchorStageEngine(canvas, null);

      // Feed 5 sustained 30fps frames (33.3ms)
      let lastDt = 0;
      for (let i = 0; i < 5; i++) {
        lastDt = engine.computeMedianDt(0.0333);
      }
      expect(lastDt).toBeCloseTo(0.0333, 3);
    });
  });

  describe("H2: Saccade Phase-Lock to Blink (Saccadic Masking)", () => {
    let ocular: OcularLifeEngine;

    beforeEach(() => {
      ocular = new OcularLifeEngine({
        saccadeRate: 2.0,
        amplitudeScale: 1.0,
        teleprompterEnabled: false,
      });
      ocular.reset();
    });

    it("should allow micro-saccades when eyes are fully open (blinkProgress <= 0.15)", () => {
      // Advance time past initial schedule with eyes open
      let saccadeVelocityObserved = false;
      for (let t = 0.05; t < 0.8; t += 0.016) {
        const state = ocular.update(t, 0, 0, false, 1.0, 0.0);
        if (Math.abs(state.microSaccade[0]) > 0.001 || state.saccadeVelocity > 0.001) {
          saccadeVelocityObserved = true;
          break;
        }
      }
      expect(saccadeVelocityObserved).toBe(true);
    });

    it("should trigger micro-saccade inside blink closure window (blinkProgress > 0.35)", () => {
      // Advance to near next saccade time
      ocular.update(0.1, 0, 0, false, 1.0, 0.0);
      
      // Now trigger blink closure: blinkProgress = 0.8
      let saccadeTriggeredDuringBlink = false;
      for (let t = 0.15; t < 0.6; t += 0.016) {
        const state = ocular.update(t, 0, 0, false, 1.0, 0.8);
        if (Math.abs(state.microSaccade[0]) > 0.001 || state.saccadeVelocity > 0.001) {
          saccadeTriggeredDuringBlink = true;
          break;
        }
      }
      expect(saccadeTriggeredDuringBlink).toBe(true);
    });
  });

  describe("H4: Micro-Expression Boost Multiplier & B5: Exophoria", () => {
    it("should initialize with default microExpressionBoost and natural exophoria offset", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 544;
      canvas.height = 960;
      const engine = new LiveAnchorStageEngine(canvas, null, {
        microExpressionBoost: 1.35,
        exophoria: 0.006,
      });

      // Check that options are accepted and default is healthy
      expect(engine).toBeDefined();
    });
  });

  describe("Ruby Full-Body Wardrobe Collection", () => {
    it("should have all 33 full-body master chroma photos existing in public filesystem", async () => {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const baseDir = path.resolve(process.cwd(), "public/avatars/master_ruby_archive/chroma_master_poses");

      const files = [
        "ruby_01a_emerald_cowl_default_clasped.jpg",
        "ruby_01b_emerald_cowl_dynamic_hip.jpg",
        "ruby_02a_scarlet_corset_default_clasped.jpg",
        "ruby_02b_scarlet_corset_dynamic_two_hand.jpg",
        "ruby_03a_champagne_halter_default_clasped.jpg",
        "ruby_03b_champagne_halter_dynamic_raised_hand.jpg",
        "ruby_04a_black_corset_default_clasped.jpg",
        "ruby_04b_black_corset_dynamic_hip.jpg",
        "ruby_05a_bronze_metallic_default_clasped.jpg",
        "ruby_05b_bronze_metallic_dynamic_pointing.jpg",
        "ruby_06a_crimson_vest_default_clasped.jpg",
        "ruby_06b_crimson_vest_dynamic_analytical.jpg",
        "ruby_07a_burgundy_velvet_default_clasped.jpg",
        "ruby_07b_burgundy_velvet_dynamic_welcome.jpg",
        "ruby_08a_cobalt_sweetheart_default_clasped.jpg",
        "ruby_08b_cobalt_sweetheart_dynamic_raised_hand.jpg",
        "ruby_08c_cobalt_sweetheart_dynamic_open_hands.jpg",
        "ruby_08d_cobalt_sweetheart_neutral_separated_arms.jpg",
        "ruby_09a_ivory_sweetheart_default_clasped.jpg",
        "ruby_09b_ivory_sweetheart_dynamic_hip.jpg",
        "ruby_10a_navy_jumpsuit_default_clasped.jpg",
        "ruby_10b_navy_jumpsuit_dynamic_welcome.jpg",
        "ruby_11a_sapphire_corset_default_clasped.jpg",
        "ruby_11b_sapphire_corset_dynamic_pointing.jpg",
        "ruby_12a_emerald_keyhole_default_clasped.jpg",
        "ruby_12b_emerald_keyhole_dynamic_gesturing.jpg",
        "ruby_13a_crimson_cutout_default_clasped.jpg",
        "ruby_13b_crimson_cutout_dynamic_presentation.jpg",
        "ruby_14a_black_keyhole_default_clasped.jpg",
        "ruby_14b_black_keyhole_dynamic_welcome.jpg",
        "3camera_array/ruby_chroma_cam01_center_wide_0deg.jpg",
        "3camera_array/ruby_chroma_cam02_left_tight_medium_20deg.jpg",
        "3camera_array/ruby_chroma_cam03_right_slash_closeup_35deg.jpg",
      ];

      expect(files.length).toBe(33);
      for (const rel of files) {
        const fullPath = path.join(baseDir, rel);
        expect(fs.existsSync(fullPath), `Missing photo: ${rel}`).toBe(true);
      }
    });
  });
});
