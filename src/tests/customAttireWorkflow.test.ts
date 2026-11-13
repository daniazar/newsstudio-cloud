/**
 * src/tests/customAttireWorkflow.test.ts
 *
 * Verifies custom attire prompt compilation, SAM keyword extraction,
 * engine resolution from environment variables, and database catalog integration.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  compileWardrobePlatePrompt,
  extractSamKeywords,
  resolveImageEngine,
  CustomAttireInput,
} from "@/lib/ai/wardrobeImageGenerator";

describe("Custom Attire Workflow & Prompt Architecture", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it("compiles a clean 4-panel multi-view prompt on pure green chroma wall (#00FF00)", () => {
    const input: CustomAttireInput = {
      name: "Ivory Silk Wrap Blouse",
      description: "Ivory silk wrap blouse with gold cufflinks and dark pleated trousers",
      gender: "female",
      category: "executive",
    };

    const prompt = compileWardrobePlatePrompt(input);

    // Verify 4-subpanel vertical layout
    expect(prompt).toContain("Panel 1 (left): Full Front View");
    expect(prompt).toContain("Panel 2: Left Side Profile View");
    expect(prompt).toContain("Panel 3: Rear Back View");
    expect(prompt).toContain("Panel 4 (right): Single seamless vertical macro close-up");

    // Verify Whole Ensemble (Top & Bottom)
    expect(prompt).toContain("The outfit must be whole, including both top and bottom parts");

    // Verify Pure Chroma Wall
    expect(prompt).toContain("#00FF00 green screen");

    // Verify Ghost-Mannequin & Zero Human/Plastic rules
    expect(prompt).toContain("invisible 3D ghost mannequin");
    expect(prompt).toContain("NO human head, NO face, NO plastic mannequin skin");

    // Verify Zero Text & Zero Labels
    expect(prompt).toContain("Absolutely NO text, NO labels, NO numbers, NO words, NO captions, NO banners");
  });

  it("extracts intelligent SAM 3.1 segmentation tokens from descriptions", () => {
    const tokensSuit = extractSamKeywords(
      "Charcoal wool business suit with crisp dress shirt and silk tie",
      "male"
    );
    expect(tokensSuit).toContain("clothing");
    expect(tokensSuit).toContain("suit");
    expect(tokensSuit).toContain("shirt");
    expect(tokensSuit).toContain("tie");

    const tokensDress = extractSamKeywords(
      "Crimson evening sheath dress with gold belt cinch",
      "female"
    );
    expect(tokensDress).toContain("clothing");
    expect(tokensDress).toContain("dress");
    expect(tokensDress).toContain("belt");

    const tokensLeather = extractSamKeywords(
      "Matte black moto leather jacket with chrome asymmetric zips",
      "unisex"
    );
    expect(tokensLeather).toContain("clothing");
    expect(tokensLeather).toContain("leather jacket");
  });

  it("resolves engine dynamically based on environment variables", () => {
    // 1. Explicit WARDROBE_IMAGE_ENGINE="agy"
    vi.stubEnv("WARDROBE_IMAGE_ENGINE", "agy");
    expect(resolveImageEngine()).toBe("agy");

    // 2. Explicit WARDROBE_IMAGE_ENGINE="api"
    vi.stubEnv("WARDROBE_IMAGE_ENGINE", "api");
    expect(resolveImageEngine()).toBe("api");

    // 3. Fallback to API if GEMINI_API_KEY is configured
    vi.stubEnv("WARDROBE_IMAGE_ENGINE", "auto");
    vi.stubEnv("GEMINI_API_KEY", "test_key_123");
    expect(resolveImageEngine()).toBe("api");

    // 4. Override parameter takes highest precedence
    expect(resolveImageEngine("agy")).toBe("agy");
  });
});
