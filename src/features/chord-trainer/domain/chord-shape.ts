import { Chord, Note } from "tonal";
import type { GuitarStringFret, GuitarVoicing } from "@/lib/music/types";

export const GUITAR_STRING_LABELS = ["Low E", "A", "D", "G", "B", "High E"] as const;
export const STANDARD_TUNING = ["E2", "A2", "D3", "G3", "B3", "E4"] as const;
export const EMPTY_GUITAR_SHAPE: readonly GuitarStringFret[] = [null, null, null, null, null, null];

export type PlayedString = {
  stringIndex: number;
  fret: number;
  note: string;
  pitchClass: string;
  chroma: number;
};

export type ChordShapeAnalysis = {
  status: "correct" | "alternate-voicing" | "incorrect";
  isExactVoicing: boolean;
  isHarmonicallyCorrect: boolean;
  playedStrings: readonly PlayedString[];
  expectedPitchClasses: readonly string[];
  missingPitchClasses: readonly string[];
  unexpectedPitchClasses: readonly string[];
  incorrectStringIndexes: readonly number[];
  detectedChords: readonly string[];
};

export function analyzeChordShape(
  selectedFrets: readonly GuitarStringFret[],
  target: GuitarVoicing,
): ChordShapeAnalysis {
  assertSixStrings(selectedFrets);
  assertSixStrings(target.frets);

  const playedStrings = getPlayedStrings(selectedFrets);
  const chord = Chord.get(target.chordSymbol);
  if (chord.empty) {
    throw new Error(`Unknown target chord: ${target.chordSymbol}.`);
  }

  const expectedByChroma = new Map(
    chord.notes.map((pitchClass) => [Note.chroma(pitchClass), pitchClass]),
  );
  const playedByChroma = new Map(playedStrings.map((played) => [played.chroma, played.pitchClass]));
  const missingPitchClasses = [...expectedByChroma]
    .filter(([chroma]) => !playedByChroma.has(chroma))
    .map(([, pitchClass]) => pitchClass);
  const unexpectedPitchClasses = [...playedByChroma]
    .filter(([chroma]) => !expectedByChroma.has(chroma))
    .map(([, pitchClass]) => pitchClass);
  const incorrectStringIndexes = selectedFrets.flatMap((fret, index) =>
    fret === target.frets[index] ? [] : [index],
  );
  const isHarmonicallyCorrect =
    playedStrings.length > 0 &&
    missingPitchClasses.length === 0 &&
    unexpectedPitchClasses.length === 0;
  const isExactVoicing = incorrectStringIndexes.length === 0;

  return {
    status: isExactVoicing ? "correct" : isHarmonicallyCorrect ? "alternate-voicing" : "incorrect",
    isExactVoicing,
    isHarmonicallyCorrect,
    playedStrings,
    expectedPitchClasses: [...expectedByChroma.values()],
    missingPitchClasses,
    unexpectedPitchClasses,
    incorrectStringIndexes,
    detectedChords:
      playedStrings.length >= 2
        ? Chord.detect(playedStrings.map((played) => played.note)).slice(0, 4)
        : [],
  };
}

export function getPlayedStrings(
  selectedFrets: readonly GuitarStringFret[],
): readonly PlayedString[] {
  assertSixStrings(selectedFrets);

  return selectedFrets.flatMap((fret, stringIndex) => {
    if (fret === null) {
      return [];
    }

    const openMidi = Note.midi(STANDARD_TUNING[stringIndex]);
    if (openMidi === null) {
      throw new Error(`Invalid tuning note at string ${stringIndex}.`);
    }

    const note = Note.fromMidi(openMidi + fret);
    const chroma = Note.chroma(note);
    const pitchClass = Note.pitchClass(note);
    if (chroma === null || !pitchClass) {
      throw new Error(`Could not resolve string ${stringIndex}, fret ${fret}.`);
    }

    return [{ stringIndex, fret, note, pitchClass, chroma }];
  });
}

function assertSixStrings(frets: readonly GuitarStringFret[]): void {
  if (frets.length !== STANDARD_TUNING.length) {
    throw new Error("A guitar shape must define exactly six strings.");
  }
}
