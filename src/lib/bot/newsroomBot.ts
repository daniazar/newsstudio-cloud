/**
 * src/lib/bot/newsroomBot.ts
 *
 * Multi-Platform Autonomous Newsroom Bot powered by Vercel Chat SDK v4.43.
 * Unifies Slack Block Kit, Discord Components/Embeds, and Telegram Bot API.
 *
 * Key Capabilities:
 * 1. Story & 60-Second Autonomous Bulletin approval cards with compact action IDs (<=64 bytes).
 * 2. Interactive action handlers (ns_approve, ns_reject, ns_edit modal with fallback).
 * 3. /newsroom slash commands (status, pending, headline, help).
 * 4. Multi-step @mention AI streaming with live editorial tools (fact-checking, phonetics, B-roll).
 */

import {
  Chat,
  Card,
  CardText,
  Fields,
  Field,
  Divider,
  Actions,
  Button,
  LinkButton,
  Modal,
  TextInput,
  type Adapter,
  type StateAdapter,
  type ActionEvent,
  type ModalSubmitEvent,
  type ModalResponse,
  type SlashCommandEvent,
  type Thread,
  type Message,
} from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createDiscordAdapter } from "@chat-adapter/discord";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createMemoryState } from "@chat-adapter/state-memory";
import { createIoRedisState, IoRedisStateAdapter } from "@chat-adapter/state-ioredis";
import type { Redis } from "ioredis";
import { getRedisClient } from "@/lib/cache/redisClient";

import { prisma } from "@/lib/prisma";
import { streamLlmText } from "@/lib/llm/aiSdkGateway";
import { createEditorialTools } from "@/lib/ai/editorialTools";
import type { AutonomousBulletinPayload } from "@/lib/autonomous/bulletinBotEngine";
import { createLogger, createChatSdkLogger, type ChatSdkLogger, type ChatLogLevel } from "@/lib/logger";

const log = createLogger({ module: "newsroomBot" });

export type BotPlatform = "slack" | "discord" | "telegram";

export interface StoryApprovalSummary {
  id: string;
  title?: string | null;
  headline?: string | null;
  status?: string | null;
  category?: string | null;
  personaId?: string | null;
  segmentCount?: number;
  segmentsCount?: number;
  companyId?: string | null;
  _count?: {
    segments?: number;
  };
}

export interface ResolvedBotState {
  state: StateAdapter;
  backend: "ioredis" | "memory";
}

type ChatSdkRedisClient = Extract<
  Parameters<typeof createIoRedisState>[0],
  { client: unknown }
>["client"];

export function resolveBotStateAdapter(config?: {
  stateAdapter?: StateAdapter;
  redisUrl?: string;
  redisClient?: Redis | null;
  logger?: ChatSdkLogger;
}): ResolvedBotState {
  if (config?.stateAdapter) {
    return {
      state: config.stateAdapter,
      backend: config.stateAdapter instanceof IoRedisStateAdapter ? "ioredis" : "memory",
    };
  }

  if (config?.redisClient) {
    return {
      state: createIoRedisState({
        client: config.redisClient as unknown as ChatSdkRedisClient,
        keyPrefix: "newsstudio:chat",
        logger: config.logger,
      }),
      backend: "ioredis",
    };
  }

  const url = (config?.redisUrl ?? process.env.REDIS_URL ?? "").trim();
  if (url) {
    try {
      const isCustomOverride = Boolean(config?.redisUrl && config.redisUrl !== process.env.REDIS_URL);
      if (!isCustomOverride) {
        const client = getRedisClient();
        if (client) {
          return {
            state: createIoRedisState({
              client: client as unknown as ChatSdkRedisClient,
              keyPrefix: "newsstudio:chat",
              logger: config?.logger,
            }),
            backend: "ioredis",
          };
        }
      }
      return {
        state: createIoRedisState({
          url,
          keyPrefix: "newsstudio:chat",
          logger: config?.logger,
        }),
        backend: "ioredis",
      };
    } catch (err) {
      log.warn(
        { err },
        "Failed to initialize Redis state adapter for Newsroom Bot; falling back to memory state"
      );
      return {
        state: createMemoryState(),
        backend: "memory",
      };
    }
  }

  return {
    state: createMemoryState(),
    backend: "memory",
  };
}

