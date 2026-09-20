import type { PracticeObservation, PracticeSession } from "@/lib/practice-history/types";
import { createSessionPlan } from "./session-plan";

export type ReviewAnswers = Record<string, number>;

export function reviewableChords(session: PracticeSession) {
  const plan = createSessionPlan(session.voicingIds, session.durations, session.totalChanges);
  const groups = new Map<
    string,
    { voicing: (typeof plan.cues)[number]["voicing"]; count: number }
  >();
  for (const cue of plan.cues.slice(0, session.completedChanges)) {
    const group = groups.get(cue.voicing.id) ?? { voicing: cue.voicing, count: 0 };
    group.count++;
    groups.set(cue.voicing.id, group);
  }
  return [...groups.values()];
}

export function buildSessionReview(
  session: PracticeSession,
  answers: ReviewAnswers,
  reviewedAt: string,
) {
  if (session.status === "active" || session.feedbackMode !== "after-session" || session.reviewedAt)
    throw new Error("This session is not waiting for a review.");
  const groups = reviewableChords(session);
  if (!Object.keys(answers).length)
    throw new Error("Review at least one chord, or leave this session unscored.");
  for (const [id, clean] of Object.entries(answers)) {
    const group = groups.find((g) => g.voicing.id === id);
    if (!group || !Number.isInteger(clean) || clean < 0 || clean > group.count)
      throw new Error("Choose a clean-chord count from the steps you completed.");
  }
  const observations: PracticeObservation[] = [];
  for (const { voicing, count } of groups) {
    if (answers[voicing.id] === undefined) continue;
    for (let i = 0; i < count; i++) {
      observations.push({
        schemaVersion: 1,
        id: `${session.id}:review:${voicing.id}:${String(i).padStart(3, "0")}`,
        sessionId: session.id,
        context: "progression",
        source: "session-review",
        // Spread a summary's outcomes evenly: their actual order is unknown.
        // Grouping all successes first would invent a streak and unlock lessons too early.
        result:
          Math.floor(((i + 1) * answers[voicing.id]) / count) >
          Math.floor((i * answers[voicing.id]) / count)
            ? "correct"
            : "reported-miss",
        expectedVoicingId: voicing.id,
        chordSymbol: voicing.chordSymbol,
        observedChordSymbols: [],
        confidence: 1,
        createdAt: reviewedAt,
        bpm: session.bpm,
        // A summary does not identify which individual transitions succeeded.
      });
    }
  }
  return {
    observations,
    session: {
      ...session,
      reviewedAt,
      correct: observations.filter((o) => o.result === "correct").length,
      misses: observations.filter((o) => o.result === "reported-miss").length,
    },
  };
}
