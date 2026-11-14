/**
 * Color palette registry — the single source of truth for which palettes exist.
 *
 * The actual color values live in `src/app/palettes.css` as CSS custom properties
 * scoped to `:root[data-palette="<id>"]`. Tailwind v4 compiles utilities such as
 * `bg-surface` or `text-zinc-400` to `var(--color-*)`, so switching the
 * `data-palette` attribute on `<html>` re-themes the whole app at runtime with
 * no rebuild and no React re-render.
 *
 * The `swatch` values below are used for picker previews and are asserted to
 * match the CSS by `src/lib/theme/__tests__/palettes.test.ts`, so the two can
 * never drift apart silently.
 *
 * Adding a palette:
 *   1. Add an entry to `PALETTES` (keep ids lowercase, kebab-case).
 *   2. Add a matching `:root[data-palette="<id>"]` block to `src/app/palettes.css`.
 *   3. Run `npx vitest run src/lib/theme` — it checks parity and WCAG contrast.
 */

export interface PaletteSwatch {
  /** App canvas (`--color-background`). */
  background: string;
  /** Default card / panel surface (`--color-surface`). */
  surface: string;
  /** Primary text (`--color-foreground`). */
  foreground: string;
  /** Brand / interactive accent (`--color-accent`). */
  accent: string;
  /** Text rendered on top of a solid accent fill (`--color-accent-foreground`). */
  accentForeground: string;
}

export interface Palette {
  id: string;
  label: string;
  description: string;
  swatch: PaletteSwatch;
}

export const PALETTES = [
  {
    id: "obsidian",
    label: "Obsidian",
    description: "The original broadcast look — near-black glass with an emerald signal.",
    swatch: {
      background: "#060709",
      surface: "#0c0d12",
      foreground: "#f8fafc",
      accent: "#10b981",
      accentForeground: "#03130d",
    },
  },
  {
    id: "midnight",
    label: "Midnight Newsroom",
    description: "Deep navy control room with an azure accent.",
    swatch: {
      background: "#050a14",
      surface: "#0a1120",
      foreground: "#f1f6ff",
      accent: "#3b9eff",
      accentForeground: "#02101f",
    },
  },
  {
    id: "aurora",
    label: "Aurora",
    description: "Ink-violet surfaces with a soft lavender glow.",
    swatch: {
      background: "#08060f",
      surface: "#0f0b1a",
      foreground: "#f7f4ff",
      accent: "#a78bfa",
      accentForeground: "#160a33",
    },
  },
  {
    id: "ember",
    label: "Ember",
    description: "Warm charcoal studio lit by an on-air orange.",
    swatch: {
      background: "#0b0806",
      surface: "#130e0b",
      foreground: "#fdf8f3",
      accent: "#fb923c",
      accentForeground: "#1f0d02",
    },
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Pure monochrome for distraction-free editing.",
    swatch: {
      background: "#0a0a0a",
      surface: "#111111",
      foreground: "#fafafa",
      accent: "#e5e5e5",
      accentForeground: "#0a0a0a",
    },
  },
  {
    id: "contrast",
    label: "High Contrast",
    description: "Maximum legibility: pure black, bright text and strong borders.",
    swatch: {
      background: "#000000",
      surface: "#0a0a0a",
      foreground: "#ffffff",
      accent: "#ffd60a",
      accentForeground: "#000000",
    },
  },
] as const satisfies readonly Palette[];

export type PaletteId = (typeof PALETTES)[number]["id"];

export const DEFAULT_PALETTE: PaletteId = "obsidian";

/** `localStorage` key holding the user's chosen palette id. */
export const PALETTE_STORAGE_KEY = "ns-palette";

/** Attribute set on `<html>` that the CSS palette blocks key off. */
export const PALETTE_ATTRIBUTE = "data-palette";

export const PALETTE_IDS: readonly PaletteId[] = PALETTES.map((p) => p.id);

export function isPaletteId(value: unknown): value is PaletteId {
  return typeof value === "string" && (PALETTE_IDS as readonly string[]).includes(value);
}

export function getPalette(id: PaletteId): Palette {
  // PALETTES always contains DEFAULT_PALETTE, so the fallback is total.
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}