export type NewsroomBotRuntime = Chat & {
  stateBackend: "ioredis" | "memory";
};

export interface NewsroomBotConfig {
  slack?: Parameters<typeof createSlackAdapter>[0] | Adapter;
  discord?: Parameters<typeof createDiscordAdapter>[0] | Adapter;
  telegram?: Parameters<typeof createTelegramAdapter>[0] | Adapter;
  state?: StateAdapter;
  userName?: string;
  logger?: ChatLogLevel | ChatSdkLogger;
  baseUrl?: string;
  redisUrl?: string;
  redisClient?: Redis | null;
}

export interface BroadcastResult {
  sent: string[];
  skipped: string[];
  errors: string[];
}

export const NEWSROOM_BOT_SYSTEM_PROMPT = `You are Ruby Newsroom Bot, an autonomous AI newsroom producer and editorial assistant for Ruby NewsStudio.
Your role is to assist editors, journalists, and producers in managing broadcasts, reviewing scripts, verifying facts, researching wire reports, inspecting pronunciation glossaries, and validating visual B-roll keywords.

When asked questions:
1. Use your editorial tools (searchIngestedWireArticles, searchLiveBreakingWeb, lookupPronunciationGlossary, verifyStockBrollKeywords) to fetch live data from the newsroom wire, verify breaking claims on the live web, or inspect glossaries.
2. Provide concise, professional, television-broadcast-ready answers.
3. Keep answers formatted in clean markdown without preamble.`;

/**
 * Returns list of configured platforms based on presence of required credentials in environment.
 */
export function getConfiguredBotPlatforms(
  env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env
): BotPlatform[] {
  const platforms: BotPlatform[] = [];

  const slackToken = env.SLACK_BOT_TOKEN;
  const slackSecret = env.SLACK_SIGNING_SECRET;
  if (slackToken && slackSecret) {
    platforms.push("slack");
  }

  const discordToken = env.DISCORD_BOT_TOKEN;
  if (discordToken) {
    platforms.push("discord");
  }

  const telegramToken = env.TELEGRAM_BOT_TOKEN;
  if (telegramToken) {
    platforms.push("telegram");
  }

  return platforms;
}

/**
 * Parses comma-separated channel identifiers (e.g. "slack:C012345,discord:123:456,telegram:-100123456").
 */
