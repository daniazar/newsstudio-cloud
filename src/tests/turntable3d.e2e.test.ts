// @vitest-environment node
/**
 * Opt-in end-to-end test for the 3D turntable worker task against a REAL Object3D-Server.
 *
 * Exercises: worker task → object3dClient → orchestrator (bg removal, engine, normalization,
 * front alignment, Blender render, encode) → StorageClient uploads → Product3DAsset in the DB.
 * Only the two calls back into the Next.js app (progress + asset PATCH, which need the dev server
 * and Clerk) are replaced with direct Prisma writes.
 *
 *   OBJECT3D_E2E=1 OBJECT3D_E2E_JOB_ID=<queued turntable_3d GenerationJob id> \
 *   DATABASE_URL=file:./dev.db STORAGE_PROVIDER=local OBJECT3D_SERVER_URL=http://localhost:8020 \
 *   npx vitest run src/tests/turntable3d.e2e.test.ts
 *
 * Skipped unless OBJECT3D_E2E=1 (it needs GPU containers and takes minutes).
 */
import { describe, it, expect, vi } from "vitest";
import type { Prisma } from "@prisma/client";
import { stepTurntable3D } from "../../workers/pipeline-worker/tasks/turntable3dTask";
import * as pipelineApi from "../../workers/pipeline-worker/api";
import { prisma } from "../lib/prisma";
import { storage } from "../lib/storage";
import { checkObject3DHealth } from "../lib/ai/object3dClient";

const enabled = process.env.OBJECT3D_E2E === "1";

describe.skipIf(!enabled)("E2E: turntable_3d against a live Object3D-Server", () => {
  it(
    "reconstructs, renders and stores a READY Product3DAsset",
    async () => {
      const health = await checkObject3DHealth({ timeoutMs: 3000 });
      expect(health.online, `Object3D server offline: ${health.error ?? ""}`).toBe(true);

      const jobId = process.env.OBJECT3D_E2E_JOB_ID;
      const job = jobId
        ? await prisma.generationJob.findUniqueOrThrow({ where: { id: jobId } })
        : await prisma.generationJob.findFirstOrThrow({
            where: { type: "turntable_3d", status: "QUEUED" },
            orderBy: { createdAt: "desc" },
          });

      const steps: string[] = [];
      vi.spyOn(pipelineApi, "reportProgress").mockImplementation(async (id, payload) => {
        steps.push(`${payload.step}@${payload.doneSteps ?? ""}`);
        await prisma.generationJob.update({
          where: { id },
          data: { currentStep: payload.step, status: payload.status, doneSteps: payload.doneSteps ?? undefined },
        });
        return true;
      });
      vi.spyOn(pipelineApi, "updateProduct3DAsset").mockImplementation(async (assetId, payload) => {
        await prisma.product3DAsset.update({
          where: { id: assetId },
          data: payload as Prisma.Product3DAssetUpdateInput,
        });
        return true;
      });

      const result = await stepTurntable3D(job as unknown as Record<string, unknown>, job.id, {
        pollMs: 3000,
        jobTimeoutMs: 45 * 60 * 1000,
      });

      const asset = await prisma.product3DAsset.findUniqueOrThrow({ where: { id: result.asset3DId } });
      expect(asset.status).toBe("READY");
      expect(asset.meshKey).toBe(result.meshKey);
      expect(asset.turntableKey).toBe(result.turntableKey);
      expect(asset.engine).not.toBe("auto");
      await expect(storage.exists(result.meshKey)).resolves.toBe(true);
      await expect(storage.exists(result.turntableKey)).resolves.toBe(true);
      expect((await storage.download(result.turntableKey)).length).toBeGreaterThan(10_000);
      expect(steps.at(-1)).toMatch(/^upload@100/);

      await prisma.generationJob.update({ where: { id: job.id }, data: { status: "DONE" } });
      console.warn("[turntable3d e2e]", JSON.stringify({ asset, steps: steps.length }, null, 1));
    },
    50 * 60 * 1000
  );
});
