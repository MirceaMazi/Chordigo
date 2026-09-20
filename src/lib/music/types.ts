export type GuitarStringFret = number | null;

export type GuitarVoicing = {
  id: string;
  chordSymbol: string;
  displayName: string;
  quality:
    | "major"
    | "minor"
    | "seventh"
    | "major-seventh"
    | "minor-seventh"
    | "suspended"
    | "added"
    | "power";
  positionLabel: string;
  frets: readonly GuitarStringFret[];
  fingers: readonly (number | null)[];
  level?: number;
  tip?: string;
  aliases?: readonly string[];
  optionalPitchClasses?: readonly string[];
};

export type ProgressionTemplate = {
  id: string;
  name: string;
  tonic: string;
  romanNumerals: readonly string[];
};
