import type { GuitarStringFret } from "@/lib/music/types";
import { GUITAR_STRING_LABELS, type PlayedString } from "../domain/chord-shape";

const STRING_SHORT_LABELS = ["E", "A", "D", "G", "B", "E"] as const;
const DISPLAYED_FRETS = [1, 2, 3, 4, 5] as const;

type InteractiveFretboardProps = {
  selectedFrets: readonly GuitarStringFret[];
  playedStrings: readonly PlayedString[];
  incorrectStringIndexes: readonly number[];
  onSelectFret: (stringIndex: number, fret: GuitarStringFret) => void;
};

export function InteractiveFretboard({
  selectedFrets,
  playedStrings,
  incorrectStringIndexes,
  onSelectFret,
}: InteractiveFretboardProps) {
  return (
    <div className="interactive-fretboard" role="group" aria-label="Interactive guitar fretboard">
      <div className="fretboard-string-labels" aria-hidden="true">
        <span />
        {STRING_SHORT_LABELS.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>

      <div className="fretboard-string-states">
        <span className="fretboard-axis-label">Nut</span>
        {GUITAR_STRING_LABELS.map((label, stringIndex) => {
          const selectedFret = selectedFrets[stringIndex];
          const isOpen = selectedFret === 0;
          const isMuted = selectedFret === null;
          const isIncorrect = incorrectStringIndexes.includes(stringIndex);
          const nextFret = isMuted ? 0 : null;

          return (
            <button
              className={[
                "string-state-button",
                isOpen ? "is-open" : "",
                isMuted ? "is-muted" : "is-sounding",
                isIncorrect ? "is-incorrect" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              type="button"
              aria-label={
                isMuted
                  ? `Set ${label} string open`
                  : isOpen
                    ? `Mute ${label} string`
                    : `Mute ${label} string from fret ${selectedFret}`
              }
              title={isMuted ? `Set ${label} open` : `Mute ${label}`}
              onClick={() => onSelectFret(stringIndex, nextFret)}
              key={label}
            >
              {isMuted ? "x" : isOpen ? "o" : "-"}
            </button>
          );
        })}
      </div>

      <div className="interactive-fret-grid">
        {DISPLAYED_FRETS.map((fret) => (
          <FretRow
            fret={fret}
            selectedFrets={selectedFrets}
            playedStrings={playedStrings}
            incorrectStringIndexes={incorrectStringIndexes}
            onSelectFret={onSelectFret}
            key={fret}
          />
        ))}
      </div>

      <div className="fretboard-note-row" role="group" aria-label="Selected notes">
        <span className="fretboard-axis-label">Note</span>
        {GUITAR_STRING_LABELS.map((label, stringIndex) => {
          const played = playedStrings.find((item) => item.stringIndex === stringIndex);
          return (
            <output aria-label={`${label} selected note`} key={label}>
              {played?.pitchClass ?? "-"}
            </output>
          );
        })}
      </div>
    </div>
  );
}

type FretRowProps = InteractiveFretboardProps & {
  fret: number;
};

function FretRow({
  fret,
  selectedFrets,
  playedStrings,
  incorrectStringIndexes,
  onSelectFret,
}: FretRowProps) {
  return (
    <>
      <span className="fret-number" aria-hidden="true">
        {fret}
      </span>
      {GUITAR_STRING_LABELS.map((label, stringIndex) => {
        const isSelected = selectedFrets[stringIndex] === fret;
        const isIncorrect = incorrectStringIndexes.includes(stringIndex);
        const played = playedStrings.find((item) => item.stringIndex === stringIndex);

        return (
          <button
            className={[
              "interactive-fret-cell",
              fret === 1 ? "is-first-fret" : "",
              isSelected ? "is-selected" : "",
              isIncorrect ? "is-incorrect" : "",
              `string-${stringIndex}`,
            ]
              .filter(Boolean)
              .join(" ")}
            type="button"
            aria-label={
              isSelected ? `Clear ${label} string fret ${fret}` : `Set ${label} string fret ${fret}`
            }
            aria-pressed={isSelected}
            onClick={() => onSelectFret(stringIndex, isSelected ? null : fret)}
            key={label}
          >
            <span className="interactive-string-line" aria-hidden="true" />
            {isSelected ? (
              <span className="selected-fret-dot" aria-hidden="true">
                {played?.pitchClass}
              </span>
            ) : null}
          </button>
        );
      })}
    </>
  );
}
