import { currentUser } from "@clerk/nextjs/server";

/**
 * Super administrators have cross-tenant visibility (e.g. the Organizations
 * console that lists every org and its members). They are identified by email
 * so the list stays in ONE place and every guard agrees. Extend at runtime via
 * the SUPER_ADMIN_EMAILS env var (comma-separated).
 */
/**
 * Super administrators have cross-tenant visibility (e.g. the Organizations
 * console that lists every org and its members). They are identified by email
 * via the SUPER_ADMIN_EMAILS env var (comma-separated) or by Clerk metadata role 'superadmin'.
 */
const DEFAULT_SUPER_ADMINS = ["danielazar@gmail.com"];

export const getSuperAdminEmails = (): string[] => {
  const envEmails = (process.env.SUPER_ADMIN_EMAILS?.split(",") ?? [])
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return Array.from(
    new Set([
      ...DEFAULT_SUPER_ADMINS,
      ...envEmails,
    ]),
  );
};

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getSuperAdminEmails().includes(email.toLowerCase());
}

/**
 * Whether the currently signed-in Clerk user is a super admin. Safe to call
 * from server components and route handlers.
 */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await currentUser();
  if (!user) return false;
  if (user.publicMetadata?.role === "superadmin") return true;
  return isSuperAdminEmail(user.primaryEmailAddress?.emailAddress);
}
