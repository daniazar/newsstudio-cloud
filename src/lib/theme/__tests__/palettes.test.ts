import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_PALETTE,
  PALETTES,
  PALETTE_IDS,
  getPalette,
  isPaletteId,
} from "../palettes";

const css = readFileSync(path.resolve(__dirname, "../../../app/palettes.css"), "utf8");

/** Collects the custom properties declared in `:root[data-palette="<id>"] { ... }` blocks. */
function parsePaletteBlocks(source: string): Map<string, Record<string, string>> {
  const blocks = new Map<string, Record<string, string>>();
  const blockRe = /:root\[data-palette="([a-z0-9-]+)"\]\s*\{([^}]*)\}/g;
  for (const [, id, body] of source.matchAll(blockRe)) {
    const vars = blocks.get(id) ?? {};
    for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
      vars[name] = value.trim();
    }
    blocks.set(id, vars);
  }
  return blocks;
}

/** WCAG 2.x relative luminance of a #rrggbb color. */
function luminance(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`Expected #rrggbb, got "${hex}"`);
  const channels = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const blocks = parsePaletteBlocks(css);

describe("palette registry", () => {
  it("has unique ids and contains the default", () => {
    expect(new Set(PALETTE_IDS).size).toBe(PALETTE_IDS.length);
    expect(PALETTE_IDS).toContain(DEFAULT_PALETTE);
  });

  it("validates ids", () => {
    expect(isPaletteId("midnight")).toBe(true);
    expect(isPaletteId("not-a-palette")).toBe(false);
    expect(isPaletteId(null)).toBe(false);
    expect(getPalette("aurora").label).toBe("Aurora");
  });

  it("has a CSS block for every registered palette, and no orphan blocks", () => {
    expect([...blocks.keys()].sort()).toEqual([...PALETTE_IDS].sort());
  });
});

describe.each(PALETTES.map((p) => [p.id, p] as const))("palette %s", (id, palette) => {
  const vars = blocks.get(id) ?? {};

  it("declares every base token", () => {
    for (const token of [
      "--color-background",
      "--color-surface",
      "--color-surface-raised",
      "--color-surface-overlay",
      "--color-foreground",
      "--color-muted",
      "--color-subtle",
      "--color-muted-foreground",
      "--color-border",
      "--color-border-hover",
      "--color-accent",
      "--color-accent-hover",
      "--color-accent-foreground",
    ]) {
      expect(vars[token], `${id} is missing ${token}`).toBeDefined();
    }
  });

  it("preview swatch matches the CSS", () => {
    expect(palette.swatch).toEqual({
      background: vars["--color-background"],
      surface: vars["--color-surface"],
      foreground: vars["--color-foreground"],
      accent: vars["--color-accent"],
      accentForeground: vars["--color-accent-foreground"],
    });
  });

  it("meets WCAG contrast targets", () => {
    const bg = vars["--color-background"];
    // Body text: AAA (7:1) on both the canvas and raised panels.
    expect(contrast(vars["--color-foreground"], bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(vars["--color-foreground"], vars["--color-surface-raised"])).toBeGreaterThanOrEqual(7);
    // Secondary text: AA (4.5:1).
    expect(contrast(vars["--color-subtle"], bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(vars["--color-muted-foreground"], bg)).toBeGreaterThanOrEqual(4.5);
    // Text on a solid accent button: AA.
    expect(contrast(vars["--color-accent-foreground"], vars["--color-accent"])).toBeGreaterThanOrEqual(4.5);
    // Accent used as text/icons on the canvas: AA.
    expect(contrast(vars["--color-accent"], bg)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("high contrast palette", () => {
  const vars = blocks.get("contrast") ?? {};
  it("keeps even muted text at AAA and borders at 3:1", () => {
    expect(contrast(vars["--color-muted"], vars["--color-background"])).toBeGreaterThanOrEqual(7);
    expect(contrast(vars["--color-border"], vars["--color-background"])).toBeGreaterThanOrEqual(3);
  });
});
