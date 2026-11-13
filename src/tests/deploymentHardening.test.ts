import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";
import { killService } from "@/lib/telemetry";

describe("Deployment Hardening & Production Container Suite", () => {
  it("should have a production standalone Dockerfile with /api/health/live check", () => {
    const dockerfilePath = path.resolve(process.cwd(), "Dockerfile");
    expect(fs.existsSync(dockerfilePath)).toBe(true);

    const content = fs.readFileSync(dockerfilePath, "utf8");
    expect(content).toContain("node:22-alpine");
    expect(content).toContain("BUILD_STANDALONE=true");
    expect(content).toContain("/api/health/live");
    expect(content).toContain(".next/standalone");
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
