/**
 * scripts/gemini-cli/studioCatalog.ts
 *
 * Studio Environment Background Plates Catalog.
 * Curated and scale-calibrated background environment plates for alpha chroma keying,
 * multi-camera sets, and Remotion broadcast compositing.
 */

import { StudioPlate } from "./types";

export const STUDIO_PLATES_CATALOG: Record<string, StudioPlate> = {
  // --- SCALE-CALIBRATED VERTICAL (9:16) PLATES FOR MOBILE / STORIES ---
  studio_plate_standup_skyline_9x16: {
    id: "studio_plate_standup_skyline_9x16",
    label: "🌟 Scale-Calibrated Standup Stage (9:16 Vertical Twilight Skyline)",
    relativePath: "public/studio_environments/studio_plate_standup_skyline_9x16.jpg",
    description: "Vertical 9:16 scale-calibrated standup broadcast set: Expansive floor-to-ceiling panoramic glass windows with twilight skyscraper skyline, polished black epoxy floor, 20ft high studio ceiling with elevated lighting grid, shot on 50mm broadcast lens at 1.55m eye-level.",
    zone: "Zone 4 (Standup Stage - 9:16)",
  },
  studio_plate_videowall_standup_9x16: {
    id: "studio_plate_videowall_standup_9x16",
    label: "📊 Scale-Calibrated 8K Video Wall Stage (9:16 Vertical Visualizer)",
    relativePath: "public/studio_environments/studio_plate_videowall_standup_9x16.jpg",
    description: "Vertical 9:16 scale-calibrated 8K interactive LED video wall stage: High-definition cobalt and cyan infographics, neon floor guide tracks, dark reflective obsidian floor, 50mm broadcast optics.",
    zone: "Zone 2 (Video Wall - 9:16)",
  },
  studio_plate_financial_trading_9x16: {
    id: "studio_plate_financial_trading_9x16",
    label: "📈 Scale-Calibrated Financial Trading Floor (9:16 Vertical Markets)",
    relativePath: "public/studio_environments/studio_plate_financial_trading_9x16.jpg",
    description: "Vertical 9:16 financial command center: Wall Street candlestick telemetry, high-tech glass standing console, trading desks in deep background with f/2.8 optical bokeh blur.",
    zone: "Zone 2 (Financial Stage - 9:16)",
  },
  studio_plate_breaking_red_alert_9x16: {
    id: "studio_plate_breaking_red_alert_9x16",
    label: "🚨 Scale-Calibrated Red Alert Emergency Stage (9:16 Vertical Breaking)",
    relativePath: "public/studio_environments/studio_plate_breaking_red_alert_9x16.jpg",
    description: "Vertical 9:16 emergency breaking news studio: Crimson ambient neon lighting, alert telemetry screens, dark glossy floor, 20ft ceiling with professional broadcast trusses.",
    zone: "Zone 6 (Red Alert - 9:16)",
  },
  studio_plate_penthouse_lounge_9x16: {
    id: "studio_plate_penthouse_lounge_9x16",
    label: "🛋️ Scale-Calibrated Penthouse Lounge (9:16 Vertical Acoustic Slats)",
    relativePath: "public/studio_environments/studio_plate_penthouse_lounge_9x16.jpg",
    description: "Vertical 9:16 luxury interview lounge: Charcoal leather armchair at exact seated scale (30-inch), warm vertical walnut acoustic wood slats, rainy twilight skyline, soft 3200K key light.",
    zone: "Zone 5 (Interview Lounge - 9:16)",
  },
  studio_plate_cyber_command_9x16: {
    id: "studio_plate_cyber_command_9x16",
    label: "🌆 Scale-Calibrated Cyber Deck (9:16 Vertical Tech Matrix)",
    relativePath: "public/studio_environments/studio_plate_cyber_command_9x16.jpg",
    description: "Vertical 9:16 cyberpunk broadcast deck: Multi-tiered monitors with blockchain metrics, neon cyan and violet volumetric lighting, obsidian floor, 50mm broadcast optics.",
    zone: "Zone 2 (Cyber Deck - 9:16)",
  },

  // --- SCALE-CALIBRATED WIDESCREEN (16:9) PLATES FOR BROADCAST ---
  studio_plate_standup_skyline_16x9: {
    id: "studio_plate_standup_skyline_16x9",
    label: "🌟 Scale-Calibrated Standup Stage (16:9 Landscape Twilight Skyline)",
    relativePath: "public/studio_environments/studio_plate_standup_skyline_16x9.jpg",
    description: "Widescreen 16:9 scale-calibrated standup broadcast set: Floor-to-ceiling glass windows displaying twilight skyline, dark polished black epoxy floor, 20ft ceiling with high trusses, shot on 50mm broadcast lens at 1.55m eye-level.",
    zone: "Zone 4 (Standup Stage - 16:9)",
  },
  studio_plate_videowall_standup_16x9: {
    id: "studio_plate_videowall_standup_16x9",
    label: "📊 Scale-Calibrated 8K Video Wall Stage (16:9 Landscape Visualizer)",
    relativePath: "public/studio_environments/studio_plate_videowall_standup_16x9.jpg",
    description: "Widescreen 16:9 scale-calibrated 8K interactive LED video display wall: Global news telemetry, dark mirror-reflective floor, 22ft studio ceiling, neutral 50mm broadcast optics.",
    zone: "Zone 2 (Video Wall - 16:9)",
  },
  studio_plate_financial_trading_16x9: {
    id: "studio_plate_financial_trading_16x9",
    label: "📈 Scale-Calibrated Financial Trading Floor (16:9 Landscape Markets)",
    relativePath: "public/studio_environments/studio_plate_financial_trading_16x9.jpg",
    description: "Widescreen 16:9 financial command center: Real-time candlestick charts, stock market indices, distant trading workstations with f/2.8 optical bokeh, 50mm broadcast lens at 1.55m height.",
    zone: "Zone 2 (Financial Stage - 16:9)",
  },
  studio_plate_breaking_red_alert_16x9: {
    id: "studio_plate_breaking_red_alert_16x9",
    label: "🚨 Scale-Calibrated Red Alert Emergency Stage (16:9 Landscape Breaking)",
    relativePath: "public/studio_environments/studio_plate_breaking_red_alert_16x9.jpg",
    description: "Widescreen 16:9 high-tension breaking news broadcast set: Crimson neon edge lighting, breaking news graphic screens, high 20ft ceiling with professional trusses, 50mm broadcast lens.",
    zone: "Zone 6 (Red Alert - 16:9)",
  },
  studio_plate_penthouse_lounge_16x9: {
    id: "studio_plate_penthouse_lounge_16x9",
    label: "🛋️ Scale-Calibrated Penthouse Lounge (16:9 Landscape Acoustic Slats)",
    relativePath: "public/studio_environments/studio_plate_penthouse_lounge_16x9.jpg",
    description: "Widescreen 16:9 luxury penthouse interview lounge: Charcoal leather club armchairs at seated human scale, circular brass coffee table, vertical walnut acoustic slat wall, rainy twilight skyline.",
    zone: "Zone 5 (Interview Lounge - 16:9)",
  },
  studio_plate_cyber_command_16x9: {
    id: "studio_plate_cyber_command_16x9",
    label: "🌆 Scale-Calibrated Cyber Deck (16:9 Landscape Tech Matrix)",
    relativePath: "public/studio_environments/studio_plate_cyber_command_16x9.jpg",
    description: "Widescreen 16:9 cyberpunk broadcast deck: Multi-tiered curved monitors, cryptocurrency metrics, neon cyan and violet volumetric studio lighting, polished obsidian floor.",
    zone: "Zone 2 (Cyber Deck - 16:9)",
  },

  // --- CORE & LEGACY STUDIO PLATES ---
  section_01_anchor_desk: {
    id: "section_01_anchor_desk",
    label: "🎙️ Section 01: Centered Curved Glass Anchor Desk (Full Skyline)",
    relativePath: "public/studio_environments/section_01_anchor_desk_centered_closeup.jpg",
    description: "Curved tempered-glass news desk centered on camera, open slim silver laptop on left, document stack on right, black leather executive chair, open panoramic blue twilight skyscraper skyline through floor-to-ceiling glass windows.",
    zone: "Zone 1 (Center Desk)",
  },
  section_02_videowall_flat: {
    id: "section_02_videowall_flat",
    label: "📊 Section 02: 8K Mega Video Wall Stand-Up Stage (Flat 50mm)",
    relativePath: "public/studio_environments/section_02_videowall_flat_straight_50mm.jpg",
    description: "Flat rectangular 8K interactive LED video display wall displaying real-time market trends, world maps, straight floor light lines, dark polished reflective floor.",
    zone: "Zone 2 (Video Wall)",
  },
  section_02_chroma_green_50mm: {
    id: "section_02_chroma_green_50mm",
    label: "🟢 Section 02: Studio Chroma Cyc Green Sweep (#00B140, 50mm Flat)",
    relativePath: "public/studio_environments/section_02_chroma_green_cyc_floor_50mm.jpg",
    description: "Full cyclorama studio stage with seamless chroma green wall and floor sweep (#00B140), flat 50mm broadcast optics, perfectly even studio illumination for AI video generation.",
    zone: "Zone 3 (Chroma Stage)",
  },
  section_02_chroma_blue_50mm: {
    id: "section_02_chroma_blue_50mm",
    label: "🔵 Section 02: Studio Chroma Cyc Blue Sweep (#0047BB, 50mm Flat)",
    relativePath: "public/studio_environments/section_02_chroma_blue_cyc_floor_50mm.jpg",
    description: "Full cyclorama studio stage with seamless chroma blue wall and floor sweep (#0047BB), flat 50mm broadcast optics, perfectly uniform illumination for transparent keying.",
    zone: "Zone 3 (Chroma Stage)",
  },
  section_03_interview_lounge: {
    id: "section_03_interview_lounge",
    label: "🛋️ Section 03: Centered Interview Lounge (Walnut Acoustic Slat Wall)",
    relativePath: "public/studio_environments/section_03_interview_lounge_centered_closeup.jpg",
    description: "Two charcoal grey leather club armchairs centered around a low glass/brass coffee table with digital tablet and water glasses, warm vertical walnut acoustic wood slat wall with amber light tubes.",
    zone: "Zone 5 (Interview Lounge)",
  },
  zone_01_anchor_desk: {
    id: "zone_01_anchor_desk",
    label: "🏢 Zone 01: Master Anchor Desk Medium Shot",
    relativePath: "public/studio_environments/zone_01_anchor_desk_medium_shot.jpg",
    description: "Medium establishing shot of the anchor desk with full room reflections and twilight city skyline.",
    zone: "Zone 1 (Anchor Desk)",
  },
  zone_02_videowall: {
    id: "zone_02_videowall",
    label: "📈 Zone 02: Mega Video Wall Stand-Up Presentation",
    relativePath: "public/studio_environments/zone_02_videowall_standup_medium.jpg",
    description: "Curved 8K interactive video wall with financial stock charts and live data graphics.",
    zone: "Zone 2 (Video Wall)",
  },
  zone_04_center_runway: {
    id: "zone_04_center_runway",
    label: "🌟 Zone 04: Center Runway Presentation Stage",
    relativePath: "public/studio_environments/zone_04_center_runway_panoramic.jpg",
    description: "Full-body presentation floor with symmetrical inlaid circular LED floor arcs and overhead lighting grid.",
    zone: "Zone 4 (Center Runway)",
  },
  zone_06_red_alert: {
    id: "zone_06_red_alert",
    label: "🚨 Zone 06: Breaking News Red Alert Emergency Stage",
    relativePath: "public/studio_environments/zone_06_breaking_news_red_alert.jpg",
    description: "Emergency crimson red neon light tubes, urgent breaking news graphic banner, high-tension broadcast atmosphere.",
    zone: "Zone 6 (Red Alert)",
  },
  studio_master_panorama: {
    id: "studio_master_panorama",
    label: "🌐 Studio Master 360° Panoramic Wide Establishing View",
    relativePath: "public/studio_environments/studio_master_01_panoramic_videowall.jpg",
    description: "Grand establishing panoramic shot revealing all 3 zones: Interview Lounge on left, Anchor Desk in center, Video Wall on right.",
    zone: "Master Panorama",
  },
};

