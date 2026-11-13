
export interface StudioPlate {
  id: string;
  name: string;
  imagePath: string;
  lightingPreset: 'day_sunlight' | 'night_penthouse' | 'red_alert';
}

export const MASTER_STUDIO_PLATES: StudioPlate[] = [
  { id: 'studio_desk_a', name: 'Master Studio Desk A', imagePath: 'public/avatars/master_ruby/ruby_standing_bg.jpg', lightingPreset: 'day_sunlight' },
  { id: 'tech_hub', name: 'Tech Innovation Hub', imagePath: 'public/avatars/master_ruby/ruby_desk_bg.jpg', lightingPreset: 'day_sunlight' },
  { id: 'night_penthouse', name: 'Night City Penthouse', imagePath: 'public/avatars/master_ruby/ruby_standing_bg.jpg', lightingPreset: 'night_penthouse' },
  { id: 'breaking_red', name: 'Breaking News Red Alert', imagePath: 'public/avatars/master_ruby/ruby_desk_bg.jpg', lightingPreset: 'red_alert' },
];

/**
 * Instantly swaps background plates for transparent presenter video loops without GPU re-renders.
 */
export function getStudioPlate(plateId: string): StudioPlate {
  const plate = MASTER_STUDIO_PLATES.find((p) => p.id === plateId);
  return plate || MASTER_STUDIO_PLATES[0];
}
