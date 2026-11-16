import type { VoiceStep } from "./session-types";

/**
 * Where a voice note's sound is kept (2026-11-16): IndexedDB in this browser,
 * nowhere else. localStorage holds strings only and a few MB for the whole
 * site, so the sound lives here and the record in localStorage says only that
 * there is a recording, its format and its length (EmotionSession.voiceNotes).
 *
 * Kept apart from lib/storage-adapter.ts on purpose: that seam is synchronous
 * and IndexedDB is not. Every call opens the database, does one thing and
 * closes it again, so nothing stays open to block a later delete. When
 * IndexedDB is missing or refuses, the calls resolve with nothing instead of
 * throwing: the written record works the same without the sound.
 */
export type VoiceClip = {
  sessionId: string;
  step: VoiceStep;
  blob: Blob;
  mimeType: string;
  seconds: number;
  at: string;
};

export interface VoiceStore {
  /** False when the browser refused to keep it. */
  save(clip: VoiceClip): Promise<boolean>;
  load(sessionId: string, step: VoiceStep): Promise<VoiceClip | null>;
  remove(sessionId: string, step: VoiceStep): Promise<void>;
  /** Every recording of one record. */
  removeSession(sessionId: string): Promise<void>;
  /** Every recording on this device. */
  clear(): Promise<void>;
}

const DB_NAME = "emotion-lab:voice:v1";
const STORE = "clips";

const open = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: ["sessionId", "step"] });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

/** Runs one request in its own transaction and closes the database when the transaction ends. */
const run = async <T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest, read: (result: unknown) => T, fallback: T): Promise<T> => {
  const db = await open();
  if (!db) return fallback;
  return new Promise<T>((resolve) => {
    try {
      const transaction = db.transaction(STORE, mode);
      const request = work(transaction.objectStore(STORE));
      let value = fallback;
      request.onsuccess = () => { value = read(request.result); };
      transaction.oncomplete = () => { db.close(); resolve(value); };
      transaction.onerror = transaction.onabort = () => { db.close(); resolve(fallback); };
    } catch {
      db.close();
      resolve(fallback);
    }
  });
};

/** All of one record's keys: [id] sorts before [id, step], and [id, []] after every string step. */
const sessionRange = (sessionId: string) => IDBKeyRange.bound([sessionId], [sessionId, []]);

export const indexedDbVoiceStore: VoiceStore = {
  save: (clip) => run("readwrite", (store) => store.put(clip), () => true, false),
  load: (sessionId, step) => run("readonly", (store) => store.get([sessionId, step]), (result) => (result as VoiceClip | undefined) ?? null, null),
  remove: (sessionId, step) => run("readwrite", (store) => store.delete([sessionId, step]), () => undefined, undefined),
  removeSession: (sessionId) => run("readwrite", (store) => store.delete(sessionRange(sessionId)), () => undefined, undefined),
  clear: () => run("readwrite", (store) => store.clear(), () => undefined, undefined),
};

/** The same calls kept in memory, for the tests (jsdom has no IndexedDB). */
export const memoryVoiceStore = (): VoiceStore & { clips: Map<string, VoiceClip> } => {
  const clips = new Map<string, VoiceClip>();
  const key = (sessionId: string, step: string) => `${sessionId}\u0000${step}`;
  return {
    clips,
    save: async (clip) => { clips.set(key(clip.sessionId, clip.step), clip); return true; },
    load: async (sessionId, step) => clips.get(key(sessionId, step)) ?? null,
    remove: async (sessionId, step) => { clips.delete(key(sessionId, step)); },
    removeSession: async (sessionId) => { for (const [k, clip] of clips) if (clip.sessionId === sessionId) clips.delete(k); },
    clear: async () => { clips.clear(); },
  };
};

let current: VoiceStore = indexedDbVoiceStore;

export const getVoiceStore = (): VoiceStore => current;

/** Tests put a memory store here; the app never calls it. */
export const setVoiceStore = (store: VoiceStore) => { current = store; };
