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

export const loadDraft = (): EmotionSession | null => readJson<EmotionSession | null>(DRAFT_KEY, null);

export const loadCompleted = (): EmotionSession[] => readJson<EmotionSession[]>(COMPLETED_KEY, []);

export const saveDraft = (session: EmotionSession) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(session));
};

export const removeDraft = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
};

/** Upsert by id: a reopened session finishes as the same record, not a second one. */
export const saveCompleted = (session: EmotionSession) => {
  if (typeof window === "undefined") return;
  const rest = loadCompleted().filter((item) => item.id !== session.id);
  window.localStorage.setItem(COMPLETED_KEY, JSON.stringify([session, ...rest]));
};

export const dropCompleted = (id: string) => {
  if (typeof window === "undefined") return;
  const sessions = loadCompleted();
  if (!sessions.some((item) => item.id === id)) return;
  window.localStorage.setItem(COMPLETED_KEY, JSON.stringify(sessions.filter((item) => item.id !== id)));
};

export const persistSession = (session: EmotionSession) => {
  if (typeof window === "undefined") return;
  if (session.status === "draft") {
    // Write before dropping, so a reopened session is never absent from both stores.
    saveDraft(session);
    dropCompleted(session.id);
    return;
  }
  saveCompleted(session);
  removeDraft();
};

export const getStorageKeys = () => ({ DRAFT_KEY, COMPLETED_KEY });
