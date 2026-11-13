/**
 * src/lib/generationLedger.ts
 *
 * System-Wide Video Generation Observability, Hardware Telemetry & Granular Cost Tracking Ledger.
 * Provides per-video cost attribution, latency tracking, GPU telemetry, and persistent
 * financial logging across Product Showcases, Action Matrices, Looping Video Suites, and Veo models.
 */

import fs from "fs";
import path from "path";
import { collectGpuStats,collectSystemStats } from "./telemetry";

export interface GenerationTimingMetrics {
  totalLatencyMs: number;
  promptCompileMs?: number;
  scriptTtsMs?: number;
  videoInferenceMs?: number;
  stitchMs?: number;
  realtimeFactor: number; // e.g. 1.8x realtime (totalLatencyMs / (durationSec * 1000))
}

export interface GenerationHardwareMetrics {
  gpuName?: string;
  vramPeakMb?: number;
  vramTotalMb?: number;
  gpuTempC?: number;
  hostRamMb?: number;
}

export interface GenerationQualityMetrics {
  ssimScore?: number;
  framingPassed?: boolean;
  consistencyPassed?: boolean;
  resolution?: string;
  fps?: number;
}

export interface GenerationCostRecord {
  id: string;
  timestamp: string; // ISO-8601
  pipeline: "product_showcase" | "action_matrix" | "subtle_idle" | "fused_commercial" | "veo_general" | "loop_suite" | "custom";
  personaSlug: string;
  productName?: string;
  productTypology?: string;
  videoPath: string;
  durationSec: number;
  model: string; // e.g. "veo-3.1-lite", "veo-3.1-fast", "veo-3.1-quality", "omni-1.1-flash"
  engine: string; // e.g. "flow_web", "agy", "api", "local"
  resolution: string;
  aspectRatio: string;
  creditsCost: number; // Flow credits
  usdCost: number; // Estimated USD ($0.01 per Flow credit)
  costPerSec: number; // USD per video second
  timing: GenerationTimingMetrics;
  hardware: GenerationHardwareMetrics;
  quality?: GenerationQualityMetrics;
  metadata?: Record<string, unknown>;
}

export interface GenerationLedgerFilter {
  persona?: string;
  product?: string;
  typology?: string;
  pipeline?: string;
  model?: string;
  since?: string; // ISO date string or YYYY-MM-DD
  days?: number;
  limit?: number;
}

export interface GenerationLedgerSummary {
  totalVideos: number;
  totalDurationSeconds: number;
  totalDurationMinutes: number;
  totalCreditsCost: number;
  totalUsdCost: number;
  avgCostPerVideo: number;
  avgCostPerSecond: number;
  avgRealtimeFactor: number;
  avgInferenceLatencyMs: number;
  byPersona: Record<string, { count: number; credits: number; usd: number }>;
  byTypology: Record<string, { count: number; credits: number; usd: number }>;
  byModel: Record<string, { count: number; credits: number; usd: number }>;
  byPipeline: Record<string, { count: number; credits: number; usd: number }>;
  dailySpend: Record<string, { count: number; credits: number; usd: number }>;
}

const LEDGER_DIR = path.resolve(process.cwd(), "data", "telemetry");
const LEDGER_FILE = path.join(LEDGER_DIR, "video_generation_ledger.json");

/**
 * Ensures the ledger file and directory exist
 */
function ensureLedgerFile(): void {
  if (!fs.existsSync(LEDGER_DIR)) {
    fs.mkdirSync(LEDGER_DIR, { recursive: true });
  }
  if (!fs.existsSync(LEDGER_FILE)) {
    fs.writeFileSync(LEDGER_FILE, JSON.stringify([], null, 2), "utf8");
  }
}

/**
 * Calculates standard credit cost and USD estimate for a given model and duration
 */
