/**
 * src/lib/wardrobe/personaLooks.ts
 *
 * Phase 5: "Save as Persona Look" Broadcast Integration.
 *
 * Manages the data model and storage persistence for configured, styled,
 * and inpainted persona looks across broadcast categories and motion beats.
 * Supports Full-Mesh FSM Multi-Loop Sets (M1 base, M2 explanatory, M3 welcoming).
 * Integrates dual-persistence via SQLite/Prisma (PersonaAvatar with frameType: "action_loop")
 * and filesystem synchronization (public/avatars/{personaId}/saved_looks.json).
 */

import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  PersonaLook,
  CreatePersonaLookInput,
  PersonaLookLoopItem,
  PoseTag,
  PersonaLookCategory,
} from "./personaLookTypes";

// ========================================================
// 1. RE-EXPORT TYPES, SCHEMAS & RESOLVERS
// ========================================================

export * from "./personaLookTypes";

// ========================================================
// 2. FILESYSTEM PERSISTENCE HELPERS & FILE MUTEX
// ========================================================

// In-memory mutex map to serialize file read/write operations per persona and prevent concurrency races
const fileLocks = new Map<string, Promise<unknown>>();

export async function withFileLock<T>(personaId: string, fn: () => Promise<T>): Promise<T> {
  const safePersonaId = personaId.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const currentLock = fileLocks.get(safePersonaId) || Promise.resolve();
  let release: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  fileLocks.set(safePersonaId, currentLock.then(() => nextLock, () => nextLock));

  await currentLock;
  try {
    return await fn();
  } finally {
    release!();
  }
}

export function getSavedLooksFilePath(personaId: string): string {
  const safePersonaId = personaId.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return path.join(process.cwd(), "public", "avatars", safePersonaId, "saved_looks.json");
}

export async function readLooksFromFile(personaId: string): Promise<PersonaLook[]> {
  try {
    const filePath = getSavedLooksFilePath(personaId);
    let content: string;
    try {
      content = await fs.readFile(filePath, "utf-8");
    } catch {
      // File not found or unreadable yet
      return [];
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (parseErr) {
      console.warn(`[readLooksFromFile] Corrupted JSON in ${filePath}. Creating backup.`, parseErr);
      const backupPath = `${filePath}.corrupted.${Date.now()}.bak`;
      await fs.writeFile(backupPath, content, "utf-8").catch(() => {});
      return [];
    }

    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        // Normalize single-loop looks to multi-loop set schema
        const primary = item.primaryVideoUrl || item.videoUrl || "";
        const pose = (item.poseTag as PoseTag) || "M1";
        const loops: Record<string, PersonaLookLoopItem> =
          item.loops && Object.keys(item.loops).length > 0
            ? item.loops
            : {
                [pose]: {
                  poseTag: pose,
                  actionName:
                    pose === "M2"
                      ? "state_explanatory_right"
                      : pose === "M3"
                      ? "state_intro_welcome"
                      : "state_idle",
                  videoUrl: primary,
                  isPrimary: true,
                },
              };

        return {
          ...item,
          videoUrl: primary,
          primaryVideoUrl: primary,
          loops,
          poseTag: pose,
          updatedAt: item.updatedAt || item.createdAt || new Date().toISOString(),
        };
      });
    }
    return [];
  } catch {
    return [];
  }
}

export async function writeLooksToFile(personaId: string, looks: PersonaLook[]): Promise<void> {
  const filePath = getSavedLooksFilePath(personaId);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(looks, null, 2), "utf-8");
}

// ========================================================
// 3. PERSISTENCE ENGINE (PRISMA + FILE DUAL-SYNC)
// ========================================================

/**
 * Saves a persona look metadata into SQLite/Prisma and synchronizes
 * with public/avatars/{personaId}/saved_looks.json.
 */
