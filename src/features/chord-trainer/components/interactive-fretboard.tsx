import type { GuitarStringFret } from "@/lib/music/types";
import { GUITAR_STRING_LABELS, type PlayedString } from "../domain/chord-shape";

type InteractiveFretboardProps = {
  selectedFrets: readonly GuitarStringFret[];
  playedStrings: readonly PlayedString[];
  incorrectStringIndexes: readonly number[];
  firstFret: number;
  onSelectFret: (stringIndex: number, fret: GuitarStringFret) => void;
};

export function InteractiveFretboard({
  selectedFrets,
  playedStrings,
  incorrectStringIndexes,
  firstFret,
  onSelectFret,
}: InteractiveFretboardProps) {
  const frets = Array.from({ length: 5 }, (_, i) => firstFret + i);
  return (
    <div className="horizontal-fretboard" role="group" aria-label="Interactive guitar fretboard">
      <div className="horizontal-fretboard-heading" aria-hidden="true">
        <span>Str.</span>
        <span>○ / ×</span>
        {frets.map((fret) => (
          <span key={fret}>{fret}</span>
        ))}
        <span>Note</span>
      </div>
      {[5, 4, 3, 2, 1, 0].map((stringIndex) => {
        const label = GUITAR_STRING_LABELS[stringIndex];
        const selected = selectedFrets[stringIndex];
        const played = playedStrings.find((item) => item.stringIndex === stringIndex);
        const incorrect = incorrectStringIndexes.includes(stringIndex);
        return (
          <div
            className={`horizontal-string-row string-${stringIndex} ${incorrect ? "is-incorrect" : ""}`}
            key={label}
          >
            <span className="horizontal-string-label">
              {label === "High E" ? "e" : label === "Low E" ? "E" : label}
              <small>{6 - stringIndex}</small>
            </span>
            <button
              className={`string-state-button ${selected === null ? "is-muted" : "is-open"} ${incorrect ? "is-incorrect" : ""}`}
              type="button"
              aria-label={
                selected === null
                  ? `Set ${label} string open`
                  : selected === 0
                    ? `Mute ${label} string`
                    : `Mute ${label} string from fret ${selected}`
              }
              title={selected === null ? `Open ${label}` : `Mute ${label}`}
              onClick={() => onSelectFret(stringIndex, selected === null ? 0 : null)}
            >
              {selected === null ? "×" : selected === 0 ? "○" : "·"}
            </button>
            {frets.map((fret) => (
              <button
                className={`horizontal-fret-cell ${firstFret === 1 && fret === 1 ? "is-first-fret" : ""} ${selected === fret ? "is-selected" : ""}`}
                type="button"
                key={fret}
                aria-label={
                  selected === fret
                    ? `Clear ${label} string fret ${fret}`
                    : `Set ${label} string fret ${fret}`
                }
                aria-pressed={selected === fret}
                onClick={() => onSelectFret(stringIndex, selected === fret ? 0 : fret)}
              >
                <span className="horizontal-string-line" aria-hidden="true" />
                {selected === fret && (
                  <span className="selected-fret-dot" aria-hidden="true">
                    {played?.pitchClass}
                  </span>
                )}
              </button>
            ))}
            <output aria-label={`${label} selected note`}>{played?.pitchClass ?? "—"}</output>
          </div>
        );
      })}
      <p className="fretboard-orientation">
        Thin high E at the top · thick low E at the bottom · frets run left to right
      </p>
    </div>
  );
}
