// src/lib/prompt/presetRegistry.ts

import { STUDIO_FULL_PRESETS, type FullPreset } from "@/data/prompt_presets";

export class PresetRegistry {
  private presets = new Map<string, FullPreset>();

  constructor() {
    // Auto-register all presets from prompt_presets
    STUDIO_FULL_PRESETS.forEach(preset => {
      const slug = this.generateSlug(preset.name);
      this.register(slug, preset);
    });

    // Register green-screen streamer overlay preset
    this.register("green-screen-chroma-key", {
      name: "Green Screen Chroma Key Streamer",
      category: "Studio",
      medium: "Video",
      action: "expressing news text with active hand gestures and realistic face motion",
      description: "Isolated news presenter standing against a solid bright green chroma key studio backdrop (#00FF00), completely flat even green lighting, torso and hands visible, expressing news text with active hand gestures and realistic face motion",
      scenario: "isolated news presenter standing against a solid bright green chroma key studio backdrop (#00FF00)",
      lighting: "flat even green screen lighting with zero background shadows",
      color: "vibrant green #00FF00 background with studio neutral subject color",
      soundEffects: "studio quiet",
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  public register(slug: string, preset: FullPreset): void {
    this.presets.set(slug, preset);
  }

  public get(slug: string): FullPreset | undefined {
    return this.presets.get(slug);
  }

  public getAll(): { slug: string; preset: FullPreset }[] {
    const list: { slug: string; preset: FullPreset }[] = [];
    this.presets.forEach((preset, slug) => {
      list.push({ slug, preset });
    });
    return list;
  }

  public getSlugsWithDescriptions(): string {
    return this.getAll()
      .map(item => `- "${item.slug}": ${item.preset.description}`)
      .join("\n");
  }

  public getPreviewImagePath(slug: string): string {
    return `/presets/${slug}.png`;
  }
}

// Export singleton instance
export const presetRegistry = new PresetRegistry();

// Export lists/maps for schema validation & templates
export const ALL_PRESET_SLUGS = presetRegistry.getAll().map(p => p.slug);
export const PRESET_SLUG_MAP = presetRegistry.getAll().reduce((acc, curr) => {
  acc[curr.slug] = curr.preset;
  return acc;
}, {} as Record<string, FullPreset>);
