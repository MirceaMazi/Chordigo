export type GuitarStringFret = number | null;

export type GuitarVoicing = {
  id: string;
  chordSymbol: string;
  displayName: string;
  quality: "major" | "minor" | "seventh";
  positionLabel: string;
  frets: readonly GuitarStringFret[];
  fingers: readonly (number | null)[];
  level?: number;
  tip?: string;
};

export type ProgressionTemplate = {
  id: string;
  name: string;
  tonic: string;
  romanNumerals: readonly string[];
};
