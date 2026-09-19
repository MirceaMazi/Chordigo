import { Progression } from "tonal";
import { getVoicingBySymbol } from "./catalog";
import type { GuitarVoicing, ProgressionTemplate } from "./types";

export function resolveProgression(template: ProgressionTemplate): readonly GuitarVoicing[] {
  return Progression.fromRomanNumerals(
    template.tonic,
    template.romanNumerals.map(toTonalRomanNumeral),
  ).map(getVoicingBySymbol);
}

export function toTonalRomanNumeral(numeral: string): string {
  const match = /^([b#]*)([ivIV]+)(.*)$/.exec(numeral);
  if (!match) {
    throw new Error(`Invalid Roman numeral: ${numeral}.`);
  }

  const [, accidental, degree, suffix] = match;
  const isMinor = degree === degree.toLowerCase();
  return `${accidental}${degree.toUpperCase()}${isMinor ? "m" : ""}${suffix}`;
}
