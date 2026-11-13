/**
 * src/lib/ecommerce/__tests__/turntableRoute.test.ts
 *
 * Tests for Neural Product Turntable API route (/api/ecommerce/generate-turntable):
 * - Validates input parameters (productName, productImageUrl, engine).
 * - Tests Google Veo 3.1 engine dry-run compilation and prompt synthesis.
 * - Tests job tracking via GET polling.
 * - Tests DELETE job cleanup.
 */

import { describe, it, expect, vi } from "vitest";
import { POST, GET, DELETE } from "@/app/api/ecommerce/generate-turntable/route";
import { NextRequest } from "next/server";

// Mock requireTenant to allow testing without Clerk auth session
vi.mock("@/lib/tenant", () => ({
  requireTenant: vi.fn().mockResolvedValue({ ok: true, companyId: "test_tenant" }),
}));

describe("POST /api/ecommerce/generate-turntable", () => {
  it("returns 400 if both productImageUrl and productName are missing", async () => {
    const req = new NextRequest("http://localhost:3000/api/ecommerce/generate-turntable", {
      method: "POST",
      body: JSON.stringify({
        productName: "",
        productImageUrl: "",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Valid product image or product name is required");
  });

  it("successfully enqueues a Google Veo turntable generation job in dryRun mode", async () => {
    const req = new NextRequest("http://localhost:3000/api/ecommerce/generate-turntable", {
      method: "POST",
      body: JSON.stringify({
        productId: "cmulps6wo001tts4rwx2aqwj3",
        productName: "Spectro",
        sceneIndex: 0,
        productImageUrl: "/assets/ecommerce/turntables/perfume_turntable_fixed_hero_tao_2step_00001.mp4",
        engine: "google_veo",
        stagingArchetype: "podium_pedestal",
        motionPreset: "hero_arc_60",
        pedestalStyle: "obsidian_black",
        lightingStyle: "luxury_gold",
        environmentId: "obsidian_vip_lounge",
        dryRun: true,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.dryRun).toBe(true);
    expect(data.jobId).toBeTruthy();
    expect(data.videoUrl).toContain("/assets/ecommerce/turntables/turntable_cmulps6wo001tts4rwx2aqwj3_s0_");
    expect(data.prompt).toContain("Spectro");
    expect(data.prompt).toContain("commercial showcase");
  });

  it("enqueues an active Google Veo job with 202 Accepted and pollUrl in async mode", async () => {
    const req = new NextRequest("http://localhost:3000/api/ecommerce/generate-turntable", {
      method: "POST",
      body: JSON.stringify({
        productId: "cmulps6wo001tts4rwx2aqwj3",
        productName: "Spectro",
        sceneIndex: 0,
        engine: "google_veo",
        stagingArchetype: "podium_pedestal",
        motionPreset: "hero_arc_60",
        pedestalStyle: "obsidian_black",
        lightingStyle: "luxury_gold",
        environmentId: "obsidian_vip_lounge",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(202);
    expect(data.success).toBe(true);
    expect(data.jobId).toBeTruthy();
    expect(data.status).toBe("processing");
    expect(data.pollUrl).toContain(`/api/ecommerce/generate-turntable?jobId=${data.jobId}`);

    // Test GET polling for this job
    const pollReq = new NextRequest(`http://localhost:3000/api/ecommerce/generate-turntable?jobId=${data.jobId}`);
    const pollRes = await GET(pollReq);
    const pollData = await pollRes.json();

    expect(pollRes.status).toBe(200);
    expect(pollData.success).toBe(true);
    expect(pollData.id).toBe(data.jobId);
    expect(pollData.engine).toBe("google_veo");
    expect(Array.isArray(pollData.logs)).toBe(true);

    // Test DELETE job cleanup
    const delReq = new NextRequest(`http://localhost:3000/api/ecommerce/generate-turntable?jobId=${data.jobId}`, {
      method: "DELETE",
    });
    const delRes = await DELETE(delReq);
    const delData = await delRes.json();

    expect(delRes.status).toBe(200);
    expect(delData.success).toBe(true);
  });
});
