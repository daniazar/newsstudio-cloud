"use client";

/**
 * Disabled in cloud-first architecture to eliminate idle POST /api/heartbeat requests
 * that prevent serverless/container scale-to-zero.
 */
export function IdleShutdown() {
  return null;
}
