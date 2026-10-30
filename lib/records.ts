import { requireContent } from "./content";
import { formatDay as formatDayIn, formatWhen as formatWhenIn } from "./i18n/dates";
import { DEFAULT_LOCALE, localeOf, type Locale } from "./i18n/locale";
import { getT } from "./i18n/t";
import { sessionDepth } from "./session-types";
import type { EmotionSession } from "./session-types";

type NeedEntry = { id: string; label: string; responses?: { id: string; label: string }[] };
const needsOf = (locale: Locale) => requireContent(locale).needs.needs as NeedEntry[];

export type RecordSummary = {
  id: string;
  at: string;
  depth: "quick" | "quick+deep" | "deep";
  depthLabel: string;
  words: string[];
  /** Shown as the user wrote it. No inference is drawn from repeating a word. */
  personalMeanings: { label: string; meaning: string }[];
  needLabel?: string;
  responseLabels: string[];
  /** Only a record where something was chosen has anything to follow up on. */
  canFollowUp: boolean;
  followUpAnswered: boolean;
};

/** A need is named in the language of the record that chose it. */
export const needLabel = (id?: string, locale: Locale = DEFAULT_LOCALE) => needsOf(locale).find((need) => need.id === id)?.label;

export const responseLabels = (session: EmotionSession, locale: Locale = localeOf(session)): string[] => {
  const chosen = session.support?.chosen ?? [];
  return needsOf(locale).flatMap((need) => (need.responses ?? []).filter((r) => chosen.includes(r.id)).map((r) => r.label));
};

/**
 * What a past record shows in the list. No scores, no interpretation, no pattern
 * across records — only what the person put there. `uiLocale` names the screen's
 * own words; the need and response labels follow the record's language.
 */
export const summarise = (session: EmotionSession, uiLocale: Locale = DEFAULT_LOCALE): RecordSummary => {
  // a word the user brought is listed exactly like an offered one
  const selections = session.deepReflection?.emotionCandidates?.length
    ? session.deepReflection.emotionCandidates
    : session.quickCheck?.selected ?? [];
  const words = selections.map((item) => item.label);
  const personalMeanings = selections
    .filter((item) => item.personalMeaning)
    .map((item) => ({ label: item.label, meaning: item.personalMeaning! }));
  const responses = responseLabels(session);
  const depth = sessionDepth(session);
  return {
    id: session.id,
    at: session.completedAt ?? session.createdAt,
    depth,
    depthLabel: getT(uiLocale)(`records.depth.${depth}`),
    words,
    personalMeanings,
    needLabel: needLabel(session.support?.need, localeOf(session)),
    responseLabels: responses,
    canFollowUp: responses.length > 0,
    followUpAnswered: Boolean(session.support?.followUp?.tried),
  };
};

export const formatWhen = (iso: string, locale: Locale = DEFAULT_LOCALE) => formatWhenIn(iso, locale);
export const formatDay = (iso: string, locale: Locale = DEFAULT_LOCALE) => formatDayIn(iso, locale);

/**
 * Where a line on the record came from (owner's decision 2026-10-30): what the
 * person pressed or wrote, what the app worked out from it, and what was added
 * later. Shown as a band and a short label beside each line, never colour alone.
 */
export type SourceKind = "mine" | "app" | "later";
/** How a picked word got there: written, pressed (an escape), or picked from the list, before or after 단어 보기. */
export type WordHow = "wrote" | "pressed" | "picked" | "pickedAfterReveal";

/**
 * The words the record keeps (the deep pass's if it has any, else the quick
 * look's), grouped by how each got there, in the order first picked. A word
 * picked from the list is still the person's own choice, so it is "mine".
 */
export const wordLines = (session: EmotionSession): { how: WordHow; words: string[] }[] => {
  const deep = session.deepReflection?.emotionCandidates?.length ? session.deepReflection : undefined;
  const selections = deep ? deep.emotionCandidates : session.quickCheck?.selected ?? [];
  const revealed = Boolean(deep ? deep.wordsRevealed : session.quickCheck?.wordsRevealed);
  const t = getT(localeOf(session));
  const escapes = deep ? [t("emotion.escapes.several"), t("emotion.escapes.unsure")] : [];
  const lines: { how: WordHow; words: string[] }[] = [];
  for (const item of selections) {
    const how: WordHow = item.source === "custom" ? "wrote" : escapes.includes(item.label) ? "pressed" : revealed ? "pickedAfterReveal" : "picked";
    const line = lines.find((entry) => entry.how === how);
    if (line) line.words.push(item.label);
    else lines.push({ how, words: [item.label] });
  }
  return lines;
};

/** A concern the person typed is not in the offered list; the rest were pressed. */
export const concernLines = (session: EmotionSession): { how: "pressed" | "wrote"; items: string[] }[] => {
  const offered = requireContent(localeOf(session)).concerns as readonly string[];
  const concerns = session.deepReflection?.concerns ?? [];
  const pressed = concerns.filter((item) => offered.includes(item));
  const wrote = concerns.filter((item) => !offered.includes(item));
  return [{ how: "pressed" as const, items: pressed }, { how: "wrote" as const, items: wrote }].filter((line) => line.items.length);
};

export const triedOptions = (locale: Locale = DEFAULT_LOCALE) => {
  const t = getT(locale);
  return [
    { id: "yes", label: t("recordDetail.tried.yes") },
    { id: "partly", label: t("recordDetail.tried.partly") },
    { id: "no", label: t("recordDetail.tried.no") },
  ] as const;
};

export const helpedOptions = (locale: Locale = DEFAULT_LOCALE) => {
  const t = getT(locale);
  return [
    { id: "yes", label: t("recordDetail.helped.yes") },
    { id: "somewhat", label: t("recordDetail.helped.somewhat") },
    { id: "no", label: t("recordDetail.helped.no") },
    { id: "unsure", label: t("recordDetail.helped.unsure") },
  ] as const;
};

export const TRIED = triedOptions(DEFAULT_LOCALE);

export const HELPED = helpedOptions(DEFAULT_LOCALE);
