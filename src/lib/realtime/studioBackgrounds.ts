/**
 * src/lib/realtime/studioBackgrounds.ts
 *
 * Comprehensive Virtual Studio Environments & Background Plates Library for
 * Real-Time WebGL Chroma Replacement, Multi-Camera Sets, and Broadcast Production.
 */

export type StudioBgCategory =
  | "All"
  | "Newsroom"
  | "Financial"
  | "Breaking"
  | "Executive"
  | "Special"
  | "Field"
  | "Cyber"
  | "Cyc";

export type StudioLightingTone = "cool" | "warm" | "neutral" | "red_alert" | "cyber";

export interface StudioBackground {
  id: string;
  name: string;
  imageUrl: string;
  category: "Newsroom" | "Financial" | "Breaking" | "Executive" | "Special" | "Field" | "Cyber" | "Cyc";
  description: string;
  aspectRatio?: number; // width / height
  badge?: string;
  lightingTone?: StudioLightingTone;
}

export interface StudioLightingProfile {
  ambientColor: [number, number, number];
  rimColor: [number, number, number];
  rimIntensity: number;
  keyIntensity: number;
}

export function getStudioLightingProfile(bgIdOrTone?: string): StudioLightingProfile {
  const bg = bgIdOrTone ? STUDIO_BACKGROUNDS.find((b) => b.id === bgIdOrTone) : null;
  const tone = bg?.lightingTone || bgIdOrTone || "cool";

  switch (tone) {
    case "warm":
      return {
        ambientColor: [0.85, 0.60, 0.35],
        rimColor: [0.95, 0.72, 0.32],
        rimIntensity: 0.38,
        keyIntensity: 1.08,
      };
    case "red_alert":
      return {
        ambientColor: [0.90, 0.20, 0.20],
        rimColor: [1.00, 0.15, 0.15],
        rimIntensity: 0.45,
        keyIntensity: 1.15,
      };
    case "cyber":
      return {
        ambientColor: [0.35, 0.15, 0.85],
        rimColor: [0.20, 0.90, 0.95],
        rimIntensity: 0.42,
        keyIntensity: 1.12,
      };
    case "neutral":
      return {
        ambientColor: [0.60, 0.60, 0.65],
        rimColor: [0.70, 0.72, 0.78],
        rimIntensity: 0.28,
        keyIntensity: 1.00,
      };
    case "cool":
    default:
      return {
        ambientColor: [0.35, 0.55, 0.88],
        rimColor: [0.28, 0.68, 0.98],
        rimIntensity: 0.35,
        keyIntensity: 1.05,
      };
  }
}

