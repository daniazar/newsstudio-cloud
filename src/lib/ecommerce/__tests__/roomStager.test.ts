/**
 * src/lib/ecommerce/__tests__/roomStager.test.ts
 *
 * Unit tests for AI Contextual Room Visualizer Staging Engine.
 */

import { describe, it, expect } from "vitest";
import {
  getAvailableEnvironments,
  getEnvironmentByKey,
  inferEnvironmentForProduct,
  computePlaneClipPath,
  compute3DTransform,
  generateLightingGradients,
  stageProductInRoom,
  STAGING_ENVIRONMENTS,
} from "../roomStager";
import { ProductSpec } from "@/lib/types/ecommerce";

const mockFlooring: ProductSpec = {
  id: "prod-floor-1",
  sourceUrl: "https://store.example.com/products/white-oak-hardwood",
  title: "Scandinavian White Oak Engineered Hardwood",
  vendor: "Nordic Floors",
  description: "Wire-brushed 7.5-inch wide plank hardwood flooring with water-resistant click lock.",
  price: 5.99,
  currency: "USD",
  inStock: true,
  rating: 4.9,
  reviewCount: 120,
  typology: "surface_material",
  brand: {
    name: "Nordic Floors",
    domain: "nordicfloors.com",
    logoUrl: null,
    faviconUrl: null,
    appleTouchIconUrl: null,
    primaryColor: "#06b6d4",
    secondaryColor: "#111111",
    surfaceColor: "#09090b",
    toneOfVoice: "minimalist_luxury",
    taglines: [],
  },
  bulletPoints: ["Wire-brushed genuine European oak", "HydroLock waterproof core"],
  variants: [],
  assets: [
    {
      id: "asset-1",
      url: "https://cdn.example.com/textures/white-oak-plank.jpg",
      type: "hero_packshot",
      altText: "White Oak Plank",
    },
  ],
  topReviews: [],
  scrapedAt: new Date().toISOString(),
};

const mockKitchenItem: ProductSpec = {
  ...mockFlooring,
  id: "prod-kitchen-1",
  title: "Calacatta Gold Quartz Kitchen Countertop & Island Slab",
  description: "Seamless non-porous luxury quartz countertop for modern kitchen islands.",
  bulletPoints: ["Stain-proof resin bound quartz", "Polished mirror gloss finish"],
};

const mockOfficeDesk: ProductSpec = {
  ...mockFlooring,
  id: "prod-desk-1",
  title: "AeroDesk Dual-Motor Standing Desk Workstation",
  description: "Ergonomic motorized height adjustable desk for home office studio.",
  bulletPoints: ["Solid walnut tabletop", "Quiet dual motor mechanism"],
};

const mockMattress: ProductSpec = {
  ...mockFlooring,
  id: "prod-bed-1",
  title: "CloudRest Hybrid Cooling Mattress",
  description: "Multi-layer memory foam and pocket spring mattress for master bedroom suites.",
  bulletPoints: ["Cooling gel infused layer", "Motion isolating pocket coils"],
};

describe("AI Contextual Room Visualizer Staging Engine", () => {
  it("provides 5 high-fidelity architectural room environments", () => {
    const envs = getAvailableEnvironments();
    expect(envs.length).toBe(5);

    const keys = envs.map((e) => e.key);
    expect(keys).toContain("living_room_modern");
    expect(keys).toContain("kitchen_minimalist");
    expect(keys).toContain("loft_industrial");
    expect(keys).toContain("bedroom_master");
    expect(keys).toContain("studio_office");
  });

  it("retrieves environment by key and falls back safely on invalid key", () => {
    const kitchen = getEnvironmentByKey("kitchen_minimalist");
    expect(kitchen.name).toContain("Kitchen");
    expect(kitchen.planes.length).toBeGreaterThan(0);

    const fallback = getEnvironmentByKey("unknown_environment" as any);
    expect(fallback.key).toBe("living_room_modern");
  });

  describe("Intelligent Environment Inference", () => {
    it("infers living room for flooring and surface materials", () => {
      const env = inferEnvironmentForProduct(mockFlooring);
      expect(env).toBe("living_room_modern");
    });

    it("infers kitchen for countertops and culinary products", () => {
      const env = inferEnvironmentForProduct(mockKitchenItem);
      expect(env).toBe("kitchen_minimalist");
    });

    it("infers studio office for ergonomic desks and chairs", () => {
      const env = inferEnvironmentForProduct(mockOfficeDesk);
      expect(env).toBe("studio_office");
    });

    it("infers master bedroom for mattresses and bedding", () => {
      const env = inferEnvironmentForProduct(mockMattress);
      expect(env).toBe("bedroom_master");
    });
  });

  describe("Perspective Warping & 3D Math", () => {
    it("computes CSS polygon clip-path from 4-point coordinates", () => {
      const polygon: [number, number][] = [
        [0, 60],
        [100, 60],
        [100, 100],
        [0, 100],
      ];
      const clipPath = computePlaneClipPath(polygon);
      expect(clipPath).toBe("polygon(0% 60%, 100% 60%, 100% 100%, 0% 100%)");
    });

    it("handles empty polygon gracefully", () => {
      const clipPath = computePlaneClipPath([]);
      expect(clipPath).toBe("none");
    });

    it("computes CSS 3D transform with perspective, rotateX, and scale", () => {
      const floorPlane = STAGING_ENVIRONMENTS.living_room_modern.planes[0];
      const transform = compute3DTransform(floorPlane);

      expect(transform).toContain(`perspective(${floorPlane.perspectivePx}px)`);
      expect(transform).toContain(`rotateX(${floorPlane.rotateXDeg}deg)`);
      expect(transform).toContain(`scale(${floorPlane.scale})`);
    });

    it("generates lighting gradients with directional overlay, vignette, and contact shadow", () => {
      const lighting = STAGING_ENVIRONMENTS.kitchen_minimalist.lighting;
      const gradients = generateLightingGradients(lighting);

      expect(gradients.backgroundOverlay).toContain("linear-gradient");
      expect(gradients.backgroundOverlay).toContain(`${lighting.lightAngleDeg}deg`);
      expect(gradients.vignette).toContain("radial-gradient");
      expect(gradients.contactShadow).toContain("radial-gradient");
    });
  });

  describe("stageProductInRoom Assembly", () => {
    it("assembles complete staged configuration for flooring in modern living room", () => {
      const staged = stageProductInRoom(mockFlooring);

      expect(staged.environment.key).toBe("living_room_modern");
      expect(staged.activePlane.type).toBe("floor");
      expect(staged.textureUrl).toBe("https://cdn.example.com/textures/white-oak-plank.jpg");
      expect(staged.planeTransformCss.clipPath).toContain("polygon");
      expect(staged.planeTransformCss.transform).toContain("perspective");
      expect(staged.lightingCss.backgroundOverlay).toBeDefined();
      expect(staged.lightingCss.vignette).toBeDefined();
      expect(staged.lightingCss.contactShadow).toBeDefined();
    });

    it("honors custom environment and plane overrides", () => {
      const staged = stageProductInRoom(mockFlooring, "loft_industrial", {
        planeType: "wall_accent",
        customTextureUrl: "https://cdn.example.com/custom-wall.jpg",
      });

      expect(staged.environment.key).toBe("loft_industrial");
      expect(staged.activePlane.type).toBe("wall_accent");
      expect(staged.textureUrl).toBe("https://cdn.example.com/custom-wall.jpg");
      expect(staged.activePlane.rotateYDeg).toBe(-15);
    });
  });
});
