"use client";

import {
  ArrowRight,
  Check,
  Clock3,
  Download,
  Flame,
  Guitar,
  ShieldCheck,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { GUITAR_VOICINGS, getVoicing } from "@/lib/music/catalog";
import {
  clearPracticeHistory,
  exportPracticeData,
  importPracticeData,
} from "@/lib/practice-history/indexeddb-repository";
import { useLearningProfile } from "@/lib/practice-history/use-learning-profile";
import {
  activityStats,
  chordEvidence,
  getCurriculum,
  getTransitions,
  LEVELS,
  localDay,
} from "@/features/practice/domain/curriculum";
import { formatTime } from "@/features/practice/components/practice-workspace";

export function ProgressDashboard() {
  const profile = useLearningProfile();
  const [context, setContext] = useState<"progression" | "chord-trainer">("progression");
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const importInput = useRef<HTMLInputElement | null>(null);
  const restore = async (file: File) => {
    setBusy(true);
    try {
      if (file.size > 30_000_000) throw new Error("Choose a Chordigo backup under 30 MB.");
      await importPracticeData(await file.text());
      setNotice("Backup restored. Existing progress was kept and duplicate attempts were skipped.");
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This backup could not be restored.");
    } finally {
      setBusy(false);
      if (importInput.current) importInput.current.value = "";
    }
  };
  const activity = activityStats(profile.sessions);
  const curriculum = getCurriculum(profile.observations, profile.preferences.experience);
  const transitions = getTransitions(profile.observations);
  const playing = profile.observations.filter(
    (o) => o.context === "progression" && o.result !== "uncertain",
  );
  const accuracy = playing.length
    ? Math.round((playing.filter((o) => o.result === "correct").length / playing.length) * 100)
    : null;
  const steady = GUITAR_VOICINGS.filter(
    (v) => chordEvidence(v.id, profile.observations, "progression").steady,
  ).length;
  const today = new Date();
  const gridStart = new Date(today);
  gridStart.setDate(today.getDate() - 12 * 7 - today.getDay());
  const days = Array.from({ length: 91 }, (_, i) => {
    const date = new Date(gridStart);
    date.setDate(date.getDate() + i);
    return date;
  });
  const noHistory =
    !profile.loading &&
    profile.observations.length === 0 &&
    !profile.sessions.some((s) => s.durationSeconds > 0);
  const exportData = async () => {
    setBusy(true);
    try {
      const data = await exportPracticeData();
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `chordigo-${localDay(new Date())}.json`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Your practice backup has been downloaded.");
      setError(null);
    } catch {
      setError("Your backup could not be downloaded. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const reset = async () => {
    setBusy(true);
    try {
      await clearPracticeHistory();
      setConfirmReset(false);
      setNotice("Practice history cleared. Your saved routines and preferences are still here.");
      setError(null);
    } catch {
      setError("History could not be cleared. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main id="main-content" className="content-page progress-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Look how far you’ve come</p>
          <h1>
            Little by little<span className="accent-period">.</span>
          </h1>
          <p className="page-description">
            Every time you pick up your guitar, you’re building something.
          </p>
        </div>
        <Link href="/practice" className="secondary-button">
          Keep playing <ArrowRight size={15} />
        </Link>
      </div>
      {profile.loading ? (
        <div className="loading-surface" role="status">
          Opening your practice journal…
        </div>
      ) : (
        <>
          {noHistory && (
            <section className="progress-empty">
              <Guitar size={30} strokeWidth={1.3} />
              <div>
                <h2>Your story starts with a few chords.</h2>
                <p>
                  Finish a short practice or try the shape trainer. Your progress will find a home
                  here.
                </p>
              </div>
              <Link className="primary-button" href="/practice">
                Start your first practice <ArrowRight size={15} />
              </Link>
            </section>
          )}
          <section className="stats-grid" aria-label="Practice summary">
            <div className="stat-card panel">
              <span>
                <Clock3 size={16} />
                Time well spent
              </span>
              <strong>
                {Math.floor(activity.totalSeconds / 60)}
                <small> min</small>
              </strong>
              <small>
                {profile.sessions.filter((s) => s.durationSeconds > 0).length} practice sessions
              </small>
            </div>
            <div className="stat-card panel">
              <span>
                <Flame size={16} />
                Showing up
              </span>
              <strong>
                {activity.streak}
                <small> days</small>
              </strong>
              <small>Current practice streak</small>
            </div>
            <div className="stat-card panel">
              <span>
                <Check size={16} />
                Clean changes
              </span>
              <strong>{accuracy === null ? "—" : `${accuracy}%`}</strong>
              <small>
                {playing.length
                  ? `From ${playing.length} explicit playing reports`
                  : "Report a few changes to begin"}
              </small>
            </div>
            <div className="stat-card panel">
              <span>
                <Guitar size={16} />
                Feeling familiar
              </span>
              <strong>
                {steady}
                <small> / 13</small>
              </strong>
              <small>Chords with steady playing confidence</small>
            </div>
          </section>
          <div className="progress-layout">
            <div>
              <section className="activity-panel panel">
                <div className="section-topline">
                  <h2>A habit worth keeping</h2>
                  <span>The last 13 weeks</span>
                </div>
                <div
                  className="activity-grid"
                  role="img"
                  aria-label={`Practice activity over 13 weeks. ${activity.byDay.size} days with recorded practice.`}
                  style={{ gridTemplateColumns: "repeat(13, minmax(0, 1fr))" }}
                >
                  {days.map((day) => {
                    const seconds = activity.byDay.get(localDay(day)) ?? 0;
                    const level =
                      seconds === 0
                        ? 0
                        : seconds < 60
                          ? 1
                          : seconds < 300
                            ? 2
                            : seconds < 600
                              ? 3
                              : 4;
                    return (
                      <div
                        className={`activity-cell ${localDay(day) > localDay(today) ? "future" : ""}`}
                        data-level={level}
                        title={`${day.toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${Math.floor(seconds / 60)} min ${Math.floor(seconds % 60)} sec`}
                        key={localDay(day)}
                      />
                    );
                  })}
                </div>
                <div className="activity-legend">
                  <span>Less</span>
                  {[0, 1, 2, 3, 4].map((n) => (
                    <i className="activity-cell" data-level={n} key={n} />
                  ))}
                  <span>More</span>
                </div>
              </section>
              <section className="skill-table panel" aria-labelledby="skills-heading">
                <div className="skill-table-heading">
                  <div>
                    <h2 id="skills-heading">Your chords, getting stronger</h2>
                    <p>
                      {context === "progression"
                        ? "Your latest 20 reports for each chord. No report means no score."
                        : "Your latest 20 unassisted shape checks. Hints stay unscored."}
                    </p>
                  </div>
                  <div className="segmented-control" role="group" aria-label="Progress evidence">
                    <button
                      className={context === "progression" ? "is-selected" : ""}
                      aria-pressed={context === "progression"}
                      onClick={() => setContext("progression")}
                    >
                      Playing
                    </button>
                    <button
                      className={context === "chord-trainer" ? "is-selected" : ""}
                      aria-pressed={context === "chord-trainer"}
                      onClick={() => setContext("chord-trainer")}
                    >
                      Shapes
                    </button>
                  </div>
                </div>
                <div className="skill-list">
                  {[...GUITAR_VOICINGS]
                    .sort((a, b) => (a.level ?? 1) - (b.level ?? 1))
                    .map((v) => {
                      const e = chordEvidence(v.id, profile.observations, context);
                      const label =
                        e.attempts === 0
                          ? "New"
                          : e.steady
                            ? "Steady"
                            : (e.accuracy ?? 0) < 0.65
                              ? "Focus"
                              : "Growing";
                      return (
                        <Link href={`/chords?chord=${v.id}`} className="skill-row" key={v.id}>
                          <div className="skill-name">
                            <strong>{v.chordSymbol}</strong>
                            <span>{v.displayName}</span>
                          </div>
                          <div
                            className="accuracy-track"
                            role="meter"
                            aria-label={`${v.chordSymbol} confidence`}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={e.mastery}
                            aria-valuetext={
                              e.attempts ? `${e.mastery}% confidence` : "No attempts yet"
                            }
                          >
                            <span style={{ width: `${e.mastery}%` }} />
                          </div>
                          <div className="skill-value">
                            <strong>
                              {e.accuracy === null ? "—" : `${Math.round(e.accuracy * 100)}%`}
                            </strong>
                            <span>
                              {e.attempts} {e.attempts === 1 ? "attempt" : "attempts"}
                            </span>
                          </div>
                          <span
                            className={`need-label ${label === "New" ? "is-new" : label === "Focus" ? "is-high" : ""}`}
                          >
                            {label}
                          </span>
                        </Link>
                      );
                    })}
                </div>
              </section>
            </div>
            <aside className="progress-side">
              <section className="progress-side-panel panel">
                <p className="eyebrow">Your learning path</p>
                <h2>
                  Level {curriculum.level}: {curriculum.stage.name}
                </h2>
                <p>{curriculum.stage.description}</p>
                <div className="learning-path">
                  {LEVELS.map((level, i) => (
                    <div key={level.name}>
                      <span className={i + 1 <= curriculum.level ? "path-unlocked" : ""}>
                        {i + 1 < curriculum.level ? <Check size={12} /> : i + 1}
                      </span>
                      <p>
                        <strong>{level.name}</strong>
                        <small>{level.symbols.join(" · ")}</small>
                      </p>
                    </div>
                  ))}
                </div>
                <p style={{ marginTop: 17, fontSize: 10 }}>
                  Reach 80% clean reports across at least 8 attempts per unlocked chord to open the
                  next level.
                </p>
              </section>
              <section className="progress-side-panel panel">
                <p className="eyebrow">Between the chords</p>
                <h2>Changes to come back to</h2>
                {transitions.length ? (
                  transitions.slice(0, 5).map((t) => (
                    <div className="transition-item" key={t.id}>
                      <div>
                        <strong>
                          {getVoicing(t.from).chordSymbol} → {getVoicing(t.to).chordSymbol}
                        </strong>
                        <span>{t.attempts} reported changes</span>
                      </div>
                      <div>
                        {Math.round(t.accuracy * 100)}% clean
                        <br />
                        <span>{t.bpm ? `Up to ${t.bpm} BPM` : "Take it slowly"}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p>
                    Report a chord change during practice to see which movements feel natural and
                    which need another turn.
                  </p>
                )}
              </section>
            </aside>
          </div>
          <section className="session-history panel">
            <div className="section-topline">
              <h2>Your practice journal</h2>
              <span>{profile.sessions.length} sessions</span>
            </div>
            {profile.sessions.length ? (
              profile.sessions.slice(0, 30).map((s) => (
                <details className="history-item" key={s.id}>
                  <summary>
                    <div>
                      <strong>{s.name}</strong>
                      <span>
                        {new Date(s.startedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        ·{" "}
                        {new Date(s.startedAt).toLocaleTimeString(undefined, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {s.mode === "adaptive" ? "Adaptive" : "Custom routine"}
                      </span>
                    </div>
                    <div>
                      <strong>
                        {formatTime(s.durationSeconds)} · {s.bpm} BPM
                      </strong>
                      <span>
                        {s.status === "active"
                          ? "Interrupted · last saved checkpoint"
                          : s.status === "interrupted"
                            ? "Finished when you left the page"
                            : "Completed"}
                      </span>
                    </div>
                  </summary>
                  <div className="history-detail">
                    <p className="routine-symbols">
                      {s.voicingIds.map((id) => getVoicing(id).chordSymbol).join(" → ")}
                    </p>
                    <p>
                      {s.correct} reported clean · {s.misses} reported missed · {s.completedChanges}{" "}
                      full chord steps practiced
                    </p>
                    <p>
                      {s.durations.join(" / ")} beats per step ·{" "}
                      {s.beatsPerBar === 6 ? "6/8" : `${s.beatsPerBar}/4`} time
                    </p>
                    <p>
                      Only reported changes are scored. Unreported playing counts toward your
                      practice time.
                    </p>
                  </div>
                </details>
              ))
            ) : (
              <p className="small-muted">
                Your completed sessions will appear here. A minute of practice is a good beginning.
              </p>
            )}
            {profile.sessions.length > 30 && (
              <p className="small-muted">
                Showing your 30 most recent sessions. Your download includes the complete history.
              </p>
            )}
          </section>
          <details className="data-panel panel">
            <summary>
              <ShieldCheck size={16} />
              Your progress belongs to you
            </summary>
            <p>
              History stays in this browser on this device. Download a backup before clearing
              browser data or changing devices. Your practice never needs an account.
            </p>
            <div className="heading-actions">
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => void exportData()}
              >
                <Download size={15} />
                Download backup
              </button>
              <input
                ref={importInput}
                type="file"
                accept="application/json,.json"
                aria-label="Restore Chordigo backup"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void restore(file);
                }}
              />
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => importInput.current?.click()}
              >
                <Upload size={15} />
                Restore backup
              </button>
              <button
                className="secondary-button danger-button"
                disabled={busy || (!profile.observations.length && !profile.sessions.length)}
                onClick={() => setConfirmReset(true)}
              >
                <Trash2 size={15} />
                Reset practice history
              </button>
            </div>
            {confirmReset && (
              <div className="reset-confirmation">
                <strong>Clear all practice history on this device?</strong>
                <p>
                  This removes attempts, skill scores, and sessions. Your routines and preferences
                  are kept.
                </p>
                <div className="heading-actions">
                  <button
                    className="secondary-button danger-button"
                    disabled={busy}
                    onClick={() => void reset()}
                  >
                    Yes, clear history
                  </button>
                  <button
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => setConfirmReset(false)}
                  >
                    Keep my progress
                  </button>
                </div>
              </div>
            )}
            <p role="status">{notice}</p>
          </details>
        </>
      )}
      {error || profile.error ? (
        <p className="error-notice" role="alert">
          {error || profile.error}
        </p>
      ) : null}
    </main>
  );
}
