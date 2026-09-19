"use client";

import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  Flame,
  Headphones,
  LockKeyhole,
  Minus,
  Play,
  Plus,
  Settings2,
  Sprout,
  Square,
  Target,
  Volume2,
  X,
} from "lucide-react";
import Link from "next/link";
import { PracticeNook } from "@/components/practice-nook";
import { useEffect, useMemo, useRef, useState } from "react";
import { GUITAR_VOICINGS, getVoicing } from "@/lib/music/catalog";
import { useReferenceAudio } from "@/lib/music/use-reference-audio";
import { savePreferences, saveRoutine } from "@/lib/practice-history/indexeddb-repository";
import { useLearningProfile } from "@/lib/practice-history/use-learning-profile";
import type { PracticePreferences, SavedRoutine } from "@/lib/practice-history/types";
import {
  activityStats,
  chordEvidence,
  getCurriculum,
  LEVELS,
  recommendedTempo,
} from "../domain/curriculum";
import { createSessionPlan, getSessionCue } from "../domain/session-plan";
import { usePracticeSession } from "../use-practice-session";
import { ChordDiagram } from "./chord-diagram";
import { RoutineEditor } from "./routine-editor";

export function PracticeWorkspace() {
  const profile = useLearningProfile();
  if (profile.loading)
    return (
      <main id="main-content" className="content-page">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Your practice corner</p>
            <h1>Make a little music.</h1>
          </div>
        </div>
        <div className="loading-surface" role="status">
          Getting your practice ready…
        </div>
      </main>
    );
  return <PracticeSurface profile={profile} />;
}

