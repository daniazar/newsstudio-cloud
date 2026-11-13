/**
 * src/lib/security/__tests__/ssrf.test.ts
 */

import { describe, it, expect } from "vitest";
import { validateSafePublicUrl, isPrivateOrReservedIp, isPrivateOrReservedIpv6 } from "../ssrf";

describe("SSRF Protection Utility", () => {
  describe("IP boundary checks", () => {
    it("should identify private and loopback IPv4 addresses", () => {
      expect(isPrivateOrReservedIp("127.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("127.255.255.255")).toBe(true);
      expect(isPrivateOrReservedIp("10.0.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("172.16.0.1")).toBe(true);
      expect(isPrivateOrReservedIp("172.31.255.255")).toBe(true);
      expect(isPrivateOrReservedIp("192.168.1.1")).toBe(true);
      expect(isPrivateOrReservedIp("169.254.169.254")).toBe(true); // Cloud metadata
      expect(isPrivateOrReservedIp("0.0.0.0")).toBe(true);
      expect(isPrivateOrReservedIp("224.0.0.1")).toBe(true); // Multicast
    });

    it("should permit public routable IPv4 addresses", () => {
      expect(isPrivateOrReservedIp("8.8.8.8")).toBe(false);
      expect(isPrivateOrReservedIp("1.1.1.1")).toBe(false);
      expect(isPrivateOrReservedIp("142.250.190.46")).toBe(false); // Google
    });

    it("should identify private IPv6 addresses", () => {
      expect(isPrivateOrReservedIpv6("::1")).toBe(true);
      expect(isPrivateOrReservedIpv6("fe80::1")).toBe(true);
      expect(isPrivateOrReservedIpv6("fc00::1")).toBe(true);
      expect(isPrivateOrReservedIpv6("fd12:3456:789a::1")).toBe(true);
    });
  });

  describe("validateSafePublicUrl", () => {
    it("should reject non-http/https protocols", async () => {
      const fileRes = await validateSafePublicUrl("file:///etc/passwd");
      expect(fileRes.ok).toBe(false);

      const gopherRes = await validateSafePublicUrl("gopher://127.0.0.1:8188");
      expect(gopherRes.ok).toBe(false);
    });

    it("should reject credentials in URLs", async () => {
      const credRes = await validateSafePublicUrl("https://admin:secret@example.com/img.png");
      expect(credRes.ok).toBe(false);
      if (!credRes.ok) {
        expect(credRes.reason).toContain("credentials");
      }
    });

    it("should always reject cloud metadata destinations", async () => {
      const res = await validateSafePublicUrl("http://169.254.169.254/latest/meta-data/");
      expect(res.ok).toBe(false);

      const resDev = await validateSafePublicUrl("http://169.254.169.254/latest/meta-data/", {
        allowDevelopmentLoopback: true,
      });
      expect(resDev.ok).toBe(false);
    });

    it("should allow localhost/127.0.0.1 when allowDevelopmentLoopback is true", async () => {
      const res = await validateSafePublicUrl("http://localhost:8188/logo.png", {
        allowDevelopmentLoopback: true,
      });
      expect(res.ok).toBe(true);

      const resIp = await validateSafePublicUrl("http://127.0.0.1:3000/assets/test.png", {
        allowDevelopmentLoopback: true,
      });
      expect(resIp.ok).toBe(true);
    });

    it("should reject localhost/127.0.0.1 when allowDevelopmentLoopback is false (production mode)", async () => {
      const res = await validateSafePublicUrl("http://localhost:8188/logo.png", {
        allowDevelopmentLoopback: false,
      });
      expect(res.ok).toBe(false);
    });

    it("should allow valid public internet URLs", async () => {
      const res = await validateSafePublicUrl("https://images.unsplash.com/photo-1500?auto=format");
      expect(res.ok).toBe(true);
    });
  });
});
