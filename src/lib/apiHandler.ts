/**
 * src/lib/apiHandler.ts
 *
 * Higher-Order Route Handler Wrappers (HOCs) for Next.js App Router.
 *
 * Eliminates repetitive authentication boilerplate and ensures routes never omit security guards:
 * - withTenantAuth: Guarantees active Clerk organization & tenant context, provisions Company row.
 * - withAdminAuth: Guarantees verified administrator permissions (role: 'admin' or superadmin).
 * - withSuperAdminAuth: Guarantees verified super-administrator permissions.
 * - withWorkerOrSuperAdmin: Guarantees either valid WORKER_API_KEY or superadmin session.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireTenant, TenantContext } from "@/lib/tenant";
import { requireAdmin, requireSuperAdmin } from "@/lib/adminAuth";
import { requireWorkerKey } from "@/lib/workerAuth";
import {
  RateLimitConfig,
  checkRateLimitDistributed,
  rateLimitResponse,
  getRateLimitHeaders,
} from "@/lib/security/rateLimit";
import { logSecurityEvent } from "@/lib/security/auditLogger";
import { createLogger } from "@/lib/logger";

const log = createLogger({ module: "apiHandler" });

export interface HandlerOptions {
  rateLimit?: RateLimitConfig;
}

export type RouteHandlerContext<TParams = Record<string, string | string[]>> = {
  params: Promise<TParams>;
};

export type TenantHandler<TParams = Record<string, string | string[]>> = (
  req: NextRequest,
  ctx: {
    tenant: TenantContext;
    params: TParams;
  }
) => Promise<Response> | Response;

export type AdminHandler<TParams = Record<string, string | string[]>> = (
  req: NextRequest,
  ctx: {
    admin: { userId: string; email?: string };
    params: TParams;
  }
) => Promise<Response> | Response;

export type SuperAdminHandler<TParams = Record<string, string | string[]>> = (
  req: NextRequest,
  ctx: {
    superAdmin: { userId: string; email?: string };
    params: TParams;
  }
) => Promise<Response> | Response;

export type WorkerOrAdminHandler<TParams = Record<string, string | string[]>> = (
  req: NextRequest,
  ctx: {
    authType: "worker" | "superadmin";
    params: TParams;
  }
) => Promise<Response> | Response;

export type ApiRouteHandler<TParams = Record<string, string | string[]>> = (
  req: NextRequest,
  context: RouteHandlerContext<TParams>
) => Promise<Response>;

/**
 * Wraps an API route handler to enforce tenant authentication and optional rate limiting.
 * Automatically handles Next.js 15 async params, provisions the company, and catches unhandled errors.
 *
 * Usage:
 *   export const POST = withTenantAuth(async (req, { tenant, params }) => {
 *     const { orgId } = tenant;
 *     ...
 *   }, { rateLimit: RateLimitTiers.AI_EXPENSIVE });
 */
