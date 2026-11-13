/**
 * src/lib/ecommerce/productMediaPresets.ts
 *
 * Universal Product Typology & Media Generation Presets Catalog.
 * Powers both:
 * 1. Custom Product Photo Studio (Gemini & Imagen 3)
 * 2. Custom Veo Hero Video Studio (Google Veo 3.1 & Flow - 8s Veo Lite)
 *
 * Provides specialized, battle-tested prompt templates per product kind,
 * clickable environment/lighting buttons, and automatic category detection.
 */

import { ProductSpec } from "@/lib/types/ecommerce";
import { getPersonaPromptDetails } from "./personaPromptHelper";
import { filterPromptForSafety } from "./promptSafetyFilter";

export interface MediaPresetItem {
  id: string;
  label: string;
  icon: string;
  badge: string;
  description: string;
  template: (productName: string, personaId?: string, attireId?: string) => string;
}

export function formatPresetWithPersona(
  basePrompt: string,
  productName: string,
  category: string,
  personaId?: string,
  attireId?: string,
  mode: "video" | "photo" = "photo",
  actionVariant?: string,
  options?: {
    dialogue?: string;
    language?: string;
    allowSpeaking?: boolean;
    templateIndex?: number;
  }
): string {
  const resolvedPersonaId = personaId || "ruby";
  const shouldAllowSpeaking = options?.allowSpeaking ?? Boolean(options?.dialogue);
  const details = getPersonaPromptDetails({
    personaId: resolvedPersonaId,
    attireId,
    productName,
    typology: category,
    mode,
    actionVariant,
    dialogue: options?.dialogue,
    language: options?.language,
    allowSpeaking: shouldAllowSpeaking,
    templateIndex: options?.templateIndex,
  });

  if (details.structuredPrompt) {
    return details.structuredPrompt;
  }

  return filterPromptForSafety(`${basePrompt}, ${details.fullPersonaPromptClause}`, {
    allowSpeaking: shouldAllowSpeaking,
  });
}

export interface ProductCategoryConfig {
  id: string;
  label: string;
  icon: string;
  badge: string;
  photoPresets: MediaPresetItem[];
  videoPresets: MediaPresetItem[];
}

export interface EnvironmentModifier {
  id: string;
  label: string;
  icon: string;
  phrase: string;
}

export const ENVIRONMENT_LIGHTING_MODIFIERS: EnvironmentModifier[] = [
  {
    id: "sunlit_daylight",
    label: "☀️ Sunlit Daylight",
    icon: "Sun",
    phrase: "Basking in bright natural morning sunlight through floor-to-ceiling windows with soft diffuse illumination",
  },
  {
    id: "moody_twilight",
    label: "🌙 Moody Twilight",
    icon: "Moon",
    phrase: "Dramatic low-key cinematic lighting with rich contrast, deep architectural shadows, and warm tungsten ambient highlights",
  },
  {
    id: "golden_hour",
    label: "🌅 Golden Hour",
    icon: "Sunset",
    phrase: "Warm golden hour sunlight at dusk, sun flares, long cinematic amber shadows, and cozy warm color temperature",
  },
  {
    id: "studio_softbox",
    label: "💡 Clean Studio Softbox",
    icon: "Lightbulb",
    phrase: "Commercial 3-point softbox studio lighting, neutral white balanced, subtle specular reflections, 8k luxury catalog look",
  },
  {
    id: "neon_cyberpunk",
    label: "🟣 Neon Cyberpunk",
    icon: "Zap",
    phrase: "Atmospheric neon rim lighting in glowing cyan and magenta, sleek dark reflections, high-tech futuristic aesthetic",
  },
  {
    id: "organic_botanicals",
    label: "🌿 Organic Botanicals",
    icon: "Leaf",
    phrase: "Staged with lush fresh botanical monstera and eucalyptus leaves, natural organic textures, and earthy tones",
  },
];

export const LIGHTING_MODIFIERS = ENVIRONMENT_LIGHTING_MODIFIERS;

