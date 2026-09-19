import { applyObservationToSkill } from "./skill-summary";
import { DEFAULT_PREFERENCES } from "./types";
import { parsePracticeBackup } from "./backup";
import type {
  ObservationDraft,
  PracticeObservation,
  SkillSummary,
  PracticeSession,
  SavedRoutine,
  PracticePreferences,
} from "./types";

export const PRACTICE_HISTORY_CHANGED_EVENT = "chordigo:practice-history-changed";
const STORES = ["observations", "skills", "sessions", "routines", "settings"];
let databasePromise: Promise<IDBDatabase> | null = null;
let channel: BroadcastChannel | null = null;

function announce() {
  window.dispatchEvent(new Event(PRACTICE_HISTORY_CHANGED_EVENT));
  channel?.postMessage("changed");
}

export function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;
  if (typeof indexedDB === "undefined")
    return Promise.reject(
      new Error(
        "Your browser could not open local storage. Practice is still available, but progress cannot be saved.",
      ),
    );
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open("chordigo-practice", 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("observations")) {
        const observations = db.createObjectStore("observations", { keyPath: "id" });
        observations.createIndex("by-created-at", "createdAt");
        observations.createIndex("by-voicing", "expectedVoicingId");
      }
      if (!db.objectStoreNames.contains("skills"))
        db.createObjectStore("skills", { keyPath: "voicingId" });
      for (const store of ["sessions", "routines", "settings"]) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        databasePromise = null;
      };
      if (typeof BroadcastChannel !== "undefined" && !channel) {
        channel = new BroadcastChannel("chordigo-history");
        channel.onmessage = () => window.dispatchEvent(new Event(PRACTICE_HISTORY_CHANGED_EVENT));
      }
      resolve(db);
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open practice history."));
    request.onblocked = () =>
      reject(
        new Error(
          "Close your other Chordigo tabs, then reload to finish upgrading your practice history.",
        ),
      );
  });
  databasePromise.catch(() => {
    databasePromise = null;
  });
  return databasePromise;
}

export async function recordPracticeObservation(
  draft: ObservationDraft,
): Promise<PracticeObservation> {
  const observation: PracticeObservation = {
    ...draft,
    schemaVersion: 1,
    id: draft.id ?? crypto.randomUUID(),
    createdAt: draft.createdAt ?? new Date().toISOString(),
  };
  const db = await openDatabase();
  const tx = db.transaction(["observations", "skills"], "readwrite");
  const done = transactionCompleted(tx);
  const observations = tx.objectStore("observations");
  const existing = observations.get(observation.id);
  existing.onsuccess = () => {
    if (existing.result) return;
    observations.add(observation);
    const skills = tx.objectStore("skills");
    const current = skills.get(observation.expectedVoicingId);
    current.onsuccess = () => skills.put(applyObservationToSkill(current.result, observation));
  };
  await done;
  announce();
  return observation;
}

async function list<T>(store: string): Promise<T[]> {
  const db = await openDatabase();
  const tx = db.transaction(store, "readonly");
  const done = transactionCompleted(tx);
  const result = tx.objectStore(store).getAll();
  await done;
  return result.result as T[];
}

async function put(store: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(store, "readwrite");
  const done = transactionCompleted(tx);
  tx.objectStore(store).put(value);
  await done;
  announce();
}

export const listSkillSummaries = () => list<SkillSummary>("skills");
export const listObservations = () => list<PracticeObservation>("observations");
export const listSessions = () => list<PracticeSession>("sessions");
export const listRoutines = () => list<SavedRoutine>("routines");
export const saveSession = (session: PracticeSession) => put("sessions", session);
export const saveRoutine = (routine: SavedRoutine) => put("routines", routine);
export const savePreferences = (preferences: PracticePreferences) =>
  put("settings", { ...preferences, id: "preferences" });

export async function getPreferences(): Promise<PracticePreferences> {
  const settings = await list<PracticePreferences & { id: string }>("settings");
  return { ...DEFAULT_PREFERENCES, ...settings.find((item) => item.id === "preferences") };
}

export async function deleteRoutine(id: string) {
  const db = await openDatabase();
  const tx = db.transaction("routines", "readwrite");
  const done = transactionCompleted(tx);
  tx.objectStore("routines").delete(id);
  await done;
  announce();
}

export async function clearPracticeHistory(): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(["observations", "skills", "sessions"], "readwrite");
  const done = transactionCompleted(tx);
  for (const name of ["observations", "skills", "sessions"]) tx.objectStore(name).clear();
  await done;
  announce();
}

export async function exportPracticeData() {
  const db = await openDatabase();
  const tx = db.transaction(STORES, "readonly");
  const done = transactionCompleted(tx);
  const requests = STORES.map((name) => tx.objectStore(name).getAll());
  await done;
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    ...Object.fromEntries(STORES.map((name, i) => [name, requests[i].result])),
  };
}

export async function importPracticeData(json: string) {
  const backup = parsePracticeBackup(json);
  const db = await openDatabase();
  const tx = db.transaction(STORES, "readwrite");
  const done = transactionCompleted(tx);
  const observations = tx.objectStore("observations");
  const existing = observations.getAll();
  existing.onsuccess = () => {
    const merged = new Map<string, PracticeObservation>(
      (existing.result as PracticeObservation[]).map((o) => [o.id, o]),
    );
    for (const observation of backup.observations)
      if (!merged.has(observation.id)) {
        merged.set(observation.id, observation);
        observations.add(observation);
      }
    const summaries = new Map<string, SkillSummary>();
    for (const observation of [...merged.values()].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    ))
      summaries.set(
        observation.expectedVoicingId,
        applyObservationToSkill(summaries.get(observation.expectedVoicingId), observation),
      );
    const skills = tx.objectStore("skills");
    skills.clear();
    for (const summary of summaries.values()) skills.put(summary);
  };
  // A restore merges missing records. It never replaces newer work on this device.
  for (const [store, items] of [
    ["sessions", backup.sessions],
    ["routines", backup.routines],
    ["settings", backup.settings],
  ] as const) {
    const target = tx.objectStore(store);
    for (const item of items) {
      const request = target.get(item.id);
      request.onsuccess = () => {
        if (!request.result) target.put(item);
      };
    }
  }
  await done;
  announce();
}

export function createSessionId(context: string): string {
  return `${context}-${crypto.randomUUID()}`;
}

function transactionCompleted(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(
        transaction.error ??
          new Error("Could not save your progress. Check that browser storage is available."),
      );
    transaction.onabort = () =>
      reject(transaction.error ?? new Error("Saving was interrupted. Please try again."));
  });
}
