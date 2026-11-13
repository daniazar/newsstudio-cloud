/**
 * Outbound Operational Alerting & Telemetry Notifier
 * Dispatches critical operational notifications (job failures, DLQ, quota exhaustions)
 * to external monitoring endpoints (Slack, Discord, or generic Webhooks).
 */

export type AlertSeverity = "info" | "warn" | "error" | "critical";

export interface OperationalAlertOptions {
  title: string;
  message: string;
  severity?: AlertSeverity;
  eventType?: string;
  companyId?: string | null;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

/**
 * Sends an operational alert to configured webhook endpoints (Slack, Discord, generic).
 * Completely non-blocking and safe: failures are logged but never thrown to the caller.
 */
export async function sendOperationalAlert(options: OperationalAlertOptions): Promise<boolean> {
  const {
    title,
    message,
    severity = "error",
    eventType = "operational_event",
    companyId,
    metadata = {},
  } = options;

  const webhookUrl =
    process.env.ALERT_WEBHOOK_URL ||
    process.env.SLACK_WEBHOOK_URL ||
    process.env.DISCORD_WEBHOOK_URL;

  if (!webhookUrl) {
    // If no webhook configured in current environment, log at appropriate console level and return
    const logPrefix = `[Alerting:${severity.toUpperCase()}]`;
    if (severity === "critical" || severity === "error") {
      console.error(`${logPrefix} ${title}: ${message}`, { eventType, companyId, metadata });
    } else {
      console.warn(`${logPrefix} ${title}: ${message}`, { eventType, companyId, metadata });
    }
    return false;
  }

  const enhancedMetadata = {
    ...metadata,
    ...(companyId ? { companyId } : {}),
    environment: process.env.NODE_ENV || "development",
  };

  try {
    const isDiscord = webhookUrl.includes("discord.com") || webhookUrl.includes("discordapp.com");
    const isSlack = webhookUrl.includes("slack.com");

    let payload: Record<string, unknown>;

    if (isDiscord) {
      const colorMap: Record<AlertSeverity, number> = {
        info: 0x3b82f6,
        warn: 0xf59e0b,
        error: 0xef4444,
        critical: 0x991b1b,
      };

      payload = {
        content: `🚨 **[${severity.toUpperCase()}] ${title}**`,
        embeds: [
          {
            title,
            description: message,
            color: colorMap[severity],
            fields: Object.entries(enhancedMetadata)
              .filter(([_, v]) => v !== undefined && v !== null)
              .map(([k, v]) => ({ name: k, value: String(v), inline: true })),
            timestamp: new Date().toISOString(),
            footer: {
              text: `Ruby NewsStudio Ops • ${eventType}`,
            },
          },
        ],
      };
    } else if (isSlack) {
      const slackColorMap: Record<AlertSeverity, string> = {
        info: "#3b82f6",
        warn: "#f59e0b",
        error: "#ef4444",
        critical: "#991b1b",
      };

      payload = {
        text: `*[${severity.toUpperCase()}] ${title}*\n${message}`,
        attachments: [
          {
            color: slackColorMap[severity],
            fields: Object.entries(enhancedMetadata)
              .filter(([_, v]) => v !== undefined && v !== null)
              .map(([k, v]) => ({ title: k, value: String(v), short: true })),
            footer: `Ruby NewsStudio Ops • ${eventType}`,
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      };
    } else {
      // Unified generic payload
      payload = {
        title,
        message,
        text: `[${severity.toUpperCase()}] ${title}: ${message}`,
        severity,
        eventType,
        timestamp: new Date().toISOString(),
        metadata: enhancedMetadata,
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[Alerting] Webhook returned status ${res.status}: ${res.statusText}`);
      return false;
    }

    return true;
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[Alerting] Failed to deliver alert to webhook: ${errMsg}`);
    return false;
  }
}
