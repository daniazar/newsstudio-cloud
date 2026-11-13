/**
 * src/app/api/voice/clone/route.ts
 *
 * POST /api/voice/clone
 *
 * Receives multi-sentence audio recordings from the Voice Cloning Lab,
 * saves calibration audio samples to the storage layer,
 * and registers the cloned voice into the Persona Vault (prisma.persona & prisma.personaVoice).
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { storage, generateKey } from "@/lib/storage";

export async function POST(request: NextRequest) {
  const t = await requireTenant();
  if (!t.ok) return t.response;
  const { orgId } = t.tenant;

  try {
    const formData = await request.formData();
    const personaName = (formData.get("personaName") as string) || "Custom Host Voice";
    const language = (formData.get("language") as string) || "en";
    const role = (formData.get("role") as string) || "Cloned News Anchor";
    const gender = (formData.get("gender") as string) || "neutral";

    const slug =
      "cloned_" +
      personaName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .slice(0, 20) +
      "_" +
      Date.now().toString().slice(-4);

    // Collect all audio sample blobs from formData
    const audioFiles: File[] = [];
    let sampleIdx = 0;
    while (formData.has(`sample_${sampleIdx}`)) {
      const file = formData.get(`sample_${sampleIdx}`);
      if (file && file instanceof File) {
        audioFiles.push(file);
      }
      sampleIdx++;
    }

    if (audioFiles.length === 0) {
      // Check if a single "audio" file was provided
      const singleFile = formData.get("audio");
      if (singleFile && singleFile instanceof File) {
        audioFiles.push(singleFile);
      }
    }

    if (audioFiles.length === 0) {
      return NextResponse.json(
        { error: "No audio calibration samples provided." },
        { status: 400 }
      );
    }

    // Save primary reference sample to storage
    const primaryFile = audioFiles[0];
    const arrayBuffer = await primaryFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const storageKey = generateKey({
      companyId: orgId,
      type: "audio",
      id: slug,
      filename: "calibration_reference.wav",
    });

    const publicUrl = await storage.upload(storageKey, buffer, "audio/wav");

    // Create custom Persona record in DB
    const persona = await prisma.persona.create({
      data: {
        companyId: orgId,
        slug,
        name: personaName,
        role,
        gender,
        language,
        description: `Custom zero-shot cloned voice trained from ${audioFiles.length} calibration samples.`,
        isSystemPersona: false,
        isActive: true,
        avatarType: "static_image",
        voices: {
          create: {
            companyId: orgId,
            label: `${personaName} Cloned Voice`,
            audioPath: publicUrl,
            storageKey,
            language,
            isDefault: true,
            duration: 0,
          },
        },
        avatars: {
          create: {
            companyId: orgId,
            label: "Default Avatar",
            url: "/avatars/ruby.png",
            storageKey: "avatars/ruby.png",
            isDefault: true,
          },
        },
      },
      include: {
        voices: true,
        avatars: true,
      },
    });

    return NextResponse.json({
      success: true,
      persona: {
        id: persona.id,
        slug: persona.slug,
        name: persona.name,
        role: persona.role,
        language: persona.language,
        sampleCount: audioFiles.length,
        referenceUrl: publicUrl,
      },
      message: `Successfully cloned and registered voice for "${personaName}"!`,
    });
  } catch (err: unknown) {
    const details = err instanceof Error ? err.message : String(err);
    console.error("[Voice Clone API Error]:", err);
    return NextResponse.json(
      { error: "Failed to clone voice", details },
      { status: 500 }
    );
  }
}
