import { describe, expect, it } from "vitest";
import { parsePracticeBackup } from "./backup";
import { DEFAULT_PREFERENCES } from "./types";

const blank = {
  version: 2,
  observations: [],
  sessions: [],
  routines: [],
  settings: [{ ...DEFAULT_PREFERENCES, id: "preferences" }],
};

describe("backup validation", () => {
  it("accepts a valid empty export", () =>
    expect(parsePracticeBackup(JSON.stringify(blank)).version).toBe(2));
  it("rejects malformed JSON and future schemas", () => {
    expect(() => parsePracticeBackup("{")).toThrow("JSON");
    expect(() => parsePracticeBackup(JSON.stringify({ ...blank, version: 99 }))).toThrow(
      "supported",
    );
  });
  it("accepts older preferences and validates new feedback options", () => {
    const legacy = { ...blank.settings[0] } as Record<string, unknown>;
    for (const key of ["feedbackMode", "chordRepeats", "curriculumVersion", "earnedLevel"])
      delete legacy[key];
    expect(parsePracticeBackup(JSON.stringify({ ...blank, settings: [legacy] })).version).toBe(2);
    for (const patch of [{ feedbackMode: "automatic" }, { chordRepeats: 0 }, { earnedLevel: 6 }]) {
      expect(() =>
        parsePracticeBackup(
          JSON.stringify({ ...blank, settings: [{ ...blank.settings[0], ...patch }] }),
        ),
      ).toThrow("preferences");
    }
  });
  it("rejects invalid routines and settings before opening a transaction", () => {
    expect(() =>
      parsePracticeBackup(
        JSON.stringify({
          ...blank,
          routines: [
            {
              id: "a",
              name: "bad",
              voicingIds: ["unknown"],
              durations: [4],
              bpm: 60,
              beatsPerBar: 4,
            },
          ],
        }),
      ),
    ).toThrow("routine");
    expect(() =>
      parsePracticeBackup(
        JSON.stringify({ ...blank, settings: [{ ...blank.settings[0], bpm: 0 }] }),
      ),
    ).toThrow("preferences");
  });
});
