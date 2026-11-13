import { describe, it, expect } from "vitest";
import { selectBestEnsembleVariant, StageEnsembleVariant } from "../ensembleSelector";

describe("ensembleSelector (Task EX-12)", () => {
  it("should select the variant with the highest CLIP score as winner", () => {
    const variants: StageEnsembleVariant[] = [
      { seed: 100, imagePath: "stage1_seed_100.png", clipScore: 0.81 },
      { seed: 200, imagePath: "stage1_seed_200.png", clipScore: 0.94 },
      { seed: 300, imagePath: "stage1_seed_300.png", clipScore: 0.87 }
    ];

    const res = selectBestEnsembleVariant(1, variants);

    expect(res.winningVariant.seed).toBe(200);
    expect(res.winningVariant.clipScore).toBe(0.94);
    expect(res.totalVariantsEvaluated).toBe(3);
  });
});
