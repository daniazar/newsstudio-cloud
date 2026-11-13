import { describe, it, expect } from "vitest";
import {
  classifyObjection,
  extractHighlightPhrase,
  calculateImpactScore,
  extractReviewsFromJsonLd,
  extractReviewsFromHtml,
  synthesizeUgcReviews,
  rankReviewsForVideo,
  compileUgcScene,
  harvestOrSynthesizeReviews,
  EnrichedCustomerReview,
} from "../reviewHarvester";
import { ProductSpec } from "@/lib/types/ecommerce";

const MOCK_PRODUCT: ProductSpec = {
  id: "test-flooring",
  sourceUrl: "https://example.com/hardwood",
  title: "Scandinavian White Oak Plank",
  vendor: "Lumina Co.",
  description: "Waterproof engineered hardwood with click-lock installation.",
  bulletPoints: [
    "AC4 Commercial wear layer",
    "100% pet claw scratch resistant",
    "Click-lock DIY setup",
  ],
  price: 4.99,
  currency: "USD",
  inStock: true,
  typology: "surface_material",
  brand: {
    name: "Lumina",
    domain: "lumina.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#06b6d4",
    secondaryColor: "#f59e0b",
    surfaceColor: "#111113",
    toneOfVoice: "minimalist_luxury",
    taglines: ["Engineered for Living"],
  },
  variants: [],
  assets: [
    {
      id: "a1",
      url: "https://example.com/hero.jpg",
      type: "hero_packshot",
      isPrimary: true,
    },
    {
      id: "a2",
      url: "https://example.com/lifestyle.jpg",
      type: "lifestyle_context",
    },
  ],
  topReviews: [],
  scrapedAt: new Date().toISOString(),
};

