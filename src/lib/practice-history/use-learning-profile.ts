"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getPreferences,
  listObservations,
  listRoutines,
  listSessions,
  PRACTICE_HISTORY_CHANGED_EVENT,
} from "./indexeddb-repository";
import { DEFAULT_PREFERENCES } from "./types";
import type {
  PracticeObservation,
  PracticePreferences,
  PracticeSession,
  SavedRoutine,
} from "./types";

export function useLearningProfile() {
  const [observations, setObservations] = useState<PracticeObservation[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [routines, setRoutines] = useState<SavedRoutine[]>([]);
  const [preferences, setPreferences] = useState<PracticePreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    try {
      const [nextObservations, nextSessions, nextRoutines, nextPreferences] = await Promise.all([
        listObservations(),
        listSessions(),
        listRoutines(),
        getPreferences(),
      ]);
      setObservations(nextObservations.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      setSessions(nextSessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt)));
      setRoutines(nextRoutines);
      setPreferences(nextPreferences);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load your progress.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    let timer = window.setTimeout(() => void refresh(), 0);
    const update = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void refresh(), 50);
    };
    window.addEventListener(PRACTICE_HISTORY_CHANGED_EVENT, update);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener(PRACTICE_HISTORY_CHANGED_EVENT, update);
    };
  }, [refresh]);
  return { observations, sessions, routines, preferences, loading, error, refresh };
}