export function parseApprovalChannels(raw?: string): string[] {
  if (!raw || typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

/**
 * Builds a rich cross-platform card for story approval with compact button IDs (<= 64 bytes).
 */
export function buildStoryApprovalCard(
  story: StoryApprovalSummary,
  appBaseUrl?: string
) {
  const baseUrl = (
    appBaseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.MAIN_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");

  const headline = story.headline || story.title || "Untitled Story";
  const displayTitle =
    story.title && story.title !== headline ? `${headline} (${story.title})` : headline;
  const count = story.segmentCount ?? story.segmentsCount ?? story._count?.segments ?? 0;

  return Card({
    title: displayTitle,
    subtitle: `Story Approval • ID: ${story.id}`,
    children: [
      Fields([
        Field({ label: "Status", value: story.status || "SCRIPTED" }),
        Field({ label: "Category", value: story.category || "General" }),
        Field({ label: "Persona", value: story.personaId || "ruby" }),
        Field({ label: "Segments", value: `${count} scenes` }),
      ]),
      Divider(),
      Actions([
        Button({
          id: "ns_approve",
          label: "Approve & Queue Render",
          style: "primary",
          value: story.id,
        }),
        Button({
          id: "ns_reject",
          label: "Reject Draft",
          style: "danger",
          value: story.id,
        }),
        Button({
          id: "ns_edit",
          label: "Edit Headline",
          actionType: "modal",
          value: story.id,
        }),
        LinkButton({
          url: `${baseUrl}/editor/${story.id}`,
          label: "Open in Studio",
        }),
      ]),
    ],
  });
}

/**
 * Builds a rich cross-platform card summarizing the 60-second autonomous 3-scene bulletin.
 */
export function buildBulletinApprovalCard(
  storyId: string,
  bulletin: AutonomousBulletinPayload,
  appBaseUrl?: string
) {
  const baseUrl = (
    appBaseUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.MAIN_APP_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");

  const scenePreviews = (bulletin.scenes || [])
    .map(
      (s, idx) =>
        `Scene ${idx + 1} (${s.durationSeconds || 20}s - ${s.speaker || "Ruby"}): ${(s.text || "").slice(0, 100)}...`
    )
    .join("\n");

  const hashtags = (bulletin.socialMetadata?.hashtags || []).join(" ") || "#BreakingNews";

  return Card({
    title: `⚡ Autonomous Bulletin: ${bulletin.bulletinTitle || "Breaking News"}`,
    subtitle: `${bulletin.edition || "Hourly Briefing"} • ${bulletin.estimatedDurationSeconds || 60}s`,
    children: [
      Fields([
        Field({ label: "Target Persona", value: bulletin.targetPersonaId || "ruby" }),
        Field({ label: "Scenes", value: `${bulletin.scenes?.length || 3} scenes` }),
        Field({
          label: "Social",
          value: bulletin.socialMetadata?.title || bulletin.bulletinTitle || "Live Bulletin",
        }),
        Field({ label: "Hashtags", value: hashtags }),
      ]),
      Divider(),
      CardText(scenePreviews || "No scene previews available."),
      Divider(),
      Actions([
        Button({
          id: "ns_approve",
          label: "Approve Bulletin",
          style: "primary",
          value: storyId,
        }),
        Button({
          id: "ns_reject",
          label: "Reject Bulletin",
          style: "danger",
          value: storyId,
        }),
        LinkButton({
          url: `${baseUrl}/editor/${storyId}`,
          label: "Open in Studio",
        }),
      ]),
    ],
  });
}

// Export Text alias for CardText per Chat SDK convention
export const Text = CardText;

/**
 * Helper to determine if an object is already a Chat SDK Adapter instance.
 */
function isAdapterInstance(obj: unknown): obj is Adapter {
  return (
    typeof obj === "object" &&
    obj !== null &&
    ("postMessage" in obj || "decodeThreadId" in obj || "channelIdFromThreadId" in obj)
  );
}

// -----------------------------------------------------------------------------
// Interactive Handlers (Exported for direct unit test verification)
// -----------------------------------------------------------------------------

export async function handleApproveAction(event: ActionEvent): Promise<void> {
  const storyId = event.value?.trim();
  if (!storyId) {
    await event.thread?.post("⚠️ Error: Missing story ID in approval action payload.");
    return;
  }

  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true, companyId: true, status: true, title: true },
    });

    if (!story) {
      await event.thread?.post(`⚠️ Story \`${storyId}\` not found in database.`);
      return;
    }

    await prisma.story.update({
      where: { id: storyId },
      data: {
        status: "SCRIPTED",
        approvalStatus: "approved",
      },
    });

    const existingJob = await prisma.generationJob.findFirst({
      where: {
        storyId,
        type: "audio",
        status: { in: ["QUEUED", "TTS_IN_PROGRESS", "IN_PROGRESS"] },
      },
    });

    let jobCreated = false;
    if (!existingJob) {
      await prisma.generationJob.create({
        data: {
          storyId,
          type: "audio",
          status: "QUEUED",
          companyId: story.companyId,
        },
      });
      jobCreated = true;
    }

    const userIdentifier = event.user?.fullName || event.user?.userName || "editor";
    const statusMsg = jobCreated
      ? `✅ Story \`${storyId}\` approved by ${userIdentifier}. Audio generation job queued!`
      : `✅ Story \`${storyId}\` approved by ${userIdentifier}. (Generation job already in progress)`;

    await event.thread?.post(statusMsg);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err, storyId, action: "ns_approve" }, `Error handling approval action for ${storyId}`);
    await event.thread?.post(`⚠️ Error processing approval for \`${storyId}\`: ${msg}`);
  }
}

