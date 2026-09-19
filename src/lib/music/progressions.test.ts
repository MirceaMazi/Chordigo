import { describe, expect, it } from "vitest";
import { PROGRESSION_TEMPLATES } from "./catalog";
import { resolveProgression, toTonalRomanNumeral } from "./progressions";

describe("progression resolution", () => {
  it("translates conventional lowercase degrees to Tonal chord qualities", () => {
    expect(toTonalRomanNumeral("vi")).toBe("VIm");
    expect(toTonalRomanNumeral("biii7")).toBe("bIIIm7");
    expect(toTonalRomanNumeral("IV")).toBe("IV");
  });

  it("resolves the open cycle into registered guitar voicings", () => {
    expect(
      resolveProgression(PROGRESSION_TEMPLATES[0]).map((voicing) => voicing.chordSymbol),
    ).toEqual(["C", "G", "Am", "Em"]);
  });

  it("resolves the pop foundation into registered guitar voicings", () => {
    expect(
      resolveProgression(PROGRESSION_TEMPLATES[1]).map((voicing) => voicing.chordSymbol),
    ).toEqual(["C", "G", "Am", "F"]);
  });
});
