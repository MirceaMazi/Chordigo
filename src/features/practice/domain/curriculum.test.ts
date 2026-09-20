import { describe, expect, it } from "vitest";
import { FOUNDATION_VOICINGS, GUITAR_VOICINGS } from "@/lib/music/catalog";
import type { PracticeObservation, PracticeSession } from "@/lib/practice-history/types";
import {
  activityStats,
  chordEvidence,
  getCurriculum,
  getTransitions,
  localDay,
  recommendedTempo,
  legacyEarnedLevel,
} from "./curriculum";

function attempts(
  id: string,
  count: number,
  overrides: Partial<PracticeObservation> = {},
): PracticeObservation[] {
  return Array.from({ length: count }, (_, i) => ({
    schemaVersion: 1,
    id: `${id}-${i}`,
    sessionId: "test",
    context: "progression",
    source: "keyboard",
    result: "correct",
    expectedVoicingId: id,
    chordSymbol: GUITAR_VOICINGS.find((v) => v.id === id)!.chordSymbol,
    observedChordSymbols: [],
    confidence: 1,
    createdAt: new Date(2026, 8, 7, 12, i).toISOString(),
    ...overrides,
  }));
}

describe("progressive guitar curriculum", () => {
  it("starts with Em and G and keeps advanced chords out of a beginner session", () => {
    const plan = getCurriculum([]);
    expect(plan.voicings.map((v) => v.chordSymbol)).toEqual(["Em", "G"]);
    expect(plan.level).toBe(1);
    expect(getCurriculum([], "returning").level).toBe(2);
  });
  it("requires repeated playing evidence, not a successful shape quiz, to unlock", () => {
    const em = attempts("e-minor-open", 8);
    expect(getCurriculum(em).level).toBe(1);
    expect(
      getCurriculum([...em, ...attempts("g-major-open", 8, { context: "chord-trainer" })]).level,
    ).toBe(1);
    expect(getCurriculum([...em, ...attempts("g-major-open", 8)]).level).toBe(2);
  });
  it("never removes an earned level when a later practice is difficult", () => {
    const history = [
      ...attempts("e-minor-open", 8),
      ...attempts("g-major-open", 8),
      ...attempts("g-major-open", 20, { result: "reported-miss" }),
    ];
    expect(getCurriculum(history).level).toBe(2);
    expect(chordEvidence("g-major-open", history, "progression").steady).toBe(false);
  });
  it("preserves levels earned before the Em/G introduction", () => {
    const history = [...attempts("e-minor-open", 8), ...attempts("a-minor-open", 8)];
    expect(legacyEarnedLevel(history)).toBe(2);
    expect(getCurriculum(history, "beginner", legacyEarnedLevel(history)).level).toBe(2);
    expect(getCurriculum(history).level).toBe(1);
  });
  it("takes a beginner through every chord without getting stuck on a stage", () => {
    const history: PracticeObservation[] = [];
    const encountered = new Set<string>();
    for (let session = 0; session < 30; session++) {
      const plan = getCurriculum(history);
      expect(plan.voicings.some((v) => v.id === plan.focus.id)).toBe(true);
      for (const chord of plan.voicings) {
        encountered.add(chord.id);
        history.push(...attempts(chord.id, 8));
      }
      if (encountered.size === FOUNDATION_VOICINGS.length) break;
    }
    expect(encountered.size).toBe(FOUNDATION_VOICINGS.length);
    expect(getCurriculum(history).level).toBe(5);
  });
  it("keeps hints, uncertain evidence and alternate fingerings out of recall mastery", () => {
    const history = [
      ...attempts("e-minor-open", 8, { assisted: true }),
      ...attempts("e-minor-open", 8, { result: "uncertain" }),
      ...attempts("e-minor-open", 8, { exactVoicing: false }),
    ];
    expect(chordEvidence("e-minor-open", history).attempts).toBe(0);
    expect(
      chordEvidence(
        "e-minor-open",
        attempts("e-minor-open", 1, { result: "incorrect", exactVoicing: false }),
      ).attempts,
    ).toBe(1);
    expect(chordEvidence("e-minor-open", attempts("e-minor-open", 1)).mastery).toBeLessThan(20);
  });
  it("distinguishes transition direction and only focuses pairs after repeated evidence", () => {
    const forward = attempts("g-major-open", 3, {
      fromVoicingId: "e-minor-open",
      result: "reported-miss",
      bpm: 60,
    });
    const reverse = attempts("e-minor-open", 3, { fromVoicingId: "g-major-open", bpm: 70 });
    const transitions = getTransitions([...forward, ...reverse]);
    expect(transitions).toHaveLength(2);
    expect(transitions[0]).toMatchObject({ from: "e-minor-open", to: "g-major-open", accuracy: 0 });
    expect(transitions[1].bpm).toBe(70);
    expect(getCurriculum([...forward, ...reverse]).reason).toContain("Em → G");
  });
  it("makes small tempo changes only with enough explicit reports", () => {
    expect(recommendedTempo(60, 0, 0)).toBe(60);
    expect(recommendedTempo(60, 3, 0)).toBe(60);
    expect(recommendedTempo(60, 10, 0)).toBe(65);
    expect(recommendedTempo(60, 3, 5)).toBe(55);
    expect(recommendedTempo(40, 0, 8)).toBe(40);
    expect(recommendedTempo(160, 8, 0)).toBe(160);
  });
  it("uses local calendar dates and allows an unfinished day in a streak", () => {
    const today = new Date(2026, 8, 7, 1);
    const sessions = [5, 6].map(
      (day) =>
        ({
          startedAt: new Date(2026, 8, day, 23).toISOString(),
          durationSeconds: 60,
        }) as PracticeSession,
    );
    const result = activityStats(sessions, today);
    expect(result.streak).toBe(2);
    expect(result.todaySeconds).toBe(0);
    expect(result.byDay.get(localDay(new Date(2026, 8, 6)))).toBe(60);
  });
});
