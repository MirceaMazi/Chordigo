import type { GuitarVoicing } from "@/lib/music/types";

export type PracticeBeat = {
  id: string;
  index: number;
  bar: number;
  beatInBar: number;
  voicing: GuitarVoicing;
};

export type PracticePlan = {
  id: string;
  beatsPerBar: number;
  beats: readonly PracticeBeat[];
};

export function createPracticePlan(
  id: string,
  voicings: readonly GuitarVoicing[],
  beatsPerBar: number,
): PracticePlan {
  if (voicings.length === 0) {
    throw new Error("A practice plan needs at least one voicing.");
  }

  if (!Number.isInteger(beatsPerBar) || beatsPerBar < 1) {
    throw new Error("beatsPerBar must be a positive integer.");
  }

  return {
    id,
    beatsPerBar,
    beats: voicings.map((voicing, index) => ({
      id: `${id}-beat-${index}`,
      index,
      bar: Math.floor(index / beatsPerBar) + 1,
      beatInBar: (index % beatsPerBar) + 1,
      voicing,
    })),
  };
}

export function getPlanBeat(plan: PracticePlan, absoluteBeat: number): PracticeBeat {
  const normalizedIndex = modulo(absoluteBeat, plan.beats.length);
  return plan.beats[normalizedIndex];
}

export function getUpcomingBeats(
  plan: PracticePlan,
  absoluteBeat: number,
  count: number,
): readonly PracticeBeat[] {
  return Array.from({ length: count }, (_, offset) => getPlanBeat(plan, absoluteBeat + offset + 1));
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
