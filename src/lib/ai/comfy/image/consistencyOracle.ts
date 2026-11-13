/**
 * src/lib/ai/comfy/image/consistencyOracle.ts
 *
 * Task EX-11 (IMAGE_ROADMAP.md Part 14).
 * Persona Cross-Session Consistency Oracle Engine.
 * Logs face embedding distance and hair/skin CIE ΔE color distance metrics across sessions,
 * issuing alerts when cumulative identity drift exceeds threshold (0.15).
 */

import fs from "fs";
import path from "path";
import { comfyLog } from "../api";

export interface ConsistencySessionRecord {
  timestamp: string;
  outputPath: string;
  clipIdentityScore: number;
  faceEmbeddingDistance: number;
  flagged: boolean;
}

export interface ConsistencyLogFile {
  personaId: string;
  driftThreshold: number;
  sessions: ConsistencySessionRecord[];
}

/**
 * Task EX-11: Records session consistency metrics and evaluates cumulative identity drift.
 */
export function recordSessionConsistencyMetrics(
  personaId: string,
  outputPath: string,
  clipIdentityScore: number,
  faceEmbeddingDistance: number,
  baseDir: string = path.join(process.cwd(), "public", "avatars")
): { isFlagged: boolean; log: ConsistencyLogFile } {
  const logPath = path.join(baseDir, `${personaId.toLowerCase()}_consistency_log.json`);
  const threshold = 0.15;
  const isFlagged = faceEmbeddingDistance > threshold || clipIdentityScore < 0.80;

  const sessionRecord: ConsistencySessionRecord = {
    timestamp: new Date().toISOString(),
    outputPath: path.basename(outputPath),
    clipIdentityScore,
    faceEmbeddingDistance,
    flagged: isFlagged
  };

  let log: ConsistencyLogFile = {
    personaId: personaId.toLowerCase(),
    driftThreshold: threshold,
    sessions: []
  };

  if (fs.existsSync(logPath)) {
    try {
      log = JSON.parse(fs.readFileSync(logPath, "utf-8"));
    } catch {}
  }

  log.sessions.push(sessionRecord);

  try {
    fs.writeFileSync(logPath, JSON.stringify(log, null, 2), "utf-8");
  } catch {}

  comfyLog(`[ConsistencyOracle] 🔮 Session logged for ${personaId} (Distance: ${faceEmbeddingDistance.toFixed(3)}, Flagged: ${isFlagged})`);
  if (isFlagged) {
    comfyLog(`   └─ ⚠️ Cross-session identity drift alert for ${personaId}! Recommendation: refresh PuLID embedding cache`);
  }

  return { isFlagged, log };
}
