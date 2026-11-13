import { ProductSpec } from "@/lib/types/ecommerce";

export const SAMPLE_FLOORING: ProductSpec = {
  id: "demo-flooring-oak",
  sourceUrl: "https://luminafloors.example.com/products/scandinavian-white-oak",
  title: 'Scandinavian White Oak Engineered Hardwood (7.5" Plank)',
  vendor: "Lumina Hardwood Co.",
  description:
    "Ultra-matte wire-brushed European White Oak with multi-ply core. 100% waterproof click-lock system designed for active households, pets, and radiant heating.",
  bulletPoints: [
    '7.5" Wide Ultra-Plank with Wire-Brushed Texture',
    "HydroLock™ 72-Hour Standing Water Spill Barrier",
    "AC4 Commercial Wear Rating — 100% Pet Claw Proof",
    "Uniclic® Glue-Less Installation System",
  ],
  price: 4.89,
  compareAtPrice: 7.99,
  currency: "USD",
  inStock: true,
  rating: 4.9,
  reviewCount: 428,
  typology: "surface_material",
  typologySpecifics: {
    surfaceMaterial: {
      coveragePerUnit: "24.5 sq. ft. per box",
      durabilityRating: "AC4 Commercial Grade",
      waterproofGrade: "100% Waterproof (72-hr spill barrier)",
      installationType: "Click-Lock Uniclic®",
      scratchResistant: true,
      finishType: "wirebrushed_oak",
    },
  },
  brand: {
    name: "Lumina Hardwood Co.",
    domain: "luminafloors.example.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#06b6d4",
    secondaryColor: "#f59e0b",
    surfaceColor: "#141416",
    toneOfVoice: "minimalist_luxury",
    taglines: ["Engineered For Modern Living"],
  },
  variants: [
    { id: "var_1", title: "Natural Raw", price: 4.89, available: true },
    { id: "var_2", title: "Smoked Greige", price: 5.19, available: true },
  ],
  assets: [
    {
      id: "ast_floor_1",
      url: "https://images.unsplash.com/photo-1581858726788-75bc0f6a952d?w=1200&auto=format&fit=crop&q=80",
      type: "hero_packshot",
      isPrimary: true,
    },
    {
      id: "ast_floor_2",
      url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80",
      type: "lifestyle_context",
    },
    {
      id: "ast_floor_3",
      url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=1200&auto=format&fit=crop&q=80",
      type: "detail_macro",
    },
  ],
  topReviews: [
    {
      id: "rev_1",
      author: "Marcus K., Verified Homeowner",
      rating: 5,
      title: "Transformed our entire first floor in one weekend!",
      body: "We have two German Shepherds and after 6 months, not a single claw scratch. The matte texture feels unbelievable underfoot.",
      verifiedBuyer: true,
    },
  ],
  scrapedAt: new Date().toISOString(),
};

export const SAMPLE_EARBUDS: ProductSpec = {
  id: "demo-earbuds-pro",
  sourceUrl: "https://soniqaudio.example.com/products/aerobuds-pro-anc",
  title: "AeroBuds Pro Active Noise Cancelling Spatial Wireless Earbuds",
  vendor: "Soniq Audio",
  description:
    "Flagship spatial audio earbuds with 48dB hybrid active noise cancellation, custom beryllium drivers, and 36-hour battery life with Qi fast charging.",
  bulletPoints: [
    "48dB Hybrid Active Noise Cancellation with Transparency Mode",
    "Spatial Audio with Dynamic Head Tracking",
    "11mm Custom Beryllium Diaphragm Drivers",
    "36-Hour Total Battery with Rapid Wireless Qi Charging",
  ],
  price: 79.99,
  compareAtPrice: 129.99,
  currency: "USD",
  inStock: true,
  rating: 4.8,
  reviewCount: 890,
  typology: "discrete_object",
  brand: {
    name: "Soniq Audio",
    domain: "soniqaudio.example.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#3b82f6",
    secondaryColor: "#10b981",
    surfaceColor: "#0b0f19",
    toneOfVoice: "playful_hype",
    taglines: ["Pure Studio Sound Anywhere"],
  },
  variants: [
    { id: "var_black", title: "Matte Black", price: 79.99, available: true },
    { id: "var_white", title: "Glacier White", price: 79.99, available: true },
  ],
  assets: [
    {
      id: "ast_ear_1",
      url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=1200&auto=format&fit=crop&q=80",
      type: "hero_packshot",
      isPrimary: true,
    },
    {
      id: "ast_ear_2",
      url: "https://images.unsplash.com/photo-1572536147248-ac59a8abfa4b?w=1200&auto=format&fit=crop&q=80",
      type: "lifestyle_context",
    },
  ],
  topReviews: [
    {
      id: "rev_ear_1",
      author: "Jessica T.",
      rating: 5,
      title: "ANC rivals $300 headphones",
      body: "I take the subway daily in NYC and these completely silence the train screeches. Spatial sound makes movies feel like IMAX.",
      verifiedBuyer: true,
    },
  ],
  scrapedAt: new Date().toISOString(),
};

export const SAMPLE_PRODUCTS: ProductSpec[] = [SAMPLE_FLOORING, SAMPLE_EARBUDS];
