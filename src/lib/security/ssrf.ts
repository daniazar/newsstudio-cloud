/**
 * src/lib/security/ssrf.ts
 *
 * Security utility to prevent Server-Side Request Forgery (SSRF).
 * Validates URLs against protocol restrictions, private IP ranges (RFC 1918),
 * loopback addresses, and cloud instance metadata services (169.254.169.254).
 *
 * Note: Per project configuration, local loopback destinations are permitted
 * in development environments (NODE_ENV !== "production") unless strictly enforced.
 */

import dns from "dns";
import { promisify } from "util";

const lookupAsync = promisify(dns.lookup);

// Cloud metadata IP addresses (AWS, GCP, Azure, DigitalOcean, OpenStack)
const CLOUD_METADATA_IPS = new Set([
  "169.254.169.254",
  "fd00:ec2::254", // AWS IPv6 metadata
]);

// Hostnames prohibited in all environments
const PROHIBITED_HOSTNAMES = new Set([
  "metadata.google.internal",
  "instance-data",
]);

/**
 * Checks if an IPv4 or IPv6 address belongs to a private, loopback, or reserved range.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (!ip || typeof ip !== "string") return false;
  if (ip.includes(":")) {
    return isPrivateOrReservedIpv6(ip);
  }

  // Check cloud metadata
  if (CLOUD_METADATA_IPS.has(ip)) return true;

  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return false; // Not a standard IPv4
  }

  const [b0, b1] = parts;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 10.0.0.0/8 (Private)
  if (b0 === 10) return true;

  // 172.16.0.0/12 (Private: 172.16.0.0 – 172.31.255.255)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (b0 === 192 && b1 === 168) return true;

  // 169.254.0.0/16 (Link-Local / APIPA)
  if (b0 === 169 && b1 === 254) return true;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;

  // 224.0.0.0/4 (Multicast)
  if (b0 >= 224 && b0 <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future Use)
  if (b0 >= 240) return true;

  return false;
}

/**
 * Checks if an IPv6 address is loopback, unique local, or link-local.
 */
export function isPrivateOrReservedIpv6(ip: string): boolean {
  const clean = ip.toLowerCase();
  if (clean === "::1" || clean === "0:0:0:0:0:0:0:1") return true;
  if (clean.startsWith("fc") || clean.startsWith("fd")) return true; // Unique local (fc00::/7)
  if (clean.startsWith("fe80:")) return true; // Link-local (fe80::/10)
  if (clean === "::" || clean === "0:0:0:0:0:0:0:0") return true;
  return false;
}

export interface ValidateUrlOptions {
  /** Allow local loopback (localhost, 127.0.0.1) in development. Defaults to true if NODE_ENV !== "production" */
  allowDevelopmentLoopback?: boolean;
}

/**
 * Validates that a URL is safe for server-side fetching.
 * Returns { ok: true, url: URL } if valid, or { ok: false, reason: string }.
 */
export async function validateSafePublicUrl(
  inputUrl: string,
  options: ValidateUrlOptions = {}
): Promise<{ ok: true; url: URL } | { ok: false; reason: string }> {
  if (!inputUrl || typeof inputUrl !== "string") {
    return { ok: false, reason: "URL must be a non-empty string" };
  }

  let parsed: URL;
  try {
    parsed = new URL(inputUrl);
  } catch {
    return { ok: false, reason: "Malformed URL" };
  }

  // 1. Protocol validation: Only HTTP and HTTPS
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: `Unsupported protocol: ${parsed.protocol}. Only http: and https: are allowed.` };
  }

  // 2. Reject credentials in URL (http://user:pass@host)
  if (parsed.username || parsed.password) {
    return { ok: false, reason: "URLs containing user credentials are not permitted." };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");

  // 3. Prohibited cloud metadata hostnames
  if (PROHIBITED_HOSTNAMES.has(hostname)) {
    return { ok: false, reason: "Access to cloud metadata services is strictly forbidden." };
  }

  const isDev = process.env.NODE_ENV !== "production";
  const allowDevLoopback = options.allowDevelopmentLoopback ?? isDev;

  const isLoopbackHostname =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname.endsWith(".localhost");

  // In development, permit local development endpoints (e.g., localhost, 127.0.0.1) if configured
  if (allowDevLoopback && isLoopbackHostname) {
    return { ok: true, url: parsed };
  }

  // In production, block loopback hostnames immediately
  if (isLoopbackHostname) {
    return { ok: false, reason: "Loopback and localhost destinations are not permitted in production." };
  }

  // 4. Resolve DNS to verify IP addresses
  try {
    const addresses = await lookupAsync(hostname, { all: true });

    for (const entry of addresses) {
      // Cloud metadata check is always enforced, even in development
      if (CLOUD_METADATA_IPS.has(entry.address)) {
        return { ok: false, reason: "Access to cloud metadata IP addresses is strictly forbidden." };
      }

      if (entry.family === 4) {
        if (isPrivateOrReservedIp(entry.address)) {
          if (allowDevLoopback && entry.address.startsWith("127.")) {
            continue; // Allowed in dev
          }
          return {
            ok: false,
            reason: `Target resolves to private/reserved IP: ${entry.address}. Request blocked.`,
          };
        }
      } else if (entry.family === 6) {
        if (isPrivateOrReservedIpv6(entry.address)) {
          if (allowDevLoopback && (entry.address === "::1" || entry.address === "0:0:0:0:0:0:0:1")) {
            continue;
          }
          return {
            ok: false,
            reason: `Target resolves to private/reserved IPv6: ${entry.address}. Request blocked.`,
          };
        }
      }
    }
  } catch (dnsErr: unknown) {
    return { ok: false, reason: `DNS resolution failed for host ${hostname}: ${(dnsErr as Error)?.message || dnsErr}` };
  }

  return { ok: true, url: parsed };
}

/**
 * Asserts that a URL is safe for fetching. Throws an Error with details if unsafe.
 */
export async function assertSafePublicUrl(
  inputUrl: string,
  options: ValidateUrlOptions = {}
): Promise<URL> {
  const result = await validateSafePublicUrl(inputUrl, options);
  if (!result.ok) {
    throw new Error(`SSRF Prevention: ${result.reason}`);
  }
  return result.url;
}
