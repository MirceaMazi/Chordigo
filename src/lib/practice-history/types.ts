export type PracticeContext = "chord-trainer" | "progression";
export type ObservationResult = "correct" | "incorrect" | "reported-miss" | "uncertain";
export type ObservationSource = "fret-selection" | "keyboard" | "microphone" | "session-review";

export type PracticeObservation = {
  schemaVersion: 1;
  id: string;
  sessionId: string;
  context: PracticeContext;
  source: ObservationSource;
  result: ObservationResult;
  expectedVoicingId: string;
  chordSymbol: string;
  observedChordSymbols: readonly string[];
  confidence: number;
  createdAt: string;
  fromVoicingId?: string;
  bpm?: number;
  assisted?: boolean;
  exactVoicing?: boolean;
};

export type PracticeSession = {
  id: string;
  name: string;
  mode: "adaptive" | "manual";
  status: "active" | "completed" | "interrupted";
  startedAt: string;
  endedAt?: string;
  bpm: number;
  beatsPerBar: number;
  voicingIds: string[];
  durations: number[];
  totalChanges: number;
  completedChanges: number;
  durationSeconds: number;
  correct: number;
  misses: number;
  algorithmVersion: 2;
  feedbackMode?: "after-session" | "live";
  reviewedAt?: string;
};

export type SavedRoutine = {
  id: string;
  name: string;
  voicingIds: string[];
  durations: number[];
  bpm: number;
  beatsPerBar: number;
};

export type PracticePreferences = {
  bpm: number;
  beatsPerChord: number;
  beatsPerBar: number;
  totalChanges: number;
  volume: number;
  experience: "beginner" | "returning";
  dailyGoal: number;
  showWelcome: boolean;
  feedbackMode: "after-session" | "live";
  chordRepeats: number;
  curriculumVersion: 3;
  earnedLevel: number;
};

export const DEFAULT_PREFERENCES: PracticePreferences = {
  bpm: 60,
  beatsPerChord: 4,
  beatsPerBar: 4,
  totalChanges: 16,
  volume: 50,
  experience: "beginner",
  dailyGoal: 5,
  showWelcome: true,
  feedbackMode: "after-session",
  chordRepeats: 1,
  curriculumVersion: 3,
  earnedLevel: 1,
};

export type SkillSummary = {
  voicingId: string;
  chordSymbol: string;
  attempts: number;
  correct: number;
  incorrect: number;
  reportedMisses: number;
  uncertain: number;
  lastPracticedAt: string;
};

export type ObservationDraft = Omit<PracticeObservation, "schemaVersion" | "id" | "createdAt"> & {
  id?: string;
  createdAt?: string;
};
