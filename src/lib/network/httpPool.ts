import http from "http";
import https from "https";
import { Agent as UndiciAgent, type Dispatcher } from "undici";

const isHttpAgentAvailable = typeof http?.Agent === "function";
const isHttpsAgentAvailable = typeof https?.Agent === "function";
const isUndiciAgentAvailable = typeof UndiciAgent === "function";

export const globalUndiciAgent: Dispatcher | undefined = isUndiciAgentAvailable
  ? new UndiciAgent({
      keepAliveTimeout: 30_000,
      keepAliveMaxTimeout: 120_000,
      connections: 64,
      pipelining: 1,
    })
  : undefined;

export const globalHttpAgent = isHttpAgentAvailable
  ? new http.Agent({
      keepAlive: true,
      maxSockets: 64,
      maxFreeSockets: 16,
      timeout: 120000,
      keepAliveMsecs: 30000,
    })
  : undefined;

export const globalHttpsAgent = isHttpsAgentAvailable
  ? new https.Agent({
      keepAlive: true,
      maxSockets: 64,
      maxFreeSockets: 16,
      timeout: 120000,
      keepAliveMsecs: 30000,
    })
  : undefined;

/**
 * Returns the appropriate persistent HTTP/HTTPS Agent for a target URL.
 */
export function getPooledAgentForUrl(url: string | URL): http.Agent | https.Agent | undefined {
  if (!isHttpAgentAvailable || !isHttpsAgentAvailable) {
    return undefined;
  }
  const urlObj = typeof url === "string" ? new URL(url) : url;
  return urlObj.protocol === "https:" ? globalHttpsAgent : globalHttpAgent;
}

export interface PooledFetchOptions extends RequestInit {
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  dispatcher?: Dispatcher;
}

interface ExtendedFetchInit extends RequestInit {
  keepalive?: boolean;
  agent?: http.Agent | https.Agent;
  dispatcher?: Dispatcher;
}

/**
 * High-performance fetch wrapper that uses persistent Keep-Alive socket pooling
 * and automatically retries transient connection drops.
 */
export async function pooledFetch(
  url: string | URL,
  options: PooledFetchOptions = {}
): Promise<Response> {
  const { maxRetries = 2, retryDelayMs = 250, timeoutMs = 60000, ...fetchInit } = options;

  const agent = getPooledAgentForUrl(url);

  const headers = new Headers(fetchInit.headers);
  if (!headers.has("Connection")) {
    headers.set("Connection", "keep-alive");
  }

  const customInit: ExtendedFetchInit = {
    ...fetchInit,
    headers,
    keepalive: true,
    agent,
    dispatcher: options.dispatcher ?? globalUndiciAgent,
  };

  let attempt = 0;
  while (true) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`Request timed out after ${timeoutMs}ms`)), timeoutMs);

    let combinedSignal: AbortSignal = controller.signal;
    if (fetchInit.signal) {
      if (typeof AbortSignal.any === "function") {
        combinedSignal = AbortSignal.any([fetchInit.signal, controller.signal]);
      } else {
        fetchInit.signal.addEventListener("abort", () => controller.abort(fetchInit.signal?.reason), { once: true });
      }
    }

    try {
      const response = await fetch(url, {
        ...customInit,
        signal: combinedSignal,
      });
      clearTimeout(timer);
      return response;
    } catch (err: unknown) {
      clearTimeout(timer);
      const errorObj = err as { name?: string; code?: string; message?: string };
      const isTransient =
        errorObj.name === "AbortError" ||
        errorObj.code === "ECONNRESET" ||
        errorObj.code === "ETIMEDOUT" ||
        errorObj.code === "EPIPE" ||
        Boolean(errorObj.message?.includes("fetch failed"));

      if (attempt <= maxRetries && isTransient) {
        await new Promise((res) => setTimeout(res, retryDelayMs * attempt));
        continue;
      }
      throw err;
    }
  }
}