describe("reviewHarvester", () => {
  describe("classifyObjection", () => {
    it("classifies durability keywords", () => {
      const text = "We have two big dogs and after 6 months not a single scratch or claw mark.";
      expect(classifyObjection(text)).toBe("durability");
    });

    it("classifies ease of use keywords", () => {
      const text = "The click-lock install was super simple and setup took only 20 minutes.";
      expect(classifyObjection(text)).toBe("ease_of_use");
    });

    it("classifies value for money keywords", () => {
      const text = "Worth every single penny, so much better than the cheap alternatives.";
      expect(classifyObjection(text)).toBe("value_for_money");
    });

    it("classifies sizing and fit keywords", () => {
      const text = "The dimensions fit perfectly in our space, true to size.";
      expect(classifyObjection(text)).toBe("sizing_and_fit");
    });

    it("falls back to typology-aware default when no keywords match", () => {
      expect(classifyObjection("It was fine.", "surface_material")).toBe("durability");
      expect(classifyObjection("It was fine.", "digital_saas")).toBe("ease_of_use");
    });
  });

  describe("extractHighlightPhrase", () => {
    it("extracts recognized high-converting soundbite patterns", () => {
      expect(
        extractHighlightPhrase("We were blown away, honestly the best purchase I made all year.")
      ).toBe("Honestly the best purchase I made all year");

      expect(
        extractHighlightPhrase("We have 3 dogs and there is not a single scratch anywhere.")
      ).toBe("Not a single scratch");

      expect(
        extractHighlightPhrase("This was worth every penny for our kitchen.")
      ).toBe("Worth every penny");
    });

    it("falls back to shortest punchy sentence when no regex match", () => {
      const text = "Just arrived. Setup was remarkably effortless. Will update soon.";
      expect(extractHighlightPhrase(text)).toBe("Setup was remarkably effortless");
    });
  });

  describe("calculateImpactScore", () => {
    it("calculates high impact score for concise verified 5-star reviews with power words", () => {
      const review: Partial<EnrichedCustomerReview> = {
        rating: 5,
        verifiedBuyer: true,
        body: "Honestly the best purchase ever. Transformed our living room in 20 minutes.",
      };
      const score = calculateImpactScore(review);
      expect(score).toBeGreaterThan(80);
    });

    it("penalizes low rating or unverified verbose reviews", () => {
      const review: Partial<EnrichedCustomerReview> = {
        rating: 2,
        verifiedBuyer: false,
        body: "I did not like it.",
      };
      const score = calculateImpactScore(review);
      expect(score).toBeLessThan(50);
    });
  });

  describe("extractReviewsFromJsonLd", () => {
    it("extracts reviews from schema.org Product review array", () => {
      const jsonLd = {
        "@type": "Product",
        name: "Scandinavian Oak",
        review: [
          {
            "@type": "Review",
            author: { name: "Marcus K." },
            reviewRating: { ratingValue: "5" },
            reviewBody: "Honestly the best flooring we ever bought. Zero scratches from our dogs.",
            datePublished: "2026-03-01",
          },
        ],
      };

      const extracted = extractReviewsFromJsonLd(jsonLd, "surface_material");
      expect(extracted.length).toBe(1);
      expect(extracted[0].author).toBe("Marcus K.");
      expect(extracted[0].rating).toBe(5);
      expect(extracted[0].source).toBe("json_ld");
      expect(extracted[0].objectionSolved).toBe("durability");
      expect(extracted[0].impactScore).toBeGreaterThan(70);
    });
  });

  describe("extractReviewsFromHtml", () => {
    it("extracts reviews from Judge.me HTML widget markup", () => {
      const html = `
        <div class="jdgm-rev">
          <span class="jdgm-rev__author">Sarah T.</span>
          <div data-score="5"></div>
          <div class="jdgm-rev__body">
            Finished the whole room in one weekend. Saved over $2,000 on contractor costs!
          </div>
        </div>
      `;

      const extracted = extractReviewsFromHtml(html, "surface_material");
      expect(extracted.length).toBe(1);
      expect(extracted[0].author).toBe("Sarah T.");
      expect(extracted[0].source).toBe("judge_me");
      expect(extracted[0].rating).toBe(5);
      expect(extracted[0].body).toContain("Finished the whole room");
    });
  });

  describe("synthesizeUgcReviews", () => {
    it("generates authentic UGC reviews matching the product typology", () => {
      const reviews = synthesizeUgcReviews(MOCK_PRODUCT, 3);
      expect(reviews.length).toBe(3);
      expect(reviews[0].verifiedBuyer).toBe(true);
      expect(reviews[0].source).toBe("synthetic_ugc");
      expect(reviews[0].rating).toBe(5);
      expect(reviews[0].highlightPhrase.length).toBeGreaterThan(0);
      expect(reviews.some((r) => r.objectionSolved === "durability")).toBe(true);
    });
  });

  describe("rankReviewsForVideo", () => {
    it("ranks reviews by impactScore descending", () => {
      const items: EnrichedCustomerReview[] = [
        {
          id: "r1",
          author: "A",
          rating: 4,
          body: "Ok",
          verifiedBuyer: false,
          source: "shopify",
          objectionSolved: "general_satisfaction",
          impactScore: 40,
          highlightPhrase: "Ok",
        },
        {
          id: "r2",
          author: "B",
          rating: 5,
          body: "Game changer! Honestly the best purchase all year.",
          verifiedBuyer: true,
          source: "synthetic_ugc",
          objectionSolved: "durability",
          impactScore: 95,
          highlightPhrase: "Game changer",
        },
      ];

      const ranked = rankReviewsForVideo(items);
      expect(ranked[0].id).toBe("r2");
      expect(ranked[1].id).toBe("r1");
    });
  });

  describe("compileUgcScene", () => {
    it("produces valid AdScene of type social_proof_review", () => {
      const review: EnrichedCustomerReview = {
        id: "rev_1",
        author: "Marcus K.",
        rating: 5,
        body: "We have two German Shepherds and after 6 months, not a single claw scratch.",
        verifiedBuyer: true,
        source: "synthetic_ugc",
        objectionSolved: "durability",
        impactScore: 92,
        highlightPhrase: "Not a Single Scratch",
      };

      const scene = compileUgcScene(review, MOCK_PRODUCT, 360, 120);
      expect(scene.sceneType).toBe("social_proof_review");
      expect(scene.startFrame).toBe(360);
      expect(scene.durationFrames).toBe(120);
      expect(scene.headline).toContain("Marcus K.");
      expect(scene.subheadline).toContain("German Shepherds");
      expect(scene.featureBadgeText).toBe("NOT A SINGLE SCRATCH");
      expect(scene.voiceoverScript).toContain("Not a Single Scratch");
    });
  });

  describe("harvestOrSynthesizeReviews", () => {
    it("synthesizes reviews when product has no reviews", async () => {
      const result = await harvestOrSynthesizeReviews(MOCK_PRODUCT);
      expect(result.reviews.length).toBeGreaterThanOrEqual(2);
      expect(result.topPick).toBeDefined();
      expect(result.summary.averageRating).toBe(5);
      expect(result.summary.totalCount).toBe(result.reviews.length);
    });
  });
});
