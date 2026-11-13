import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST as generatePromptsPOST } from "../[id]/generate-prompts/route";
import { POST as generateFullPOST } from "../generate-full/route";
import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/tenant";
import { generateLlmObject } from "@/lib/llm/aiSdkGateway";
import { clonePersonaFromImage } from "@/lib/personas/personaCloner";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    persona: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/tenant", () => ({
  requireTenant: vi.fn(),
}));

vi.mock("@/lib/llm/aiSdkGateway", () => ({
  generateLlmObject: vi.fn(),
}));

vi.mock("@/lib/personas/personaCloner", () => ({
  clonePersonaFromImage: vi.fn(),
}));

describe("Personas LLM API Endpoints", () => {
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

  describe("POST /api/personas/[id]/generate-prompts", () => {
    it("returns 400 when name or role is missing", async () => {
      const req = new Request("http://localhost:3000/api/personas/p1/generate-prompts", {
        method: "POST",
        body: JSON.stringify({ name: "Ruby" }), // missing role
      });

      const res = await generatePromptsPOST(req, {
        params: Promise.resolve({ id: "p1" }),
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Name and Role are required.");
    });

    it("returns 404 when persona is not found", async () => {
      (prisma.persona.findFirst as any).mockResolvedValue(null);

      const req = new Request("http://localhost:3000/api/personas/p1/generate-prompts", {
        method: "POST",
        body: JSON.stringify({ name: "Ruby", role: "Anchor" }),
      });

      const res = await generatePromptsPOST(req, {
        params: Promise.resolve({ id: "p1" }),
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toBe("Persona no encontrada");
    });

    it("generates system prompts and structured traits via generateLlmObject", async () => {
      (prisma.persona.findFirst as any).mockResolvedValue({
        id: "p1",
        name: "Elena Vance",
        slug: "elena_vance",
        companyId: "org_test_123",
      });

      const mockPromptsOutput = {
        systemPrompt: "You are Elena Vance, a sharp investigative journalist.",
        traits: {
          age: 32,
          heightCm: 172,
          heightFeet: "5'8\"",
          weightKg: 57,
          weightLbs: 126,
          hair: "Chestnut wavy lob",
          face: "Sharp analytical eyes",
          build: "Athletic broadcaster",
          defaultAttire: "Charcoal blazer",
          defaultBackground: "Virtual investigation hub",
          defaultLighting: "Cool rim key lighting",
        },
      };

      (generateLlmObject as any).mockResolvedValue({
        object: mockPromptsOutput,
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const req = new Request("http://localhost:3000/api/personas/p1/generate-prompts", {
        method: "POST",
        body: JSON.stringify({
          name: "Elena Vance",
          role: "Senior Investigative Journalist",
          description: "Uncovers deep tech and corporate accountability stories.",
          bio: "Former bureau chief with 10 years experience.",
        }),
      });

      const res = await generatePromptsPOST(req, {
        params: Promise.resolve({ id: "p1" }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockPromptsOutput);
      expect(generateLlmObject).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "org_test_123",
          schemaName: "PersonaGeneratedPrompts",
        })
      );
    });
  });

  describe("POST /api/personas/generate-full", () => {
    it("returns 400 when neither prompt nor imageBase64 is provided", async () => {
      const req = new Request("http://localhost:3000/api/personas/generate-full", {
        method: "POST",
        body: JSON.stringify({}),
      });

      const res = await generateFullPOST(req);
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toBe("Either a text prompt or an image is required.");
    });

    it("delegates to clonePersonaFromImage when imageBase64 is supplied", async () => {
      (clonePersonaFromImage as any).mockResolvedValue({
        persona: {
          id: "cloned_anchor",
          title: "Chief Market Anchor",
          name: "Marcus Cole",
          traits: {
            age: 38,
            name: "Marcus Cole",
            build: "Broad athletic build",
            hair: "Short salt-and-pepper",
            face: "Chiseled jawline",
            defaultAttire: "Navy bespoke suit",
          },
        },
        signatureAttire: "Navy bespoke suit",
        avatarUrl: "/avatars/marcus.png",
      });

      const req = new Request("http://localhost:3000/api/personas/generate-full", {
        method: "POST",
        body: JSON.stringify({
          imageBase64: "data:image/jpeg;base64,fakeimagecontent",
          prompt: "Professional European news anchor",
        }),
      });

      const res = await generateFullPOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.slug).toBe("cloned_anchor");
      expect(clonePersonaFromImage).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "org_test_123",
          guidance: "Professional European news anchor",
        })
      );
    });

    it("generates full persona profile from text prompt via generateLlmObject", async () => {
      const mockProfile = {
        slug: "sophia_lin_science",
        name: "Dr. Sophia Lin",
        role: "Quantum & Biotech Anchor",
        gender: "female",
        language: "en",
        description: "Leading voice in biotechnology breakthroughs.",
        bio: "Holds a PhD in biophysics and anchors global science broadcasts.",
        systemPrompt: "You are Dr. Sophia Lin, articulate and precise.",
        traits: {
          age: 35,
          heightCm: 168,
          heightFeet: "5'6\"",
          weightKg: 55,
          weightLbs: 121,
          skinTone: "Light warm",
          hair: "Straight dark bob",
          face: "Thoughtful expression",
          build: "Slender broadcaster frame",
          defaultAttire: "Modern lab blazer",
          defaultBackground: "Futuristic research laboratory",
          defaultLighting: "Clean cyan and white key lights",
        },
      };

      (generateLlmObject as any).mockResolvedValue({
        object: mockProfile,
        providerUsed: "gemini",
        modelUsed: "gemini-2.5-flash",
      });

      const req = new Request("http://localhost:3000/api/personas/generate-full", {
        method: "POST",
        body: JSON.stringify({
          prompt: "Design a science and biotech anchor persona named Sophia",
        }),
      });

      const res = await generateFullPOST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toEqual(mockProfile);
      expect(generateLlmObject).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "org_test_123",
          schemaName: "PersonaFullProfile",
        })
      );
    });
  });
});
