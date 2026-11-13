import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateScriptOutput,
  safeValidateScriptOutput,
} from "@/lib/llm/scriptSchema";
import { getProvider } from "@/lib/llm/client";

describe("Script Schema Validation", () => {
  const validScript = {
    headline: "AI Revolution Shakes the Tech World",
    segments: [
      {
        index: 0,
        start_time: 0,
        end_time: 12,
        text: "Breaking news in the world of tech.",
        image_prompt: "Futuristic cityscape with neon lights",
      },
      {
        index: 1,
        start_time: 12,
        end_time: 24,
        text: "A new AI model has been released.",
        image_prompt: "Close-up of a neural network visualization",
      },
      {
        index: 2,
        start_time: 24,
        end_time: 36,
        text: "Industry experts are excited.",
        image_prompt: "Group of scientists in a modern lab",
      },
      {
        index: 3,
        start_time: 36,
        end_time: 48,
        text: "Companies are racing to integrate.",
        image_prompt: "Tech company headquarters at sunset",
      },
      {
        index: 4,
        start_time: 48,
        end_time: 60,
        text: "Stay tuned for more updates.",
        image_prompt: "Ruby signing off in a news studio",
      },
    ],
    youtube_title: "AI Revolution 2026 | Ruby News",
    youtube_description: "The latest AI breakthrough explained in 60 seconds.",
    youtube_tags: ["AI", "tech", "news"],
    instagram_caption: "🤖 AI just changed everything. Full story in 60 seconds!",
    instagram_hashtags: ["#ai", "#tech", "#news"],
  };

  it("should validate a correct script output", () => {
    const result = validateScriptOutput(validScript);
    expect(result.headline).toBe("AI Revolution Shakes the Tech World");
    expect(result.segments).toHaveLength(5);
  });

  it("should reject script with empty headline", () => {
    const invalid = { ...validScript, headline: "" };
    const result = safeValidateScriptOutput(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject script with fewer than 3 segments", () => {
    const invalid = {
      ...validScript,
      segments: validScript.segments.slice(0, 2),
    };
    const result = safeValidateScriptOutput(invalid);
    expect(result.success).toBe(false);
  });

  it("should reject overlapping segments", () => {
    const invalid = {
      ...validScript,
      segments: [
        { ...validScript.segments[0] },
        {
          ...validScript.segments[1],
          start_time: 5, // overlaps with segment 0 ending at 12
        },
        ...validScript.segments.slice(2),
      ],
    };
    const result = safeValidateScriptOutput(invalid);
    expect(result.success).toBe(false);
  });

  it("should accept optional platform metadata", () => {
    const minimal = {
      headline: "Test",
      segments: validScript.segments,
    };
    const result = safeValidateScriptOutput(minimal);
    expect(result.success).toBe(true);
  });

  it("should reject youtube title over 100 chars", () => {
    const invalid = {
      ...validScript,
      youtube_title: "A".repeat(101),
    };
    const result = safeValidateScriptOutput(invalid);
    expect(result.success).toBe(false);
  });
});

describe("LLM Client Provider Selection", () => {
  it("should default to gemini provider when env not set", () => {
    const originalEnv = process.env.LLM_PROVIDER;
    delete process.env.LLM_PROVIDER;

    expect(getProvider()).toBe("gemini");

    process.env.LLM_PROVIDER = originalEnv;
  });

  it("should respect LLM_PROVIDER env var", () => {
    const originalEnv = process.env.LLM_PROVIDER;
    process.env.LLM_PROVIDER = "ollama";

    expect(getProvider()).toBe("ollama");

    process.env.LLM_PROVIDER = originalEnv;
  });
});
