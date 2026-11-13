/**
 * app/api/presenter/server/route.ts
 *
 * API for checking health and managing the ComfyUI server connection.
 * Local process spawning is disabled in the web-only production deployment.
 */

import { NextResponse } from "next/server";
import { checkComfyUIHealth } from "@/lib/ai/comfyClient";

/**
 * GET /api/presenter/server
 * Checks if ComfyUI is reachable via network ping.
 */
export async function GET() {
  try {
    const online = await checkComfyUIHealth();
    return NextResponse.json({ online, pid: null });
  } catch {
    return NextResponse.json({ online: false });
  }
}

/**
 * POST /api/presenter/server
 * Local server starting is disabled in cloud production.
 */
export async function POST() {
  return NextResponse.json({ 
    success: false, 
    error: "El control local del servidor de ComfyUI está deshabilitado en la rama (onlywebapp). Se consume como un servicio de API externa." 
  }, { status: 400 });
}

/**
 * DELETE /api/presenter/server
 * Local server stopping is disabled in cloud production.
 */
export async function DELETE() {
  return NextResponse.json({ 
    success: false, 
    error: "El control local del servidor de ComfyUI está deshabilitado en la rama (onlywebapp). Se consume como un servicio de API externa." 
  }, { status: 400 });
}
