"use client";

import { useCallback, useEffect, useState } from "react";
import { listSkillSummaries, PRACTICE_HISTORY_CHANGED_EVENT } from "./indexeddb-repository";
import type { SkillSummary } from "./types";

export type SkillSummaryState = {
  summaries: readonly SkillSummary[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useSkillSummaries(): SkillSummaryState {
  const [summaries, setSummaries] = useState<readonly SkillSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSummaries(await listSkillSummaries());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load practice history.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0);
    const handleChange = () => void refresh();
    window.addEventListener(PRACTICE_HISTORY_CHANGED_EVENT, handleChange);
    return () => {
      window.clearTimeout(initialLoad);
      window.removeEventListener(PRACTICE_HISTORY_CHANGED_EVENT, handleChange);
    };
  }, [refresh]);

  return { summaries, isLoading, error, refresh };
}
