/**
 * src/lib/ecommerce/stockMatcher.ts
 *
 * Contextual Stock B-Roll Matcher for E-Commerce Videos.
 * Automatically analyzes product specifications and typologies to query
 * Pexels & Pixabay APIs for high-resolution lifestyle video footage.
 */

import { ProductSpec } from "@/lib/types/ecommerce";
import { searchStock } from "@/lib/stock";

export interface MatchedStockClip {
  query: string;
  url: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
}

/**
 * Infers 2–3 high-intent lifestyle search queries from the product spec.
 */
function deriveSearchQueries(spec: ProductSpec): string[] {
  const queries: string[] = [];

  switch (spec.typology) {
    case "surface_material":
      if (spec.title.toLowerCase().includes("paint")) {
        queries.push("interior wall painting roller", "modern living room sunlit");
      } else {
        queries.push("modern luxury living room interior", "hardwood floor room sunlight");
      }
      break;

    case "discrete_object":
      if (spec.title.toLowerCase().includes("earbud") || spec.title.toLowerCase().includes("headphone")) {
        queries.push("runner listening to headphones in city", "gym workout athlete music");
      } else if (spec.title.toLowerCase().includes("coffee") || spec.title.toLowerCase().includes("kitchen")) {
        queries.push("kitchen chef cooking morning", "espresso barista coffee pour");
      } else {
        queries.push("tech gadget desk setup modern", "person using electronic device");
      }
      break;

    case "apparel_wearable":
      if (spec.title.toLowerCase().includes("shoe") || spec.title.toLowerCase().includes("runner")) {
        queries.push("runner feet asphalt slow motion", "person walking urban street");
      } else {
        queries.push("fashion model walking sunlight", "person wearing stylish clothes");
      }
      break;

    case "sensory_consumable":
      queries.push("skincare serum woman glowing skin", "water ripple clean droplet slow motion");
      break;

    case "bulky_furniture":
      queries.push("cozy modern living room interior", "home office standing desk workspace");
      break;

    case "digital_saas":
      queries.push("software engineer coding laptop modern office", "creative agency team working");
      break;

    case "local_service":
      queries.push("professional home contractor tools", "clean modern restored house");
      break;

    default:
      queries.push(`${spec.vendor} product lifestyle`, "modern commercial advertisement");
  }

  return queries;
}

/**
 * Searches for contextual B-roll clips for the product.
 */
export async function matchContextualStockClips(spec: ProductSpec): Promise<MatchedStockClip[]> {
  const queries = deriveSearchQueries(spec);
  const matchedClips: MatchedStockClip[] = [];

  for (const query of queries.slice(0, 2)) {
    try {
      const results = await searchStock(query, {
        type: "video",
        orientation: "portrait",
        perPage: 2,
      });

      for (const item of results) {
        if (item.downloadUrl) {
          matchedClips.push({
            query,
            url: item.downloadUrl,
            thumbnailUrl: item.previewUrl,
            durationSeconds: item.duration || 5,
            width: item.width,
            height: item.height,
          });
        }
      }
    } catch {
      // Non-blocking fallback if stock API keys are unconfigured
    }
  }

  return matchedClips;
}
