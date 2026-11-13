import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  withTenantAuth,
  withAdminAuth,
  withSuperAdminAuth,
  withWorkerOrSuperAdmin,
} from "../../apiHandler";
import * as tenantModule from "../../tenant";
import * as adminAuthModule from "../../adminAuth";
import * as workerAuthModule from "../../workerAuth";

describe("apiHandler HOC Framework", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("withTenantAuth", () => {
    it("returns 401 when tenant check fails", async () => {
      vi.spyOn(tenantModule, "requireTenant").mockResolvedValue({
        ok: false,
        response: new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      });

      const handler = vi.fn();
      const wrapped = withTenantAuth(handler);
      const req = new NextRequest("http://localhost:3000/api/test");
      const mockContext = { params: Promise.resolve({}) };

      const res = await wrapped(req, mockContext);
      expect(res.status).toBe(401);
      expect(handler).not.toHaveBeenCalled();
    });

    it("executes handler and resolves async params when tenant check succeeds", async () => {
      const mockTenant = {
        userId: "user_123",
        orgId: "org_abc",
        isDefaultOrg: false,
      };

      vi.spyOn(tenantModule, "requireTenant").mockResolvedValue({
        ok: true,
        tenant: mockTenant,
      });

      const handler = vi.fn().mockImplementation(async (req, ctx) => {
        return new Response(JSON.stringify({ success: true, orgId: ctx.tenant.orgId, id: ctx.params.id }), {
          status: 200,
        });
      });

      const wrapped = withTenantAuth(handler);
      const req = new NextRequest("http://localhost:3000/api/test/42");
      const res = await wrapped(req, { params: Promise.resolve({ id: "42" }) });

      expect(res.status).toBe(200);
      expect(handler).toHaveBeenCalledWith(
        req,
        expect.objectContaining({
          tenant: mockTenant,
          params: { id: "42" },
        })
      );
    });

    it("catches errors thrown by handler and returns 500", async () => {
      vi.spyOn(tenantModule, "requireTenant").mockResolvedValue({
        ok: true,
        tenant: { userId: "u1", orgId: "o1", isDefaultOrg: false },
      });

      const handler = vi.fn().mockRejectedValue(new Error("Database explosion"));
      const wrapped = withTenantAuth(handler);
      const req = new NextRequest("http://localhost:3000/api/test");
      const mockContext = { params: Promise.resolve({}) };

      const res = await wrapped(req, mockContext);
      expect(res.status).toBe(500);
      const data = await res.json();
      expect(data.error).toBe("Database explosion");
    });
  });

  describe("withAdminAuth", () => {
    it("rejects non-admin requests with 403", async () => {
      vi.spyOn(adminAuthModule, "requireAdmin").mockResolvedValue({
        ok: false,
        response: new Response(JSON.stringify({ error: "Forbidden: Admin access required" }), {
          status: 403,
        }),
      });

      const handler = vi.fn();
      const wrapped = withAdminAuth(handler);
      const req = new NextRequest("http://localhost:3000/api/admin/settings");
      const mockContext = { params: Promise.resolve({}) };

      const res = await wrapped(req, mockContext);
      expect(res.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
    });

    it("allows verified admin and passes admin context", async () => {
      vi.spyOn(adminAuthModule, "requireAdmin").mockResolvedValue({
        ok: true,
        userId: "admin_1",
        email: "admin@newsstudio.com",
      });

      const handler = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
      const wrapped = withAdminAuth(handler);
      const req = new NextRequest("http://localhost:3000/api/admin/settings");
      const mockContext = { params: Promise.resolve({}) };

      const res = await wrapped(req, mockContext);
      expect(res.status).toBe(200);
      expect(handler).toHaveBeenCalledWith(
        req,
        expect.objectContaining({
          admin: { userId: "admin_1", email: "admin@newsstudio.com" },
        })
      );
    });
  });

  describe("withSuperAdminAuth", () => {
    it("rejects non-superadmin requests with 403", async () => {
      vi.spyOn(adminAuthModule, "requireSuperAdmin").mockResolvedValue({
        ok: false,
        response: new Response(JSON.stringify({ error: "Forbidden: Superadmin access required" }), {
          status: 403,
        }),
      });

      const handler = vi.fn();
      const wrapped = withSuperAdminAuth(handler);
      const req = new NextRequest("http://localhost:3000/api/admin/services/control");
      const mockContext = { params: Promise.resolve({}) };

      const res = await wrapped(req, mockContext);
      expect(res.status).toBe(403);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe("withWorkerOrSuperAdmin", () => {
    it("authorizes when valid worker API key is present", async () => {
      vi.spyOn(workerAuthModule, "requireWorkerKey").mockReturnValue(null); // null means no error

      const handler = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "worker_ok" })));
      const wrapped = withWorkerOrSuperAdmin(handler);
      const req = new NextRequest("http://localhost:3000/api/tts/server");
      const mockContext = { params: Promise.resolve({}) };

      const res = await wrapped(req, mockContext);
      expect(res.status).toBe(200);
      expect(handler).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ authType: "worker" })
      );
    });

    it("authorizes when superadmin session is present even without worker key", async () => {
      vi.spyOn(workerAuthModule, "requireWorkerKey").mockReturnValue(
        new Response(JSON.stringify({ error: "Unauthorized worker" }), { status: 401 })
      );
      vi.spyOn(adminAuthModule, "requireSuperAdmin").mockResolvedValue({
        ok: true,
        userId: "sa_1",
        email: "super@newsstudio.com",
      });

      const handler = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "sa_ok" })));
      const wrapped = withWorkerOrSuperAdmin(handler);
      const req = new NextRequest("http://localhost:3000/api/tts/server");
      const mockContext = { params: Promise.resolve({}) };

      const res = await wrapped(req, mockContext);
      expect(res.status).toBe(200);
      expect(handler).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ authType: "superadmin" })
      );
    });
  });
});
