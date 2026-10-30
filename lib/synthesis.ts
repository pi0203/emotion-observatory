import { activationLabel, contextSourceLabel, hasAffectPoint, quickActivation, quickValence, scaleLabel } from "./affect-labels";
import { requireContent } from "./content";
import { DEFAULT_LOCALE, localeOf, type Locale } from "./i18n/locale";
import { getT, type Translate } from "./i18n/t";
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

const ko = getT(DEFAULT_LOCALE);
export const SYNTHESIS_LEAD = ko("synthesis.lead");
export const SYNTHESIS_CAVEAT = ko("synthesis.caveat");
export const NOT_ENOUGH = ko("synthesis.notEnough");

type VocabularyItem = { label: string; contextTags?: string[]; contextDependent?: boolean; family?: string };

/**
 * What one build needs: the screen's words (`t`) and the record's own content.
 * The vocabulary and tags come from the language the record was written in.
 */
type Build = {
  t: Translate;
  lookup: (label: string) => VocabularyItem | undefined;
  tagIsSpecific: (tag: string) => boolean;
  concernTagMap: Record<string, string[]>;
};

/** A tag carried by a large share of the vocabulary says little on its own. */
const BROAD_TAG_SHARE = 0.2;

const prepare = (session: EmotionSession, locale: Locale): Build => {
  const content = requireContent(localeOf(session));
  const vocabulary: VocabularyItem[] = content.emotions.items;
  return {
    t: getT(locale),
    lookup: (label) => vocabulary.find((item) => item.label === label),
    tagIsSpecific: (tag) => vocabulary.filter((item) => item.contextTags?.includes(tag)).length / vocabulary.length < BROAD_TAG_SHARE,
    concernTagMap: content.concernTags.map as Record<string, string[]>,
  };
};

const join = (t: Translate, values: string[]) => values.join(t("common.listSeparator"));

/** A quoted list and its last entry; the message picks the particle from the last entry itself. */
const quotedList = (t: Translate, values: string[]) => ({
  list: values.map((value) => t("common.quoted", { value })).join(t("common.listSeparator")),
  last: values[values.length - 1] ?? "",
});

const labels = (items?: { label: string }[]) => (items ?? []).map((item) => item.label);

const quickAffectText = (t: Translate, affect: NonNullable<EmotionSession["quickCheck"]>["affect"]) =>
  affect?.unknown ? t("quickAffect.unknown") : `${quickValence(affect?.valence, t.locale)} · ${quickActivation(affect?.activation, t.locale)}`;

const deepAffectText = (t: Translate, affect: NonNullable<EmotionSession["deepReflection"]>["affect"]) =>
  `${scaleLabel(affect?.valence, t.locale)} · ${activationLabel(affect?.activation, t.locale)}`;

const buildObserved = ({ t }: Build, session: EmotionSession): SynthesisLine[] => {
  const quick = session.quickCheck;
  const deep = session.deepReflection;
  const lines: SynthesisLine[] = [];
  const quickWords = labels(quick?.selected);
  const deepWords = labels(deep?.emotionCandidates);
  // a skipped deep pad is `{}`: it is not a reading, so it is neither shown nor compared
  const deepMarked = hasAffectPoint(deep?.affect);
  const bothAffects = Boolean(hasAffectPoint(quick?.affect) && deepMarked);

  if (quick?.affect && !bothAffects) {
    lines.push({ id: "quick-affect", text: t("synthesis.observed.quickAffect", { text: quickAffectText(t, quick.affect) }) });
  }
  if (deep?.body?.length) {
    lines.push({ id: "body", text: t("synthesis.observed.body", quotedList(t, deep.body.map((item) => item.label))) });
  }
  if (deepMarked) {
    lines.push({ id: "deep-affect", text: t("synthesis.observed.deepAffect", { text: deepAffectText(t, deep!.affect) }) });
  }
  if (deep?.context?.eventText?.trim()) {
    lines.push({ id: "context", text: t("synthesis.observed.context", { event: deep.context.eventText.trim(), source: contextSourceLabel(deep.context.source, t.locale) }) });
  }
  if (deep?.concerns?.length) {
    lines.push({ id: "meaning-entry", text: t("synthesis.observed.concerns", quotedList(t, deep.concerns)) });
  }
  if (deepWords.length) {
    lines.push({ id: "emotion", text: t("synthesis.observed.emotion", quotedList(t, deepWords)) });
  } else if (quickWords.length) {
    lines.push({ id: "quick-emotion", text: t("synthesis.observed.quickEmotion", quotedList(t, quickWords)) });
  } else if (quick?.candidateResponse) {
    lines.push({ id: "quick-decline", text: t(`synthesis.observed.declined.${quick.candidateResponse}`) });
  }
  if (bothAffects) {
    lines.push({ id: "affect-before-after", text: t("synthesis.observed.affectBeforeAfter", { quick: quickAffectText(t, quick!.affect), deep: deepAffectText(t, deep!.affect) }) });
  }
  return lines;
};

type Clue = SynthesisLine;