export function calculateVideoCost(
  model: string = "veo-3.1-lite",
  durationSec: number = 8,
  batchCount: number = 1,
  isUltra: boolean = true
): { credits: number; usd: number; costPerSec: number } {
  let creditsPerClip = 10;
  const normModel = model.toLowerCase();

  if (normModel.includes("lite")) {
    creditsPerClip = isUltra ? 5 : 10;
  } else if (normModel.includes("fast")) {
    creditsPerClip = isUltra ? 10 : 20;
  } else if (normModel.includes("quality")) {
    creditsPerClip = 100;
  } else if (normModel.includes("flash") || normModel.includes("omni")) {
    creditsPerClip = durationSec <= 4 ? 7 : durationSec <= 8 ? 12 : 15;
  } else {
    creditsPerClip = isUltra ? 5 : 10;
  }

  const totalCredits = creditsPerClip * batchCount;
  // Official benchmark: 1 Google Flow credit = approx $0.01 USD
  const usd = totalCredits * 0.01;
  const costPerSec = durationSec > 0 ? usd / (durationSec * batchCount) : usd;

  return {
    credits: totalCredits,
    usd: parseFloat(usd.toFixed(4)),
    costPerSec: parseFloat(costPerSec.toFixed(4)),
  };
}

/**
 * Takes a hardware snapshot from NVIDIA GPU and Host System
 */
export async function captureHardwareSnapshot(): Promise<GenerationHardwareMetrics> {
  const gpu = await collectGpuStats();
  const sys = collectSystemStats();

  return {
    gpuName: gpu?.name || undefined,
    vramPeakMb: gpu?.vramUsedMb || undefined,
    vramTotalMb: gpu?.vramTotalMb || undefined,
    gpuTempC: gpu?.tempC || undefined,
    hostRamMb: sys?.usedMemMb || undefined,
  };
}

/**
 * Records a completed video generation to the persistent ledger
 */