export async function handleRejectAction(event: ActionEvent): Promise<void> {
  const storyId = event.value?.trim();
  if (!storyId) {
    await event.thread?.post("⚠️ Error: Missing story ID in rejection action payload.");
    return;
  }

  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true },
    });

    if (!story) {
      await event.thread?.post(`⚠️ Story \`${storyId}\` not found in database.`);
      return;
    }

    await prisma.story.update({
      where: { id: storyId },
      data: {
        status: "FAILED",
        approvalStatus: "rejected",
      },
    });

    const userIdentifier = event.user?.fullName || event.user?.userName || "editor";
    await event.thread?.post(`❌ Story \`${storyId}\` draft rejected by ${userIdentifier}.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err, storyId, action: "ns_reject" }, `Error handling rejection action for ${storyId}`);
    await event.thread?.post(`⚠️ Error processing rejection for \`${storyId}\`: ${msg}`);
  }
}

export async function handleEditAction(event: ActionEvent): Promise<void> {
  const storyId = event.value?.trim();
  if (!storyId) {
    await event.thread?.post("⚠️ Error: Missing story ID in edit action payload.");
    return;
  }

  const modal = Modal({
    callbackId: "ns_headline_modal",
    title: "Edit Headline",
    submitLabel: "Save Headline",
    closeLabel: "Cancel",
    privateMetadata: storyId,
    children: [
      TextInput({
        id: "headline",
        label: "Broadcast Headline",
        placeholder: "Enter revised broadcast headline...",
        maxLength: 240,
      }),
    ],
  });

  try {
    const modalRes =
      typeof event.openModal === "function" ? await event.openModal(modal) : undefined;
    if (!modalRes) {
      const platformName = event.adapter?.name || "this platform";
      await event.thread?.post(
        `⚠️ Modal dialogs are not supported on ${platformName}. Use the slash command instead:\n\`/newsroom headline ${storyId} <new headline>\``
      );
    }
  } catch {
    const platformName = event.adapter?.name || "this platform";
    await event.thread?.post(
      `⚠️ Modal dialogs are not supported on ${platformName}. Use the slash command instead:\n\`/newsroom headline ${storyId} <new headline>\``
    );
  }
}

export async function handleHeadlineModalSubmit(
  event: ModalSubmitEvent
): Promise<ModalResponse | void> {
  const storyId = event.privateMetadata?.trim();
  const rawHeadline = event.values?.headline;
  const headline = typeof rawHeadline === "string" ? rawHeadline.trim().slice(0, 240) : "";

  if (!storyId) {
    return {
      action: "errors",
      errors: { headline: "Missing story ID in modal context." },
    };
  }

  if (!headline) {
    return {
      action: "errors",
      errors: { headline: "Headline cannot be empty." },
    };
  }

  try {
    const story = await prisma.story.findUnique({
      where: { id: storyId },
      select: { id: true },
    });

    if (!story) {
      return {
        action: "errors",
        errors: { headline: `Story '${storyId}' not found.` },
      };
    }

    await prisma.story.update({
      where: { id: storyId },
      data: { title: headline },
    });

    await prisma.script.updateMany({
      where: { storyId },
      data: { headline },
    });

    const target =
      event.relatedThread ||
      (event as { relatedChannel?: { post: (msg: string) => Promise<unknown> } }).relatedChannel;

    if (target) {
      const sanitizedHeadline = headline.replace(/[*_`]/g, "");
      await target.post(
        `✏️ Broadcast headline updated for story \`${storyId}\`: **${sanitizedHeadline}**`
      );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err, storyId, action: "ns_headline_modal" }, `Modal submit error for story ${storyId}`);
    return {
      action: "errors",
      errors: { headline: `Failed to update headline: ${msg}` },
    };
  }
}