export const PRODUCT_MEDIA_CATEGORIES: Record<string, ProductCategoryConfig> = {
  surface_material: {
    id: "surface_material",
    label: "🏠 Surfaces, Flooring & Paint",
    icon: "Home",
    badge: "Architectural Staging",
    photoPresets: [
      {
        id: "sofa_lifestyle_living_room",
        label: "🛋️ Seated with Floor Sample",
        icon: "Armchair",
        badge: "Lifestyle Staging",
        description: "Seated on designer sofa holding floor sample plank in hand, with installed floor",
        template: (name, personaId, attireId) =>
          formatPresetWithPersona(
            `High-end interior architectural photograph of an expansive sunlit luxury living room showcasing seamlessly installed ${name}, with the presenter seated comfortably on a plush contemporary minimalist beige sofa holding an authentic sample plank of ${name} in her hands to present its realistic wood grain and craftsmanship, floor-to-ceiling windows with garden view, warm morning light`,
            name,
            "surface_material",
            personaId,
            attireId,
            "photo"
          ),
      },
      {
        id: "showroom_gallery_wall",
        label: "🏢 Showroom Wall Display",
        icon: "Building",
        badge: "Gallery Staging",
        description: "Standing in architectural showroom admiring wall display of floor sample planks and paint finishes",
        template: (name, personaId, attireId) =>
          formatPresetWithPersona(
            `Architectural interior photograph of an upscale designer showroom with floor-to-ceiling exhibition walls featuring gallery displays of different flooring planks, paint swatches, and material samples, with the presenter standing poised beside the curated wall mount of ${name}, warm soft gallery spotlights highlighting textures and craftsmanship`,
            name,
            "surface_material",
            personaId,
            attireId,
            "photo",
            "showroom_wall"
          ),
      },
      {
        id: "lounge_armchair",
        label: "🪑 Cozy Lounge with Floor Sample",
        icon: "Coffee",
        badge: "Warm Lifestyle",
        description: "Seated in modern accent chair holding floor sample plank, natural light on floor",
        template: (name, personaId, attireId) =>
          formatPresetWithPersona(
            `Editorial lifestyle interior photograph showcasing installed ${name}, with the presenter seated gracefully in a modern accent armchair holding a sample plank of ${name} in her hands, warm soft morning light highlighting the floor wood grain and textures`,
            name,
            "surface_material",
            personaId,
            attireId,
            "photo"
          ),
      },
      {
        id: "scandinavian_living_room",
        label: "🏡 Sunlit Scandinavian Room",
        icon: "Home",
        badge: "Editorial Staging",
        description: "Expansive modern living room with natural oak & morning light",
        template: (name, personaId, attireId) =>
          formatPresetWithPersona(
            `Photorealistic architectural interior photograph of an expansive sunlit Scandinavian living room with floor-to-ceiling windows, natural blonde oak finishes, and ${name} seamlessly installed throughout the space`,
            name,
            "surface_material",
            personaId,
            attireId,
            "photo"
          ),
      },
      {
        id: "minimalist_modern_kitchen",
        label: "🍳 Modern Luxury Kitchen",
        icon: "Utensils",
        badge: "Architectural",
        description: "Open-concept kitchen with matte cabinetry & brass fixtures",
        template: (name, personaId, attireId) =>
          formatPresetWithPersona(
            `Ultra-modern architectural kitchen showcasing ${name}, seamless installation, matte black luxury cabinetry, brushed brass fixtures, warm recessed ceiling LED lighting`,
            name,
            "surface_material",
            personaId,
            attireId,
            "photo"
          ),
      },
      {
        id: "penthouse_master_suite",
        label: "🏢 Penthouse Master Suite",
        icon: "Building",
        badge: "High-End",
        description: "High-rise penthouse overlooking twilight city skyline",
        template: (name, personaId, attireId) =>
          formatPresetWithPersona(
            `Luxurious high-rise penthouse suite showcasing ${name}, floor-to-ceiling panoramic glass walls overlooking a vibrant twilight city skyline`,
            name,
            "surface_material",
            personaId,
            attireId,
            "photo"
          ),
      },
      {
        id: "macro_surface_texture",
        label: "🔍 Sensory Macro Texture",
        icon: "Search",
        badge: "Material Detail",
        description: "Close-up angled glance revealing authentic grain & bevels",
        template: (name, personaId, attireId) =>
          formatPresetWithPersona(
            `Macro shallow depth-of-field close-up photograph of ${name}, raking directional side-light highlighting micro-texture, authentic grain, beveled edges, and tactile craftsmanship`,
            name,
            "surface_material",
            personaId,
            attireId,
            "photo"
          ),
      },
    ],
    videoPresets: [
      {
        id: "veo_showroom_wall_samples",
        label: "🏢 Showroom Wall Samples Walk-Up",
        icon: "Building",
        badge: "Showroom Wall",
        description: "Persona walks up to wall sample board in design showroom and touches/inspects flooring plank",
        template: (name, personaId, attireId) =>
          formatPresetWithPersona(
            `Smooth cinematic camera tracking shot moving through an upscale architectural design showroom with floor-to-ceiling exhibition walls displaying mounted samples of different flooring planks, wall textures, and curated finishes. The scene features ${name} prominently displayed on the showroom feature wall, pure unobstructed camera POV, no physical drones, no quadcopters, no camera equipment visible in frame`,
            name,
            "surface_material",
            personaId,
            attireId,
            "video",
            "showroom_wall"
          ),
      },
      {
        id: "veo_living_room_drone",
        label: "🏡 Living Room Aerial Glide",
        icon: "Compass",
        badge: "Living Room",
        description: "Smooth continuous floating camera glide across living room with installed flooring",
        template: (name, personaId, attireId) =>
          formatPresetWithPersona(
            `Smooth continuous floating camera glide soaring smoothly forward through an expansive sun-drenched luxury living room with installed ${name}, pure unobstructed camera POV, no physical drones, no quadcopters, no camera equipment visible in frame`,
            name,
            "surface_material",
            personaId,
            attireId,
            "video",
            "living_room"
          ),
      },
      {
        id: "veo_showroom_paint_swatches",
        label: "🎨 Showroom Paint & Wall Swatches",
        icon: "Palette",
        badge: "Color Gallery",
        description: "Showroom gallery wall of architectural paint swatches & flooring pairings; persona examines finishes",
        template: (name, personaId, attireId) =>
          formatPresetWithPersona(
            `Cinematic camera glide through a modern interior design showroom featuring an illuminated exhibition gallery wall of large architectural paint swatches, texture samples, and complementary flooring displays with ${name}, pure unobstructed camera POV, no physical drones, no quadcopters, no camera equipment visible in frame`,
            name,
            "surface_material",
            personaId,
            attireId,
            "video",
            "showroom_paint"
          ),
      },
      {
        id: "veo_macro_dolly_sweep",
        label: "🔭 Slow Dolly Push-In",
        icon: "Video",
        badge: "Parallax Motion",
        description: "3D camera push revealing depth & craftsmanship",
        template: (name, personaId, attireId) =>
          formatPresetWithPersona(
            `Slow cinematic 3D dolly push-in tracking smoothly across a staged designer interior featuring installed ${name}, rich parallax depth`,
            name,
            "surface_material",
            personaId,
            attireId,
            "video"
          ),
      },
      {
        id: "veo_pedestal_orbit",
        label: "🌐 3D Ambient Arc Orbit",
        icon: "RotateCw",
        badge: "360 Arc",
        description: "Subtle continuous arc camera move around the space",
        template: (name, personaId, attireId) =>
          formatPresetWithPersona(
            `Continuous subtle 3D orbital camera motion circling gracefully around an architectural interior featuring installed ${name}`,
            name,
            "surface_material",
            personaId,
            attireId,
            "video"
          ),
      },
      {
        id: "veo_crane_down",
        label: "🏗️ Studio Crane Boom",
        icon: "ArrowDown",
        badge: "Boom Shot",
        description: "High-angle robotic crane booming down smoothly",
        template: (name, personaId, attireId) =>
          formatPresetWithPersona(
            `High-angle robotic studio camera crane shot smoothly booming downward and leveling out across ${name} in an illuminated designer showroom`,
            name,
            "surface_material",
            personaId,
            attireId,
            "video"
          ),
      },
    ],
  },

  discrete_object: {
    id: "discrete_object",
    label: "⚡ Tech & Electronics",
    icon: "Cpu",
    badge: "Precision Tech",
    photoPresets: [
      {
        id: "cyberpunk_pedestal",
        label: "🔮 Dark Cyberpunk Pedestal",
        icon: "Zap",
        badge: "High-Tech",
        description: "Matte obsidian plinth with cyan & magenta neon rim light",
        template: (name) =>
          `Commercial product photography of ${name} resting on a matte obsidian pedestal, illuminated by razor-sharp cyan and magenta neon rim lights, subtle atmospheric haze, crisp industrial design details, 8k studio catalog quality`,
      },
      {
        id: "minimalist_apple_desk",
        label: "🖥️ Minimalist Tech Workspace",
        icon: "Monitor",
        badge: "Clean Setup",
        description: "Scandinavian birch desk with mechanical keyboard & morning light",
        template: (name) =>
          `Clean Scandinavian birch workstation desk setup with ceramic coffee cup, mechanical keyboard, soft morning window light highlighting ${name} with authentic natural shadows, Apple commercial aesthetic`,
      },
      {
        id: "zero_gravity_levitation",
        label: "⚡ Zero Gravity Levitation",
        icon: "Sparkles",
        badge: "Floating 3D",
        description: "Product floating mid-air with dynamic particles",
        template: (name) =>
          `Dramatic zero-gravity levitating showcase of ${name} floating mid-air against a deep charcoal studio backdrop, subtle magnetic dust particles caught in soft directional studio light, high-speed shutter commercial shot`,
      },
      {
        id: "exploded_caliper_specs",
        label: "📐 Precision Engineering Studio",
        icon: "Compass",
        badge: "Blueprint",
        description: "Illuminated grid pedestal showcasing sleek silhouette",
        template: (name) =>
          `Precision industrial design showcase of ${name} resting on an illuminated frosted glass grid pedestal, subtle blue accent lighting, razor-sharp focus on bevels and metallic surfaces`,
      },
    ],
    videoPresets: [
      {
        id: "veo_tech_orbit",
        label: "🌐 360° Tech Orbit",
        icon: "RotateCw",
        badge: "Smooth Arc",
        description: "Continuous camera orbit showcasing industrial design",
        template: (name) =>
          `Continuous 360-degree cinematic orbital tracking shot around ${name} on a sleek illuminated pedestal, specular light streaks gliding along chamfered edges, photorealistic 8k commercial video`,
      },
      {
        id: "veo_tech_push",
        label: "🔍 Macro Port & Button Glide",
        icon: "Search",
        badge: "Close-Up",
        description: "Smooth push-in over tactile buttons and materials",
        template: (name) =>
          `Slow macro camera glide pushing forward across the sleek textures and tactile contours of ${name}, rich shallow depth of field, metallic sheen shifting dynamically under studio keylights`,
      },
      {
        id: "veo_floating_hero",
        label: "✨ Floating Zero-G Dynamics",
        icon: "Sparkles",
        badge: "Weightless",
        description: "Subtle floating tilt with ambient particles",
        template: (name) =>
          `Cinematic slow-motion shot of ${name} floating weightlessly in mid-air, gently rotating with subtle harmonic tilt, soft studio rim lighting highlighting premium materials`,
      },
      {
        id: "veo_crane_reveal",
        label: "🏗️ Dramatic Top-Down Reveal",
        icon: "ArrowDown",
        badge: "Dramatic Reveal",
        description: "High-angle crane boom descending into hero perspective",
        template: (name) =>
          `Dramatic overhead camera descending smoothly from high angle down to eye level, revealing ${name} bathed in focused spotlight against an ultra-modern minimalist backdrop`,
      },
    ],
  },

  sensory_consumable: {
    id: "sensory_consumable",
    label: "💄 Beauty & Skincare",
    icon: "Sparkles",
    badge: "Luxury Cosmetics",
    photoPresets: [
      {
        id: "marble_water_droplets",
        label: "💧 Marble & Water Droplets",
        icon: "Droplets",
        badge: "Sensory Spa",
        description: "Polished Carrara marble with glistening macro droplets",
        template: (name) =>
          `Luxury beauty editorial photograph of ${name} on polished white Carrara marble, glistening macro water droplets scattered across the surface, fresh botanical eucalyptus leaves, soft diffuse morning daylight, Vogue beauty catalog quality`,
      },
      {
        id: "golden_hour_botanical",
        label: "🌸 Golden Hour Botanical",
        icon: "Sun",
        badge: "Organic Flora",
        description: "Dappled sunlight through blooming peonies and petals",
        template: (name) =>
          `Organic luxury cosmetics staging of ${name} surrounded by soft pastel flower petals and delicate wild botanicals, warm golden hour sunlight filtering through, dreamy soft-focus background`,
      },
      {
        id: "zen_spa_stone",
        label: "✨ Zen River Stone Podium",
        icon: "Layers",
        badge: "Wellness",
        description: "Stacked smooth dark stones with gentle rising steam",
        template: (name) =>
          `Serene luxury wellness spa setting featuring ${name} perched on stacked smooth dark river stones, gentle translucent mist rising, warm bamboo accents, calming ambient light`,
      },
      {
        id: "frosted_glass_reflection",
        label: "🧊 Frosted Glass & Ice Sheen",
        icon: "Shield",
        badge: "Pure Clean",
        description: "Ribbed frosted glass with crisp diffuse backlight",
        template: (name) =>
          `Crisp minimalist aesthetic photograph of ${name} on ribbed frosted glass with pure translucent backlight, subtle morning condensation, crisp refreshing commercial look`,
      },
    ],
    videoPresets: [
      {
        id: "veo_water_droplet_glide",
        label: "💧 Fluid Droplet Glide",
        icon: "Droplets",
        badge: "Sensory Motion",
        description: "Smooth gliding shot capturing light refractions in water",
        template: (name) =>
          `Cinematic slow-motion camera glide moving gracefully across ${name} on gleaming marble, glistening water droplets refracting soft morning sunlight, pristine beauty commercial 4k`,
      },
      {
        id: "veo_botanical_orbit",
        label: "🌿 Botanical Arc Orbit",
        icon: "RotateCw",
        badge: "Natural Glow",
        description: "Slow arc orbit through organic floral elements",
        template: (name) =>
          `Gentle 3D arc camera orbit tracking around ${name} through softly blurred green botanicals and golden hour sunbeams, dreamy luxury cosmetic commercial pacing, 30fps`,
      },
      {
        id: "veo_mist_reveal",
        label: "✨ Ethereal Mist Reveal",
        icon: "Wind",
        badge: "Atmospheric",
        description: "Slow camera push as gentle mist parts to reveal product",
        template: (name) =>
          `Slow continuous camera push-in through gentle translucent spa mist that gracefully parts to reveal ${name} illuminated by soft warm rim lighting`,
      },
      {
        id: "veo_pedestal_spin",
        label: "🔄 Floating Pedestal Turn",
        icon: "RotateCw",
        badge: "360 Spin",
        description: "Illuminated glass pedestal rotating smoothly",
        template: (name) =>
          `Smooth continuous 360-degree rotation of ${name} on an illuminated acrylic pedestal with shifting pastel prismatic caustics and reflections`,
      },
    ],
  },

  apparel_wearable: {
    id: "apparel_wearable",
    label: "👟 Fashion & Footwear",
    icon: "ShoppingBag",
    badge: "Haute Couture",
    photoPresets: [
      {
        id: "urban_streetwear_concrete",
        label: "🏙️ Urban Streetwear Concrete",
        icon: "Building",
        badge: "Streetwear",
        description: "Wet city street corner with golden hour reflections",
        template: (name) =>
          `Editorial streetwear lookbook photography of ${name} staged on damp urban concrete at golden hour, sharp architecture in the blurred background, vibrant street lighting reflections, Hypebeast editorial aesthetic, 8k photorealistic`,
      },
      {
        id: "high_fashion_runway",
        label: "👠 Haute Couture Runway",
        icon: "Star",
        badge: "Runway",
        description: "Black mirror runway with dramatic overhead spotlights",
        template: (name) =>
          `Haute couture fashion editorial showcase of ${name} on a gleaming black mirror runway floor, dramatic vertical overhead spotlights, crisp shadow contrasts, high fashion magazine spread`,
      },
      {
        id: "warm_linen_wood",
        label: "🛋️ Warm Neutral Linen & Wood",
        icon: "Home",
        badge: "Boutique",
        description: "High-end boutique interior with draped natural linen",
        template: (name) =>
          `Warm Scandinavian boutique display featuring ${name} elegantly draped on a natural raw travertine block with textured oatmeal linen, soft neutral daylight, architectural minimalist lookbook`,
      },
      {
        id: "royal_velvet_plinth",
        label: "🌟 Royal Velvet Spotlight",
        icon: "Sparkles",
        badge: "Luxury Jewelry",
        description: "Midnight navy velvet pedestal with golden spotlight",
        template: (name) =>
          `Luxury showcase of ${name} resting on midnight royal navy velvet, focused golden spotlight creating rich specular highlights on hardware and stitching, high-end jeweler catalog`,
      },
    ],
    videoPresets: [
      {
        id: "veo_runway_dolly",
        label: "🔭 Runway Dolly Push",
        icon: "Video",
        badge: "Runway Tracking",
        description: "Low-angle dolly push along reflective runway floor",
        template: (name) =>
          `Low-angle cinematic dolly tracking smoothly forward toward ${name} on a dark reflective runway, dramatic overhead rim lighting sweeping along textures, 8k commercial video`,
      },
      {
        id: "veo_street_orbit",
        label: "🌐 3D Streetwear Arc",
        icon: "RotateCw",
        badge: "Urban Arc",
        description: "Fast-to-slow speed ramp arc orbit around the product",
        template: (name) =>
          `Dynamic 3D arc camera move around ${name} on an urban architectural plinth, dynamic city bokeh lights shifting smoothly in the background, cinematic commercial grade`,
      },
      {
        id: "veo_macro_stitching",
        label: "🔍 Macro Fabric & Stitching Glide",
        icon: "Search",
        badge: "Tactile Detail",
        description: "Extreme close-up glide across seams and premium materials",
        template: (name) =>
          `Slow macro camera sweep gliding across the intricate stitching, premium materials, and tactile textures of ${name}, rich bokeh and authentic material sheen`,
      },
      {
        id: "veo_floating_lookbook",
        label: "✨ Weightless Lookbook Float",
        icon: "Sparkles",
        badge: "Weightless",
        description: "Floating showcase with flowing fabric motion in background",
        template: (name) =>
          `Cinematic weightless showcase of ${name} floating in a sunlit architectural studio with softly flowing sheer silk curtains in the background, elegant commercial pacing`,
      },
    ],
  },

  food_beverage: {
    id: "food_beverage",
    label: "☕ Food, Beverage & Gourmet",
    icon: "Coffee",
    badge: "Sensory Taste",
    photoPresets: [
      {
        id: "artisanal_rustic_kitchen",
        label: "☕ Artisanal Rustic Kitchen",
        icon: "Coffee",
        badge: "Gourmet Table",
        description: "Warm reclaimed wooden table dusted with ingredients & sunshine",
        template: (name) =>
          `Sensory gourmet food photography of ${name} on a rustic reclaimed farmhouse wooden table dusted with raw fresh ingredients, morning sunlight streaming through French paned windows, Bon Appétit magazine cover quality`,
      },
      {
        id: "moody_speakeasy_bar",
        label: "🍷 Moody Speakeasy Bar",
        icon: "Wine",
        badge: "Cocktail Lounge",
        description: "Dark polished mahogany counter with amber candlelight",
        template: (name) =>
          `Moody vintage speakeasy cocktail lounge featuring ${name} on a polished dark mahogany counter, warm flickering candlelight, crystal glassware with amber reflections, cinematic atmosphere`,
      },
      {
        id: "citrus_splash_freeze",
        label: "🍋 Dynamic Splash & Citrus",
        icon: "Droplets",
        badge: "High-Speed",
        description: "High-speed shutter freeze with water splash & fresh citrus",
        template: (name) =>
          `High-speed commercial freeze-motion photograph of ${name} with crisp dynamic water droplets splashing upward, sliced vibrant fresh citrus and mint leaves, crystal-clear commercial look`,
      },
      {
        id: "parisian_cafe_terrace",
        label: "🥐 Parisian Café Terrace",
        icon: "Sun",
        badge: "Lifestyle Café",
        description: "Round marble bistro table with morning coffee & croissants",
        template: (name) =>
          `Sunny morning lifestyle scene at a Parisian sidewalk café with small round white marble bistro table, fresh croissant, and ${name} in warm natural sunlight, charming editorial ambiance`,
      },
    ],
    videoPresets: [
      {
        id: "veo_steam_splash",
        label: "☕ Rising Steam & Pour Glide",
        icon: "Flame",
        badge: "Sensory Motion",
        description: "Close-up tracking shot with authentic rising steam",
        template: (name) =>
          `Sensory close-up cinematic tracking shot of ${name} on a warm rustic table, delicate aromatic steam gently rising into soft morning sunbeams, rich appetite appeal`,
      },
      {
        id: "veo_cocktail_dolly",
        label: "🍷 Speakeasy Counter Dolly",
        icon: "Video",
        badge: "Moody Push",
        description: "Smooth dolly glide across illuminated mahogany counter",
        template: (name) =>
          `Smooth dolly glide across a dark polished bar counter toward ${name}, warm amber candlelight flickering with shifting crystal glass caustics, cinematic cocktail commercial`,
      },
      {
        id: "veo_splash_orbit",
        label: "🍋 High-Speed Dynamic Orbit",
        icon: "RotateCw",
        badge: "360 Freeze",
        description: "Slow-motion orbit around frozen splash and droplets",
        template: (name) =>
          `Slow-motion 3D orbital camera move sweeping around ${name} with glistening suspended water droplets and fresh botanical garnishes, high-energy beverage commercial`,
      },
      {
        id: "veo_table_reveal",
        label: "🥐 Café Tabletop Crane",
        icon: "ArrowDown",
        badge: "Morning Reveal",
        description: "Gently descending crane revealing sunny morning spread",
        template: (name) =>
          `Gentle descending crane shot moving down to a sunny café marble tabletop, revealing ${name} framed by natural morning sunlight and cozy breakfast aesthetic`,
      },
    ],
  },

  bulky_furniture: {
    id: "bulky_furniture",
    label: "🛋️ Furniture & Home Living",
    icon: "Armchair",
    badge: "Living Spaces",
    photoPresets: [
      {
        id: "architectural_sunroom",
        label: "🌿 Architectural Sunroom Loft",
        icon: "Sun",
        badge: "Double-Height",
        description: "Double-height glass atrium filled with fiddle-leaf figs",
        template: (name) =>
          `Double-height architectural glass sunroom atrium showcasing ${name}, polished micro-cement floors, lush potted fiddle-leaf fig trees, warm natural daylight pouring in from above, Elle Decor magazine spread`,
      },
      {
        id: "cozy_scandinavian_hygge",
        label: "☕ Scandinavian Hygge Corner",
        icon: "Coffee",
        badge: "Warm Hygge",
        description: "Textured bouclé throws, soft wool rug, and afternoon light",
        template: (name) =>
          `Warm and inviting Scandinavian living room corner featuring ${name}, textured cream bouclé throws, soft plush wool rug, golden afternoon sunbeams, cozy hygge ambiance, photorealistic`,
      },
      {
        id: "brutalist_concrete_loft",
        label: "📐 Minimalist Concrete Loft",
        icon: "Building",
        badge: "Brutalist",
        description: "Industrial loft with gallery track lighting & raw concrete",
        template: (name) =>
          `Minimalist industrial loft showcasing ${name} against raw board-formed concrete walls, museum-grade directional gallery spotlights, expansive open floor plan, architectural masterpiece`,
      },
      {
        id: "twilight_terrace_view",
        label: "🌆 Twilight Horizon Penthouse",
        icon: "Moon",
        badge: "Luxury Living",
        description: "Living room at dusk with architectural cove lights",
        template: (name) =>
          `High-end luxury residence living room at dusk with panoramic glass wall, glowing architectural cove lighting warmly accenting ${name}, ambient twilight city lights outside`,
      },
    ],
    videoPresets: [
      {
        id: "veo_sunroom_flyover",
        label: "🚁 Sunroom Interior Glide",
        icon: "Compass",
        badge: "Airy Glide",
        description: "Smooth interior floating camera glide through the living room",
        template: (name) =>
          `Smooth interior floating camera glide soaring smoothly through an open-concept luxury residence, sweeping across ${name}, pure unobstructed camera POV, no physical drones, no quadcopters, no camera equipment visible in frame, natural daylight illuminating textures, 8k commercial quality`,
      },
      {
        id: "veo_furniture_dolly",
        label: "🔭 Slow Parallax Push-In",
        icon: "Video",
        badge: "Deep Parallax",
        description: "Slow 3D dolly push highlighting proportions & comfort",
        template: (name) =>
          `Slow cinematic 3D dolly push-in tracking toward ${name} in a designer interior, rich foreground-to-background parallax, shifting soft natural light reflections, 4k 60fps`,
      },
      {
        id: "veo_furniture_orbit",
        label: "🌐 360° Architectural Orbit",
        icon: "RotateCw",
        badge: "Full Rotation",
        description: "Subtle wide arc camera circling the entire furniture piece",
        template: (name) =>
          `Cinematic wide orbital camera move circling gracefully around ${name} inside a serene minimalist home, soft warm window light reflections, commercial broadcast standard`,
      },
      {
        id: "veo_crane_down_loft",
        label: "🏗️ High-Angle Crane Descend",
        icon: "ArrowDown",
        badge: "Showcase Boom",
        description: "Robotic boom shot descending from ceiling to eye level",
        template: (name) =>
          `Robotic studio camera crane shot smoothly booming downward from high ceiling level down to seating perspective, revealing ${name} in pristine showroom lighting`,
      },
    ],
  },

  sports_fitness: {
    id: "sports_fitness",
    label: "🏋️ Sports & Fitness",
    icon: "Activity",
    badge: "Athletic Performance",
    photoPresets: [
      {
        id: "crossfit_industrial_gym",
        label: "🏋️ Industrial Athletic Gym",
        icon: "Activity",
        badge: "High-Contrast",
        description: "Chalk-dusted rubber floor with high-contrast overhead arena light",
        template: (name) =>
          `Athletic high-contrast commercial photograph of ${name} on chalk-dusted black rubber gym flooring, dramatic overhead arena lighting, raw industrial steel background, Nike training ad aesthetic`,
      },
      {
        id: "mountain_trail_sunrise",
        label: "🌄 Sunrise Mountain Trail",
        icon: "Sun",
        badge: "Alpine Outdoor",
        description: "Misty alpine trail with cresting golden sunrise rays",
        template: (name) =>
          `Outdoor adventure photography of ${name} resting on rugged granite rock along a misty alpine mountain trail at sunrise, warm golden sun rays piercing through pines, Patagonia ad quality`,
      },
      {
        id: "minimalist_yoga_studio",
        label: "🧘 Minimalist Yoga Sanctuary",
        icon: "Heart",
        badge: "Zen Wellness",
        description: "Japanese bamboo slats with soft morning haze & wood floor",
        template: (name) =>
          `Serene minimalist yoga studio with natural blonde wood floors, warm bamboo wall slats, soft morning mist, displaying ${name} in peaceful meditative balance, Alo Yoga commercial aesthetic`,
      },
      {
        id: "running_track_perspective",
        label: "🏃 Olympic Running Track",
        icon: "Compass",
        badge: "Speed & Power",
        description: "Low-angle red athletic track with bright competition daylight",
        template: (name) =>
          `Low-angle dynamic perspective on a vibrant red athletic running track showcasing ${name}, crisp white lane markings receding into shallow bokeh, bright competition sunlight`,
      },
    ],
    videoPresets: [
      {
        id: "veo_gym_orbit",
        label: "🌐 Dynamic Gym Arc Orbit",
        icon: "RotateCw",
        badge: "High Energy",
        description: "Dynamic low-angle orbit with arena lighting flares",
        template: (name) =>
          `Dynamic low-angle 3D camera orbit circling around ${name} in an athletic gym setting, overhead arena spotlights creating dramatic rim flares, energetic sports commercial pacing`,
      },
      {
        id: "veo_trail_dolly",
        label: "🌄 Mountain Trail Push-In",
        icon: "Compass",
        badge: "Adventure Push",
        description: "Smooth tracking shot across rugged alpine terrain",
        template: (name) =>
          `Cinematic tracking shot pushing smoothly forward across rugged mountain granite rocks toward ${name}, golden sunrise sunbeams piercing morning mist, 8k outdoor commercial`,
      },
      {
        id: "veo_yoga_glide",
        label: "🧘 Serene Studio Glide",
        icon: "Heart",
        badge: "Smooth Zen",
        description: "Ultra-smooth floating glide across warm wood studio floor",
        template: (name) =>
          `Ultra-smooth floating camera glide moving gracefully toward ${name} on a sunlit natural wood floor, calming ambient morning daylight, serene luxury wellness aesthetic`,
      },
      {
        id: "veo_speed_push",
        label: "🏃 Fast-to-Slow Speed Ramp",
        icon: "Zap",
        badge: "Speed Ramp",
        description: "High-speed tracking camera ramping into crisp slow motion",
        template: (name) =>
          `High-speed camera push-in along a vibrant athletic track ramping into crisp slow motion directly in front of ${name}, intense athletic focus and commercial polish`,
      },
    ],
  },

  luxury_studio: {
    id: "luxury_studio",
    label: "✨ Minimalist Studio Pedestals",
    icon: "Sparkles",
    badge: "Master Packshot",
    photoPresets: [
      {
        id: "travertine_geometric_arch",
        label: "🏛️ Travertine Arch Pedestals",
        icon: "Layers",
        badge: "Architectural",
        description: "Curved pastel archway with floating geometric travertine plinths",
        template: (name) =>
          `Clean minimalist commercial studio photograph of ${name} staged on floating geometric travertine plinths under a curved architectural archway, soft pastel gradient lighting, 8k packshot`,
      },
      {
        id: "monochromatic_charcoal_luxury",
        label: "🌑 Monochromatic Dark Rim Light",
        icon: "Moon",
        badge: "Dark Luxury",
        description: "Deep charcoal matte background with razor-sharp directional rim",
        template: (name) =>
          `Deep monochromatic charcoal studio background showcasing ${name} illuminated by razor-sharp directional silver rim lighting, carving the silhouette and micro-textures, ultra-luxury aesthetic`,
      },
      {
        id: "iridescent_prismatic_glass",
        label: "💎 Iridescent Prismatic Glow",
        icon: "Sparkles",
        badge: "Prismatic",
        description: "Glass pedestal with subtle rainbow refraction & caustic light",
        template: (name) =>
          `Iridescent frosted glass pedestal displaying ${name}, subtle rainbow prismatic refractions and caustic reflections dancing across the base, clean modern commercial lighting`,
      },
      {
        id: "floating_cloud_softness",
        label: "☁️ Soft Dreamscape Cloud",
        icon: "Cloud",
        badge: "Ethereal",
        description: "Pastel dreamscape with soft diffuse studio light",
        template: (name) =>
          `Ethereal dreamlike pastel studio setting with soft billowing clouds surrounding ${name} on an illuminated floating disc, warm diffuse glow, whimsical high-end advertisement`,
      },
    ],
    videoPresets: [
      {
        id: "veo_studio_360_orbit",
        label: "🌐 360° Studio Pedestal Orbit",
        icon: "RotateCw",
        badge: "Master Orbit",
        description: "Continuous 3D camera circle with shifting softbox reflections",
        template: (name) =>
          `Continuous 360-degree studio camera orbit circling smoothly around ${name} on a designer travertine pedestal, softbox reflections gliding across surfaces, 4k 60fps`,
      },
      {
        id: "veo_studio_crane_boom",
        label: "🏗️ Studio Boom Descend",
        icon: "ArrowDown",
        badge: "Smooth Crane",
        description: "Robotic overhead boom shot descending to eye-level packshot",
        template: (name) =>
          `Robotic studio camera boom smoothly descending from overhead down to direct eye level, revealing ${name} framed by clean architectural geometry and subtle drop shadows`,
      },
      {
        id: "veo_studio_macro_glide",
        label: "🔍 Precision Texture Glide",
        icon: "Search",
        badge: "Texture Zoom",
        description: "Slow macro tracking shot across product bevels & logos",
        template: (name) =>
          `Slow macro camera sweep gliding across the contours, branding, and tactile finishes of ${name}, rich shallow depth-of-field with silky background bokeh`,
      },
      {
        id: "veo_studio_push_reveal",
        label: "🔭 Slow Dramatic Push",
        icon: "Video",
        badge: "Hero Reveal",
        description: "Slow steady push-in with dynamic rim light sweep",
        template: (name) =>
          `Slow steady push-in tracking shot toward ${name} on an illuminated plinth, subtle moving rim light accentuating form and materials, luxury commercial grade`,
      },
    ],
  },
};

