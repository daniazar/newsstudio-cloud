/**
 * app/api/presenter/sadtalker/server/route.ts
 *
 * API for starting and stopping the local SadTalker API server.
 */

import { NextResponse } from "next/server";
import { exec, spawn, execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { withTenantAuth, withWorkerOrSuperAdmin } from "@/lib/apiHandler";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:presenter:sadtalker:server");

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);
const SADTALKER_PORT = 8000;

function getSadTalkerPath(): string {
  return path.join(process.cwd(), "vendor", "SadTalker-Server");
}

/**
 * GET /api/presenter/sadtalker/server
 * Checks if SadTalker is running on port 8000.
 */
export const GET = withTenantAuth(async () => {
  try {
    const { stdout } = await execAsync(`lsof -t -i:${SADTALKER_PORT} -sTCP:LISTEN`);
    const pid = stdout.trim();
    return NextResponse.json({ online: !!pid, pid });
  } catch {
    return NextResponse.json({ online: false });
  }
});

/**
 * POST /api/presenter/sadtalker/server
 * Starts SadTalker in the background.
 */
export const POST = withWorkerOrSuperAdmin(async () => {
  // 1. Check if already running
  try {
    const { stdout } = await execAsync(`lsof -t -i:${SADTALKER_PORT} -sTCP:LISTEN`);
    if (stdout.trim()) {
      return NextResponse.json({ success: true, message: "SadTalker is already running." });
    }
  } catch { /* proceed */ }

  const stPath = getSadTalkerPath();
  if (!fs.existsSync(stPath)) {
    return NextResponse.json({ 
      success: false, 
      error: `SadTalker directory not found at ${stPath}` 
    }, { status: 400 });
  }

  const pythonPath = path.join(stPath, "venv", "bin", "python");
  if (!fs.existsSync(pythonPath)) {
    return NextResponse.json({ 
      success: false, 
      error: `SadTalker virtual environment not found at ${pythonPath}. Please run setup first.` 
    }, { status: 400 });
  }
  
  log.info(`[SadTalker Control] Starting server using ${pythonPath}...`);

  // Spawn detached process
  const child = spawn(pythonPath, ["-m", "uvicorn", "server:app", "--host", "0.0.0.0", "--port", SADTALKER_PORT.toString()], {
    cwd: stPath,
    detached: true,
    stdio: 'ignore',
    env: { 
      ...process.env,
      PYTORCH_ENABLE_MPS_FALLBACK: "1"
    }
  });

  child.unref();

  return NextResponse.json({ success: true, message: "SadTalker start command issued." });
});

/**
 * DELETE /api/presenter/sadtalker/server
 * Stops SadTalker by killing processes on port 8000.
 */
export const DELETE = withWorkerOrSuperAdmin(async () => {
  try {
    const { stdout } = await execAsync(`lsof -t -i:${SADTALKER_PORT} -sTCP:LISTEN`);
    const pids = stdout.trim().split("\n").map((p) => p.trim()).filter((p) => /^\d+$/.test(p));
    
    if (pids.length === 0) {
      return NextResponse.json({ success: true, message: "SadTalker was not running." });
    }

    log.info(`[SadTalker Control] Killing SadTalker PIDs: ${pids.join(", ")}`);
    
    for (const pid of pids) {
      await execFileAsync("kill", ["-9", pid]);
    }

    return NextResponse.json({ success: true, message: "SadTalker stopped." });
  } catch {
    return NextResponse.json({ success: true, message: "SadTalker is not running." });
  }
});
