import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

export interface LocalLlmRequest {
  prompt: string;
  systemPrompt?: string;
  schema?: Record<string, unknown>;
  model?: string;
  effort?: string;
  timeoutMs?: number;
}

export interface LocalLlmResponse {
  text: string;
  engine: "agy" | "ollama";
  model: string;
  inputTokens?: number;
  outputTokens?: number;
}

const DEFAULT_AGY_MODEL = "gemini-3.8-flash-low";
const DEFAULT_AGY_EFFORT = "low";
const DEFAULT_AGY_TIMEOUT = "2m";
const DEFAULT_OLLAMA_MODEL = "qwen3.5:9b";

function buildFullPrompt(prompt: string, systemPrompt?: string, hasSchema?: boolean): string {
  const parts: string[] = [];
  if (systemPrompt?.trim()) {
    parts.push(`[SYSTEM INSTRUCTIONS]\n${systemPrompt.trim()}`);
  }
  parts.push(prompt);
  const preamble = hasSchema
    ? "Answer ONLY with the final JSON object matching the required schema. Do not use any tools or explore any directory."
    : "Answer directly with the final response. Do not use any tools or explore any directory.";
  parts.push(`\n${preamble}`);
  return parts.join("\n\n");
}

function parseAgyJsonLine(stdout: string): {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
} {
  const lines = stdout
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.startsWith("{"));

  if (lines.length > 0) {
    const last = lines[lines.length - 1];
    try {
      const parsed = JSON.parse(last) as {
        is_error?: boolean;
        error?: unknown;
        structured_output?: unknown;
        result?: unknown;
        text?: unknown;
        usage?: { input_tokens?: number; output_tokens?: number };
      };

      if (parsed.is_error) {
        const msg =
          typeof parsed.error === "string"
            ? parsed.error
            : typeof parsed.result === "string"
              ? parsed.result
              : last;
        throw new Error(`agy returned error: ${msg.slice(0, 400)}`);
      }

      const inputTokens =
        typeof parsed.usage?.input_tokens === "number" ? parsed.usage.input_tokens : undefined;
      const outputTokens =
        typeof parsed.usage?.output_tokens === "number" ? parsed.usage.output_tokens : undefined;

      if (parsed.structured_output !== undefined && parsed.structured_output !== null) {
        const serialized =
          typeof parsed.structured_output === "string"
            ? parsed.structured_output
            : JSON.stringify(parsed.structured_output);
        return { text: serialized, inputTokens, outputTokens };
      }

      if (typeof parsed.result === "string") {
        return { text: parsed.result, inputTokens, outputTokens };
      }

      if (parsed.result !== undefined && parsed.result !== null) {
        return { text: JSON.stringify(parsed.result), inputTokens, outputTokens };
      }

      if (typeof parsed.text === "string") {
        return { text: parsed.text, inputTokens, outputTokens };
      }
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("agy returned error:")) {
        throw err;
      }
      // Fall through to raw stdout
    }
  }

  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error("agy returned empty stdout");
  }
  return { text: trimmed };
}

/**
 * Execute a completion using the local `agy` CLI inside an isolated empty temp
 * directory so no workspace files or slash commands leak into context.
 */