export async function handleNewsroomSlashCommand(event: SlashCommandEvent): Promise<void> {
  const rawText = (event.text || "").trim();
  const tokens = rawText.split(/\s+/).filter(Boolean);
  const subCommand = (tokens[0] || "status").toLowerCase();

  try {
    switch (subCommand) {
      case "status": {
        const [total, scripted, inProduction, completed] = await Promise.all([
          prisma.story.count(),
          prisma.story.count({ where: { status: "SCRIPTED" } }),
          prisma.story.count({ where: { status: "IN_PRODUCTION" } }),
          prisma.story.count({ where: { status: "COMPLETED" } }),
        ]);

        const card = Card({
          title: "Newsroom Broadcast Pipeline Status",
          subtitle: "Autonomous News Production Real-time Telemetry",
          children: [
            Fields([
              Field({ label: "Total Stories", value: String(total) }),
              Field({ label: "Scripted", value: String(scripted) }),
              Field({ label: "In Production", value: String(inProduction) }),
              Field({ label: "Completed", value: String(completed) }),
            ]),
            Divider(),
            CardText(
              "Use `/newsroom pending` to review and approve stories awaiting generation, or `/newsroom help` for all commands."
            ),
          ],
        });

        await event.channel.post(card);
        break;
      }

      case "pending": {
        const pendingStories = await prisma.story.findMany({
          where: {
            status: { in: ["SCRAPED", "SCRIPTED", "INGESTED"] },
          },
          orderBy: { createdAt: "desc" },
          take: 3,
          include: {
            script: {
              include: {
                _count: {
                  select: { segments: true },
                },
              },
            },
          },
        });

        if (pendingStories.length === 0) {
          await event.channel.post("ℹ️ No pending stories found awaiting approval.");
          return;
        }

        for (const story of pendingStories) {
          const card = buildStoryApprovalCard({
            id: story.id,
            title: story.title,
            headline: story.script?.headline || story.title,
            status: story.status,
            category: story.category,
            segmentCount: story.script?._count?.segments ?? 0,
            companyId: story.companyId,
          });
          await event.channel.post(card);
        }
        break;
      }

      case "headline": {
        const storyId = tokens[1];
        const newHeadline = tokens.slice(2).join(" ").trim().slice(0, 240);

        if (!storyId || !newHeadline) {
          await event.channel.post(
            "⚠️ Invalid headline command syntax.\n**Usage:** `/newsroom headline <storyId> <new headline>`"
          );
          return;
        }

        const story = await prisma.story.findUnique({
          where: { id: storyId },
          select: { id: true },
        });

        if (!story) {
          await event.channel.post(`⚠️ Story \`${storyId}\` not found in database.`);
          return;
        }

        await prisma.story.update({
          where: { id: storyId },
          data: { title: newHeadline },
        });

        await prisma.script.updateMany({
          where: { storyId },
          data: { headline: newHeadline },
        });

        const sanitized = newHeadline.replace(/[*_`]/g, "");
        await event.channel.post(
          `✏️ Broadcast headline updated for story \`${storyId}\`: **${sanitized}**`
        );
        break;
      }

      case "help":
      default: {
        const helpCard = Card({
          title: "Ruby Newsroom Bot Commands",
          subtitle: "Multi-Platform Autonomous Newsroom Assistant",
          children: [
            CardText("Available slash commands:"),
            Fields([
              Field({ label: "/newsroom status", value: "Show real-time broadcast and pipeline status" }),
              Field({
                label: "/newsroom pending",
                value: "Show up to 3 latest pending stories with approval buttons",
              }),
              Field({
                label: "/newsroom headline <id> <text>",
                value: "Update headline directly (for platforms without modals)",
              }),
              Field({ label: "/newsroom help", value: "Display this command directory" }),
            ]),
            Divider(),
            CardText(
              "💡 You can also @mention this bot with any research query, fact-check question, pronunciation check, or B-roll keyword verification."
            ),
          ],
        });

        await event.channel.post(helpCard);
        break;
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err, subCommand, action: "slash_command" }, `Error in /newsroom slash command '${subCommand}'`);
    await event.channel.post(`⚠️ An error occurred while executing \`/newsroom ${subCommand}\`: ${msg}`);
  }
}

export async function handleMentionOrSubscribedMessage(
  thread: Thread,
  message: Message
): Promise<void> {
  await thread.subscribe();

  const text = (message.text || "").trim();
  if (!text) {
    await thread.post(
      "Hello! I'm your Newsroom AI Assistant. Ask me to research stories, verify pronunciation phonetics, check visual B-roll keywords, or review pending scripts."
    );
    return;
  }

  try {
    const editorialTools = createEditorialTools();
    const streamResult = await streamLlmText({
      system: NEWSROOM_BOT_SYSTEM_PROMPT,
      prompt: text,
      tier: "structured",
      tools: editorialTools,
      maxSteps: 4,
    });

    await thread.post(streamResult.fullStream);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error({ err, action: "ai_stream" }, "AI stream failed");
    await thread.post(`⚠️ I encountered an error while processing your request: ${msg}`);
  }
}

// -----------------------------------------------------------------------------
// Bot Factory and Lifecycle
// -----------------------------------------------------------------------------

/**
 * Creates and registers handlers on a Chat SDK bot instance.
 * Dynamically registers only adapters whose credentials are fully present.
 */
export function createNewsroomBot(overrides?: NewsroomBotConfig): NewsroomBotRuntime {
  const adapters: Record<string, Adapter> = {};

  // Slack adapter
  if (overrides?.slack && isAdapterInstance(overrides.slack)) {
    adapters.slack = overrides.slack;
  } else {
    const slackConfig = overrides?.slack as Parameters<typeof createSlackAdapter>[0] | undefined;
    const slackToken = slackConfig?.botToken || process.env.SLACK_BOT_TOKEN;
    const slackSecret = slackConfig?.signingSecret || process.env.SLACK_SIGNING_SECRET;
    const slackVerifier = slackConfig?.webhookVerifier;

    if (slackToken && (slackSecret || slackVerifier)) {
      adapters.slack = createSlackAdapter({
        ...slackConfig,
        botToken: slackToken,
        signingSecret: slackSecret,
        webhookVerifier: slackVerifier,
      });
    }
  }

  // Discord adapter
  if (overrides?.discord && isAdapterInstance(overrides.discord)) {
    adapters.discord = overrides.discord;
  } else {
    const discordConfig = overrides?.discord as Parameters<typeof createDiscordAdapter>[0] | undefined;
    const discordToken = discordConfig?.botToken || process.env.DISCORD_BOT_TOKEN;
    if (discordToken) {
      const discordKey = discordConfig?.publicKey || process.env.DISCORD_PUBLIC_KEY;
      const discordAppId = discordConfig?.applicationId || process.env.DISCORD_APPLICATION_ID || "newsroom-discord";
      const discordVerifier =
        discordConfig?.webhookVerifier ||
        (!discordKey ? () => (process.env.NODE_ENV !== "production") : undefined);

      adapters.discord = createDiscordAdapter({
        ...discordConfig,
        botToken: discordToken,
        publicKey: discordKey,
        applicationId: discordAppId,
        webhookVerifier: discordVerifier,
      });
    }
  }

  // Telegram adapter
  if (overrides?.telegram && isAdapterInstance(overrides.telegram)) {
    adapters.telegram = overrides.telegram;
  } else {
    const telegramConfig = overrides?.telegram as Parameters<typeof createTelegramAdapter>[0] | undefined;
    const telegramToken = telegramConfig?.botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (telegramToken) {
      const secretToken = telegramConfig?.secretToken || process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN;
      adapters.telegram = createTelegramAdapter({
        mode: "webhook",
        ...telegramConfig,
        botToken: telegramToken,
        secretToken,
        allowUnverifiedWebhooks:
          telegramConfig?.allowUnverifiedWebhooks ??
          (!secretToken && process.env.NODE_ENV !== "production"),
      });
    }
  }

  const loggerInstance =
    overrides?.logger && typeof overrides.logger === "object"
      ? (overrides.logger as ChatSdkLogger)
      : undefined;

  const resolvedState = resolveBotStateAdapter({
    stateAdapter: overrides?.state,
    redisUrl: overrides?.redisUrl,
    redisClient: overrides?.redisClient,
    logger: loggerInstance,
  });

  const bot = new Chat({
    userName: overrides?.userName || "newsroom",
    adapters,
    state: resolvedState.state,
    logger: overrides?.logger ?? createChatSdkLogger("newsroomBot"),
  }) as NewsroomBotRuntime;

  bot.stateBackend = resolvedState.backend;

  // Register interactive action handlers
  bot.onAction("ns_approve", handleApproveAction);
  bot.onAction("ns_reject", handleRejectAction);
  bot.onAction("ns_edit", handleEditAction);

  // Register modal submission handler
  bot.onModalSubmit("ns_headline_modal", handleHeadlineModalSubmit);

  // Register slash command handler
  bot.onSlashCommand("/newsroom", handleNewsroomSlashCommand);

  // Register @mention and subscribed thread handlers
  bot.onNewMention(handleMentionOrSubscribedMessage);
  bot.onSubscribedMessage(handleMentionOrSubscribedMessage);

  return bot;
}

let cachedBot: NewsroomBotRuntime | null = null;
let cachedConfigKey: string | null = null;

function computeBotConfigKey(): string {
  return [
    process.env.SLACK_BOT_TOKEN || "",
    process.env.SLACK_SIGNING_SECRET || "",
    process.env.DISCORD_BOT_TOKEN || "",
    process.env.DISCORD_PUBLIC_KEY || "",
    process.env.DISCORD_APPLICATION_ID || "",
    process.env.TELEGRAM_BOT_TOKEN || "",
    process.env.TELEGRAM_WEBHOOK_SECRET_TOKEN || "",
    process.env.REDIS_URL || "",
  ].join("|");
}

export function getNewsroomBot(): NewsroomBotRuntime {
  const currentKey = computeBotConfigKey();
  if (!cachedBot || cachedConfigKey !== currentKey) {
    cachedBot = createNewsroomBot();
    cachedConfigKey = currentKey;
  }
  return cachedBot;
}

export function resetNewsroomBotForTests(): void {
  cachedBot = null;
  cachedConfigKey = null;
}

/**
 * Broadcasts a story approval card to specified or default approval channels.
 */
export async function broadcastStoryApprovalCard(
  story: StoryApprovalSummary,
  channelIds?: string[],
  appBaseUrl?: string,
  botInstance?: Chat
): Promise<BroadcastResult> {
  const targets =
    channelIds && channelIds.length > 0
      ? channelIds
      : parseApprovalChannels(process.env.NEWSROOM_APPROVAL_CHANNELS);

  const result: BroadcastResult = {
    sent: [],
    skipped: [],
    errors: [],
  };

  if (targets.length === 0) {
    return result;
  }

  const bot = botInstance || getNewsroomBot();
  const configured = getConfiguredBotPlatforms();
  const card = buildStoryApprovalCard(story, appBaseUrl);

  for (const channelId of targets) {
    const platform = channelId.includes(":")
      ? (channelId.split(":")[0].toLowerCase() as BotPlatform)
      : null;

    const isPlatformConfigured =
      platform &&
      (configured.includes(platform) ||
        Boolean(bot.webhooks && typeof (bot.webhooks as Record<string, unknown>)[platform] === "function"));

    if (!isPlatformConfigured) {
      result.skipped.push(channelId);
      continue;
    }

    try {
      await bot.channel(channelId).post(card);
      result.sent.push(channelId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ err, channelId, storyId: story.id }, `Failed to post story approval card to channel ${channelId}`);
      result.errors.push(`${channelId}: ${msg}`);
    }
  }

  return result;
}

