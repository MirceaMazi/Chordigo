import { describe, expect, it } from "vitest";
import { analyzeChordShape } from "@/features/chord-trainer/domain/chord-shape";
import {
  FOUNDATION_VOICINGS,
  GUITAR_VOICINGS,
  PROGRESSION_TEMPLATES,
  getVoicingBySymbol,
} from "./catalog";
import { resolveProgression } from "./progressions";

describe("playable guitar vocabulary", () => {
  it.each(GUITAR_VOICINGS)("registers a harmonically complete $displayName", (voicing) => {
    const result = analyzeChordShape(voicing.frets, voicing);
    expect(result.isHarmonicallyCorrect).toBe(true);
    expect(voicing.fingers).toHaveLength(6);
    expect(voicing.frets.every((f) => f === null || (f >= 0 && f <= 12))).toBe(true);
    const fretted = voicing.frets.filter((f): f is number => f !== null && f > 0);
    expect(Math.max(...fretted) - Math.min(...fretted)).toBeLessThanOrEqual(3);
  });
  it("covers every root in six chord families without inflating the beginner path", () => {
    expect(FOUNDATION_VOICINGS).toHaveLength(13);
    expect(GUITAR_VOICINGS).toHaveLength(79);
    expect(new Set(GUITAR_VOICINGS.map((v) => v.id)).size).toBe(79);
    expect(new Set(GUITAR_VOICINGS.map((v) => v.chordSymbol)).size).toBe(79);
    for (const quality of [
      "major",
      "minor",
      "seventh",
      "major-seventh",
      "minor-seventh",
      "power",
    ]) {
      expect(GUITAR_VOICINGS.filter((v) => v.quality === quality)).toHaveLength(12);
    }
    expect(getVoicingBySymbol("Gb")?.chordSymbol).toBe("F#");
    expect(getVoicingBySymbol("C#m")?.chordSymbol).toBe("C#m");
    expect(getVoicingBySymbol("Dbm")?.chordSymbol).toBe("C#m");
  });
  it.each(PROGRESSION_TEMPLATES)("resolves every chord in $name", (template) => {
    expect(resolveProgression(template)).toHaveLength(template.romanNumerals.length);
  });
});
