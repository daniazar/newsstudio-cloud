import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockLanguageModelV4 } from "ai/test";
import {
  parseArticleForStudio,
  parseArticleAsDebate,
  parseArticleAsPodcast,
  parseArticleAsInterview,
  parseArticleAsVTuber,
  parseArticleAsDataStudio,
  parseArticleAsNarrativeMatrix,
  parseArticleAsLocalization,
  StudioPayloadSchema,
  DebatePayloadSchema,
  PodcastPayloadSchema,
  InterviewPayloadSchema,
  VTuberPayloadSchema,
  LocalizationPayloadSchema,
  NarrativeMatrixPayloadSchema,
  DataStudioPayloadSchema,
} from "../index";
import * as aiSdkGateway from "@/lib/llm/aiSdkGateway";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiTokenUsage: {
      create: vi.fn().mockResolvedValue({ id: "mock-token-id" }),
    },
    usageLog: {
      create: vi.fn().mockResolvedValue({ id: "mock-usage-id" }),
    },
    $transaction: vi.fn().mockImplementation(async (ops: any[]) => Promise.all(ops)),
  },
}));

describe("Broadcast Studio Parsers Suite (Unified AI SDK Gateway)", () => {
  const dummyArticle = `
    Global tech leaders convened today to discuss next-generation AI agents.
    The new framework promises autonomous real-time reasoning across multi-modal platforms,
    while raising critical questions regarding safety boundaries, economic impacts, and international governance.
  `;

  describe("1. Debate Studio Parser (parseArticleAsDebate)", () => {
    it("parses 2-speaker debate correctly with customModel", async () => {
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 20, noCache: 20, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 60, text: 60, reasoning: 0 },
          },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                topic: "AGENTS VS SAFETY",
                participantCount: 2,
                speakers: [
                  {
                    id: "ruby",
                    name: "Ruby Vance",
                    role: "Lead Anchor",
                    stance: "MODERATOR • HOST",
                    location: "STUDIO 1",
                    accentColor: "#22d3ee",
                  },
                  {
                    id: "tomas",
                    name: "Tomas Vega",
                    role: "Skeptic",
                    stance: "CON • SAFETY FIRST",
                    location: "BUREAU",
                    accentColor: "#f43f5e",
                  },
                ],
                turns: [
                  {
                    speakerId: "ruby",
                    speakerName: "Ruby Vance",
                    stance: "MODERATOR",
                    text: "[urgent] Welcome to the debate.",
                    emotion: "[urgent]",
                    cameraCue: "desk_master",
                    roundName: "OPENING",
                  },
                  {
                    speakerId: "tomas",
                    speakerName: "Tomas Vega",
                    stance: "CON",
                    text: "[serious] We must tread carefully.",
                    emotion: "[serious]",
                    cameraCue: "split_screen",
                    roundName: "OPENING",
                  },
                ],
              }),
            },
          ],
        }),
      });

      const payload = await parseArticleAsDebate(dummyArticle, {
        participantCount: 2,
        personaSlugs: ["ruby", "tomas"],
        customModel: mockModel,
        companyId: "org-tenant-1",
        storyId: "story-101",
      });

      expect(payload.studioType).toBe("debate");
      expect(payload.participantCount).toBe(2);
      expect(payload.speakers.length).toBe(2);
      expect(payload.speakers[0].avatarUrl).toContain("/avatars/ruby.png");
      expect(payload.speakers[1].avatarUrl).toContain("/avatars/tomas.png");
      expect(payload.deskMasterImageSrc).toContain("dual_ruby_tomas_desk_master.jpg");
      expect(payload.turns.length).toBe(2);
      expect(payload.turns[0].id).toBe("turn-1");
      expect(payload.turns[1].id).toBe("turn-2");

      // Validate against strict Zod schema
      const validated = DebatePayloadSchema.safeParse(payload);
      expect(validated.success).toBe(true);
      expect(StudioPayloadSchema.safeParse(payload).success).toBe(true);
    });

    it("parses 3-speaker debate with roundtable master desk plate", async () => {
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 20, noCache: 20, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 80, text: 80, reasoning: 0 },
          },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                topic: "TRI-PERSPECTIVE AI CLASH",
                participantCount: 3,
                speakers: [
                  { id: "ruby", name: "Ruby", role: "Host", stance: "MODERATOR", location: "NYC" },
                  { id: "mateo", name: "Mateo", role: "Bull", stance: "PRO", location: "SF" },
                  { id: "blaze", name: "Blaze", role: "Bear", stance: "CON", location: "LDN" },
                ],
                turns: [
                  {
                    speakerId: "ruby",
                    speakerName: "Ruby",
                    stance: "MODERATOR",
                    text: "[urgent] Opening roundtable.",
                    emotion: "[urgent]",
                    cameraCue: "desk_master",
                    roundName: "ESTABLISHING",
                  },
                ],
              }),
            },
          ],
        }),
      });

      const payload = await parseArticleAsDebate(dummyArticle, {
        participantCount: 3,
        personaSlugs: ["ruby", "mateo", "blaze"],
        layoutKey: "sunday_political_roundtable",
        customModel: mockModel,
      });

      expect(payload.participantCount).toBe(3);
      expect(payload.layoutKey).toBe("sunday_political_roundtable");
      expect(payload.deskMasterImageSrc).toContain("roundtable_ruby_mateo_blaze_crescent_master.jpg");
      expect(payload.speakers.length).toBe(3);
    });

    it("preserves participantCount 2 and dual desk master even if LLM omits participantCount", async () => {
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 15, noCache: 15, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 40, text: 40, reasoning: 0 },
          },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                topic: "2-WAY DUEL WITHOUT PARTICIPANT COUNT IN JSON",
                speakers: [
                  { id: "ruby", name: "Ruby", role: "Host", stance: "PRO", location: "NYC" },
                  { id: "tomas", name: "Tomas", role: "Skeptic", stance: "CON", location: "SF" },
                ],
                turns: [
                  {
                    speakerId: "ruby",
                    speakerName: "Ruby",
                    stance: "PRO",
                    text: "[excited] Welcome to duel.",
                    emotion: "[excited]",
                    cameraCue: "desk", // Normalizes "desk" -> "desk_master"
                    roundName: "OPENING",
                  },
                ],
              }),
            },
          ],
        }),
      });

      const payload = await parseArticleAsDebate(dummyArticle, {
        participantCount: 2,
        personaSlugs: ["ruby", "tomas"],
        customModel: mockModel,
      });

      expect(payload.participantCount).toBe(2);
      expect(payload.deskMasterImageSrc).toContain("dual_ruby_tomas_desk_master.jpg");
      expect(payload.turns[0].cameraCue).toBe("desk_master");
    });
  });

  describe("2. Podcast Studio Parser (parseArticleAsPodcast)", () => {
    it("handles array of slugs as second argument for backwards compatibility", async () => {
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 50, text: 50, reasoning: 0 },
          },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                title: "Behind the Silicon Curtain",
                lines: [
                  {
                    speakerId: "ruby",
                    text: "Welcome back everyone. Today we are digging into autonomous agents.",
                    language: "en",
                    pacing: "standard",
                  },
                  {
                    speakerId: "mateo",
                    text: "¡Totalmente! Es impresionante lo rápido que está avanzando todo.",
                    language: "es",
                    pacing: "casual",
                  },
                ],
              }),
            },
          ],
        }),
      });

      // Pass options object with customModel
      const payload = await parseArticleAsPodcast(dummyArticle, {
        personaSlugs: ["ruby", "mateo"],
        customModel: mockModel,
        provider: "ollama",
        model: "qwen3.5:9b",
      });

      expect(payload.studioType).toBe("podcast");
      expect(payload.title).toBe("Behind the Silicon Curtain");
      expect(payload.lines.length).toBe(2);
      expect(payload.lines[0].id).toBe("line-1");
      expect(payload.lines[1].id).toBe("line-2");
      expect(payload.lines[0].speakerId).toBe("ruby");
      expect(payload.lines[1].language).toBe("es");

      // Validate against strict Zod schema
      expect(PodcastPayloadSchema.safeParse(payload).success).toBe(true);
      expect(StudioPayloadSchema.safeParse(payload).success).toBe(true);
    });

    it("assigns default persona slugs and normalizes pacing when options are omitted", async () => {
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 30, text: 30, reasoning: 0 } },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                title: "Default Hosts Show",
                lines: [
                  { text: "Line 1", language: "EN", pacing: "URGENT" },
                  { text: "Line 2", language: "es", pacing: "CASUAL" },
                ],
              }),
            },
          ],
        }),
      });

      const payload = await parseArticleAsPodcast(dummyArticle, { customModel: mockModel });
      expect(payload.lines[0].speakerId).toBe("ruby");
      expect(payload.lines[1].speakerId).toBe("mateo");
      expect(payload.lines[0].language).toBe("en");
      expect(payload.lines[0].pacing).toBe("urgent");
    });
  });

  describe("3. Interview Studio Parser (parseArticleAsInterview)", () => {
    it("parses 3-camera interview script with emotion tags", async () => {
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 40, text: 40, reasoning: 0 },
          },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                topic: "The Future of Autonomous Work",
                turns: [
                  {
                    speakerId: "ruby",
                    text: "[urgent] Dr. Vega, thank you for joining us.",
                    cameraAngle: "host_solo",
                    emotion: "[urgent]",
                    pacing: "Standard",
                  },
                  {
                    speakerId: "tomas",
                    text: "[calm] It is a pleasure. Let us review the primary telemetry.",
                    cameraAngle: "guest_solo",
                    emotion: "[calm]",
                    pacing: "Solemn",
                  },
                  {
                    speakerId: "ruby",
                    text: "[serious] The findings are stark.",
                    cameraAngle: "dual_shot",
                    emotion: "[serious]",
                    pacing: "Standard",
                  },
                ],
              }),
            },
          ],
        }),
      });

      const payload = await parseArticleAsInterview(dummyArticle, {
        personaSlugs: ["ruby", "tomas"],
        customModel: mockModel,
      });

      expect(payload.studioType).toBe("interview");
      expect(payload.topic).toBe("The Future of Autonomous Work");
      expect(payload.turns.length).toBe(3);
      expect(payload.turns[0].cameraAngle).toBe("host_solo");
      expect(payload.turns[1].cameraAngle).toBe("guest_solo");
      expect(payload.turns[2].cameraAngle).toBe("dual_shot");

      expect(InterviewPayloadSchema.safeParse(payload).success).toBe(true);
      expect(StudioPayloadSchema.safeParse(payload).success).toBe(true);
    });
  });

  describe("4. VTuber React Studio Parser (parseArticleAsVTuber)", () => {
    it("parses stream title, personaId and reaction moments with simulated chat", async () => {
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 40, text: 40, reasoning: 0 },
          },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                streamTitle: "AI AGENTS GO ROGUE?! 😱 Reacting Live!",
                reactionMoments: [
                  {
                    text: "Chat, are you seeing this right now?!",
                    reaction: "[excited]",
                    chatLine: "POGGERS REAL?!",
                    timestamp: 0,
                  },
                  {
                    text: "Wait, this actually changes everything.",
                    reaction: "[serious]",
                    chatLine: "no way bro",
                    timestamp: 15,
                  },
                ],
              }),
            },
          ],
        }),
      });

      const payload = await parseArticleAsVTuber(dummyArticle, {
        personaSlug: "hikari",
        customModel: mockModel,
      });

      expect(payload.studioType).toBe("vtuber");
      expect(payload.streamTitle).toContain("Reacting Live!");
      expect(payload.personaId).toBe("hikari");
      expect(payload.reactionMoments.length).toBe(2);
      expect(payload.reactionMoments[0].chatLine).toBe("POGGERS REAL?!");

      expect(VTuberPayloadSchema.safeParse(payload).success).toBe(true);
      expect(StudioPayloadSchema.safeParse(payload).success).toBe(true);
    });

    it("correctly resolves personaId when passed as personaSlugs array and coerces timestamp", async () => {
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 30, text: 30, reasoning: 0 } },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                streamTitle: "STREAMING LIVE NOW",
                reactionMoments: [
                  { text: "Yo what?!", reaction: "[excited]", chatLine: "W stream", timestamp: "5" },
                ],
              }),
            },
          ],
        }),
      });

      const payload = await parseArticleAsVTuber(dummyArticle, {
        personaSlugs: ["hikari"],
        customModel: mockModel,
      });

      expect(payload.personaId).toBe("hikari");
      expect(payload.reactionMoments[0].timestamp).toBe(5);
    });
  });

  describe("5. Narrative Matrix Parser (parseArticleAsNarrativeMatrix)", () => {
    it("parses 3-perspective debate format with rebuttals", async () => {
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 50, text: 50, reasoning: 0 },
          },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                topic: "Should Autonomous AI Systems Be Regulated by Global Treaty?",
                perspectives: [
                  {
                    role: "Progressive",
                    personaId: "ruby",
                    argumentText: "[serious] We must guarantee digital worker protections.",
                    rebuttal: "Market forces alone have never self-regulated safety.",
                    cameraAngle: "host_solo",
                  },
                  {
                    role: "Conservative",
                    personaId: "tomas",
                    argumentText: "[serious] Excessive red tape will surrender AI leadership to rivals.",
                    rebuttal: "Preemptive bureaucracy throttles domestic innovation.",
                    cameraAngle: "guest_solo",
                  },
                  {
                    role: "Centrist",
                    personaId: "aris",
                    argumentText: "[calm] A staged, benchmark-driven threshold approach balances both.",
                    rebuttal: "Empirical compute metrics offer objective guardrails.",
                    cameraAngle: "wide_shot",
                  },
                ],
              }),
            },
          ],
        }),
      });

      const payload = await parseArticleAsNarrativeMatrix(dummyArticle, {
        personaSlugs: ["ruby", "tomas", "aris"],
        customModel: mockModel,
      });

      expect(payload.studioType).toBe("narrative_matrix");
      expect(payload.perspectives.length).toBe(3);
      expect(payload.perspectives[0].role).toBe("Progressive");
      expect(payload.perspectives[1].role).toBe("Conservative");
      expect(payload.perspectives[2].role).toBe("Centrist");

      expect(NarrativeMatrixPayloadSchema.safeParse(payload).success).toBe(true);
      expect(StudioPayloadSchema.safeParse(payload).success).toBe(true);
    });

    it("assigns default 3-perspective persona slugs when options are omitted", async () => {
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: { inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 30, text: 30, reasoning: 0 } },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                topic: "3 Perspectives Topic",
                perspectives: [
                  { role: "Role A", argumentText: "Arg A" },
                  { role: "Role B", argumentText: "Arg B" },
                  { role: "Role C", argumentText: "Arg C" },
                ],
              }),
            },
          ],
        }),
      });

      const payload = await parseArticleAsNarrativeMatrix(dummyArticle, { customModel: mockModel });
      expect(payload.perspectives[0].personaId).toBe("ruby");
      expect(payload.perspectives[1].personaId).toBe("mateo");
      expect(payload.perspectives[2].personaId).toBe("blaze");
    });
  });

  describe("6. Localization Matrix Parser (parseArticleAsLocalization)", () => {
    it("maps 6 language tracks to their designated personas", async () => {
      const mockModel = new MockLanguageModelV4({
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: {
            inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 60, text: 60, reasoning: 0 },
          },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                sourceText: "Tech leaders announced a historic consensus on agentic safety standards.",
                tracks: [
                  { language: "en", languageName: "English", translatedText: "Tech leaders announced a historic consensus." },
                  { language: "es", languageName: "Spanish", translatedText: "Líderes tecnológicos anunciaron un consenso histórico." },
                  { language: "pt", languageName: "Portuguese", translatedText: "Líderes tecnológicos anunciaram um consenso histórico." },
                  { language: "fr", languageName: "French", translatedText: "Les leaders technologiques ont annoncé un consensus historique." },
                  { language: "de", languageName: "German", translatedText: "Technologieführer kündigten einen historischen Konsens an." },
                  { language: "ja", languageName: "Japanese", translatedText: "技術リーダーたちは歴史的な合意を発表しました。" },
                ],
              }),
            },
          ],
        }),
      });

      const payload = await parseArticleAsLocalization(dummyArticle, {
        customModel: mockModel,
      });

      expect(payload.studioType).toBe("localization");
      expect(payload.sourceLanguage).toBe("en");
      expect(payload.tracks.length).toBe(6);

      // Verify persona assignments
      const langMap = Object.fromEntries(payload.tracks.map((t) => [t.language, t.personaId]));
      expect(langMap.en).toBe("ruby");
      expect(langMap.es).toBe("mateo");
      expect(langMap.pt).toBe("lucia");
      expect(langMap.fr).toBe("claire");
      expect(langMap.de).toBe("kai");
      expect(langMap.ja).toBe("marina");

      expect(LocalizationPayloadSchema.safeParse(payload).success).toBe(true);
      expect(StudioPayloadSchema.safeParse(payload).success).toBe(true);
    });
  });

  describe("7. Unified parseArticleForStudio Dispatcher", () => {
    it("dispatches to all 7 studios cleanly", async () => {
      const createEchoModel = (studioType: string) =>
        new MockLanguageModelV4({
          doGenerate: async () => ({
            warnings: [],
            finishReason: { unified: "stop", raw: "stop" },
            usage: { inputTokens: { total: 5, noCache: 5, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 10, text: 10, reasoning: 0 } },
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  studioType === "podcast"
                    ? { title: "Test Podcast", lines: [] }
                    : studioType === "interview"
                    ? { topic: "Test Interview", turns: [] }
                    : studioType === "vtuber"
                    ? { streamTitle: "Test VTuber", reactionMoments: [] }
                    : studioType === "localization"
                    ? { sourceText: "Test Summary", tracks: [] }
                    : studioType === "narrative_matrix"
                    ? { topic: "Test Matrix", perspectives: [] }
                    : { topic: "Test Debate", speakers: [], turns: [] }
                ),
              },
            ],
          }),
        });

      const types = ["podcast", "interview", "vtuber", "localization", "narrative_matrix", "debate"] as const;

      for (const st of types) {
        const res = await parseArticleForStudio(st, dummyArticle, {
          customModel: createEchoModel(st),
          personaSlugs: ["ruby", "mateo"],
        });
        expect(res.studioType).toBe(st);
      }
    });

    it("throws on unknown studio type", async () => {
      await expect(
        parseArticleForStudio("unsupported_studio" as any, dummyArticle)
      ).rejects.toThrow("Unknown studio type: unsupported_studio");
    });

    it("rejects empty or whitespace articleContent with descriptive error", async () => {
      await expect(
        parseArticleForStudio("interview", "   ")
      ).rejects.toThrow("Article content cannot be empty");
    });

    it("assigns valid default personas when called without persona options", async () => {
      const mockEcho = new MockLanguageModelV4({
        doGenerate: async () => ({
          warnings: [],
          finishReason: { unified: "stop", raw: "stop" },
          usage: { inputTokens: { total: 5, noCache: 5, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 10, text: 10, reasoning: 0 } },
          content: [
            {
              type: "text",
              text: JSON.stringify({
                topic: "Default Persona Interview",
                turns: [
                  { text: "[serious] Host turn", cameraAngle: "host_solo", emotion: "[serious]", pacing: "Standard" },
                  { text: "[calm] Guest turn", cameraAngle: "guest_solo", emotion: "[calm]", pacing: "Standard" },
                ],
              }),
            },
          ],
        }),
      });

      const res = await parseArticleAsInterview(dummyArticle, { customModel: mockEcho });
      expect(res.turns[0].speakerId).toBe("ruby");
      expect(res.turns[1].speakerId).toBe("tomas");
    });
  });

  describe("8. Provider Failover & Options Forwarding", () => {
    it("forwards provider, model, companyId, and storyId to generateLlmObject", async () => {
      const generateSpy = vi.spyOn(aiSdkGateway, "generateLlmObject").mockResolvedValueOnce({
        object: {
          title: "Failover Podcast Episode",
          lines: [
            { id: "line-1", speakerId: "ruby", text: "Testing failover.", language: "en", pacing: "standard" },
          ],
        },
        providerUsed: "ollama",
        modelUsed: "qwen3.5:9b",
      });

      const result = await parseArticleAsPodcast(dummyArticle, {
        provider: "ollama",
        model: "qwen3.5:9b",
        companyId: "org-acme-corp",
        storyId: "story-uuid-789",
        allowFallback: false,
      });

      expect(result.studioType).toBe("podcast");
      expect(result.title).toBe("Failover Podcast Episode");
      expect(generateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "ollama",
          model: "qwen3.5:9b",
          companyId: "org-acme-corp",
          storyId: "story-uuid-789",
          allowFallback: false,
        })
      );

      generateSpy.mockRestore();
    });

    it("handles Gemini failure by seamlessly falling back to Ollama", async () => {
      const gatewaySpy = vi.spyOn(aiSdkGateway, "generateLlmObject").mockImplementation(async (opts) => {
        if (opts.provider === "gemini" && opts.allowFallback !== false) {
          return {
            object: {
              topic: "Ollama Fallback Debate",
              participantCount: 2,
              speakers: [
                { id: "ruby", name: "Ruby", role: "Host", stance: "PRO", location: "NYC" },
                { id: "tomas", name: "Tomas", role: "Guest", stance: "CON", location: "SF" },
              ],
              turns: [
                {
                  id: "turn-1",
                  speakerId: "ruby",
                  speakerName: "Ruby",
                  stance: "PRO",
                  text: "[serious] Welcome from Ollama fallback.",
                  emotion: "[serious]",
                  cameraCue: "desk_master",
                  roundName: "OPENING",
                },
              ],
            },
            providerUsed: "ollama",
            modelUsed: "qwen3.5:9b",
          };
        }
        throw new Error("Primary failed");
      });

      const result = await parseArticleForStudio("debate", dummyArticle, {
        provider: "gemini",
        allowFallback: true,
      });

      expect(result.studioType).toBe("debate");
      expect((result as any).topic).toBe("Ollama Fallback Debate");
      gatewaySpy.mockRestore();
    });

    it("handles Ollama failure by seamlessly falling back to Gemini", async () => {
      const gatewaySpy = vi.spyOn(aiSdkGateway, "generateLlmObject").mockImplementation(async (opts) => {
        if (opts.provider === "ollama" && opts.allowFallback !== false) {
          return {
            object: {
              streamTitle: "Gemini Fallback VTuber",
              reactionMoments: [
                { text: "Gemini fallback live reaction!", reaction: "[excited]", chatLine: "Nice fallback", timestamp: 0 },
              ],
            },
            providerUsed: "gemini",
            modelUsed: "gemini-2.5-flash",
          };
        }
        throw new Error("Primary failed");
      });

      const result = await parseArticleForStudio("vtuber", dummyArticle, {
        provider: "ollama",
        allowFallback: true,
      });

      expect(result.studioType).toBe("vtuber");
      expect((result as any).streamTitle).toBe("Gemini Fallback VTuber");
      gatewaySpy.mockRestore();
    });
  });
});
