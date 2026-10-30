import type { EmotionSession } from "./session-types";
import type { StorageAdapter } from "./storage-adapter";

/**
 * Moving records between devices without an account: a JSON file the person
 * downloads and later picks again. Everything happens in the browser; nothing
 * here touches the network. Records are read and written only through the
 * StorageAdapter, so the localStorage keys and format stay as they are.
 *
 * What is exported: the completed store, which holds finished records and
 * stopped ones. The draft is left out: it is a single in-progress slot, and
 * importing one would collide with whatever the person is writing now.
 */

export const EXPORT_FORMAT = "emotion-observatory-records";
export const EXPORT_FORMAT_VERSION = 1;
/** Files larger than this are refused before they are read. */
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export type ExportFile = {
  format: typeof EXPORT_FORMAT;
  formatVersion: typeof EXPORT_FORMAT_VERSION;
  /** The local date of the export, YYYY-MM-DD, with no time of day. */
  exportedDate: string;
  records: EmotionSession[];
};

/** YYYY-MM-DD in the device's own calendar. */
export const localDate = (now: Date = new Date()) => {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export const exportFileName = (now: Date = new Date()) => `emotion-observatory-records-${localDate(now)}.json`;

export const buildExport = (records: EmotionSession[], now: Date = new Date()): ExportFile => ({
  format: EXPORT_FORMAT,
  formatVersion: EXPORT_FORMAT_VERSION,
  exportedDate: localDate(now),
  records,
});

export const serializeExport = (file: ExportFile) => JSON.stringify(file, null, 2);

/** Why a file was refused as a whole. Nothing is saved in any of these cases. */
export type ImportError = "too-large" | "not-json" | "unknown-format" | "unsupported-version" | "no-records";

export type ParsedImport =
  | { ok: false; error: ImportError }
  | { ok: true; records: EmotionSession[]; invalid: number };

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string";
const optional = (value: unknown, check: (value: unknown) => boolean) => value === undefined || check(value);
const arrayOf = (value: unknown, check: (item: unknown) => boolean) => Array.isArray(value) && value.every(check);
const labelled = (item: unknown) => isObject(item) && isString(item.label);

/**
 * The least an entry must have for the records screens to show it without
 * breaking: the identifying fields, and the lists those screens walk through.
 * Its words are kept as text and are only ever shown through React, never as
 * HTML.
 */
export const isSessionShape = (value: unknown): value is EmotionSession => {
  if (!isObject(value)) return false;
  if (!isString(value.id) || !value.id.trim()) return false;
  if (!isString(value.createdAt) || Number.isNaN(new Date(value.createdAt).getTime())) return false;
  if (value.status !== "completed" && value.status !== "stopped") return false;
  if (!isString(value.stage)) return false;
  if (value.entry !== "quick" && value.entry !== "deep") return false;
  if (!optional(value.completedAt, isString) || !optional(value.locale, isString)) return false;
  if (!optional(value.quickCheck, (quick) => isObject(quick) && arrayOf(quick.selected, labelled) && arrayOf(quick.candidatePool, labelled))) return false;
  if (!optional(value.deepReflection, (deep) => isObject(deep) && arrayOf(deep.body, labelled) && arrayOf(deep.concerns, isString) && arrayOf(deep.emotionCandidates, labelled))) return false;
  if (!optional(value.support, (support) => isObject(support) && arrayOf(support.chosen, isString))) return false;
  if (!optional(value.labelsLater, (labels) => arrayOf(labels, (item) => isObject(item) && isString(item.label) && isString(item.at)))) return false;
  if (!optional(value.coach, (coach) => isObject(coach) && isString(coach.setId) && arrayOf(coach.appraisals, isString) && arrayOf(coach.wordsAfter, isString) && arrayOf(coach.wordsBefore, isString))) return false;
  return true;
};

/** Reads a file's text. Refuses the whole file, saving nothing, if it is not ours. */
export const parseImport = (text: string): ParsedImport => {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "not-json" };
  }
  if (!isObject(data) || data.format !== EXPORT_FORMAT) return { ok: false, error: "unknown-format" };
  if (data.formatVersion !== EXPORT_FORMAT_VERSION) return { ok: false, error: "unsupported-version" };
  if (!Array.isArray(data.records)) return { ok: false, error: "no-records" };
  const records = data.records.filter(isSessionShape);
  return { ok: true, records, invalid: data.records.length - records.length };
};

export type ImportPlan = {
  /** Records whose id is not on this device yet, in file order. */
  add: EmotionSession[];
  /** Records whose id is already here (or repeats inside the file). The one on this device is kept. */
  duplicates: number;
  /** Entries that did not have the shape of a record. */
  invalid: number;
  /** Everything the file listed. */
  total: number;
};

export const planImport = (parsed: { records: EmotionSession[]; invalid: number }, existing: EmotionSession[]): ImportPlan => {
  const seen = new Set(existing.map((session) => session.id));
  const add: EmotionSession[] = [];
  let duplicates = 0;
  for (const record of parsed.records) {
    if (seen.has(record.id)) {
      duplicates += 1;
      continue;
    }
    seen.add(record.id);
    add.push(record);
  }
  return { add, duplicates, invalid: parsed.invalid, total: parsed.records.length + parsed.invalid };
};

/**
 * Adds only the new records and never overwrites one already here. The store
 * puts each saved record first, so they are written last-to-first and keep
 * their file order, ahead of the records that were already on the device.
 */
export const applyImport = (plan: ImportPlan, storage: Pick<StorageAdapter, "loadCompleted" | "saveCompleted">): number => {
  const here = new Set(storage.loadCompleted().map((session) => session.id));
  const fresh = plan.add.filter((record) => !here.has(record.id));
  for (const record of [...fresh].reverse()) storage.saveCompleted(record);
  return fresh.length;
};

/** Reads a picked file as text. FileReader rather than Blob.text(), which older browsers lack. */
export const readFileText = (file: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => (typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("not text")));
    reader.onerror = () => reject(reader.error ?? new Error("unreadable"));
    reader.readAsText(file);
  });

/** Hands the file to the browser as a download. A local blob URL; no request leaves the device. */
export const downloadExport = (file: ExportFile, name: string = exportFileName()) => downloadJson(serializeExport(file), name);

/** Any JSON text as a download (the locked export uses this too). */
export const downloadJson = (text: string, name: string) => {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