function PracticeSurface({ profile }: { profile: ReturnType<typeof useLearningProfile> }) {
  const [preferences, setPreferences] = useState(profile.preferences);
  const [mode, setMode] = useState<"adaptive" | "manual">("adaptive");
  const [showSettings, setShowSettings] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [levelAtStart, setLevelAtStart] = useState(0);
  const [routine, setRoutine] = useState<SavedRoutine>(
    profile.routines.find((s) => s.id === "draft") ?? {
      id: "draft",
      name: "My first routine",
      voicingIds: ["c-major-open", "g-major-open", "a-minor-open", "e-minor-open"],
      durations: [4, 4, 4, 4],
      bpm: preferences.bpm,
      beatsPerBar: 4,
    },
  );
  const taps = useRef<number[]>([]);
  const session = usePracticeSession();
  const audio = useReferenceAudio();
  const curriculum = useMemo(
    () => getCurriculum(profile.observations, preferences.experience),
    [profile.observations, preferences.experience],
  );
  const activity = activityStats(profile.sessions);
  const ids = mode === "adaptive" ? curriculum.voicings.map((v) => v.id) : routine.voicingIds;
  const durations =
    mode === "adaptive" ? ids.map(() => preferences.beatsPerChord) : routine.durations;
  const preview = createSessionPlan(ids, durations, preferences.totalChanges);
  const plan = session.active?.plan ?? preview;
  const cue = getSessionCue(plan, session.active ? session.beat : 0);
  const countingIn = !!session.active && session.beat < 0;
  const running = !!session.active;
  const busy = running || session.starting;
  const nextCues = plan.cues.slice(cue.ordinal + 1, cue.ordinal + 4);
  const bpm = session.active?.session.bpm ?? preferences.bpm;
  const beatsPerBar = session.active?.session.beatsPerBar ?? preferences.beatsPerBar;
  const progress = Math.max(0, Math.min(100, (session.beat / plan.totalBeats) * 100));
  const hasReport = session.report?.ordinal === cue.ordinal && !countingIn;
  const minutes = Math.max(1, Math.round((preview.totalBeats * 60) / preferences.bpm / 60));
  useEffect(() => {
    if (running)
      document
        .querySelector(".practice-stage")
        ?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [running]);

  const updatePreferences = (patch: Partial<PracticePreferences>) => {
    const next = { ...preferences, ...patch };
    setPreferences(next);
    void savePreferences(next).catch(() =>
      setError("Your preferences could not be saved on this device."),
    );
    if (patch.volume !== undefined) session.setVolume(patch.volume);
  };
  const updateRoutine = (next: SavedRoutine) => {
    setRoutine(next);
    if (next.bpm !== preferences.bpm || next.beatsPerBar !== preferences.beatsPerBar)
      updatePreferences({ bpm: next.bpm, beatsPerBar: next.beatsPerBar });
    void saveRoutine({ ...next, id: "draft" }).catch(() =>
      setError("Your sequence could not be saved. Please try again."),
    );
  };
  const start = (nextBpm = preferences.bpm) => {
    audio.stop();
    setLevelAtStart(curriculum.level);
    if (preferences.showWelcome) updatePreferences({ showWelcome: false, bpm: nextBpm });
    void session.start(
      {
        name: mode === "adaptive" ? curriculum.stage.name : routine.name || "Custom routine",
        mode,
        bpm: nextBpm,
        beatsPerBar: preferences.beatsPerBar,
        voicingIds: ids,
        durations,
        totalChanges: preferences.totalChanges,
      },
      preferences.volume,
    );
  };
  const tapTempo = () => {
    const now = performance.now();
    if (now - (taps.current.at(-1) ?? 0) > 2000) taps.current = [];
    taps.current = [...taps.current.slice(-4), now];
    if (taps.current.length > 1)
      updatePreferences({
        bpm: Math.max(
          40,
          Math.min(160, Math.round((60000 * (taps.current.length - 1)) / (now - taps.current[0]))),
        ),
      });
  };
  const statusError = session.error || error || profile.error || audio.audioError;

  return (
    <main
      id="main-content"
      className={`content-page practice-page ${running ? "session-is-running" : ""}`}
    >
      <div className="page-heading">
        <div>
          <p className="eyebrow">Your practice corner</p>
          <h1>
            Make a little music<span className="accent-period">.</span>
          </h1>
          <p className="page-description">Pull up a chair. Take your time. Play a little.</p>
        </div>
        <div className="streak-badge">
          <Flame size={19} />
          <span>
            <strong>{activity.streak}</strong> day streak
          </span>
        </div>
      </div>

      {preferences.showWelcome && !busy && !session.recap && (
        <section className="welcome-note">
          <div className="welcome-icon">
            <Sprout size={21} />
          </div>
          <div>
            <strong>A good place to start.</strong>
            <p>Grab your guitar. We’ll start with two chords and build from there.</p>
            <button
              className="text-button"
              onClick={() => updatePreferences({ showWelcome: false })}
            >
              Sounds good <ArrowRight size={14} />
            </button>
            <button
              className="text-button muted"
              onClick={() => updatePreferences({ experience: "returning", showWelcome: false })}
            >
              I already know a few chords
            </button>
          </div>
          <button
            className="icon-button"
            aria-label="Dismiss welcome"
            onClick={() => updatePreferences({ showWelcome: false })}
          >
            <X size={17} />
          </button>
        </section>
      )}

      <div className="practice-layout">
        <div className="practice-main">
          <div className="practice-toolbar">
            <div className="segmented-control" role="group" aria-label="Practice mode">
              <button
                className={mode === "adaptive" ? "is-selected" : ""}
                aria-pressed={mode === "adaptive"}
                disabled={busy}
                onClick={() => {
                  setMode("adaptive");
                  session.dismissRecap();
                }}
              >
                <Sprout size={15} />
                Adaptive
              </button>
              <button
                className={mode === "manual" ? "is-selected" : ""}
                aria-pressed={mode === "manual"}
                disabled={busy}
                onClick={() => {
                  setMode("manual");
                  session.dismissRecap();
                }}
              >
                Manual
              </button>
            </div>
            <button
              className={`text-button settings-toggle ${showSettings ? "selected" : ""}`}
              aria-expanded={showSettings}
              disabled={busy}
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 size={16} />
              Session settings
            </button>
          </div>

          {showSettings && (
            <section className="settings-panel panel" aria-label="Session settings">
              <label className="field">
                <span>Time on each chord</span>
                <select
                  value={preferences.beatsPerChord}
                  disabled={mode === "manual"}
                  onChange={(e) => updatePreferences({ beatsPerChord: Number(e.target.value) })}
                >
                  {[4, 2, 1, 8].map((d) => (
                    <option value={d} key={d}>
                      {d} {d === 1 ? "beat" : "beats"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Session length</span>
                <select
                  value={preferences.totalChanges}
                  onChange={(e) => updatePreferences({ totalChanges: Number(e.target.value) })}
                >
                  {[8, 16, 32, 64].map((n) => (
                    <option value={n} key={n}>
                      {n} chord changes
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Time signature</span>
                <select
                  value={preferences.beatsPerBar}
                  onChange={(e) => updatePreferences({ beatsPerBar: Number(e.target.value) })}
                >
                  <option value="4">4/4</option>
                  <option value="3">3/4</option>
                  <option value="6">6/8</option>
                </select>
              </label>
              <label className="field">
                <span>Starting point</span>
                <select
                  value={preferences.experience}
                  onChange={(e) =>
                    updatePreferences({
                      experience: e.target.value as PracticePreferences["experience"],
                    })
                  }
                >
                  <option value="beginner">New to guitar</option>
                  <option value="returning">Know a few chords</option>
                </select>
              </label>
              <p>
                A full bar counts you in. In 6/8, each click is an eighth note. Custom routines use
                the duration on each step.
              </p>
            </section>
          )}

          {mode === "manual" && !busy && !session.recap && (
            <RoutineEditor
              routine={{ ...routine, bpm: preferences.bpm, beatsPerBar: preferences.beatsPerBar }}
              onChange={updateRoutine}
              saved={profile.routines.filter((r) => r.id !== "draft")}
              onError={setError}
            />
          )}

          {session.recap ? (
            <section className="session-recap panel" aria-labelledby="recap-title">
              <span className="recap-icon">
                <Check size={28} />
              </span>
              <p className="eyebrow">
                {session.recap.status === "interrupted"
                  ? "Session paused by leaving the page"
                  : "Session complete"}
              </p>
              <h2 id="recap-title">You showed up. That counts.</h2>
              <p>Let your hand relax for a moment. Here’s how that felt.</p>
              <div className="unlock-celebration" role="status">
                {levelAtStart > 0 && curriculum.level > levelAtStart && (
                  <>
                    <Sprout size={19} />
                    <p>
                      <strong>A new chapter: {curriculum.stage.name}</strong>
                      <span>
                        You unlocked {curriculum.stage.symbols.join(" / ")}. These chords will join
                        your next practice.
                      </span>
                    </p>
                  </>
                )}
              </div>
              <div className="recap-metrics">
                <div>
                  <strong>{formatTime(session.recap.durationSeconds)}</strong>
                  <span>Time practicing</span>
                </div>
                <div>
                  <strong>{session.recap.correct}</strong>
                  <span>Reported clean</span>
                </div>
                <div>
                  <strong>{session.recap.misses}</strong>
                  <span>To work on</span>
                </div>
              </div>
              <div className="recap-insight">
                <Sprout size={18} />
                <p>
                  {session.recap.correct + session.recap.misses < 4
                    ? "Use the Got it and Missed buttons while you play. A few reports help us choose your next challenge."
                    : recommendedTempo(
                          session.recap.bpm,
                          session.recap.correct,
                          session.recap.misses,
                        ) > session.recap.bpm
                      ? "Those changes are coming together. Try your next session 5 BPM faster."
                      : recommendedTempo(
                            session.recap.bpm,
                            session.recap.correct,
                            session.recap.misses,
                          ) < session.recap.bpm
                        ? "Give your fingers a little more room. Your next session is 5 BPM slower."
                        : "Stay at this tempo and let the movements become more familiar."}
                </p>
              </div>
              <div className="recap-actions">
                <button
                  className="primary-button"
                  disabled={session.saving}
                  onClick={() => {
                    const next = recommendedTempo(
                      session.recap!.bpm,
                      session.recap!.correct,
                      session.recap!.misses,
                    );
                    updatePreferences({ bpm: next });
                    start(next);
                  }}
                >
                  <Play size={16} fill="currentColor" />
                  Practice again
                </button>
                <Link className="secondary-button" href="/progress">
                  View progress <ArrowRight size={16} />
                </Link>
              </div>
              <p className="small-muted" role="status">
                {session.saving
                  ? "Saving your session…"
                  : session.error
                    ? "Your session could not be saved. Keep this page open."
                    : "Session saved on this device. Only your explicit reports affect playing confidence."}
              </p>
              {session.saveError && (
                <button
                  className="secondary-button"
                  disabled={session.saving}
                  onClick={() => void session.retrySave()}
                >
                  Retry saving
                </button>
              )}
              <button className="text-button" onClick={session.dismissRecap}>
                Back to practice
              </button>
            </section>
          ) : (
            <>
              <section
                className={`practice-stage panel ${running ? "is-running" : ""}`}
                aria-label="Chord practice"
              >
                <div className="stage-topline">
                  <span className="transport-state">
                    <span className={`status-dot ${running ? "pulse" : ""}`} />
                    {countingIn ? "Count in" : running ? "Playing" : "Ready when you are"}
                  </span>
                  <span className="stage-session-length">
                    <Clock3 size={14} />
                    {running
                      ? `${Math.max(0, cue.ordinal + (countingIn ? 0 : 1))} / ${session.active!.session.totalChanges} changes`
                      : `About ${minutes} min · ${preferences.totalChanges} changes`}
                  </span>
                </div>
                <div className="session-progress-track">
                  <div style={{ width: running ? `${progress}%` : "0%" }} />
                </div>
                <div className="current-cue">
                  <div className="current-copy">
                    <span className="cue-label">
                      {countingIn
                        ? "GET READY TO PLAY"
                        : running
                          ? "PLAY THIS CHORD"
                          : "LET’S START WITH"}
                    </span>
                    <div className="chord-name">{cue.voicing.chordSymbol}</div>
                    <p className="current-chord-title">{cue.voicing.displayName}</p>
                    <span className="chord-position">
                      {cue.voicing.positionLabel} position <span>·</span> {cue.duration}{" "}
                      {cue.duration === 1 ? "beat" : "beats"}
                    </span>
                    <button
                      className="text-button hear-chord"
                      disabled={busy}
                      onClick={() => void audio.playChord(cue.voicing)}
                    >
                      <Volume2 size={15} />
                      Hear chord
                    </button>
                  </div>
                  <div className="current-diagram">
                    <ChordDiagram voicing={cue.voicing} />
                    <span className="diagram-caption">1 index · 2 middle · 3 ring · 4 pinky</span>
                  </div>
                </div>
                <div className="rhythm-row">
                  <span>
                    {countingIn
                      ? "Count yourself in"
                      : running
                        ? "Keep it steady"
                        : "One strum on every beat"}
                  </span>
                  <div
                    className="beat-indicator"
                    role="group"
                    aria-label={`Meter ${beatsPerBar === 6 ? "6/8" : `${beatsPerBar}/4`}`}
                  >
                    {Array.from({ length: beatsPerBar }, (_, index) => (
                      <span
                        className={
                          running && (session.beat + beatsPerBar) % beatsPerBar === index
                            ? "is-current"
                            : ""
                        }
                        key={index}
                      >
                        {index + 1}
                      </span>
                    ))}
                  </div>
                  <span className="countdown-label" aria-live="off">
                    {countingIn
                      ? Math.max(1, -session.beat)
                      : running
                        ? `${cue.duration - (session.beat - cue.startsAtBeat)} to change`
                        : `${bpm} BPM`}
                  </span>
                </div>
                <div className="cue-rail" role="group" aria-label="Upcoming chords">
                  {[0, 1, 2].map((i) => (
                    <div className="next-cue" key={i}>
                      <span>{i === 0 ? "UP NEXT" : `THEN`}</span>
                      <strong>{nextCues[i]?.voicing.chordSymbol ?? "—"}</strong>
                      <small>{nextCues[i]?.voicing.displayName ?? "Take a breath"}</small>
                      {i < 2 && <ChevronRight className="cue-arrow" size={17} />}
                    </div>
                  ))}
                </div>
                {running && (
                  <div className="playing-feedback" role="status">
                    {hasReport ? (
                      <>
                        <span
                          className={
                            session.report?.result === "correct" ? "success-text" : "warm-text"
                          }
                        >
                          {session.report?.result === "correct"
                            ? "✓ Got it. Keep going."
                            : "We’ll give this change more practice."}
                        </span>
                        <span>
                          {session.counts.correct} clean · {session.counts.misses} missed
                        </span>
                      </>
                    ) : (
                      <>
                        <span>
                          {countingIn
                            ? "Relax your shoulders. Find the first shape."
                            : "How did that chord feel?"}
                        </span>
                        <span>
                          {session.counts.correct} clean · {session.counts.misses} missed
                        </span>
                      </>
                    )}
                  </div>
                )}
              </section>
              <section className="transport-panel" aria-label="Practice controls">
                <div className="transport-top">
                  <button
                    className={`primary-button ${busy ? "finish-button" : ""}`}
                    disabled={session.starting}
                    onClick={() => (running ? session.finish() : start())}
                  >
                    {busy ? (
                      <Square size={16} fill="currentColor" />
                    ) : (
                      <Play size={17} fill="currentColor" />
                    )}
                    {session.starting
                      ? "Starting…"
                      : running
                        ? "Finish session"
                        : "Start practicing"}
                  </button>
                  <div className="tempo-control">
                    <button
                      className="icon-button"
                      aria-label="Decrease tempo by five BPM"
                      disabled={busy || bpm <= 40}
                      onClick={() => updatePreferences({ bpm: Math.max(40, bpm - 5) })}
                    >
                      <Minus size={16} />
                    </button>
                    <label className="tempo-readout">
                      <input
                        aria-label="Tempo in BPM"
                        type="number"
                        min={40}
                        max={160}
                        value={bpm}
                        disabled={busy}
                        onChange={(e) =>
                          updatePreferences({
                            bpm: Math.max(40, Math.min(160, Number(e.target.value) || 40)),
                          })
                        }
                      />
                      <span>BPM</span>
                    </label>
                    <button
                      className="icon-button"
                      aria-label="Increase tempo by five BPM"
                      disabled={busy || bpm >= 160}
                      onClick={() => updatePreferences({ bpm: Math.min(160, bpm + 5) })}
                    >
                      <Plus size={16} />
                    </button>
                    <button className="text-button tap-tempo" disabled={busy} onClick={tapTempo}>
                      Tap tempo
                    </button>
                  </div>
                  <label className="volume-control">
                    <Volume2 size={17} />
                    <input
                      aria-label="Metronome volume"
                      type="range"
                      min="0"
                      max="100"
                      value={preferences.volume}
                      onChange={(e) => updatePreferences({ volume: Number(e.target.value) })}
                    />
                  </label>
                </div>
                {running && (
                  <div className="report-controls">
                    <button
                      className="report-success"
                      disabled={countingIn || hasReport}
                      onClick={() => session.reportResult("correct")}
                    >
                      <Check size={18} />
                      Got it <kbd>→</kbd>
                    </button>
                    <button
                      className="report-miss"
                      disabled={countingIn || hasReport}
                      onClick={() => session.reportResult("reported-miss")}
                    >
                      <ArrowDown size={18} />
                      Missed <kbd>space</kbd>
                    </button>
                  </div>
                )}
                <p className="keyboard-help">
                  {running ? (
                    <>
                      <kbd>→</kbd> got it <span>·</span>
                      <kbd>space</kbd> missed <span>·</span>
                      <kbd>esc</kbd> finish
                    </>
                  ) : (
                    <>
                      <Headphones size={14} /> Sound on. Guitar ready. Take it at your own pace.
                    </>
                  )}
                </p>
              </section>
            </>
          )}
          {statusError && (
            <p className="error-notice" role="alert">
              {statusError}
            </p>
          )}
          <div className="practice-tip">
            <span className="tip-icon">
              <CircleHelp size={17} />
            </span>
            <p>
              <strong>A little tip</strong>
              {cue.voicing.tip}
            </p>
          </div>
        </div>

        <aside className="practice-sidebar">
          <PracticeNook />
          <section className="focus-panel panel">
            <div className="section-eyebrow">
              <Sprout size={16} />
              <span>A note for today</span>
            </div>
            <h2>{mode === "adaptive" ? "On the music stand" : "Something you love"}</h2>
            <p>
              {mode === "adaptive"
                ? curriculum.reason
                : "Pick a progression, make it your own, and settle into the rhythm. Your reports still shape future adaptive sessions."}
            </p>
            <div className="focus-chords">
              {(mode === "adaptive" ? curriculum.voicings : ids.slice(0, 4).map(getVoicing)).map(
                (v, i) => (
                  <span key={`${v.id}-${i}`}>
                    {i > 0 && <ArrowRight size={14} />}
                    <strong>{v.chordSymbol}</strong>
                  </span>
                ),
              )}
            </div>
            <div className="focus-divider" />
            <div className="small-muted">
              {mode === "adaptive"
                ? `Level ${curriculum.level} · ${curriculum.stage.name}`
                : "Custom routine · Saved as you edit"}
            </div>
          </section>
          <section className="palette-panel">
            <div className="section-topline">
              <h2>Your growing chord book</h2>
              <span>
                {curriculum.unlocked.length} / {GUITAR_VOICINGS.length}
              </span>
            </div>
            <div className="chord-palette">
              {GUITAR_VOICINGS.slice()
                .sort((a, b) => (a.level ?? 1) - (b.level ?? 1))
                .map((v) => {
                  const unlocked = curriculum.unlocked.some((c) => c.id === v.id);
                  const evidence = chordEvidence(v.id, profile.observations, "progression");
                  return (
                    <Link
                      href={`/chords?chord=${v.id}`}
                      className={`${unlocked ? "unlocked" : "locked"} ${evidence.steady ? "steady" : ""}`}
                      title={`${v.displayName}: ${unlocked ? (evidence.steady ? "Steady" : "Learning") : `Available in level ${v.level}`}`}
                      key={v.id}
                    >
                      <span>{v.chordSymbol}</span>
                      {!unlocked ? (
                        <LockKeyhole size={10} />
                      ) : evidence.steady ? (
                        <Check size={11} />
                      ) : (
                        <i />
                      )}
                    </Link>
                  );
                })}
            </div>
            <p className="small-muted">New chords join your practice as your confidence grows.</p>
            <Link className="text-button" href="/chords">
              Explore chord shapes <ArrowRight size={14} />
            </Link>
          </section>
          <section className="goal-panel panel">
            <div className="section-topline">
              <span>
                <Target size={17} />A little every day
              </span>
              <label>
                <select
                  aria-label="Daily practice goal"
                  value={preferences.dailyGoal}
                  onChange={(e) => updatePreferences({ dailyGoal: Number(e.target.value) })}
                >
                  {[5, 10, 15].map((n) => (
                    <option value={n} key={n}>
                      {n} min goal
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="goal-value">
              <strong>{Math.floor(activity.todaySeconds / 60)}</strong>
              <span>/ {preferences.dailyGoal} min today</span>
            </div>
            <div
              className="progress-track"
              role="progressbar"
              aria-label="Daily practice goal"
              aria-valuenow={Math.min(
                100,
                Math.round((activity.todaySeconds / (preferences.dailyGoal * 60)) * 100),
              )}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                style={{
                  width: `${Math.min(100, (activity.todaySeconds / (preferences.dailyGoal * 60)) * 100)}%`,
                }}
              />
            </div>
            <p>
              {activity.todaySeconds >= preferences.dailyGoal * 60
                ? "Daily goal reached. Nice work making time for music."
                : "Consistency sounds good on you."}
            </p>
          </section>
          <details className="how-it-works">
            <summary>
              <CircleHelp size={16} />
              How practice works <Plus size={14} />
            </summary>
            <ol>
              <li>Find the chord shape and strum once per click.</li>
              <li>Change chords when the next shape arrives.</li>
              <li>Tap Got it or Missed to tell us how it felt. Unreported chords stay unscored.</li>
              <li>
                Build 80% clean reports over at least 8 attempts per chord to reach the next level.
              </li>
            </ol>
            <p>
              Playing confidence comes from your reports. The chord trainer checks the frets you
              select.
            </p>
            <div className="learning-path">
              {LEVELS.map((level, i) => (
                <div key={level.name}>
                  <span className={i + 1 <= curriculum.level ? "path-unlocked" : ""}>{i + 1}</span>
                  <p>
                    <strong>{level.name}</strong>
                    <small>{level.symbols.join(" · ")}</small>
                  </p>
                </div>
              ))}
            </div>
          </details>
        </aside>
      </div>
    </main>
  );
}

export function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}
