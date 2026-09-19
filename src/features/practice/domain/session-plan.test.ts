import { describe, expect, it } from "vitest";
import { createSessionPlan, getSessionCue } from "./session-plan";

describe("finite sessions with chord durations", () => {
  it("preserves varied durations when looping a custom sequence", () => {
    const plan = createSessionPlan(["e-minor-open", "a-minor-open"], [4, 2], 4);
    expect(plan.totalBeats).toBe(12);
    expect(plan.cues.map((c) => c.startsAtBeat)).toEqual([0, 4, 6, 10]);
    expect(getSessionCue(plan, -3).voicing.chordSymbol).toBe("Em");
    expect(getSessionCue(plan, 3).voicing.chordSymbol).toBe("Em");
    expect(getSessionCue(plan, 4).voicing.chordSymbol).toBe("Am");
  });
  it("takes an immutable snapshot of the editable routine", () => {
    const ids = ["e-minor-open", "a-minor-open"];
    const durations = [4, 2];
    const plan = createSessionPlan(ids, durations, 8);
    ids[0] = "c-major-open";
    durations[0] = 1;
    expect(plan.cues[0].voicing.chordSymbol).toBe("Em");
    expect(plan.cues[0].duration).toBe(4);
    expect(Object.isFrozen(plan.cues[0])).toBe(true);
  });
  it("rejects invalid plans before audio starts", () => {
    expect(() => createSessionPlan([], [], 16)).toThrow();
    expect(() => createSessionPlan(["missing"], [4], 16)).toThrow("unknown");
    expect(() => createSessionPlan(["e-minor-open"], [0], 16)).toThrow();
    expect(() => createSessionPlan(["e-minor-open"], [4], 0)).toThrow();
  });
});
