import { PROGRESSION_TEMPLATES } from "@/lib/music/catalog";
import { resolveProgression } from "@/lib/music/progressions";
import { getWeaknessScore } from "@/lib/practice-history/skill-summary";
import type { SkillSummary } from "@/lib/practice-history/types";
import type { GuitarVoicing, ProgressionTemplate } from "@/lib/music/types";

export type AdaptiveProgression = {
  template: ProgressionTemplate;
  voicings: readonly GuitarVoicing[];
  focusVoicing: GuitarVoicing;
};

export function chooseAdaptiveProgression(
  summaries: readonly SkillSummary[],
  templates: readonly ProgressionTemplate[] = PROGRESSION_TEMPLATES,
): AdaptiveProgression {
  if (templates.length === 0) {
    throw new Error("Adaptive practice needs at least one progression template.");
  }

  const summariesByVoicing = new Map(summaries.map((summary) => [summary.voicingId, summary]));
  const candidates = templates.map((template) => {
    const voicings = resolveProgression(template);
    const weaknesses = voicings.map((voicing) =>
      getWeaknessScore(summariesByVoicing.get(voicing.id)),
    );
    const strongestNeed = Math.max(...weaknesses);
    const averageNeed =
      weaknesses.reduce((total, weakness) => total + weakness, 0) / weaknesses.length;

    return {
      template,
      voicings,
      weaknesses,
      score: strongestNeed + averageNeed * 0.2,
    };
  });
  const selected = candidates.reduce((best, candidate) =>
    candidate.score > best.score ? candidate : best,
  );
  const focusIndex = selected.weaknesses.indexOf(Math.max(...selected.weaknesses));
  const rotatedVoicings = [
    ...selected.voicings.slice(focusIndex),
    ...selected.voicings.slice(0, focusIndex),
  ];

  return {
    template: selected.template,
    voicings: rotatedVoicings,
    focusVoicing: selected.voicings[focusIndex],
  };
}