export const PRODUCT_MEDIA_CATEGORIES_LIST: ProductCategoryConfig[] = Object.values(PRODUCT_MEDIA_CATEGORIES);

export type ProductMediaCategoryKey =
  | "surface_material"
  | "discrete_object"
  | "sensory_consumable"
  | "apparel_wearable"
  | "food_beverage"
  | "bulky_furniture"
  | "sports_fitness"
  | "luxury_studio";

/**
 * Interpolates productName into a template string or calls a template generator function,
 * optionally appending an environment/lighting modifier suffix.
 */
export function buildInterpolatedPrompt(
  template: string | ((productName: string) => string),
  productName: string,
  lightingSuffix?: string
): string {
  const safeName = productName?.trim() || "this product";
  let prompt =
    typeof template === "function"
      ? template(safeName)
      : template.replace(/\$\{productName\}/g, safeName);

  if (lightingSuffix && lightingSuffix.trim()) {
    const suffix = lightingSuffix.trim();
    if (suffix.startsWith(",") && prompt.endsWith(".")) {
      prompt = `${prompt.slice(0, -1)}${suffix}`;
    } else if (suffix.startsWith(",") || prompt.endsWith(" ")) {
      prompt = `${prompt}${suffix}`;
    } else {
      prompt = `${prompt} ${suffix}`;
    }
  }
  return prompt;
}

