import { describe, it, expect } from "vitest";
import { optimizeSpeechCadence } from "../cadenceOptimizer";

describe("cadenceOptimizer", () => {
  it("automatically injects breathing pause ellipses on commas", () => {
    const raw = "¡Atención! Este piso es 100% impermeable, resistente a rayones y de alto tránsito.";
    const optimized = optimizeSpeechCadence(raw, "es");

    expect(optimized).toContain("impermeable... resistente");
    expect(optimized).toContain("¡Atención!... Este piso");
  });

  it("protects Argentine and international currency numbers and decimal quantities", () => {
    const raw = "Llevátelo hoy por solo $18.500, con un grosor de 3,5 mm y 10.2 metros de rendimiento.";
    const optimized = optimizeSpeechCadence(raw, "es");

    expect(optimized).toContain("$18.500");
    expect(optimized).toContain("3,5 mm");
    expect(optimized).toContain("10.2");
  });

  it("preserves inline sound effect tags like [sfx:whoosh]", () => {
    const raw = "Descubrí la nueva textura [sfx:whoosh] que transformará tu hogar.";
    const optimized = optimizeSpeechCadence(raw, "es");

    expect(optimized).toContain("[sfx:whoosh]");
  });

  it("converts semicolons and colons to rhythmic em-dash pauses", () => {
    const raw = "Doble capa protectora; máxima durabilidad garantizada.";
    const optimized = optimizeSpeechCadence(raw, "es");

    expect(optimized).toContain("protectora — máxima durabilidad");
  });

  it("handles empty or blank input gracefully", () => {
    expect(optimizeSpeechCadence("")).toBe("");
    expect(optimizeSpeechCadence("   ")).toBe("");
  });
});
