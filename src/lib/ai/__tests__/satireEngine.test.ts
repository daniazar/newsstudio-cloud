import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateSatiricalMonologue,
  generateFallbackMonologue,
  SATIRE_SYSTEM_PROMPT,
} from "../satireEngine";

const generateLlmObjectMock = vi.fn();

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
}));

describe("Cognitive Satire & Comedic Timing Engine (satireEngine.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("SATIRE_SYSTEM_PROMPT", () => {
    it("should define comedic setup-punchline and deadpan timing rules", () => {
      expect(typeof SATIRE_SYSTEM_PROMPT).toBe("string");
      expect(SATIRE_SYSTEM_PROMPT).toContain("The Daily LLM");
      expect(SATIRE_SYSTEM_PROMPT).toContain("deadpan");
      expect(SATIRE_SYSTEM_PROMPT).toContain("laugh_track");
    });
  });

  describe("generateFallbackMonologue", () => {
    it("should generate a complete satirical monologue without external network", () => {
      const monologue = generateFallbackMonologue("Tech CEOs Testifying on AI Sentience", "blaze");

      expect(monologue.showTitle).toContain("THE DAILY LLM");
      expect(monologue.headlineTopic).toBe("Tech CEOs Testifying on AI Sentience");
      expect(monologue.hostPersonaId).toBe("blaze");
      expect(monologue.jokes.length).toBeGreaterThanOrEqual(2);

      const firstJoke = monologue.jokes[0];
      expect(firstJoke.targetEntity).toBeDefined();
      expect(firstJoke.newsSetup).toBeDefined();
      expect(firstJoke.punchline).toBeDefined();
      expect(firstJoke.deadpanPauseMs).toBeGreaterThan(0);
      expect(firstJoke.memeGraphicPrompt).toBeDefined();
    });
  });

  describe("generateSatiricalMonologue", () => {
    const topic = "Quantum Crypto Wallet Lost in Landfill";

    it("should synthesize monologue using LLM gateway with calibrated jokes", async () => {
      generateLlmObjectMock.mockResolvedValueOnce({
        object: {
          showTitle: "THE DAILY LLM with BLAZE",
          headlineTopic: topic,
          coldOpen: "Welcome to The Daily LLM! Today in things money cannot buy: common sense.",
          jokes: [
            {
              id: "joke_1",
              segmentIndex: 1,
              targetEntity: "Cryptocurrency Speculator",
              newsSetup: "A man is offering $200 million to excavate an entire municipal landfill for his lost USB hard drive.",
              punchline: "Because nothing says sound monetary policy quite like hiring three hundred bulldozers to sift through twelve years of diaper waste.",
              deliveryTone: "deadpan",
              deadpanPauseMs: 800,
              sfxCue: "laugh_track",
              cameraAngle: "CAM_DEADPAN_TIGHT",
              memeGraphicPrompt: "A man in a bespoke tuxedo triumphantly holding a rotting banana peel on top of a mountain of garbage",
              memeHeadline: "PROOF OF TRASH",
              fullSpokenText: "[skeptical] A man wants to dig up an entire landfill for his Bitcoin. [sfx:laugh_track]",
            },
          ],
          closingSignoff: "Goodnight and check your pockets before taking out the trash.",
        },
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const result = await generateSatiricalMonologue({ topic, hostPersonaId: "blaze" });

      expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
      expect(result.showTitle).toBe("THE DAILY LLM with BLAZE");
      expect(result.jokes.length).toBe(1);
      expect(result.jokes[0].targetEntity).toBe("Cryptocurrency Speculator");
      expect(result.jokes[0].deadpanPauseMs).toBe(800);
      expect(result.closingSignoff).toContain("check your pockets");
    });

    it("should fall back gracefully to programmatic monologue when LLM throws", async () => {
      generateLlmObjectMock.mockRejectedValueOnce(new Error("LLM generation timed out"));

      const result = await generateSatiricalMonologue({ topic, hostPersonaId: "ruby" });

      expect(result.headlineTopic).toBe(topic);
      expect(result.hostPersonaId).toBe("ruby");
      expect(result.jokes.length).toBeGreaterThan(0);
    });
  });
});
