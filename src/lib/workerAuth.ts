import crypto from "crypto";

/**
 * Authentication guard for worker-facing API routes.
 *
 * Workers are not Clerk users — they authenticate via a shared secret
 * (`WORKER_API_KEY`) sent as a Bearer token in the Authorization header.
 *
 * Uses constant-time buffer comparison to prevent timing attacks.
 *
 * Usage:
 *   const err = requireWorkerKey(req);
 *   if (err) return err;
 */
export function requireWorkerKey(req: Request): Response | null {
  const authHeader = req.headers.get("Authorization");
  const workerHeader = req.headers.get("x-worker-key");
  const key = workerHeader || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader);
  const expected = process.env.WORKER_API_KEY;

  if (!expected) {
    return Response.json(
      { error: "WORKER_API_KEY not configured on server" },
      { status: 500 }
    );
  }

  if (!key) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keyBuffer = Buffer.from(key);
  const expectedBuffer = Buffer.from(expected);

  if (keyBuffer.length !== expectedBuffer.length) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!crypto.timingSafeEqual(keyBuffer, expectedBuffer)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // Authenticated
}