/**
 * Broadcasts an autonomous bulletin approval card to specified or default approval channels.
 */
export async function broadcastBulletinApprovalCard(
  storyId: string,
  bulletin: AutonomousBulletinPayload,
  channelIds?: string[],
  appBaseUrl?: string,
  botInstance?: Chat
): Promise<BroadcastResult> {
  const targets =
    channelIds && channelIds.length > 0
      ? channelIds
      : parseApprovalChannels(process.env.NEWSROOM_APPROVAL_CHANNELS);

  const result: BroadcastResult = {
    sent: [],
    skipped: [],
    errors: [],
  };

  if (targets.length === 0) {
    return result;
  }

  const bot = botInstance || getNewsroomBot();
  const configured = getConfiguredBotPlatforms();
  const card = buildBulletinApprovalCard(storyId, bulletin, appBaseUrl);

  for (const channelId of targets) {
    const platform = channelId.includes(":")
      ? (channelId.split(":")[0].toLowerCase() as BotPlatform)
      : null;

    const isPlatformConfigured =
      platform &&
      (configured.includes(platform) ||
        Boolean(bot.webhooks && typeof (bot.webhooks as Record<string, unknown>)[platform] === "function"));

    if (!isPlatformConfigured) {
      result.skipped.push(channelId);
      continue;
    }

    try {
      await bot.channel(channelId).post(card);
      result.sent.push(channelId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ err, channelId, storyId, edition: bulletin.edition }, `Failed to post bulletin approval card to channel ${channelId}`);
      result.errors.push(`${channelId}: ${msg}`);
    }
  }

  return result;
}
