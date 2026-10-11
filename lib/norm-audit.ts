/**
 * Reads a Korean affective-norm table that the user supplies locally and reports
 * how much of our vocabulary it covers. Nothing here writes into the app's data:
 * the point is to decide, with numbers in hand, whether a source can be used at
 * all. See PROJECT_CONTEXT.md, Decision C.
 */
import headers from "../data/norm-headers.ko.json" with { type: "json" };

export type NormRow = {
  word: string;
  valence?: number;
  arousal?: number;
  valenceSD?: number;
  arousalSD?: number;
  source?: string;
};

export type VocabularyEntry = { label: string; aliases?: string[] };

export type Match = {
  label: string;
  /** Which string matched: the label itself or one of its aliases. */
  via: string;
  rows: NormRow[];
};

export type AuditReport = {
  totalWords: number;
  matched: Match[];
  unmatched: string[];
  coverage: number;
  bySource: { source: string; words: number }[];
  /** Words the table rates more than once, with how far the ratings sit apart. */
  disagreements: { label: string; sources: string[]; valenceSpread: number; arousalSpread: number }[];
  /** Ratings the table itself marks as uncertain. */
  widestSD: { label: string; valenceSD?: number; arousalSD?: number }[];
};

/** Minimal RFC4180-ish reader: enough for a norm table, not a general CSV library. */
export const parseDelimited = (text: string): Record<string, string>[] => {
  const clean = text.replace(/^﻿/, "").replace(/\r\n/g, "\n");
  const delimiter = (clean.split("\n")[0] ?? "").includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;
  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (quoted) {
      if (char === '"' && clean[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(field); field = ""; }
    else if (char === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += char;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  const [headers, ...body] = rows.filter((entry) => entry.some((cell) => cell.trim().length));
  if (!headers) return [];
  return body.map((entry) => Object.fromEntries(headers.map((header, i) => [header.trim(), (entry[i] ?? "").trim()])));
};

/** Column names in Korean and English tables; the Korean ones are data (data/norm-headers.ko.json). */
const NAMES = headers.columns;
const NO_SOURCE = headers.noSource;

const findColumn = (headers: string[], candidates: string[]) =>
  headers.find((header) => candidates.includes(header.toLowerCase().replace(/[\s.()-]/g, ""))) ??
  headers.find((header) => candidates.some((candidate) => header.toLowerCase().replace(/[\s.()-]/g, "").startsWith(candidate)));

const toNumber = (value?: string) => {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const toNormRows = (records: Record<string, string>[]): NormRow[] => {
  if (!records.length) return [];
  const headers = Object.keys(records[0]);
  const columns = {
    word: findColumn(headers, NAMES.word),
    valence: findColumn(headers, NAMES.valence),
    arousal: findColumn(headers, NAMES.arousal),
    valenceSD: findColumn(headers, NAMES.valenceSD),
    arousalSD: findColumn(headers, NAMES.arousalSD),
    source: findColumn(headers, NAMES.source),
  };
  if (!columns.word) return [];
  return records
    .map((record) => ({
      word: (record[columns.word!] ?? "").trim(),
      valence: columns.valence ? toNumber(record[columns.valence]) : undefined,
      arousal: columns.arousal ? toNumber(record[columns.arousal]) : undefined,
      valenceSD: columns.valenceSD ? toNumber(record[columns.valenceSD]) : undefined,
      arousalSD: columns.arousalSD ? toNumber(record[columns.arousalSD]) : undefined,
      source: columns.source ? record[columns.source] || undefined : undefined,
    }))
    .filter((row) => row.word.length > 0);
};

const spread = (values: (number | undefined)[]) => {
  const present = values.filter((value): value is number => value !== undefined);
  return present.length > 1 ? Math.max(...present) - Math.min(...present) : 0;
};

export const auditCoverage = (rows: NormRow[], vocabulary: VocabularyEntry[]): AuditReport => {
  const byWord = new Map<string, NormRow[]>();
  for (const row of rows) {
    const existing = byWord.get(row.word);
    if (existing) existing.push(row);
    else byWord.set(row.word, [row]);
  }

  const matched: Match[] = [];
  const unmatched: string[] = [];
  for (const entry of vocabulary) {
    const via = [entry.label, ...(entry.aliases ?? [])].find((candidate) => byWord.has(candidate));
    if (via) matched.push({ label: entry.label, via, rows: byWord.get(via)! });
    else unmatched.push(entry.label);
  }

  const sourceCounts = new Map<string, number>();
  for (const match of matched) {
    for (const source of new Set(match.rows.map((row) => row.source ?? NO_SOURCE))) {
      sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
    }
  }

  const disagreements = matched
    .filter((match) => match.rows.length > 1)
    .map((match) => ({
      label: match.label,
      sources: [...new Set(match.rows.map((row) => row.source ?? NO_SOURCE))],
      valenceSpread: spread(match.rows.map((row) => row.valence)),
      arousalSpread: spread(match.rows.map((row) => row.arousal)),
    }))
    .sort((a, b) => b.valenceSpread + b.arousalSpread - (a.valenceSpread + a.arousalSpread));

  const widestSD = matched
    .map((match) => ({
      label: match.label,
      valenceSD: Math.max(...match.rows.map((row) => row.valenceSD ?? 0)) || undefined,
      arousalSD: Math.max(...match.rows.map((row) => row.arousalSD ?? 0)) || undefined,
    }))
    .filter((entry) => entry.valenceSD !== undefined || entry.arousalSD !== undefined)
    .sort((a, b) => (b.valenceSD ?? 0) + (b.arousalSD ?? 0) - ((a.valenceSD ?? 0) + (a.arousalSD ?? 0)))
    .slice(0, 10);

  return {
    totalWords: vocabulary.length,
    matched,
    unmatched,
    coverage: vocabulary.length ? matched.length / vocabulary.length : 0,
    bySource: [...sourceCounts.entries()].map(([source, words]) => ({ source, words })).sort((a, b) => b.words - a.words),
    disagreements,
    widestSD,
  };
};
