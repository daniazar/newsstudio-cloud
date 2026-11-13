import { describe, it, expect } from "vitest";
import { planNewsBroadcastFsmSequence } from "../loopSelector";

describe("planNewsBroadcastFsmSequence", () => {
  it("enforces Invariant 1 (M1 start) and Invariant 2 (M1 end) for Ruby", () => {
    const scenes = [
      { index: 0, text: "Welcome to tonight's live news broadcast." },
      { index: 1, text: "Here are the full details and background on the developing story." },
      { index: 2, text: "Here are the financial metrics, market data and inflation numbers." },
      { index: 3, text: "Thank you for watching, good night." },
    ];

    const beats = planNewsBroadcastFsmSequence(scenes, "ruby");

    expect(beats).toHaveLength(4);
    // Scene 0: M1 Home base
    expect(beats[0].startPose).toBe("M1");
    expect(beats[0].clipId).toMatch(/M1_loop/);
    expect(beats[0].cameraCue).toBe("cam1_wide");

    // Scene 1: Explanatory
    expect(beats[1].startPose).toBe("M1");
    expect(beats[1].endPose).toBe("M2");
    expect(beats[1].clipId).toBe("T1_to_2");

    // Scene 2: Data / Financial trigger -> M5
    expect(beats[2].clipId).toMatch(/(T2_to_5|M5_loop)/);
    expect(beats[2].endPose).toBe("M5");

    // Scene 3: Return to M1 for closing signoff
    expect(beats[3].endPose).toBe("M1");
    expect(beats[3].videoUrl).toContain("/assets/action_loops/veo/");
    expect(beats[3].videoUrl).toMatch(/\.mp4$/);
  });

  it("handles personas without transitions by selecting compatible same-pose loops", () => {
    const scenes = [
      { index: 0, text: "Introduction" },
      { index: 1, text: "Deep dive" },
      { index: 2, text: "Conclusion" },
    ];

    const beats = planNewsBroadcastFsmSequence(scenes, "diego");

    expect(beats).toHaveLength(3);
    expect(beats[0].clipId).toMatch(/M1_loop/);
    expect(beats[0].videoUrl).toContain("diego_navy_tailored_blazer");
    expect(beats[1].clipId).toMatch(/M2_loop/);
    expect(beats[2].clipId).toMatch(/M1_loop/);
  });

  it("assigns M4 for debate and perspective keywords", () => {
    const scenes = [
      { index: 0, text: "Intro hook." },
      { index: 1, text: "Citizens and experts agree and debate contrasting perspectives on the quote." },
      { index: 2, text: "Final conclusion." },
    ];

    const beats = planNewsBroadcastFsmSequence(scenes, "mateo");
    expect(beats).toHaveLength(3);
    expect(beats[1].endPose).toBe("M4");
  });
});
