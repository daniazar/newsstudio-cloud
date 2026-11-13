import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  checkRateLimit,
  getRateLimitHeaders,
  rateLimitResponse,
  clearRateLimits,
  RateLimitTiers,
} from "@/lib/security/rateLimit";
import { withTenantAuth } from "@/lib/apiHandler";
import { NextRequest, NextResponse } from "next/server";

// Mock tenant authentication
vi.mock("@/lib/tenant", () => ({
  requireTenant: vi.fn(),
}));

import { requireTenant } from "@/lib/tenant";

describe("Phase 4: Rate Limiting & DoS Defense ([SEC-23])", () => {
  beforeEach(() => {
    clearRateLimits();
    vi.clearAllMocks();
  });

  it("allows requests under the configured limit", () => {
    const config = { limit: 3, windowMs: 60000 };
    const key = "tenant_test_1";

    const r1 = checkRateLimit(key, config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests when the limit is exceeded", () => {
    const config = { limit: 2, windowMs: 60000 };
    const key = "tenant_test_block";

    checkRateLimit(key, config); // 1
    checkRateLimit(key, config); // 2
    const r3 = checkRateLimit(key, config); // 3 (exceeded)

    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("isolates rate limits by key and keyPrefix", () => {
    const configA = { limit: 1, windowMs: 60000, keyPrefix: "tierA" };
    const configB = { limit: 1, windowMs: 60000, keyPrefix: "tierB" };

    const rA1 = checkRateLimit("tenant_123", configA);
    expect(rA1.allowed).toBe(true);

    const rA2 = checkRateLimit("tenant_123", configA);
    expect(rA2.allowed).toBe(false);

    // Different keyPrefix or different tenant is not blocked
    const rB1 = checkRateLimit("tenant_123", configB);
    expect(rB1.allowed).toBe(true);

    const rOther = checkRateLimit("tenant_456", configA);
    expect(rOther.allowed).toBe(true);
  });

  it("generates correct RFC rate limit headers", () => {
    const config = { limit: 5, windowMs: 60000 };
    const result = checkRateLimit("tenant_hdr", config);
    const headers = getRateLimitHeaders(result);

    expect(headers["X-RateLimit-Limit"]).toBe("5");
    expect(headers["X-RateLimit-Remaining"]).toBe("4");
    expect(headers["X-RateLimit-Reset"]).toBeDefined();
    expect(headers["Retry-After"]).toBeUndefined();

    // Now exceed the limit
    for (let i = 0; i < 5; i++) {
      checkRateLimit("tenant_hdr", config);
    }
    const blockedResult = checkRateLimit("tenant_hdr", config);
    const blockedHeaders = getRateLimitHeaders(blockedResult);

    expect(blockedHeaders["X-RateLimit-Remaining"]).toBe("0");
    expect(blockedHeaders["Retry-After"]).toBeDefined();
  });

  it("produces HTTP 429 response on limit breach", async () => {
    const config = { limit: 1, windowMs: 60000 };
    checkRateLimit("tenant_429", config);
    const blocked = checkRateLimit("tenant_429", config);

    const res = rateLimitResponse(blocked, "AI generation quota exceeded.");
    expect(res.status).toBe(429);

    const json = await res.json();
    expect(json.error).toBe("AI generation quota exceeded.");
    expect(json.retryAfter).toBeGreaterThan(0);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("1");
    expect(res.headers.get("Retry-After")).toBeDefined();
  });

  it("enforces rate limits declaratively in withTenantAuth wrapper", async () => {
    vi.mocked(requireTenant).mockResolvedValue({
      ok: true,
      tenant: {
        userId: "user-123",
        orgId: "org-limited-tenant",
        isDefaultOrg: false,
      },
    });

    const handler = vi.fn().mockImplementation(() => {
      return NextResponse.json({ success: true });
    });

    const wrapped = withTenantAuth(handler, {
      rateLimit: { limit: 2, windowMs: 60000, keyPrefix: "test" },
    });

    const req = new NextRequest("http://localhost:3000/api/ai/test");

    // Request 1: allowed
    const res1 = await wrapped(req, { params: Promise.resolve({}) });
    expect(res1.status).toBe(200);
    expect(res1.headers.get("X-RateLimit-Remaining")).toBe("1");

    // Request 2: allowed
    const res2 = await wrapped(req, { params: Promise.resolve({}) });
    expect(res2.status).toBe(200);
    expect(res2.headers.get("X-RateLimit-Remaining")).toBe("0");

    // Request 3: blocked by rate limiter with 429
    const res3 = await wrapped(req, { params: Promise.resolve({}) });
    expect(res3.status).toBe(429);
    expect(handler).toHaveBeenCalledTimes(2); // Blocked before handler execution
  });

  it("provides pre-configured RateLimitTiers", () => {
    expect(RateLimitTiers.AI_EXPENSIVE.limit).toBe(15);
    expect(RateLimitTiers.UPLOADS.limit).toBe(30);
    expect(RateLimitTiers.API_STANDARD.limit).toBe(120);
    expect(RateLimitTiers.AUTH.limit).toBe(10);
  });
});
