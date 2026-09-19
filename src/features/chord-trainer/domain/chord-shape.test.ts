import { describe, expect, it } from "vitest";
import { getVoicingBySymbol } from "@/lib/music/catalog";
import { analyzeChordShape, getPlayedStrings } from "./chord-shape";

describe("chord shape analysis", () => {
  it("recognizes the registered C major shape", () => {
    const target = getVoicingBySymbol("C");
    const analysis = analyzeChordShape([null, 3, 2, 0, 1, 0], target);

    expect(analysis.status).toBe("correct");
    expect(analysis.missingPitchClasses).toEqual([]);
    expect(analysis.unexpectedPitchClasses).toEqual([]);
    expect(analysis.detectedChords.some((name) => name.startsWith("C"))).toBe(true);
  });

  it("reports missing and unexpected pitch classes", () => {
    const analysis = analyzeChordShape([null, 3, 0, 0, 1, null], getVoicingBySymbol("C"));

    expect(analysis.status).toBe("incorrect");
    expect(analysis.missingPitchClasses).toContain("E");
    expect(analysis.unexpectedPitchClasses).toContain("D");
    expect(analysis.incorrectStringIndexes).toContain(2);
  });

  it("derives notes from standard guitar tuning", () => {
    expect(getPlayedStrings([0, 2, 2, 0, 0, 0]).map((item) => item.note)).toEqual([
      "E2",
      "B2",
      "E3",
      "G3",
      "B3",
      "E4",
    ]);
  });
});
