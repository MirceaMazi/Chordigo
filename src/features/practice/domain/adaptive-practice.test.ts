import { describe, expect, it } from "vitest";
import { chooseAdaptiveProgression } from "./adaptive-practice";
import type { SkillSummary } from "@/lib/practice-history/types";

function summary(overrides: Partial<SkillSummary>): SkillSummary {
  return {
    voicingId: "c-major-open",
    chordSymbol: "C",
    attempts: 1,
    correct: 1,
    incorrect: 0,
    reportedMisses: 0,
    uncertain: 0,
    lastPracticedAt: "2026-08-30T10:00:00.000Z",
    ...overrides,
  };
}

describe("adaptive progression selection", () => {
  it("uses the default cycle before practice history exists", () => {
    const selection = chooseAdaptiveProgression([]);

    expect(selection.template.id).toBe("open-cycle");
    expect(selection.focusVoicing.chordSymbol).toBe("C");
  });

  it("selects and rotates a progression around a weak chord", () => {
    const selection = chooseAdaptiveProgression([
      summary({
        voicingId: "f-major-compact",
        chordSymbol: "F",
        correct: 0,
        incorrect: 1,
      }),
    ]);

    expect(selection.template.id).toBe("pop-foundation");
    expect(selection.focusVoicing.chordSymbol).toBe("F");
    expect(selection.voicings.map((voicing) => voicing.chordSymbol)).toEqual(["F", "C", "G", "Am"]);
  });
});
