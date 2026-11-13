/**
 * GET /api/ecommerce/turntable-3d/engines
 * Proxy for Object3D-Server `/engines` (+ GPU info from `/health`).
 * Never 500s: when the server is down, returns `{ online: false, error, engines: [], quality_routing: {} }`.
 */

import { requireTenant } from "@/lib/tenant";
import { getObject3DEngines } from "@/lib/ai/object3dClient";
import type { Turntable3DEnginesResponse } from "@/lib/types/turntable3d";

export async function GET() {
  const t = await requireTenant();
  if (!t.ok) return t.response;

  let payload: Turntable3DEnginesResponse;
  try {
    payload = await getObject3DEngines({ timeoutMs: 2000 });
  } catch (error) {
    payload = {
      online: false,
      error: error instanceof Error ? error.message : String(error),
      engines: [],
      quality_routing: {},
    };
  }

  return Response.json(payload, { headers: { "Cache-Control": "no-store" } });
}
