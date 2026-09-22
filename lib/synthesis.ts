import { activationLabel, contextSourceLabel, particleFor, quickActivation, quickValence, scaleLabel } from "./affect-labels";
import type { EmotionSession } from "./session-types";

export type SynthesisLine = { id: string; text: string };

export type Synthesis = {
  lead: string;
  /** What the user chose, restated and joined. Never interpreted. */
  lines: SynthesisLine[];
  /** Quick reading beside the deep one. Compared, never graded. */
  comparison: SynthesisLine[];
  caveat: string;
};

export const SYNTHESIS_LEAD = "당신이 고른 내용을 연결하면 이렇게 정리해볼 수 있습니다.";
export const SYNTHESIS_CAVEAT = "이것은 해석이나 진단이 아니라, 당신이 고른 내용을 그대로 이어 붙인 것입니다. 맞지 않으면 아래에서 고쳐 쓸 수 있습니다.";

const join = (values: string[]) => values.join(", ");

/**
 * The user's entries are often whole clauses ("존중받고 싶었다"), so they are
 * quoted before a particle is attached. The particle follows the last entry.
 */
const listWithObject = (values: string[]) => {
  const quoted = values.map((value) => `“${value}”`).join(", ");
  const last = values[values.length - 1] ?? "";
  return `${quoted}${particleFor(last, "을", "를")}`;
};

/** Same, for a bare list of single words where quoting would read as heavy. */
const plainWithObject = (values: string[]) => {
  const text = join(values);
  return `${text}${particleFor(values[values.length - 1] ?? "", "을", "를")}`;
};

const labels = (items?: { label: string }[]) => (items ?? []).map((item) => item.label);

const quickAffectText = (affect: NonNullable<EmotionSession["quickCheck"]>["affect"]) =>
  affect?.unknown ? "잘 모르겠음" : `${quickValence(affect?.valence)} · ${quickActivation(affect?.activation)}`;

const deepAffectText = (affect: NonNullable<EmotionSession["deepReflection"]>["affect"]) =>
  `${scaleLabel(affect?.valence)} · ${activationLabel(affect?.activation)}`;

const declineText = (response?: "none-close" | "unsure") =>
  response === "none-close" ? "가까운 말이 없다" : response === "unsure" ? "잘 모르겠다" : "";

/**
 * Builds the summary's synthesis from the user's own entries only, with no AI
 * and no inference. Every sentence restates something the user selected or
 * typed; nothing asserts a cause, a trait, or anyone else's intent.
 */
export const buildSynthesis = (session: EmotionSession): Synthesis => {
  const quick = session.quickCheck;
  const deep = session.deepReflection;
  const lines: SynthesisLine[] = [];
  const comparison: SynthesisLine[] = [];

  const quickWords = labels(quick?.selected);
  const deepWords = labels(deep?.emotionCandidates);
  const bothAffects = Boolean(quick?.affect && !quick.affect.unknown && deep?.affect);

  if (quick?.affect && !bothAffects) {
    lines.push({ id: "quick-affect", text: `빠른 확인에서 전체적인 느낌을 ${quickAffectText(quick.affect)}로 표시했습니다.` });
  }

  if (deep?.body?.length) {
    lines.push({ id: "body", text: `몸에서는 ${listWithObject(deep.body.map((item) => item.label))} 알아차렸다고 적었습니다.` });
  }

  if (deep?.affect) {
    lines.push({ id: "deep-affect", text: `전체적인 느낌은 ${deepAffectText(deep.affect)} 쪽으로 표시했습니다.` });
  }

  if (deep?.context?.eventText?.trim()) {
    lines.push({
      id: "context",
      text: `상황으로는 “${deep.context.eventText.trim()}”라고 적었고, 이것은 ${contextSourceLabel(deep.context.source)}에 가깝다고 표시했습니다.`,
    });
  }

  if (deep?.concerns?.length) {
    lines.push({ id: "meaning", text: `그때 중요했던 것으로는 ${listWithObject(deep.concerns)} 골랐습니다.` });
  }

  if (deepWords.length) {
    lines.push({ id: "emotion", text: `지금 경험에 가까운 말로는 ${listWithObject(deepWords)} 골랐습니다.` });
  } else if (quickWords.length) {
    lines.push({ id: "quick-emotion", text: `가까운 말로는 ${listWithObject(quickWords)} 골랐습니다.` });
  } else if (quick?.candidateResponse) {
    lines.push({ id: "quick-decline", text: `제시된 후보에는 ${declineText(quick.candidateResponse)}고 표시했습니다.` });
  }

  if (bothAffects) {
    comparison.push({
      id: "affect-before-after",
      text: `처음 빠른 확인에서는 ${quickAffectText(quick!.affect)} 쪽이었고, 조금 더 살펴본 뒤에는 ${deepAffectText(deep!.affect)}로 표시했습니다.`,
    });
  }

  if (quickWords.length && deepWords.length) {
    const changed = quickWords.length !== deepWords.length || quickWords.some((word) => !deepWords.includes(word));
    comparison.push(
      changed
        ? { id: "words-changed", text: `살펴보면서 가까운 표현이 조금 달라졌습니다. 빠른 확인에서는 ${join(quickWords)}, 자세히 살펴본 뒤에는 ${plainWithObject(deepWords)} 골랐습니다.` }
        : { id: "words-same", text: `자세히 살펴본 뒤에도 같은 표현을 골랐습니다.` },
    );
  }

  return { lead: SYNTHESIS_LEAD, lines, comparison, caveat: SYNTHESIS_CAVEAT };
};

export const hasSynthesis = (synthesis: Synthesis) => synthesis.lines.length + synthesis.comparison.length > 0;
