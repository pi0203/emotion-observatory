import type { EmotionSession } from "./session-types";
import { getVoiceStore } from "./voice-store";

const DRAFT_KEY = "emotion-lab:draft:v4";
const COMPLETED_KEY = "emotion-lab:completed:v4";

/**
 * Reads one key. A browser that blocks storage altogether (all cookies and site data off,
 * some embedded contexts) throws on the first touch of localStorage, before any value is
 * read, so the touch is inside the try as well: the first screen must open either way.
 * Nothing stored and storage refused read the same here, as the fallback. The person is
 * told at the first write, which fails too (writeJson below, 「common.saveFailed」).
 */
const readJson = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

/** Removes one key; false when the browser refused. Never throws, like the write. */
const removeKey = (key: string): boolean => {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch {
    return false;
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
  removeKey(DRAFT_KEY);
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
 *
 * The voice notes' sound is in IndexedDB (lib/voice-store.ts), so it is cleared
 * too. That store is asynchronous and this call is not; the promise is returned
 * for anyone who wants to wait, and a refusal never throws.
 */
export const clearAllRecords = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.resolve();
  removeKey(COMPLETED_KEY);
  removeKey(DRAFT_KEY);
  return getVoiceStore().clear().catch(() => undefined);
};

export const getStorageKeys = () => ({ DRAFT_KEY, COMPLETED_KEY });
