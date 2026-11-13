/**
 * scripts/veo-cli/dbRegistrar.ts
 *
 * Automatic Database & Asset Vault Registration for Generated Veo Video Loops.
 * Directly inserts generated action clips into Prisma DB (PersonaActionLoop).
 */

import { prisma } from "../../src/lib/prisma";
import { Persona } from "../../src/lib/tts/personas";
import path from "path";

export interface RegisterActionLoopParams {
  persona: Persona;
  actionName: string;
  actionPrompt: string;
  videoFilePath: string;
  durationSec?: number;
  fps?: number;
  latentsCacheKey?: string;
  coordsCacheKey?: string;
}

export async function registerVideoLoopToDatabase(params: RegisterActionLoopParams): Promise<boolean> {
  const {
    persona,
    actionName,
    actionPrompt,
    videoFilePath,
    durationSec = 2.0,
    fps = 30,
    latentsCacheKey,
    coordsCacheKey,
  } = params;

  try {
    const filename = path.basename(videoFilePath);
    const storageKey = `assets/action_loops/veo/${persona.id}/${filename}`;

    const company = await prisma.company.findFirst();
    const companyId = company?.id || "default-org";

    let dbPersona = await prisma.persona.findUnique({
      where: { slug: persona.id.toLowerCase() },
    });

    if (!dbPersona) {
      dbPersona = await prisma.persona.create({
        data: {
          companyId,
          slug: persona.id.toLowerCase(),
          name: persona.name,
          role: persona.title || "News Anchor",
          gender: persona.gender,
          language: persona.language,
          description: persona.description,
          bio: persona.bio,
          systemPrompt: persona.systemPrompt,
        },
      });
    }

    // Find or create default master image for this persona
    let masterImg = await prisma.personaMasterImage.findFirst({
      where: { personaId: dbPersona.id },
    });

    if (!masterImg) {
      masterImg = await prisma.personaMasterImage.create({
        data: {
          personaId: dbPersona.id,
          attire: "default_attire",
          poseType: "seated_desk",
          storageKey: `avatars/${persona.id}/master_images/default.jpg`,
          isTransparent: false,
        },
      });
    }

    // Register PersonaActionLoop
    const frameCount = Math.round(durationSec * fps);
    await prisma.personaActionLoop.create({
      data: {
        personaId: dbPersona.id,
        masterImageId: masterImg.id,
        actionName,
        actionPrompt,
        durationSec,
        frameCount,
        fps,
        pingPongVideoKey: storageKey,
        latentsCacheKey,
        coordsCacheKey,
        isPreCached: !!latentsCacheKey,
      },
    });

    console.log(`\x1b[32m✔ Registered Veo action loop '${actionName}' to Prisma database (PersonaActionLoop)!\x1b[0m`);
    return true;
  } catch (err: any) {
    console.warn(`⚠️ Warning: Could not register video to DB (offline/mock):`, err.message || err);
    return false;
  }
}
