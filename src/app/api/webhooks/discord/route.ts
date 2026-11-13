/**
 * src/app/api/webhooks/discord/route.ts
 *
 * Discord Webhook Endpoint for Ruby NewsStudio Newsroom Bot.
 * Receives Discord interactions (slash commands, button components, mentions).
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
  ).discord;

  if (typeof webhookHandler !== "function") {
    const configured = getConfiguredBotPlatforms();
    return Response.json(
      {
        error: "Discord bot adapter is not configured. Missing DISCORD_BOT_TOKEN.",
        configuredPlatforms: configured,
      },
      { status: 503 }
    );
  }

  return webhookHandler(request, { waitUntil: (task) => after(() => task) });
}
