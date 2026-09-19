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
