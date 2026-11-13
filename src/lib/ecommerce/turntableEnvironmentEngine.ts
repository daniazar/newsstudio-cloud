/**
 * src/lib/ecommerce/turntableEnvironmentEngine.ts
 *
 * Contextual Environment & Semantic Background Engine for Neural Product Turntable Studio.
 * Houses 24+ curated commercial packshot & lifestyle backdrops across 9 realms,
 * with intelligent automatic product matching (suitcases -> rooftop, sneakers -> waterfall, etc.).
 */

import { ProductSpec } from "@/lib/types/ecommerce";

export type TurntableEnvironmentRealm =
  | "urban_travel"
  | "outdoor_adventure"
  | "culinary_gourmet"
  | "architecture_interior"
  | "luxury_nightlife"
  | "wellness_spa"
  | "fashion_runway"
  | "workshop_auto"
  | "tech_gaming";

export interface TurntableEnvironmentPreset {
  id: string;
  name: string;
  realm: TurntableEnvironmentRealm;
  icon: string;
  tagline: string;
  promptDescription: string;
  idealKeywords: string[];
  recommendedPedestal?: string;
  recommendedLighting?: string;
}

export interface TurntableRealmMetadata {
  id: TurntableEnvironmentRealm;
  label: string;
  icon: string;
}

export const TURNTABLE_REALMS: TurntableRealmMetadata[] = [
  { id: "urban_travel", label: "Urban & Travel", icon: "Building" },
  { id: "outdoor_adventure", label: "Outdoor & Adventure", icon: "Compass" },
  { id: "culinary_gourmet", label: "Culinary & Café", icon: "Coffee" },
  { id: "architecture_interior", label: "Architecture & Home", icon: "Home" },
  { id: "luxury_nightlife", label: "Luxury & Evening", icon: "Sparkles" },
  { id: "wellness_spa", label: "Spa & Wellness", icon: "Leaf" },
  { id: "fashion_runway", label: "Fashion & Runway", icon: "Shirt" },
  { id: "workshop_auto", label: "Workshop & Auto", icon: "Wrench" },
  { id: "tech_gaming", label: "Tech & Studio", icon: "Cpu" },
];

