import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Creates a route matcher function that tests a request URL path against patterns.
 * Avoids Clerk's deprecated createRouteMatcher() to ensure forward compatibility.
 * Normalizes trailing slashes, duplicate slashes, URI percent-decoding, and supports
 * both NextRequest and standard Request objects.
 */
export function createPathMatcher(patterns: string[]) {
  const regexes = patterns.map((pattern) => {
    let normalized = pattern.startsWith("/") ? pattern : `/${pattern}`;
    if (normalized.length > 1 && normalized.endsWith("/")) {
      normalized = normalized.slice(0, -1);
    }
    const rxStr = normalized.replace(/\(\.\*\)/g, "(?:/.*)?");
    return new RegExp(`^${rxStr}$`);
  });

  return (req: NextRequest | Request | { nextUrl?: { pathname: string }; url?: string }) => {
    let rawPath = "";
    if ("nextUrl" in req && req.nextUrl) {
      rawPath = req.nextUrl.pathname;
    } else if (req.url) {
      try {
        rawPath = new URL(req.url, "http://localhost").pathname;
      } catch {
        rawPath = "";
      }
    }
    let pathname = rawPath;
    try {
      pathname = decodeURI(pathname);
    } catch {
      // Retain raw path if malformed URI component
    }
    pathname = pathname.replace(/\/+/g, "/");
    if (pathname.length > 1 && pathname.endsWith("/")) {
      pathname = pathname.slice(0, -1);
    }
    return regexes.some((rx) => rx.test(pathname));
  };
}

// Public routes that do not require an active session or organization context
export const isPublicRoute = createPathMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/pending-approval(.*)",
  "/organization-selection(.*)",
  "/tools/viseme-compositor(.*)",
  "/wardrobe-studio(.*)",
  "/api/wardrobe(.*)",
  "/api/health(.*)",
  "/api/inngest(.*)",
  "/api/webhooks(.*)",
  "/api/piper/inspect",
  "/api/pipeline(.*)",
  "/api/worker(.*)",
  "/api/ingest(.*)",
  "/api/ecommerce/turntable-3d(.*)/worker-update",
]);

// Page routes that require an active organization (tenant) context
export const isOrgPageRoute = createPathMatcher([
  "/newsroom(.*)",
  "/admin(.*)",
  "/feeds(.*)",
  "/brands(.*)",
  "/personas(.*)",
  "/vault(.*)",
  "/pipeline(.*)",
  "/editor(.*)",
  "/notifications(.*)",
  "/ecommerce-studio(.*)",
  "/podcast-studio(.*)",
  "/interview-studio(.*)",
  "/vtuber-studio(.*)",
  "/localization-studio(.*)",
  "/data-graphics-studio(.*)",
  "/narrative-matrix(.*)",
  "/roundtable-studio(.*)",
  "/field-reporter-studio(.*)",
  "/voice-studio(.*)",
  "/tools(.*)",
]);

// Administrative API endpoints require authentication at the edge
export const isProtectedAdminApi = createPathMatcher(["/api/admin(.*)"]);

const handler = clerkMiddleware(
  async (auth, req) => {
    if (isPublicRoute(req)) return;

    const configuredWorkerKey = process.env.WORKER_API_KEY;
    const hasValidWorkerKey = Boolean(
      configuredWorkerKey && req.headers.get("x-worker-key") === configuredWorkerKey
    );

    if (isProtectedAdminApi(req) && !hasValidWorkerKey) {
      await auth.protect();
      return;
    }

    if (isOrgPageRoute(req)) {
      await auth.protect();
      const { orgId } = await auth();
      if (!orgId) {
        return NextResponse.redirect(new URL("/organization-selection", req.url));
      }
    }
  },
  {
    // Mitigate potential clock skew in development environments (token-iat-in-the-future)
    clockSkewInMs: 60_000,
  }
);

export default handler;
export { handler as proxy };

export const config = {
  matcher: [
    // Skip Next.js internals, static files, and zero-auth health check probes
    "/((?!_next|api/health|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for other API routes
    "/(api(?!/health)|trpc)(.*)",
  ],
};
