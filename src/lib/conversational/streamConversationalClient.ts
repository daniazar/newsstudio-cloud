/**
 * src/lib/conversational/streamConversationalClient.ts
 *
 * Client-side helper for progressive NDJSON conversational chat streaming (PRD §6.2).
 * Streams token deltas and progressive speech clauses from /api/conversational/chat,
 * enabling sub-450ms Time-To-First-Audio (TTFA) into Modern-TTS / MuseTalk.
 *
 * Handles both streaming (application/x-ndjson) and non-streaming (application/json)
 * responses transparently for robust test mocking and legacy endpoint safety.
 */

import type { ConversationalResponse, ConversationalStreamEvent } from "./ollamaConversationalClient";

export interface StreamConversationalClause {
  index: number;
  spokenText: string;
  cleanSpokenText: string;
  actionPose: ConversationalResponse["actionPose"];
  detectedLanguage: "es" | "en";
  ttfaMs: number;
}

export interface StreamConversationalChatOptions {
  personaId?: string;
  userUtterance: string;
  history?: { role: "system" | "user" | "assistant"; text: string }[];
  language?: "es" | "en" | "auto";
  topic?: string;
  forceGemini?: boolean;
  model?: string;
  onDelta?: (delta: string, spokenPreview: string) => void;
  onClause?: (clause: StreamConversationalClause) => void;
  onComplete?: (response: ConversationalResponse) => void;
  signal?: AbortSignal;
}

export async function streamConversationalChat(
  options: StreamConversationalChatOptions
): Promise<ConversationalResponse> {
  const {
    personaId = "ruby",
    userUtterance,
    history = [],
    language = "auto",
    topic = "all",
    forceGemini = false,
    model = "qwen2.5:3b",
    onDelta,
    onClause,
    onComplete,
    signal,
  } = options;

  const res = await fetch("/api/conversational/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      personaId,
      userUtterance,
      history,
      language,
      topic,
      forceGemini,
      model,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    let errMsg = `Failed to generate conversational chat (${res.status})`;
    try {
      const errJson = await res.json();
      if (errJson?.error) {
        errMsg = errJson.error;
      }
    } catch {
      // Fall through to status error
    }
    throw new Error(errMsg);
  }

  const contentType = res.headers.get("content-type") || "";

  // Fallback if the response is standard JSON (e.g., test mocks or non-streaming route)
  if (!contentType.includes("application/x-ndjson") || !res.body) {
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || "Failed conversational chat");
    }

    const response: ConversationalResponse = {
      rawText: data.rawText || data.text || "",
      spokenText: data.text || "",
      cleanSpokenText: data.cleanSpokenText || data.text || "",
      actionPose: data.actionPose || "M2_RAISED_EXPLANATORY",
      projectedCard: data.projectedCard || null,
      suggestedFollowUps: data.suggestedFollowUps || [],
      detectedLanguage: data.detectedLanguage || "es",
      providerUsed: data.telemetry?.provider || "gemini",
      modelUsed: data.telemetry?.model || "gemini-2.5-flash",
      latencyMs: data.telemetry?.latencyMs || 0,
    };

    onClause?.({
      index: 0,
      spokenText: response.spokenText,
      cleanSpokenText: response.cleanSpokenText,
      actionPose: response.actionPose,
      detectedLanguage: response.detectedLanguage,
      ttfaMs: response.latencyMs,
    });

    onComplete?.(response);
    return response;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let finalResponse: ConversationalResponse | null = null;

  const processLine = (lineStr: string) => {
    const trimmed = lineStr.trim();
    if (!trimmed) return;

    let event: ConversationalStreamEvent;
    try {
      event = JSON.parse(trimmed);
    } catch {
      if (finalResponse) return;
      throw new Error(`Invalid streaming JSON line: ${trimmed.slice(0, 100)}`);
    }

    if (event.type === "delta") {
      onDelta?.(event.textDelta, event.spokenPreview);
    } else if (event.type === "clause") {
      onClause?.({
        index: event.index,
        spokenText: event.spokenText,
        cleanSpokenText: event.cleanSpokenText,
        actionPose: event.actionPose,
        detectedLanguage: event.detectedLanguage,
        ttfaMs: event.ttfaMs,
      });
    } else if (event.type === "complete") {
      finalResponse = event.response;
      onComplete?.(event.response);
    } else if (event.type === "error") {
      throw new Error(event.error || "Streaming conversational error");
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        processLine(line);
      }
    }

    // Flush any pending multi-byte sequence
    buffer += decoder.decode();
    if (buffer.trim()) {
      processLine(buffer.trim());
    }
  } finally {
    reader.releaseLock();
  }

  if (!finalResponse) {
    throw new Error("Conversational stream closed without producing a complete response");
  }

  return finalResponse;
}
