/**
 * NewsStudio — Centralized API Response & Error Standardizer
 *
 * Provides uniform JSON response envelopes and error handling across App Router handlers.
 */

import { NextResponse } from "next/server";
import { createLogger } from "./logger";

const log = createLogger("api");

export interface ApiSuccessPayload<T = Record<string, unknown>> {
  success: true;
  data?: T;
  [key: string]: unknown;
}

export interface ApiErrorPayload {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Returns a standardized JSON success response.
 */
export function apiSuccess<T extends Record<string, unknown>>(
  data: T,
  status = 200,
  init?: ResponseInit
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    {
      status,
      ...init,
    }
  );
}

/**
 * Normalizes an error, logs it via structured logger, and returns a standardized JSON error response.
 */
export function apiError(
  error: unknown,
  status = 500,
  fallbackMessage = "An unexpected error occurred",
  init?: ResponseInit
): NextResponse {
  const isProd = process.env.NODE_ENV === "production";
  let message = fallbackMessage;
  let code: string | undefined;

  if (error instanceof Error) {
    message = error.message || fallbackMessage;
    if ("code" in error && typeof (error as Record<string, unknown>).code === "string") {
      code = (error as Record<string, unknown>).code as string;
    }
  } else if (typeof error === "string") {
    message = error;
  }

  // Structured logging
  log.error(
    {
      status,
      code,
      stack: error instanceof Error ? error.stack : undefined,
    },
    `API Error [${status}]: ${message}`
  );

  // Sanitize message in production for 500-level internal errors
  const clientMessage = isProd && status >= 500 ? fallbackMessage : message;

  return NextResponse.json(
    {
      success: false,
      error: clientMessage,
      ...(code ? { code } : {}),
    },
    {
      status,
      ...init,
    }
  );
}
