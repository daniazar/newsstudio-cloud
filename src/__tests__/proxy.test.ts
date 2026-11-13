import { describe, it, expect } from "vitest";
import {
  createPathMatcher,
  isPublicRoute,
  isOrgPageRoute,
  isProtectedAdminApi,
  proxy,
} from "../proxy";

describe("Next.js 16 Proxy & Route Matching Suite", () => {
  it("should match exact routes with or without trailing slash and collapsed slashes", () => {
    const matcher = createPathMatcher(["/api/health", "/api/piper/inspect"]);

    expect(matcher({ nextUrl: { pathname: "/api/health" } })).toBe(true);
    expect(matcher({ nextUrl: { pathname: "/api/health/" } })).toBe(true);
    expect(matcher({ nextUrl: { pathname: "//api//health/" } })).toBe(true);
    expect(matcher({ nextUrl: { pathname: "/api/piper/inspect" } })).toBe(true);
    expect(matcher({ nextUrl: { pathname: "/api/piper/inspect/" } })).toBe(true);

    expect(matcher({ nextUrl: { pathname: "/api/health/extra" } })).toBe(false);
    expect(matcher({ nextUrl: { pathname: "/api/other" } })).toBe(false);
  });

  it("should match wildcard prefix routes with (.*) but reject sibling prefixes", () => {
    const matcher = createPathMatcher(["/sign-in(.*)", "/newsroom(.*)"]);

    expect(matcher({ nextUrl: { pathname: "/sign-in" } })).toBe(true);
    expect(matcher({ nextUrl: { pathname: "/sign-in/" } })).toBe(true);
    expect(matcher({ nextUrl: { pathname: "/sign-in/callback" } })).toBe(true);
    expect(matcher({ nextUrl: { pathname: "/sign-in/sso/saml" } })).toBe(true);

    // Sibling prefix should not match
    expect(matcher({ nextUrl: { pathname: "/sign-in-other" } })).toBe(false);
    expect(matcher({ nextUrl: { pathname: "/sign-inside" } })).toBe(false);

    expect(matcher({ nextUrl: { pathname: "/newsroom" } })).toBe(true);
    expect(matcher({ nextUrl: { pathname: "/newsroom/story-123" } })).toBe(true);
  });

  it("should match complex wildcard paths like turntable worker updates", () => {
    const matcher = createPathMatcher([
      "/api/ecommerce/turntable-3d(.*)/worker-update",
    ]);

    expect(
      matcher({
        nextUrl: {
          pathname: "/api/ecommerce/turntable-3d/job_12345/worker-update",
        },
      })
    ).toBe(true);
    expect(
      matcher({
        nextUrl: {
          pathname: "/api/ecommerce/turntable-3d/job_12345/worker-update/",
        },
      })
    ).toBe(true);
    expect(
      matcher({
        nextUrl: {
          pathname: "/api/ecommerce/turntable-3d/job_12345/other-endpoint",
        },
      })
    ).toBe(false);
  });

  it("should gracefully extract pathname from standard Request or url property", () => {
    const matcher = createPathMatcher(["/api/health"]);

    // Standard Request object
    const req = new Request("http://localhost:3000/api/health");
    expect(matcher(req)).toBe(true);

    // Object with only url string
    expect(matcher({ url: "https://studio.domain.com/api/health/" })).toBe(true);
  });

  it("should verify defined public and protected route classifications", () => {
    // Public routes
    expect(isPublicRoute({ nextUrl: { pathname: "/sign-in" } })).toBe(true);
    expect(isPublicRoute({ nextUrl: { pathname: "/sign-up" } })).toBe(true);
    expect(isPublicRoute({ nextUrl: { pathname: "/api/health" } })).toBe(true);
    expect(isPublicRoute({ nextUrl: { pathname: "/api/health/" } })).toBe(true);
    expect(isPublicRoute({ nextUrl: { pathname: "/api/inngest" } })).toBe(true);
    expect(isPublicRoute({ nextUrl: { pathname: "/wardrobe-studio" } })).toBe(true);

    // Protected routes are NOT public
    expect(isPublicRoute({ nextUrl: { pathname: "/newsroom" } })).toBe(false);
    expect(isPublicRoute({ nextUrl: { pathname: "/admin" } })).toBe(false);
    expect(isPublicRoute({ nextUrl: { pathname: "/api/admin/users" } })).toBe(false);

    // Org page routes
    expect(isOrgPageRoute({ nextUrl: { pathname: "/newsroom" } })).toBe(true);
    expect(isOrgPageRoute({ nextUrl: { pathname: "/admin" } })).toBe(true);
    expect(isOrgPageRoute({ nextUrl: { pathname: "/editor/123" } })).toBe(true);
    expect(isOrgPageRoute({ nextUrl: { pathname: "/ecommerce-studio" } })).toBe(true);

    // Protected admin API
    expect(isProtectedAdminApi({ nextUrl: { pathname: "/api/admin/users" } })).toBe(true);
    expect(isProtectedAdminApi({ nextUrl: { pathname: "/api/health" } })).toBe(false);
  });

  it("should export a callable proxy function compatible with Next.js 16 conventions", () => {
    expect(typeof proxy).toBe("function");
  });
});
