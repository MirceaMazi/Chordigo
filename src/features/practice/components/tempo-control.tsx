"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";

export function TempoControl({
  bpm,
  disabled,
  onChange,
  onTap,
}: {
  bpm: number;
  disabled: boolean;
  onChange: (bpm: number) => void;
  onTap: () => void;
}) {
  const commit = (input: HTMLInputElement) => {
    const draft = input.value;
    const parsed = Number(draft);
    const next =
      draft.trim() && Number.isFinite(parsed)
        ? Math.max(40, Math.min(160, Math.round(parsed)))
        : bpm;
    input.value = String(next);
    onChange(next);
  };
  return (
    <div className="tempo-control">
      <button
        className="icon-button"
        aria-label="Decrease tempo by one BPM"
        disabled={disabled || bpm <= 40}
        onClick={() => onChange(bpm - 1)}
      >
        <Minus size={16} />
      </button>
      <label className="tempo-readout">
        <input
          aria-label="Tempo in BPM"
          type="number"
          min={40}
          max={160}
          step={1}
          key={bpm}
          defaultValue={bpm}
          disabled={disabled}
          onBlur={(e) => commit(e.currentTarget)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <span>BPM</span>
      </label>
      <button
        className="icon-button"
        aria-label="Increase tempo by one BPM"
        disabled={disabled || bpm >= 160}
        onClick={() => onChange(bpm + 1)}
      >
        <Plus size={16} />
      </button>
      <button className="text-button tap-tempo" disabled={disabled} onClick={onTap}>
        Tap tempo
      </button>
      <button
        className="icon-button"
        aria-label="Reset tempo to 60 BPM"
        title="Reset to 60 BPM"
        disabled={disabled}
        onClick={() => onChange(60)}
      >
        <RotateCcw size={15} />
      </button>
    </div>
  );
}
