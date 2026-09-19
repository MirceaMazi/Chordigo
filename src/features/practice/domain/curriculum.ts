import { GUITAR_VOICINGS, getVoicing, PROGRESSION_TEMPLATES } from "@/lib/music/catalog";
import { resolveProgression } from "@/lib/music/progressions";
import type { PracticeObservation, PracticeSession } from "@/lib/practice-history/types";

export const LEVELS = [
  {
    name: "First strings",
    description: "Find your rhythm with two friendly shapes.",
    symbols: ["Em", "Am"],
  },
  {
    name: "Open possibilities",
    description: "Add the chords behind countless songs.",
    symbols: ["C", "G", "D"],
  },
  {
    name: "A little more color",
    description: "Grow your vocabulary, one change at a time.",
    symbols: ["A", "E", "Dm"],
  },
  {
    name: "Beyond the open chord",
    description: "Build confidence with compact and barre shapes.",
    symbols: ["F", "Bm"],
  },
  {
    name: "The seventh sense",
    description: "Give your progressions a little extra character.",
    symbols: ["A7", "E7", "D7"],
  },
] as const;

export function chordEvidence(
  id: string,
  observations: readonly PracticeObservation[],
  context?: "progression" | "chord-trainer",
) {
  const attempts = observations
    .filter(
      (o) =>
        o.expectedVoicingId === id &&
        o.result !== "uncertain" &&
        !o.assisted &&
        (o.result !== "correct" || o.exactVoicing !== false) &&
        (!context || o.context === context),
    )
    .slice(-20);
  const correct = attempts.filter((o) => o.result === "correct").length;
  const accuracy = attempts.length ? correct / attempts.length : null;
  const mastery = Math.round((accuracy ?? 0) * Math.min(attempts.length / 8, 1) * 100);
  return {
    attempts: attempts.length,
    correct,
    accuracy,
    mastery,
    steady: attempts.length >= 8 && (accuracy ?? 0) >= 0.8,
  };
}

export function getCurriculum(
  observations: readonly PracticeObservation[],
  experience: "beginner" | "returning" = "beginner",
) {
  let level = experience === "returning" ? 2 : 1;
  while (level < LEVELS.length) {
    const current = GUITAR_VOICINGS.filter((v) => (v.level ?? 1) <= level);
    if (!current.every((v) => hasReachedSteady(v.id, observations))) break;
    level += 1;
  }
  const unlocked = GUITAR_VOICINGS.filter((v) => (v.level ?? 1) <= level);
  const ordered = [...unlocked].sort((a, b) => {
    const aEvidence = chordEvidence(a.id, observations, "progression");
    const bEvidence = chordEvidence(b.id, observations, "progression");
    const need = (e: typeof aEvidence) =>
      (e.attempts - e.correct + 2) / (e.attempts + 4) + (e.attempts === 0 ? 0.12 : 0);
    const order = LEVELS.flatMap((stage) => [...stage.symbols]) as string[];
    return (
      need(bEvidence) - need(aEvidence) ||
      (a.level ?? 1) - (b.level ?? 1) ||
      order.indexOf(a.chordSymbol) - order.indexOf(b.chordSymbol)
    );
  });
  const focus = ordered[0];
  const transitions = getTransitions(observations).filter(
    (t) => unlocked.some((v) => v.id === t.from) && unlocked.some((v) => v.id === t.to),
  );
  const weakTransition = transitions.find(
    (t) => t.attempts >= 3 && (t.misses + 2) / (t.attempts + 4) > 0.5,
  );
  const priority = (id: string) => {
    const e = chordEvidence(id, observations, "progression");
    return (e.attempts - e.correct + 2) / (e.attempts + 4) + (e.attempts === 0 ? 0.12 : 0);
  };
  // Keep the explanation and the lesson in agreement: every candidate includes
  // the chord that needs most attention, and only uses unlocked shapes.
  const candidates = PROGRESSION_TEMPLATES.map((template) => resolveProgression(template)).filter(
    (chords) =>
      chords.some((v) => v.id === focus.id) &&
      chords.every((v) => unlocked.some((u) => u.id === v.id)),
  );
  const score = (chords: (typeof candidates)[number]) =>
    Math.max(...chords.map((v) => priority(v.id))) +
    (chords.reduce((sum, v) => sum + priority(v.id), 0) / chords.length) * 0.25;
  const chosen = candidates.reduce(
    (best, current) => (score(current) > score(best) ? current : best),
    candidates[0],
  );
  const focusIndex = chosen.reduce(
    (best, v, i) => (priority(v.id) > priority(chosen[best].id) ? i : best),
    0,
  );
  const voicings = weakTransition
    ? [getVoicing(weakTransition.from), getVoicing(weakTransition.to)]
    : [...chosen.slice(focusIndex), ...chosen.slice(0, focusIndex)];
  const evidence = chordEvidence(focus.id, observations, "progression");
  const reason = weakTransition
    ? `Your ${getVoicing(weakTransition.from).chordSymbol} → ${getVoicing(weakTransition.to).chordSymbol} change needs a little attention. We'll give it a few more turns.`
    : evidence.attempts === 0
      ? `Start slowly with ${voicings.map((v) => v.chordSymbol).join(" and ")}. A clear sound matters more than speed.`
      : `${focus.chordSymbol} is your next focus. A few relaxed repetitions will help this shape feel more familiar.`;
  return {
    level,
    unlocked,
    focus: weakTransition ? getVoicing(weakTransition.to) : focus,
    voicings,
    reason,
    stage: LEVELS[level - 1],
  };
}

