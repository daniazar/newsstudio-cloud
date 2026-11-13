import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";
import { killService } from "@/lib/telemetry";

describe("Deployment Hardening & Production Container Suite", () => {
  it("should have a dedicated lightweight Dockerfile.worker-audio", () => {
    const dockerfilePath = path.resolve(process.cwd(), "Dockerfile.worker-audio");
    expect(fs.existsSync(dockerfilePath)).toBe(true);

    const content = fs.readFileSync(dockerfilePath, "utf8");
    expect(content).toContain("node:20-bookworm-slim");
    expect(content).toContain("ffmpeg");
    expect(content).toContain("--role=audio");
    // Should NOT contain Chromium or Puppeteer (lightweight)
    expect(content).not.toContain("chromium");
    expect(content).not.toContain("PUPPETEER_SKIP_CHROMIUM_DOWNLOAD");
  });

  it("should reference Dockerfile.worker-audio and extra_hosts in docker-compose.ai.yml", () => {
    const composePath = path.resolve(process.cwd(), "docker-compose.ai.yml");
    expect(fs.existsSync(composePath)).toBe(true);

    const composeContent = fs.readFileSync(composePath, "utf8");
    expect(composeContent).toContain("dockerfile: Dockerfile.worker-audio");
    expect(composeContent).toContain("host.docker.internal:host-gateway");
    expect(composeContent).toContain("modern-talkinghead");
  });

  it("should import prisma from @/lib/prisma in scripts/worker-orchestrator.ts (no SQLite hardcoding)", () => {
    const orchestratorPath = path.resolve(process.cwd(), "scripts/worker-orchestrator.ts");
    expect(fs.existsSync(orchestratorPath)).toBe(true);

    const orchestratorContent = fs.readFileSync(orchestratorPath, "utf8");
    expect(orchestratorContent).toContain('import { prisma } from "@/lib/prisma"');
    expect(orchestratorContent).not.toContain("PrismaBetterSqlite3");
    expect(orchestratorContent).not.toContain("file:./prisma/dev.db");
  });

  it("should support modern_talkinghead in telemetry killService", async () => {
    // Test killService handles modern_talkinghead gracefully without throwing unhandled exceptions
    const result = await killService("modern_talkinghead");
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("message");
  });

  it("should support WORKER_ROLE and WORKER_ENGINE environment variables in worker config", () => {
    const configPath = path.resolve(process.cwd(), "workers/pipeline-worker/config.ts");
    const content = fs.readFileSync(configPath, "utf8");
    expect(content).toContain("process.env.WORKER_ROLE");
    expect(content).toContain("process.env.WORKER_ENGINE");
  });

  it("should detect headless environments in worker index.ts", () => {
    const indexPath = path.resolve(process.cwd(), "workers/pipeline-worker/index.ts");
    const content = fs.readFileSync(indexPath, "utf8");
    expect(content).toContain("isHeadless");
    expect(content).toContain("triggerAutoPublish");
  });

  it("should support SSL options in pg.Pool in src/lib/prisma.ts", () => {
    const prismaPath = path.resolve(process.cwd(), "src/lib/prisma.ts");
    const content = fs.readFileSync(prismaPath, "utf8");
    expect(content).toContain("DATABASE_SSL");
    expect(content).toContain("ssl:");
  });
});
