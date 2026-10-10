import granularity from "../data/granularity.ko.json";
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

export const coachSets: CoachSet[] = granularity.sets;

/** Words the user chose most recently: the deep pass if they went there, otherwise the quick one. */
export const currentWords = (session: EmotionSession): string[] => {
  const deep = session.deepReflection?.emotionCandidates ?? [];
  const quick = session.quickCheck?.selected ?? [];
  return (deep.length ? deep : quick).map((item) => item.label);
};

/**
 * The set that overlaps most with what the user chose. No set, no coach —
 * nothing is forced, and a tie falls to the order the sets are written in.
 */
export const coachSetFor = (session: EmotionSession): CoachSet | undefined => {
  const words = currentWords(session);
  const scored = coachSets
    .map((set) => ({ set, overlap: set.words.filter((word) => words.includes(word)).length }))
    .filter((entry) => entry.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap);
  return scored[0]?.set;
};

/**
 * Always offered beside the set's own words, so no list of words ever reads as
 * a closed set of right answers.
 */
export const COACH_ESCAPES = ["여러 개", "어느 것도 아님", "잘 모르겠음"];

export const APPRAISAL_ESCAPES: CoachAppraisal[] = [
  { id: "none", text: "어느 것도 아니다." },
  { id: "unsure", text: "잘 모르겠다." },
];

type CoachRecord = NonNullable<EmotionSession["coach"]>;

/** A coach saved before `origin` existed is unknown, never assumed to be either. */
export const coachOrigin = (coach: CoachRecord): "example-practice" | "unknown" => coach.origin ?? "unknown";

/**
 * What the pass through the example produced, as the user left it. Only the
 * coach's own fields are read: the user's own words (`wordsBefore`) are not
 * put beside these, so nothing reads as a before and after.
 */
export const coachResult = (session: EmotionSession) => {
  const coach = session.coach;
  if (!coach) return undefined;
  const set = coachSets.find((item) => item.id === coach.setId);
  const options = [...(set?.appraisals ?? []), ...APPRAISAL_ESCAPES];
  return {
    origin: coachOrigin(coach),
    observations: [
      ...coach.appraisals.map((id) => options.find((item) => item.id === id)?.text).filter((text): text is string => Boolean(text)),
      ...(coach.ownAppraisal ? [`“${coach.ownAppraisal}”`] : []),
    ],
    expressions: [...coach.wordsAfter, ...(coach.ownWord ? [`“${coach.ownWord}”`] : [])],
  };
};
