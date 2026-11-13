import { NextResponse } from "next/server";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import { checkModernTtsHealth } from "@/lib/tts/modernTtsClient";
import { withTenantAuth, withWorkerOrSuperAdmin } from "@/lib/apiHandler";
import { createLogger } from "@/lib/logger";

const log = createLogger("api:tts:server");

function allowLocalServerControl(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.ALLOW_API_SPAWN === "true";
}

/**
 * GET /api/tts/server
 * Checks if the Modern-TTS server is running on port 8005.
 */
export const GET = withTenantAuth(async () => {
  if (!allowLocalServerControl()) {
    return NextResponse.json({
      online: false,
      disabled: true,
      message: "Local Modern-TTS server process control is disabled in cloud/remote-worker mode.",
    });
  }
  try {
    const health = await checkModernTtsHealth();
    return NextResponse.json({ online: health.status === "ok", health });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ online: false, error: message });
  }
});

/**
 * POST /api/tts/server
 * Starts the Modern-TTS server in the background.
 */
export const POST = withWorkerOrSuperAdmin(async () => {
  if (!allowLocalServerControl()) {
    return NextResponse.json(
      {
        success: false,
        disabled: true,
        error: "Local Modern-TTS server spawning is disabled in cloud/remote-worker mode.",
      },
      { status: 503 }
    );
  }
  const health = await checkModernTtsHealth();
  if (health.status === "ok") {
    return NextResponse.json({ success: true, message: "Modern-TTS server is already running." });
  }

  const isWin = process.platform === "win32";
  const serverPath = path.join(process.cwd(), "vendor", "Modern-TTS-Server");
  
  const embeddedPythonPath = path.join(serverPath, "python_embedded", isWin ? "python.exe" : "python");
  const venvPythonPath = path.join(serverPath, "venv", isWin ? "Scripts" : "bin", isWin ? "python.exe" : "python");
  
  let pythonPath = "python";
  if (fs.existsSync(embeddedPythonPath)) pythonPath = embeddedPythonPath;
  else if (fs.existsSync(venvPythonPath)) pythonPath = venvPythonPath;

  const scriptPath = path.join(serverPath, "server.py");

  log.info(`[Modern-TTS Control] Starting server at ${scriptPath} using ${pythonPath}...`);

  const { spawn } = await import("child_process");
  const child = spawn(pythonPath, [scriptPath], {
    cwd: serverPath,
    detached: true,
    stdio: 'ignore',
    env: {
      ...process.env,
      PYTHONPATH: serverPath
    }
  });

  child.on('error', (err) => {
    console.error("[Modern-TTS Control] Spawn error:", err);
  });

  child.unref();

  await new Promise(resolve => setTimeout(resolve, 2000));

  return NextResponse.json({ success: true, message: "Modern-TTS Server start command issued." });
});

/**
 * DELETE /api/tts/server
 * Stops the Modern-TTS server.
 */
export const DELETE = withWorkerOrSuperAdmin(async () => {
  if (!allowLocalServerControl()) {
    return NextResponse.json({
      success: true,
      disabled: true,
      message: "Local Modern-TTS server process control is disabled in cloud/remote-worker mode.",
    });
  }
  try {
    const { exec, execFile } = await import("child_process");
    const execAsync = promisify(exec);
    const execFileAsync = promisify(execFile);
    const { stdout } = await execAsync("lsof -t -i:8005 -sTCP:LISTEN").catch(() => ({ stdout: "" }));
    const pids = stdout.trim().split("\n").map((p) => p.trim()).filter((p) => /^\d+$/.test(p));

    if (pids.length === 0) {
      return NextResponse.json({ success: true, message: "Server was not running." });
    }

    log.info(`[Modern-TTS Control] Killing server PIDs: ${pids.join(", ")}`);

    for (const pid of pids) {
      await execFileAsync("kill", ["-9", pid]).catch(() => {});
    }

    return NextResponse.json({ success: true, message: "Modern-TTS Server stopped." });
  } catch {
    return NextResponse.json({ success: true, message: "Modern-TTS Server is not running." });
  }
});
