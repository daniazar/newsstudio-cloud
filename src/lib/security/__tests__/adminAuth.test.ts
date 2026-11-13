import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @clerk/nextjs/server
vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
}));

import { auth, currentUser } from "@clerk/nextjs/server";
import { requireAdmin, requireSuperAdmin } from "@/lib/adminAuth";

describe("Admin & Superadmin Authentication Guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPER_ADMIN_EMAILS = "superadmin@newsstudio.com,lead@newsstudio.com";
  });

  it("rejects unauthenticated requests with 401", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);
    vi.mocked(currentUser).mockResolvedValue(null);

    const adminResult = await requireAdmin();
    expect(adminResult.ok).toBe(false);
    if (!adminResult.ok) {
      expect(adminResult.response.status).toBe(401);
    }

    const superAdminResult = await requireSuperAdmin();
    expect(superAdminResult.ok).toBe(false);
    if (!superAdminResult.ok) {
      expect(superAdminResult.response.status).toBe(401);
    }
  });

  it("rejects regular users without admin role with 403", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "user-123" } as any);
    vi.mocked(currentUser).mockResolvedValue({
      id: "user-123",
      primaryEmailAddress: { emailAddress: "editor@newsstudio.com" },
      publicMetadata: { role: "editor" },
    } as any);

    const adminResult = await requireAdmin();
    expect(adminResult.ok).toBe(false);
    if (!adminResult.ok) {
      expect(adminResult.response.status).toBe(403);
    }

    const superAdminResult = await requireSuperAdmin();
    expect(superAdminResult.ok).toBe(false);
    if (!superAdminResult.ok) {
      expect(superAdminResult.response.status).toBe(403);
    }
  });

  it("allows users with publicMetadata role: admin for requireAdmin", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "admin-123" } as any);
    vi.mocked(currentUser).mockResolvedValue({
      id: "admin-123",
      primaryEmailAddress: { emailAddress: "tenant_admin@tenant.com" },
      publicMetadata: { role: "admin" },
    } as any);

    const adminResult = await requireAdmin();
    expect(adminResult.ok).toBe(true);

    const superAdminResult = await requireSuperAdmin();
    expect(superAdminResult.ok).toBe(false);
    if (!superAdminResult.ok) {
      expect(superAdminResult.response.status).toBe(403);
    }
  });

  it("allows superadmin email for both requireAdmin and requireSuperAdmin", async () => {
    vi.mocked(auth).mockResolvedValue({ userId: "super-123" } as any);
    vi.mocked(currentUser).mockResolvedValue({
      id: "super-123",
      primaryEmailAddress: { emailAddress: "superadmin@newsstudio.com" },
      publicMetadata: {},
    } as any);

    const adminResult = await requireAdmin();
    expect(adminResult.ok).toBe(true);

    const superAdminResult = await requireSuperAdmin();
    expect(superAdminResult.ok).toBe(true);
  });
});
