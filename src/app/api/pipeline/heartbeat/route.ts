import { prisma } from "@/lib/prisma";
import { requireWorkerKey } from "@/lib/workerAuth";

/**
 * POST /api/pipeline/heartbeat
 * Worker sends periodic heartbeat to register its presence and status.
 * Worker-facing — uses WORKER_API_KEY auth.
 */
export async function POST(request: Request) {
  const err = requireWorkerKey(request);
  if (err) return err;

  try {
    const body = await request.json();
    const {
      workerId,
      hostname,
      type,
      status,
      currentJobId,
      currentStep,
      gpuMemoryUsedMB,
      gpuMemoryTotalMB,
    } = body as {
      workerId: string;
      hostname: string;
      type?: string;
      status: string;
      currentJobId?: string;
      currentStep?: string;
      gpuMemoryUsedMB?: number;
      gpuMemoryTotalMB?: number;
    };

    if (!workerId || !hostname) {
      return Response.json(
        { error: "workerId and hostname are required" },
        { status: 400 }
      );
    }

    const ip = request.headers.get("x-forwarded-for")?.split(',')[0] || request.headers.get("x-real-ip") || null;

    await prisma.worker.upsert({
      where: { id: workerId },
      update: {
        hostname,
        type: type ?? "full",
        status,
        currentJobId: currentJobId ?? null,
        currentStep: currentStep ?? null,
        gpuMemoryUsedMB: gpuMemoryUsedMB ?? null,
        gpuMemoryTotalMB: gpuMemoryTotalMB ?? null,
        ip,
        lastSeenAt: new Date(),
      },
      create: {
        id: workerId,
        hostname,
        type: type ?? "full",
        status,
        currentJobId: currentJobId ?? null,
        currentStep: currentStep ?? null,
        gpuMemoryUsedMB: gpuMemoryUsedMB ?? null,
        gpuMemoryTotalMB: gpuMemoryTotalMB ?? null,
        ip,
      },
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("[Pipeline Heartbeat] Error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
