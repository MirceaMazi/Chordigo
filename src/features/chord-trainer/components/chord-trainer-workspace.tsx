"use client";

import {
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Guitar,
  Lightbulb,
  LockKeyhole,
  RotateCcw,
  Search,
  Sprout,
  Volume2,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SectionGuide } from "@/components/section-guide";
import { ChordDiagram } from "@/features/practice/components/chord-diagram";
import { chordEvidence, getCurriculum } from "@/features/practice/domain/curriculum";
import { GUITAR_VOICINGS, getVoicing } from "@/lib/music/catalog";
import type { GuitarStringFret } from "@/lib/music/types";
import { useReferenceAudio } from "@/lib/music/use-reference-audio";
import {
  createSessionId,
  recordPracticeObservation,
} from "@/lib/practice-history/indexeddb-repository";
import { useLearningProfile } from "@/lib/practice-history/use-learning-profile";
import { analyzeChordShape, EMPTY_GUITAR_SHAPE, getPlayedStrings } from "../domain/chord-shape";
import { InteractiveFretboard } from "./interactive-fretboard";

export function ChordTrainerWorkspace() {
  const profile = useLearningProfile();
  if (profile.loading)
    return (
      <main id="main-content" className="content-page">
        <div className="loading-surface" role="status">
          Opening your chord book…
        </div>
      </main>
    );
  return <ChordBook profile={profile} />;
}

