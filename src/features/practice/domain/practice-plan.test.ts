import { describe, expect, it } from "vitest";
import { GUITAR_VOICINGS } from "@/lib/music/catalog";
import { createPracticePlan, getPlanBeat, getUpcomingBeats } from "./practice-plan";

describe("practice plan", () => {
  const plan = createPracticePlan("test-plan", GUITAR_VOICINGS.slice(0, 4), 4);

  it("assigns musical positions to each beat", () => {
    expect(plan.beats[0]).toMatchObject({ bar: 1, beatInBar: 1 });
    expect(plan.beats[3]).toMatchObject({ bar: 1, beatInBar: 4 });
  });

  it("loops an absolute transport position through a finite plan", () => {
    expect(getPlanBeat(plan, 0).voicing.chordSymbol).toBe("C");
    expect(getPlanBeat(plan, 4).voicing.chordSymbol).toBe("C");
    expect(getPlanBeat(plan, -1).voicing.chordSymbol).toBe("Em");
  });

  it("derives upcoming cues without maintaining another counter", () => {
    expect(getUpcomingBeats(plan, 2, 3).map((beat) => beat.voicing.chordSymbol)).toEqual([
      "Em",
      "C",
      "G",
    ]);
  });

  it("rejects an empty plan", () => {
    expect(() => createPracticePlan("empty", [], 4)).toThrow("at least one voicing");
  });
});
