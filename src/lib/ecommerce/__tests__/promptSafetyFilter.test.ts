import { describe, it, expect } from "vitest";
import {
  sanitizeDiffusionPrompt,
  filterPromptForSafety,
  detectLanguage,
  stripSilentContract,
} from "../promptSafetyFilter";

describe("Prompt Safety Filter & Prominent People Neutralization", () => {
  it("neutralizes the exact failing user prompt with Ruby Vance and corset", () => {
    const rawFailingPrompt =
      "Cinematic drone flyover gliding smoothly across an expansive sunlit luxury living room featuring Ruby Vance (charismatic elegant female presenter with long wavy auburn hair and radiant confident expression, dressed in a tailored burgundy velvet sweetheart corset with sleek black trousers), walking gracefully barefoot across the installed Porcelanato San Lorenzo 45x90 in an expansive sunlit architectural room, gently kneeling down to run her fingertips over the smooth natural wood grain with a satisfied smile, admiring the seamless craftsmanship and texture, natural daylight reflections on the material, high-end Scandinavian interior architecture, photorealistic 8k commercial quality, 30fps";

    const result = sanitizeDiffusionPrompt(rawFailingPrompt);

    expect(result.wasModified).toBe(true);
    expect(result.sanitizedPrompt).not.toContain("Ruby Vance");
    expect(result.sanitizedPrompt).not.toContain("Vance");
    expect(result.sanitizedPrompt).not.toContain("corset");
    expect(result.sanitizedPrompt).not.toContain("bodice");

    // Confirms preservation of key stylistic, aesthetic, and architectural details
    expect(result.sanitizedPrompt).toContain("charismatic elegant female presenter");
    expect(result.sanitizedPrompt).toContain("long wavy auburn hair");
    expect(result.sanitizedPrompt).toContain("an elegant tailored burgundy velvet evening dress");
    expect(result.sanitizedPrompt).not.toContain("black trousers");
    expect(result.sanitizedPrompt).toContain("Porcelanato San Lorenzo 45x90");
  });

  it("neutralizes sensitive fashion terms like bodice, corset, bustier, and cleavage", () => {
    const promptWithBodice = "A presenter dressed in a tailored burgundy velvet evening bodice with sleek black trousers and deep cleavage.";
    const cleaned = filterPromptForSafety(promptWithBodice);
    expect(cleaned).not.toContain("bodice");
    expect(cleaned).not.toContain("corset");
    expect(cleaned).not.toContain("cleavage");
    expect(cleaned).not.toContain("black trousers");
    expect(cleaned).toContain("an elegant tailored burgundy velvet evening dress");
    expect(cleaned).toContain("tailored neckline");
  });

  it("neutralizes other persona names and prominent political/celebrity surnames", () => {
    const promptWithBlaze = "A high-end studio scene featuring Blaze Wilder presenting a luxury wristwatch.";
    expect(filterPromptForSafety(promptWithBlaze)).not.toContain("Blaze Wilder");
    expect(filterPromptForSafety(promptWithBlaze)).toContain("female presenter presenting a luxury wristwatch");

    const promptWithMateo = "Cinematic 8s video of Mateo Rossi discussing electric vehicles.";
    expect(filterPromptForSafety(promptWithMateo)).not.toContain("Mateo Rossi");

    const promptWithVance = "Presenter standing with Vance beside the product display.";
    expect(filterPromptForSafety(promptWithVance)).not.toContain("Vance");

    const promptWithCelebrity = "A commercial with a celebrity lookalike endorsing a smartphone.";
    expect(filterPromptForSafety(promptWithCelebrity)).not.toContain("celebrity");
  });

  it("cleans empty parentheses and duplicate punctuation gracefully", () => {
    const messyPrompt = "Hero presentation of the product (),, with studio lighting . . featuring a presenter .";
    const cleaned = filterPromptForSafety(messyPrompt);

    expect(cleaned).not.toContain("()");
    expect(cleaned).not.toContain(",,");
    expect(cleaned).not.toContain(". .");
  });

  it("enforces closed-mouth silent presenter and spoken narration with voiceover on human prompts when allowSpeaking is false", () => {
    const presenterPrompt = "Commercial shot featuring a presenter standing gracefully beside modern luxury sofa, speaking to camera.";
    const cleaned = filterPromptForSafety(presenterPrompt);
    expect(cleaned).not.toContain("speaking to camera");
    expect(cleaned).toContain("closed mouth");
    expect(cleaned).toContain("spoken narration with voiceover");
    expect(cleaned).toContain("no on-camera talking or lip movement");
  });

  it("preserves on-camera speech dialogue and strips silent contract when allowSpeaking is true", () => {
    const speakingPrompt =
      "Cinematic commercial featuring an elegant female presenter standing gracefully beside Porcelanato San Lorenzo, speaking on camera with clear diction and natural lip synchronization, delivering the dialogue in Spanish: 'Descubrí la máxima calidad para tus pisos'. Crisp broadcast vocal audio synchronized with realistic mouth articulation, absolutely no on-camera talking or lip movement, silent on-camera presenter with closed mouth.";
    const cleaned = filterPromptForSafety(speakingPrompt, { allowSpeaking: true });

    expect(cleaned).toContain("speaking on camera with clear diction and natural lip synchronization");
    expect(cleaned).toContain("delivering the dialogue in Spanish: 'Descubrí la máxima calidad para tus pisos'");
    expect(cleaned).toContain("Crisp broadcast vocal audio synchronized with realistic mouth articulation");
    expect(cleaned).not.toContain("closed mouth");
    expect(cleaned).not.toContain("silent on-camera presenter");
    expect(cleaned).not.toContain("no on-camera talking or lip movement");
  });

  it("detects language accurately for Spanish and English text", () => {
    expect(detectLanguage("Transformá tus espacios con la más alta calidad y elegancia")).toBe("Spanish");
    expect(detectLanguage("Descubrí el nuevo Porcelanato San Lorenzo para tu hogar")).toBe("Spanish");
    expect(detectLanguage("¿Tenés dudas sobre la instalación? Hacé click acá")).toBe("Spanish");
    expect(detectLanguage("Premium Scandinavian hardwood flooring engineered for luxury interiors")).toBe("English");
    expect(detectLanguage("Discover the latest collection of bespoke timepieces")).toBe("English");
    expect(detectLanguage("")).toBe("English");
    expect(detectLanguage(null)).toBe("English");
  });

  it("strips all legacy silent conditioning clauses with stripSilentContract", () => {
    const dirtyPrompt =
      "Smooth floating glide, silent on-camera presenter with closed mouth, poised serene facial expression, persona not speaking or talking on camera, spoken narration with voiceover, voiceover narration only, clean ambient room acoustics, absolutely no on-camera talking or lip movement, high quality 8k";
    const stripped = stripSilentContract(dirtyPrompt);

    expect(stripped).not.toContain("closed mouth");
    expect(stripped).not.toContain("silent on-camera presenter");
    expect(stripped).not.toContain("not speaking or talking");
    expect(stripped).not.toContain("spoken narration with voiceover");
    expect(stripped).not.toContain("absolutely no on-camera talking or lip movement");
    expect(stripped).toContain("Smooth floating glide");
    expect(stripped).toContain("high quality 8k");
  });
});
