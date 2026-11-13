import { currentUser, auth } from "@clerk/nextjs/server";
import { isSuperAdminEmail, isSuperAdmin } from "@/lib/superadmin";

export type AdminAuthResult =
  | { ok: true; userId: string; email?: string }
  | { ok: false; response: Response };

/**
 * Ensures that the calling request is authenticated and has administrative privileges
 * (either a verified superadmin email, or Clerk metadata role 'admin' / 'superadmin').
 *
 * Usage in Route Handlers:
 *   const a = await requireAdmin();
 *   if (!a.ok) return a.response;
 */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const user = await currentUser();
  if (!user) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const email = user.primaryEmailAddress?.emailAddress;
  const role = user.publicMetadata?.role;
  const isAdmin = isSuperAdminEmail(email) || role === "admin" || role === "superadmin";

  if (!isAdmin) {
    return {
      ok: false,
      response: Response.json(
        { error: "Forbidden: Administrator permissions required" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId, email };
}

/**
 * Ensures that the calling request is authenticated and has Super-Administrator privileges.
 * Super-Administrators have global operational control (service lifecycle, DB maintenance).
 *
 * Usage in Route Handlers:
 *   const sa = await requireSuperAdmin();
 *   if (!sa.ok) return sa.response;
 */
export async function requireSuperAdmin(): Promise<AdminAuthResult> {
  const { userId } = await auth();
  if (!userId) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const authorized = await isSuperAdmin();
  if (!authorized) {
    return {
      ok: false,
      response: Response.json(
        { error: "Forbidden: Super-Administrator permissions required" },
        { status: 403 }
      ),
    };
  }

  const user = await currentUser();
  return {
    ok: true,
    userId,
    email: user?.primaryEmailAddress?.emailAddress,
  };
}