export async function recordGeneration(
  params: Omit<GenerationCostRecord, "id" | "timestamp" | "costPerSec"> & {
    id?: string;
    timestamp?: string;
  }
): Promise<GenerationCostRecord> {
  ensureLedgerFile();

  const id = params.id || `gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = params.timestamp || new Date().toISOString();
  const durationSec = params.durationSec || 8;
  const usdCost = params.usdCost;
  const costPerSec = durationSec > 0 ? parseFloat((usdCost / durationSec).toFixed(4)) : usdCost;

  const record: GenerationCostRecord = {
    ...params,
    id,
    timestamp,
    costPerSec,
  };

  try {
    const raw = fs.readFileSync(LEDGER_FILE, "utf8");
    const records: GenerationCostRecord[] = JSON.parse(raw);
    records.push(record);
    fs.writeFileSync(LEDGER_FILE, JSON.stringify(records, null, 2), "utf8");
  } catch (err) {
    console.error("⚠️ Failed to write to generation ledger JSON:", err);
  }

  // Attempt async sync to Prisma database if available
  try {
    const { prisma } = await import("./prisma");
    if (prisma && prisma.usageLog) {
      await prisma.usageLog.create({
        data: {
          companyId: "default",
          type: "video_credits",
          amount: record.creditsCost,
          personaId: record.personaSlug,
        },
      });
    }
  } catch {
    // Database sync is optional for standalone CLI scripts
  }

  return record;
}

/**
 * Retrieves all generation records matching optional filter criteria
 */
export function getLedgerRecords(filter?: GenerationLedgerFilter): GenerationCostRecord[] {
  ensureLedgerFile();
  try {
    const raw = fs.readFileSync(LEDGER_FILE, "utf8");
    let records: GenerationCostRecord[] = JSON.parse(raw);

    if (!filter) return records;

    if (filter.persona) {
      const p = filter.persona.toLowerCase();
      records = records.filter((r) => r.personaSlug.toLowerCase() === p);
    }
    if (filter.product) {
      const prod = filter.product.toLowerCase();
      records = records.filter((r) => r.productName && r.productName.toLowerCase().includes(prod));
    }
    if (filter.typology) {
      const t = filter.typology.toLowerCase();
      records = records.filter((r) => r.productTypology && r.productTypology.toLowerCase() === t);
    }
    if (filter.pipeline) {
      records = records.filter((r) => r.pipeline === filter.pipeline);
    }
    if (filter.model) {
      const m = filter.model.toLowerCase();
      records = records.filter((r) => r.model.toLowerCase().includes(m));
    }
    if (filter.days) {
      const cutoff = new Date(Date.now() - filter.days * 24 * 60 * 60 * 1000).toISOString();
      records = records.filter((r) => r.timestamp >= cutoff);
    }
    if (filter.since) {
      records = records.filter((r) => r.timestamp >= filter.since!);
    }
    if (filter.limit && filter.limit > 0) {
      records = records.slice(-filter.limit);
    }

    return records;
  } catch {
    return [];
  }
}

/**
 * Computes aggregate summary KPIs and breakdown analytics
 */
export function getLedgerSummary(filter?: GenerationLedgerFilter): GenerationLedgerSummary {
  const records = getLedgerRecords(filter);

  let totalDurationSeconds = 0;
  let totalCreditsCost = 0;
  let totalUsdCost = 0;
  let totalRealtimeFactorSum = 0;
  let totalLatencySum = 0;

  const byPersona: Record<string, { count: number; credits: number; usd: number }> = {};
  const byTypology: Record<string, { count: number; credits: number; usd: number }> = {};
  const byModel: Record<string, { count: number; credits: number; usd: number }> = {};
  const byPipeline: Record<string, { count: number; credits: number; usd: number }> = {};
  const dailySpend: Record<string, { count: number; credits: number; usd: number }> = {};

  for (const r of records) {
    totalDurationSeconds += r.durationSec;
    totalCreditsCost += r.creditsCost;
    totalUsdCost += r.usdCost;
    totalRealtimeFactorSum += r.timing.realtimeFactor || 1;
    totalLatencySum += r.timing.totalLatencyMs || 0;

    // By Persona
    const p = r.personaSlug || "unknown";
    if (!byPersona[p]) byPersona[p] = { count: 0, credits: 0, usd: 0 };
    byPersona[p].count += 1;
    byPersona[p].credits += r.creditsCost;
    byPersona[p].usd += r.usdCost;

    // By Typology
    const t = r.productTypology || "general_broadcast";
    if (!byTypology[t]) byTypology[t] = { count: 0, credits: 0, usd: 0 };
    byTypology[t].count += 1;
    byTypology[t].credits += r.creditsCost;
    byTypology[t].usd += r.usdCost;

    // By Model
    const m = r.model || "veo-3.1-lite";
    if (!byModel[m]) byModel[m] = { count: 0, credits: 0, usd: 0 };
    byModel[m].count += 1;
    byModel[m].credits += r.creditsCost;
    byModel[m].usd += r.usdCost;

    // By Pipeline
    const pipe = r.pipeline || "general";
    if (!byPipeline[pipe]) byPipeline[pipe] = { count: 0, credits: 0, usd: 0 };
    byPipeline[pipe].count += 1;
    byPipeline[pipe].credits += r.creditsCost;
    byPipeline[pipe].usd += r.usdCost;

    // Daily Spend
    const day = r.timestamp.slice(0, 10);
    if (!dailySpend[day]) dailySpend[day] = { count: 0, credits: 0, usd: 0 };
    dailySpend[day].count += 1;
    dailySpend[day].credits += r.creditsCost;
    dailySpend[day].usd += r.usdCost;
  }

  const count = records.length;
  const avgCostPerVideo = count > 0 ? parseFloat((totalUsdCost / count).toFixed(4)) : 0;
  const avgCostPerSecond = totalDurationSeconds > 0 ? parseFloat((totalUsdCost / totalDurationSeconds).toFixed(4)) : 0;
  const avgRealtimeFactor = count > 0 ? parseFloat((totalRealtimeFactorSum / count).toFixed(2)) : 1;
  const avgInferenceLatencyMs = count > 0 ? Math.round(totalLatencySum / count) : 0;

  return {
    totalVideos: count,
    totalDurationSeconds,
    totalDurationMinutes: parseFloat((totalDurationSeconds / 60).toFixed(1)),
    totalCreditsCost,
    totalUsdCost: parseFloat(totalUsdCost.toFixed(2)),
    avgCostPerVideo,
    avgCostPerSecond,
    avgRealtimeFactor,
    avgInferenceLatencyMs,
    byPersona,
    byTypology,
    byModel,
    byPipeline,
    dailySpend,
  };
}

/**
 * Exports ledger records to a CSV string and optionally writes to file.
 * Polymorphic: accepts (exportFilePath, filter) or (filter, exportFilePath).
 */
export function exportLedgerToCsv(
  arg1?: string | GenerationLedgerFilter,
  arg2?: string | GenerationLedgerFilter
): string {
  let exportFilePath: string | undefined;
  let filter: GenerationLedgerFilter | undefined;

  if (typeof arg1 === "string") {
    exportFilePath = arg1;
    if (typeof arg2 === "object") filter = arg2;
  } else if (typeof arg1 === "object") {
    filter = arg1;
    if (typeof arg2 === "string") exportFilePath = arg2;
  } else if (typeof arg2 === "string") {
    exportFilePath = arg2;
  }

  const records = getLedgerRecords(filter);
  const headers = [
    "ID",
    "Timestamp",
    "Pipeline",
    "Persona",
    "Product",
    "Typology",
    "Model",
    "Engine",
    "Duration_Sec",
    "Latency_Ms",
    "Realtime_Factor",
    "Credits_Cost",
    "USD_Cost",
    "Cost_Per_Sec",
    "Peak_VRAM_MB",
    "GPU_Temp_C",
    "Video_Path",
  ];

  const rows = records.map((r) => [
    r.id,
    r.timestamp,
    r.pipeline,
    r.personaSlug,
    `"${(r.productName || "").replace(/"/g, '""')}"`,
    r.productTypology || "",
    r.model,
    r.engine,
    r.durationSec,
    r.timing.totalLatencyMs,
    r.timing.realtimeFactor.toFixed(2),
    r.creditsCost,
    r.usdCost.toFixed(4),
    r.costPerSec.toFixed(4),
    r.hardware.vramPeakMb || "",
    r.hardware.gpuTempC || "",
    `"${r.videoPath.replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  if (exportFilePath) {
    const fullPath = path.resolve(process.cwd(), exportFilePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, csvContent, "utf8");
    return fullPath;
  }

  return csvContent;
}

/**
 * Returns formatted terminal string representation of the cost and telemetry HUD
 */
export function formatGenerationHud(record: GenerationCostRecord): string {
  const c = {
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    green: "\x1b[32m",
    magenta: "\x1b[35m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    reset: "\x1b[0m",
  };

  const speedStr = `${record.timing.realtimeFactor.toFixed(1)}x RT`;
  const latencyStr = `${(record.timing.totalLatencyMs / 1000).toFixed(1)}s`;
  const vramStr = record.hardware.vramPeakMb ? `${record.hardware.vramPeakMb} MB` : "N/A";
  const tempStr = record.hardware.gpuTempC ? `${record.hardware.gpuTempC}°C` : "N/A";

  return `
