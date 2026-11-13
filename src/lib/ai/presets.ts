/**
 * Visual presets for persona base image generation.
 * All environments are realistic settings suitable for news/educational/interview content.
 */

export interface VisualPreset {
  slug: string;
  name: string;
  environment: string;
  defaultPose: string;
  lighting: string;
}

export const VISUAL_PRESETS: VisualPreset[] = [
  {
    slug: "news_studio_classic",
    name: "Classic TV Studio",
    environment: "in a professional, state-of-the-art television newsroom broadcasting studio with high-end camera rigs, display monitors, and a subtle glowing backdrop",
    defaultPose: "standing confidently behind a sleek modern anchor desk, facing the camera, medium-shot portrait",
    lighting: "balanced multi-point studio key lighting, natural and professional, with a clean bokeh background"
  },
  {
    slug: "executive_office",
    name: "Executive Office",
    environment: "in a high-floor executive corner office overlooking a modern city skyline through a large clean floor-to-ceiling glass window",
    defaultPose: "standing confidently next to a polished mahogany conference table, facing the camera, three-quarter portrait",
    lighting: "bright natural daylight coming from the window, soft side shadows, clean and corporate"
  },
  {
    slug: "press_conference",
    name: "Press Room",
    environment: "in a modern corporate press briefing room, behind a podium crowded with brandless news microphones and a blue press-release backdrop",
    defaultPose: "standing behind the podium, addressing the press, looking directly at the camera, medium close-up shot",
    lighting: "intense white stage key lights, professional press room ambience"
  },
  {
    slug: "cozy_cafe",
    name: "Cozy Cafe",
    environment: "in a warmly lit, modern artisanal coffee shop with a brick wall, green plants, and a wooden counter in the background",
    defaultPose: "sitting at a small round table with a ceramic coffee cup, looking casually at the camera, medium portrait",
    lighting: "warm golden ambient lighting, soft daylight from a side window"
  },
  {
    slug: "urban_park",
    name: "City Park",
    environment: "in a sunny city park with lush green trees, a clean stone pathway, and a wooden park bench in the background",
    defaultPose: "standing on the pathway, leaning slightly, looking relaxed and confident, three-quarter body shot",
    lighting: "warm afternoon golden-hour sunlight filtering through the tree leaves, natural lens flare"
  },
  {
    slug: "library_study",
    name: "Library",
    environment: "inside a quiet, prestigious university library with tall wooden bookshelves filled with books, and study tables in the background",
    defaultPose: "standing near a bookshelf, holding a closed notebook, looking intelligent and friendly, portrait shot",
    lighting: "soft diffused lighting, warm reading lamp glow in the background"
  },
  {
    slug: "airport_lounge",
    name: "Airport Lounge",
    environment: "inside an elegant VIP airport lounge with modern armchairs, and blurred views of airplanes on the runway through large glass windows",
    defaultPose: "sitting comfortably in a leather armchair, looking composed, medium portrait",
    lighting: "cool evening twilight daylight, soft interior ceiling spotlights"
  },
  {
    slug: "hotel_lobby",
    name: "Hotel Lobby",
    environment: "in the grand lobby of a luxury hotel, with marble floors, pillars, and a minimalist reception counter in the background",
    defaultPose: "standing in the lobby, looking welcoming and professional, three-quarter shot",
    lighting: "luxurious warm chandeliers, reflective floor reflections"
  },
  {
    slug: "tech_lab",
    name: "Tech Laboratory",
    environment: "inside a clean scientific laboratory with electronics workstations, soldering iron setups, and glowing oscilloscope screens in the background",
    defaultPose: "standing next to a lab bench, looking professional, medium portrait",
    lighting: "crisp white laboratory lighting, glowing neon equipment LEDs"
  },
  {
    slug: "art_gallery",
    name: "Art Gallery",
    environment: "inside a minimalist contemporary art gallery with clean white walls and framed abstract paintings hanging in the background",
    defaultPose: "standing next to an art piece, looking creative and professional, medium shot",
    lighting: "bright clean museum spot-lighting, soft reflections"
  }
];

export function getPresetBySlug(slug: string): VisualPreset | undefined {
  return VISUAL_PRESETS.find(p => p.slug === slug);
}
