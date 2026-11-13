import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendOperationalAlert } from "../notifier";

describe("Operational Alerting Notifier", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return false without throwing when no webhook is configured", async () => {
    delete process.env.ALERT_WEBHOOK_URL;
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.DISCORD_WEBHOOK_URL;

    const result = await sendOperationalAlert({
      title: "Test Alert",
      message: "Testing alert with no webhook",
      severity: "warn",
    });

    expect(result).toBe(false);
  });

  it("should post Discord formatted embed when Discord webhook is configured", async () => {
    process.env.ALERT_WEBHOOK_URL = "https://discord.com/api/webhooks/123/xyz";

    let capturedBody: any = null;
    global.fetch = vi.fn().mockImplementation(async (_url, options) => {
      capturedBody = JSON.parse(options.body);
      return { ok: true, status: 200 } as any;
    });

    const result = await sendOperationalAlert({
      title: "Render Job Deadlock",
      message: "Worker exceeded max attempts",
      severity: "critical",
      eventType: "worker_deadlock",
      companyId: "org_123",
      metadata: { jobId: "job_999", role: "video" },
    });

    expect(result).toBe(true);
    expect(capturedBody).toBeDefined();
    expect(capturedBody.content).toContain("[CRITICAL]");
    expect(capturedBody.embeds).toHaveLength(1);
    expect(capturedBody.embeds[0].title).toBe("Render Job Deadlock");
    expect(capturedBody.embeds[0].color).toBe(0x991b1b);
    expect(capturedBody.embeds[0].fields.some((f: any) => f.name === "jobId" && f.value === "job_999")).toBe(true);
  });

  it("should post Slack formatted attachments when Slack webhook is configured", async () => {
    process.env.SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/T00/B00/X00";

    let capturedBody: any = null;
    global.fetch = vi.fn().mockImplementation(async (_url, options) => {
      capturedBody = JSON.parse(options.body);
      return { ok: true, status: 200 } as any;
    });

    const result = await sendOperationalAlert({
      title: "Quota Depleted",
      message: "Tenant out of credits",
      severity: "warn",
      eventType: "quota_exceeded",
      companyId: "org_456",
    });

    expect(result).toBe(true);
    expect(capturedBody).toBeDefined();
    expect(capturedBody.text).toContain("[WARN]");
    expect(capturedBody.attachments).toHaveLength(1);
    expect(capturedBody.attachments[0].color).toBe("#f59e0b");
  });

  it("should gracefully handle network or HTTP failures without throwing", async () => {
    process.env.ALERT_WEBHOOK_URL = "https://discord.com/api/webhooks/123/xyz";

    global.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

    const result = await sendOperationalAlert({
      title: "Silent failure test",
      message: "Should not crash",
      severity: "error",
    });

    expect(result).toBe(false);
  });
});
