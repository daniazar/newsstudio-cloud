import { describe, it, expect } from "vitest";
import {
  parseInlineAnimationTags,
  stripAnimationTags,
  type StatAnimationData,
  type CounterAnimationData,
  type EntityAnimationData,
  type AlertAnimationData,
  type BadgeAnimationData,
  type FxAnimationData,
} from "../inlineAnimationParser";

describe("Inline Animation Parser", () => {
  it("strips animation tags cleanly from script text", () => {
    const raw =
      'NVIDIA surged [stat: +42% YoY | "Data Center"] to record revenue [counter: 138.5 | prefix=$ | suffix=B] with CEO [entity: "Jensen Huang" | "CEO"] [alert: "RECORD BREAK"] [fx: fire] today.';
    const clean = stripAnimationTags(raw);

    expect(clean).toBe(
      "NVIDIA surged to record revenue with CEO today."
    );
  });

  it("parses stat animation tags with correct parameters and frame offsets", () => {
    const text = 'Market momentum grew rapidly [stat: +84.2% | "Enterprise Share" | emerald] across Europe.';
    const result = parseInlineAnimationTags(text, { fps: 30, wpm: 150 });

    expect(result.cues.length).toBe(1);
    const cue = result.cues[0];
    expect(cue.type).toBe("stat");
    const data = cue.data as StatAnimationData;
    expect(data.value).toBe("+84.2%");
    expect(data.label).toBe("Enterprise Share");
    expect(data.color).toBe("emerald");
    expect(cue.startFrame).toBeGreaterThan(0);
    expect(cue.durationFrames).toBe(105); // 3.5s * 30fps
  });

  it("parses counter tags with custom prefix, suffix, and duration", () => {
    const text = 'Bitcoin price exploded [counter: 98400 | prefix=$ | suffix=USD | dur=2.0s] on heavy volume.';
    const result = parseInlineAnimationTags(text, { fps: 30 });

    expect(result.cues.length).toBe(1);
    const cue = result.cues[0];
    expect(cue.type).toBe("counter");
    const data = cue.data as CounterAnimationData;
    expect(data.targetValue).toBe(98400);
    expect(data.prefix).toBe("$");
    expect(data.suffix).toBe("USD");
    expect(data.durationSeconds).toBe(2.0);
    expect(cue.durationFrames).toBe(60); // 2.0s * 30fps
  });

  it("parses entity bio tags with icon and custom roles", () => {
    const text = 'Speaking at the conference was [entity: "Jensen Huang" | "CEO, NVIDIA" | icon=🟢] today.';
    const result = parseInlineAnimationTags(text, { fps: 30 });

    expect(result.cues.length).toBe(1);
    const cue = result.cues[0];
    expect(cue.type).toBe("entity");
    const data = cue.data as EntityAnimationData;
    expect(data.name).toBe("Jensen Huang");
    expect(data.role).toBe("CEO, NVIDIA");
    expect(data.icon).toBe("🟢");
  });

  it("parses alert, badge, and fx tags correctly", () => {
    const text = 'Emergency bulletin: [alert: "FLASH CRASH" | red] with [badge: "SEC FILING" | cyan] and [fx: fire] in the market.';
    const result = parseInlineAnimationTags(text, { fps: 30 });

    expect(result.cues.length).toBe(3);
    expect(result.cues[0].type).toBe("alert");
    expect((result.cues[0].data as AlertAnimationData).title).toBe("FLASH CRASH");
    expect(result.cues[1].type).toBe("badge");
    expect((result.cues[1].data as BadgeAnimationData).text).toBe("SEC FILING");
    expect(result.cues[2].type).toBe("fx");
    expect((result.cues[2].data as FxAnimationData).effect).toBe("fire");
  });
});
