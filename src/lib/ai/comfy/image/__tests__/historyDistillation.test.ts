import { describe, it, expect } from "vitest";
import { distillPersonaHistoryReference } from "../historyDistillation";

describe("historyDistillation (Task QX-10)", () => {
  it("should distill top generations into new primary reference path", () => {
    const res = distillPersonaHistoryReference("ruby", Array(20).fill("/tmp/sample.png"));

    expect(res.personaId).toBe("ruby");
    expect(res.candidateCount).toBe(20);
    expect(res.distilledReferencePath).toContain("distilled_reference_v3.png");
  });
});