/**
 * Automatically determines the best matching category from product attributes or title keywords.
 */
export function detectCategoryFromProduct(
  productSpec?: ProductSpec,
  productName?: string
): string {
  if (productSpec?.typology) {
    if (productSpec.typology === "surface_material") return "surface_material";
    if (productSpec.typology === "discrete_object") return "discrete_object";
    if (productSpec.typology === "apparel_wearable") return "apparel_wearable";
    if (productSpec.typology === "sensory_consumable") return "sensory_consumable";
    if (productSpec.typology === "bulky_furniture") return "bulky_furniture";
  }

  const query = `${productSpec?.title || ""} ${productName || ""} ${productSpec?.description || ""}`.toLowerCase();

  if (
    query.includes("floor") ||
    query.includes("piso") ||
    query.includes("tile") ||
    query.includes("wood") ||
    query.includes("oak") ||
    query.includes("vinyl") ||
    query.includes("porcelan") ||
    query.includes("paint") ||
    query.includes("pintura") ||
    query.includes("wall") ||
    query.includes("revestimiento") ||
    query.includes("empapelado") ||
    query.includes("swatch") ||
    query.includes("ceramic") ||
    query.includes("cerámica") ||
    query.includes("backsplash")
  ) {
    return "surface_material";
  }

  if (
    query.includes("shirt") ||
    query.includes("shoe") ||
    query.includes("sneaker") ||
    query.includes("dress") ||
    query.includes("pants") ||
    query.includes("hoodie") ||
    query.includes("boot") ||
    query.includes("jacket") ||
    query.includes("watch") ||
    query.includes("footwear")
  ) {
    return "apparel_wearable";
  }

  // Sports & Fitness checked before furniture to prevent words like "adjustable" from matching "table"
  if (
    query.includes("gym") ||
    query.includes("fitness") ||
    query.includes("dumbbell") ||
    query.includes("dumbell") ||
    query.includes("kettlebell") ||
    query.includes("barbell") ||
    query.includes("yoga") ||
    query.includes("hike") ||
    query.includes("treadmill") ||
    /\bsport\b/.test(query)
  ) {
    return "sports_fitness";
  }

  if (
    query.includes("serum") ||
    query.includes("cream") ||
    query.includes("cosmetic") ||
    query.includes("skin") ||
    query.includes("perfume") ||
    query.includes("parfum") ||
    query.includes("fragrance") ||
    query.includes("oil") ||
    query.includes("lipstick")
  ) {
    return "sensory_consumable";
  }

  if (
    query.includes("shirt") ||
    query.includes("shoe") ||
    query.includes("sneaker") ||
    query.includes("dress") ||
    query.includes("pants") ||
    query.includes("hoodie") ||
    query.includes("boot") ||
    query.includes("jacket") ||
    query.includes("watch")
  ) {
    return "apparel_wearable";
  }

  if (
    query.includes("coffee") ||
    query.includes("tea") ||
    query.includes("wine") ||
    query.includes("drink") ||
    query.includes("juice") ||
    query.includes("snack") ||
    query.includes("chocolate") ||
    query.includes("food")
  ) {
    return "food_beverage";
  }

  if (
    query.includes("sofa") ||
    query.includes("couch") ||
    query.includes("chair") ||
    query.includes("desk") ||
    /\btable\b/.test(query) ||
    /\bbed\b/.test(query) ||
    query.includes("lamp") ||
    query.includes("furniture")
  ) {
    return "bulky_furniture";
  }

  if (
    query.includes("phone") ||
    query.includes("earbud") ||
    query.includes("headphone") ||
    query.includes("laptop") ||
    query.includes("keyboard") ||
    query.includes("drone") ||
    query.includes("charger") ||
    query.includes("gadget")
  ) {
    return "discrete_object";
  }

  return "luxury_studio";
}

