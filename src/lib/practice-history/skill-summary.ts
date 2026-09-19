import type { PracticeObservation, SkillSummary } from "./types";

export function applyObservationToSkill(
  current: SkillSummary | undefined,
  observation: PracticeObservation,
): SkillSummary {
  const summary = current ?? {
    voicingId: observation.expectedVoicingId,
    chordSymbol: observation.chordSymbol,
    attempts: 0,
    correct: 0,
    incorrect: 0,
    reportedMisses: 0,
    uncertain: 0,
    lastPracticedAt: observation.createdAt,
  };

  return {
    ...summary,
    chordSymbol: observation.chordSymbol,
    attempts: summary.attempts + (observation.result === "uncertain" ? 0 : 1),
    correct: summary.correct + (observation.result === "correct" ? 1 : 0),
    incorrect: summary.incorrect + (observation.result === "incorrect" ? 1 : 0),
    reportedMisses: summary.reportedMisses + (observation.result === "reported-miss" ? 1 : 0),
    uncertain: summary.uncertain + (observation.result === "uncertain" ? 1 : 0),
    lastPracticedAt: observation.createdAt,
  };
}

export function getAccuracy(summary: SkillSummary): number | null {
  if (summary.attempts === 0) {
    return null;
  }

  return summary.correct / summary.attempts;
}

export function getWeaknessScore(summary: SkillSummary | undefined): number {
  if (!summary || summary.attempts === 0) {
    return 0.55;
  }

  // A small prior keeps a single mistake from outweighing sustained practice.
  return (summary.incorrect + summary.reportedMisses + 2) / (summary.attempts + 4);
}
