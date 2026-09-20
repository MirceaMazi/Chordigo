import type { GuitarVoicing } from "./types";

// Movable E- and A-string shapes cover every root. Prefer the lower position;
// familiar open fingerings below replace their movable equivalents.
const ROOTS = [
  ["C", "C", 8],
  ["Db", "C#", 9],
  ["D", "D", 10],
  ["Eb", "D#", 11],
  ["E", "E", 0],
  ["F", "F", 1],
  ["F#", "Gb", 2],
  ["G", "G", 3],
  ["Ab", "G#", 4],
  ["A", "A", 5],
  ["Bb", "A#", 6],
  ["B", "B", 7],
] as const;
const SHAPES = [
  {
    quality: "major",
    suffix: "",
    name: "major",
    e: [0, 2, 2, 1, 0, 0],
    a: [null, 0, 2, 2, 2, 0],
    ef: [1, 3, 4, 2, 1, 1],
    af: [null, 1, 3, 3, 3, 1],
  },
  {
    quality: "minor",
    suffix: "m",
    name: "minor",
    e: [0, 2, 2, 0, 0, 0],
    a: [null, 0, 2, 2, 1, 0],
    ef: [1, 3, 4, 1, 1, 1],
    af: [null, 1, 3, 4, 2, 1],
  },
  {
    quality: "seventh",
    suffix: "7",
    name: "dominant 7",
    e: [0, 2, 0, 1, 0, 0],
    a: [null, 0, 2, 0, 2, 0],
    ef: [1, 3, 1, 2, 1, 1],
    af: [null, 1, 3, 1, 4, 1],
  },
  {
    quality: "major-seventh",
    suffix: "maj7",
    name: "major 7",
    e: [0, 2, 1, 1, 0, 0],
    a: [null, 0, 2, 1, 2, 0],
    ef: [1, 3, 2, 2, 1, 1],
    af: [null, 1, 3, 2, 4, 1],
  },
  {
    quality: "minor-seventh",
    suffix: "m7",
    name: "minor 7",
    e: [0, 2, 0, 0, 0, 0],
    a: [null, 0, 2, 0, 1, 0],
    ef: [1, 3, 1, 1, 1, 1],
    af: [null, 1, 3, 1, 2, 1],
  },
] as const;

const movable = ROOTS.flatMap(([flat, sharp, eFret]): GuitarVoicing[] => {
  const aFret = (eFret + 7) % 12;
  const useA = aFret < eFret;
  const base = useA ? aFret : eFret;
  const chords = SHAPES.map((shape): GuitarVoicing => {
    const root =
      shape.quality.startsWith("minor") && ["Db", "Eb", "Ab"].includes(flat) ? sharp : flat;
    const frets = (useA ? shape.a : shape.e).map((f) => (f === null ? null : f + base));
    const fingers = (useA ? shape.af : shape.ef).map((finger, i) =>
      frets[i] === null || frets[i] === 0 ? null : finger,
    );
    return {
      id: `${root.toLowerCase().replace("#", "-sharp")}-${shape.quality}-movable`,
      chordSymbol: `${root}${shape.suffix}`,
      displayName: `${root} ${shape.name}`,
      quality: shape.quality,
      positionLabel: base === 0 ? "Open" : `Barre · fret ${base}`,
      frets,
      fingers,
      aliases: [
        ...new Set([
          `${flat}${shape.suffix}`,
          `${sharp}${shape.suffix}`,
          `${flat} ${shape.name}`,
          `${sharp} ${shape.name}`,
        ]),
      ],
      tip:
        base === 0
          ? `Let the open strings ring and keep your fretting fingers curved. ${useA ? "Strum from the A string." : "Strum all six strings."}`
          : `Place your index barre at fret ${base}. ${useA ? "Keep the low E string quiet; strum from A." : "Strum all six strings."} Add the other fingers, then check each string slowly.`,
    };
  });
  return [
    ...chords,
    {
      id: `${flat.toLowerCase().replace("#", "-sharp")}-power`,
      chordSymbol: `${flat}5`,
      displayName: `${flat} power chord`,
      quality: "power",
      positionLabel: `Power · fret ${base}`,
      frets: useA
        ? [null, base, base + 2, base + 2, null, null]
        : [base, base + 2, base + 2, null, null, null],
      fingers: useA
        ? [null, base ? 1 : null, 3, 4, null, null]
        : [base ? 1 : null, 3, 4, null, null, null],
      aliases: [`${sharp}5`, `${sharp} power chord`],
      tip: "Play only the three marked strings. Lightly touch the others to keep them quiet. This root-and-fifth shape has no major or minor third.",
    },
  ];
});

