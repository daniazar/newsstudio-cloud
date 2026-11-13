/**
 * src/app/api/webhooks/slack/route.ts
 *
 * Slack Webhook Endpoint for Ruby NewsStudio Newsroom Bot.
 * Receives Block Kit interactive button actions, modal submissions,
 * slash commands (/newsroom), and @mention events.
 */

import { after } from "next/server";
import { getNewsroomBot, getConfiguredBotPlatforms } from "@/lib/bot/newsroomBot";

export async function POST(request: Request): Promise<Response> {
  const bot = getNewsroomBot();
  const webhookHandler = (
    bot.webhooks as Record<
      string,
      ((req: Request, opts?: { waitUntil?: (task: Promise<unknown>) => void }) => Promise<Response>) | undefined
    >
  ).slack;

  if (typeof webhookHandler !== "function") {
    const configured = getConfiguredBotPlatforms();
    return Response.json(
      {
        error: "Slack bot adapter is not configured. Missing SLACK_BOT_TOKEN and/or SLACK_SIGNING_SECRET.",
        configuredPlatforms: configured,
      },
      { status: 503 }
    );
  }

  return webhookHandler(request, { waitUntil: (task) => after(() => task) });
}