const findClues = ({ t, lookup, tagIsSpecific, concernTagMap }: Build, session: EmotionSession): Clue[] => {
  const quick = session.quickCheck;
  const deep = session.deepReflection;
  const clues: Clue[] = [];
  const quickWords = labels(quick?.selected);
  const deepWords = labels(deep?.emotionCandidates);
  const chosen = deepWords.length ? deepWords : quickWords;

  const concernTagList = (deep?.concerns ?? []).flatMap((concern) => concernTagMap[concern] ?? []);
  const wordTagList = chosen.flatMap((label) => lookup(label)?.contextTags ?? []);
  const shared = [...new Set(concernTagList.filter((tag) => wordTagList.includes(tag)))].filter(tagIsSpecific);
  if (shared.length) {
    clues.push({ id: "concern-overlap", text: t("synthesis.meaning.concernOverlap", { tags: join(t, shared) }) });
  }

  if (quickWords.length && deepWords.length && (quickWords.length !== deepWords.length || quickWords.some((word) => !deepWords.includes(word)))) {
    clues.push({ id: "words-shifted", text: t("synthesis.meaning.wordsShifted", { quick: join(t, quickWords), deep: join(t, deepWords), deepLast: deepWords[deepWords.length - 1] ?? "" }) });
  }

  const families = new Set(chosen.map((label) => lookup(label)?.family).filter(Boolean));
  if (chosen.length > 1 && families.size > 1) {
    clues.push({ id: "several-kinds", text: t("synthesis.meaning.severalKinds", { words: join(t, chosen) }) });
  }

  const source = deep?.context?.source;
  if (source && source !== "event") {
    clues.push({ id: "not-happening-now", text: t("synthesis.meaning.notHappeningNow", { source: contextSourceLabel(source, t.locale) }) });
  }

  return clues;
};

const buildUnknown = ({ t, lookup }: Build, session: EmotionSession, clueCount: number): SynthesisLine[] => {
  const quick = session.quickCheck;
  const deep = session.deepReflection;
  const lines: SynthesisLine[] = [];
  const chosen = labels(deep?.emotionCandidates).length ? labels(deep?.emotionCandidates) : labels(quick?.selected);

  if (clueCount < 2) lines.push({ id: "not-enough", text: t("synthesis.notEnough") });
  if (!deep?.context?.eventText?.trim()) lines.push({ id: "no-context", text: t("synthesis.unknown.noContext") });
  if (!deep?.concerns?.length) lines.push({ id: "no-concern", text: t("synthesis.unknown.noConcern") });

  const flagged = chosen.filter((label) => lookup(label)?.contextDependent);
  if (flagged.length) {
    lines.push({ id: "context-dependent", text: t("synthesis.unknown.contextDependent", quotedList(t, flagged)) });
  }
  if (quick?.affect?.unknown) lines.push({ id: "affect-unknown", text: t("synthesis.unknown.affectUnknown") });
  return lines;
};

const buildQuestions = ({ t }: Build, session: EmotionSession): string[] => {
  const quick = session.quickCheck;
  const deep = session.deepReflection;
  const questions: string[] = [];
  const quickWords = labels(quick?.selected);
  const deepWords = labels(deep?.emotionCandidates);
  const chosen = deepWords.length ? deepWords : quickWords;

  if (!deep?.concerns?.length) questions.push(t("synthesis.questions.concern"));
  if (!deep?.context?.eventText?.trim()) questions.push(t("synthesis.questions.context"));
  if (chosen.length > 1) questions.push(t("synthesis.questions.compare", { first: chosen[0], second: chosen[1] }));
  if (quickWords.length && deepWords.length && quickWords.some((word) => !deepWords.includes(word))) {
    questions.push(t("synthesis.questions.changed"));
  }
  if (chosen.length && !deep?.body?.length) questions.push(t("synthesis.questions.body"));
  if (chosen.length) questions.push(t("synthesis.questions.sameWord", { word: chosen[0] }));
  if (!questions.length) questions.push(t("synthesis.questions.fallback"));

  return questions.slice(0, 3);
};

/**
 * Builds the summary from the user's own entries only, with no AI and no
 * inference. `observed` restates what they chose. `meaning` names relations
 * between two or more of those entries and nothing else — never a cause, a
 * trait, anyone's intent, or a direction read off the affect pad. With fewer
 * than two independent clues it interprets nothing and says so.
 */
export const buildSynthesis = (session: EmotionSession, locale: Locale = localeOf(session)): Synthesis => {
  const build = prepare(session, locale);
  const clues = findClues(build, session);
  return {
    lead: build.t("synthesis.lead"),
    observed: buildObserved(build, session),
    meaning: clues.length >= 2 ? clues : [],
    unknown: buildUnknown(build, session, clues.length),
    questions: buildQuestions(build, session),
    caveat: build.t("synthesis.caveat"),
  };
};

export const hasSynthesis = (synthesis: Synthesis) =>
  synthesis.observed.length + synthesis.meaning.length + synthesis.unknown.length > 0;
