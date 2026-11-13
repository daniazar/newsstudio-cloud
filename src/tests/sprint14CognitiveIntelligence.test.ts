import { describe, it, expect } from "vitest";
import { OcularLifeEngine } from "../lib/realtime/ocularLifeEngine";
import { ProceduralLivePortraitDriver } from "../lib/realtime/proceduralLivePortraitDriver";
import { LiveAnchorStageEngine } from "../lib/realtime/liveAnchorStageEngine";

describe("Sprint 14: Cognitive Intelligence & Neurological Nuance", () => {
  describe("F1: Gaze Fixation Memory", () => {
    it("should retain up to 5 fixation coordinates in the history ring buffer", () => {
      const ocular = new OcularLifeEngine({ saccadeRate: 50.0 }); // Rapid saccades for test
      let now = 1.0;

      // Run several update cycles to trigger saccades
      for (let i = 0; i < 30; i++) {
        now += 0.05;
        ocular.update(now, 0, 0, true, 1.0, 0.0);
      }

      const history = ocular.getFixationHistory();
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history.length).toBeLessThanOrEqual(5);

      // Verify stored coordinates are valid numbers
      for (const [x, y] of history) {
        expect(typeof x).toBe("number");
        expect(typeof y).toBe("number");
        expect(Number.isFinite(x)).toBe(true);
        expect(Number.isFinite(y)).toBe(true);
      }
    });

    it("should clear fixation history on reset", () => {
      const ocular = new OcularLifeEngine({ saccadeRate: 50.0 });
      let now = 1.0;
      for (let i = 0; i < 20; i++) {
        now += 0.05;
        ocular.update(now, 0, 0, true, 1.0, 0.0);
      }
      expect(ocular.getFixationHistory().length).toBeGreaterThan(0);

      ocular.reset();
      expect(ocular.getFixationHistory().length).toBe(0);
    });
  });

  describe("F2: Turn-Taking Gaze Aversion", () => {
    it("should trigger turn-taking gaze aversion when speech ceases (speaking true -> false)", () => {
      const driver = new ProceduralLivePortraitDriver({ motionIntensity: 1.0 });

      // Anchor is actively speaking
      driver.setAudioProsody(0.6, true);
      driver.update(1.0);
      expect(driver.isGazeAversionActive()).toBe(false);

      // Anchor finishes sentence and stops speaking
      driver.setAudioProsody(0.0, false);
      const poseAfterSpeech = driver.update(1.05);

      expect(driver.isGazeAversionActive()).toBe(true);
      expect(poseAfterSpeech.gazeAversionActive).toBe(true);
    });

    it("should cancel gaze aversion when speaking resumes", () => {
      const driver = new ProceduralLivePortraitDriver({ motionIntensity: 1.0 });

      // Finish speaking -> triggers aversion
      driver.setAudioProsody(0.5, true);
      driver.update(1.0);
      driver.setAudioProsody(0.0, false);
      driver.update(1.1);
      expect(driver.isGazeAversionActive()).toBe(true);

      // Resume speaking -> should cancel aversion
      driver.setAudioProsody(0.5, true);
      driver.update(1.15);
      expect(driver.isGazeAversionActive()).toBe(false);
    });
  });

  describe("F3: Facial Muscle Fatigue Decay", () => {
    it("should gradually soften prolonged expressions held for >30 seconds", () => {
      const driver = new ProceduralLivePortraitDriver({ isAutoAnimate: false });
      driver.setManualExpressions(0, 0, 0.60); // 60% sustained smile

      // Step forward 10 seconds (under 30s threshold -> no fatigue)
      let pose = driver.update(0.1);
      for (let t = 1.0; t <= 10.0; t += 1.0) {
        pose = driver.update(t);
      }
      expect(driver.getExpressionFatigueScale()).toBeCloseTo(1.0, 2);

      // Step forward to 50 seconds (20s past 30s threshold -> visible fatigue reduction)
      for (let t = 11.0; t <= 50.0; t += 1.0) {
        pose = driver.update(t);
      }
      const fatiguedScale = driver.getExpressionFatigueScale();
      expect(fatiguedScale).toBeLessThan(0.95);
      expect(fatiguedScale).toBeGreaterThanOrEqual(0.75);
      expect(pose.smileAmount).toBeLessThan(0.60);
    });

    it("should recover expression elasticity when face relaxes to neutral", () => {
      const driver = new ProceduralLivePortraitDriver({ isAutoAnimate: false });
      driver.setManualExpressions(0, 0, 0.60);

      // Fatigue the expression over 60 seconds
      for (let t = 1.0; t <= 60.0; t += 1.0) {
        driver.update(t);
      }
      expect(driver.getExpressionFatigueScale()).toBeLessThan(0.80);

      // Relax back to neutral
      driver.setManualExpressions(0, 0, 0.0);
      for (let t = 61.0; t <= 75.0; t += 1.0) {
        driver.update(t);
      }
      expect(driver.getExpressionFatigueScale()).toBeGreaterThan(0.95);
    });
  });

  describe("F4: Listener Backchanneling Micro-Expressions", () => {
    it("should emit periodic empathetic micro-impulses in attentive_listener idle preset during silence", () => {
      const driver = new ProceduralLivePortraitDriver({
        idlePreset: "attentive_listener",
        isAutoAnimate: true,
        motionIntensity: 1.0,
      });

      driver.setAudioProsody(0.0, false); // Silence / listening mode
      let nodDetected = false;
      let browDetected = false;

      // Simulate listening for 8 seconds
      for (let t = 1.0; t <= 9.0; t += 0.05) {
        const pose = driver.update(t);
        if (pose.pitchDeg < -0.2) nodDetected = true;
        if (pose.eyebrowRaise > 0.05) browDetected = true;
      }

      // At least one backchannel micro-expression should have triggered
      expect(nodDetected || browDetected).toBe(true);
    });
  });

  describe("F5: Blink Micro-Squeeze Overshoot at Apex", () => {
    it("should produce a micro-squeeze overshoot (>1.0) at apex closure (0.46 - 0.54 progress)", () => {
      const driver = new ProceduralLivePortraitDriver({ blinkRate: 1.0 });

      // Force reflex blink at t = 1.0s (duration ~120ms)
      driver.triggerReflexBlink(30.0, true, 1.0);

      let peakBlink = 0.0;
      // Sample through the blink at 2ms intervals
      for (let t = 1.0; t <= 1.20; t += 0.002) {
        const pose = driver.update(t);
        if (pose.blinkLeft > peakBlink) {
          peakBlink = pose.blinkLeft;
        }
      }

      // At apex, blink value should slightly exceed 1.0 due to muscular overshoot
      expect(peakBlink).toBeGreaterThan(1.0);
      expect(peakBlink).toBeLessThanOrEqual(1.03);
    });
  });

  describe("H5: Deferred Expression Onset (200ms Biological Latency)", () => {
    it("should maintain a rolling delay buffer and apply 200ms lag to affective sentiment modulations", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 544;
      canvas.height = 960;
      const engine = new LiveAnchorStageEngine(canvas, null, {
        personaId: "ruby",
        activeSrc: "/assets/ruby.mp4",
      });

      expect(engine.getSentimentDelayBufferLength()).toBe(0);

      const neutralMod = {
        smileAmount: 0,
        eyeWidening: 1.0,
        asymmetry: 0,
        noseSneer: 0,
        chinRaise: 0,
        headPitchOffset: 0,
        headLeanZOffset: 0,
        eyebrowRaise: 0,
        eyebrowFurrow: 0,
      };

      const happyMod = {
        smileAmount: 0.8,
        eyeWidening: 1.1,
        asymmetry: 0.1,
        noseSneer: 0.05,
        chinRaise: 0.1,
        headPitchOffset: 1.5,
        headLeanZOffset: 0.02,
        eyebrowRaise: 0.2,
        eyebrowFurrow: 0,
      };

      // Feed neutral frames from t = 1000 to t = 1200
      for (let t = 1000; t <= 1200; t += 20) {
        engine.processDeferredSentiment(neutralMod, t);
      }
      expect(engine.getSentimentDelayBufferLength()).toBeGreaterThan(5);

      // Sudden onset of strong smile at t = 1220ms
      const immediateOutput = engine.processDeferredSentiment(happyMod, 1220);
      // At t = 1220ms, target delay timestamp is 1020ms -> output should still be neutral (delayed by 200ms)
      expect(immediateOutput.smileAmount).toBe(0);

      // Advance to t = 1440ms (220ms after happyMod onset)
      let delayedOutput = immediateOutput;
      for (let t = 1240; t <= 1440; t += 20) {
        delayedOutput = engine.processDeferredSentiment(happyMod, t);
      }
      // Now 200ms has elapsed, delayedOutput should reflect the happy modulation
      expect(delayedOutput.smileAmount).toBe(0.8);
    });
  });

  describe("H6: Double-Take Gaze on Sudden Surprise Spike", () => {
    it("should execute a rapid 2-phase dart and return sequence when double-take is triggered", () => {
      const driver = new ProceduralLivePortraitDriver({ isAutoAnimate: false });

      driver.update(1.0);
      expect(driver.isDoubleTakeActive()).toBe(false);

      // Trigger double-take at t = 2.0s
      driver.triggerDoubleTake(1.2, 2.0);
      expect(driver.isDoubleTakeActive()).toBe(true);

      // Phase 1 (0-90ms): off-axis dart
      const posePhase1 = driver.update(2.05);
      expect(Math.abs(posePhase1.gazeX)).toBeGreaterThan(0.10);
      expect(posePhase1.eyeWidening).toBeGreaterThan(1.05);

      // Phase 2 (90-220ms): returning
      driver.update(2.15);

      // Settle past 220ms -> double-take complete
      const poseSettled = driver.update(2.25);
      expect(driver.isDoubleTakeActive()).toBe(false);
      expect(poseSettled.doubleTakeActive).toBe(false);
    });
  });
});
