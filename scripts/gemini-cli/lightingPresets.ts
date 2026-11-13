/**
 * scripts/gemini-cli/lightingPresets.ts
 *
 * Studio Lighting & Atmosphere Mood Presets.
 */

export interface LightingPreset {
  id: string;
  label: string;
  prompt: string;
}

export const LIGHTING_PRESETS: Record<string, LightingPreset> = {
  prime_time_bright: {
    id: "prime_time_bright",
    label: "💡 Prime-Time Studio (Crisp 5600K 3-point softbox broadcast lighting)",
    prompt: "Professional 3-point broadcast studio softbox lighting (5600K daylight balanced), crisp eye catchlights, clean soft fill on jawline, and subtle hair rim light.",
  },
  breaking_emergency_red: {
    id: "breaking_emergency_red",
    label: "🚨 Breaking News Red Alert (High-drama crimson neon & dark contrast)",
    prompt: "High-drama breaking news emergency lighting with crimson red neon rim lights outlining the subject, cool blue ambient background fill, and high-contrast broadcast tension.",
  },
  golden_hour_twilight: {
    id: "golden_hour_twilight",
    label: "🌇 Golden Hour Twilight (Warm sunlight streaming through skyscraper glass)",
    prompt: "Warm golden-hour sunlight beams streaming through panoramic floor-to-ceiling studio windows, amber rim light on hair, rich cinematic depth, and soft warm skin highlights.",
  },
  cyberpunk_neon_mood: {
    id: "cyberpunk_neon_mood",
    label: "🌆 Cyberpunk Neon Mood (Cool cyan & purple rim lights, deep shadows)",
    prompt: "Stylized cyberpunk broadcast mood with dual cyan and neon-purple rim lighting, deep contrast shadows, and vibrant specular reflections across desk glass surfaces.",
  },
  tech_minimalist_high_key: {
    id: "tech_minimalist_high_key",
    label: "🔬 Tech Minimalist High-Key (Clean white Scandinavian daylight studio)",
    prompt: "Ultra-clean Scandinavian high-key white daylight studio illumination, perfectly diffused shadows, crystalline catchlights, and sleek modern tech aesthetics.",
  },
  late_night_intimate: {
    id: "late_night_intimate",
    label: "🍷 Late-Night Lounge (Warm 3200K amber mood lights & cozy shadows)",
    prompt: "Intimate late-night talk show lighting with warm 3200K tungsten amber accent lamps, soft shadows, warm wood reflections, and cozy atmospheric depth.",
  },
};
