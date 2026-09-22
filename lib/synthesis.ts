import { activationLabel, contextSourceLabel, particleFor, quickActivation, quickValence, scaleLabel } from "./affect-labels";
import emotions from "../data/emotions.ko.json";
import concernTags from "../data/concern-tags.ko.json";
import type { EmotionSession } from "./session-types";

export type SynthesisLine = { id: string; text: string };

export type Synthesis = {
  lead: string;
  /** What the user chose, restated and joined. Never interpreted. */
  observed: SynthesisLine[];
  /** Relations between the user's own entries. Tentative, never causal. */
  meaning: SynthesisLine[];
  /** What this record cannot settle. */
  unknown: SynthesisLine[];
  /** One to three questions to take away. They must not imply their own answer. */
  questions: string[];
  caveat: string;
};

export const SYNTHESIS_LEAD = "당신이 고른 내용을 연결하면 이렇게 정리해볼 수 있습니다.";
export const SYNTHESIS_CAVEAT = "이것은 해석이나 진단이 아니라, 당신이 고른 내용을 이어 붙이고 그 사이의 관계만 짚은 것입니다. 맞지 않으면 아래에서 고쳐 쓸 수 있습니다.";
export const NOT_ENOUGH = "지금 기록만으로는 연결해볼 만한 정보가 충분하지 않습니다.";

type VocabularyItem = { label: string; contextTags?: string[]; contextDependent?: boolean; family?: string };
const vocabulary: VocabularyItem[] = emotions.items;
const lookup = (label: string) => vocabulary.find((item) => item.label === label);

/** A tag carried by a large share of the vocabulary says little on its own. */
const BROAD_TAG_SHARE = 0.2;
const tagIsSpecific = (tag: string) =>
  vocabulary.filter((item) => item.contextTags?.includes(tag)).length / vocabulary.length < BROAD_TAG_SHARE;

const join = (values: string[]) => values.join(", ");

const listWithObject = (values: string[]) =>
  `${values.map((value) => `“${value}”`).join(", ")}${particleFor(values[values.length - 1] ?? "", "을", "를")}`;

const plainWithObject = (values: string[]) =>
  `${join(values)}${particleFor(values[values.length - 1] ?? "", "을", "를")}`;

const labels = (items?: { label: string }[]) => (items ?? []).map((item) => item.label);

const quickAffectText = (affect: NonNullable<EmotionSession["quickCheck"]>["affect"]) =>
  affect?.unknown ? "잘 모르겠음" : `${quickValence(affect?.valence)} · ${quickActivation(affect?.activation)}`;

const deepAffectText = (affect: NonNullable<EmotionSession["deepReflection"]>["affect"]) =>
  `${scaleLabel(affect?.valence)} · ${activationLabel(affect?.activation)}`;

const declineText = (response?: "none-close" | "unsure") =>
  response === "none-close" ? "가까운 말이 없다" : response === "unsure" ? "잘 모르겠다" : "";

const buildObserved = (session: EmotionSession): SynthesisLine[] => {
  const quick = session.quickCheck;
  const deep = session.deepReflection;
  const lines: SynthesisLine[] = [];
  const quickWords = labels(quick?.selected);
  const deepWords = labels(deep?.emotionCandidates);
  const bothAffects = Boolean(quick?.affect && !quick.affect.unknown && deep?.affect);

  if (quick?.affect && !bothAffects) {
    const text = quickAffectText(quick.affect);
    lines.push({ id: "quick-affect", text: `빠른 확인에서 전체적인 느낌을 ${text}${particleFor(text, "으로", "로")} 표시했습니다.` });
  }
  if (deep?.body?.length) {
    lines.push({ id: "body", text: `몸에서는 ${listWithObject(deep.body.map((item) => item.label))} 알아차렸다고 적었습니다.` });
  }
  if (deep?.affect) {
    lines.push({ id: "deep-affect", text: `전체적인 느낌은 ${deepAffectText(deep.affect)} 쪽으로 표시했습니다.` });
  }
  if (deep?.context?.eventText?.trim()) {
    lines.push({ id: "context", text: `상황으로는 “${deep.context.eventText.trim()}”라고 적었고, 이것은 ${contextSourceLabel(deep.context.source)}에 가깝다고 표시했습니다.` });
  }
  if (deep?.concerns?.length) {
    lines.push({ id: "meaning-entry", text: `그때 중요했던 것으로는 ${listWithObject(deep.concerns)} 골랐습니다.` });
  }
  if (deepWords.length) {
    lines.push({ id: "emotion", text: `지금 경험에 가까운 말로는 ${listWithObject(deepWords)} 골랐습니다.` });
  } else if (quickWords.length) {
    lines.push({ id: "quick-emotion", text: `가까운 말로는 ${listWithObject(quickWords)} 골랐습니다.` });
  } else if (quick?.candidateResponse) {
    lines.push({ id: "quick-decline", text: `제시된 후보에는 ${declineText(quick.candidateResponse)}고 표시했습니다.` });
  }
  if (bothAffects) {
    const deepText = deepAffectText(deep!.affect);
    lines.push({ id: "affect-before-after", text: `처음 빠른 확인에서는 ${quickAffectText(quick!.affect)} 쪽이었고, 조금 더 살펴본 뒤에는 ${deepText}${particleFor(deepText, "으로", "로")} 표시했습니다.` });
  }
  return lines;
};

type Clue = SynthesisLine;

