import { requireContent } from "./content";
import { formatWhen as formatWhenIn } from "./i18n/dates";
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
