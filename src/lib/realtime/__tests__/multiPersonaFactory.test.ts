/**
 * src/lib/realtime/__tests__/multiPersonaFactory.test.ts
 *
 * Verifies Multi-Persona Codebook Factory JSON outputs, landmark stability, and canonical anchors.
 */

import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Multi-Persona Codebook Factory", () => {
  const visemesDir = path.resolve(process.cwd(), "public/assets/avatars/visemes");

  it("successfully generated Mateo canonical anchor metadata", () => {
    const anchorPath = path.join(visemesDir, "mateo_default_trait_canonical_anchor.json");
    expect(fs.existsSync(anchorPath)).toBe(true);

    const anchor = JSON.parse(fs.readFileSync(anchorPath, "utf-8"));
    expect(anchor.persona).toBe("mateo_default_trait");
    expect(anchor.iod0).toBeGreaterThan(50);
    expect(anchor.w0).toBeGreaterThan(40);
    expect(anchor.h0).toBeGreaterThan(10);
    expect(anchor.cx0).toBeGreaterThan(0);
    expect(anchor.cy0).toBeGreaterThan(0);
  });

  it("successfully generated Mateo FSM landmarks with boundary locking (0px jump-cuts)", () => {
    const fsmPath = path.join(visemesDir, "mateo_default_trait_fsm_landmarks.json");
    expect(fs.existsSync(fsmPath)).toBe(true);

    const fsmData = JSON.parse(fs.readFileSync(fsmPath, "utf-8"));
    const clipKeys = Object.keys(fsmData);
    expect(clipKeys.length).toBeGreaterThan(20);

    // Verify M1_loop_v1 boundary continuity
    const m1Frames = fsmData["M1_loop_v1"];
    expect(m1Frames).toBeDefined();
    expect(m1Frames.length).toBeGreaterThan(100);

    const firstFrame = m1Frames[0];
    const lastFrame = m1Frames[m1Frames.length - 1];

    const dCx = Math.abs(firstFrame.cx - lastFrame.cx);
    const dCy = Math.abs(firstFrame.cy - lastFrame.cy);
    const dAngle = Math.abs(firstFrame.angle - lastFrame.angle);

    expect(dCx).toBeLessThan(0.05);
    expect(dCy).toBeLessThan(0.05);
    expect(dAngle).toBeLessThan(0.05);
  });

  it("successfully generated primary MediaPipe landmarks for Mateo", () => {
    const mpPath = path.join(visemesDir, "mateo_default_trait_mediapipe_landmarks.json");
    expect(fs.existsSync(mpPath)).toBe(true);

    const frames = JSON.parse(fs.readFileSync(mpPath, "utf-8"));
    expect(frames.length).toBeGreaterThan(100);
    expect(frames[0]).toHaveProperty("cx");
    expect(frames[0]).toHaveProperty("cy");
    expect(frames[0]).toHaveProperty("w");
    expect(frames[0]).toHaveProperty("h");
    expect(frames[0]).toHaveProperty("angle");
  });
});
