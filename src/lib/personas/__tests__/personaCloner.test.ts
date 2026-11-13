import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { clonePersonaFromImage } from "../personaCloner";
import { getPersonaById, deleteCustomPersona } from "../../tts/personas";

const generateLlmObjectMock = vi.fn();

// Mock unified AI SDK Gateway
vi.mock("@/lib/llm/aiSdkGateway", () => {
  return {
    generateLlmObject: (...args: unknown[]) => generateLlmObjectMock(...args),
  };
});

describe("Persona Cloner Engine", () => {
  const testBuffer = Buffer.from("fake-png-data-bytes");
  const testSlug = "cloned_valeria_rossi";

  const mockExtractionData = {
    slug: "cloned_valeria_rossi",
    name: "Valeria Rossi",
    role: "Senior Geopolitical Analyst",
    gender: "female",
    language: "es",
    description: "Analista internacional de geopolítica con presencia escénica y voz cálida.",
    bio: "Valeria Rossi cuenta con más de 12 años de trayectoria cubriendo cumbres diplomáticas y relaciones exteriores.",
    systemPrompt: "Sos Valeria Rossi, analista internacional de geopolítica.",
    traits: {
      age: 33,
      heightCm: 173,
      heightFeet: "5'8\"",
      weightKg: 57,
      weightLbs: 126,
      skinTone: "Tez oliva cálida con matices mediterráneos",
      skinTexture: "Piel natural con poros suaves y pequeña marca cerca de la clavícula",
      hair: "Cabello castaño oscuro ondulado hasta los hombros",
      face: "Ojos verde avellana, pómulos definidos, mirada analítica y serena",
      build: "Figura reloj de arena esbelta (busto 34C, cintura de 25 pulgadas, caderas de 36 pulgadas)",
      nudeDetails: {
        bareTorso: "Abdomen plano y tonificado, cintura sutilmente marcada",
        breasts: "pechos firmes naturales 34C con aureolas rosa suave",
        vulva: "Zona íntima femenina prolija y afeitada.",
      },
      defaultAttire: "Blazer entallado verde esmeralda con solapa fina sobre blusa de seda marfil",
      defaultBackground: "Set de noticias internacional con paneles de vidrio y mapa global",
      defaultLighting: "Iluminación de estudio de 3 puntos con luz difusa y realce de cabello",
    },
    signatureAttire: {
      label: "👗 Blazer Esmeralda y Blusa de Seda",
      description: "Blazer entallado verde esmeralda con solapa fina sobre blusa de seda marfil",
      category: "broadcast",
    },
    styleGuidelines: "Prendas ejecutivas entalladas que destaquen su figura reloj de arena y tonos esmeralda/azul cobalto.",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key";
    generateLlmObjectMock.mockResolvedValue({
      object: mockExtractionData,
      providerUsed: "gemini",
      modelUsed: "gemini-2.5-flash",
    });
  });

  afterEach(() => {
    deleteCustomPersona(testSlug);

    // Clean up created test files
    const avatarPath = path.join(process.cwd(), "public", "avatars", `${testSlug}.png`);
    const refPath = path.join(process.cwd(), "public", "avatars", `${testSlug}_ref.png`);
    const archiveDir = path.join(process.cwd(), "public", "avatars", `master_${testSlug}_archive`);

    if (fs.existsSync(avatarPath)) fs.unlinkSync(avatarPath);
    if (fs.existsSync(refPath)) fs.unlinkSync(refPath);
    if (fs.existsSync(archiveDir)) {
      fs.rmSync(archiveDir, { recursive: true, force: true });
    }
  });

  it("should forensically extract identity, body proportions, bust size, and wardrobe from image", async () => {
    const result = await clonePersonaFromImage({
      imageBuffer: testBuffer,
      mimeType: "image/png",
      syncToDatabase: false,
    });

    expect(result.persona).toBeDefined();
    expect(result.persona.id).toBe("cloned_valeria_rossi");
    expect(result.persona.name).toBe("Valeria Rossi");
    expect(result.persona.title).toBe("Senior Geopolitical Analyst");
    expect(result.persona.language).toBe("es");

    // Proportions & body type verification
    const traits = result.persona.traits;
    expect(traits.build).toContain("busto 34C");
    expect(traits.build).toContain("cintura de 25 pulgadas");
    expect(traits.nudeDetails?.breasts).toContain("34C");
    expect(traits.defaultAttire).toContain("Blazer entallado verde esmeralda");

    // File saving verification
    expect(fs.existsSync(result.avatarLocalPath)).toBe(true);
    expect(fs.existsSync(path.join(result.masterArchivePath, `${testSlug}_master_anchor.png`))).toBe(true);

    // Registry discovery verification
    const lookup = getPersonaById("cloned_valeria_rossi");
    expect(lookup).toBeDefined();
    expect(lookup?.name).toBe("Valeria Rossi");
    expect(lookup?.traits.build).toContain("34C");

    // Gateway call verification
    expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
    const callArgs = generateLlmObjectMock.mock.calls[0][0];
    expect(callArgs.schemaName).toBe("ClonedPersonaTraits");
    expect(callArgs.fallbackModel).toBe(process.env.OLLAMA_VISION_MODEL || "llava");
    expect(callArgs.allowFallback).toBe(true);
    expect(callArgs.messages).toBeDefined();
    expect(callArgs.messages[0].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "file", mediaType: "image/png" }),
        expect.objectContaining({ type: "text" }),
      ])
    );
  });

  it("should accept and record rejuvenation and transformation modifiers", async () => {
    const result = await clonePersonaFromImage({
      imageBuffer: testBuffer,
      mimeType: "image/png",
      rejuvenate: "young_rookie",
      glamourLevel: "broadcast_studio_hd",
      genderSwap: true,
      bodyMod: "voluptuous_hourglass",
      outfitPreset: "executive_anchor_suit",
      syncToDatabase: false,
    });

    expect(result.persona).toBeDefined();
    expect(result.appliedTransformations).toEqual({
      rejuvenate: "young_rookie",
      glamourLevel: "broadcast_studio_hd",
      genderSwap: true,
      bodyMod: "voluptuous_hourglass",
      outfitPreset: "executive_anchor_suit",
    });
  });

  it("should support Ollama multimodal failover when Ollama is the active provider", async () => {
    generateLlmObjectMock.mockResolvedValueOnce({
      object: mockExtractionData,
      providerUsed: "ollama",
      modelUsed: "llava",
    });

    const result = await clonePersonaFromImage({
      imageBuffer: testBuffer,
      mimeType: "image/png",
      syncToDatabase: false,
    });

    expect(result.persona).toBeDefined();
    expect(result.persona.id).toBe("cloned_valeria_rossi");
    expect(generateLlmObjectMock).toHaveBeenCalledTimes(1);
    const callArgs = generateLlmObjectMock.mock.calls[0][0];
    expect(callArgs.fallbackModel).toBe("llava");
  });
});
