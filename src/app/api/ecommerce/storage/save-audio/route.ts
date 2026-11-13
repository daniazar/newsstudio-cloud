/**
 * src/app/api/ecommerce/storage/save-audio/route.ts
 *
 * Persistent Audio Storage API for E-Commerce Commercial Ads.
 * Uploads synthesized voiceovers to MinIO / active storage provider (S3 / Local / Azure)
 * and returns a permanent URL that survives browser refreshes.
 */

import { NextRequest, NextResponse } from "next/server";
import fs, { existsSync } from "fs";
import path from "path";
import { storage, withTenant } from "@/lib/storage";
import { requireTenant } from "@/lib/tenant";

export async function POST(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const contentType = req.headers.get("content-type") || "";
    let productId = "commercial";
    let sceneIndex = 0;
    let personaId = "ruby";
    let durationSeconds = 2.0;
    let cacheKey = "";
    let audioBuffer: Buffer | null = null;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      productId = body.productId || productId;
      sceneIndex = Number(body.sceneIndex ?? sceneIndex);
      personaId = body.personaId || personaId;
      durationSeconds = Number(body.durationSeconds ?? durationSeconds);
      cacheKey = body.cacheKey || "";

      if (body.audioBase64) {
        audioBuffer = Buffer.from(body.audioBase64, "base64");
      }
    } else if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      productId = (formData.get("productId") as string) || productId;
      sceneIndex = Number(formData.get("sceneIndex") || sceneIndex);
      personaId = (formData.get("personaId") as string) || personaId;
      durationSeconds = Number(formData.get("durationSeconds") || durationSeconds);
      cacheKey = (formData.get("cacheKey") as string) || "";

      const file = formData.get("audio") as File;
      if (file) {
        const bytes = await file.arrayBuffer();
        audioBuffer = Buffer.from(bytes);
      }
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return NextResponse.json(
        { success: false, error: "No audio data provided (audioBase64 or file is required)" },
        { status: 400 }
      );
    }

    const companyId = orgId;

    const safeProdId = productId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safePersona = personaId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const timestamp = Date.now();
    const relativeKey = `ecommerce/${safeProdId}/audio/scene_${sceneIndex}_${safePersona}_${timestamp}.wav`;
    const storageKey = withTenant(companyId, relativeKey);

    // Upload to MinIO / active storage provider
    const publicUrl = await storage.upload(storageKey, audioBuffer, "audio/wav");

    return NextResponse.json({
      success: true,
      url: publicUrl,
      storageKey,
      durationSeconds,
      cacheKey,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/ecommerce/storage/save-audio] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const body = await req.json().catch(() => ({}));
    const { audioUrl, storageKey } = body;

    let deletedKey: string | null = null;

    if (storageKey && typeof storageKey === "string") {
      const key = storageKey.startsWith(`tenants/${orgId}/`) ? storageKey : withTenant(orgId, storageKey);
      await storage.delete(key).catch((e) => console.warn(`[DELETE /save-audio] Key delete warning:`, e));
      deletedKey = key;
    }

    if (audioUrl && typeof audioUrl === "string") {
      let key = "";
      if (audioUrl.includes("/tenants/")) {
        key = `tenants/${audioUrl.split("/tenants/")[1].split("?")[0]}`;
      } else if (audioUrl.includes("/assets/")) {
        key = audioUrl.split("/assets/")[1].split("?")[0];
      } else if (audioUrl.includes("/news-studio/")) {
        key = audioUrl.split("/news-studio/")[1].split("?")[0];
      } else if (audioUrl.startsWith("tenants/")) {
        key = audioUrl.split("?")[0];
      }

      if (audioUrl.startsWith("/storage/") || audioUrl.startsWith("storage/")) {
        const localPath = path.join(process.cwd(), "public", audioUrl.replace(/^\/+/, ""));
        if (existsSync(localPath)) {
          await fs.promises.unlink(localPath).catch(() => {});
        }
      }

      if (key) {
        if (!key.startsWith(`tenants/${orgId}/`)) {
          key = withTenant(orgId, key);
        }
        await storage.delete(key).catch((e) => console.warn(`[DELETE /save-audio] audioUrl key delete warning:`, e));
        deletedKey = key;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Audio cache and storage file deleted",
      deletedKey,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[DELETE /api/ecommerce/storage/save-audio] Error:", msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

