import { NextResponse } from "next/server";
import { requireWorkerKey } from "@/lib/workerAuth";
import { claimNextTtsPreviewTaskPersisted } from "@/lib/worker-broker";

async function handleClaim(req: Request): Promise<Response> {
  const authError = requireWorkerKey(req);
  if (authError) return authError;

  const task = await claimNextTtsPreviewTaskPersisted();
  return NextResponse.json({ task });
}

export async function GET(req: Request): Promise<Response> {
  return handleClaim(req);
}

export async function POST(req: Request): Promise<Response> {
  return handleClaim(req);
}
