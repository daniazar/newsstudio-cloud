import { NextResponse } from "next/server";
import { requireWorkerKey } from "@/lib/workerAuth";
import {
  completeTtsPreviewTaskPersisted,
  type TtsPreviewBrokerCompletePayload,
} from "@/lib/worker-broker";

export async function POST(
  req: Request,
  context: { params: Promise<{ taskId: string }> }
): Promise<Response> {
  const authError = requireWorkerKey(req);
  if (authError) return authError;

  const { taskId } = await context.params;
  if (!taskId) {
    return NextResponse.json({ error: "Missing taskId" }, { status: 400 });
  }

  let body: TtsPreviewBrokerCompletePayload;
  try {
    body = (await req.json()) as TtsPreviewBrokerCompletePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.status !== "done" && body.status !== "failed") {
    return NextResponse.json(
      { error: "Invalid status; expected 'done' or 'failed'" },
      { status: 400 }
    );
  }

  const completed = await completeTtsPreviewTaskPersisted(taskId, {
    status: body.status,
    audioBase64: typeof body.audioBase64 === "string" ? body.audioBase64 : undefined,
    latencyMs: typeof body.latencyMs === "number" ? body.latencyMs : undefined,
    engine: typeof body.engine === "string" ? body.engine : undefined,
    model: typeof body.model === "string" ? body.model : undefined,
    error: typeof body.error === "string" ? body.error : undefined,
  });

  if (!completed) {
    return NextResponse.json(
      { completed: false, error: "TTS preview task not found or already expired" },
      { status: 404 }
    );
  }

  return NextResponse.json({ completed: true });
}
