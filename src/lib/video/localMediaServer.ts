/**
 * src/lib/video/localMediaServer.ts
 *
 * Lightweight local loopback HTTP static media server with RFC 7233 Byte-Range (206) support.
 * Allows headless Remotion CLI renders on the local worker to stream multi-megabyte
 * action loops, avatars, and studio plates directly off NVMe disk without bundling 10+ GB
 * into `--public-dir` temp directories or re-downloading them from R2.
 */

import fs from "fs";
import http from "http";
import path from "path";
import { createLogger } from "@/lib/logger";
import { normalizeAssetRelPath, resolveLocalPublicFile } from "@/lib/storage/localAssets";

const log = createLogger("worker:local-media-server");

const MIME_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".aac": "audio/aac",
  ".flac": "audio/flac",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

interface ActiveServerState {
  server: http.Server;
  baseUrl: string;
}

let activeServer: ActiveServerState | null = null;
let startPromise: Promise<ActiveServerState> | null = null;

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

function parseByteRange(
  rangeHeader: string,
  fileSize: number
): { start: number; end: number } | "invalid" {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
  if (!match || fileSize <= 0) return "invalid";

  const [, startStr, endStr] = match;
  if (!startStr && !endStr) return "invalid";

  if (!startStr && endStr) {
    // Suffix range: bytes=-N
    const suffixLength = Number.parseInt(endStr, 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return "invalid";
    const start = Math.max(0, fileSize - suffixLength);
    return { start, end: fileSize - 1 };
  }

  const start = Number.parseInt(startStr, 10);
  if (!Number.isFinite(start) || start < 0 || start >= fileSize) {
    return "invalid";
  }

  let end = endStr ? Number.parseInt(endStr, 10) : fileSize - 1;
  if (!Number.isFinite(end) || end < start) {
    return "invalid";
  }
  end = Math.min(end, fileSize - 1);

  return { start, end };
}

function handleLocalMediaRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type");
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=3600");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { "Content-Type": "text/plain" });
    res.end("Method Not Allowed");
    return;
  }

  const rawPathname = (req.url || "/").split(/[?#]/)[0] || "/";

  const prefix = "/local-media/";
  if (!rawPathname.startsWith(prefix)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  const rawRemainder = rawPathname.slice(prefix.length);
  const decodedSegments: string[] = [];
  for (const seg of rawRemainder.split("/")) {
    if (!seg) continue;
    let decoded: string;
    try {
      decoded = decodeURIComponent(seg);
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Invalid URL encoding");
      return;
    }
    if (
      decoded === "." ||
      decoded === ".." ||
      decoded.includes("/") ||
      decoded.includes("\\") ||
      decoded.includes("\0")
    ) {
      res.writeHead(403, { "Content-Type": "text/plain" });
      res.end("Forbidden");
      return;
    }
    decodedSegments.push(decoded);
  }

  if (decodedSegments.length === 0) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  const relPath = decodedSegments.join("/");
  const absPath = resolveLocalPublicFile(relPath);
  if (!absPath) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(absPath);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  const contentType = getMimeType(absPath);
  const rangeHeader = typeof req.headers.range === "string" ? req.headers.range : undefined;

  if (rangeHeader) {
    const parsedRange = parseByteRange(rangeHeader, stat.size);
    if (parsedRange === "invalid") {
      res.writeHead(416, {
        "Content-Range": `bytes */${stat.size}`,
        "Content-Type": "text/plain",
      });
      res.end("Range Not Satisfiable");
      return;
    }

    const { start, end } = parsedRange;
    const chunkSize = end - start + 1;
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Content-Length": chunkSize,
      "Content-Type": contentType,
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    const stream = fs.createReadStream(absPath, { start, end });
    stream.on("error", () => {
      if (!res.headersSent) {
        res.writeHead(500);
      }
      res.end();
    });
    stream.pipe(res);
    return;
  }

  res.writeHead(200, {
    "Content-Length": stat.size,
    "Content-Type": contentType,
  });

  if (req.method === "HEAD" || stat.size === 0) {
    res.end();
    return;
  }

  const stream = fs.createReadStream(absPath);
  stream.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(500);
    }
    res.end();
  });
  stream.pipe(res);
}

/**
 * Starts (or returns existing) loopback HTTP server on `127.0.0.1:<ephemeral-port>`.
 */
export async function ensureLocalMediaServer(): Promise<{ baseUrl: string }> {
  if (activeServer) {
    return { baseUrl: activeServer.baseUrl };
  }

  if (!startPromise) {
    startPromise = new Promise<ActiveServerState>((resolve, reject) => {
      const server = http.createServer(handleLocalMediaRequest);
      server.once("error", (err) => {
        startPromise = null;
        reject(err);
      });
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          startPromise = null;
          reject(new Error("Failed to bind local media server to an IPv4 port"));
          return;
        }
        server.unref();
        const baseUrl = `http://127.0.0.1:${address.port}`;
        activeServer = { server, baseUrl };
        log.info(`Serving local worker media with 206 byte-range support on ${baseUrl}`);
        resolve(activeServer);
      });
    });
  }

  const state = await startPromise;
  return { baseUrl: state.baseUrl };
}

/**
 * Stops the loopback media server if running (useful in tests and graceful shutdown).
 */
export async function stopLocalMediaServer(): Promise<void> {
  const current = activeServer;
  activeServer = null;
  startPromise = null;
  if (!current) return;
  await new Promise<void>((resolve) => {
    current.server.close(() => resolve());
  });
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  if (val === null || typeof val !== "object" || Array.isArray(val)) return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

/**
 * Recursively rewrites string asset paths/URLs inside Remotion `inputProps` to
 * `http://127.0.0.1:<port>/local-media/...` whenever the file exists on local disk.
 * Remote-only assets (e.g., generated R2 audio/clips not present locally) remain untouched.
 */
export async function rewritePropsToLocalMedia<T>(
  inputProps: T
): Promise<{ props: T; rewrittenCount: number; baseUrl: string }> {
  const { baseUrl } = await ensureLocalMediaServer();
  let rewrittenCount = 0;

  function visit(node: unknown): unknown {
    if (typeof node === "string") {
      if (node.startsWith(`${baseUrl}/local-media/`)) {
        return node;
      }
      const rel = normalizeAssetRelPath(node);
      if (rel && resolveLocalPublicFile(node)) {
        rewrittenCount += 1;
        const encoded = rel
          .split("/")
          .map((seg) => encodeURIComponent(seg))
          .join("/");
        return `${baseUrl}/local-media/${encoded}`;
      }
      return node;
    }

    if (Array.isArray(node)) {
      return node.map((item) => visit(item));
    }

    if (isPlainObject(node)) {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) {
        out[k] = visit(v);
      }
      return out;
    }

    return node;
  }

  const props = visit(inputProps) as T;
  return { props, rewrittenCount, baseUrl };
}
