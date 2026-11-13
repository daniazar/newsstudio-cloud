import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { initJobLogging, cliLogger, getJobLogsTail } from "../cliTelemetry";

describe("cliTelemetry Observability Suite", () => {
  const testJobId = `test_job_${Date.now()}`;
  const logsDir = path.join(process.cwd(), ".gemini", "logs");
  const jobLogFile = path.join(logsDir, `job_${testJobId}.log`);

  afterEach(() => {
    try {
      if (fs.existsSync(jobLogFile)) fs.unlinkSync(jobLogFile);
    } catch {}
  });

  it("initializes job logging and creates session log file", () => {
    const filePath = initJobLogging(testJobId, "veo");
    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, "utf8");
    expect(content).toContain(`[VEO CLI LOG SESSION] Job: ${testJobId}`);
  });

  it("logs stage transitions, warnings, and success events", () => {
    initJobLogging(testJobId, "veo");

    cliLogger.stage("CONNECTING_CDP", "Connected to Chrome port 9222");
    cliLogger.warn("Minor non-critical notice");
    cliLogger.stage("RENDERING_DIFFUSION", "Rendering 8s video on cluster");
    cliLogger.success("Video generated successfully");

    const tail = getJobLogsTail(testJobId, 10);
    expect(tail.length).toBeGreaterThanOrEqual(4);

    const combined = tail.join("\n");
    expect(combined).toContain("[STAGE] [CONNECTING_CDP] Connected to Chrome port 9222");
    expect(combined).toContain("[WARN] Minor non-critical notice");
    expect(combined).toContain("[STAGE] [RENDERING_DIFFUSION] Rendering 8s video on cluster");
    expect(combined).toContain("[SUCCESS] [COMPLETED] Video generated successfully");
  });

  it("returns tail with maxLines limit", () => {
    initJobLogging(testJobId, "veo");
    for (let i = 1; i <= 20; i++) {
      cliLogger.info(`Log line ${i}`);
    }

    const tail5 = getJobLogsTail(testJobId, 5);
    expect(tail5.length).toBe(5);
    expect(tail5[4]).toContain("Log line 20");
  });
});
