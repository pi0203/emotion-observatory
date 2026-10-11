import { requireContent } from "./content";
import { DEFAULT_LOCALE, localeOf, type Locale } from "./i18n/locale";
import { getT } from "./i18n/t";
import type { EmotionSession } from "./session-types";

export type CoachAppraisal = { id: string; text: string };
export type CoachSet = {
  id: string;
  words: string[];
  event: string;
  question: string;
  appraisals: CoachAppraisal[];
  note: string;
};

/** The written examples for one language. Each language's sets are written for it, not translated. */
export const getCoachSets = (locale: Locale = DEFAULT_LOCALE): CoachSet[] => requireContent(locale).granularity.sets;

/** The Korean sets, as this module has always exported them. */
export const coachSets: CoachSet[] = getCoachSets(DEFAULT_LOCALE);

/** Words the user chose most recently: the deep pass if they went there, otherwise the quick one. */
export const currentWords = (session: EmotionSession): string[] => {
  const deep = session.deepReflection?.emotionCandidates ?? [];
  const quick = session.quickCheck?.selected ?? [];
  return (deep.length ? deep : quick).map((item) => item.label);
};

/**
 * The set that overlaps most with what the user chose. No set, no coach —
 * nothing is forced, and a tie falls to the order the sets are written in.
 * The sets come from the language the record was written in.
 */
export const coachSetFor = (session: EmotionSession, locale: Locale = localeOf(session)): CoachSet | undefined => {
  const words = currentWords(session);
  const scored = getCoachSets(locale)
    .map((set) => ({ set, overlap: set.words.filter((word) => words.includes(word)).length }))
    .filter((entry) => entry.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap);
  return scored[0]?.set;
};

/**
 * Always offered beside the set's own words, so no list of words ever reads as
 * a closed set of right answers. Stored as picked, in the words the user saw.
 */
export const coachEscapes = (locale: Locale = DEFAULT_LOCALE): string[] => {
  const t = getT(locale);
  return [t("coach.escapes.several"), t("coach.escapes.none"), t("coach.escapes.unsure")];
};

export const COACH_ESCAPES = coachEscapes(DEFAULT_LOCALE);

export const appraisalEscapes = (locale: Locale = DEFAULT_LOCALE): CoachAppraisal[] => {
  const t = getT(locale);
  return [
    { id: "none", text: t("coach.appraisalEscapes.none") },
    { id: "unsure", text: t("coach.appraisalEscapes.unsure") },
  ];
};

export const APPRAISAL_ESCAPES: CoachAppraisal[] = appraisalEscapes(DEFAULT_LOCALE);

type CoachRecord = NonNullable<EmotionSession["coach"]>;

/** A coach saved before `origin` existed is unknown, never assumed to be either. */
export const coachOrigin = (coach: CoachRecord): "example-practice" | "unknown" => coach.origin ?? "unknown";

/**
 * What the pass through the example produced, as the user left it. Only the
 * coach's own fields are read: the user's own words (`wordsBefore`) are not
 * put beside these, so nothing reads as a before and after.
 */
export const coachResult = (session: EmotionSession, locale: Locale = localeOf(session)) => {
  const coach = session.coach;
  if (!coach) return undefined;
  const t = getT(locale);
  const set = getCoachSets(locale).find((item) => item.id === coach.setId);
  const options = [...(set?.appraisals ?? []), ...appraisalEscapes(locale)];
  return {
    origin: coachOrigin(coach),
    observations: [
      ...coach.appraisals.map((id) => options.find((item) => item.id === id)?.text).filter((text): text is string => Boolean(text)),
      ...(coach.ownAppraisal ? [t("common.quoted", { value: coach.ownAppraisal })] : []),
    ],
    expressions: [...coach.wordsAfter, ...(coach.ownWord ? [t("common.quoted", { value: coach.ownWord })] : [])],
  };
};
