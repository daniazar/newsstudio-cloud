import { NextRequest, NextResponse } from "next/server";
import { requireTenant } from "@/lib/tenant";
import { storage, withTenant } from "@/lib/storage";

/**
 * POST /api/upload/presign
 * Generates direct presigned S3/R2 upload or download URLs.
 * Authenticates via Clerk tenant session or x-worker-key header.
 */
export async function POST(req: NextRequest) {
  try {
    const workerKeyHeader = req.headers.get("x-worker-key");
    const configuredWorkerKey = process.env.WORKER_API_KEY;
    const isWorker = Boolean(
      configuredWorkerKey &&
      workerKeyHeader &&
      workerKeyHeader === configuredWorkerKey
    );

    let orgId: string | null = null;

    if (!isWorker) {
      const t = await requireTenant();
      if (!t.ok) {
        return t.response;
      }
      orgId = t.tenant.orgId;
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { key, contentType = "application/octet-stream", action = "put" } = body;

    if (!key || typeof key !== "string" || key.trim() === "") {
      return NextResponse.json({ error: "Missing or invalid 'key'" }, { status: 400 });
    }

    // Guard against path traversal
    if (key.includes("..")) {
      return NextResponse.json({ error: "Invalid path: traversal detected" }, { status: 400 });
    }

    if (action !== "put" && action !== "get") {
      return NextResponse.json({ error: "Invalid 'action': must be 'put' or 'get'" }, { status: 400 });
    }

    let finalKey = key.trim();
    if (!isWorker && orgId) {
      // Enforce tenant scoping for user / tenant calls
      finalKey = withTenant(orgId, finalKey);
    } else if (isWorker && (body.companyId || body.orgId)) {
      finalKey = withTenant(body.companyId || body.orgId, finalKey);
    } else {
      finalKey = finalKey.replace(/^\/+/, "");
    }

    let url: string;
    if (action === "get") {
      url = await storage.getPresignedReadUrl(finalKey);
    } else {
      url = await storage.getPresignedUploadUrl(finalKey, contentType);
    }

    const publicUrl = storage.getUrl(finalKey);

    return NextResponse.json({
      url,
      publicUrl,
      key: finalKey,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
