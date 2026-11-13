import { NextResponse } from "next/server";
import { requireWorkerKey } from "@/lib/workerAuth";
import { completeLlmTask, type LlmBrokerCompletePayload } from "@/lib/worker-broker";

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

  let body: LlmBrokerCompletePayload;
  try {
    body = (await req.json()) as LlmBrokerCompletePayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (body.status !== "done" && body.status !== "failed") {
    return NextResponse.json(
      { error: "Invalid status; expected 'done' or 'failed'" },
      { status: 400 }
    );
  }

  const completed = completeLlmTask(taskId, {
    status: body.status,
    text: typeof body.text === "string" ? body.text : undefined,
    error: typeof body.error === "string" ? body.error : undefined,
    model: typeof body.model === "string" ? body.model : undefined,
    engine: body.engine === "ollama" ? "ollama" : "agy",
    inputTokens: typeof body.inputTokens === "number" ? body.inputTokens : undefined,
    outputTokens: typeof body.outputTokens === "number" ? body.outputTokens : undefined,
  });

  if (!completed) {
    return NextResponse.json(
      { completed: false, error: "LLM task not found or already expired" },
      { status: 404 }
    );
  }

  return NextResponse.json({ completed: true });
}
