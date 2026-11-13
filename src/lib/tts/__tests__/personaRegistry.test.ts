import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadCustomPersonas, saveCustomPersona, deleteCustomPersona, clearCustomPersonaCache } from "../personaRegistry";
import { getAllPersonas, getPersonaById, Persona } from "../personas";

describe("Persona Registry & Custom Personas Store", () => {
  const sampleClonedPersona: Persona = {
    id: "test_cloned_anchor",
    name: "Elena Vance",
    title: "Senior Technology Correspondent",
    description: "Charismatic tech analyst with sharp broadcast delivery.",
    bio: "Elena Vance covers AI, quantum computing, and frontier robotics.",
    systemPrompt: "You are Elena Vance, Senior Technology Correspondent.",
    traits: {
      age: 29,
      heightCm: 172,
      heightFeet: "5'8\"",
      weightKg: 56,
      weightLbs: 124,
      skinTone: "Fair with warm undertones",
      hair: "Dark chestnut wavy hair falling over shoulders",
      face: "High cheekbones, expressive hazel eyes, natural smile lines",
      build: "Athletic hourglass build (34C bust, 24-inch waist, 36-inch hips)",
      nudeDetails: {
        bareTorso: "Toned flat midriff, defined waist contour",
        breasts: "natural firm 34C breasts with soft rose aureolas",
        vulva: "Clean shaved feminine pubic region."
      },
      defaultAttire: "Tailored charcoal single-breasted blazer over silk emerald blouse",
      defaultBackground: "Futuristic tech studio with transparent LED walls",
      defaultLighting: "Cool blue accent lighting with soft key light"
    },
    avatarUrl: "/avatars/test_cloned_anchor.png",
    voiceFile: "test_cloned_anchor.wav",
    language: "en",
    gender: "female",
    params: {
      exaggeration: 0.6,
      cfgWeight: 0.65,
      temperature: 0.8,
      speed: 1.0,
      pitchShift: 0,
      maxNewTokens: 1200,
      chunkSize: 200
    }
  };

  beforeEach(() => {
    clearCustomPersonaCache();
  });

  afterEach(() => {
    deleteCustomPersona("test_cloned_anchor");
    clearCustomPersonaCache();
  });

  it("should save and load a custom cloned persona", () => {
    saveCustomPersona(sampleClonedPersona);
    const loaded = loadCustomPersonas();
    const found = loaded.find((p) => p.id === "test_cloned_anchor");

    expect(found).toBeDefined();
    expect(found?.name).toBe("Elena Vance");
    expect(found?.traits.build).toContain("34C bust");
  });

  it("should make cloned persona discoverable in getAllPersonas() and getPersonaById()", () => {
    saveCustomPersona(sampleClonedPersona);

    const all = getAllPersonas();
    expect(all.some((p) => p.id === "test_cloned_anchor")).toBe(true);

    const byId = getPersonaById("test_cloned_anchor");
    expect(byId).toBeDefined();
    expect(byId?.id).toBe("test_cloned_anchor");
    expect(byId?.name).toBe("Elena Vance");
    expect(byId?.traits.build).toBe("Athletic hourglass build (34C bust, 24-inch waist, 36-inch hips)");
    expect(byId?.traits.nudeDetails?.breasts).toContain("34C breasts");
  });

  it("should delete a custom persona", () => {
    saveCustomPersona(sampleClonedPersona);
    expect(getPersonaById("test_cloned_anchor")).toBeDefined();

    const deleted = deleteCustomPersona("test_cloned_anchor");
    expect(deleted).toBe(true);
    expect(getPersonaById("test_cloned_anchor")).toBeUndefined();
  });
});
