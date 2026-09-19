import { describe, expect, it } from "vitest";
import { applyObservationToSkill, getAccuracy, getWeaknessScore } from "./skill-summary";
import type { PracticeObservation } from "./types";

const BASE_OBSERVATION: PracticeObservation = {
  schemaVersion: 1,
  id: "observation-1",
  sessionId: "session-1",
  context: "chord-trainer",
  source: "fret-selection",
  result: "correct",
  expectedVoicingId: "c-major-open",
  chordSymbol: "C",
  observedChordSymbols: ["C"],
  confidence: 1,
  createdAt: "2026-08-30T10:00:00.000Z",
};

describe("skill summaries", () => {
  it("aggregates scored observations", () => {
    const first = applyObservationToSkill(undefined, BASE_OBSERVATION);
    const second = applyObservationToSkill(first, {
      ...BASE_OBSERVATION,
      id: "observation-2",
      result: "incorrect",
    });

    expect(second.attempts).toBe(2);
    expect(second.correct).toBe(1);
    expect(second.incorrect).toBe(1);
    expect(getAccuracy(second)).toBe(0.5);
    expect(getWeaknessScore(second)).toBe(0.5);
  });

  it("keeps uncertain observations out of attempts", () => {
    const summary = applyObservationToSkill(undefined, {
      ...BASE_OBSERVATION,
      result: "uncertain",
    });

    expect(summary.attempts).toBe(0);
    expect(summary.uncertain).toBe(1);
    expect(getAccuracy(summary)).toBeNull();
  });
});
