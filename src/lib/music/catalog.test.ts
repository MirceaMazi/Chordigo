import { describe, expect, it } from "vitest";
import { analyzeChordShape } from "@/features/chord-trainer/domain/chord-shape";
import { GUITAR_VOICINGS, PROGRESSION_TEMPLATES } from "./catalog";
import { resolveProgression } from "./progressions";

describe("playable guitar vocabulary", () => {
  it.each(GUITAR_VOICINGS)("registers a harmonically complete $displayName", (voicing) => {
    const result = analyzeChordShape(voicing.frets, voicing);
    expect(result.isHarmonicallyCorrect).toBe(true);
    expect(voicing.fingers).toHaveLength(6);
    expect(voicing.frets.every((f) => f === null || (f >= 0 && f <= 4))).toBe(true);
  });
  it.each(PROGRESSION_TEMPLATES)("resolves every chord in $name", (template) => {
    expect(resolveProgression(template)).toHaveLength(template.romanNumerals.length);
  });
});
