import { getVoicing, GUITAR_VOICINGS } from "@/lib/music/catalog";

export function createSessionPlan(
  voicingIds: readonly string[],
  durations: readonly number[],
  totalChanges: number,
) {
  if (!voicingIds.length || voicingIds.length !== durations.length)
    throw new Error("A routine needs a duration for every chord.");
  if (voicingIds.some((id) => !GUITAR_VOICINGS.some((v) => v.id === id)))
    throw new Error("This routine contains an unknown chord.");
  if (durations.some((d) => !Number.isInteger(d) || d < 1 || d > 16))
    throw new Error("Chord durations must be between 1 and 16 beats.");
  if (!Number.isInteger(totalChanges) || totalChanges < 1 || totalChanges > 128)
    throw new Error("Choose between 1 and 128 changes.");
  let nextBeat = 0;
  const cues = Array.from({ length: totalChanges }, (_, ordinal) => {
    const index = ordinal % voicingIds.length;
    const cue = {
      ordinal,
      voicing: getVoicing(voicingIds[index]),
      startsAtBeat: nextBeat,
      duration: durations[index],
    };
    nextBeat += cue.duration;
    return Object.freeze(cue);
  });
  return Object.freeze({ cues: Object.freeze(cues), totalBeats: nextBeat });
}

export type SessionPlan = ReturnType<typeof createSessionPlan>;

export function getSessionCue(plan: SessionPlan, beat: number) {
  return plan.cues.findLast((cue) => cue.startsAtBeat <= Math.max(0, beat)) ?? plan.cues[0];
}