export const STUDIO_BACKGROUNDS: StudioBackground[] = [
  // --- SCALE-CALIBRATED CHROMA BACKGROUNDS (50MM BROADCAST LENS, 1.55M EYE-LEVEL) ---
  {
    id: "studio_plate_standup_skyline_9x16",
    name: "Standup Stage 9:16 (Calibrated Skyline)",
    imageUrl: "/studio_environments/studio_plate_standup_skyline_9x16.jpg",
    category: "Newsroom",
    description: "Vertical 9:16 prime-time set with panoramic twilight skyline, high 20ft ceiling, and 50mm broadcast optics for standing anchors.",
    badge: "Scale 9:16",
    aspectRatio: 9 / 16,
    lightingTone: "cool",
  },
  {
    id: "studio_plate_standup_skyline_16x9",
    name: "Standup Stage 16:9 (Calibrated Skyline)",
    imageUrl: "/studio_environments/studio_plate_standup_skyline_16x9.jpg",
    category: "Newsroom",
    description: "Widescreen 16:9 prime-time set with panoramic twilight skyline, high 20ft ceiling, and 50mm broadcast optics.",
    badge: "Scale 16:9",
    aspectRatio: 16 / 9,
    lightingTone: "cool",
  },
  {
    id: "studio_plate_videowall_standup_9x16",
    name: "8K Video Wall 9:16 (Calibrated)",
    imageUrl: "/studio_environments/studio_plate_videowall_standup_9x16.jpg",
    category: "Newsroom",
    description: "Vertical 9:16 interactive 8K video display wall with cyan telemetry and dark reflective floor.",
    badge: "Scale 9:16",
    aspectRatio: 9 / 16,
    lightingTone: "cool",
  },
  {
    id: "studio_plate_videowall_standup_16x9",
    name: "8K Video Wall 16:9 (Calibrated)",
    imageUrl: "/studio_environments/studio_plate_videowall_standup_16x9.jpg",
    category: "Newsroom",
    description: "Widescreen 16:9 interactive 8K video display wall with global infographics and dark reflective floor.",
    badge: "Scale 16:9",
    aspectRatio: 16 / 9,
    lightingTone: "cool",
  },
  {
    id: "studio_plate_financial_trading_9x16",
    name: "Financial Trading Floor 9:16",
    imageUrl: "/studio_environments/studio_plate_financial_trading_9x16.jpg",
    category: "Financial",
    description: "Vertical 9:16 financial command center with real-time candlestick charts and background workstation bokeh.",
    badge: "Markets 9:16",
    aspectRatio: 9 / 16,
    lightingTone: "cool",
  },
  {
    id: "studio_plate_financial_trading_16x9",
    name: "Financial Trading Floor 16:9",
    imageUrl: "/studio_environments/studio_plate_financial_trading_16x9.jpg",
    category: "Financial",
    description: "Widescreen 16:9 financial command center with real-time candlestick charts and background workstation bokeh.",
    badge: "Markets 16:9",
    aspectRatio: 16 / 9,
    lightingTone: "cool",
  },
  {
    id: "studio_plate_breaking_red_alert_9x16",
    name: "Red Alert Stage 9:16",
    imageUrl: "/studio_environments/studio_plate_breaking_red_alert_9x16.jpg",
    category: "Breaking",
    description: "Vertical 9:16 emergency breaking news studio with pulsing crimson ambient lighting and high 20ft trusses.",
    badge: "Alert 9:16",
    aspectRatio: 9 / 16,
    lightingTone: "red_alert",
  },
  {
    id: "studio_plate_breaking_red_alert_16x9",
    name: "Red Alert Stage 16:9",
    imageUrl: "/studio_environments/studio_plate_breaking_red_alert_16x9.jpg",
    category: "Breaking",
    description: "Widescreen 16:9 emergency breaking news studio with pulsing crimson ambient lighting and high 20ft trusses.",
    badge: "Alert 16:9",
    aspectRatio: 16 / 9,
    lightingTone: "red_alert",
  },
  {
    id: "studio_plate_penthouse_lounge_9x16",
    name: "Penthouse Lounge 9:16",
    imageUrl: "/studio_environments/studio_plate_penthouse_lounge_9x16.jpg",
    category: "Special",
    description: "Vertical 9:16 luxury interview lounge with walnut acoustic wood slats, leather armchairs, and rainy twilight city view.",
    badge: "Lounge 9:16",
    aspectRatio: 9 / 16,
    lightingTone: "warm",
  },
  {
    id: "studio_plate_penthouse_lounge_16x9",
    name: "Penthouse Lounge 16:9",
    imageUrl: "/studio_environments/studio_plate_penthouse_lounge_16x9.jpg",
    category: "Special",
    description: "Widescreen 16:9 luxury interview lounge with walnut acoustic wood slats, leather armchairs, and rainy twilight city view.",
    badge: "Lounge 16:9",
    aspectRatio: 16 / 9,
    lightingTone: "warm",
  },
  {
    id: "studio_plate_cyber_command_9x16",
    name: "Cyber Command Deck 9:16",
    imageUrl: "/studio_environments/studio_plate_cyber_command_9x16.jpg",
    category: "Cyber",
    description: "Vertical 9:16 cyberpunk news deck with multi-tiered monitors, neon cyan/violet lighting, and polished obsidian floor.",
    badge: "Cyber 9:16",
    aspectRatio: 9 / 16,
    lightingTone: "cool",
  },
  {
    id: "studio_plate_cyber_command_16x9",
    name: "Cyber Command Deck 16:9",
    imageUrl: "/studio_environments/studio_plate_cyber_command_16x9.jpg",
    category: "Cyber",
    description: "Widescreen 16:9 cyberpunk news deck with multi-tiered monitors, neon cyan/violet lighting, and polished obsidian floor.",
    badge: "Cyber 16:9",
    aspectRatio: 16 / 9,
    lightingTone: "cool",
  },

  // --- NEWSROOM SETS ---
  {
    id: "panoramic_videowall",
    name: "Newsroom Panoramic Videowall",
    imageUrl: "/studio_environments/studio_master_01_panoramic_videowall.jpg",
    category: "Newsroom",
    description: "High-tech curved LED videowall with dynamic global news tickers and soft studio depth.",
    badge: "Master Set",
    lightingTone: "cool",
  },
  {
    id: "high_tech_newsroom",
    name: "Prime Time Newsroom Set",
    imageUrl: "/presets/scenarios/high-tech-newsroom-set.png",
    category: "Newsroom",
    description: "Modern evening news studio with multi-screen glass monitors and overhead studio grid.",
    badge: "Prime Time",
    lightingTone: "cool",
  },
  {
    id: "wide_horizon_suite",
    name: "Wide Horizon Studio Suite",
    imageUrl: "/avatars/master_ruby/ruby_wide_studio_bg.jpg",
    category: "Newsroom",
    description: "Expansive 360-degree broadcast studio with deep bokeh newsroom floor and warm lighting.",
    badge: "Wide Angle",
    lightingTone: "warm",
  },
  {
    id: "modern_news_desk",
    name: "Broadcast Newsroom Floor",
    imageUrl: "/presets/scenarios/studio-desk-backdrop.png",
    category: "Newsroom",
    description: "Classic anchor desk with busy open-concept newsroom newsdesk backdrop.",
    badge: "Classic",
    lightingTone: "neutral",
  },
  {
    id: "anchor_desk_center",
    name: "Center Anchor Desk Plate",
    imageUrl: "/studio_environments/camera_angle_01_center_anchor_desk.jpg",
    category: "Newsroom",
    description: "Centrally framed polished acrylic desk set with subtle background illumination.",
    badge: "Desk View",
    lightingTone: "neutral",
  },

  // --- FINANCIAL & MARKETS ---
  {
    id: "futuristic_financial",
    name: "Futuristic Financial Floor",
    imageUrl: "/studio_environments/studio_plate_futuristic_financial_floor.jpg",
    category: "Financial",
    description: "Wall Street style holographic market charts, cryptocurrency monitors, and neon reflections.",
    badge: "Markets",
    lightingTone: "cool",
  },
  {
    id: "videowall_standup",
    name: "Financial Standup Wall",
    imageUrl: "/studio_environments/camera_angle_02_right_videowall_standup.jpg",
    category: "Financial",
    description: "Vertical chart visualizer stage for dedicated market analysis and cryptocurrency briefs.",
    badge: "Standup",
    lightingTone: "cool",
  },

  // --- BREAKING NEWS ---
  {
    id: "breaking_red_alert",
    name: "Breaking News Red Alert Stage",
    imageUrl: "/studio_environments/composited_scenes/studio_plate_breaking_red_alert_stage_master.jpg",
    category: "Breaking",
    description: "Urgent red alert broadcast stage with emergency strobe lighting and breaking news graphics.",
    badge: "Emergency",
    lightingTone: "red_alert",
  },
  {
    id: "press_briefing_room",
    name: "Official Press Briefing Room",
    imageUrl: "/presets/scenarios/press-briefing-room.png",
    category: "Breaking",
    description: "Formal press briefing room with diplomatic flags and official presentation lectern.",
    badge: "Press Briefing",
    lightingTone: "neutral",
  },

  // --- EXECUTIVE & TALK SHOW ---
  {
    id: "executive_desk",
    name: "Executive Standing Desk",
    imageUrl: "/avatars/master_ruby/ruby_standing_desk_bg.jpg",
    category: "Executive",
    description: "Contemporary glass anchor desk with frosted architectural panels and soft interior lighting.",
    badge: "Executive",
    lightingTone: "neutral",
  },
  {
    id: "late_night_lounge",
    name: "Late Night Lounge & Interview Set",
    imageUrl: "/presets/scenarios/late-night-lounge-set.png",
    category: "Special",
    description: "Warm leather conversation lounge for one-on-one guest interviews and late-night debriefs.",
    badge: "Talk Show",
    lightingTone: "warm",
  },
  {
    id: "interview_lounge_angle",
    name: "Deep Discussion Lounge",
    imageUrl: "/studio_environments/camera_angle_03_left_interview_lounge.jpg",
    category: "Special",
    description: "Relaxed studio corner setting designed for multi-speaker roundtables and deep dive panels.",
    badge: "Roundtable",
    lightingTone: "warm",
  },

  // --- OUTDOOR & FIELD BROADCAST ---
  {
    id: "live_city_field",
    name: "Live City Skyline Broadcast",
    imageUrl: "/presets/scenarios/live-field-backdrop-city.png",
    category: "Field",
    description: "Outdoor evening city skyline for on-the-scene live field correspondents.",
    badge: "On Location",
    lightingTone: "cool",
  },
  {
    id: "weather_satellite",
    name: "Weather & Radar Command Center",
    imageUrl: "/presets/scenarios/weather-graphic-screen.png",
    category: "Field",
    description: "Interactive Doppler meteorological map and high-resolution global satellite imagery.",
    badge: "Weather",
    lightingTone: "cool",
  },

  // --- CYBER & TECH ---
  {
    id: "videowall_hologram",
    name: "Holographic Media Wall",
    imageUrl: "/avatars/master_ruby/ruby_videowall_bg.jpg",
    category: "Cyber",
    description: "Large vertical visualization display for interactive data graphics and live satellite feeds.",
    badge: "Hologram",
    lightingTone: "cool",
  },
  {
    id: "dark_cyber_stage",
    name: "Dark Tech Horizon",
    imageUrl: "/avatars/master_blaze/blaze_standing_bg.jpg",
    category: "Cyber",
    description: "Sleek obsidian stage with deep teal accent lights designed for technology analysis.",
    badge: "Dark Mode",
    lightingTone: "cool",
  },

  // --- CYC & TRANSPARENT ALPHA ---
  {
    id: "transparent_alpha",
    name: "Transparent Alpha (Remotion / VP9)",
    imageUrl: "transparent",
    category: "Cyc",
    description: "True 32-bit RGBA transparent alpha channel for Remotion compositing, video overlays, and VP9 export.",
    badge: "32-bit Alpha",
    lightingTone: "neutral",
  },
];

