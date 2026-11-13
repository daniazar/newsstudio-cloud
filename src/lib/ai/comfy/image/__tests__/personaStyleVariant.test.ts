import { describe, it, expect } from "vitest";
import { getPersonaStyleVariant } from "../personaStyleVariant";

describe("personaStyleVariant (Task QX-7)", () => {
  it("should resolve preset style variant definition for ruby_updo", () => {
    const variant = getPersonaStyleVariant("ruby_updo");

    expect(variant.variantId).toBe("ruby_updo");
    expect(variant.basePersona).toBe("ruby");
    expect(variant.injectedStyleTags).toContain("elegant updo");
  });
});
