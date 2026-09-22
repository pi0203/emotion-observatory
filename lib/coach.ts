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

/** The set that shares a word with what the user chose. No set, no coach — nothing is forced. */
export const coachSetFor = (session: EmotionSession): CoachSet | undefined => {
  const words = currentWords(session);
  return coachSets.find((set) => set.words.some((word) => words.includes(word)));
};

/**
 * Always offered beside the set's own words, so no list of words ever reads as
 * a closed set of right answers.
 */
export const COACH_ESCAPES = ["여러 개", "어느 것도 아님", "잘 모르겠음"];

export const APPRAISAL_ESCAPES: CoachAppraisal[] = [
  { id: "several", text: "여러 가지가 함께 있었다." },
  { id: "none", text: "어느 것도 아니다." },
  { id: "unsure", text: "잘 모르겠다." },
];
