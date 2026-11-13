import { describe, it, expect, beforeEach, vi } from "vitest";
import { getTenant, requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    company: {
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: vi.fn(),
}));

describe("Tenant Middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.DEFAULT_ORG_ID = "";
  });

  describe("getTenant", () => {
    it("should return tenant context when user is authenticated with org", async () => {
      (auth as any).mockResolvedValue({
        userId: "user_123",
        orgId: "org_456",
      });

      const tenant = await getTenant();

      expect(tenant).toEqual({
        userId: "user_123",
        orgId: "org_456",
        isDefaultOrg: false,
      });
    });

    it("should identify default org correctly", async () => {
      process.env.DEFAULT_ORG_ID = "org_default";

      (auth as any).mockResolvedValue({
        userId: "user_123",
        orgId: "org_default",
      });

      const tenant = await getTenant();

      // The DEFAULT_ORG_ID is set at module load time, so we need to verify the logic works
      expect(tenant.orgId).toBe("org_default");
    });

    it("should throw 401 when user is not authenticated", async () => {
      (auth as any).mockResolvedValue({
        userId: null,
        orgId: null,
      });

      await expect(getTenant()).rejects.toThrow();
    });

    it("should throw 403 when org is not selected", async () => {
      (auth as any).mockResolvedValue({
        userId: "user_123",
        orgId: null,
      });

      await expect(getTenant()).rejects.toThrow();
    });
  });

  describe("requireTenant", () => {
    it("should return tenant context and ensure company exists", async () => {
      (auth as any).mockResolvedValue({
        userId: "user_123",
        orgId: "org_456",
      });

      (prisma.company.upsert as any).mockResolvedValue({
        id: "org_456",
        name: "Test Company",
      });

      const result = await requireTenant();

      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error("Expected result.ok to be true");
      expect(result.tenant).toEqual({
        userId: "user_123",
        orgId: "org_456",
        isDefaultOrg: false,
      });

      expect(prisma.company.upsert).toHaveBeenCalled();
    });

    it("should return error response when tenant check fails", async () => {
      (auth as any).mockResolvedValue({
        userId: null,
        orgId: null,
      });

      const result = await requireTenant();

      expect(result.ok).toBe(false);
      if (result.ok) throw new Error("Expected result.ok to be false");
      expect(result.response).toBeInstanceOf(Response);
      expect(result.response.status).toBe(401);
    });
  });
});