export const TURNTABLE_ENVIRONMENT_PRESETS: TurntableEnvironmentPreset[] = [
  // --- 1. Urban & Travel ---
  {
    id: "rooftop_skyline",
    name: "Rooftop City Skyline",
    realm: "urban_travel",
    icon: "Building2",
    tagline: "Golden hour skyscraper terrace overlooking downtown",
    promptDescription:
      "Modern high-rise skyscraper rooftop terrace at golden hour, polished architectural limestone floor with subtle sky reflections, sleek glass balustrade overlooking a breathtaking panoramic downtown metropolis skyline with glowing sunset light rays and distant city architectural silhouettes",
    idealKeywords: ["suitcase", "luggage", "travel", "carry-on", "duffel", "bag", "backpack", "briefcase", "passport"],
    recommendedPedestal: "obsidian_black",
    recommendedLighting: "luxury_gold",
  },
  {
    id: "airport_vip_lounge",
    name: "Airport VIP Lounge",
    realm: "urban_travel",
    icon: "Plane",
    tagline: "Ultra-luxury executive transit suite with runway glass",
    promptDescription:
      "Exclusive first-class airport VIP lounge with floor-to-ceiling panoramic glass windows overlooking a sunlit modern tarmac, polished dark granite floors, brushed bronze architectural columns, and soft ambient designer illumination",
    idealKeywords: ["tumi", "rimowa", "commute", "traveler", "cabin", "flight"],
    recommendedPedestal: "brushed_titanium",
    recommendedLighting: "tech_cyan",
  },
  {
    id: "downtown_avenue",
    name: "Metropolitan Avenue",
    realm: "urban_travel",
    icon: "MapPin",
    tagline: "Reflective sidewalk with high-end boutique storefronts",
    promptDescription:
      "Chic metropolitan shopping boulevard at twilight, glossy rain-dappled sidewalk reflecting golden shopfront window displays and blurred city bokeh, elegant architectural stone facade",
    idealKeywords: ["urban", "city", "wallet", "crossbody", "tote"],
    recommendedPedestal: "obsidian_black",
    recommendedLighting: "luxury_gold",
  },

  // --- 2. Outdoor & Adventure ---
  {
    id: "waterfall_nature_road",
    name: "Waterfall Mountain Road",
    realm: "outdoor_adventure",
    icon: "CloudRain",
    tagline: "Curving alpine road beside a mist-shrouded waterfall",
    promptDescription:
      "Cinematic winding asphalt mountain road beside a cascading natural waterfall, lush towering evergreen pine trees, subtle atmospheric morning mist drifting across damp reflective asphalt, dramatic diffused daylight with crisp specular clarity",
    idealKeywords: ["sneaker", "sneakers", "running", "trail", "hiking", "boots", "jogging", "shoes", "athletic", "marathon"],
    recommendedPedestal: "obsidian_black",
    recommendedLighting: "tech_cyan",
  },
  {
    id: "alpine_ridge_summit",
    name: "Alpine Ridge Summit",
    realm: "outdoor_adventure",
    icon: "Mountain",
    tagline: "Rugged rocky ridge overlooking snowcapped mountain peaks",
    promptDescription:
      "Rocky alpine mountain summit ridge at golden hour, weathered granite boulder outcrop, vast panoramic vista of sunlit snow-capped peaks and deep valley below, warm alpine glow catching textures with pristine outdoor clarity",
    idealKeywords: ["camping", "tent", "sleeping bag", "climbing", "gore-tex", "waterproof", "thermal", "parka"],
    recommendedPedestal: "warm_wood",
    recommendedLighting: "luxury_gold",
  },
  {
    id: "desert_dunes_sunset",
    name: "Desert Dune Sunset",
    realm: "outdoor_adventure",
    icon: "SunMedium",
    tagline: "Golden sand ripple dunes with sweeping sunset shadows",
    promptDescription:
      "Sculpted windswept desert sand dunes at sunset, warm ochre and terracotta sand ripples, long dramatic low-angle shadows, soft warm crimson horizon with pure cinematic atmosphere",
    idealKeywords: ["sand", "sunglasses", "safari", "linen", "desert", "dune"],
    recommendedPedestal: "warm_wood",
    recommendedLighting: "luxury_gold",
  },
  {
    id: "coastal_cliff_ocean",
    name: "Coastal Ocean Cliff",
    realm: "outdoor_adventure",
    icon: "Waves",
    tagline: "Sunlit limestone cliff terrace overlooking deep blue ocean",
    promptDescription:
      "Pristine Mediterranean coastal cliff terrace overlooking deep azure ocean waves, sea spray mist catchlight, warm sunlight gleaming off natural whitewashed stone",
    idealKeywords: ["surf", "dive", "waterproof watch", "swimwear", "ocean", "beach"],
    recommendedPedestal: "pure_white",
    recommendedLighting: "high_key_white",
  },

  // --- 3. Culinary & Café ---
  {
    id: "artisanal_espresso_bar",
    name: "Artisanal Espresso Bar",
    realm: "culinary_gourmet",
    icon: "Coffee",
    tagline: "Rustic dark-wood barista bar with warm brass pendants",
    promptDescription:
      "Warm artisanal specialty coffee roastery counter, dark reclaimed walnut wood counter, matte black ceramic cups, roasted arabica coffee beans artfully scattered in soft focus, warm overhead brass pendant downlights casting gentle golden pools",
    idealKeywords: ["coffee", "espresso", "beans", "grinder", "barista", "latte", "roast", "brewing", "french press", "pour over"],
    recommendedPedestal: "warm_wood",
    recommendedLighting: "luxury_gold",
  },
  {
    id: "vaulted_wine_cellar",
    name: "Vaulted Wine Cellar",
    realm: "culinary_gourmet",
    icon: "Wine",
    tagline: "Ancient brick arches, oak casks & crystal reflections",
    promptDescription:
      "Historic subterranean limestone wine cellar with vaulted brick arches, stacked French oak aging barrels in background, dim warm candlelight sconces creating rich amber and ruby reflections through glassware, intimate sommelier atmosphere",
    idealKeywords: ["wine", "whiskey", "bourbon", "spirits", "liquor", "champagne", "tequila", "rum", "bottle", "decanter"],
    recommendedPedestal: "obsidian_black",
    recommendedLighting: "luxury_gold",
  },
  {
    id: "michelin_open_kitchen",
    name: "Michelin Open Kitchen",
    realm: "culinary_gourmet",
    icon: "UtensilsCrossed",
    tagline: "Brushed stainless steel line with slate background",
    promptDescription:
      "High-end fine dining restaurant open kitchen pass, brushed commercial stainless steel counter, textured dark charcoal slate backsplash, focused directional chef task spotlights with pristine specular reflections and zero clutter",
    idealKeywords: ["knife", "knives", "chef", "cookware", "pan", "skillet", "cast iron", "cleaver", "kitchenware", "cutlery"],
    recommendedPedestal: "brushed_titanium",
    recommendedLighting: "tech_cyan",
  },
  {
    id: "quartz_kitchen_island",
    name: "Modern Quartz Kitchen",
    realm: "culinary_gourmet",
    icon: "Flame",
    tagline: "Waterfall white quartz island with sunlit breakfast nook",
    promptDescription:
      "Bright contemporary open-concept luxury kitchen, waterfall white Calacatta quartz island, matte black designer fixtures, sunlit breakfast nook in soft focus with fresh organic ingredients, bright airy natural morning lighting",
    idealKeywords: ["blender", "air fryer", "toaster", "kettle", "mixer", "juicer", "appliance", "food processor"],
    recommendedPedestal: "pure_white",
    recommendedLighting: "high_key_white",
  },

  // --- 4. Architecture & Home ---
  {
    id: "sunlit_modern_villa",
    name: "Sunlit Architectural Villa",
    realm: "architecture_interior",
    icon: "Home",
    tagline: "Mid-century architectural villa with floor-to-ceiling glass",
    promptDescription:
      "Expansive sunlit mid-century modern architectural villa with seamless floor-to-ceiling glass walls, warm natural cedar ceiling panels, polished architectural concrete surfaces, natural morning sunlight raking across textures with rich architectural depth",
    idealKeywords: ["flooring", "hardwood", "oak", "vinyl", "lvp", "tile", "tiles", "porcelain", "porcelanato", "marble", "piso", "revestimiento"],
    recommendedPedestal: "warm_wood",
    recommendedLighting: "luxury_gold",
  },
  {
    id: "scandinavian_loft",
    name: "Scandinavian Living Loft",
    realm: "architecture_interior",
    icon: "Armchair",
    tagline: "Double-height living loft with Crittall steel windows",
    promptDescription:
      "Double-height Scandinavian loft apartment with black Crittall industrial steel-framed windows, exposed white brick wall, wide-plank pale blonde oak floor, serene ambient daylight washing across plush modern furnishings in soft background focus",
    idealKeywords: ["sofa", "couch", "armchair", "chair", "table", "credenza", "furniture", "desk", "rug", "lamp"],
    recommendedPedestal: "warm_wood",
    recommendedLighting: "high_key_white",
  },
  {
    id: "boutique_hotel_suite",
    name: "Boutique Hotel Bedroom",
    realm: "architecture_interior",
    icon: "Bed",
    tagline: "Plush linen bedding with soft dawn light through sheer drapes",
    promptDescription:
      "Peaceful high-end boutique hotel suite bedroom, layered textured ivory linen bedding, sheer curtains gently swaying in soft morning breeze, warm bedside travertine reading lamp, tranquil dawn atmosphere",
    idealKeywords: ["mattress", "pillow", "bedding", "sheets", "duvet", "comforter", "blanket", "sleep", "linen"],
    recommendedPedestal: "pure_white",
    recommendedLighting: "luxury_gold",
  },
  {
    id: "wabi_sabi_niche",
    name: "Wabi-Sabi Plaster Niche",
    realm: "architecture_interior",
    icon: "Box",
    tagline: "Textured lime-washed alcove with gentle organic shadow play",
    promptDescription:
      "Minimalist Japanese wabi-sabi architectural alcove, textured hand-applied warm ivory lime-wash plaster walls, soft organic directional spotlighting casting gentle natural shadows, curated dry botanical branch in soft focus",
    idealKeywords: ["vase", "ceramic", "pottery", "decor", "sculpture", "bowl", "diffuser"],
    recommendedPedestal: "pure_white",
    recommendedLighting: "luxury_gold",
  },

  // --- 5. Luxury & Evening ---
  {
    id: "obsidian_vip_lounge",
    name: "Obsidian VIP Lounge",
    realm: "luxury_nightlife",
    icon: "Sparkles",
    tagline: "Dark marble plinth with candlelight and penthouse city bokeh",
    promptDescription:
      "Ultra-exclusive private VIP penthouse lounge at midnight, polished black obsidian marble surface with subtle mirror reflections, warm amber candlelight glow, soft moody bokeh of glowing city skyscraper lights through tinted architectural glass",
    idealKeywords: ["perfume", "fragrance", "cologne", "watch", "watches", "chronograph", "luxury", "gold", "rolex", "elixir"],
    recommendedPedestal: "obsidian_black",
    recommendedLighting: "luxury_gold",
  },
  {
    id: "black_velvet_crystal",
    name: "Black Velvet & Crystal",
    realm: "luxury_nightlife",
    icon: "Gem",
    tagline: "Deep obsidian pool with caustic prism rainbow fire glints",
    promptDescription:
      "Luxury high-jewelry dark studio setting, deep mirror-finish obsidian water pool with microscopic concentric ripples, precision pin-point caustic spotlights casting brilliant spectral rainbow fire and sharp facets glints",
    idealKeywords: ["jewelry", "ring", "diamond", "necklace", "earrings", "bracelet", "gemstone", "sapphire", "emerald", "platinum"],
    recommendedPedestal: "obsidian_black",
    recommendedLighting: "tech_cyan",
  },
  {
    id: "fireside_hearth",
    name: "Cozy Nordic Hearth",
    realm: "luxury_nightlife",
    icon: "Flame",
    tagline: "Crackling stone fireplace with stacked birch logs & amber glow",
    promptDescription:
      "Cozy luxury chalet fireside hearth, natural dry-stacked fieldstone fireplace with gentle warm crackling flames in background, dark slate hearth floor, stacked white birch logs, warm intimate amber illumination",
    idealKeywords: ["candle", "candles", "scented", "hearth", "fireplace", "diffuser", "incense", "cozy"],
    recommendedPedestal: "obsidian_black",
    recommendedLighting: "luxury_gold",
  },

  // --- 6. Spa & Wellness ---
  {
    id: "botanical_spa",
    name: "Serene Botanical Spa",
    realm: "wellness_spa",
    icon: "Leaf",
    tagline: "Limestone plinth with tranquil water ripples and monstera leaf",
    promptDescription:
      "Tranquil Japanese onsen wellness spa, wet carved limestone plinth surrounded by calm crystal-clear shallow water with delicate ripples, fresh tropical monstera and bamboo foliage, soft diffused morning daylight with dewy freshness",
    idealKeywords: ["serum", "skincare", "cream", "moisturizer", "cleanser", "hyaluronic", "retinol", "lotion", "glow", "cosmetic", "toner"],
    recommendedPedestal: "obsidian_black",
    recommendedLighting: "luxury_gold",
  },
  {
    id: "bright_wellness_kitchen",
    name: "Bright Wellness Kitchen",
    realm: "wellness_spa",
    icon: "HeartPulse",
    tagline: "Sunlit marble counter with fresh citrus and pure daylight",
    promptDescription:
      "Sun-drenched wellness kitchen counter, pristine white Carrara marble slab, fresh sliced citrus and green botanical herbs in soft background, energizing bright natural daylight with clean commercial transparency",
    idealKeywords: ["protein", "powder", "supplement", "vitamins", "gummies", "collagen", "nutrition", "superfood", "matcha"],
    recommendedPedestal: "pure_white",
    recommendedLighting: "high_key_white",
  },
  {
    id: "boutique_fitness_studio",
    name: "Boutique Fitness Studio",
    realm: "wellness_spa",
    icon: "Dumbbell",
    tagline: "Polished concrete floor with warm accent studio rim lights",
    promptDescription:
      "Upscale boutique fitness training studio, polished sealed concrete floor, dark charcoal acoustic walls, warm architectural linear rim lights highlighting athletic contours and premium rubberized finishes",
    idealKeywords: ["dumbbell", "kettlebell", "mat", "yoga", "fitness", "workout", "gym", "band", "roller", "weights"],
    recommendedPedestal: "brushed_titanium",
    recommendedLighting: "tech_cyan",
  },

  // --- 7. Fashion & Runway ---
  {
    id: "parisian_atelier",
    name: "Parisian Fashion Atelier",
    realm: "fashion_runway",
    icon: "Shirt",
    tagline: "Haussmannian salon with herringbone parquet and arched windows",
    promptDescription:
      "Historic Parisian fashion designer atelier, classic golden oak herringbone parquet floors, grand 4-meter arched windows with white sheer drapery, antique gilded full-length mirror reflecting soft natural couture daylight",
    idealKeywords: ["blazer", "jacket", "dress", "suit", "coat", "tuxedo", "couture", "apparel", "corset", "shirt", "trousers"],
    recommendedPedestal: "warm_wood",
    recommendedLighting: "luxury_gold",
  },
  {
    id: "mediterranean_pool_deck",
    name: "Mediterranean Pool Deck",
    realm: "fashion_runway",
    icon: "Sun",
    tagline: "Sun-bleached limestone terrace over turquoise sea with crisp shadows",
    promptDescription:
      "Sun-bleached Italian Riviera limestone terrace overlooking shimmering turquoise sea, vibrant bright summer sunlight casting sharp graphic architectural shadows, chic striped resort lounger in background",
    idealKeywords: ["sunglasses", "shades", "swimwear", "bikini", "hat", "resort", "sandals", "eyewear"],
    recommendedPedestal: "pure_white",
    recommendedLighting: "high_key_white",
  },

  // --- 8. Workshop & Auto ---
  {
    id: "glossy_garage_bay",
    name: "Glossy Detailer Garage",
    realm: "workshop_auto",
    icon: "Car",
    tagline: "Polished epoxy floor with overhead hexagonal LED grid lights",
    promptDescription:
      "State-of-the-art luxury automotive detailing bay, mirror-finish grey epoxy floor, overhead hexagonal LED grid lighting array casting brilliant crisp specular line reflections, pristine industrial showroom aesthetic",
    idealKeywords: ["car", "auto", "detailing", "wax", "ceramic coating", "tire", "motor", "wash", "polish", "automotive"],
    recommendedPedestal: "brushed_titanium",
    recommendedLighting: "tech_cyan",
  },
  {
    id: "architectural_woodshop",
    name: "Architectural Woodshop",
    realm: "workshop_auto",
    icon: "Wrench",
    tagline: "Heavy timber workbench with cedar shavings & craft tools",
    promptDescription:
      "Modern master craftsman woodworking workshop, thick solid butcher-block maple timber workbench with clean fragrant cedar curls, organized pegboard with precision Japanese hand saws, soft natural clerestory window light",
    idealKeywords: ["paint", "stain", "primer", "finish", "sealer", "drill", "tools", "hardware", "tool", "brush", "woodwork"],
    recommendedPedestal: "warm_wood",
    recommendedLighting: "luxury_gold",
  },

  // --- 9. Tech & Studio ---
  {
    id: "cyberpunk_rgb_battlestation",
    name: "Cyberpunk RGB Setup",
    realm: "tech_gaming",
    icon: "Gamepad2",
    tagline: "Dark gamer sanctuary with customized reactive cyan/magenta RGB",
    promptDescription:
      "Dark futuristic gaming studio desk, matte textured carbon fiber surface, atmospheric acoustic wall panels with glowing cyan and electric magenta ambient edge backlighting, high-tech esports champion setup",
    idealKeywords: ["gaming", "headset", "mouse", "keyboard", "controller", "pc", "rgb", "gamer", "esports", "gpu"],
    recommendedPedestal: "obsidian_black",
    recommendedLighting: "tech_cyan",
  },
  {
    id: "minimalist_tech_studio",
    name: "Minimalist Tech Studio",
    realm: "tech_gaming",
    icon: "Cpu",
    tagline: "Brushed aluminum pedestal with cool cyan rim glow",
    promptDescription:
      "Clean industrial design laboratory, seamless matte dark grey stage, precision brushed anodized aluminum surface with razor-sharp geometric shadows, cool cyan edge rim lighting highlighting metallic chamfers",
    idealKeywords: ["earbuds", "phone", "smartphone", "charger", "power bank", "tablet", "speaker", "gadget", "tech", "laptop"],
    recommendedPedestal: "brushed_titanium",
    recommendedLighting: "tech_cyan",
  },
  {
    id: "pure_white_cyc",
    name: "Pure High-Key White Cyc",
    realm: "tech_gaming",
    icon: "Square",
    tagline: "Shadowless neutral white commercial catalog cyclorama",
    promptDescription:
      "Endless seamless high-key pure white commercial infinity cyclorama, soft balanced 5600K daylight key and fill illumination, subtle natural contact ground shadow directly beneath product, pristine 100% clean catalog packshot studio",
    idealKeywords: ["catalog", "white", "amazon", "shopify", "packshot", "pdp", "clean", "isolated"],
    recommendedPedestal: "pure_white",
    recommendedLighting: "high_key_white",
  },
];