export async function runAgyCompletion(req: LocalLlmRequest): Promise<LocalLlmResponse> {
  const model = (req.model || process.env.AGY_MODEL || DEFAULT_AGY_MODEL).trim();
  const effort = (req.effort || process.env.AGY_EFFORT || DEFAULT_AGY_EFFORT).trim();
  const printTimeout = (process.env.AGY_LLM_TIMEOUT || DEFAULT_AGY_TIMEOUT).trim();
  const timeoutMs = req.timeoutMs ?? 120_000;
  const bin = (process.env.AGY_BIN || "agy").trim();

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "agy-llm-"));
  let schemaFile: string | null = null;

  try {
    const args: string[] = [
      "--dangerously-skip-permissions",
      "--sandbox",
      "--disable-slash-commands",
      "--model",
      model,
      "--effort",
      effort,
      "--print-timeout",
      printTimeout,
      "--output-format",
      "json",
    ];

    if (req.schema) {
      schemaFile = path.join(tmp, "schema.json");
      fs.writeFileSync(schemaFile, JSON.stringify(req.schema), "utf8");
      args.push("--json-schema", schemaFile);
    }

    args.push(buildFullPrompt(req.prompt, req.systemPrompt, Boolean(req.schema)));

    const stdout = await new Promise<string>((resolve, reject) => {
      const child = spawn(bin, args, {
        cwd: tmp,
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      let out = "";
      let errOut = "";
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        try {
          child.kill("SIGKILL");
        } catch {
          // ignore
        }
        reject(new Error(`agy timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      child.stdout?.on("data", (chunk: Buffer | string) => {
        out += chunk.toString();
      });

      child.stderr?.on("data", (chunk: Buffer | string) => {
        errOut += chunk.toString();
      });

      child.on("error", (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      });

      child.on("close", (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (code !== 0 && !out.trim()) {
          reject(
            new Error(
              `agy exited with code ${code}: ${(errOut || "no output").trim().slice(0, 400)}`
            )
          );
          return;
        }
        resolve(out);
      });
    });

    const parsed = parseAgyJsonLine(stdout);
    return {
      text: parsed.text,
      engine: "agy",
      model,
      inputTokens: parsed.inputTokens,
      outputTokens: parsed.outputTokens,
    };
  } finally {
    try {
      if (schemaFile && fs.existsSync(schemaFile)) {
        fs.unlinkSync(schemaFile);
      }
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      // ignore temp cleanup errors
    }
  }
}

/**
 * Execute a completion via local Ollama `/api/chat`.
 */
export async function runOllamaCompletion(req: LocalLlmRequest): Promise<LocalLlmResponse> {
  const baseUrl = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/+$/, "");
  const model = (
    req.model ||
    process.env.OLLAMA_MODEL ||
    process.env.OLLAMA_FALLBACK_MODEL ||
    DEFAULT_OLLAMA_MODEL
  ).trim();
  const timeoutMs = req.timeoutMs ?? 120_000;

  const messages: Array<{ role: string; content: string }> = [];
  if (req.systemPrompt?.trim()) {
    messages.push({ role: "system", content: req.systemPrompt.trim() });
  }
  messages.push({ role: "user", content: req.prompt });

  const body: Record<string, unknown> = {
    model,
    messages,
    stream: false,
  };
  if (req.schema) {
    body.format = req.schema;
  }

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Ollama /api/chat failed (${res.status}): ${txt.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    model?: string;
    message?: { content?: string };
    prompt_eval_count?: number;
    eval_count?: number;
  };

  const content = data.message?.content;
  if (!content) {
    throw new Error("Ollama returned empty message content");
  }

  return {
    text: content,
    engine: "ollama",
    model: data.model || model,
    inputTokens: typeof data.prompt_eval_count === "number" ? data.prompt_eval_count : undefined,
    outputTokens: typeof data.eval_count === "number" ? data.eval_count : undefined,
  };
}

/**
 * Local-first LLM runner on the worker machine.
 * Uses `agy` CLI by default, or `ollama` first when `WORKER_LLM_ENGINE=ollama`,
 * with cross-fallback between local engines.
 */
export async function runLocalLlm(req: LocalLlmRequest): Promise<LocalLlmResponse> {
  const preferred = (process.env.WORKER_LLM_ENGINE || "agy").trim().toLowerCase();

  if (preferred === "ollama") {
    try {
      return await runOllamaCompletion(req);
    } catch (ollamaErr) {
      try {
        return await runAgyCompletion({ ...req, model: undefined });
      } catch (agyErr) {
        const msg1 = ollamaErr instanceof Error ? ollamaErr.message : String(ollamaErr);
        const msg2 = agyErr instanceof Error ? agyErr.message : String(agyErr);
        throw new Error(`Local LLM failed (ollama: ${msg1}; agy: ${msg2})`);
      }
    }
  }

  try {
    return await runAgyCompletion(req);
  } catch (agyErr) {
    if (process.env.WORKER_OLLAMA_FALLBACK === "false") {
      throw agyErr;
    }
    try {
      return await runOllamaCompletion({ ...req, model: undefined });
    } catch (ollamaErr) {
      const msg1 = agyErr instanceof Error ? agyErr.message : String(agyErr);
      const msg2 = ollamaErr instanceof Error ? ollamaErr.message : String(ollamaErr);
      throw new Error(`Local LLM failed (agy: ${msg1}; ollama: ${msg2})`);
    }
  }
}
