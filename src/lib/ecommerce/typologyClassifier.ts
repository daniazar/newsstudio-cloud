/**
 * src/lib/ecommerce/typologyClassifier.ts
 *
 * Product & Service Typology Detection Engine.
 * Automatically analyzes product titles, categories, bullet points, and descriptions
 * to categorize items into one of the 7 Universal Typologies:
 * 1. surface_material   (Flooring, Paint, Tiles, Wallpaper)
 * 2. discrete_object    (Earbuds, Kitchenware, Hardware Gadgets)
 * 3. apparel_wearable   (Clothing, Footwear, Jewelry)
 * 4. sensory_consumable (Skincare, Coffee, Supplements, Gourmet)
 * 5. bulky_furniture    (Sofas, Standing Desks, Mattresses)
 * 6. digital_saas       (Software, Web Apps, Digital Templates)
 * 7. local_service      (Roofing, Plumbing, Auto Detailing)
 */

import { ProductTypology, TypologySpecifics } from "@/lib/types/ecommerce";

interface TypologyRule {
  typology: ProductTypology;
  strongKeywords: string[];
  weakKeywords: string[];
}

const TYPOLOGY_RULES: TypologyRule[] = [
  {
    typology: "surface_material",
    strongKeywords: [
      "flooring", "hardwood", "oak plank", "vinyl plank", "lvp", "tile", "tiles",
      "porcelain", "porcelanato", "porcelanatos", "ceramic tile", "ceramica", "wall paint", "interior paint", "exterior paint",
      "wallpaper", "backsplash", "countertop", "marble slab", "granite", "laminate plank",
      "piso", "pisos", "piso vinilico", "piso flotante", "deck", "revestimiento", "revestimientos",
      "azulejo", "azulejos", "grout", "primer", "eggshell paint", "matte paint", "herringbone",
    ],
    weakKeywords: [
      "sq ft", "square foot", "gallon", "quart", "plank", "finish", "sheen",
      "scuff", "coat", "peel and stick", "waterproof flooring", "m2", "m²", "precio por m",
    ],
  },
  {
    typology: "discrete_object",
    strongKeywords: [
      "earbuds", "headphones", "bluetooth speaker", "power bank", "charger",
      "smartwatch", "drone", "blender", "coffee maker", "chef knife", "flashlight",
      "portable monitor", "keyboard", "mouse", "drill", "multitool", "camera lens",
    ],
    weakKeywords: [
      "gadget", "battery", "usb-c", "titanium", "device", "handheld", "compact",
      "ergonomic grip", "waterproof ipx", "lumens", "mah",
    ],
  },
  {
    typology: "apparel_wearable",
    strongKeywords: [
      "shirt", "t-shirt", "jacket", "hoodie", "pants", "trousers", "jeans", "denim",
      "dress", "skirt", "sneakers", "boots", "shoes", "runners", "sandals", "leggings",
      "sweatshirt", "ring", "necklace", "bracelet", "earrings", "sunglasses",
    ],
    weakKeywords: [
      "wool", "cotton", "merino", "silk", "linen", "stretch", "breathable", "sizing",
      "fit", "inseam", "unisex", "comfort", "wearable", "fabric",
    ],
  },
  {
    typology: "sensory_consumable",
    strongKeywords: [
      "serum", "facial cream", "moisturizer", "cleanser", "hyaluronic", "retinol",
      "perfume", "cologne", "fragrance", "espresso beans", "coffee beans", "matcha",
      "protein powder", "vitamins", "gummies", "supplement", "skincare", "glow oil",
    ],
    weakKeywords: [
      "dropper", "pipette", "fl oz", "30ml", "vegan", "cruelty free", "organic",
      "clinical study", "aroma", "single origin", "tasting notes", "hydration",
    ],
  },
  {
    typology: "bulky_furniture",
    strongKeywords: [
      "sofa", "couch", "sectional", "mattress", "bed frame", "standing desk",
      "dining table", "ergonomic chair", "office chair", "recliner", "dresser",
      "credenza", "bookshelf", "treadmill", "outdoor lawnmower",
    ],
    weakKeywords: [
      "dimensions", "weight capacity", "assembly", "solid wood", "dual motor",
      "in-home delivery", "living room set", "cushion",
    ],
  },
  {
    typology: "digital_saas",
    strongKeywords: [
      "software", "saas", "platform", "cloud app", "mobile app", "api key",
      "digital download", "figma template", "notion template", "dashboard software",
      "crm", "automation workflow", "developer tool",
    ],
    weakKeywords: [
      "subscription", "license", "free trial", "time saved", "integration", "sync",
      "unlimited seats", "web-based",
    ],
  },
  {
    typology: "local_service",
    strongKeywords: [
      "plumbing", "plumber", "roofing", "roofer", "auto detailing", "car detailing",
      "remodeling", "hvac", "air conditioning repair", "electrician", "pest control",
      "house cleaning", "ceramic coating service", "moving service", "locksmith",
    ],
    weakKeywords: [
      "licensed and insured", "free estimate", "same day service", "emergency dispatch",
      "warranty", "technician", "serving metro area", "quote",
    ],
  },
];

