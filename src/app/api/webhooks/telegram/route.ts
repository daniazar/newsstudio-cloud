/**
 * src/app/api/webhooks/telegram/route.ts
 *
 * Telegram Webhook Endpoint for Ruby NewsStudio Newsroom Bot.
 * Receives Bot API updates (callback queries from inline keyboards, messages, slash commands).
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
  ).telegram;

  if (typeof webhookHandler !== "function") {
    const configured = getConfiguredBotPlatforms();
    return Response.json(
      {
        error: "Telegram bot adapter is not configured. Missing TELEGRAM_BOT_TOKEN.",
        configuredPlatforms: configured,
      },
      { status: 503 }
    );
  }

  return webhookHandler(request, { waitUntil: (task) => after(() => task) });
}
