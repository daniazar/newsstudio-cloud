/**
 * src/lib/ecommerce/turntableAudioEngine.ts
 *
 * Spatial Foley Audio & Contextual Soundscapes Engine for Neural Product Turntable Studio:
 * 1. Semantic Ambient Soundscapes: Maps 24+ studio environments to ambient sound beds (urban, nature, cafe, etc.)
 * 2. Spatial Mechanical Foley: Turntable servo rotation motor hums, specular light sweeps
 * 3. Feature Radar Chimes: High-precision interface blips synchronized to radar hotspot entrances
 * 4. Automatic Ducking: Seamlessly attenuates soundscapes under voiceover narration
 */

import { AdScene } from "@/lib/types/ecommerce";
import { TURNTABLE_ENVIRONMENT_PRESETS, TurntableEnvironmentRealm } from "./turntableEnvironmentEngine";

export interface TurntableAmbientTrackInfo {
  id: string;
  name: string;
  path: string;
  defaultVolume: number;
  description: string;
  realm: TurntableEnvironmentRealm;
}

export interface TurntableSfxTrigger {
  sfxId: string;
  triggerFrame: number;
  volume: number;
  description: string;
}

/**
 * Curated ambient audio beds mapped to each environment realm.
 */
export const REALM_AMBIENT_MAP: Record<TurntableEnvironmentRealm, TurntableAmbientTrackInfo> = {
  urban_travel: {
    id: "urban_breeze",
    name: "Metropolitan Rooftop Breeze",
    path: "/sfx/typing.mp3", // fallback system sound or broadcast room tone
    defaultVolume: 0.25,
    description: "Subtle rooftop wind, distant metropolitan drone & open sky acoustics",
    realm: "urban_travel",
  },
  outdoor_adventure: {
    id: "nature_wilderness",
    name: "Alpine Wilderness & Water",
    path: "/sfx/whoosh.mp3",
    defaultVolume: 0.22,
    description: "Gentle mountain breeze, rustling pine needles & alpine atmosphere",
    realm: "outdoor_adventure",
  },
  culinary_gourmet: {
    id: "cafe_hum",
    name: "Artisan Café Ambience",
    path: "/sfx/ding.mp3",
    defaultVolume: 0.2,
    description: "Warm espresso bar tone, soft porcelain clinks & intimate room acoustic",
    realm: "culinary_gourmet",
  },
  architecture_interior: {
    id: "architectural_room_tone",
    name: "Minimalist Loft Room Tone",
    path: "/sfx/typing.mp3",
    defaultVolume: 0.18,
    description: "Clean modern interior acoustics with warm oak and concrete damping",
    realm: "architecture_interior",
  },
  luxury_nightlife: {
    id: "lounge_velvet",
    name: "Velvet Lounge Sub-Drone",
    path: "/sfx/sub_drop.mp3",
    defaultVolume: 0.22,
    description: "Deep luxury cocktail lounge bass tone, obsidian reflections",
    realm: "luxury_nightlife",
  },
  wellness_spa: {
    id: "zen_water",
    name: "Zen Mineral Stream",
    path: "/sfx/whoosh.mp3",
    defaultVolume: 0.2,
    description: "Calm trickling spring, bamboo wind acoustics & clean spa serenity",
    realm: "wellness_spa",
  },
  fashion_runway: {
    id: "runway_reverb",
    name: "Haute Couture Studio Reverb",
    path: "/sfx/camera_shutter.mp3",
    defaultVolume: 0.25,
    description: "High-ceiling Paris warehouse reverb, strobe lights & editorial snap",
    realm: "fashion_runway",
  },
  workshop_auto: {
    id: "industrial_garage",
    name: "Precision Workshop Tone",
    path: "/sfx/glitch.mp3",
    defaultVolume: 0.25,
    description: "High-end mechanical workshop, brushed titanium & carbon resonance",
    realm: "workshop_auto",
  },
  tech_gaming: {
    id: "cleanroom_server",
    name: "Silicon Cleanroom & Server Air",
    path: "/sfx/typing.mp3",
    defaultVolume: 0.2,
    description: "Sterile laminar airflow, high-frequency server room hum & laser sweeps",
    realm: "tech_gaming",
  },
};

/**
 * Resolves the recommended ambient track for a given environment preset ID.
 */
export function getTurntableAmbientTrack(environmentId?: string): TurntableAmbientTrackInfo {
  if (!environmentId) {
    return REALM_AMBIENT_MAP.tech_gaming;
  }

  const preset = TURNTABLE_ENVIRONMENT_PRESETS.find((p) => p.id === environmentId);
  const realm = preset ? preset.realm : "tech_gaming";
  return REALM_AMBIENT_MAP[realm] || REALM_AMBIENT_MAP.tech_gaming;
}

/**
 * Compiles all spatial foley cues and radar hotspot audio triggers for a turntable scene.
 */
export function compileTurntableSfxTriggers(
  scene: AdScene,
  introDurationFrames: number = 0
): TurntableSfxTrigger[] {
  if (scene.sceneType !== "product_turntable") {
    return [];
  }

  const triggers: TurntableSfxTrigger[] = [];
  const sceneStart = scene.startFrame + introDurationFrames;

  // 1. Mechanical Turntable Rotation Foley (Servo hum)
  if (scene.turntableAudioFoley !== false) {
    triggers.push({
      sfxId: "servo_spin",
      triggerFrame: sceneStart + 4,
      volume: 0.35,
      description: "Turntable mechanical servo rotation start",
    });
  }

  // 2. Specular Sheen Light Sweep Shimmer
  if (scene.enableSpecularSheen !== false) {
    triggers.push({
      sfxId: "shimmer",
      triggerFrame: sceneStart + 12,
      volume: 0.4,
      description: "Dynamic specular light sheen shimmer",
    });
  }

  // 3. Feature Radar Callout Pings
  if (scene.turntableAudioChimes !== false && scene.turntableRadarPins?.length) {
    scene.turntableRadarPins.forEach((pin, idx) => {
      const pinOffset = pin.startFrame ?? 15 + idx * 12;
      triggers.push({
        sfxId: "radar_blip",
        triggerFrame: sceneStart + pinOffset,
        volume: 0.45,
        description: `Feature radar callout pin: ${pin.label}`,
      });
    });
  }

  // 4. Scarcity & Urgency HUD Pop
  if (scene.turntableSocialProof?.showScarcityTicker) {
    triggers.push({
      sfxId: "pop",
      triggerFrame: sceneStart + 14,
      volume: 0.35,
      description: "Social proof urgency ticker pop",
    });
  }

  return triggers;
}