export const STUDIO_BG_CATEGORIES: StudioBgCategory[] = [
  "All",
  "Newsroom",
  "Financial",
  "Breaking",
  "Executive",
  "Special",
  "Field",
  "Cyber",
  "Cyc",
];

export const DEFAULT_STUDIO_BACKGROUND = STUDIO_BACKGROUNDS[0];

export function isTransparentBackground(id?: string | null): boolean {
  if (!id) return false;
  return id === "transparent" || id === "transparent_alpha" || id.toLowerCase().includes("transparent");
}

export function getStudioBackgroundById(id?: string | null): StudioBackground {
  if (!id) return DEFAULT_STUDIO_BACKGROUND;
  if (isTransparentBackground(id)) {
    return {
      id: "transparent_alpha",
      name: "Transparent Alpha",
      imageUrl: "transparent",
      category: "Cyc",
      description: "True 32-bit RGBA transparent alpha channel.",
      badge: "32-bit Alpha",
      lightingTone: "neutral",
    };
  }
  // Check if custom URL
  if (id.startsWith("http://") || id.startsWith("https://") || id.startsWith("data:")) {
    return {
      id,
      name: "Custom Background",
      imageUrl: id,
      category: "Special",
      description: "User-provided custom background plate.",
      badge: "Custom",
      lightingTone: "neutral",
    };
  }
  const found = STUDIO_BACKGROUNDS.find((bg) => bg.id === id);
  return found || DEFAULT_STUDIO_BACKGROUND;
}

/**
 * B2: Pupillary Light Reflex (PLR) - Studio Background Set Luminance Estimator.
 * Returns normalized luminance (0.0 dark to 1.0 bright) for biological pupil constriction.
 */
export function getStudioBgLuminance(id?: string | null): number {
  if (!id) return 0.50;
  const bg = getStudioBackgroundById(id);
  if (!bg) return 0.50;
  if (bg.category === "Cyc") return 0.85;
  if (bg.category === "Newsroom" || bg.category === "Financial") return 0.70;
  if (bg.category === "Field") return 0.65;
  if (bg.category === "Executive") return 0.55;
  if (bg.category === "Breaking" || bg.lightingTone === "red_alert") return 0.38;
  if (bg.category === "Cyber") return 0.22;
  return 0.50;
}
