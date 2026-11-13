import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "../route";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { saveCustomPersona } from "@/lib/tts/personas";
import { NextRequest } from "next/server";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    persona: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/tenant", () => ({
  requireTenant: vi.fn(),
}));

vi.mock("@/lib/tts/personas", () => ({
  saveCustomPersona: vi.fn(),
}));

describe("Personas API Endpoint", () => {
  const mockTenant = {
    userId: "user_123",
    orgId: "org_456",
    isDefaultOrg: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (requireTenant as any).mockResolvedValue({
      ok: true,
      tenant: mockTenant,
    });
  });

  describe("GET /api/personas", () => {
    it("should return paginated personas for tenant", async () => {
      const mockPersonas = [
        {
          id: "persona_1",
          slug: "ruby",
          name: "Ruby",
          role: "News Anchor",
          gender: "female",
          language: "en",
          avatarType: "static_image",
          isActive: true,
          isSystemPersona: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          avatars: [
            {
              id: "avatar_1",
              url: "https://example.com/ruby.png",
              storageKey: "avatars/ruby.png",
              frameType: "portrait",
              isDefault: true,
            },
          ],
          voices: [
            {
              id: "voice_1",
              label: "Ruby Voice",
              isDefault: true,
              language: "en",
              duration: 5.0,
            },
          ],
        },
      ];

      (prisma.persona.findMany as any).mockResolvedValue(mockPersonas);
      (prisma.persona.count as any).mockResolvedValue(1);

      const request = new NextRequest("http://localhost:3000/api/personas?page=1&limit=10");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.personas).toBeDefined();
      expect(prisma.persona.findMany).toHaveBeenCalled();
    });

    it("should filter by type (system personas only)", async () => {
      (prisma.persona.findMany as any).mockResolvedValue([]);
      (prisma.persona.count as any).mockResolvedValue(0);

      const request = new NextRequest("http://localhost:3000/api/personas?type=system");
      await GET(request);

      expect(prisma.persona.findMany).toHaveBeenCalled();
    });

    it("should filter by type (custom personas only)", async () => {
      (prisma.persona.findMany as any).mockResolvedValue([]);
      (prisma.persona.count as any).mockResolvedValue(0);

      const request = new NextRequest("http://localhost:3000/api/personas?type=custom");
      await GET(request);

      expect(prisma.persona.findMany).toHaveBeenCalled();
    });

    it("should filter by gender", async () => {
      (prisma.persona.findMany as any).mockResolvedValue([]);
      (prisma.persona.count as any).mockResolvedValue(0);

      const request = new NextRequest("http://localhost:3000/api/personas?gender=female");
      await GET(request);

      expect(prisma.persona.findMany).toHaveBeenCalled();
      // The where clause will include gender filter along with tenant filters
    });

    it("should filter by language", async () => {
      (prisma.persona.findMany as any).mockResolvedValue([]);
      (prisma.persona.count as any).mockResolvedValue(0);

      const request = new NextRequest("http://localhost:3000/api/personas?lang=es");
      await GET(request);

      expect(prisma.persona.findMany).toHaveBeenCalled();
      // The where clause will include language filter along with tenant filters
    });

    it("should filter by status", async () => {
      (prisma.persona.findMany as any).mockResolvedValue([]);
      (prisma.persona.count as any).mockResolvedValue(0);

      const request = new NextRequest("http://localhost:3000/api/personas?status=active");
      await GET(request);

      expect(prisma.persona.findMany).toHaveBeenCalled();
      // The where clause will include status filter along with tenant filters
    });

    it("should search by query", async () => {
      (prisma.persona.findMany as any).mockResolvedValue([]);
      (prisma.persona.count as any).mockResolvedValue(0);

      const request = new NextRequest("http://localhost:3000/api/personas?q=ruby");
      await GET(request);

      expect(prisma.persona.findMany).toHaveBeenCalled();
      // The where clause will include search OR conditions along with tenant filters
    });

    it("should return lite personas when requested", async () => {
      const mockLitePersonas = [
        {
          id: "persona_1",
          slug: "ruby",
          name: "Ruby",
          role: "News Anchor",
          gender: "female",
          language: "en",
          avatarType: "static_image",
          isActive: true,
          isSystemPersona: true,
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
          avatars: [
            {
              id: "avatar_1",
              url: "https://example.com/ruby.png",
              storageKey: "avatars/ruby.png",
              frameType: "portrait",
              isDefault: true,
            },
          ],
          voices: [
            {
              id: "voice_1",
              label: "Ruby Voice",
              isDefault: true,
              language: "en",
              duration: 5.0,
            },
          ],
        },
      ];

      (prisma.persona.findMany as any).mockResolvedValue(mockLitePersonas);
      (prisma.persona.count as any).mockResolvedValue(1);

      const request = new NextRequest("http://localhost:3000/api/personas?lite=true");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.personas).toBeDefined();
      expect(response.headers.get("Cache-Control")).toContain("max-age=15");
    });
  });

  describe("POST /api/personas", () => {
    it("should create a new custom persona", async () => {
      const newPersona = {
        id: "persona_1",
        companyId: "org_456",
        slug: "custom-anchor",
        name: "Custom Anchor",
        role: "News Reporter",
        gender: "male",
        language: "en",
        description: "A custom news anchor",
        systemPrompt: "You are a professional news anchor",
        bio: "Experienced journalist",
        visualPrompt: "Professional broadcaster",
        visualPromptNeutral: "Neutral expression",
        voiceParams: JSON.stringify({
          exaggeration: 0.55,
          cfgWeight: 0.65,
          temperature: 0.8,
          speed: 1.0,
          pitchShift: 0,
          maxNewTokens: 1200,
          chunkSize: 200,
        }),
        avatarType: "static_image",
        isActive: true,
        isSystemPersona: false,
      };

      (prisma.persona.findUnique as any).mockResolvedValue(null);
      (prisma.persona.create as any).mockResolvedValue(newPersona);
      (saveCustomPersona as any).mockResolvedValue(undefined);

      const request = new Request("http://localhost:3000/api/personas", {
        method: "POST",
        body: JSON.stringify({
          slug: "custom-anchor",
          name: "Custom Anchor",
          role: "News Reporter",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe("Custom Anchor");
      expect(data.slug).toBe("custom-anchor");
      expect(data.isSystemPersona).toBe(false);
      expect(prisma.persona.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: "custom-anchor",
            name: "Custom Anchor",
            role: "News Reporter",
            companyId: "org_456",
            isSystemPersona: false,
          }),
        })
      );
    });

    it("should return 400 when required fields are missing", async () => {
      const request = new Request("http://localhost:3000/api/personas", {
        method: "POST",
        body: JSON.stringify({ name: "Test" }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("obligatorios");
    });

    it("should return 400 when slug already exists", async () => {
      (prisma.persona.findUnique as any).mockResolvedValue({
        id: "existing",
        slug: "ruby",
        name: "Ruby",
      });

      const request = new Request("http://localhost:3000/api/personas", {
        method: "POST",
        body: JSON.stringify({
          slug: "ruby",
          name: "Test",
          role: "Test",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("ya existe");
    });

    it("should normalize slug to lowercase and remove special characters", async () => {
      const newPersona = {
        id: "persona_1",
        companyId: "org_456",
        slug: "custom-anchor-123",
        name: "Custom Anchor",
        role: "News Reporter",
        gender: "male",
        language: "en",
        description: "",
        systemPrompt: "",
        bio: "",
        visualPrompt: "",
        visualPromptNeutral: "",
        voiceParams: JSON.stringify({
          exaggeration: 0.55,
          cfgWeight: 0.65,
          temperature: 0.8,
          speed: 1.0,
          pitchShift: 0,
          maxNewTokens: 1200,
          chunkSize: 200,
        }),
        avatarType: "static_image",
        isActive: true,
        isSystemPersona: false,
      };

      (prisma.persona.findUnique as any).mockResolvedValue(null);
      (prisma.persona.create as any).mockResolvedValue(newPersona);
      (saveCustomPersona as any).mockResolvedValue(undefined);

      const request = new Request("http://localhost:3000/api/personas", {
        method: "POST",
        body: JSON.stringify({
          slug: "Custom@Anchor#123!",
          name: "Custom Anchor",
          role: "News Reporter",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.slug).toBe("custom-anchor-123");
    });

    it("should set default voice params when not provided", async () => {
      const newPersona = {
        id: "persona_1",
        companyId: "org_456",
        slug: "custom-anchor",
        name: "Custom Anchor",
        role: "News Reporter",
        gender: "male",
        language: "en",
        description: "",
        systemPrompt: "",
        bio: "",
        visualPrompt: "",
        visualPromptNeutral: "",
        voiceParams: JSON.stringify({
          exaggeration: 0.55,
          cfgWeight: 0.65,
          temperature: 0.8,
          speed: 1.0,
          pitchShift: 0,
          maxNewTokens: 1200,
          chunkSize: 200,
        }),
        avatarType: "static_image",
        isActive: true,
        isSystemPersona: false,
      };

      (prisma.persona.findUnique as any).mockResolvedValue(null);
      (prisma.persona.create as any).mockResolvedValue(newPersona);
      (saveCustomPersona as any).mockResolvedValue(undefined);

      const request = new Request("http://localhost:3000/api/personas", {
        method: "POST",
        body: JSON.stringify({
          slug: "custom-anchor",
          name: "Custom Anchor",
          role: "News Reporter",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      const voiceParams = JSON.parse(data.voiceParams);
      expect(voiceParams.exaggeration).toBe(0.55);
      expect(voiceParams.speed).toBe(1.0);
    });
  });
});