/**
 * scripts/veo-cli/masterSetSelector.ts
 *
 * Discovers and prompts selection of Master Keyframe Image Sets, Broadcast Domains,
 * and Cohesive Attire Subsets for any persona.
 */

import fs from "fs";
import path from "path";
import prompts from "prompts";
import { Persona } from "../../src/lib/tts/personas";

export interface DiscoveredMasterSet {
  id: string;
  label: string;
  dirPath: string;
  files: string[];
  filter?: string;
  domainHint?: string;
  attireHint?: string;
}

/**
 * Scans the workspace for all master image sets, domain keyframes, and attire archives for a persona.
 */
export function discoverMasterImageSets(personaSlug: string): DiscoveredMasterSet[] {
  const results: DiscoveredMasterSet[] = [];
  const root = process.cwd();

  // Search candidate archive root directories
  const candidateArchiveDirs = [
    path.resolve(root, `public/avatars/master_${personaSlug}_archive`),
    path.resolve(root, `public/avatars/master_${personaSlug}`),
    path.resolve(root, `public/avatars/master_archive_${personaSlug}`),
  ];

  for (const archiveDir of candidateArchiveDirs) {
    if (!fs.existsSync(archiveDir)) continue;

    const entries = fs.readdirSync(archiveDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const subDir = path.join(archiveDir, entry.name);
      const imgFiles = fs
        .readdirSync(subDir)
        .filter((f) => f.endsWith(".jpg") || f.endsWith(".png"))
        .map((f) => path.join(subDir, f));

      if (imgFiles.length === 0) continue;

      const folderName = entry.name;

      // Handle domain-specific master suites (e.g., domain_chroma_wall_standing_leather_crop_jacket)
      if (folderName.startsWith("domain_")) {
        const parts = folderName.replace(/^domain_/, "").split("_");
        const domainSlug = parts.slice(0, 3).join("_");
        const attireSlug = parts.slice(3).join("_") || "custom_attire";

        results.push({
          id: folderName,
          label: `🏛️ [${folderName}] — ${imgFiles.length} Master Keyframes (${attireSlug.replace(/_/g, " ")})`,
          dirPath: subDir,
          files: imgFiles,
          domainHint: domainSlug,
          attireHint: attireSlug,
        });
        continue;
      }

      // Handle chroma_master_poses with multi-outfit sets
      if (folderName === "chroma_master_poses") {
        // Group files by prefix (e.g., ruby_08, ruby_01, etc.)
        const groups: Record<string, string[]> = {};
        for (const file of imgFiles) {
          const base = path.basename(file);
          const match = base.match(/^([a-zA-Z]+_\d+)/);
          if (match) {
            const prefix = match[1];
            if (!groups[prefix]) groups[prefix] = [];
            groups[prefix].push(file);
          }
        }

        // Add cohesive sub-groups first
        for (const [prefix, pFiles] of Object.entries(groups)) {
          if (pFiles.length >= 2) {
            results.push({
              id: `${folderName}:${prefix}`,
              label: `🟢 [${folderName}] ${prefix} Cohesive Attire Set (${pFiles.length} keyframes)`,
              dirPath: subDir,
              files: pFiles,
              filter: `${prefix}[a-z]`,
              domainHint: "chroma_wall_standing",
            });
          }
        }

        // Also add the full folder option
        results.push({
          id: `${folderName}:all`,
          label: `📁 [${folderName}] All Images (${imgFiles.length} mixed keyframes)`,
          dirPath: subDir,
          files: imgFiles,
          domainHint: "chroma_wall_standing",
        });
        continue;
      }

      // Standard directory
      results.push({
        id: folderName,
        label: `📁 [${folderName}] — ${imgFiles.length} Images`,
        dirPath: subDir,
        files: imgFiles,
      });
    }
  }

  return results;
}

/**
 * Interactive prompt for selecting a Master Image Set for video generation.
 */
export async function promptMasterSetSelection(
  persona: Persona,
  message: string = "Select Master Keyframe Image Set to Generate Videos From:"
): Promise<{ dirPath: string; files: string[]; filter?: string; label: string } | null> {
  const discovered = discoverMasterImageSets(persona.id);

  const choices: { title: string; value: string }[] = discovered.map((s) => ({
    title: s.label,
    value: s.id,
  }));

  choices.push({
    title: "✏️ Custom Directory Path / File Filter",
    value: "custom",
  });

  const res = await prompts({
    type: "select",
    name: "setId",
    message,
    choices,
    initial: 0,
  });

  if (!res.setId) return null;

  if (res.setId === "custom") {
    const customRes = await prompts([
      {
        type: "text",
        name: "dirPath",
        message: "Enter Master Images Directory Path:",
        initial: `public/avatars/master_${persona.id}_archive/domain_chroma_wall_standing_leather_crop_jacket`,
      },
      {
        type: "text",
        name: "filter",
        message: "Enter Regex Filename Filter (or leave blank for all):",
        initial: "",
      },
    ]);

    if (!customRes.dirPath) return null;
    const fullDir = path.resolve(process.cwd(), customRes.dirPath);
    if (!fs.existsSync(fullDir)) {
      console.error(`❌ Directory not found: ${fullDir}`);
      return null;
    }

    let files = fs
      .readdirSync(fullDir)
      .filter((f) => f.endsWith(".jpg") || f.endsWith(".png"))
      .map((f) => path.join(fullDir, f));

    if (customRes.filter) {
      const reg = new RegExp(customRes.filter);
      files = files.filter((f) => reg.test(path.basename(f)));
    }

    return {
      dirPath: fullDir,
      files,
      filter: customRes.filter || undefined,
      label: path.basename(fullDir),
    };
  }

  const selected = discovered.find((s) => s.id === res.setId);
  if (!selected) return null;

  return {
    dirPath: selected.dirPath,
    files: selected.files,
    filter: selected.filter,
    label: selected.label,
  };
}

/**
 * Interactive prompt for selecting a single master image from a set.
 */
export async function promptSingleImageFromSet(
  files: string[],
  message: string = "Select Specific Master Image (Frame 0):"
): Promise<string | null> {
  if (files.length === 0) return null;
  if (files.length === 1) return files[0];

  const res = await prompts({
    type: "select",
    name: "imagePath",
    message,
    choices: files.map((f) => ({
      title: `📸 ${path.basename(f)}`,
      value: f,
    })),
    initial: 0,
  });

  return res.imagePath || null;
}
