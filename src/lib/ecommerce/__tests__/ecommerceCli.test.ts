import { describe, it, expect } from "vitest";
import { parseArgs } from "../../../../scripts/ecommerce-ad-cli";

describe("ecommerce-ad-cli Unit Tests", () => {
  it("uses sensible defaults when no flags are supplied", () => {
    const opts = parseArgs([]);
    expect(opts.archetype).toBe("viral_ugc");
    expect(opts.aspect).toBe("9:16");
    expect(opts.persona).toBe("sofia");
    expect(opts.render).toBe(false);
    expect(opts.swarm).toBe(false);
  });

  it("parses custom CLI arguments accurately", () => {
    const args = [
      "--url=https://store.example.com/item",
      "--archetype=tiktok_shop",
      "--aspect=16:9",
      "--persona=bryce",
      "--hook=curiosity_gap",
      "--render",
      "--swarm",
      "--out=renders/custom",
    ];

    const opts = parseArgs(args);
    expect(opts.url).toBe("https://store.example.com/item");
    expect(opts.archetype).toBe("tiktok_shop");
    expect(opts.aspect).toBe("16:9");
    expect(opts.persona).toBe("bryce");
    expect(opts.hook).toBe("curiosity_gap");
    expect(opts.render).toBe(true);
    expect(opts.swarm).toBe(true);
    expect(opts.out).toBe("renders/custom");
  });
});
