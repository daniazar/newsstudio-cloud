import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import { getPersonaKnowledgeGraph } from "../personaKnowledgeGraph";

describe("personaKnowledgeGraph (Task OB-3)", () => {
  const testDir = path.join(process.cwd(), "scratch", "test_kg");

  beforeEach(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it("should return canonical identity features for persona", () => {
    const graph = getPersonaKnowledgeGraph("ruby", testDir);

    expect(graph.personaId).toBe("ruby");
    expect(graph.canonical.hairColor).toContain("copper-red");
    expect(graph.wardrobeByContext.broadcast.length).toBeGreaterThan(0);
  });
});