const findClues = (session: EmotionSession): Clue[] => {
  const quick = session.quickCheck;
  const deep = session.deepReflection;
  const clues: Clue[] = [];
  const quickWords = labels(quick?.selected);
  const deepWords = labels(deep?.emotionCandidates);
  const chosen = deepWords.length ? deepWords : quickWords;

  const concernTagList = (deep?.concerns ?? []).flatMap((concern) => (concernTags.map as Record<string, string[]>)[concern] ?? []);
  const wordTagList = chosen.flatMap((label) => lookup(label)?.contextTags ?? []);
  const shared = [...new Set(concernTagList.filter((tag) => wordTagList.includes(tag)))].filter(tagIsSpecific);
  if (shared.length) {
    clues.push({ id: "concern-overlap", text: `고른 표현과 그때 중요했다고 한 것이 모두 ‘${join(shared)}’ 쪽을 가리킵니다. 같은 곳을 두 번 짚은 셈입니다.` });
  }

  if (quickWords.length && deepWords.length && (quickWords.length !== deepWords.length || quickWords.some((word) => !deepWords.includes(word)))) {
    clues.push({ id: "words-shifted", text: `빠르게 봤을 때는 ${join(quickWords)}, 자세히 본 뒤에는 ${plainWithObject(deepWords)} 골랐습니다. 같은 순간을 두 번 다르게 표현해본 셈입니다.` });
  }

  const families = new Set(chosen.map((label) => lookup(label)?.family).filter(Boolean));
  if (chosen.length > 1 && families.size > 1) {
    clues.push({ id: "several-kinds", text: `${join(chosen)}처럼 한 갈래로 묶이지 않는 표현을 함께 골랐습니다. 여러 결이 같이 있는 경험일 수 있습니다.` });
  }

  const source = deep?.context?.source;
  if (source && source !== "event") {
    clues.push({ id: "not-happening-now", text: `이 기록은 지금 벌어지고 있는 일이 아니라 ${contextSourceLabel(source)}에 대한 것이라고 표시했습니다.` });
  }

  return clues;
};

const buildUnknown = (session: EmotionSession, clueCount: number): SynthesisLine[] => {
  const quick = session.quickCheck;
  const deep = session.deepReflection;
  const lines: SynthesisLine[] = [];
  const chosen = labels(deep?.emotionCandidates).length ? labels(deep?.emotionCandidates) : labels(quick?.selected);

  if (clueCount < 2) lines.push({ id: "not-enough", text: NOT_ENOUGH });
  if (!deep?.context?.eventText?.trim()) lines.push({ id: "no-context", text: "어떤 일이 있었는지는 이 기록에 적히지 않았습니다." });
  if (!deep?.concerns?.length) lines.push({ id: "no-concern", text: "그 순간 무엇이 중요했는지는 아직 적히지 않았습니다." });

  const flagged = chosen.filter((label) => lookup(label)?.contextDependent);
  if (flagged.length) {
    lines.push({ id: "context-dependent", text: `${listWithObject(flagged)} 상황에 따라 다르게 경험되는 표현입니다. 지금 어느 쪽에 가까운지는 이 기록만으로 정해지지 않습니다.` });
  }
  if (quick?.affect?.unknown) lines.push({ id: "affect-unknown", text: "전체적인 느낌은 잘 모르겠다고 표시했습니다." });
  return lines;
};

const buildQuestions = (session: EmotionSession): string[] => {
  const quick = session.quickCheck;
  const deep = session.deepReflection;
  const questions: string[] = [];
  const quickWords = labels(quick?.selected);
  const deepWords = labels(deep?.emotionCandidates);
  const chosen = deepWords.length ? deepWords : quickWords;

  if (!deep?.concerns?.length) questions.push("그 순간 가장 중요했던 것은 무엇이었나요?");
  if (!deep?.context?.eventText?.trim()) questions.push("무슨 일이 있었는지 한 줄로 적는다면 어떻게 될까요?");
  if (chosen.length > 1) questions.push(`${chosen[0]}과 ${chosen[1]} 중 어느 쪽이 조금 더 가까웠나요?`);
  if (quickWords.length && deepWords.length && quickWords.some((word) => !deepWords.includes(word))) {
    questions.push("빠르게 봤을 때와 지금 사이에 무엇이 달라졌을까요?");
  }
  if (chosen.length && !deep?.body?.length) questions.push("그때 몸에서는 무엇이 느껴졌나요?");
  if (chosen.length) questions.push(`비슷한 상황에서도 ${chosen[0]}이라는 말을 쓰나요?`);
  if (!questions.length) questions.push("지금 이것을 살펴보는 것이 도움이 되었나요?");

  return questions.slice(0, 3);
};

/**
 * Builds the summary from the user's own entries only, with no AI and no
 * inference. `observed` restates what they chose. `meaning` names relations
 * between two or more of those entries and nothing else — never a cause, a
 * trait, anyone's intent, or a direction read off the affect pad. With fewer
 * than two independent clues it interprets nothing and says so.
 */
export const buildSynthesis = (session: EmotionSession): Synthesis => {
  const clues = findClues(session);
  return {
    lead: SYNTHESIS_LEAD,
    observed: buildObserved(session),
    meaning: clues.length >= 2 ? clues : [],
    unknown: buildUnknown(session, clues.length),
    questions: buildQuestions(session),
    caveat: SYNTHESIS_CAVEAT,
  };
};

export const hasSynthesis = (synthesis: Synthesis) =>
  synthesis.observed.length + synthesis.meaning.length + synthesis.unknown.length > 0;