const open: GuitarVoicing[] = [
  {
    id: "c7-open",
    chordSymbol: "C7",
    optionalPitchClasses: ["G"],
    displayName: "C dominant 7",
    quality: "seventh",
    positionLabel: "Open",
    frets: [null, 3, 2, 3, 1, 0],
    fingers: [null, 3, 2, 4, 1, null],
    tip: "Start from C and add your pinky at fret three on G. Strum from A.",
  },
  {
    id: "g7-open",
    chordSymbol: "G7",
    displayName: "G dominant 7",
    quality: "seventh",
    positionLabel: "Open",
    frets: [3, 2, 0, 0, 0, 1],
    fingers: [3, 2, null, null, null, 1],
    tip: "Keep your index on high E at fret one. Let the middle strings ring open.",
  },
  {
    id: "b7-open",
    chordSymbol: "B7",
    displayName: "B dominant 7",
    quality: "seventh",
    positionLabel: "Open",
    frets: [null, 2, 1, 2, 0, 2],
    fingers: [null, 2, 1, 3, null, 4],
    tip: "Leave B open between the fretted G and high E strings. Keep low E quiet.",
  },
  {
    id: "cmaj7-open",
    chordSymbol: "Cmaj7",
    displayName: "C major 7",
    quality: "major-seventh",
    positionLabel: "Open",
    frets: [null, 3, 2, 0, 0, 0],
    fingers: [null, 3, 2, null, null, null],
    tip: "Start from C, lift your index, and let the open B string ring.",
  },
  {
    id: "gmaj7-open",
    chordSymbol: "Gmaj7",
    displayName: "G major 7",
    quality: "major-seventh",
    positionLabel: "Open",
    frets: [3, 2, 0, 0, 0, 2],
    fingers: [3, 1, null, null, null, 2],
    tip: "Move the highest note of G down to fret two. Let D, G, and B ring open.",
  },
  {
    id: "dmaj7-open",
    chordSymbol: "Dmaj7",
    displayName: "D major 7",
    quality: "major-seventh",
    positionLabel: "Open",
    frets: [null, null, 0, 2, 2, 2],
    fingers: [null, null, null, 1, 1, 1],
    tip: "Lay your index gently across the three thinnest strings at fret two. Strum from D.",
  },
  {
    id: "am7-open",
    chordSymbol: "Am7",
    displayName: "A minor 7",
    quality: "minor-seventh",
    positionLabel: "Open",
    frets: [null, 0, 2, 0, 1, 0],
    fingers: [null, null, 2, null, 1, null],
    tip: "Start from Am and lift your ring finger. Keep the open G string clear.",
  },
  {
    id: "em7-open",
    chordSymbol: "Em7",
    displayName: "E minor 7",
    quality: "minor-seventh",
    positionLabel: "Open",
    frets: [0, 2, 0, 0, 0, 0],
    fingers: [null, 2, null, null, null, null],
    tip: "Only the A string needs a finger, at fret two. All six strings can ring.",
  },
  {
    id: "dm7-open",
    chordSymbol: "Dm7",
    displayName: "D minor 7",
    quality: "minor-seventh",
    positionLabel: "Open",
    frets: [null, null, 0, 2, 1, 1],
    fingers: [null, null, null, 2, 1, 1],
    tip: "Use your index across B and high E at fret one, and your middle finger on G at fret two.",
  },
  {
    id: "asus2-open",
    chordSymbol: "Asus2",
    displayName: "A suspended 2",
    quality: "suspended",
    positionLabel: "Open",
    frets: [null, 0, 2, 2, 0, 0],
    fingers: [null, null, 2, 3, null, null],
    tip: "Keep B and high E open. Use two fingers on D and G at fret two.",
  },
  {
    id: "dsus2-open",
    chordSymbol: "Dsus2",
    displayName: "D suspended 2",
    quality: "suspended",
    positionLabel: "Open",
    frets: [null, null, 0, 2, 3, 0],
    fingers: [null, null, null, 1, 3, null],
    tip: "Start from D and lift the finger on high E. Strum from the open D string.",
  },
  {
    id: "asus4-open",
    chordSymbol: "Asus4",
    displayName: "A suspended 4",
    quality: "suspended",
    positionLabel: "Open",
    frets: [null, 0, 2, 2, 3, 0],
    fingers: [null, null, 1, 2, 3, null],
    tip: "Move the B-string note of A up to fret three. Keep high E open.",
  },
  {
    id: "dsus4-open",
    chordSymbol: "Dsus4",
    displayName: "D suspended 4",
    quality: "suspended",
    positionLabel: "Open",
    frets: [null, null, 0, 2, 3, 3],
    fingers: [null, null, null, 1, 3, 4],
    tip: "Start from D and add your pinky to high E at fret three.",
  },
  {
    id: "esus4-open",
    chordSymbol: "Esus4",
    displayName: "E suspended 4",
    quality: "suspended",
    positionLabel: "Open",
    frets: [0, 2, 2, 2, 0, 0],
    fingers: [null, 1, 2, 3, null, null],
    tip: "Place three fingers at fret two on A, D, and G. All six strings can ring.",
  },
  {
    id: "cadd9-open",
    chordSymbol: "Cadd9",
    displayName: "C add 9",
    quality: "added",
    positionLabel: "Open",
    frets: [null, 3, 2, 0, 3, 3],
    fingers: [null, 2, 1, null, 3, 4],
    tip: "Keep the two highest strings at fret three. Strum from A and let G ring open.",
  },
  {
    id: "gadd9-open",
    chordSymbol: "Gadd9",
    displayName: "G add 9",
    quality: "added",
    positionLabel: "Open",
    frets: [3, 2, 0, 2, 0, 3],
    fingers: [3, 1, null, 2, null, 4],
    tip: "Let D and B ring open. Add the G-string note at fret two for the ninth.",
  },
];

export const ADDITIONAL_VOICINGS: readonly GuitarVoicing[] = [
  ...open,
  ...movable.filter((v) => !open.some((o) => o.chordSymbol === v.chordSymbol)),
];
