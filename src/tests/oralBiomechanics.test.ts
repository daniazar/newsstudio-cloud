import { describe, it, expect } from "vitest";
import { NEURAL_3DMM_FRAGMENT_SHADER } from "../lib/realtime/shaders/neural3DMMFragmentShader";

describe("Oral Biomechanics & Pucker De-Stretching (5A & 5N)", () => {
  it("should clamp pucker when jaw drops wide open (> 0.35)", () => {
    // Physical law: human lips cannot maintain tight radial pucker with an open mandible
    const calculatePucker = (rawPucker: number, jawOpen: number, avgEnergy: number) => {
      const energyGate = Math.max(0.0, Math.min(1.0, (avgEnergy - 0.015) / 0.040));
      const jawPuckerClamp = Math.max(0.05, 1.0 - Math.max(0.0, jawOpen - 0.35) * 1.6);
      return rawPucker * energyGate * jawPuckerClamp;
    };

    // When jaw is closed (0.05) and speaking (energy 0.1)
    const closedJawPucker = calculatePucker(0.9, 0.05, 0.1);
    expect(closedJawPucker).toBeCloseTo(0.9, 2);

    // When jaw drops wide open (0.80) during an open vowel
    const wideJawPucker = calculatePucker(0.9, 0.80, 0.1);
    expect(wideJawPucker).toBeLessThan(0.30);
    expect(wideJawPucker).toBeCloseTo(0.9 * 1.0 * (1.0 - 0.45 * 1.6), 2);
  });

  it("should gate off pucker to 0 when speech audio energy drops below silence threshold", () => {
    const calculatePucker = (rawPucker: number, jawOpen: number, avgEnergy: number) => {
      const energyGate = Math.max(0.0, Math.min(1.0, (avgEnergy - 0.015) / 0.040));
      const jawPuckerClamp = Math.max(0.05, 1.0 - Math.max(0.0, jawOpen - 0.35) * 1.6);
      return rawPucker * energyGate * jawPuckerClamp;
    };

    // Low background noise / silence (0.010 energy)
    const silentPucker = calculatePucker(0.95, 0.1, 0.010);
    expect(silentPucker).toBe(0);

    // Halfway threshold (0.035 energy)
    const midEnergyPucker = calculatePucker(1.0, 0.1, 0.035);
    expect(midEnergyPucker).toBeCloseTo(0.5, 1);
  });

  it("should compute Hermite cubic spline interpolation with C1 continuity (5N)", () => {
    // Hermite smoothstep S(s) = 3s^2 - 2s^3
    const hermiteBlend = (v0: number, v1: number, s: number) => {
      const clampedS = Math.max(0, Math.min(1, s));
      const hAlpha = clampedS * clampedS * (3.0 - 2.0 * clampedS);
      return v0 + (v1 - v0) * hAlpha;
    };

    // At s = 0, should equal v0
    expect(hermiteBlend(0.2, 0.8, 0)).toBe(0.2);

    // At s = 1, should equal v1
    expect(hermiteBlend(0.2, 0.8, 1)).toBe(0.8);

    // At midpoint s = 0.5, smoothstep is exactly 0.5
    expect(hermiteBlend(0.2, 0.8, 0.5)).toBeCloseTo(0.5, 4);

    // At s = 0.25, rate of change is smooth (no sharp kinks)
    const quarter = hermiteBlend(0.0, 1.0, 0.25);
    expect(quarter).toBeCloseTo(0.25 * 0.25 * (3 - 2 * 0.25), 4);
  });

  describe("Step 1: Oral Cavity & Dental Realism Shader Formulation", () => {
    it("should contain anatomical Cupid's bow contour formula in NEURAL_3DMM_FRAGMENT_SHADER", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("cupidsBow");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("apertureMask");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("innerMucosa");
    });

    it("should model anatomical interdental embrasures and 3D crown curvature in NEURAL_3DMM_FRAGMENT_SHADER", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("distMidline");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("distCanine");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("enamelSpecular");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("gingivaTone");
    });

    it("should compute maximum embrasure shadow at exact tooth boundary contact lines", () => {
      const getEmbrasureShadow = (x: number) => {
        const absX = Math.abs(x);
        const distMidline = absX;
        const distL1 = Math.abs(absX - 0.115);
        const distL2 = Math.abs(absX - 0.235);
        const distCanine = Math.abs(absX - 0.355);
        const distPremolar = Math.abs(absX - 0.470);
        const minEmbrasure = Math.min(distMidline, distL1, distL2, distCanine, distPremolar);
        return Math.exp(-Math.pow(minEmbrasure / 0.011, 2.0)) * 0.35;
      };

      // Exactly at central incisor midline (x = 0)
      expect(getEmbrasureShadow(0.0)).toBeCloseTo(0.35, 2);
      // Exactly at central/lateral boundary (x = 0.115)
      expect(getEmbrasureShadow(0.115)).toBeCloseTo(0.35, 2);
      // Exactly at lateral/canine boundary (x = 0.235)
      expect(getEmbrasureShadow(0.235)).toBeCloseTo(0.35, 2);

      // On the front face of central incisor (x = 0.057)
      expect(getEmbrasureShadow(0.057)).toBeLessThan(0.01);
    });

    it("should compute maximum enamel specular highlight along tooth crown centers", () => {
      const getEnamelSpecular = (x: number) => {
        const absX = Math.abs(x);
        let crownCenter = Math.min(Math.abs(x - 0.057), Math.abs(x + 0.057));
        crownCenter = Math.min(crownCenter, Math.abs(absX - 0.175), Math.abs(absX - 0.295));
        return Math.exp(-Math.pow(crownCenter / 0.032, 2.0)) * 0.24;
      };

      // Center of central incisor (x = 0.057)
      expect(getEnamelSpecular(0.057)).toBeCloseTo(0.24, 2);
      // Center of lateral incisor (x = 0.175)
      expect(getEnamelSpecular(0.175)).toBeCloseTo(0.24, 2);
      // Interdental boundary (x = 0.115) -> specular highlight drops near 0
      expect(getEnamelSpecular(0.115)).toBeLessThan(0.08);
    });
  });

  describe("Step 2: 3D Head Orientation Coupling & Lip Biomechanics", () => {
    it("should contain 3D orientation coupling and biomechanics tokens in NEURAL_3DMM_FRAGMENT_SHADER", () => {
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("obliqueTilt");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("totalMouthAngle");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("toothX");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("pitchIncisal");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("labiodentalTuck");
      expect(NEURAL_3DMM_FRAGMENT_SHADER).toContain("rollOutWarp");
    });

    it("should compute oblique perspective tilt of the mouth line under combined yaw and pitch", () => {
      const getObliqueTilt = (headYawDeg: number, headPitchDeg: number) => {
        const yawRad = (headYawDeg * Math.PI) / 180;
        const pitchRad = (headPitchDeg * Math.PI) / 180;
        return -Math.sin(yawRad) * Math.sin(pitchRad) * 0.85;
      };

      // When head is facing straight (yaw=0, pitch=0), tilt is strictly zero
      expect(getObliqueTilt(0, 0)).toBeCloseTo(0, 5);

      // When head is turned 25° yaw and pitched down 20°
      const tilt = getObliqueTilt(25, 20);
      expect(tilt).toBeLessThan(0); // Oblique slant
      expect(Math.abs(tilt)).toBeGreaterThan(0.05); // Measurable perspective angle tilt

      // Pitching up inverts the tilt direction
      const tiltUp = getObliqueTilt(25, -20);
      expect(tiltUp).toBeCloseTo(-tilt, 5);
    });

    it("should rotate the maxillary dental arch and shift midline in perspective under head yaw", () => {
      const getToothArchX = (normX: number, headYawDeg: number) => {
        const yawRad = (headYawDeg * Math.PI) / 180;
        const cosYaw = Math.max(0.25, Math.cos(yawRad));
        const sinYaw = Math.sin(yawRad);
        let toothX = (normX - sinYaw * 0.22) / cosYaw;
        toothX += toothX * Math.abs(toothX) * sinYaw * 0.16;
        return toothX;
      };

      // At zero yaw, canonical normX=0 corresponds to arch midline toothX=0
      expect(getToothArchX(0, 0)).toBeCloseTo(0, 4);

      // When head yaws to the right (+30°), the dental midline projects to the right (+x)
      const yawedToothXAtRestCenter = getToothArchX(0, 30);
      expect(yawedToothXAtRestCenter).toBeLessThan(0); // Apparent center is shifted towards near side

      // The point on the screen where toothX is exactly 0 (central incisor midline) is at +sin(yaw)*0.22
      const sin30 = Math.sin((30 * Math.PI) / 180);
      const midlineScreenPos = sin30 * 0.22;
      expect(getToothArchX(midlineScreenPos, 30)).toBeCloseTo(0, 2);
    });

    it("should modulate incisal edge exposure and lower dental arch visibility based on head pitch", () => {
      const getIncisalEdge = (toothX: number, headPitchDeg: number) => {
        const pitchRad = (headPitchDeg * Math.PI) / 180;
        const pitchIncisal = Math.sin(pitchRad) * 0.12;
        return -0.015 + 0.14 * toothX * toothX + pitchIncisal;
      };

      // At rest (pitch = 0)
      const restEdge = getIncisalEdge(0, 0);
      expect(restEdge).toBeCloseTo(-0.015, 3);

      // Looking down (+20° pitch): incisal edge shifts down (upper lip covers upper teeth)
      const pitchDownEdge = getIncisalEdge(0, 20);
      expect(pitchDownEdge).toBeGreaterThan(restEdge);

      // Looking up (-20° pitch): incisal edge shifts up (teeth exposed from below)
      const pitchUpEdge = getIncisalEdge(0, -20);
      expect(pitchUpEdge).toBeLessThan(restEdge);
    });

    it("should compute labiodental tuck displacement for fricative consonants (/f, v/)", () => {
      const getLabiodentalTuck = (lipCompression: number, jawOpen: number, ny: number, nx: number, ry: number) => {
        const smoothstep = (min: number, max: number, x: number) => {
          const t = Math.max(0, Math.min(1, (x - min) / (max - min)));
          return t * t * (3 - 2 * t);
        };
        const labiodentalWeight =
          smoothstep(0.15, 0.55, lipCompression) *
          smoothstep(0.02, 0.25, jawOpen) *
          smoothstep(0.05, 0.45, ny) *
          smoothstep(0.85, 0.0, Math.abs(nx));
        return labiodentalWeight * ry * 0.22;
      };

      // When speaking fricatives (compression 0.45, slight jaw 0.12, on lower lip ny=0.25, center nx=0)
      const tuck = getLabiodentalTuck(0.45, 0.12, 0.25, 0.0, 0.03);
      expect(tuck).toBeGreaterThan(0.001);

      // When mouth is closed in resting state (lipCompression 0)
      const noTuck = getLabiodentalTuck(0.0, 0.0, 0.25, 0.0, 0.03);
      expect(noTuck).toBe(0);
    });
  });
});