${c.cyan}┌──────────────────────────────────────────────────────────────────┐${c.reset}
${c.cyan}│${c.reset} ${c.bold}📊 GENERATION TELEMETRY & COST OBSERVABILITY HUD${c.reset}                ${c.cyan}│${c.reset}
${c.cyan}├──────────────────────────────────────────────────────────────────┤${c.reset}
${c.cyan}│${c.reset} Video Output:   ${record.videoPath.split(/[/\\]/).pop()?.slice(0, 48).padEnd(48)} ${c.cyan}│${c.reset}
${c.cyan}│${c.reset} Pipeline:       ${record.pipeline.toUpperCase().padEnd(20)} Model: ${record.model.padEnd(21)} ${c.cyan}│${c.reset}
${c.cyan}│${c.reset} Persona:        @${record.personaSlug.padEnd(19)} Typology: ${(record.productTypology || "N/A").padEnd(18)} ${c.cyan}│${c.reset}
${c.cyan}│${c.reset} Duration:       ${(record.durationSec + "s").padEnd(20)} Resolution: ${record.resolution.padEnd(15)} ${c.cyan}│${c.reset}
${c.cyan}├──────────────────────────────────────────────────────────────────┤${c.reset}
${c.cyan}│${c.reset} ⏱️  Latency:     ${latencyStr.padEnd(20)} Speed: ${c.yellow}${speedStr.padEnd(20)}${c.reset} ${c.cyan}│${c.reset}
${c.cyan}│${c.reset} 🖥️  Peak VRAM:   ${vramStr.padEnd(20)} GPU Temp: ${tempStr.padEnd(17)} ${c.cyan}│${c.reset}
${c.cyan}│${c.reset} 🪙 Flow Credits: ${c.bold}${c.green}${String(record.creditsCost).padEnd(20)}${c.reset} Est USD: ${c.bold}${c.green}$${record.usdCost.toFixed(2).padEnd(18)}${c.reset} ${c.cyan}│${c.reset}
${c.cyan}│${c.reset} 💸 Unit Rate:    $${record.costPerSec.toFixed(4)}/sec video                                  ${c.cyan}│${c.reset}
${c.cyan}└──────────────────────────────────────────────────────────────────┘${c.reset}
`;
}
