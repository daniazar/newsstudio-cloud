/**
 * src/lib/tts/personaRegistry.ts
 *
 * Custom and Cloned Persona File-backed Registry.
 * Persists user-cloned and custom personas to src/lib/tts/customPersonas.json
 * so that both Node.js CLI scripts and Next.js App Router have synchronized access.
 */

import fs from "fs";
import path from "path";
import defaultCustomPersonas from "./customPersonas.json";
import { Persona } from "./personas";

let cachedCustomPersonas: Persona[] | null = null;

function getCustomPersonasFilePath(): string | null {
  if (typeof window !== "undefined") return null;
  return path.join(process.cwd(), "src", "lib", "tts", "customPersonas.json");
}

/**
 * Loads custom / cloned personas from customPersonas.json file.
 */
export function loadCustomPersonas(): Persona[] {
  if (cachedCustomPersonas !== null) {
    return cachedCustomPersonas;
  }

  if (typeof window === "undefined") {
    try {
      const filePath = getCustomPersonasFilePath();
      if (filePath && fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          cachedCustomPersonas = parsed;
          return cachedCustomPersonas;
        }
      }
    } catch (error) {
      console.warn("⚠️ Warning: Could not read customPersonas.json:", error);
    }
  }

  cachedCustomPersonas = Array.isArray(defaultCustomPersonas) ? (defaultCustomPersonas as Persona[]) : [];
  return cachedCustomPersonas;
}

/**
 * Saves a cloned or custom persona to disk and updates the in-memory cache.
 */
export function saveCustomPersona(persona: Persona): Persona {
  const existing = loadCustomPersonas();
  const normalizedId = persona.id.toLowerCase().trim();
  
  const index = existing.findIndex((p) => p.id.toLowerCase() === normalizedId);
  if (index >= 0) {
    existing[index] = { ...existing[index], ...persona, id: normalizedId };
  } else {
    existing.push({ ...persona, id: normalizedId });
  }

  cachedCustomPersonas = existing;

  if (typeof window === "undefined") {
    try {
      const filePath = getCustomPersonasFilePath();
      if (filePath) {
        fs.writeFileSync(filePath, JSON.stringify(existing, null, 2), "utf-8");
      }
    } catch (error) {
      console.error("❌ Failed to write to customPersonas.json:", error);
    }
  }

  return persona;
}

/**
 * Removes a custom persona by id.
 */
export function deleteCustomPersona(personaId: string): boolean {
  const existing = loadCustomPersonas();
  const normalizedId = personaId.toLowerCase().trim();
  const filtered = existing.filter((p) => p.id.toLowerCase() !== normalizedId);

  if (filtered.length === existing.length) {
    return false;
  }

  cachedCustomPersonas = filtered;

  if (typeof window === "undefined") {
    try {
      const filePath = getCustomPersonasFilePath();
      if (filePath) {
        fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), "utf-8");
        return true;
      }
    } catch (error) {
      console.error("❌ Failed to update customPersonas.json after deletion:", error);
      return false;
    }
  }
  return true;
}

/**
 * Resets the in-memory cache (useful in test suites).
 */
export function clearCustomPersonaCache(): void {
  cachedCustomPersonas = null;
}