export function withTenantAuth<TParams = Record<string, string | string[]>>(
  handler: TenantHandler<TParams>,
  options?: HandlerOptions
): ApiRouteHandler<TParams> {
  const wrapped = async (
    req: NextRequest,
    context?: RouteHandlerContext<TParams>
  ): Promise<Response> => {
    const startedAt = Date.now();
    const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

    const t = await requireTenant();
    if (!t.ok) {
      logSecurityEvent({
        eventType: "AUTH_FAILURE",
        severity: "WARN",
        route: req.nextUrl?.pathname,
        ip: req.headers.get("x-forwarded-for") || undefined,
      });
      return t.response;
    }

    let rlHeaders: Record<string, string> | null = null;
    if (options?.rateLimit) {
      const rateLimitResult = await checkRateLimitDistributed(t.tenant.orgId, options.rateLimit);
      if (!rateLimitResult.allowed) {
        logSecurityEvent({
          eventType: "RATE_LIMIT_EXCEEDED",
          severity: "SECURITY_ALERT",
          route: req.nextUrl?.pathname,
          tenantId: t.tenant.orgId,
          userId: t.tenant.userId,
          ip: req.headers.get("x-forwarded-for") || undefined,
        });
        return rateLimitResponse(rateLimitResult);
      }
      rlHeaders = getRateLimitHeaders(rateLimitResult);
    }

    const resolvedParams = context?.params
      ? await Promise.resolve(context.params)
      : ({} as TParams);

    try {
      const response = await handler(req, { tenant: t.tenant, params: resolvedParams });
      if (rlHeaders && response && "headers" in response && response.headers instanceof Headers) {
        for (const [key, value] of Object.entries(rlHeaders)) {
          response.headers.set(key, value);
        }
      }
      if (response && "headers" in response && response.headers instanceof Headers) {
        if (!response.headers.has("x-request-id")) {
          response.headers.set("x-request-id", requestId);
        }
      }
      return response;
    } catch (error: unknown) {
      log.error(
        {
          err: error,
          requestId,
          method: req.method,
          route: req.nextUrl?.pathname,
          companyId: (t.tenant as unknown as { companyId?: string })?.companyId ?? t.tenant.orgId ?? null,
          userId: t.tenant.userId ?? null,
          durationMs: Date.now() - startedAt,
        },
        "Unhandled API route error"
      );
      const message = error instanceof Error ? error.message : "Internal Server Error";
      const errResponse = NextResponse.json({ error: message }, { status: 500 });
      errResponse.headers.set("x-request-id", requestId);
      return errResponse;
    }
  };
  return wrapped as ApiRouteHandler<TParams>;
}

/**
 * Wraps an API route handler to enforce administrator authentication and optional rate limiting.
 */
export function withAdminAuth<TParams = Record<string, string | string[]>>(
  handler: AdminHandler<TParams>,
  options?: HandlerOptions
): ApiRouteHandler<TParams> {
  const wrapped = async (
    req: NextRequest,
    context?: RouteHandlerContext<TParams>
  ): Promise<Response> => {
    const startedAt = Date.now();
    const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

    const a = await requireAdmin();
    if (!a.ok) {
      logSecurityEvent({
        eventType: "ACCESS_DENIED",
        severity: "SECURITY_ALERT",
        route: req.nextUrl?.pathname,
        ip: req.headers.get("x-forwarded-for") || undefined,
        action: "requireAdmin",
      });
      return a.response;
    }

    let rlHeaders: Record<string, string> | null = null;
    if (options?.rateLimit) {
      const rateLimitResult = await checkRateLimitDistributed(a.userId, options.rateLimit);
      if (!rateLimitResult.allowed) {
        logSecurityEvent({
          eventType: "RATE_LIMIT_EXCEEDED",
          severity: "SECURITY_ALERT",
          route: req.nextUrl?.pathname,
          userId: a.userId,
          ip: req.headers.get("x-forwarded-for") || undefined,
        });
        return rateLimitResponse(rateLimitResult);
      }
      rlHeaders = getRateLimitHeaders(rateLimitResult);
    }

    const resolvedParams = context?.params
      ? await Promise.resolve(context.params)
      : ({} as TParams);

    try {
      const response = await handler(req, {
        admin: { userId: a.userId, email: a.email },
        params: resolvedParams,
      });
      if (rlHeaders && response && "headers" in response && response.headers instanceof Headers) {
        for (const [key, value] of Object.entries(rlHeaders)) {
          response.headers.set(key, value);
        }
      }
      if (response && "headers" in response && response.headers instanceof Headers) {
        if (!response.headers.has("x-request-id")) {
          response.headers.set("x-request-id", requestId);
        }
      }
      return response;
    } catch (error: unknown) {
      log.error(
        {
          err: error,
          requestId,
          method: req.method,
          route: req.nextUrl?.pathname,
          userId: a.userId ?? null,
          durationMs: Date.now() - startedAt,
        },
        "Unhandled Admin API route error"
      );
      const message = error instanceof Error ? error.message : "Internal Server Error";
      const errResponse = NextResponse.json({ error: message }, { status: 500 });
      errResponse.headers.set("x-request-id", requestId);
      return errResponse;
    }
  };
  return wrapped as ApiRouteHandler<TParams>;
}

/**
 * Wraps an API route handler to enforce super-administrator authentication and optional rate limiting.
 */
