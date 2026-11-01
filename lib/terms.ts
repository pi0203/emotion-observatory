/**
 * The terms of use at /terms (docs/TERMS.md). Korean only: there is no English
 * terms page yet, and English is written new rather than translated
 * (docs/I18N_PLAN.md), so the text lives in data/terms.ko.json, outside the
 * shared messages, and no English key is asked for.
 *
 * Each promise in the terms is kept by code, a test or a person's check; the
 * table in docs/TERMS.md 「약속 대조표」 says which. tests/terms.test.tsx holds
 * the ones that tie the text to the rest of the app.
 */

/**
 * The day these terms apply from, YYYY-MM-DD. The first line of 「바뀐 내용」
 * (`changes` in data/terms.ko.json) must carry the same day; change both when
 * the terms change, or when they reach main on a later day.
 */
export const TERMS_EFFECTIVE = "2026-11-01";

/** The latest check of the crisis numbers: SAFETY.md 「연락처 확인 기록」. */
export const CONTACTS_CHECKED_ON = "2026-10-28";

/** Where to write about the terms: the address of the homepage's 「이 쪽에 대해 말하기 (메일)」. */
export const TERMS_MAIL = "mailto:a5897@icloud.com";

export const TERMS_PATH = "/terms";

/** A paragraph, a bulleted list, or a numbered list. */
export type TermsBlock = string | { list: string[] } | { ordered: string[] };
export type TermsSection = { id: string; title: string; blocks: TermsBlock[] };
export type Terms = {
  title: string;
  intro: string;
  sections: TermsSection[];
  /** 「바뀐 내용」, newest first. */
  changes: { date: string; text: string }[];
};

/** The helplines a terms sentence can name; each is drawn from the crisis card's own messages. */
export const TERMS_LINES = ["119", "112", "109", "1577", "1388"] as const;
export type TermsLine = (typeof TERMS_LINES)[number];

/** One piece of a terms sentence. */
export type TermsPiece =
  | { kind: "text"; text: string }
  | { kind: "bold"; pieces: TermsPiece[] }
  | { kind: "date"; which: "effective" | "checked" }
  | { kind: "line"; line: TermsLine }
  | { kind: "link"; to: "mail" | "home"; text: string };

const DATE = /^\{(effective|checked)\}$/;
const LINE = /^\{num(119|112|109|1577|1388)\}$/;
const LINK = /^\[([^\]]+)\]\((mail|home)\)$/;
const TOKEN = /(\{(?:effective|checked)\}|\{num(?:119|112|109|1577|1388)\}|\[[^\]]+\]\((?:mail|home)\))/;

const parsePlain = (text: string): TermsPiece[] =>
  text.split(TOKEN).filter(Boolean).map((part): TermsPiece => {
    const date = part.match(DATE);
    if (date) return { kind: "date", which: date[1] as "effective" | "checked" };
    const line = part.match(LINE);
    if (line) return { kind: "line", line: line[1] as TermsLine };
    const link = part.match(LINK);
    if (link) return { kind: "link", to: link[2] as "mail" | "home", text: link[1] };
    return { kind: "text", text: part };
  });

/**
 * Reads the marks used in data/terms.ko.json: `<b>…</b>` is emphasis,
 * `{effective}` and `{checked}` are dates, `{num119}` and the like are helpline
 * numbers, `[text](mail)` and `[text](home)` are the two links. Anything else is
 * plain text, shown through React and never as HTML.
 */
export const parseTerms = (text: string): TermsPiece[] =>
  text.split(/(<b>.*?<\/b>)/).filter(Boolean).map((part): TermsPiece[] =>
    part.startsWith("<b>") && part.endsWith("</b>") ? [{ kind: "bold", pieces: parsePlain(part.slice(3, -4)) }] : parsePlain(part)).flat();
