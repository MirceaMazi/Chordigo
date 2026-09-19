import type { GuitarVoicing, ProgressionTemplate } from "./types";

export const GUITAR_VOICINGS: readonly GuitarVoicing[] = [
  {
    id: "c-major-open",
    chordSymbol: "C",
    displayName: "C major",
    quality: "major",
    positionLabel: "Open",
    frets: [null, 3, 2, 0, 1, 0],
    fingers: [null, 3, 2, null, 1, null],
    level: 2,
    tip: "Keep your fingers curved so the open G and high E strings can ring. Strum from the A string.",
  },
  {
    id: "g-major-open",
    chordSymbol: "G",
    displayName: "G major",
    quality: "major",
    positionLabel: "Open",
    frets: [3, 2, 0, 0, 0, 3],
    fingers: [2, 1, null, null, null, 3],
    level: 2,
    tip: "Let your thumb rest behind the neck. Leave room for all three middle strings to ring open.",
  },
  {
    id: "a-minor-open",
    chordSymbol: "Am",
    displayName: "A minor",
    quality: "minor",
    positionLabel: "Open",
    frets: [null, 0, 2, 2, 1, 0],
    fingers: [null, null, 2, 3, 1, null],
    level: 1,
    tip: "Place your index finger close to the first fret on the B string. Strum the five thinnest strings.",
  },
  {
    id: "e-minor-open",
    chordSymbol: "Em",
    displayName: "E minor",
    quality: "minor",
    positionLabel: "Open",
    frets: [0, 2, 2, 0, 0, 0],
    fingers: [null, 2, 3, null, null, null],
    level: 1,
    tip: "Use your middle and ring fingers on the second fret. Relax your hand and let all six strings ring.",
  },
  {
    id: "f-major-compact",
    chordSymbol: "F",
    displayName: "F major",
    quality: "major",
    positionLabel: "Compact",
    frets: [null, null, 3, 2, 1, 1],
    fingers: [null, null, 3, 2, 1, 1],
    level: 4,
    tip: "Flatten your index finger across the two thinnest strings. Strum only the four thinnest strings.",
  },
  {
    id: "d-major-open",
    chordSymbol: "D",
    displayName: "D major",
    quality: "major",
    positionLabel: "Open",
    frets: [null, null, 0, 2, 3, 2],
    fingers: [null, null, null, 1, 3, 2],
    level: 2,
    tip: "Make a small triangle with your fingertips. Start your strum on the open D string.",
  },
  {
    id: "a-major-open",
    chordSymbol: "A",
    displayName: "A major",
    quality: "major",
    positionLabel: "Open",
    frets: [null, 0, 2, 2, 2, 0],
    fingers: [null, null, 1, 2, 3, null],
    level: 3,
    tip: "Fit three fingertips into the second fret. Keep your ring finger clear of the open high E string.",
  },
  {
    id: "e-major-open",
    chordSymbol: "E",
    displayName: "E major",
    quality: "major",
    positionLabel: "Open",
    frets: [0, 2, 2, 1, 0, 0],
    fingers: [null, 2, 3, 1, null, null],
    level: 3,
    tip: "Start with Em, then add your index finger to the G string at fret one. All six strings should ring.",
  },
  {
    id: "d-minor-open",
    chordSymbol: "Dm",
    displayName: "D minor",
    quality: "minor",
    positionLabel: "Open",
    frets: [null, null, 0, 2, 3, 1],
    fingers: [null, null, null, 2, 3, 1],
    level: 3,
    tip: "Place the index finger on high E first, then reach your ring finger to the third fret on B.",
  },
  {
    id: "b-minor-barre",
    chordSymbol: "Bm",
    displayName: "B minor",
    quality: "minor",
    positionLabel: "Barre",
    frets: [null, 2, 4, 4, 3, 2],
    fingers: [null, 1, 3, 4, 2, 1],
    level: 4,
    tip: "Barre the five thinnest strings at fret two. Roll the index slightly onto its firmer edge and use only the pressure you need.",
  },
  {
    id: "a7-open",
    chordSymbol: "A7",
    displayName: "A dominant 7",
    quality: "seventh",
    positionLabel: "Open",
    frets: [null, 0, 2, 0, 2, 0],
    fingers: [null, null, 2, null, 3, null],
    level: 5,
    tip: "Let the G string ring open between your two fretted notes. Start on the open A string.",
  },
  {
    id: "e7-open",
    chordSymbol: "E7",
    displayName: "E dominant 7",
    quality: "seventh",
    positionLabel: "Open",
    frets: [0, 2, 0, 1, 0, 0],
    fingers: [null, 2, null, 1, null, null],
    level: 5,
    tip: "Start with E major and lift your ring finger. Listen for the open D string that gives this chord its color.",
  },
  {
    id: "d7-open",
    chordSymbol: "D7",
    displayName: "D dominant 7",
    quality: "seventh",
    positionLabel: "Open",
    frets: [null, null, 0, 2, 1, 2],
    fingers: [null, null, null, 2, 1, 3],
    level: 5,
    tip: "Make a triangle pointing toward the nut. Strum from the D string and keep the two lowest strings quiet.",
  },
];

export const PROGRESSION_TEMPLATES: readonly ProgressionTemplate[] = [
  {
    id: "open-cycle",
    name: "Open chord cycle",
    tonic: "C",
    romanNumerals: ["I", "V", "vi", "iii"],
  },
  {
    id: "pop-foundation",
    name: "Pop foundation",
    tonic: "C",
    romanNumerals: ["I", "V", "vi", "IV"],
  },
  { id: "first-changes", name: "First two chords", tonic: "C", romanNumerals: ["iii", "vi"] },
  {
    id: "acoustic-daylight",
    name: "Acoustic daylight",
    tonic: "G",
    romanNumerals: ["I", "V", "vi", "IV"],
  },
  {
    id: "three-chord-story",
    name: "Three-chord story",
    tonic: "A",
    romanNumerals: ["I", "IV", "V", "IV"],
  },
  {
    id: "minor-mood",
    name: "A minor moment",
    tonic: "C",
    romanNumerals: ["vi", "ii", "iii", "vi"],
  },
  {
    id: "barre-bridge",
    name: "Across the barre",
    tonic: "D",
    romanNumerals: ["I", "vi", "IV", "V"],
  },
  {
    id: "seventh-avenue",
    name: "Seventh avenue",
    tonic: "A",
    romanNumerals: ["I7", "IV7", "V7", "I7"],
  },
];

export function getVoicing(id: string): GuitarVoicing {
  return GUITAR_VOICINGS.find((voicing) => voicing.id === id) ?? GUITAR_VOICINGS[3];
}

export function getVoicingBySymbol(symbol: string): GuitarVoicing {
  const voicing = GUITAR_VOICINGS.find((candidate) => candidate.chordSymbol === symbol);

  if (!voicing) {
    throw new Error(`No guitar voicing is registered for ${symbol}.`);
  }

  return voicing;
}
