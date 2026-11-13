import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as aestheticsPOST } from "../[id]/aesthetics/route";
import { POST as hashtagsPOST } from "../[id]/hashtags/route";
import { POST as generateBrandPOST } from "../generate-brand/route";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { generateLlmObject, generateLlmText } from "@/lib/llm/aiSdkGateway";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    brand: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/tenant", () => ({
  requireTenant: vi.fn(),
}));

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: vi.fn(),
  generateLlmText: vi.fn(),
}));

describe("Brands LLM API Endpoints", () => {
  const mockTenant = {
    userId: "user_test",
    orgId: "org_test_123",
    isDefaultOrg: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (requireTenant as any).mockResolvedValue({
      ok: true,
      tenant: mockTenant,
    });
  });

  describe("POST /api/brands/[id]/aesthetics", () => {
    it("returns 404 if brand is not found", async () => {
      (prisma.brand.findFirst as any).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/brands/b1/aesthetics", {
        method: "POST",
      });
      const response = await aestheticsPOST(request, {
        params: Promise.resolve({ id: "b1" }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Brand not found");
    });

    it("generates brand aesthetics successfully via generateLlmObject", async () => {
      (prisma.brand.findFirst as any).mockResolvedValue({
        id: "b1",
        name: "TechPulse News",
        handle: "@techpulse",
        companyId: "org_test_123",
      });

      const mockAesthetics = {
        toneOfVoice: "Sharp, forward-looking tech journalism",
        primaryColor: "#0ea5e9",
        secondaryColor: "#1e293b",
        captionStyle: "beast",
        preferredMusicMood: "tech upbeat",
      };

      (generateLlmObject as any).mockResolvedValue({
        object: mockAesthetics,
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const request = new NextRequest("http://localhost:3000/api/brands/b1/aesthetics", {
        method: "POST",
      });
      const response = await aestheticsPOST(request, {
        params: Promise.resolve({ id: "b1" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockAesthetics);
      expect(generateLlmObject).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "org_test_123",
          schemaName: "BrandAesthetics",
        })
      );
    });

    it("returns 500 when generateLlmObject fails", async () => {
      (prisma.brand.findFirst as any).mockResolvedValue({
        id: "b1",
        name: "TechPulse News",
        handle: "@techpulse",
      });

      (generateLlmObject as any).mockRejectedValue(new Error("LLM failure"));

      const request = new NextRequest("http://localhost:3000/api/brands/b1/aesthetics", {
        method: "POST",
      });
      const response = await aestheticsPOST(request, {
        params: Promise.resolve({ id: "b1" }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe("Failed to generate aesthetics");
    });
  });

  describe("POST /api/brands/[id]/hashtags", () => {
    it("returns 404 if brand is not found", async () => {
      (prisma.brand.findFirst as any).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/brands/b1/hashtags", {
        method: "POST",
      });
      const response = await hashtagsPOST(request, {
        params: Promise.resolve({ id: "b1" }),
      });

      expect(response.status).toBe(404);
    });

    it("generates hashtags successfully and forwards companyId to generateLlmText", async () => {
      (prisma.brand.findFirst as any).mockResolvedValue({
        id: "b1",
        name: "World Brief",
        handle: "@worldbrief",
        rssGroups: [{ feeds: [{ name: "BBC News" }, { name: "Reuters" }] }],
      });

      (generateLlmText as any).mockResolvedValue({
        text: "#news #worldnews #breaking #geopolitics #currentaffairs",
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const request = new NextRequest("http://localhost:3000/api/brands/b1/hashtags", {
        method: "POST",
      });
      const response = await hashtagsPOST(request, {
        params: Promise.resolve({ id: "b1" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.hashtags).toBe("#news #worldnews #breaking #geopolitics #currentaffairs");
      expect(generateLlmText).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "org_test_123",
          temperature: 0.7,
        })
      );
    });

    it("normalizes comma-separated words missing hash symbols", async () => {
      (prisma.brand.findFirst as any).mockResolvedValue({
        id: "b1",
        name: "World Brief",
        handle: "@worldbrief",
        rssGroups: [],
      });

      (generateLlmText as any).mockResolvedValue({
        text: "news, breaking, world",
        providerUsed: "ollama",
        modelUsed: "qwen3.5:9b",
      });

      const request = new NextRequest("http://localhost:3000/api/brands/b1/hashtags", {
        method: "POST",
      });
      const response = await hashtagsPOST(request, {
        params: Promise.resolve({ id: "b1" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.hashtags).toBe("#news #breaking #world");
    });

    it("normalizes space-separated words missing hash symbols", async () => {
      (prisma.brand.findFirst as any).mockResolvedValue({
        id: "b1",
        name: "World Brief",
        handle: "@worldbrief",
        rssGroups: [],
      });

      (generateLlmText as any).mockResolvedValue({
        text: "tech news geopolitics",
        providerUsed: "ollama",
        modelUsed: "qwen3.5:9b",
      });

      const request = new NextRequest("http://localhost:3000/api/brands/b1/hashtags", {
        method: "POST",
      });
      const response = await hashtagsPOST(request, {
        params: Promise.resolve({ id: "b1" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.hashtags).toBe("#tech #news #geopolitics");
    });

    it("extracts hashtags from numbered list output", async () => {
      (prisma.brand.findFirst as any).mockResolvedValue({
        id: "b1",
        name: "World Brief",
        handle: "@worldbrief",
        rssGroups: [],
      });

      (generateLlmText as any).mockResolvedValue({
        text: "1. #news\n2. #world\n3. #markets",
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const request = new NextRequest("http://localhost:3000/api/brands/b1/hashtags", {
        method: "POST",
      });
      const response = await hashtagsPOST(request, {
        params: Promise.resolve({ id: "b1" }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.hashtags).toBe("#news #world #markets");
    });
  });

  describe("POST /api/brands/generate-brand", () => {
    it("returns 400 when prompt is missing", async () => {
      const request = new NextRequest("http://localhost:3000/api/brands/generate-brand", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const response = await generateBrandPOST(request);
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Missing prompt");
    });

    it("generates channel profile via generateLlmObject", async () => {
      const mockProfile = {
        name: "CryptoPulse",
        handle: "cryptopulse_tv",
        description: "Decentralized finance insights and breaking market analysis.",
        avatarPrompt: "Neon-lit 3D bull logo on obsidian backdrop",
        tags: ["crypto", "bitcoin", "defi", "web3", "markets"],
      };

      (generateLlmObject as any).mockResolvedValue({
        object: mockProfile,
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const request = new NextRequest("http://localhost:3000/api/brands/generate-brand", {
        method: "POST",
        body: JSON.stringify({
          prompt: "24/7 crypto and DeFi market updates",
          platform: "YouTube",
        }),
      });

      const response = await generateBrandPOST(request);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(mockProfile);
      expect(generateLlmObject).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "org_test_123",
          schemaName: "BrandProfile",
          temperature: 0.7,
        })
      );
    });
  });
});
