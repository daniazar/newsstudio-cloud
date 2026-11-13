import { describe, it, expect } from "vitest";
import { injectDetailDaemonNode } from "../detailDaemon";

describe("detailDaemon (Task EV-7)", () => {
  it("should inject DetailDaemon node for Stage 3 Primary Persona", () => {
    const workflow: Record<string, any> = {};

    const injected = injectDetailDaemonNode(workflow, 3);

    expect(injected).toBe(true);
    expect(workflow["detail_daemon_stage_3"]).toBeDefined();
    expect(workflow["detail_daemon_stage_3"].inputs.strength).toBe(0.30);
  });

  it("should skip DetailDaemon injection for non-applicable stages", () => {
    const workflow: Record<string, any> = {};

    const injected = injectDetailDaemonNode(workflow, 1);

    expect(injected).toBe(false);
    expect(workflow["detail_daemon_stage_1"]).toBeUndefined();
  });
});
