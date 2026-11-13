import { ProductSpec } from "@/lib/types/ecommerce";

export interface ReadinessCheckItem {
  id: string;
  category: "metadata" | "media" | "brand" | "reviews";
  label: string;
  passed: boolean;
  scoreWeight: number;
  message: string;
}

export interface ProductReadinessReport {
  score: number; // 0 - 100
  isReady: boolean;
  passedCount: number;
  totalCount: number;
  items: ReadinessCheckItem[];
  recommendations: string[];
}

export function calculateProductReadiness(product?: ProductSpec | null): ProductReadinessReport {
  if (!product) {
    return {
      score: 0,
      isReady: false,
      passedCount: 0,
      totalCount: 6,
      items: [],
      recommendations: ["Select or scrape a product to begin."],
    };
  }

  const items: ReadinessCheckItem[] = [
    {
      id: "title_desc",
      category: "metadata",
      label: "Title & Description",
      passed: Boolean(product.title && product.description && product.description.length > 20),
      scoreWeight: 20,
      message: product.title ? "Valid product title & detailed description present." : "Missing product title or description.",
    },
    {
      id: "price_info",
      category: "metadata",
      label: "Pricing Data",
      passed: typeof product.price === "number" && product.price > 0,
      scoreWeight: 15,
      message: typeof product.price === "number" && product.price > 0 ? `Price set to ${product.price} ${product.currency || 'USD'}.` : "Missing valid price.",
    },
    {
      id: "hero_asset",
      category: "media",
      label: "Hero Packshot Asset",
      passed: Boolean(product.assets && product.assets.length > 0 && product.assets.some((a) => a.isPrimary || a.type === "hero_packshot")),
      scoreWeight: 25,
      message: product.assets && product.assets.length > 0 ? `${product.assets.length} product assets available.` : "No product image assets available.",
    },
    {
      id: "brand_identity",
      category: "brand",
      label: "Brand Identity & Colors",
      passed: Boolean(product.brand && (product.brand.name || product.brand.primaryColor)),
      scoreWeight: 15,
      message: product.brand?.name ? `Brand specified: ${product.brand.name}` : "Missing brand identity.",
    },
    {
      id: "customer_reviews",
      category: "reviews",
      label: "Customer Reviews & Social Proof",
      passed: Boolean(product.topReviews && product.topReviews.length > 0),
      scoreWeight: 15,
      message: product.topReviews && product.topReviews.length > 0 ? `${product.topReviews.length} social proof reviews extracted.` : "No customer reviews attached.",
    },
    {
      id: "bullet_highlights",
      category: "metadata",
      label: "Feature Bullet Highlights",
      passed: Boolean(product.bulletPoints && product.bulletPoints.length >= 2),
      scoreWeight: 10,
      message: product.bulletPoints && product.bulletPoints.length >= 2 ? `${product.bulletPoints.length} feature bullet points extracted.` : "Fewer than 2 feature bullets available.",
    },
  ];

  const totalPossibleWeight = items.reduce((acc, item) => acc + item.scoreWeight, 0);
  const earnedWeight = items.reduce((acc, item) => (item.passed ? acc + item.scoreWeight : acc), 0);
  const score = Math.round((earnedWeight / totalPossibleWeight) * 100);

  const passedCount = items.filter((i) => i.passed).length;
  const recommendations: string[] = items.filter((i) => !i.passed).map((i) => i.message);

  return {
    score,
    isReady: score >= 60,
    passedCount,
    totalCount: items.length,
    items,
    recommendations,
  };
}

export function getCommercialReadinessScore(product?: ProductSpec | null): number {
  return calculateProductReadiness(product).score;
}
