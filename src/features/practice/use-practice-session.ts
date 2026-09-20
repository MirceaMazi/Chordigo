"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createSessionId,
  recordPracticeObservation,
  saveSession,
  reviewPracticeSession,
} from "@/lib/practice-history/indexeddb-repository";
import type { PracticeSession } from "@/lib/practice-history/types";
import { PendingWrites } from "@/lib/practice-history/pending-writes";
import { LookaheadMetronome } from "./audio/lookahead-metronome";
import { createSessionPlan, getSessionCue } from "./domain/session-plan";
import type { SessionPlan } from "./domain/session-plan";
import type { ReviewAnswers } from "./domain/session-review";

type SessionInput = Pick<
  PracticeSession,
  | "name"
  | "mode"
  | "bpm"
  | "beatsPerBar"
  | "voicingIds"
  | "durations"
  | "totalChanges"
  | "feedbackMode"
>;
type Run = {
  session: PracticeSession;
  plan: SessionPlan;
  reports: Map<number, "correct" | "reported-miss">;
  beat: number;
};

export function usePracticeSession() {
  const engine = useRef<LookaheadMetronome | null>(null);
  const frame = useRef<number | null>(null);
  const run = useRef<Run | null>(null);
  const generation = useRef(0);
  const mounted = useRef(true);
  const writes = useRef(new PendingWrites());
  const [active, setActive] = useState<{ session: PracticeSession; plan: SessionPlan } | null>(
    null,
  );
  const [beat, setBeat] = useState(-1);
  const [starting, setStarting] = useState(false);
  const [recap, setRecap] = useState<PracticeSession | null>(null);
  const [report, setReport] = useState<{ ordinal: number; result: string } | null>(null);
  const [counts, setCounts] = useState({ correct: 0, misses: 0 });
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const trackSave = useCallback(async (pending: Promise<void>) => {
    try {
      await pending;
      if (mounted.current) setSaveError(null);
    } catch (cause) {
      if (mounted.current)
        setSaveError(
          cause instanceof Error ? cause.message : "Your latest progress could not be saved.",
        );
    }
  }, []);
  const persist = useCallback(
    (operation: () => Promise<unknown>) => trackSave(writes.current.add(operation)),
    [trackSave],
  );
  const retrySave = useCallback(async () => {
    setSaving(true);
    await trackSave(writes.current.flush());
    if (mounted.current) setSaving(false);
  }, [trackSave]);

  const finish = useCallback(
    (status: "completed" | "interrupted" = "completed") => {
      generation.current++;
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
      engine.current?.stop();
      const current = run.current;
      run.current = null;
      if (!current) return;
      const ended = { ...current.session, status, endedAt: new Date().toISOString() };
      if (mounted.current) {
        setActive(null);
        setStarting(false);
        setRecap(ended);
        setSaving(true);
      }
      void persist(() => saveSession(ended)).then(() => {
        if (mounted.current) setSaving(false);
      });
    },
    [persist],
  );

  const start = useCallback(
    async (input: SessionInput, volume: number) => {
      if (run.current) return;
      const token = ++generation.current;
      setStarting(true);
      setRecap(null);
      setError(null);
      setReport(null);
      setCounts({ correct: 0, misses: 0 });
      const session: PracticeSession = {
        ...input,
        id: createSessionId("practice"),
        status: "active",
        startedAt: new Date().toISOString(),
        durationSeconds: 0,
        completedChanges: 0,
        correct: 0,
        misses: 0,
        algorithmVersion: 2,
      };
      const plan = createSessionPlan(input.voicingIds, input.durations, input.totalChanges);
      const current: Run = { session, plan, reports: new Map(), beat: -input.beatsPerBar - 1 };
      run.current = current;
      try {
        engine.current ??= new LookaheadMetronome();
        await engine.current.start({
          bpm: input.bpm,
          beatsPerBar: input.beatsPerBar,
          volume: volume / 100,
        });
        if (generation.current !== token || !mounted.current) return;
        setBeat(-input.beatsPerBar - 1);
        setActive({ session, plan });
        setStarting(false);
        void persist(() => saveSession({ ...session }));
        let previousChange = -1;
        const tick = () => {
          if (run.current !== current) return;
          const ordinal = (engine.current?.getCurrentBeatOrdinal() ?? -1) - input.beatsPerBar;
          if (ordinal !== current.beat) {
            current.beat = ordinal;
            setBeat(ordinal);
            current.session.durationSeconds =
              (Math.min(plan.totalBeats, Math.max(0, ordinal)) * 60) / input.bpm;
            if (ordinal >= plan.totalBeats) {
              current.session.completedChanges = input.totalChanges;
              finish();
              return;
            }
            if (ordinal >= 0) {
              const cue = getSessionCue(plan, ordinal);
              current.session.completedChanges = cue.ordinal;
              if (cue.ordinal !== previousChange) {
                previousChange = cue.ordinal;
                const snapshot = { ...current.session };
                void persist(() => saveSession(snapshot));
              }
            }
          }
          frame.current = requestAnimationFrame(tick);
        };
        frame.current = requestAnimationFrame(tick);
      } catch (cause) {
        engine.current?.stop();
        run.current = null;
        setStarting(false);
        setActive(null);
        setError(
          cause instanceof Error
            ? cause.message
            : "Audio could not start. Try again after allowing sound in your browser.",
        );
      }
    },
    [finish, persist],
  );

  const reportResult = useCallback(
    (result: "correct" | "reported-miss") => {
      const current = run.current;
      if (
        !current ||
        current.session.feedbackMode === "after-session" ||
        !engine.current?.isRunning
      )
        return;
      // Reports belong to the visible chord. There is no hidden previous-beat reassignment.
      const currentBeat = engine.current.getCurrentBeatOrdinal() - current.session.beatsPerBar;
      if (currentBeat < 0 || currentBeat >= current.plan.totalBeats) return;
      const cue = getSessionCue(current.plan, currentBeat);
      if (current.reports.has(cue.ordinal)) return;
      current.reports.set(cue.ordinal, result);
      current.session.correct += result === "correct" ? 1 : 0;
      current.session.misses += result === "reported-miss" ? 1 : 0;
      setCounts({ correct: current.session.correct, misses: current.session.misses });
      setReport({ ordinal: cue.ordinal, result });
      const observation = {
        createdAt: new Date().toISOString(),
        id: `${current.session.id}:${cue.ordinal}`,
        sessionId: current.session.id,
        context: "progression" as const,
        source: "keyboard" as const,
        result,
        expectedVoicingId: cue.voicing.id,
        chordSymbol: cue.voicing.chordSymbol,
        observedChordSymbols: [],
        confidence: 1,
        bpm: current.session.bpm,
        fromVoicingId: cue.ordinal > 0 ? current.plan.cues[cue.ordinal - 1].voicing.id : undefined,
      };
      const snapshot = { ...current.session };
      void persist(async () => {
        await recordPracticeObservation(observation);
        await saveSession(snapshot);
      });
    },
    [persist],
  );

  useEffect(() => {
    mounted.current = true;
    const keydown = (event: KeyboardEvent) => {
      if (
        !run.current ||
        event.repeat ||
        (event.target instanceof HTMLElement &&
          (event.target.isContentEditable ||
            event.target.closest("input, select, textarea, [role='dialog']")))
      )
        return;
      if (
        (event.code === "Space" || event.code === "ArrowRight") &&
        run.current.session.feedbackMode !== "after-session"
      ) {
        event.preventDefault();
        reportResult(event.code === "Space" ? "reported-miss" : "correct");
      } else if (event.code === "Escape") {
        event.preventDefault();
        finish();
      }
    };
    const hidden = () => {
      if (document.hidden && run.current) finish("interrupted");
    };
    const pagehide = () => finish("interrupted");
    window.addEventListener("keydown", keydown);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", pagehide);
    return () => {
      mounted.current = false;
      finish("interrupted");
      void engine.current?.dispose();
      engine.current = null;
      window.removeEventListener("keydown", keydown);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", pagehide);
    };
  }, [finish, reportResult]);

  const setVolume = (volume: number) => {
    if (run.current) engine.current?.setVolume(volume / 100);
  };
  const review = async (answers: ReviewAnswers) => {
    if (!recap || saving) return;
    const id = recap.id;
    setSaving(true);
    await persist(async () => {
      const reviewed = await reviewPracticeSession(id, answers);
      if (mounted.current) setRecap((current) => (current?.id === id ? reviewed : current));
    });
    if (mounted.current) setSaving(false);
  };
  return {
    active,
    beat,
    starting,
    recap,
    report,
    counts,
    error: saveError ?? error,
    saveError,
    retrySave,
    saving,
    start,
    finish,
    reportResult,
    setVolume,
    review,
    dismissRecap: () => setRecap(null),
  };
}
