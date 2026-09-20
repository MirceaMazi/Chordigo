"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Copy, Plus, Save, Trash2 } from "lucide-react";
import { SectionGuide } from "@/components/section-guide";
import { GUITAR_VOICINGS, PROGRESSION_TEMPLATES, getVoicing } from "@/lib/music/catalog";
import { resolveProgression } from "@/lib/music/progressions";
import { deleteRoutine, saveRoutine } from "@/lib/practice-history/indexeddb-repository";
import type { SavedRoutine } from "@/lib/practice-history/types";

export function RoutineEditor({
  routine,
  onChange,
  saved,
  onError,
}: {
  routine: SavedRoutine;
  onChange: (routine: SavedRoutine) => void;
  saved: SavedRoutine[];
  onError: (message: string) => void;
}) {
  const [toAdd, setToAdd] = useState("c-major-open");
  const [savedMessage, setSavedMessage] = useState("");
  const change = (next: SavedRoutine) => {
    setSavedMessage("");
    onChange(next);
  };
  const move = (index: number, offset: number) => {
    const ids = [...routine.voicingIds];
    const durations = [...routine.durations];
    [ids[index], ids[index + offset]] = [ids[index + offset], ids[index]];
    [durations[index], durations[index + offset]] = [durations[index + offset], durations[index]];
    change({ ...routine, voicingIds: ids, durations });
  };
  const save = async () => {
    try {
      await saveRoutine({
        ...routine,
        name: routine.name.trim() || "My routine",
        id: crypto.randomUUID(),
      });
      setSavedMessage("Routine saved");
    } catch {
      onError("Your routine could not be saved. Please try again.");
    }
  };
  return (
    <section className="routine-editor panel" aria-label="Custom routine editor">
      <div className="section-topline">
        <div>
          <span className="eyebrow">Make it yours</span>
          <h2>Your chord sequence</h2>
        </div>
        <label className="field">
          <span>Load a progression</span>
          <select
            aria-label="Progression"
            defaultValue=""
            onChange={(e) => {
              const preset = PROGRESSION_TEMPLATES.find((t) => t.id === e.target.value);
              const existing = saved.find((s) => s.id === e.target.value);
              if (preset) {
                const ids = resolveProgression(preset).map((v) => v.id);
                change({
                  ...routine,
                  name: preset.name,
                  voicingIds: ids,
                  durations: ids.map(() => 4),
                });
              } else if (existing) change({ ...existing, id: "draft" });
            }}
          >
            <option value="" disabled>
              Choose a starting point
            </option>
            <optgroup label="Ready to play">
              {PROGRESSION_TEMPLATES.map((t) => (
                <option value={t.id} key={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
            {saved.length > 0 && (
              <optgroup label="Your saved routines">
                {saved.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
      </div>
      <p className="routine-explainer">
        Write the order you want to play. The sequence loops until the session ends, including any
        repeated chords.
      </p>
      <SectionGuide title="How to make your own routine" open>
        <ol>
          <li>
            Use the Em → G starter, or load a progression to replace the sequence with a ready-made
            starting point.
          </li>
          <li>
            Choose a chord and press Add chord. Use the arrows to reorder it, the copy button to
            repeat it, or the bin to remove it.
          </li>
          <li>
            Beats is the time you spend on that step. Em for 4 beats, then Em again for 4 beats,
            gives you two turns without changing shape.
          </li>
          <li>
            Set your tempo below and the session length in Session settings. Press Start practicing
            when you are ready.
          </li>
        </ol>
        <p>
          Your edits save as a draft. Give it a name and press Save routine to keep a reusable
          version in Load a progression.
        </p>
      </SectionGuide>
      <ol className="sequence-steps">
        {routine.voicingIds.map((id, i) => (
          <li key={`${i}-${id}`}>
            <div className="sequence-chord">
              <span>{String(i + 1).padStart(2, "0")}</span>
              <strong>{getVoicing(id).chordSymbol}</strong>
            </div>
            <label className="field">
              <span>Beats</span>
              <select
                aria-label={`Beats for chord ${i + 1}`}
                value={routine.durations[i]}
                onChange={(e) =>
                  change({
                    ...routine,
                    durations: routine.durations.map((d, index) =>
                      index === i ? Number(e.target.value) : d,
                    ),
                  })
                }
              >
                {[1, 2, 3, 4, 6, 8].map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </label>
            <div className="sequence-actions">
              <button
                className="icon-button"
                disabled={routine.voicingIds.length >= 16}
                aria-label={`Repeat ${getVoicing(id).chordSymbol} after step ${i + 1}`}
                title="Repeat this chord"
                onClick={() =>
                  change({
                    ...routine,
                    voicingIds: [
                      ...routine.voicingIds.slice(0, i + 1),
                      id,
                      ...routine.voicingIds.slice(i + 1),
                    ],
                    durations: [
                      ...routine.durations.slice(0, i + 1),
                      routine.durations[i],
                      ...routine.durations.slice(i + 1),
                    ],
                  })
                }
              >
                <Copy size={14} />
              </button>
              <button
                className="icon-button"
                disabled={i === 0}
                aria-label={`Move ${getVoicing(id).chordSymbol} left`}
                onClick={() => move(i, -1)}
              >
                <ArrowLeft size={14} />
              </button>
              <button
                className="icon-button"
                disabled={i === routine.voicingIds.length - 1}
                aria-label={`Move ${getVoicing(id).chordSymbol} right`}
                onClick={() => move(i, 1)}
              >
                <ArrowRight size={14} />
              </button>
              <button
                className="icon-button"
                disabled={routine.voicingIds.length === 1}
                aria-label={`Remove ${getVoicing(id).chordSymbol}`}
                onClick={() =>
                  change({
                    ...routine,
                    voicingIds: routine.voicingIds.filter((_, j) => j !== i),
                    durations: routine.durations.filter((_, j) => j !== i),
                  })
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <div className="routine-bottom">
        <div className="inline-controls">
          <select
            aria-label="Chord to add"
            value={toAdd}
            onChange={(e) => setToAdd(e.target.value)}
          >
            {GUITAR_VOICINGS.map((v) => (
              <option value={v.id} key={v.id}>
                {v.displayName}
              </option>
            ))}
          </select>
          <button
            className="secondary-button"
            aria-label="Add chord to sequence"
            disabled={routine.voicingIds.length >= 16}
            onClick={() =>
              change({
                ...routine,
                voicingIds: [...routine.voicingIds, toAdd],
                durations: [...routine.durations, 4],
              })
            }
          >
            <Plus size={16} />
            Add chord
          </button>
        </div>
        <div className="inline-controls">
          <input
            aria-label="Routine name"
            maxLength={50}
            value={routine.name}
            placeholder="Name your routine"
            onChange={(e) => change({ ...routine, name: e.target.value })}
          />
          <button className="secondary-button" onClick={() => void save()}>
            <Save size={16} />
            Save routine
          </button>
        </div>
      </div>
      <div className="routine-saved" aria-live="polite">
        {savedMessage || "Your current sequence saves automatically."}
      </div>
      {saved.length > 0 && (
        <details className="saved-routine-list">
          <summary>Manage saved routines ({saved.length})</summary>
          {saved.map((s) => (
            <div key={s.id}>
              <span>{s.name}</span>
              <button
                className="text-button"
                aria-label={`Delete ${s.name}`}
                onClick={() =>
                  void deleteRoutine(s.id).catch(() => onError("Could not delete this routine."))
                }
              >
                Delete
              </button>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
