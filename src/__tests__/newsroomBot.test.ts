/**
 * src/__tests__/newsroomBot.test.ts
 *
 * Comprehensive Vitest test suite for Vercel Chat SDK Multi-Platform Newsroom Bot.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getConfiguredBotPlatforms,
  parseApprovalChannels,
  buildStoryApprovalCard,
  buildBulletinApprovalCard,
  createNewsroomBot,
  getNewsroomBot,
  resetNewsroomBotForTests,
  broadcastStoryApprovalCard,
  broadcastBulletinApprovalCard,
  handleApproveAction,
  handleRejectAction,
  handleEditAction,
  handleHeadlineModalSubmit,
  handleNewsroomSlashCommand,
  handleMentionOrSubscribedMessage,
  NEWSROOM_BOT_SYSTEM_PROMPT,
} from "@/lib/bot/newsroomBot";
import { synthesizeHourlyBulletin } from "@/lib/autonomous/bulletinBotEngine";
import { POST as slackWebhookPOST } from "@/app/api/webhooks/slack/route";
import { POST as discordWebhookPOST } from "@/app/api/webhooks/discord/route";
import { POST as telegramWebhookPOST } from "@/app/api/webhooks/telegram/route";
import { GET as notifyApprovalGET, POST as notifyApprovalPOST } from "@/app/api/bot/notify-approval/route";
import { prisma } from "@/lib/prisma";
import { streamLlmText } from "@/lib/llm/aiSdkGateway";

// -----------------------------------------------------------------------------
// Mocks
// -----------------------------------------------------------------------------

vi.mock("@/lib/prisma", () => ({
  prisma: {
    story: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    script: {
      updateMany: vi.fn(),
    },
    generationJob: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  streamLlmText: vi.fn(),
  generateLlmObject: vi.fn(),
}));

vi.mock("@/lib/ai/editorialTools", () => ({
  createEditorialTools: vi.fn(() => ({})),
}));

vi.mock("@/lib/adminAuth", () => ({
  requireAdmin: vi.fn().mockResolvedValue({ ok: true, userId: "admin_test_123" }),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    after: vi.fn((task: () => unknown) => {
      if (typeof task === "function") task();
    }),
  };
});

describe("Newsroom Bot — Configuration & Platforms", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_SIGNING_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.DISCORD_PUBLIC_KEY;
    delete process.env.DISCORD_APPLICATION_ID;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
    resetNewsroomBotForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetNewsroomBotForTests();
  });

  it("identifies 0 configured platforms when environment is empty", () => {
    const platforms = getConfiguredBotPlatforms({});
    expect(platforms).toEqual([]);
  });

  it("identifies Slack when both token and signing secret are present", () => {
    const platforms = getConfiguredBotPlatforms({
      SLACK_BOT_TOKEN: "xoxb-test",
      SLACK_SIGNING_SECRET: "secret-test",
    });
    expect(platforms).toEqual(["slack"]);
  });

  it("does not identify Slack if signing secret is missing", () => {
    const platforms = getConfiguredBotPlatforms({
      SLACK_BOT_TOKEN: "xoxb-test",
    });
    expect(platforms).toEqual([]);
  });

  it("identifies Discord when bot token is present", () => {
    const platforms = getConfiguredBotPlatforms({
      DISCORD_BOT_TOKEN: "discord-bot-token",
    });
    expect(platforms).toEqual(["discord"]);
  });

  it("identifies Telegram when bot token is present", () => {
    const platforms = getConfiguredBotPlatforms({
      TELEGRAM_BOT_TOKEN: "telegram-bot-token",
    });
    expect(platforms).toEqual(["telegram"]);
  });

  it("identifies all 3 platforms when all credentials exist", () => {
    const platforms = getConfiguredBotPlatforms({
      SLACK_BOT_TOKEN: "xoxb-test",
      SLACK_SIGNING_SECRET: "secret-test",
      DISCORD_BOT_TOKEN: "discord-bot-token",
      TELEGRAM_BOT_TOKEN: "telegram-bot-token",
    });
    expect(platforms).toEqual(["slack", "discord", "telegram"]);
  });

  it("parses comma-separated approval channels cleanly", () => {
    expect(parseApprovalChannels("")).toEqual([]);
    expect(parseApprovalChannels(undefined)).toEqual([]);
    expect(
      parseApprovalChannels(
        "slack:C012345,  discord:987:654 , telegram:-1001234567, , "
      )
    ).toEqual(["slack:C012345", "discord:987:654", "telegram:-1001234567"]);
  });

  it("creates a Chat instance cleanly with 0 platforms without throwing", () => {
    const bot = createNewsroomBot();
    expect(bot).toBeDefined();
    expect(typeof bot.onAction).toBe("function");
  });

  it("reuses singleton in getNewsroomBot unless platform env changes", () => {
    const bot1 = getNewsroomBot();
    const bot2 = getNewsroomBot();
    expect(bot1).toBe(bot2);

    process.env.DISCORD_BOT_TOKEN = "test-discord-token";
    const bot3 = getNewsroomBot();
    expect(bot3).not.toBe(bot1);
  });
});

describe("Newsroom Bot — Card Construction & Telegram/Discord limits", () => {
  it("builds a rich StoryApprovalCard with compact button payloads (<= 64 bytes)", () => {
    const storyId = "cuid_story_1234567890";
    const card = buildStoryApprovalCard(
      {
        id: storyId,
        title: "Test Story Title",
        headline: "Breaking: AI Model Update",
        status: "SCRIPTED",
        category: "tech_ai",
        personaId: "ruby",
        segmentCount: 3,
      },
      "https://newsstudio.test"
    );

    expect(card.type).toBe("card");
    expect(card.title).toBe("Breaking: AI Model Update (Test Story Title)");

    // Inspect Action buttons
    const actionsElem = card.children?.find((c) => c.type === "actions") as
      | { type: "actions"; children: Array<{ type: string; id?: string; value?: string; url?: string }> }
      | undefined;
    expect(actionsElem).toBeDefined();
    expect(actionsElem?.children.length).toBe(4);

    const approveBtn = actionsElem?.children.find((b) => b.id === "ns_approve");
    const rejectBtn = actionsElem?.children.find((b) => b.id === "ns_reject");
    const editBtn = actionsElem?.children.find((b) => b.id === "ns_edit");
    const linkBtn = actionsElem?.children.find((b) => b.type === "link-button");

    expect(approveBtn).toBeDefined();
    expect(rejectBtn).toBeDefined();
    expect(editBtn).toBeDefined();
    expect(linkBtn?.url).toBe("https://newsstudio.test/editor/cuid_story_1234567890");

    // CRITICAL: Ensure button ID + value are within Telegram 64-byte callback_data limits
    for (const btn of [approveBtn, rejectBtn, editBtn]) {
      if (btn?.id && btn?.value) {
        const payloadLength = new TextEncoder().encode(`${btn.id}:${btn.value}`).length;
        expect(payloadLength).toBeLessThanOrEqual(64);
      }
    }
  });

  it("builds a rich BulletinApprovalCard with scene previews and valid action payloads", () => {
    const storyId = "bulletin_story_abc123";
    const card = buildBulletinApprovalCard(storyId, {
      bulletinTitle: "Global Tech Briefing",
      edition: "Hourly Tech • 14:00 UTC",
      estimatedDurationSeconds: 60,
      targetPersonaId: "ruby",
      scenes: [
        {
          index: 0,
          durationSeconds: 20,
          speaker: "Ruby Vance",
          personaId: "ruby",
          sceneStrategy: "ltx_full_portrait",
          text: "Urgent breaking tech news on semiconductor capacity expansion worldwide.",
          bRollKeyword: "chip factory",
          cameraCue: "cam1_wide",
          actionLoop: "state_breaking_alert",
        },
      ],
      socialMetadata: {
        title: "Global Tech Briefing • 60s",
        description: "Autonomous bulletin",
        hashtags: ["#Tech", "#AI"],
      },
    });

    expect(card.type).toBe("card");
    expect(card.title).toContain("Global Tech Briefing");
    const actionsElem = card.children?.find((c) => c.type === "actions") as
      | { type: "actions"; children: Array<{ id?: string; value?: string }> }
      | undefined;
    expect(actionsElem).toBeDefined();
    const approve = actionsElem?.children.find((b) => b.id === "ns_approve");
    expect(approve?.value).toBe(storyId);
  });
});

describe("Newsroom Bot — Interactive Handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handleApproveAction updates story to SCRIPTED and queues an audio GenerationJob", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const event = {
      actionId: "ns_approve",
      value: "story_123",
      user: { fullName: "Sarah Connor" },
      thread: { post: postMock },
    } as unknown as Parameters<typeof handleApproveAction>[0];

    vi.mocked(prisma.story.findUnique).mockResolvedValueOnce({
      id: "story_123",
      companyId: "comp_abc",
      status: "INGESTED",
      title: "Test Headline",
    } as unknown as Awaited<ReturnType<typeof prisma.story.findUnique>>);

    vi.mocked(prisma.generationJob.findFirst).mockResolvedValueOnce(null);

    await handleApproveAction(event);

    expect(prisma.story.update).toHaveBeenCalledWith({
      where: { id: "story_123" },
      data: { status: "SCRIPTED", approvalStatus: "approved" },
    });

    expect(prisma.generationJob.create).toHaveBeenCalledWith({
      data: {
        storyId: "story_123",
        type: "audio",
        status: "QUEUED",
        companyId: "comp_abc",
      },
    });

    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("approved by Sarah Connor")
    );
  });

  it("handleApproveAction skips job creation if one is already queued", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const event = {
      actionId: "ns_approve",
      value: "story_123",
      user: { fullName: "Sarah Connor" },
      thread: { post: postMock },
    } as unknown as Parameters<typeof handleApproveAction>[0];

    vi.mocked(prisma.story.findUnique).mockResolvedValueOnce({
      id: "story_123",
      companyId: "comp_abc",
      status: "INGESTED",
    } as unknown as Awaited<ReturnType<typeof prisma.story.findUnique>>);

    vi.mocked(prisma.generationJob.findFirst).mockResolvedValueOnce({
      id: "job_existing_1",
    } as unknown as Awaited<ReturnType<typeof prisma.generationJob.findFirst>>);

    await handleApproveAction(event);

    expect(prisma.generationJob.create).not.toHaveBeenCalled();
    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("already in progress")
    );
  });

  it("handleRejectAction marks story as FAILED and notifies thread", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const event = {
      actionId: "ns_reject",
      value: "story_123",
      user: { userName: "editor_dan" },
      thread: { post: postMock },
    } as unknown as Parameters<typeof handleRejectAction>[0];

    vi.mocked(prisma.story.findUnique).mockResolvedValueOnce({
      id: "story_123",
    } as unknown as Awaited<ReturnType<typeof prisma.story.findUnique>>);

    await handleRejectAction(event);

    expect(prisma.story.update).toHaveBeenCalledWith({
      where: { id: "story_123" },
      data: { status: "FAILED", approvalStatus: "rejected" },
    });
    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("rejected by editor_dan")
    );
  });

  it("handleEditAction opens a Modal or falls back to slash command when unsupported", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const openModalMock = vi.fn().mockResolvedValue(undefined); // Simulating Telegram/Discord non-modal adapter

    const event = {
      actionId: "ns_edit",
      value: "story_123",
      adapter: { name: "telegram" },
      openModal: openModalMock,
      thread: { post: postMock },
    } as unknown as Parameters<typeof handleEditAction>[0];

    await handleEditAction(event);

    expect(openModalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "modal",
        callbackId: "ns_headline_modal",
      })
    );

    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("/newsroom headline story_123")
    );
  });

  it("handleHeadlineModalSubmit updates story and script, validating inputs", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const event = {
      callbackId: "ns_headline_modal",
      privateMetadata: "story_123",
      values: { headline: "Revised Global Market Surge" },
      relatedThread: { post: postMock },
    } as unknown as Parameters<typeof handleHeadlineModalSubmit>[0];

    vi.mocked(prisma.story.findUnique).mockResolvedValueOnce({
      id: "story_123",
    } as unknown as Awaited<ReturnType<typeof prisma.story.findUnique>>);

    const res = await handleHeadlineModalSubmit(event);
    expect(res).toBeUndefined();

    expect(prisma.story.update).toHaveBeenCalledWith({
      where: { id: "story_123" },
      data: { title: "Revised Global Market Surge" },
    });

    expect(prisma.script.updateMany).toHaveBeenCalledWith({
      where: { storyId: "story_123" },
      data: { headline: "Revised Global Market Surge" },
    });

    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("Revised Global Market Surge")
    );
  });

  it("handleHeadlineModalSubmit rejects empty headline with errors response", async () => {
    const event = {
      callbackId: "ns_headline_modal",
      privateMetadata: "story_123",
      values: { headline: "   " },
    } as unknown as Parameters<typeof handleHeadlineModalSubmit>[0];

    const res = await handleHeadlineModalSubmit(event);
    expect(res).toEqual({
      action: "errors",
      errors: { headline: "Headline cannot be empty." },
    });
    expect(prisma.story.update).not.toHaveBeenCalled();
  });

  it("handleNewsroomSlashCommand handles 'status' subcommand", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const event = {
      command: "/newsroom",
      text: "status",
      channel: { post: postMock },
    } as unknown as Parameters<typeof handleNewsroomSlashCommand>[0];

    vi.mocked(prisma.story.count)
      .mockResolvedValueOnce(42) // total
      .mockResolvedValueOnce(10) // scripted
      .mockResolvedValueOnce(5)  // in_production
      .mockResolvedValueOnce(27); // completed

    await handleNewsroomSlashCommand(event);

    expect(postMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Newsroom Broadcast Pipeline Status",
      })
    );
  });

  it("handleNewsroomSlashCommand handles 'pending' subcommand", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const event = {
      command: "/newsroom",
      text: "pending",
      channel: { post: postMock },
    } as unknown as Parameters<typeof handleNewsroomSlashCommand>[0];

    vi.mocked(prisma.story.findMany).mockResolvedValueOnce([
      {
        id: "story_pen_1",
        title: "Pending Story 1",
        status: "SCRIPTED",
        category: "tech",
        script: { headline: "Pending 1 Headline", _count: { segments: 3 } },
      },
    ] as unknown as Awaited<ReturnType<typeof prisma.story.findMany>>);

    await handleNewsroomSlashCommand(event);

    expect(postMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Pending 1 Headline (Pending Story 1)",
      })
    );
  });

  it("handleNewsroomSlashCommand handles 'headline' non-modal command", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const event = {
      command: "/newsroom",
      text: "headline story_456 Brand New Headline via CLI",
      channel: { post: postMock },
    } as unknown as Parameters<typeof handleNewsroomSlashCommand>[0];

    vi.mocked(prisma.story.findUnique).mockResolvedValueOnce({
      id: "story_456",
    } as unknown as Awaited<ReturnType<typeof prisma.story.findUnique>>);

    await handleNewsroomSlashCommand(event);

    expect(prisma.story.update).toHaveBeenCalledWith({
      where: { id: "story_456" },
      data: { title: "Brand New Headline via CLI" },
    });
    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("Brand New Headline via CLI")
    );
  });

  it("handleMentionOrSubscribedMessage invokes streamLlmText and posts stream to thread", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const subscribeMock = vi.fn().mockResolvedValue({});

    const thread = {
      subscribe: subscribeMock,
      post: postMock,
    } as unknown as Parameters<typeof handleMentionOrSubscribedMessage>[0];

    const message = {
      text: "Check pronunciation of Kyoto and summarize wire articles on chips.",
    } as unknown as Parameters<typeof handleMentionOrSubscribedMessage>[1];

    const fakeStream = (async function* () {
      yield "Pronunciation: KEE-oh-toh";
    })();

    vi.mocked(streamLlmText).mockResolvedValueOnce({
      fullStream: fakeStream,
    } as unknown as Awaited<ReturnType<typeof streamLlmText>>);

    await handleMentionOrSubscribedMessage(thread, message);

    expect(subscribeMock).toHaveBeenCalled();
    expect(streamLlmText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: NEWSROOM_BOT_SYSTEM_PROMPT,
        prompt: message.text,
        tier: "structured",
        maxSteps: 4,
      })
    );
    expect(postMock).toHaveBeenCalledWith(fakeStream);
  });
});

describe("Newsroom Bot — Broadcasting", () => {
  it("skips channels whose platform is not configured without throwing", async () => {
    const result = await broadcastStoryApprovalCard(
      { id: "story_123", title: "Test" },
      ["slack:C123", "discord:456"]
    );

    expect(result.sent).toEqual([]);
    expect(result.skipped).toEqual(["slack:C123", "discord:456"]);
    expect(result.errors).toEqual([]);
  });

  it("records error if channel.post throws without breaking other channels", async () => {
    const mockChannelPost = vi.fn().mockRejectedValue(new Error("API rate limit"));
    const mockBot = {
      channel: vi.fn(() => ({ post: mockChannelPost })),
    } as unknown as ReturnType<typeof getNewsroomBot>;

    const originalEnv = process.env.DISCORD_BOT_TOKEN;
    process.env.DISCORD_BOT_TOKEN = "disc_token";

    const result = await broadcastStoryApprovalCard(
      { id: "story_123", title: "Test" },
      ["discord:456"],
      undefined,
      mockBot
    );

    expect(result.sent).toEqual([]);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]).toContain("API rate limit");

    process.env.DISCORD_BOT_TOKEN = originalEnv;
  });
});

describe("Autonomous Bulletin Engine — Chat SDK Notification Hook", () => {
  it("synthesizeHourlyBulletin broadcasts bulletin card when requested", async () => {
    const originalEnv = process.env.DISCORD_BOT_TOKEN;
    process.env.DISCORD_BOT_TOKEN = "disc_token";

    const bulletin = await synthesizeHourlyBulletin(
      [
        {
          topic: "AI Chips",
          category: "tech_ai",
          headline: "Next Gen Neural Compute Released",
          sourceArticles: [{ id: "art_1", title: "Chips Launch" }],
          summary: "New chip boasts 2x performance.",
        },
      ],
      {
        storyId: "story_bulletin_1",
        notifyApprovalChannels: true,
        approvalChannels: ["discord:789"],
      }
    );

    expect(bulletin.bulletinTitle).toBeDefined();
    process.env.DISCORD_BOT_TOKEN = originalEnv;
  });
});

describe("Webhook Routes — /api/webhooks/{slack,discord,telegram}", () => {
  beforeEach(() => {
    delete process.env.SLACK_BOT_TOKEN;
    delete process.env.SLACK_SIGNING_SECRET;
    delete process.env.DISCORD_BOT_TOKEN;
    delete process.env.TELEGRAM_BOT_TOKEN;
    resetNewsroomBotForTests();
  });

  it("POST /api/webhooks/slack returns 503 when adapter is unconfigured", async () => {
    const req = new Request("http://localhost:3000/api/webhooks/slack", { method: "POST" });
    const res = await slackWebhookPOST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("Slack bot adapter is not configured");
  });

  it("POST /api/webhooks/discord returns 503 when adapter is unconfigured", async () => {
    const req = new Request("http://localhost:3000/api/webhooks/discord", { method: "POST" });
    const res = await discordWebhookPOST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("Discord bot adapter is not configured");
  });

  it("POST /api/webhooks/telegram returns 503 when adapter is unconfigured", async () => {
    const req = new Request("http://localhost:3000/api/webhooks/telegram", { method: "POST" });
    const res = await telegramWebhookPOST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toContain("Telegram bot adapter is not configured");
  });
});

describe("Admin Notification Endpoint — /api/bot/notify-approval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/bot/notify-approval returns configured platforms and channels", async () => {
    const req = { nextUrl: { pathname: "/api/bot/notify-approval" }, headers: new Headers() } as unknown as Parameters<typeof notifyApprovalGET>[0];
    const res = await notifyApprovalGET(req, {} as Parameters<typeof notifyApprovalGET>[1]);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.configuredPlatforms)).toBe(true);
    expect(Array.isArray(data.approvalChannels)).toBe(true);
  });

  it("POST /api/bot/notify-approval rejects missing storyId with 400", async () => {
    const req = {
      json: vi.fn().mockResolvedValue({}),
      nextUrl: { pathname: "/api/bot/notify-approval" },
      headers: new Headers(),
    } as unknown as Parameters<typeof notifyApprovalPOST>[0];

    const res = await notifyApprovalPOST(req, {} as Parameters<typeof notifyApprovalPOST>[1]);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Missing required field: storyId");
  });

  it("POST /api/bot/notify-approval returns 404 if story does not exist", async () => {
    vi.mocked(prisma.story.findUnique).mockResolvedValueOnce(null);

    const req = {
      json: vi.fn().mockResolvedValue({ storyId: "nonexistent_story" }),
      nextUrl: { pathname: "/api/bot/notify-approval" },
      headers: new Headers(),
    } as unknown as Parameters<typeof notifyApprovalPOST>[0];

    const res = await notifyApprovalPOST(req, {} as Parameters<typeof notifyApprovalPOST>[1]);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain("Story 'nonexistent_story' not found");
  });

  it("POST /api/bot/notify-approval broadcasts story and returns success result", async () => {
    vi.mocked(prisma.story.findUnique).mockResolvedValueOnce({
      id: "story_notify_ok",
      title: "Story Approved Broadcaster",
      status: "SCRIPTED",
      category: "tech",
      companyId: "comp_1",
      script: { headline: "Approved Headline", _count: { segments: 2 } },
    } as unknown as Awaited<ReturnType<typeof prisma.story.findUnique>>);

    const req = {
      json: vi.fn().mockResolvedValue({ storyId: "story_notify_ok", channels: ["slack:C123"] }),
      nextUrl: { pathname: "/api/bot/notify-approval" },
      headers: new Headers(),
    } as unknown as Parameters<typeof notifyApprovalPOST>[0];

    const res = await notifyApprovalPOST(req, {} as Parameters<typeof notifyApprovalPOST>[1]);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.sent)).toBe(true);
  });
});

describe("Newsroom Bot — Advanced Edge Cases & Delegation", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
    resetNewsroomBotForTests();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    resetNewsroomBotForTests();
  });

  it("createNewsroomBot accepts custom Adapter overrides for all platforms without throwing", () => {
    const mockSlackAdapter = {
      name: "slack",
      postMessage: vi.fn(),
      decodeThreadId: vi.fn(),
      channelIdFromThreadId: vi.fn(),
    };
    const mockDiscordAdapter = {
      name: "discord",
      postMessage: vi.fn(),
      decodeThreadId: vi.fn(),
      channelIdFromThreadId: vi.fn(),
    };
    const mockTelegramAdapter = {
      name: "telegram",
      postMessage: vi.fn(),
      decodeThreadId: vi.fn(),
      channelIdFromThreadId: vi.fn(),
    };

    const bot = createNewsroomBot({
      userName: "custom-newsroom-bot",
      logger: "silent",
      slack: mockSlackAdapter as any,
      discord: mockDiscordAdapter as any,
      telegram: mockTelegramAdapter as any,
    });

    expect(bot).toBeDefined();
  });

  it("POST /api/webhooks/slack delegates to bot.webhooks.slack when configured", async () => {
    process.env.SLACK_BOT_TOKEN = "xoxb-valid";
    process.env.SLACK_SIGNING_SECRET = "signing-secret";
    const bot = getNewsroomBot();

    const mockResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    (bot.webhooks as any).slack = vi.fn().mockResolvedValue(mockResponse);

    const req = new Request("http://localhost:3000/api/webhooks/slack", { method: "POST" });
    const res = await slackWebhookPOST(req);

    expect((bot.webhooks as any).slack).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("POST /api/webhooks/discord delegates to bot.webhooks.discord when configured", async () => {
    process.env.DISCORD_BOT_TOKEN = "disc-valid";
    process.env.DISCORD_PUBLIC_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const bot = getNewsroomBot();

    const mockResponse = new Response(JSON.stringify({ type: 1 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    (bot.webhooks as any).discord = vi.fn().mockResolvedValue(mockResponse);

    const req = new Request("http://localhost:3000/api/webhooks/discord", { method: "POST" });
    const res = await discordWebhookPOST(req);

    expect((bot.webhooks as any).discord).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("POST /api/webhooks/telegram delegates to bot.webhooks.telegram when configured", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "tele-valid";
    const bot = getNewsroomBot();

    const mockResponse = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
    (bot.webhooks as any).telegram = vi.fn().mockResolvedValue(mockResponse);

    const req = new Request("http://localhost:3000/api/webhooks/telegram", { method: "POST" });
    const res = await telegramWebhookPOST(req);

    expect((bot.webhooks as any).telegram).toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("handleApproveAction reports error when storyId is missing", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const event = {
      actionId: "ns_approve",
      value: "",
      user: { fullName: "Editor" },
      thread: { post: postMock },
    } as unknown as Parameters<typeof handleApproveAction>[0];

    await handleApproveAction(event);
    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("Missing story ID in approval action payload")
    );
  });

  it("handleApproveAction reports error when story is not found", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const event = {
      actionId: "ns_approve",
      value: "story_missing",
      user: { fullName: "Editor" },
      thread: { post: postMock },
    } as unknown as Parameters<typeof handleApproveAction>[0];

    vi.mocked(prisma.story.findUnique).mockResolvedValueOnce(null);

    await handleApproveAction(event);
    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("Story `story_missing` not found")
    );
  });

  it("handleRejectAction reports error when storyId is missing", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const event = {
      actionId: "ns_reject",
      value: "   ",
      user: { fullName: "Editor" },
      thread: { post: postMock },
    } as unknown as Parameters<typeof handleRejectAction>[0];

    await handleRejectAction(event);
    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("Missing story ID in rejection action payload")
    );
  });

  it("handleHeadlineModalSubmit reports error if story is not found in database", async () => {
    const event = {
      callbackId: "ns_headline_modal",
      privateMetadata: "story_missing",
      values: { headline: "Updated Headline" },
    } as unknown as Parameters<typeof handleHeadlineModalSubmit>[0];

    vi.mocked(prisma.story.findUnique).mockResolvedValueOnce(null);

    const res = await handleHeadlineModalSubmit(event);
    expect(res).toEqual({
      action: "errors",
      errors: { headline: "Story 'story_missing' not found." },
    });
  });

  it("handleHeadlineModalSubmit reports error if storyId is missing from privateMetadata", async () => {
    const event = {
      callbackId: "ns_headline_modal",
      privateMetadata: "  ",
      values: { headline: "Updated Headline" },
    } as unknown as Parameters<typeof handleHeadlineModalSubmit>[0];

    const res = await handleHeadlineModalSubmit(event);
    expect(res).toEqual({
      action: "errors",
      errors: { headline: "Missing story ID in modal context." },
    });
  });

  it("handleNewsroomSlashCommand reports error on malformed headline syntax", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const event = {
      command: "/newsroom",
      text: "headline",
      channel: { post: postMock },
    } as unknown as Parameters<typeof handleNewsroomSlashCommand>[0];

    await handleNewsroomSlashCommand(event);
    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("Invalid headline command syntax")
    );
  });

  it("handleNewsroomSlashCommand reports error if headline target story is not in database", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const event = {
      command: "/newsroom",
      text: "headline story_not_in_db New Title",
      channel: { post: postMock },
    } as unknown as Parameters<typeof handleNewsroomSlashCommand>[0];

    vi.mocked(prisma.story.findUnique).mockResolvedValueOnce(null);

    await handleNewsroomSlashCommand(event);
    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("Story `story_not_in_db` not found")
    );
  });

  it("handleMentionOrSubscribedMessage sends greeting when text is empty", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const subscribeMock = vi.fn().mockResolvedValue({});

    const thread = {
      subscribe: subscribeMock,
      post: postMock,
    } as unknown as Parameters<typeof handleMentionOrSubscribedMessage>[0];

    const message = {
      text: "   ",
    } as unknown as Parameters<typeof handleMentionOrSubscribedMessage>[1];

    await handleMentionOrSubscribedMessage(thread, message);
    expect(subscribeMock).toHaveBeenCalled();
    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("Hello! I'm your Newsroom AI Assistant")
    );
  });

  it("broadcastBulletinApprovalCard returns empty result if no channels configured", async () => {
    const result = await broadcastBulletinApprovalCard(
      "story_123",
      {
        bulletinTitle: "Test",
        edition: "Briefing",
        estimatedDurationSeconds: 60,
        targetPersonaId: "ruby",
        scenes: [],
        socialMetadata: { title: "Title", description: "Desc", hashtags: [] },
      },
      []
    );

    expect(result.sent).toEqual([]);
    expect(result.skipped).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("createNewsroomBot omits Slack cleanly when overrides.slack is missing signingSecret", () => {
    const bot = createNewsroomBot({
      slack: { botToken: "xoxb-incomplete-token" },
    });
    expect((bot.webhooks as Record<string, unknown>).slack).toBeUndefined();
  });

  it("createNewsroomBot registers Slack when overrides.slack has both token and signingSecret", () => {
    const bot = createNewsroomBot({
      slack: { botToken: "xoxb-complete-token", signingSecret: "secret123" },
    });
    expect(typeof (bot.webhooks as Record<string, unknown>).slack).toBe("function");
  });

  it("createNewsroomBot registers Discord without throwing when overrides.discord has token only", () => {
    const bot = createNewsroomBot({
      discord: { botToken: "disc-valid-token" },
    });
    expect(typeof (bot.webhooks as Record<string, unknown>).discord).toBe("function");
  });

  it("broadcastStoryApprovalCard sends card via custom botInstance even when process.env is empty", async () => {
    const mockPost = vi.fn().mockResolvedValue({});
    const mockSlackAdapter = {
      name: "slack",
      postMessage: mockPost,
      decodeThreadId: vi.fn(),
      channelIdFromThreadId: vi.fn(),
    };

    const customBot = createNewsroomBot({
      slack: mockSlackAdapter as any,
    });

    const result = await broadcastStoryApprovalCard(
      { id: "story_custom_bot", title: "Test Custom Bot Story" },
      ["slack:C999"],
      undefined,
      customBot
    );

    expect(result.sent).toEqual(["slack:C999"]);
    expect(result.skipped).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("getNewsroomBot rebuilds singleton when DISCORD_APPLICATION_ID changes", () => {
    process.env.DISCORD_BOT_TOKEN = "test-token";
    process.env.DISCORD_APPLICATION_ID = "app-id-1";
    const bot1 = getNewsroomBot();

    process.env.DISCORD_APPLICATION_ID = "app-id-2";
    const bot2 = getNewsroomBot();

    expect(bot1).not.toBe(bot2);
  });

  it("handleApproveAction catches database errors and posts user-friendly notification", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const event = {
      actionId: "ns_approve",
      value: "story_db_err",
      user: { fullName: "Producer" },
      thread: { post: postMock },
    } as unknown as Parameters<typeof handleApproveAction>[0];

    vi.mocked(prisma.story.findUnique).mockRejectedValueOnce(new Error("Database connection pool exhausted"));

    await handleApproveAction(event);

    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("Error processing approval for `story_db_err`")
    );
  });

  it("handleRejectAction catches database errors and posts user-friendly notification", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const event = {
      actionId: "ns_reject",
      value: "story_db_err",
      user: { fullName: "Producer" },
      thread: { post: postMock },
    } as unknown as Parameters<typeof handleRejectAction>[0];

    vi.mocked(prisma.story.findUnique).mockRejectedValueOnce(new Error("Prisma transaction aborted"));

    await handleRejectAction(event);

    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("Error processing rejection for `story_db_err`")
    );
  });

  it("handleNewsroomSlashCommand catches database errors and posts user-friendly notification", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const event = {
      command: "/newsroom",
      text: "status",
      channel: { post: postMock },
    } as unknown as Parameters<typeof handleNewsroomSlashCommand>[0];

    vi.mocked(prisma.story.count).mockRejectedValueOnce(new Error("Database read timeout"));

    await handleNewsroomSlashCommand(event);

    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("An error occurred while executing `/newsroom status`")
    );
  });

  it("handleMentionOrSubscribedMessage catches stream errors and posts error message", async () => {
    const postMock = vi.fn().mockResolvedValue({});
    const subscribeMock = vi.fn().mockResolvedValue({});

    const thread = {
      subscribe: subscribeMock,
      post: postMock,
    } as unknown as Parameters<typeof handleMentionOrSubscribedMessage>[0];

    const message = {
      text: "Trigger a failure",
    } as unknown as Parameters<typeof handleMentionOrSubscribedMessage>[1];

    vi.mocked(streamLlmText).mockRejectedValueOnce(new Error("LLM Rate limit"));

    await handleMentionOrSubscribedMessage(thread, message);

    expect(postMock).toHaveBeenCalledWith(
      expect.stringContaining("I encountered an error while processing your request")
    );
  });
});