/**
 * Intelligent semantic classifier that evaluates product attributes, typology,
 * title, and description keywords to return the single highest-converting environment preset.
 */
export function resolveContextualEnvironment(
  productSpec?: ProductSpec,
  productName?: string
): TurntableEnvironmentPreset {
  const combinedText = [
    productName || "",
    productSpec?.title || "",
    productSpec?.category || "",
    productSpec?.typology || "",
    productSpec?.description || "",
    ...(productSpec?.bulletPoints || []),
    ...(productSpec?.tags || []),
  ]
    .join(" ")
    .toLowerCase();

  let bestMatch: TurntableEnvironmentPreset | null = null;
  let highestScore = -1;

  for (const preset of TURNTABLE_ENVIRONMENT_PRESETS) {
    let score = 0;
    for (const keyword of preset.idealKeywords) {
      const kw = keyword.toLowerCase();
      if (kw.length >= 3 && combinedText.includes(kw)) {
        // Strong keyword match bonus
        score += kw.length > 5 ? 3 : 2;
        // Exact word match bonus
        const regex = new RegExp(`\\b${kw}\\b`, "i");
        if (regex.test(combinedText)) {
          score += 2;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = preset;
    }
  }

  // Fallback routing by high-level typology if score is 0
  if (!bestMatch || highestScore <= 0) {
    const typology = productSpec?.typology;
    switch (typology) {
      case "surface_material":
        return getEnvironmentById("sunlit_modern_villa") || TURNTABLE_ENVIRONMENT_PRESETS[0];
      case "apparel_wearable":
        return getEnvironmentById("parisian_atelier") || TURNTABLE_ENVIRONMENT_PRESETS[0];
      case "sensory_consumable":
        return getEnvironmentById("botanical_spa") || TURNTABLE_ENVIRONMENT_PRESETS[0];
      case "bulky_furniture":
        return getEnvironmentById("scandinavian_loft") || TURNTABLE_ENVIRONMENT_PRESETS[0];
      case "discrete_object":
        return getEnvironmentById("obsidian_vip_lounge") || TURNTABLE_ENVIRONMENT_PRESETS[0];
      default:
        return getEnvironmentById("obsidian_vip_lounge") || TURNTABLE_ENVIRONMENT_PRESETS[0];
    }
  }

  return bestMatch;
}

export function getAllEnvironments(): TurntableEnvironmentPreset[] {
  return TURNTABLE_ENVIRONMENT_PRESETS;
}

export function getEnvironmentsByRealm(realm: TurntableEnvironmentRealm): TurntableEnvironmentPreset[] {
  return TURNTABLE_ENVIRONMENT_PRESETS.filter((p) => p.realm === realm);
}

export function getEnvironmentById(id?: string): TurntableEnvironmentPreset | undefined {
  if (!id) return undefined;
  return TURNTABLE_ENVIRONMENT_PRESETS.find((p) => p.id === id);
}

// Aliases for compatibility
export const TURNTABLE_ENVIRONMENT_TEMPLATES = TURNTABLE_ENVIRONMENT_PRESETS;
export const getTurntableEnvironmentById = getEnvironmentById;