export function withSuperAdminAuth<TParams = Record<string, string | string[]>>(
  handler: SuperAdminHandler<TParams>,
  options?: HandlerOptions
): ApiRouteHandler<TParams> {
  const wrapped = async (
    req: NextRequest,
    context?: RouteHandlerContext<TParams>
  ): Promise<Response> => {
    const startedAt = Date.now();
    const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

    const sa = await requireSuperAdmin();
    if (!sa.ok) {
      logSecurityEvent({
        eventType: "ACCESS_DENIED",
        severity: "SECURITY_ALERT",
        route: req.nextUrl?.pathname,
        ip: req.headers.get("x-forwarded-for") || undefined,
        action: "requireSuperAdmin",
      });
      return sa.response;
    }

    let rlHeaders: Record<string, string> | null = null;
    if (options?.rateLimit) {
      const rateLimitResult = await checkRateLimitDistributed(sa.userId, options.rateLimit);
      if (!rateLimitResult.allowed) {
        logSecurityEvent({
          eventType: "RATE_LIMIT_EXCEEDED",
          severity: "SECURITY_ALERT",
          route: req.nextUrl?.pathname,
          userId: sa.userId,
          ip: req.headers.get("x-forwarded-for") || undefined,
        });
        return rateLimitResponse(rateLimitResult);
      }
      rlHeaders = getRateLimitHeaders(rateLimitResult);
    }

    const resolvedParams = context?.params
      ? await Promise.resolve(context.params)
      : ({} as TParams);

    try {
      const response = await handler(req, {
        superAdmin: { userId: sa.userId, email: sa.email },
        params: resolvedParams,
      });
      if (rlHeaders && response && "headers" in response && response.headers instanceof Headers) {
        for (const [key, value] of Object.entries(rlHeaders)) {
          response.headers.set(key, value);
        }
      }
      if (response && "headers" in response && response.headers instanceof Headers) {
        if (!response.headers.has("x-request-id")) {
          response.headers.set("x-request-id", requestId);
        }
      }
      return response;
    } catch (error: unknown) {
      log.error(
        {
          err: error,
          requestId,
          method: req.method,
          route: req.nextUrl?.pathname,
          userId: sa.userId ?? null,
          durationMs: Date.now() - startedAt,
        },
        "Unhandled SuperAdmin API route error"
      );
      const message = error instanceof Error ? error.message : "Internal Server Error";
      const errResponse = NextResponse.json({ error: message }, { status: 500 });
      errResponse.headers.set("x-request-id", requestId);
      return errResponse;
    }
  };
  return wrapped as ApiRouteHandler<TParams>;
}

/**
 * Wraps an API route handler to allow either an authorized background worker or superadmin.
 */
export function withWorkerOrSuperAdmin<TParams = Record<string, string | string[]>>(
  handler: WorkerOrAdminHandler<TParams>
): ApiRouteHandler<TParams> {
  const wrapped = async (
    req: NextRequest,
    context?: RouteHandlerContext<TParams>
  ): Promise<Response> => {
    const startedAt = Date.now();
    const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

    const isWorker = requireWorkerKey(req) === null;
    let authType: "worker" | "superadmin" = "worker";

    if (!isWorker) {
      const sa = await requireSuperAdmin();
      if (!sa.ok) return sa.response;
      authType = "superadmin";
    }

    const resolvedParams = context?.params
      ? await Promise.resolve(context.params)
      : ({} as TParams);

    try {
      const response = await handler(req, { authType, params: resolvedParams });
      if (response && "headers" in response && response.headers instanceof Headers) {
        if (!response.headers.has("x-request-id")) {
          response.headers.set("x-request-id", requestId);
        }
      }
      return response;
    } catch (error: unknown) {
      log.error(
        {
          err: error,
          requestId,
          method: req.method,
          route: req.nextUrl?.pathname,
          durationMs: Date.now() - startedAt,
        },
        "Unhandled Worker/SuperAdmin API route error"
      );
      const message = error instanceof Error ? error.message : "Internal Server Error";
      const errResponse = NextResponse.json({ error: message }, { status: 500 });
      errResponse.headers.set("x-request-id", requestId);
      return errResponse;
    }
  };
  return wrapped as ApiRouteHandler<TParams>;
}
