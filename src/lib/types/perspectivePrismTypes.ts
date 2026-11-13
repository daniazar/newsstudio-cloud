/**
 * src/lib/types/perspectivePrismTypes.ts
 *
 * Client-safe types and configuration for Perspective Prism 5-way narrative deconstruction.
 */

export type PrismLensType =
  | "accelerationist"
  | "populist_labor"
  | "realpolitik_security"
  | "longtermist_ecology"
  | "neutral_arbiter";

export interface PrismPerspective {
  lens: PrismLensType;
  title: string;
  assignedPersonaId: string;
  assignedPersonaName: string;
  avatarUrl: string;
  themeColor: string;
  coreThesis: string;
  spokenScript: string;
  framingTriggers: string[];
}

export interface PerspectivePrismReport {
  eventTopic: string;
  summary: string;
  perspectives: PrismPerspective[];
  steelMannedSynthesis: string;
}

export const PRISM_LENS_CONFIG: Record<
  PrismLensType,
  { name: string; personaId: string; personaName: string; avatarUrl: string; themeColor: string }
> = {
  accelerationist: {
    name: "⚡ The Accelerationist",
    personaId: "ruby",
    personaName: "Ruby Vance",
    avatarUrl: "/avatars/ruby.png",
    themeColor: "#10b981", // Emerald
  },
  populist_labor: {
    name: "✊ The Populist & Labor Lens",
    personaId: "mateo",
    personaName: "Mateo Rossi",
    avatarUrl: "/avatars/tomas.png",
    themeColor: "#f59e0b", // Amber
  },
  realpolitik_security: {
    name: "🛡️ Realpolitik & Sovereign Security",
    personaId: "storm",
    personaName: "Storm Sterling",
    avatarUrl: "/avatars/storm.png",
    themeColor: "#3b82f6", // Blue
  },
  longtermist_ecology: {
    name: "🌱 Longtermist & Planetary Horizon",
    personaId: "aris",
    personaName: "Dr. Aris Thorne",
    avatarUrl: "/avatars/aris.png",
    themeColor: "#8b5cf6", // Violet
  },
  neutral_arbiter: {
    name: "⚖️ The Neutral Steel-Man Arbiter",
    personaId: "tomas",
    personaName: "Tomás Morales",
    avatarUrl: "/avatars/isabel.png",
    themeColor: "#94a3b8", // Slate
  },
};
