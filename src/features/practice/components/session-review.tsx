"use client";

import { useId, useState } from "react";
import type { PracticeSession } from "@/lib/practice-history/types";
import { reviewableChords, type ReviewAnswers } from "../domain/session-review";

export function SessionReview({
  session,
  saving,
  onReview,
}: {
  session: PracticeSession;
  saving: boolean;
  onReview: (answers: ReviewAnswers) => Promise<void>;
}) {
  const [answers, setAnswers] = useState<ReviewAnswers>({});
  const headingId = useId();
  const groups = reviewableChords(session);
  if (session.reviewedAt)
    return (
      <p className="review-saved" role="status">
        Your review is saved. It will help choose your next lesson.
      </p>
    );
  if (!groups.length)
    return (
      <p className="small-muted">
        Finish at least one chord step to review it. Your practice time still counts.
      </p>
    );
  return (
    <section className="session-review" aria-labelledby={headingId}>
      <h3 id={headingId}>Guitar down. How did those chords feel?</h3>
      <p>
        About how many sounded clean and arrived on time? An honest estimate helps. Leave any chord
        you’re unsure about unscored.
      </p>
      <div className="review-chords">
        {groups.map(({ voicing, count }) => (
          <div className="review-chord" key={voicing.id}>
            <div>
              <strong>{voicing.chordSymbol}</strong>
              <span>
                {count} {count === 1 ? "turn" : "turns"} played
              </span>
            </div>
            <label className="field">
              <span>Clean {voicing.chordSymbol} chords</span>
              <select
                value={answers[voicing.id] ?? ""}
                disabled={saving}
                onChange={(event) =>
                  setAnswers((current) => {
                    const next = { ...current };
                    if (event.target.value === "") delete next[voicing.id];
                    else next[voicing.id] = Number(event.target.value);
                    return next;
                  })
                }
              >
                <option value="">Leave unscored</option>
                {Array.from({ length: count + 1 }, (_, n) => (
                  <option value={n} key={n}>
                    {n} of {count}
                    {n === count ? " · all clean" : n === 0 ? " · needs practice" : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="text-button"
              disabled={saving}
              aria-label={`All ${voicing.chordSymbol} chords felt clean`}
              onClick={() => setAnswers((current) => ({ ...current, [voicing.id]: count }))}
            >
              All felt clean
            </button>
          </div>
        ))}
      </div>
      <button
        className="secondary-button"
        disabled={saving || !Object.keys(answers).length}
        onClick={() => void onReview(answers)}
      >
        {saving ? "Saving review…" : "Save my review"}
      </button>
      <p className="small-muted">
        This is your own assessment. You can continue without reviewing; practice time is saved
        either way.
      </p>
    </section>
  );
}
