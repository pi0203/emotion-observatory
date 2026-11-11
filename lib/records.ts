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

/** How many days the strip on the records screen shows, today at the right end. */
export const DAY_STRIP_LENGTH = 14;

export type StripDay = {
  /** The viewer's local day, YYYY-MM-DD. */
  key: string;
  /** Local midnight of that day, for formatDay. */
  iso: string;
  /** The first record of the day in the list's own order; absent on a day with none. */
  firstId?: string;
};

const localKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/**
 * The last fourteen days for the strip above the records list (owner's decision
 * 2026-10-30, second round C), oldest first, in the viewer's own time zone, by the
 * same moment the list shows. A day holds at most one mark however many records
 * it has. Nothing is counted: no number of days, no run of days, no day marked as
 * missed — a day with no record is simply open.
 */
export const recentDays = (records: EmotionSession[], now: Date = new Date(), length: number = DAY_STRIP_LENGTH): StripDay[] => {
  const first = new Map<string, string>();
  for (const session of records) {
    const at = new Date(session.completedAt ?? session.createdAt);
    if (Number.isNaN(at.getTime())) continue;
    const key = localKey(at);
    if (!first.has(key)) first.set(key, session.id);
  }
  return Array.from({ length }, (_, index) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (length - 1 - index));
    const key = localKey(day);
    return { key, iso: day.toISOString(), firstId: first.get(key) };
  });
};

/** When a record happened, for ordering records in time: the moment the list shows. */
export const recordTime = (session: EmotionSession) => new Date(session.completedAt ?? session.createdAt).getTime();

/** Two records further apart than this are joined by a dotted line on the map: a rest is just a rest (2026-11-05). */
export const MAP_GAP_DAYS = 14;

export type MapPoint = {
  id: string;
  /** ISO time of the record, for the date in the button's name. */
  at: string;
  /** The pad position, 0..1 each, never shown as a number. */
  valence: number;
  activation: number;
  /** True when the record before this one is more than MAP_GAP_DAYS earlier. Absent on the first point. */
  afterGap?: boolean;
};

const hasSpot = (affect?: { valence?: number; activation?: number; unknown?: boolean }) =>
  Boolean(affect && !affect.unknown && typeof affect.valence === "number" && typeof affect.activation === "number");

/**
 * 내 지도 on the records screen (2026-11-05): one point for every record with a
 * spot on the pad, oldest first. A record with both keeps the spot from after the
 * slower look, the later of the two. Records without a spot are left out, and a
 * record whose time cannot be read is too. Nothing is computed from the points.
 */
export const mapPoints = (records: EmotionSession[]): MapPoint[] => {
  const points = records.flatMap((session) => {
    const time = recordTime(session);
    if (Number.isNaN(time)) return [];
    const deep = session.deepReflection?.affect;
    const quick = session.quickCheck?.affect;
    const spot = hasSpot(deep) ? deep : hasSpot(quick) ? quick : undefined;
    return spot ? [{ id: session.id, at: new Date(time).toISOString(), valence: spot.valence!, activation: spot.activation!, time }] : [];
  }).sort((a, b) => a.time - b.time);
  return points.map(({ time, ...point }, index) => index === 0 ? point
    : { ...point, afterGap: time - points[index - 1].time > MAP_GAP_DAYS * 24 * 60 * 60 * 1000 });
};

/**
 * The record just before this one in time (2026-11-05), for the record detail's
 * 「지난번」 lines. Undefined for the first record.
 */
export const previousRecord = (session: EmotionSession, records: EmotionSession[]): EmotionSession | undefined => {
  const time = recordTime(session);
  if (Number.isNaN(time)) return undefined;
  return records
    .filter((other) => other.id !== session.id && !Number.isNaN(recordTime(other)) && recordTime(other) < time)
    .sort((a, b) => recordTime(b) - recordTime(a))[0];
};

export type PreviousLines = {
  /** ISO time of the record before, for the date in 「지난번 (11/3)」. */
  at: string;
  body?: string;
  names?: string;
  concerns?: string;
  need?: string;
};

/**
 * What the record just before held in the same four places (2026-11-05): body,
 * names, what mattered and the direction needed, each exactly as it was shown
 * there, joined with " · ". A place left empty there is absent here. Nothing is
 * compared: the lines are only set side by side.
 */
export const previousLines = (previous: EmotionSession): PreviousLines => {
  const item = summarise(previous, localeOf(previous));
  const join = (values: string[]) => values.join(" · ") || undefined;
  return {
    at: item.at,
    body: join((previous.deepReflection?.body ?? []).map((entry) => entry.label)),
    names: join(item.words) ?? join((previous.labelsLater ?? []).map((entry) => entry.label)),
    concerns: join(previous.deepReflection?.concerns ?? []),
    need: item.needLabel,
  };
};
