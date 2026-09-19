import { GUITAR_VOICINGS } from "@/lib/music/catalog";
import type {
  PracticeObservation,
  PracticePreferences,
  PracticeSession,
  SavedRoutine,
} from "./types";

export type PracticeBackup = {
  version: 2;
  observations: PracticeObservation[];
  sessions: PracticeSession[];
  routines: SavedRoutine[];
  settings: (PracticePreferences & { id: string })[];
};
const ids = new Set(GUITAR_VOICINGS.map((v) => v.id));
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown, maximum = 150): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;
const integer = (value: unknown, min = 0, max = 1_000_000): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
const timestamp = (value: unknown) => text(value, 40) && Number.isFinite(Date.parse(value));
const voicings = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.length <= 16 &&
  value.every((id) => typeof id === "string" && ids.has(id));
const durations = (value: unknown, count: number) =>
  Array.isArray(value) && value.length === count && value.every((d) => integer(d, 1, 16));

export function parsePracticeBackup(json: string): PracticeBackup {
  if (json.length > 30_000_000)
    throw new Error("This backup is too large. Choose a Chordigo backup under 30 MB.");
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    throw new Error("This file isn’t valid JSON. Choose a Chordigo backup file.");
  }
  if (
    !object(data) ||
    data.version !== 2 ||
    !Array.isArray(data.observations) ||
    !Array.isArray(data.sessions) ||
    !Array.isArray(data.routines) ||
    !Array.isArray(data.settings)
  )
    throw new Error("This isn’t a supported Chordigo backup. Your existing progress is unchanged.");
  if (
    data.observations.length > 100_000 ||
    data.sessions.length > 10_000 ||
    data.routines.length > 1000 ||
    data.settings.length > 1
  )
    throw new Error("This backup contains too many records.");
  for (const o of data.observations) {
    if (
      !object(o) ||
      o.schemaVersion !== 1 ||
      !text(o.id) ||
      !text(o.sessionId) ||
      !text(o.expectedVoicingId) ||
      !ids.has(o.expectedVoicingId) ||
      !timestamp(o.createdAt) ||
      !["progression", "chord-trainer"].includes(String(o.context)) ||
      !["keyboard", "fret-selection", "microphone"].includes(String(o.source)) ||
      !["correct", "incorrect", "reported-miss", "uncertain"].includes(String(o.result)) ||
      !Array.isArray(o.observedChordSymbols) ||
      o.observedChordSymbols.length > 20 ||
      !o.observedChordSymbols.every((s: unknown) => text(s, 40)) ||
      typeof o.confidence !== "number" ||
      !Number.isFinite(o.confidence) ||
      o.confidence < 0 ||
      o.confidence > 1 ||
      o.chordSymbol !== GUITAR_VOICINGS.find((v) => v.id === o.expectedVoicingId)?.chordSymbol ||
      (o.bpm !== undefined && !integer(o.bpm, 40, 220)) ||
      (o.fromVoicingId !== undefined && !ids.has(String(o.fromVoicingId))) ||
      (o.assisted !== undefined && typeof o.assisted !== "boolean") ||
      (o.exactVoicing !== undefined && typeof o.exactVoicing !== "boolean")
    )
      throw new Error("This backup contains an invalid attempt. No data has been imported.");
  }
  for (const s of data.sessions) {
    if (
      !object(s) ||
      !text(s.id) ||
      !text(s.name) ||
      !["adaptive", "manual"].includes(String(s.mode)) ||
      !["active", "completed", "interrupted"].includes(String(s.status)) ||
      !timestamp(s.startedAt) ||
      (s.endedAt !== undefined && !timestamp(s.endedAt)) ||
      !integer(s.bpm, 40, 220) ||
      ![3, 4, 6].includes(Number(s.beatsPerBar)) ||
      !voicings(s.voicingIds) ||
      !durations(s.durations, s.voicingIds.length) ||
      !integer(s.totalChanges, 1, 128) ||
      !integer(s.completedChanges, 0, s.totalChanges) ||
      typeof s.durationSeconds !== "number" ||
      !Number.isFinite(s.durationSeconds) ||
      s.durationSeconds < 0 ||
      s.durationSeconds > 86400 ||
      !integer(s.correct, 0, s.totalChanges) ||
      !integer(s.misses, 0, s.totalChanges) ||
      s.correct + s.misses > s.totalChanges ||
      s.algorithmVersion !== 2
    )
      throw new Error("This backup contains an invalid session. No data has been imported.");
  }
  for (const r of data.routines) {
    if (
      !object(r) ||
      !text(r.id) ||
      typeof r.name !== "string" ||
      r.name.length > 150 ||
      !voicings(r.voicingIds) ||
      !durations(r.durations, r.voicingIds.length) ||
      !integer(r.bpm, 40, 220) ||
      ![3, 4, 6].includes(Number(r.beatsPerBar))
    )
      throw new Error("This backup contains an invalid routine. No data has been imported.");
  }
  for (const p of data.settings) {
    if (
      !object(p) ||
      p.id !== "preferences" ||
      !integer(p.bpm, 40, 160) ||
      ![1, 2, 4, 8].includes(Number(p.beatsPerChord)) ||
      ![3, 4, 6].includes(Number(p.beatsPerBar)) ||
      ![8, 16, 32, 64].includes(Number(p.totalChanges)) ||
      !integer(p.volume, 0, 100) ||
      !["beginner", "returning"].includes(String(p.experience)) ||
      ![5, 10, 15].includes(Number(p.dailyGoal)) ||
      typeof p.showWelcome !== "boolean"
    )
      throw new Error("This backup contains invalid preferences. No data has been imported.");
  }
  return data as PracticeBackup;
}
