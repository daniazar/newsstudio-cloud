/**
 * scripts/gemini-cli/dbRegistrar.ts
 *
 * Automatic Database & Asset Vault Registration for Generated Master Images.
 * Directly inserts generated keyframes/plates into Prisma DB (PersonaMasterImage & PersonaAvatar).
 */

import { prisma } from "../../src/lib/prisma";
import { Persona } from "../../src/lib/tts/personas";
import path from "path";
import fs from "fs";

export interface RegisterMasterImageParams {
  persona: Persona;
  attire: string;
  poseType?: "seated_desk" | "standing_mic";
  promptUsed: string;
  imageFilePath: string;
  isTransparent?: boolean;
  isDefault?: boolean;
}

export async function registerImageToDatabase(params: RegisterMasterImageParams): Promise<boolean> {
  const { persona, attire, poseType = "seated_desk", promptUsed, imageFilePath, isTransparent = false, isDefault = false } = params;

  try {
    const filename = path.basename(imageFilePath);
    const storageKey = `avatars/${persona.id}/master_images/${filename}`;

    // Ensure company exists
    const company = await prisma.company.findFirst();
    const companyId = company?.id || "default-org";

    // Find or create DB Persona
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

    // Insert PersonaMasterImage
    const masterImage = await prisma.personaMasterImage.create({
      data: {
        personaId: dbPersona.id,
        attire,
        poseType,
        promptUsed,
        storageKey,
        url: `/avatars/${persona.id}/master_images/${filename}`,
        isTransparent,
        isDefault,
      },
    });

    // Also register as a PersonaAvatar candidate
    await prisma.personaAvatar.create({
      data: {
        companyId,
        personaId: dbPersona.id,
        label: `${attire} (${poseType})`,
        url: `/avatars/${persona.id}/master_images/${filename}`,
        storageKey,
        frameType: poseType === "standing_mic" ? "full_body" : "portrait",
        promptUsed,
      },
    });

    console.log(`\n💾 Successfully registered master image to Prisma Database!`);
    console.log(`   ID:          ${masterImage.id}`);
    console.log(`   Persona:     ${persona.name} [${dbPersona.slug}]`);
    console.log(`   Storage Key: ${storageKey}`);
    console.log(`   Status:      Visible immediately in Video Editor & Persona Vault\n`);
    return true;
  } catch (err: any) {
    console.warn(`⚠️ Warning: Could not register image to database:`, err.message || err);
    return false;
  }
}