function hasReachedSteady(id: string, observations: readonly PracticeObservation[]): boolean {
  const attempts = observations.filter(
    (o) =>
      o.expectedVoicingId === id &&
      o.context === "progression" &&
      o.result !== "uncertain" &&
      !o.assisted &&
      (o.result !== "correct" || o.exactVoicing !== false),
  );
  let correct = 0;
  for (let i = 0; i < attempts.length; i++) {
    if (attempts[i].result === "correct") correct++;
    if (i >= 20 && attempts[i - 20].result === "correct") correct--;
    const count = Math.min(i + 1, 20);
    if (count >= 8 && correct / count >= 0.8) return true;
  }
  return false;
}

export function getTransitions(observations: readonly PracticeObservation[]) {
  const groups = new Map<string, PracticeObservation[]>();
  for (const o of observations) {
    if (
      o.context !== "progression" ||
      o.assisted ||
      (o.result === "correct" && o.exactVoicing === false) ||
      !o.fromVoicingId ||
      o.fromVoicingId === o.expectedVoicingId ||
      o.result === "uncertain"
    )
      continue;
    const key = `${o.fromVoicingId}>${o.expectedVoicingId}`;
    groups.set(key, [...(groups.get(key) ?? []), o].slice(-20));
  }
  return [...groups.entries()]
    .map(([id, items]) => ({
      id,
      from: items[0].fromVoicingId!,
      to: items[0].expectedVoicingId,
      attempts: items.length,
      misses: items.filter((o) => o.result !== "correct").length,
      accuracy: items.filter((o) => o.result === "correct").length / items.length,
      bpm: Math.max(...items.filter((o) => o.result === "correct").map((o) => o.bpm ?? 0), 0),
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.attempts - a.attempts);
}

export function localDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function activityStats(sessions: readonly PracticeSession[], now = new Date()) {
  const byDay = new Map<string, number>();
  for (const s of sessions) {
    if (s.durationSeconds <= 0) continue;
    const day = localDay(new Date(s.startedAt));
    byDay.set(day, (byDay.get(day) ?? 0) + s.durationSeconds);
  }
  let streak = 0;
  const cursor = new Date(now);
  if (!byDay.has(localDay(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (byDay.has(localDay(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return {
    byDay,
    streak,
    todaySeconds: byDay.get(localDay(now)) ?? 0,
    totalSeconds: [...byDay.values()].reduce((a, b) => a + b, 0),
  };
}

export function recommendedTempo(bpm: number, correct: number, misses: number): number {
  const reports = correct + misses;
  if (reports < 4) return bpm;
  const accuracy = correct / reports;
  return Math.max(40, Math.min(160, bpm + (accuracy >= 0.9 ? 5 : accuracy < 0.65 ? -5 : 0)));
}
