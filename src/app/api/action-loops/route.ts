import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { createLogger } from "@/lib/logger";
import {
  resolveLocalAvatarsDir,
  resolveLocalPublicFile,
  resolveLocalVeoDir,
} from "@/lib/storage/localAssets";

const log = createLogger("api:action-loops");

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const personaParam = (searchParams.get("persona") || "ruby").toLowerCase();
    const typeFilter = searchParams.get("type"); // "loop" | "transition" | "dynamic_loop"
    const poseFilter = searchParams.get("pose"); // "M1" | "M2" | ...

    const veoDir = resolveLocalVeoDir();
    interface ManifestEntry {
      outputName: string;
      type?: string;
      startPose?: string;
      endPose?: string;
      duration?: number;
      fps?: number;
      totalFrames?: number;
      sizeBytes?: number;
      sha256?: string;
      peakEndSsim?: number | null;
      trimmedFrames?: number;
      emotion?: string | null;
      rhetoricAction?: string | null;
      energyLevel?: string | null;
      poseState?: string;
    }

    interface ActionLoopItem {
      id: string;
      persona: string;
      attire: string;
      name: string;
      type: string;
      startPose?: string;
      endPose?: string;
      videoUrl: string;
      duration?: number;
      totalFrames?: number;
      fps?: number;
      sizeBytes?: number;
      sha256?: string | null;
      peakEndSsim?: number | null;
      trimmedFrames?: number;
      emotion?: string | null;
      rhetoricAction?: string | null;
      energyLevel?: string | null;
      poseState?: string;
    }

    let items: ActionLoopItem[] = [];

    function isSameAttire(a: string, b: string): boolean {
      if (a.toLowerCase() === b.toLowerCase()) return true;
      const cleanA = a.toLowerCase().replace(/[^a-z0-9]/g, "");
      const cleanB = b.toLowerCase().replace(/[^a-z0-9]/g, "");
      return cleanA.includes(cleanB) || cleanB.includes(cleanA);
    }

    // 1. Discover manifests from local filesystem (dev only — public/ doesn't exist in cloud containers)
    if (process.env.NODE_ENV !== "production" && fs.existsSync(veoDir)) {
      const entries = fs.readdirSync(veoDir, { withFileTypes: true });
      for (const ent of entries) {
        const isTargetDir =
          ent.isDirectory() &&
          !ent.name.toLowerCase().includes("backup") &&
          (ent.name.toLowerCase() === personaParam || ent.name.toLowerCase().startsWith(`${personaParam}_`));

        if (isTargetDir) {
          const dirPath = path.join(veoDir, ent.name);
          const manifestPath = path.join(dirPath, "manifest.json");
          const attire = ent.name.replace(new RegExp(`^${personaParam}_?`, "i"), "") || "default";

          if (fs.existsSync(manifestPath)) {
            try {
              const raw = fs.readFileSync(manifestPath, "utf-8");
              const manifest = JSON.parse(raw);

              for (const [id, entry] of Object.entries(manifest) as [string, ManifestEntry][]) {
                const videoUrl = `/assets/action_loops/veo/${ent.name}/${entry.outputName}`;
                items.push({
                  id,
                  persona: personaParam,
                  attire,
                  name: entry.outputName.replace(/\.mp4$/, ""),
                  type: entry.type || (id.startsWith("T") ? "transition" : "loop"),
                  startPose: entry.startPose,
                  endPose: entry.endPose,
                  videoUrl,
                  duration: entry.duration || 8.0,
                  totalFrames: entry.totalFrames || Math.round((entry.duration || 8.0) * (entry.fps || 24)),
                  fps: entry.fps || 24,
                  sizeBytes: entry.sizeBytes,
                  sha256: entry.sha256,
                  peakEndSsim: entry.peakEndSsim ?? null,
                  trimmedFrames: entry.trimmedFrames ?? 0,
                  emotion: entry.emotion || null,
                  rhetoricAction: entry.rhetoricAction || null,
                  energyLevel: entry.energyLevel || null,
                  poseState: entry.poseState || entry.startPose || "M1",
                });
              }
            } catch (err) {
              log.error(
                `Error reading manifest for ${ent.name}: ${err instanceof Error ? err.message : String(err)}`
              );
            }
          } else {
            const canonicalMp4s = fs
              .readdirSync(dirPath)
              .filter((f) => f.toLowerCase().endsWith(".mp4") && !f.includes("__"))
              .sort((a, b) => a.localeCompare(b));

            for (const filename of canonicalMp4s) {
              const clipId = filename
                .replace(/\.mp4$/i, "")
                .replace(new RegExp(`^${ent.name}_`, "i"), "");
              const transMatch = clipId.match(/^T(\d+)_to_(\d+)/i);
              const poseMatch = clipId.match(/^(M\d+)/i);
              const startPose = transMatch
                ? `M${transMatch[1]}`
                : poseMatch
                  ? poseMatch[1].toUpperCase()
                  : "M1";
              const endPose = transMatch ? `M${transMatch[2]}` : startPose;
              const type = transMatch
                ? "transition"
                : clipId.toLowerCase().includes("_loop")
                  ? "loop"
                  : "dynamic_loop";
              let sizeBytes: number | undefined;
              try {
                sizeBytes = fs.statSync(path.join(dirPath, filename)).size;
              } catch {}

              items.push({
                id: clipId,
                persona: personaParam,
                attire,
                name: filename.replace(/\.mp4$/i, ""),
                type,
                startPose,
                endPose,
                videoUrl: `/assets/action_loops/veo/${ent.name}/${filename}`,
                duration: 8.0,
                totalFrames: 192,
                fps: 24,
                sizeBytes,
                sha256: null,
                peakEndSsim: null,
                trimmedFrames: 0,
                emotion: null,
                rhetoricAction: null,
                energyLevel: null,
                poseState: startPose,
              });
            }
          }
        }
      }
    }

    // 2. Query database for PersonaActionLoops (primary source in cloud; supplementary in dev)
    try {
      const dbLoops = await prisma.personaActionLoop.findMany({
        where: {
          persona: {
            slug: personaParam,
          },
        },
        include: {
          masterImage: true,
        },
      });

      const existingIds = new Set(items.map((it) => it.id));
      for (const dbLoop of dbLoops) {
        // Only add if not already in items from manifest
        if (!existingIds.has(dbLoop.actionName)) {
          existingIds.add(dbLoop.actionName);
          const transMatch = dbLoop.actionName.match(/^T(\d+)_to_(\d+)/i);
          const poseMatch = dbLoop.actionName.match(/^(M\d+)/i);
          const derivedStartPose = transMatch
            ? `M${transMatch[1]}`
            : poseMatch
              ? poseMatch[1].toUpperCase()
              : (dbLoop.poseState || dbLoop.masterImage?.poseType || "M1");
          const derivedEndPose = transMatch ? `M${transMatch[2]}` : derivedStartPose;
          const derivedType = transMatch
            ? "transition"
            : dbLoop.actionName.toLowerCase().includes("_loop")
              ? "loop"
              : "dynamic_loop";
          const cleanKey = dbLoop.pingPongVideoKey
            ? dbLoop.pingPongVideoKey.replace(/^\/+/, "")
            : "";
          const videoUrl = cleanKey
            ? cleanKey.startsWith("assets/") || cleanKey.startsWith("avatars/")
              ? `/${cleanKey}`
              : storage.getUrl(cleanKey)
            : "";

          items.push({
            id: dbLoop.actionName,
            persona: personaParam,
            attire: dbLoop.masterImage?.attire || "default",
            name: dbLoop.actionName,
            type: derivedType,
            startPose: derivedStartPose,
            endPose: derivedEndPose,
            videoUrl,
            duration: dbLoop.durationSec,
            totalFrames: dbLoop.frameCount,
            fps: dbLoop.fps,
            sizeBytes: 0,
            sha256: dbLoop.latentsCacheKey || undefined,
            peakEndSsim: null,
            trimmedFrames: 0,
            emotion: dbLoop.emotion || null,
            rhetoricAction: dbLoop.rhetoricAction || null,
            energyLevel: dbLoop.energyLevel || null,
            poseState: dbLoop.poseState || derivedStartPose,
          });
        }
      }
    } catch {
      // Non-critical fallback
    }

    // 3. Discover clean Master Poses & Attires for this persona
    interface WardrobePoseItem {
      id: string;
      label: string;
      outfit: string;
      category: string;
      pose: string;
      poseLabel: string;
      color: string;
      badgeBg: string;
      src: string;
      correspondingLoopId?: string;
      correspondingVideoUrl?: string;
    }

    const wardrobePoses: WardrobePoseItem[] = [];
    const POSE_KEYS = ["M1", "M2", "M3", "M4", "M5"] as const;
    const POSE_LABELS: Record<string, string> = {
      M1: "Base Clasped",
      M2: "Raised Right Hand",
      M3: "Open Two Hands",
      M4: "Separated Arms",
      M5: "3/4 Turn Side",
    };
    const POSE_BADGES: Record<string, string> = {
      M1: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      M2: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      M3: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      M4: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      M5: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    };

    // 3. Discover wardrobe poses from local archive (dev only — public/avatars/ doesn't exist in cloud)
    const archiveDir = path.join(resolveLocalAvatarsDir(), `master_${personaParam}_archive`);
    if (process.env.NODE_ENV !== "production" && fs.existsSync(archiveDir)) {
      const activeAttireSlugs = new Set(items.map((it) => it.attire));
      const subdirs = fs.readdirSync(archiveDir, { withFileTypes: true })
        .filter((d) => {
          if (!d.isDirectory() || !d.name.startsWith("domain_chroma_wall_standing")) return false;
          if (d.name.endsWith("_old") || d.name.includes("_old_") || d.name.includes("backup") || d.name.includes("1x1") || d.name.endsWith("_defaul") || d.name.includes("_defaul_")) return false;
          const slug = d.name.replace("domain_chroma_wall_standing_", "");
          return activeAttireSlugs.size === 0 || Array.from(activeAttireSlugs).some((active) => isSameAttire(active, slug));
        })
        .map((d) => d.name);

      for (const dirName of subdirs) {
        const attireSlug = dirName.replace("domain_chroma_wall_standing_", "");
        const attireName = attireSlug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        const dirPath = path.join(archiveDir, dirName);
        const files = fs.readdirSync(dirPath).filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f));

        for (const pKey of POSE_KEYS) {
          const match = files.find(
            (f) =>
              f.includes(`_${pKey}_`) ||
              f.includes(`0${pKey.slice(1)}_${pKey}`) ||
              f.includes(`_${pKey.toLowerCase()}_`) ||
              f.endsWith(`_${pKey}.jpg`) ||
              f.toLowerCase().includes(pKey.toLowerCase())
          );

          if (match) {
            const relSrc = `/avatars/master_${personaParam}_archive/${dirName}/${match}`;
            const sameAttireSamePose = items.filter(
              (it) =>
                isSameAttire(it.attire, attireSlug) &&
                it.startPose === pKey &&
                it.endPose === pKey
            );
            const loopMatch =
              sameAttireSamePose.find((it) => it.type === "loop") ||
              sameAttireSamePose[0] ||
              items.find(
                (it) =>
                  isSameAttire(it.attire, attireSlug) &&
                  it.id.toLowerCase().includes(`${pKey.toLowerCase()}_loop`)
              );

            const expectedVideoRel = `/assets/action_loops/veo/${personaParam}_${attireSlug}/${personaParam}_${attireSlug}_${pKey}_loop_v1.mp4`;
            const expectedVideoFile = resolveLocalPublicFile(expectedVideoRel);
            const videoUrl = loopMatch ? loopMatch.videoUrl : (expectedVideoFile ? expectedVideoRel : undefined);

            wardrobePoses.push({
              id: `${personaParam}_${attireSlug}_${pKey.toLowerCase()}`,
              label: `${attireName} (${pKey} - ${POSE_LABELS[pKey] || pKey})`,
              outfit: attireName,
              category: attireName,
              pose: pKey,
              poseLabel: POSE_LABELS[pKey] || pKey,
              color: "#10b981",
              badgeBg: POSE_BADGES[pKey] || "bg-zinc-800 text-zinc-300",
              src: relSrc,
              correspondingLoopId: loopMatch ? loopMatch.id : undefined,
              correspondingVideoUrl: videoUrl,
            });
          }
        }
      }
    }

    // Fallback: If no files found in archive folder, query DB personaMasterImage
    if (wardrobePoses.length === 0) {
      try {
        const dbMasters = await prisma.personaMasterImage.findMany({
          where: {
            persona: {
              slug: personaParam,
            },
          },
          orderBy: [{ attire: "asc" }, { poseType: "asc" }],
        });

        const seenPoses = new Set<string>();
        for (const m of dbMasters) {
          if (!m.storageKey) continue;
          const poseKey = m.poseType || "M1";
          const attireKey = m.attire || "default";
          const uniqueKey = `${attireKey}_${poseKey}`;
          if (seenPoses.has(uniqueKey)) continue;
          seenPoses.add(uniqueKey);

          const cleanStorageKey = m.storageKey.replace(/^\/+/, "");
          const src =
            m.url && m.url.startsWith("/")
              ? m.url
              : cleanStorageKey.startsWith("avatars/") || cleanStorageKey.startsWith("assets/")
                ? `/${cleanStorageKey}`
                : m.url || storage.getUrl(cleanStorageKey);
          const attireLabel = attireKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          const poseMatchingItems = items.filter(
            (it) =>
              (it.attire === attireKey || isSameAttire(it.attire, attireKey)) &&
              it.startPose === poseKey &&
              it.endPose === poseKey
          );
          const loopMatch =
            poseMatchingItems.find((it) => it.type === "loop") ||
            poseMatchingItems.find((it) => it.type === "dynamic_loop") ||
            poseMatchingItems[0] ||
            items.find(
              (it) =>
                (it.attire === attireKey || isSameAttire(it.attire, attireKey)) &&
                it.id.toLowerCase().includes(`${poseKey.toLowerCase()}_loop`)
            );

          wardrobePoses.push({
            id: m.id,
            label: `${attireLabel} (${poseKey} - ${POSE_LABELS[poseKey] || poseKey})`,
            outfit: attireLabel,
            category: attireLabel,
            pose: poseKey,
            poseLabel: POSE_LABELS[poseKey] || poseKey,
            color: "#10b981",
            badgeBg: POSE_BADGES[poseKey] || "bg-zinc-800 text-zinc-300",
            src,
            correspondingLoopId: loopMatch ? loopMatch.id : undefined,
            correspondingVideoUrl: loopMatch ? loopMatch.videoUrl : undefined,
          });
        }
      } catch {
        // Non-critical fallback
      }
    }

    // 4. Apply optional filters
    if (typeFilter) {
      items = items.filter((it) => it.type === typeFilter);
    }
    if (poseFilter) {
      items = items.filter((it) => it.startPose === poseFilter || it.endPose === poseFilter);
    }

    return NextResponse.json(
      {
        success: true,
        total: items.length,
        persona: personaParam,
        items,
        loops: items,
        wardrobePoses,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to retrieve action loops", details: String(error) },
      { status: 500 }
    );
  }
}
