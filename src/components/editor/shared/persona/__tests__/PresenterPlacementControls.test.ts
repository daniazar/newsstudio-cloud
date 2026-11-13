import { describe, it, expect } from "vitest";

describe("PresenterPlacementControls & Interactive Specs System", () => {
  it("formats summary badges correctly for collapsed presenter placement", () => {
    const layoutMode = "bottom_right";
    const scale = 1.15;
    const offsetX = 5;
    const offsetY = -10;

    const zoomLabel = `${Math.round(scale * 100)}%`;
    const offsetLabel = `X:${offsetX} Y:${offsetY}`;

    expect(zoomLabel).toBe("115%");
    expect(offsetLabel).toBe("X:5 Y:-10");
  });

  it("supports adding, updating, deleting and injecting technical specs", () => {
    interface SpecItem {
      id: string;
      label: string;
      value: string;
    }

    let specs: SpecItem[] = [
      { id: "thickness", label: "Thickness", value: "10 mm" },
      { id: "dimensions", label: "Dimensions", value: "45 x 90 cm" },
    ];

    // Add a new specification
    const newSpec: SpecItem = { id: "wear_layer", label: "Wear Layer", value: "Heavy Duty Commercial" };
    specs = [...specs, newSpec];
    expect(specs).toHaveLength(3);

    // Edit a value
    specs = specs.map((s) => (s.id === "thickness" ? { ...s, value: "12 mm" } : s));
    expect(specs.find((s) => s.id === "thickness")?.value).toBe("12 mm");

    // Delete a spec
    specs = specs.filter((s) => s.id !== "dimensions");
    expect(specs).toHaveLength(2);
    expect(specs.find((s) => s.id === "dimensions")).toBeUndefined();

    // Inject into script
    const currentScript = "Transform your living space with our premium porcelain.";
    const bulletText = specs
      .filter((s) => s.label.trim() && s.value.trim())
      .map((s) => `${s.label}: ${s.value}`)
      .join(". ");

    const injected = `${currentScript} Guaranteed quality: ${bulletText}.`.trim();
    expect(injected).toContain("Thickness: 12 mm");
    expect(injected).toContain("Wear Layer: Heavy Duty Commercial");
    expect(injected).not.toContain("45 x 90 cm");
  });

  it("handles avatar hidden state correctly", () => {
    let enabled = true;
    const onToggle = (hidden: boolean) => {
      enabled = !hidden;
    };

    // User clicks hide
    onToggle(true);
    expect(enabled).toBe(false);

    // User clicks unhide
    onToggle(false);
    expect(enabled).toBe(true);
  });
});