export async function savePersonaLook(lookInput: CreatePersonaLookInput): Promise<PersonaLook> {
  const id =
    lookInput.id ||
    `look_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const createdAt = lookInput.createdAt || new Date().toISOString();
  const updatedAt = lookInput.updatedAt || new Date().toISOString();

  // Populate multi-loop set
  const loops: Record<string, PersonaLookLoopItem> = lookInput.loops ? { ...lookInput.loops } : {};
  const activeVideoUrl = lookInput.videoUrl || lookInput.primaryVideoUrl || "";
  const initialPose = (lookInput.poseTag as PoseTag) || "M1";

  if (Object.keys(loops).length === 0 && activeVideoUrl) {
    const defaultAction =
      initialPose === "M2"
        ? "state_explanatory_right"
        : initialPose === "M3"
        ? "state_intro_welcome"
        : initialPose === "M4"
        ? "state_emphasis_nod"
        : initialPose === "M5"
        ? "state_side_turn"
        : "state_idle";

    loops[initialPose] = {
      poseTag: initialPose,
      actionName: defaultAction,
      videoUrl: activeVideoUrl,
      isPrimary: true,
    };
  }

  const primaryVideoUrl =
    lookInput.primaryVideoUrl ||
    loops[initialPose]?.videoUrl ||
    loops.M1?.videoUrl ||
    Object.values(loops)[0]?.videoUrl ||
    activeVideoUrl;

  const look: PersonaLook = {
    id,
    personaId: lookInput.personaId,
    lookName: lookInput.lookName.trim(),
    category: lookInput.category,
    videoUrl: primaryVideoUrl,
    primaryVideoUrl,
    loops,
    thumbnailUrl: lookInput.thumbnailUrl,
    outfitName: lookInput.outfitName,
    outfitId: lookInput.outfitId,
    hairstyleName: lookInput.hairstyleName,
    hairstyleId: lookInput.hairstyleId,
    hairColorSwatch: lookInput.hairColorSwatch,
    lightingPreset: lookInput.lightingPreset,
    poseTag: initialPose,
    isDefault: Boolean(lookInput.isDefault),
    createdAt,
    updatedAt,
    metadata: lookInput.metadata || {},
  };

  // 1. Filesystem sync (serialized via withFileLock)
  try {
    await withFileLock(look.personaId, async () => {
      const fileLooks = await readLooksFromFile(look.personaId);
      let updatedFileLooks = fileLooks.map((item) => {
        if (look.isDefault) {
          return { ...item, isDefault: false };
        }
        return item;
      });

      const existingIndex = updatedFileLooks.findIndex((l) => l.id === look.id);
      if (existingIndex >= 0) {
        // Merge loops if updating existing look
        const existing = updatedFileLooks[existingIndex];
        look.loops = { ...existing.loops, ...look.loops };
        // Preserve original primaryVideoUrl if not explicitly overridden
        if (!lookInput.primaryVideoUrl && existing.primaryVideoUrl) {
          look.primaryVideoUrl = existing.primaryVideoUrl;
          look.videoUrl = existing.primaryVideoUrl;
        }
        updatedFileLooks[existingIndex] = look;
      } else {
        updatedFileLooks = [look, ...updatedFileLooks];
      }

      await writeLooksToFile(look.personaId, updatedFileLooks);
    });
  } catch (fsErr) {
    console.warn("[savePersonaLook] File sync warning:", fsErr);
  }

  // 2. Prisma sync
  try {
    if (prisma?.persona && prisma?.personaAvatar) {
      const personaRecord = await prisma.persona.findFirst({
        where: {
          OR: [{ id: look.personaId }, { slug: look.personaId }],
        },
        select: { id: true, companyId: true },
      });

      if (personaRecord) {
        if (look.isDefault) {
          await prisma.personaAvatar.updateMany({
            where: {
              personaId: personaRecord.id,
              frameType: "action_loop",
            },
            data: { isDefault: false },
          });
        }

        const promptPayload = JSON.stringify({
          lookId: look.id,
          category: look.category,
          primaryVideoUrl: look.primaryVideoUrl,
          loops: look.loops,
          thumbnailUrl: look.thumbnailUrl,
          outfitName: look.outfitName,
          outfitId: look.outfitId,
          hairstyleName: look.hairstyleName,
          hairstyleId: look.hairstyleId,
          hairColorSwatch: look.hairColorSwatch,
          lightingPreset: look.lightingPreset,
          poseTag: look.poseTag,
          createdAt: look.createdAt,
          updatedAt: look.updatedAt,
          metadata: look.metadata,
        });

        const avatarData = {
          companyId: personaRecord.companyId,
          personaId: personaRecord.id,
          label: look.lookName,
          url: look.primaryVideoUrl,
          storageKey: look.primaryVideoUrl,
          frameType: "action_loop",
          presetName: look.category,
          promptUsed: promptPayload,
          isDefault: Boolean(look.isDefault),
        };

        const promptLookIdMatch = `"\"lookId\":\"${look.id}\""`;
        const existingAvatar = await prisma.personaAvatar.findFirst({
          where: {
            OR: [
              { id: look.id },
              { promptUsed: { contains: promptLookIdMatch } },
            ],
          },
        });

        if (existingAvatar) {
          if (existingAvatar.promptUsed) {
            try {
              const prev = JSON.parse(existingAvatar.promptUsed);
              if (prev.loops) {
                look.loops = { ...prev.loops, ...look.loops };
              }
              if (!lookInput.primaryVideoUrl && prev.primaryVideoUrl) {
                look.primaryVideoUrl = prev.primaryVideoUrl;
                look.videoUrl = prev.primaryVideoUrl;
              }
            } catch {
              // ignore
            }
          }
          await prisma.personaAvatar.update({
            where: { id: existingAvatar.id },
            data: avatarData,
          });
        } else {
          await prisma.personaAvatar.create({
            data: {
              id: look.id,
              ...avatarData,
            },
          });
        }
      }
    }
  } catch (prismaErr) {
    console.warn("[savePersonaLook] Prisma persistence warning (relying on file sync):", prismaErr);
  }

  return look;
}

/**
 * Retrieves all saved looks for a given persona.
 * Merges filesystem cache with Prisma database entries.
 */
export async function getPersonaLooks(personaId: string): Promise<PersonaLook[]> {
  const looksMap = new Map<string, PersonaLook>();

  // 1. Read from filesystem first (fast, reliable)
  try {
    const fileLooks = await readLooksFromFile(personaId);
    for (const l of fileLooks) {
      looksMap.set(l.id, l);
    }
  } catch (fsErr) {
    console.warn("[getPersonaLooks] File read warning:", fsErr);
  }

  // 2. Fetch from Prisma and merge
  try {
    if (prisma?.persona && prisma?.personaAvatar) {
      const personaRecords = await prisma.persona.findMany({
        where: {
          OR: [{ id: personaId }, { slug: personaId }],
        },
        select: { id: true },
      });

      const personaDbIds = personaRecords.map((p) => p.id);
      if (personaDbIds.length > 0) {
        const avatars = await prisma.personaAvatar.findMany({
          where: {
            personaId: { in: personaDbIds },
            frameType: "action_loop",
          },
          orderBy: { createdAt: "desc" },
        });

        for (const av of avatars) {
          let parsed: Record<string, unknown> = {};
          if (av.promptUsed) {
            try {
              parsed = JSON.parse(av.promptUsed);
            } catch {
              // ignore
            }
          }

          const lookId = (parsed.lookId as string) || av.id;
          const primary = (parsed.primaryVideoUrl as string) || av.url;
          const pose = (parsed.poseTag as PoseTag) || "M1";
          const rawLoops = parsed.loops as Record<string, PersonaLookLoopItem> | undefined;
          const loops: Record<string, PersonaLookLoopItem> =
            rawLoops && Object.keys(rawLoops).length > 0
              ? rawLoops
              : {
                  [pose]: {
                    poseTag: pose,
                    actionName:
                      pose === "M2"
                        ? "state_explanatory_right"
                        : pose === "M3"
                        ? "state_intro_welcome"
                        : "state_idle",
                    videoUrl: primary,
                    isPrimary: true,
                  },
                };

          const look: PersonaLook = {
            id: lookId,
            personaId,
            lookName: av.label,
            category:
              (av.presetName as PersonaLookCategory) ||
              (parsed.category as PersonaLookCategory) ||
              "prime_time",
            videoUrl: primary,
            primaryVideoUrl: primary,
            loops,
            thumbnailUrl: (parsed.thumbnailUrl as string) || undefined,
            outfitName: (parsed.outfitName as string) || av.label,
            outfitId: (parsed.outfitId as string) || undefined,
            hairstyleName: (parsed.hairstyleName as string) || undefined,
            hairstyleId: (parsed.hairstyleId as string) || undefined,
            hairColorSwatch: (parsed.hairColorSwatch as string) || undefined,
            lightingPreset: (parsed.lightingPreset as string) || undefined,
            poseTag: pose,
            isDefault: av.isDefault,
            createdAt: (parsed.createdAt as string) || av.createdAt.toISOString(),
            updatedAt: (parsed.updatedAt as string) || av.createdAt.toISOString(),
            metadata: (parsed.metadata as Record<string, unknown>) || undefined,
          };

          // If file already had it, merge loops and pick newest data
          const existing = looksMap.get(look.id);
          if (existing) {
            const fileUpdated = new Date(existing.updatedAt || existing.createdAt).getTime();
            const prismaUpdated = new Date(look.updatedAt || look.createdAt).getTime();
            const primaryLook = fileUpdated > prismaUpdated ? existing : look;
            const secondaryLook = fileUpdated > prismaUpdated ? look : existing;
            looksMap.set(look.id, {
              ...secondaryLook,
              ...primaryLook,
              loops: { ...secondaryLook.loops, ...primaryLook.loops },
            });
          } else {
            looksMap.set(look.id, look);
          }
        }
      }
    }
  } catch (prismaErr) {
    console.warn("[getPersonaLooks] Prisma fetch warning (using file cache):", prismaErr);
  }

  const allLooks = Array.from(looksMap.values());

  // Sort by default first, then descending createdAt
  return allLooks.sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * Deletes a persona look by ID from both filesystem and Prisma.
 * Uses withFileLock to serialize concurrent file mutations.
 */
export async function deletePersonaLook(lookId: string, personaId?: string): Promise<boolean> {
  let deletedFromFile = false;

  if (personaId) {
    await withFileLock(personaId, async () => {
      const looks = await readLooksFromFile(personaId);
      const filtered = looks.filter((l) => l.id !== lookId);
      if (filtered.length !== looks.length) {
        await writeLooksToFile(personaId, filtered);
        deletedFromFile = true;
      }
    });
  } else {
    try {
      const avatarsDir = path.join(process.cwd(), "public", "avatars");
      const entries = await fs.readdir(avatarsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pId = entry.name;
          await withFileLock(pId, async () => {
            const looks = await readLooksFromFile(pId);
            const filtered = looks.filter((l) => l.id !== lookId);
            if (filtered.length !== looks.length) {
              await writeLooksToFile(pId, filtered);
              deletedFromFile = true;
            }
          });
          if (deletedFromFile) break;
        }
      }
    } catch {
      // ignore
    }
  }

  let deletedFromPrisma = false;
  try {
    if (prisma?.personaAvatar) {
      const promptLookIdMatch = `"\"lookId\":\"${lookId}\""`;
      const res = await prisma.personaAvatar.deleteMany({
        where: {
          OR: [{ id: lookId }, { promptUsed: { contains: promptLookIdMatch } }],
        },
      });
      if (res.count > 0) {
        deletedFromPrisma = true;
      }
    }
  } catch {
    // ignore
  }

  return deletedFromFile || deletedFromPrisma;
}

/**
 * Sets a specific persona look as default, clearing any previous default.
 * Synchronizes across filesystem and Prisma atomically.
 */
export async function setDefaultPersonaLook(
  personaId: string,
  lookId: string
): Promise<boolean> {
  let foundInFile = false;
  try {
    await withFileLock(personaId, async () => {
      const looks = await readLooksFromFile(personaId);
      const updated = looks.map((l) => {
        if (l.id === lookId) {
          foundInFile = true;
          return { ...l, isDefault: true };
        }
        return { ...l, isDefault: false };
      });

      if (foundInFile) {
        await writeLooksToFile(personaId, updated);
      }
    });
  } catch (fsErr) {
    console.warn("[setDefaultPersonaLook] File update warning:", fsErr);
  }

  let updatedInPrisma = false;
  try {
    if (prisma?.persona && prisma?.personaAvatar) {
      const personaRecord = await prisma.persona.findFirst({
        where: {
          OR: [{ id: personaId }, { slug: personaId }],
        },
        select: { id: true },
      });

      if (personaRecord) {
        await prisma.personaAvatar.updateMany({
          where: {
            personaId: personaRecord.id,
            frameType: "action_loop",
          },
          data: { isDefault: false },
        });

        const promptLookIdMatch = `"\"lookId\":\"${lookId}\""`;
        const updateRes = await prisma.personaAvatar.updateMany({
          where: {
            personaId: personaRecord.id,
            OR: [{ id: lookId }, { promptUsed: { contains: promptLookIdMatch } }],
          },
          data: { isDefault: true },
        });

        if (updateRes.count > 0) {
          updatedInPrisma = true;
        }
      }
    }
  } catch (prismaErr) {
    console.warn("[setDefaultPersonaLook] Prisma update warning:", prismaErr);
  }

  // If set in Prisma but wasn't in file, ensure any existing file default is cleared
  if (!foundInFile && updatedInPrisma) {
    try {
      await withFileLock(personaId, async () => {
        const fileLooks = await readLooksFromFile(personaId);
        const resetLooks = fileLooks.map((l) => ({ ...l, isDefault: false }));
        await writeLooksToFile(personaId, resetLooks);
      });
    } catch {}
  }

  return foundInFile || updatedInPrisma;
}
