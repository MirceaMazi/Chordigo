import { describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, type PracticeSession } from "@/lib/practice-history/types";
import { parsePracticeBackup } from "@/lib/practice-history/backup";
import { buildSessionReview, reviewableChords } from "./session-review";
import { chordEvidence, getCurriculum, getTransitions } from "./curriculum";

const session: PracticeSession = {
  id: "practice-test",
  name: "First changes",
  mode: "adaptive",
  bpm: 60,
  beatsPerBar: 4,
  voicingIds: ["e-minor-open", "e-minor-open", "g-major-open"],
  durations: [4, 4, 4],
  totalChanges: 8,
  completedChanges: 5,
  correct: 0,
  misses: 0,
  durationSeconds: 20,
  status: "completed",
  startedAt: "2026-09-20T10:00:00.000Z",
  endedAt: "2026-09-20T10:00:20.000Z",
  algorithmVersion: 2,
  feedbackMode: "after-session",
};
const now = "2026-09-20T10:01:00.000Z";
describe("hands-free session reviews", () => {
  it("counts only completed steps and combines consecutive repetitions", () => {
    expect(
      reviewableChords(session).map(({ voicing, count }) => [voicing.chordSymbol, count]),
    ).toEqual([
      ["Em", 4],
      ["G", 1],
    ]);
    expect(reviewableChords({ ...session, completedChanges: 0 })).toEqual([]);
  });
  it("scores explicit estimates and leaves skipped chords and transitions unscored", () => {
    const result = buildSessionReview(session, { "e-minor-open": 3 }, now);
    expect(result.session).toMatchObject({ correct: 3, misses: 1, reviewedAt: now });
    expect(result.observations).toHaveLength(4);
    expect(result.observations.every((o) => o.source === "session-review")).toBe(true);
    expect(getTransitions(result.observations)).toEqual([]);
    expect(chordEvidence("g-major-open", result.observations).attempts).toBe(0);
  });
  it("rejects impossible counts, active sessions and a second review", () => {
    const invalidAnswers: Record<string, number>[] = [
      {},
      { "e-minor-open": 5 },
      { "g-major-open": -1 },
      { "e-minor-open": 0.5 },
      { "a-minor-open": 1 },
    ];
    for (const answers of invalidAnswers) {
      expect(() => buildSessionReview(session, answers, now)).toThrow();
    }
    expect(() =>
      buildSessionReview({ ...session, status: "active" }, { "e-minor-open": 1 }, now),
    ).toThrow();
    expect(() =>
      buildSessionReview({ ...session, reviewedAt: now }, { "e-minor-open": 1 }, now),
    ).toThrow();
  });
  it("does not invent an unlocking streak from a mixed aggregate review", () => {
    const long = {
      ...session,
      voicingIds: ["e-minor-open", "g-major-open"],
      durations: [1, 1],
      totalChanges: 64,
      completedChanges: 64,
    };
    const mixed = buildSessionReview(long, { "e-minor-open": 16, "g-major-open": 16 }, now);
    // IndexedDB reads in key order; padded review IDs preserve the balanced distribution.
    const loaded = mixed.observations.sort((a, b) => a.id.localeCompare(b.id));
    expect(getCurriculum(loaded).level).toBe(1);
    expect(chordEvidence("e-minor-open", loaded).accuracy).toBe(0.5);
    const clean = buildSessionReview(long, { "e-minor-open": 32, "g-major-open": 32 }, now);
    expect(getCurriculum(clean.observations).level).toBe(2);
  });
  it("round trips new reviews and repeated routines through backups", () => {
    const result = buildSessionReview(session, { "e-minor-open": 4, "g-major-open": 0 }, now);
    const backup = parsePracticeBackup(
      JSON.stringify({
        version: 2,
        observations: result.observations,
        sessions: [result.session],
        routines: [],
        settings: [{ ...DEFAULT_PREFERENCES, id: "preferences" }],
      }),
    );
    expect(backup.sessions[0]).toEqual(result.session);
    expect(backup.observations).toEqual(result.observations);
  });
});