function ChordBook({ profile }: { profile: ReturnType<typeof useLearningProfile> }) {
  const [mode, setMode] = useState<"library" | "trainer">("library");
  const [selectedId, setSelectedId] = useState(() => {
    const requested =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("chord")
        : null;
    return GUITAR_VOICINGS.some((v) => v.id === requested) ? requested! : "e-minor-open";
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedFrets, setSelectedFrets] =
    useState<readonly GuitarStringFret[]>(EMPTY_GUITAR_SHAPE);
  const [submitted, setSubmitted] = useState<readonly GuitarStringFret[] | null>(null);
  const [showReference, setShowReference] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [quiz, setQuiz] = useState<string[]>([]);
  const busyRef = useRef(false);
  const sessionId = useRef<string | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);
  const audio = useReferenceAudio();
  const curriculum = getCurriculum(
    profile.observations,
    profile.preferences.experience,
    profile.preferences.earnedLevel,
  );
  const selected = getVoicing(selectedId);
  const playedStrings = useMemo(() => getPlayedStrings(selectedFrets), [selectedFrets]);
  const preview = useMemo(
    () => analyzeChordShape(selectedFrets, selected),
    [selectedFrets, selected],
  );
  const result = submitted ? analyzeChordShape(submitted, selected) : null;
  const filtered = GUITAR_VOICINGS.filter(
    (v) =>
      (filter === "all" ||
        (filter === "learning" && curriculum.unlocked.some((c) => c.id === v.id)) ||
        (filter === "sevenths" && v.quality.includes("seventh")) ||
        v.quality === filter) &&
      `${v.displayName} ${v.chordSymbol} ${v.aliases?.join(" ") ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase().trim().replaceAll("♯", "#").replaceAll("♭", "b")),
  ).sort((a, b) => (a.level ?? 99) - (b.level ?? 99));
  const clear = () => {
    setSelectedFrets(EMPTY_GUITAR_SHAPE);
    setSubmitted(null);
  };
  const nextShape = (id: string) => {
    setSelectedId(id);
    clear();
    setShowReference(false);
    setAssisted(false);
    setAttempted(false);
    setError(null);
  };
  const beginQuiz = (firstId?: string) => {
    const pool = [...curriculum.unlocked].sort(
      (a, b) =>
        chordEvidence(a.id, profile.observations, "chord-trainer").mastery -
        chordEvidence(b.id, profile.observations, "chord-trainer").mastery,
    );
    const ids = firstId
      ? [firstId, ...pool.filter((v) => v.id !== firstId).map((v) => v.id)]
      : pool.map((v) => v.id);
    const plan = Array.from({ length: 8 }, (_, i) => ids[i % ids.length]);
    setQuiz(plan);
    setRound(0);
    setCorrect(0);
    setFinished(false);
    nextShape(plan[0]);
    sessionId.current = createSessionId("shape-recall");
    setMode("trainer");
    audio.stop();
  };
  const check = async () => {
    if (busyRef.current || attempted || playedStrings.length === 0) return;
    busyRef.current = true;
    setSaving(true);
    const checked = [...selectedFrets];
    const analysis = analyzeChordShape(checked, selected);
    const isScored = !assisted && analysis.status !== "alternate-voicing";
    try {
      sessionId.current ??= createSessionId("shape-recall");
      await recordPracticeObservation({
        id: `${sessionId.current}:${round}`,
        sessionId: sessionId.current,
        context: "chord-trainer",
        source: "fret-selection",
        result: isScored ? (analysis.status === "correct" ? "correct" : "incorrect") : "uncertain",
        expectedVoicingId: selected.id,
        chordSymbol: selected.chordSymbol,
        observedChordSymbols: analysis.detectedChords,
        confidence: 1,
        assisted,
        exactVoicing: analysis.isExactVoicing,
      });
      setSubmitted(checked);
      setAttempted(true);
      setError(null);
      if (analysis.status === "correct" && !assisted) setCorrect((n) => n + 1);
    } catch {
      setError("This attempt could not be saved. Your shape is still here; try Check chord again.");
    } finally {
      busyRef.current = false;
      setSaving(false);
    }
  };
  const next = () => {
    if (round >= 7) {
      setFinished(true);
      return;
    }
    setRound(round + 1);
    nextShape(quiz[round + 1]);
  };
  const evidence = chordEvidence(selected.id, profile.observations, "chord-trainer");

  return (
    <main id="main-content" className="content-page chord-trainer-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">A few shapes to keep close</p>
          <h1>
            Your little chord book<span className="accent-period">.</span>
          </h1>
          <p className="page-description">Get to know the shapes. Then make them second nature.</p>
        </div>
        <Guitar size={31} strokeWidth={1.2} className="success-text" />
      </div>
      <div className="library-tabs">
        <div className="segmented-control" role="group" aria-label="Chord learning mode">
          <button
            className={mode === "library" ? "is-selected" : ""}
            aria-pressed={mode === "library"}
            disabled={saving}
            onClick={() => {
              setMode("library");
              audio.stop();
            }}
          >
            Chord library
          </button>
          <button
            className={mode === "trainer" ? "is-selected" : ""}
            aria-pressed={mode === "trainer"}
            disabled={saving}
            onClick={() => beginQuiz()}
          >
            <Sprout size={14} />
            Shape trainer
          </button>
        </div>
        {mode === "library" && (
          <label className="search-field">
            <Search size={16} />
            <input
              aria-label="Search chords"
              placeholder="Find a chord…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        )}
      </div>
      {mode === "library" ? (
        <>
          <SectionGuide title="Find a chord and learn its shape">
            <p>
              Choose a card to see its fingering, playing tip and reference sound. Search by name or
              symbol, including sharps and flats (F# or Gb). Filters help you explore a chord
              family; Learning now shows your current practice chords.
            </p>
            <p>
              The book includes major, minor, seventh, major seventh, minor seventh and power chords
              in every key, plus common suspended and add9 shapes. All are available from day one;
              the beginner path introduces a smaller set gradually.
            </p>
            <p>
              Hear chord plays a reference. Test this shape starts a memory exercise on screen. To
              practise with your guitar and a metronome, open Practice.
            </p>
          </SectionGuide>
          <div className="library-filters">
            {[
              { id: "all", label: "All chords" },
              { id: "learning", label: "Learning now" },
              { id: "major", label: "Major" },
              { id: "minor", label: "Minor" },
              { id: "sevenths", label: "Sevenths" },
              { id: "suspended", label: "Suspended" },
              { id: "added", label: "Add9" },
              { id: "power", label: "Power" },
            ].map((item) => (
              <button
                className={`filter-chip ${filter === item.id ? "is-selected" : ""}`}
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
                key={item.id}
              >
                {item.label}
              </button>
            ))}
            <span className="library-count">{filtered.length} shapes to explore</span>
          </div>
          <div className="chord-library-layout">
            <div>
              {filtered.length ? (
                <div className="chord-grid">
                  {filtered.map((v) => (
                    <button
                      className={`chord-card ${selectedId === v.id ? "is-selected" : ""}`}
                      aria-label={`Explore ${v.displayName}`}
                      aria-pressed={selectedId === v.id}
                      onClick={() => {
                        setSelectedId(v.id);
                        if (window.innerWidth < 601)
                          requestAnimationFrame(() => {
                            detailRef.current?.focus({ preventScroll: true });
                            detailRef.current?.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                          });
                      }}
                      key={v.id}
                    >
                      <div className="chord-card-heading">
                        <strong>{v.chordSymbol}</strong>
                        <span>{v.positionLabel}</span>
                      </div>
                      <ChordDiagram voicing={v} />
                      <small>{v.displayName}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Search size={25} />
                  <h2>No chords found</h2>
                  <p>Try a chord name like C, E minor, or A7.</p>
                  <button
                    className="text-button"
                    onClick={() => {
                      setSearch("");
                      setFilter("all");
                    }}
                  >
                    Show all chords
                  </button>
                </div>
              )}
            </div>
            <aside className="library-aside">
              <div className="chord-detail panel" ref={detailRef} tabIndex={-1}>
                <p className="eyebrow">Get to know this shape</p>
                <h2>{selected.displayName}</h2>
                <ChordDiagram voicing={selected} />
                <span className="voicing-code">
                  {selected.frets.map((f) => (f === null ? "×" : f)).join(" ")}
                </span>
                <p>{selected.tip}</p>
                <button className="secondary-button" onClick={() => void audio.playChord(selected)}>
                  <Volume2 size={16} />
                  Hear {selected.chordSymbol}
                </button>
                <button className="primary-button" onClick={() => beginQuiz(selected.id)}>
                  Test this shape <ChevronRight size={16} />
                </button>
                <div className="detail-facts">
                  <div>
                    <span>Shape recall</span>
                    <strong>
                      {evidence.attempts
                        ? `${Math.round((evidence.accuracy ?? 0) * 100)}% correct`
                        : "Ready to learn"}
                    </strong>
                  </div>
                  <div>
                    <span>Introduced in</span>
                    <strong>
                      {selected.level ? `Level ${selected.level}` : "Extra vocabulary"}
                    </strong>
                  </div>
                </div>
                <button
                  className="text-button back-to-book"
                  onClick={() => {
                    document
                      .querySelector<HTMLButtonElement>(".chord-card.is-selected")
                      ?.focus({ preventScroll: true });
                    document
                      .querySelector(".chord-grid")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Back to the chord book
                </button>
              </div>
              <div className="diagram-guide">
                <h3>Reading a chord diagram</h3>
                <p>
                  <b>×</b> Keep this string quiet.
                </p>
                <p>
                  <b>○</b> Play the string open.
                </p>
                <p>
                  <b>1–4</b> Index, middle, ring, pinky.
                </p>
                <p>Thickest string on the left. Frets run from the top down.</p>
                <p>
                  A number beside the neck marks the starting fret for shapes higher up the neck.
                </p>
              </div>
            </aside>
          </div>
        </>
      ) : finished ? (
        <section className="session-recap panel">
          <span className="recap-icon">
            <Check size={28} />
          </span>
          <p className="eyebrow">Shape practice complete</p>
          <h2>Eight small steps forward.</h2>
          <p>You recalled {correct} of 8 shapes without a hint.</p>
          <div className="recap-insight">
            <Lightbulb size={20} />
            <p>
              {correct >= 6
                ? "Your chord vocabulary is growing. Pick up your guitar and connect those shapes with a little rhythm."
                : "Keep the shapes you’re learning close by. Another short round will make them easier to remember."}
            </p>
          </div>
          <div className="recap-actions">
            <button className="primary-button" onClick={() => beginQuiz()}>
              <RotateCcw size={16} />
              Another round
            </button>
            <Link className="secondary-button" href="/practice">
              Practice the changes <ChevronRight size={16} />
            </Link>
          </div>
          <p className="small-muted">
            Hints and alternate voicings are saved as unscored review. Shape recall and playing
            confidence are separate.
          </p>
        </section>
      ) : (
        <>
          <div className="quiz-intro">
            <Lightbulb size={19} />
            <p>
              Build {selected.chordSymbol} from memory. All strings start open; tap a fret to press
              it down and × to mute a string. This is an on-screen memory exercise, so you can put
              your guitar down.
            </p>
          </div>
          <SectionGuide title="How the shape trainer works">
            <ol>
              <li>
                Chord to build is the question: recreate that chord’s fingering on the horizontal
                neck. Choosing another chord starts a new eight-shape round with it first.
              </li>
              <li>
                The thin high E string is at the top. Tap a fret to select it; tap the same fret
                again to release that string to open.
              </li>
              <li>
                Use the circle at the left to mute a string (×). Tap × to open it again (○). Reset
                returns all six strings to open.
              </li>
              <li>
                Check chord compares your answer with the shape in the chord book. Reveal shape
                shows the answer and makes this attempt an unscored review.
              </li>
            </ol>
            <p>
              The chord name under the neck describes your current selection. It may differ from the
              chord you are trying to build. Shape recall is separate from how you play on your
              guitar.
            </p>
          </SectionGuide>
          <div className="trainer-heading">
            <label className="field">
              <span>Chord to build</span>
              <select
                value={selectedId}
                disabled={saving}
                onChange={(e) => beginQuiz(e.target.value)}
              >
                {GUITAR_VOICINGS.map((v) => (
                  <option value={v.id} key={v.id}>
                    {v.displayName} · {v.positionLabel}
                  </option>
                ))}
              </select>
            </label>
            <div className="quiz-progress">
              <span>Shape {round + 1} of 8</span>
              <div className="quiz-progress-dots" aria-hidden="true">
                {Array.from({ length: 8 }, (_, i) => (
                  <span className={i < round || (i === round && attempted) ? "done" : ""} key={i} />
                ))}
              </div>
            </div>
          </div>
          <section className="trainer-workbench" aria-label="Build a chord">
            <div className="trainer-target">
              <span>BUILD FROM MEMORY</span>
              <h2>{selected.chordSymbol}</h2>
              <p>{selected.displayName}</p>
              <button
                className="text-button"
                disabled={saving}
                onClick={() => {
                  setShowReference(!showReference);
                  if (!attempted) setAssisted(true);
                }}
              >
                {showReference ? <EyeOff size={16} /> : <Eye size={16} />}
                {showReference ? "Hide shape" : "Reveal shape"}
              </button>
              <div className="reference-diagram">
                {showReference ? (
                  <ChordDiagram voicing={selected} />
                ) : (
                  <div className="reference-placeholder">
                    <LockKeyhole size={22} strokeWidth={1.2} />
                    <span>Give memory a try</span>
                  </div>
                )}
              </div>
              <p className="small-muted">
                {assisted
                  ? "Hint used · this is unscored review"
                  : "A small test of your shape memory"}
              </p>
            </div>
            <div className="shape-builder">
              <div className="builder-heading">
                <div>
                  <span>Your fingering</span>
                  <strong>{playedStrings.length} strings sounding</strong>
                </div>
                <button
                  className="icon-button"
                  aria-label="Reset strings to open"
                  disabled={saving || attempted}
                  onClick={clear}
                >
                  <RotateCcw size={16} />
                </button>
              </div>
              <fieldset disabled={saving || attempted} className="fretboard-fieldset">
                <InteractiveFretboard
                  selectedFrets={selectedFrets}
                  firstFret={
                    Math.max(...selected.frets.map((f) => f ?? 0)) > 5
                      ? Math.min(...selected.frets.filter((f): f is number => f !== null && f > 0))
                      : 1
                  }
                  playedStrings={playedStrings}
                  incorrectStringIndexes={result?.incorrectStringIndexes ?? []}
                  onSelectFret={(index, fret) => {
                    setSelectedFrets((current) => current.map((f, i) => (i === index ? fret : f)));
                    setSubmitted(null);
                  }}
                />
              </fieldset>
              <div className="detection-strip" aria-live="polite">
                <span>YOUR FINGERING SOUNDS LIKE</span>
                <strong>
                  {preview.detectedChords.length
                    ? preview.detectedChords
                        .map((n) => n.replace(/^([A-G](?:#|b)?)M(?=\/|$)/, "$1"))
                        .join(" / ")
                    : playedStrings.length
                      ? "Keep building…"
                      : "Choose your frets"}
                </strong>
              </div>
              <div className="trainer-actions">
                <button
                  className="primary-button"
                  disabled={!playedStrings.length || saving || attempted}
                  onClick={() => void check()}
                >
                  <Check size={16} />
                  {saving ? "Saving…" : "Check chord"}
                </button>
                {attempted ? (
                  <button className="secondary-button" onClick={next}>
                    {round === 7 ? "Finish review" : "Next chord"}
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button className="text-button" disabled={saving} onClick={next}>
                    Skip for now <ChevronRight size={14} />
                  </button>
                )}
              </div>
            </div>
          </section>
          <section
            className={`trainer-result ${result?.status === "incorrect" ? "is-incorrect" : ""}`}
            aria-live="polite"
          >
            {result ? (
              <>
                <span>
                  {result.status === "incorrect" ? <Lightbulb size={18} /> : <Check size={18} />}
                </span>
                <div>
                  <strong>
                    {result.status === "incorrect"
                      ? "Not yet. Take a look at the highlighted strings."
                      : result.status === "alternate-voicing"
                        ? "Right chord, different shape."
                        : assisted
                          ? "Shape matched. A helpful review."
                          : "Correct. That shape is yours."}
                  </strong>
                  <p>
                    {result.status === "incorrect"
                      ? `Missing notes: ${result.missingPitchClasses.join(", ") || "none"}. Extra notes: ${result.unexpectedPitchClasses.join(", ") || "none"}. Reveal the shape to compare before moving on.`
                      : result.status === "alternate-voicing"
                        ? "The harmony is right. This review stays unscored because the target fingering is different."
                        : assisted
                          ? "Try this shape again without a hint to check your recall."
                          : `This matches the ${selected.displayName} shape. Now try forming it on your guitar.`}
                  </p>
                </div>
              </>
            ) : (
              <>
                <Guitar size={18} />
                <div>
                  <strong>Choose the frets, then check your chord.</strong>
                  <p>
                    This checks the fingering you select on screen. Practice mode helps you put it
                    into your hands.
                  </p>
                </div>
              </>
            )}
          </section>
        </>
      )}
      {error || profile.error || audio.audioError ? (
        <p className="error-notice" role="alert">
          {error || profile.error || audio.audioError}
        </p>
      ) : null}
    </main>
  );
}