export interface ClassificationResult {
  typology: ProductTypology;
  confidence: number; // 0.0 to 1.0
  matchedKeywords: string[];
  typologySpecifics: TypologySpecifics;
}

/**
 * Classifies a product based on its textual metadata.
 */
export function classifyProductTypology(
  dataOrTitle:
    | {
        title: string;
        description?: string;
        vendor?: string;
        bulletPoints?: string[];
        tags?: string[] | string;
      }
    | string,
  extraDescriptionOrBulletPoints?: string
): ClassificationResult {
  const data =
    typeof dataOrTitle === "string"
      ? { title: dataOrTitle, description: extraDescriptionOrBulletPoints }
      : dataOrTitle;

  const combinedText = [
    data.title,
    data.description || "",
    data.vendor || "",
    Array.isArray(data.bulletPoints) ? data.bulletPoints.join(" ") : "",
    Array.isArray(data.tags) ? data.tags.join(" ") : data.tags || "",
  ]
    .join(" ")
    .toLowerCase();

  let bestTypology: ProductTypology = "discrete_object";
  let highestScore = 0;
  let bestMatches: string[] = [];

  for (const rule of TYPOLOGY_RULES) {
    let score = 0;
    const matches: string[] = [];

    // Strong keywords count for 3 points
    for (const kw of rule.strongKeywords) {
      if (combinedText.includes(kw)) {
        score += 3;
        matches.push(kw);
      }
    }

    // Weak keywords count for 1 point
    for (const kw of rule.weakKeywords) {
      if (combinedText.includes(kw)) {
        score += 1;
        matches.push(kw);
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestTypology = rule.typology;
      bestMatches = matches;
    }
  }

  // Calculate normalized confidence
  const confidence = highestScore > 0 ? Math.min(1.0, 0.4 + highestScore * 0.1) : 0.3;

  // Generate appropriate typology defaults
  const typologySpecifics: TypologySpecifics = {};

  switch (bestTypology) {
    case "surface_material":
      typologySpecifics.surfaceMaterial = {
        coveragePerUnit: combinedText.includes("gallon") ? "400 sq. ft. per gallon" : "24.5 sq. ft. per carton",
        installationType: combinedText.includes("click") ? "Uniclic® Interlocking (No Glue)" : "Roller & Brush",
        durabilityRating: "AC4 Commercial Grade",
        waterproofGrade: "100% Waterproof (72-hr spill barrier)",
        scratchResistant: true,
        finishType: combinedText.includes("matte") ? "ultra_matte" : "wirebrushed_oak",
      };
      break;

    case "discrete_object":
      typologySpecifics.discreteObject = {
        batteryLife: combinedText.includes("battery") ? "36 Hours Total" : undefined,
        waterproofIpx: "IPX7 Submersible",
        materials: ["Aerospace Alloy", "Tough Polycarbonate"],
      };
      break;

    case "apparel_wearable":
      typologySpecifics.apparel = {
        fabricComposition: combinedText.includes("wool") ? "100% Merino Wool" : "Performance Cotton-Poly Blend",
        stretchType: "4-way",
        fitType: "regular",
        modelHeightWearing: "Model is 5'10\" wearing Size M",
      };
      break;

    case "sensory_consumable":
      typologySpecifics.sensoryConsumable = {
        volumeOrWeight: combinedText.includes("ml") ? "30ml / 1.0 fl oz" : "12 oz (340g)",
        clinicalClaim: "94% noticed visible transformation in 7 days",
        certifications: ["100% Vegan", "Cruelty-Free", "Zero Parabens"],
      };
      break;

    case "bulky_furniture":
      typologySpecifics.bulkyFurniture = {
        dimensionsInches: { width: 60, depth: 30, height: 28 },
        weightCapacityLbs: 500,
        doorwayClearanceInches: 30,
        assemblyTimeMinutes: 15,
      };
      break;

    case "digital_saas":
      typologySpecifics.digitalSaas = {
        platformType: "web",
        freeTrialDays: 14,
        timeSavedMetric: "98% time saved (4 hours ➔ 20 seconds)",
        integrations: ["Shopify", "Slack", "Google Sheets"],
      };
      break;

    case "local_service":
      typologySpecifics.localService = {
        serviceAreaCity: "Metro Area",
        responseTimeMinutes: 30,
        guaranteeYears: 10,
        licensedAndInsured: true,
        googleRating: 4.9,
        googleReviewCount: 350,
      };
      break;
  }

  return {
    typology: bestTypology,
    confidence,
    matchedKeywords: bestMatches,
    typologySpecifics,
  };
}
