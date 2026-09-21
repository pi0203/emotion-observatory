import type { EmotionSession } from "./session-types";

const DRAFT_KEY = "emotion-lab:draft:v1";
const COMPLETED_KEY = "emotion-lab:completed:v1";

export const loadDraft = (): EmotionSession | null => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(DRAFT_KEY);
  return raw ? (JSON.parse(raw) as EmotionSession) : null;
};

export const saveDraft = (session: EmotionSession) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify(session));
};

export const removeDraft = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DRAFT_KEY);
};

export const saveCompleted = (session: EmotionSession) => {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(COMPLETED_KEY);
  const sessions = raw ? (JSON.parse(raw) as EmotionSession[]) : [];
  window.localStorage.setItem(COMPLETED_KEY, JSON.stringify([session, ...sessions]));
};

export const persistSession = (session: EmotionSession) => {
  if (session.status === "draft") saveDraft(session);
  if (session.status === "completed" || session.status === "stopped") {
    saveCompleted(session);
    removeDraft();
  }
};

export const getStorageKeys = () => ({ DRAFT_KEY, COMPLETED_KEY });
