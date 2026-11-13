import { NextResponse } from "next/server";
import { requireWorkerKey } from "@/lib/workerAuth";
import { claimNextLlmTask } from "@/lib/worker-broker";

async function handleClaim(req: Request): Promise<Response> {
  const authError = requireWorkerKey(req);
  if (authError) return authError;

  let workerId = "local-worker";
  try {
    const url = new URL(req.url);
    const qWorker = url.searchParams.get("workerId");
    if (qWorker) workerId = qWorker;
  } catch {
    // ignore
  }

  if (req.method === "POST") {
    try {
      const body = (await req.json().catch(() => null)) as { workerId?: string } | null;
      if (body?.workerId && typeof body.workerId === "string") {
        workerId = body.workerId;
      }
    } catch {
      // ignore empty body
    }
  }

  const task = claimNextLlmTask(workerId);
  return NextResponse.json({ task });
}

export async function GET(req: Request): Promise<Response> {
  return handleClaim(req);
}

export async function POST(req: Request): Promise<Response> {
  return handleClaim(req);
}
