/**
 * scripts/gemini-cli/incidentBlueprintGenerator.ts
 *
 * Forensic Incident & Cyber Attack Architecture Blueprint Generator.
 * Synthesizes isometric 3D architectural diagrams, network breach topologies,
 * and aviation/maritime forensic incident maps for investigative broadcast storytelling.
 */

import fs from "fs";
import path from "path";
import { CompiledScenePrompt } from "./types";
import { runWithAgy } from "./engines/agyRunner";
import { runWithApi } from "./engines/apiRunner";
import { outputToolJson } from "./engines/jsonRunner";

export interface IncidentPreset {
  id: string;
  name: string;
  incidentType: string;
  desc: string;
  visualStyle: string;
}

export const INCIDENT_PRESETS: Record<string, IncidentPreset> = {
  cyber_datacenter_breach: {
    id: "cyber_datacenter_breach",
    name: "💻 Cybersecurity Datacenter Zero-Day Breach",
    incidentType: "Cyber Heist & Infrastructure",
    desc: "An isometric 3D architectural cutaway diagram of a high-security server datacenter. Glowing red malicious packet injection vector penetrating external perimeter firewall, compromised cloud database cluster highlighted in pulsing amber, encrypted exfiltration tunnel routing toward offshore proxy servers.",
    visualStyle: "Cyber forensic blueprint, glowing neon wireframe layers, dark carbon background, precise technical callout labels, crisp 3D CAD visualization.",
  },
  aviation_flight_trajectory: {
    id: "aviation_flight_trajectory",
    name: "✈️ Aviation Flight Path & Radar Deviation Blueprint",
    incidentType: "Aerospace & Transportation",
    desc: "A 3D topographical elevation diagram showing an airliner's flight path trajectory. Dashed white planned corridor versus solid red actual flight path, step-down altitude descent markers, radar transponder blackout zone, severe convective thunderstorm front visualization.",
    visualStyle: "Aviation safety board forensic reconstruction, 3D terrain elevation mesh, altitude flight level markers, high-contrast technical cartography.",
  },
  maritime_strait_collision: {
    id: "maritime_strait_collision",
    name: "⚓ Maritime Choke Point & Container Ship Collision",
    incidentType: "Maritime & Supply Chain",
    desc: "A high-angle 3D forensic harbor blueprint showing a container vessel's sudden rudder failure trajectory into a suspension bridge support pylon. Vessel AIS GPS position markers every 30 seconds, critical channel depth contours, emergency salvage perimeter zone.",
    visualStyle: "Naval engineering forensic diagram, clean bathymetric contours, crisp navigation telemetry vectors, broadcast infographic clarity.",
  },
};

export interface IncidentBlueprintOptions {
  presetKey?: string;
  customTopic?: string;
  aspectRatio?: string;
  engine?: "agy" | "api" | "tool_json";
  dryRun?: boolean;
  destPath?: string;
}

export function compileIncidentPrompt(preset: IncidentPreset, customTopic?: string): string {
  const desc = customTopic ? `Forensic incident reconstruction focusing on: ${customTopic}. ${preset.desc}` : preset.desc;

  return `A high-end 16:9 television broadcast forensic incident reconstruction blueprint (NO HUMANS, CLEAN INFOGRAPHIC PLATE):
[INCIDENT SCENARIO & ARCHITECTURE]:
• Classification: ${preset.incidentType}
• ${desc}
[VISUAL SCHEMATICS & TELEMETRY]:
• ${preset.visualStyle}
• Precision CAD technical drafting, razor-sharp 8k vector detail, high-contrast television broadcast presentation.`;
}

export async function runIncidentBlueprintGenerator(options: IncidentBlueprintOptions): Promise<string | null> {
  const presetKey = options.presetKey || "cyber_datacenter_breach";
  const preset = INCIDENT_PRESETS[presetKey] || INCIDENT_PRESETS.cyber_datacenter_breach;
  const prompt = compileIncidentPrompt(preset, options.customTopic);
  const baseName = `incident_${preset.id}_master`;

  const outputDir = path.join(process.cwd(), "public", "studio_environments", "composited_scenes");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const finalDest = options.destPath || path.join(outputDir, `${baseName}.jpg`);

  console.log("\n==================================================================");
  console.log("🕵️ FORENSIC INCIDENT & BLUEPRINT RECONSTRUCTION GENERATOR");
  console.log("==================================================================");
  console.log(`Preset:       ${preset.name}`);
  console.log(`Type:         ${preset.incidentType}`);
  console.log(`Engine:       ${(options.engine || "agy").toUpperCase()}`);
  console.log(`Destination:  ${finalDest}\n`);

  if (options.dryRun) {
    console.log(`[DRY-RUN] Compiled Prompt:\n${prompt}\n`);
    return null;
  }

  const compiled: CompiledScenePrompt = {
    prompt,
    imagePaths: [],
    baseName,
    aspectRatio: "16:9",
  };

  let generatedPath: string | null = null;
  if (options.engine === "api") {
    generatedPath = await runWithApi(compiled);
  } else if (options.engine === "tool_json") {
    outputToolJson(compiled);
    return null;
  } else {
    generatedPath = await runWithAgy(compiled);
  }

  if (generatedPath && fs.existsSync(generatedPath)) {
    fs.copyFileSync(generatedPath, finalDest);
    console.log(`\n✅ Forensic Incident Blueprint Generated & Saved!`);
    console.log(`📁 File: file:///${finalDest.replace(/\\/g, "/")}\n`);
    return finalDest;
  }

  return null;
}
