import type { EmotionSession } from "./session-types";

const DRAFT_KEY = "emotion-lab:draft:v4";
const COMPLETED_KEY = "emotion-lab:completed:v4";

const readJson = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

/**
 * Writes one key. localStorage refuses a write when the origin's quota is full
 * or when storage is blocked (some private modes, embedded contexts). The app
 * must not crash on that, so the failure is returned, not thrown; the screen
 * tells the person their record is not being kept.
 */
const writeJson = (key: string, value: unknown): boolean => {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const loadDraft = (): EmotionSession | null => readJson<EmotionSession | null>(DRAFT_KEY, null);

export const loadCompleted = (): EmotionSession[] => readJson<EmotionSession[]>(COMPLETED_KEY, []);

export const saveDraft = (session: EmotionSession): boolean => writeJson(DRAFT_KEY, session);

export const removeDraft = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
};

/** Upsert by id: a reopened session finishes as the same record, not a second one. */
export const saveCompleted = (session: EmotionSession): boolean => {
  if (typeof window === "undefined") return false;
  const rest = loadCompleted().filter((item) => item.id !== session.id);
  return writeJson(COMPLETED_KEY, [session, ...rest]);
};

export const dropCompleted = (id: string) => {
  if (typeof window === "undefined") return;
  const sessions = loadCompleted();
  if (!sessions.some((item) => item.id === id)) return;
  writeJson(COMPLETED_KEY, sessions.filter((item) => item.id !== id));
};

/** True when the record is now in storage; false when the browser refused the write. */
export const persistSession = (session: EmotionSession): boolean => {
  if (typeof window === "undefined") return false;
  if (session.status === "draft") {
    // Write before dropping, so a reopened session is never absent from both stores.
    const saved = saveDraft(session);
    dropCompleted(session.id);
    return saved;
  }
  const saved = saveCompleted(session);
  removeDraft();
  return saved;
};

/**
 * Removes both keys outright rather than reading and rewriting them, so a
 * stored value that no longer parses is cleared too. The keys themselves stay
 * the same; the next save writes them again in the same format.
 */
export const clearAllRecords = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(COMPLETED_KEY);
  window.localStorage.removeItem(DRAFT_KEY);
};

export const getStorageKeys = () => ({ DRAFT_KEY, COMPLETED_KEY });
