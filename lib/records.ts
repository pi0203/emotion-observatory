import needsData from "../data/needs.ko.json";
import { sessionDepth } from "./session-types";
import type { EmotionSession } from "./session-types";

type NeedEntry = { id: string; label: string; responses?: { id: string; label: string }[] };
const needs = needsData.needs as NeedEntry[];

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

const DEPTH_LABEL = { quick: "빠른 확인", "quick+deep": "빠른 확인 + 자세히", deep: "자세히" };

export const needLabel = (id?: string) => needs.find((need) => need.id === id)?.label;

export const responseLabels = (session: EmotionSession): string[] => {
  const chosen = session.support?.chosen ?? [];
  return needs.flatMap((need) => (need.responses ?? []).filter((r) => chosen.includes(r.id)).map((r) => r.label));
};

/**
 * What a past record shows in the list. No scores, no interpretation, no pattern
 * across records — only what the person put there.
 */
export const summarise = (session: EmotionSession): RecordSummary => {
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
    depthLabel: DEPTH_LABEL[depth],
    words,
    personalMeanings,
    needLabel: needLabel(session.support?.need),
    responseLabels: responses,
    canFollowUp: responses.length > 0,
    followUpAnswered: Boolean(session.support?.followUp?.tried),
  };
};

export const formatWhen = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}. ${pad(date.getMonth() + 1)}. ${pad(date.getDate())}  ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const TRIED = [
  { id: "yes", label: "해봤어요" },
  { id: "partly", label: "일부만 해봤어요" },
  { id: "no", label: "아니요" },
] as const;

export const HELPED = [
  { id: "yes", label: "도움이 됐어요" },
  { id: "somewhat", label: "조금은요" },
  { id: "no", label: "아니요" },
  { id: "unsure", label: "잘 모르겠어요" },
] as const;
