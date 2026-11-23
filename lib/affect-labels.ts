import { particleFor as pickParticle } from "./i18n/format";
import { DEFAULT_LOCALE, type Locale } from "./i18n/locale";
import { getT } from "./i18n/t";

/**
 * Wording for the affect readings. The pleasantness axis stays 불쾌–유쾌
 * everywhere: 편안함 also carries low activation, so using it here would blur
 * the two axes together. Shared so the summary and the synthesis never
 * drift apart. Input is the stored 0..1 coordinate; the words are a coarse read
 * of a finer value, and the number itself is never shown. The words themselves
 * live in the messages (`affectBands`).
 */
const bandIndex = (value: number | undefined, count: number) => {
  if (value === undefined || Number.isNaN(value)) return Math.floor(count / 2);
  return Math.round(Math.max(0, Math.min(1, value)) * (count - 1));
};
const band = (value: number | undefined, words: readonly string[]) => words[bandIndex(value, words.length)];

export const quickValence = (value?: number, locale: Locale = DEFAULT_LOCALE) =>
  band(value, getT(locale).list("affectBands.quickValence"));

export const quickActivation = (value?: number, locale: Locale = DEFAULT_LOCALE) =>
  band(value, getT(locale).list("affectBands.quickActivation"));

export const scaleLabel = (value?: number, locale: Locale = DEFAULT_LOCALE) =>
  band(value, getT(locale).list("affectBands.valence"));

export const activationLabel = (value?: number, locale: Locale = DEFAULT_LOCALE) =>
  band(value, getT(locale).list("affectBands.activation"));

/**
 * True only when a spot was actually marked. A skipped pad is stored as `{}`
 * and must read as not recorded, never as the middle of the scale.
 */
export const hasAffectPoint = (affect?: { valence?: number; activation?: number; unknown?: boolean }) =>
  Boolean(affect && !affect.unknown && typeof affect.valence === "number" && typeof affect.activation === "number");

/**
 * True when the spot reads as 불쾌함 쪽 or 조금 불쾌함 쪽 on the summary: the same
 * bands, not a new line. An unmarked or 아직 모르겠다 pad is never on either side.
 */
export const onUnpleasantSide = (affect?: { valence?: number; activation?: number; unknown?: boolean }) => {
  if (!hasAffectPoint(affect)) return false;
  const count = getT(DEFAULT_LOCALE).list("affectBands.quickValence").length;
  return bandIndex(affect!.valence, count) < Math.floor(count / 2);
};

export const contextSourceLabel =(source?: "event" | "memory" | "anticipation" | "thought", locale: Locale = DEFAULT_LOCALE) =>
  getT(locale)(`contextSource.${source ?? "event"}`);

/** Picks the Korean particle that fits the last syllable of `word`. Kept here for existing callers. */
export const particleFor = pickParticle;

export const withParticle = (word: string, afterConsonant: string, afterVowel: string) =>
  `${word}${particleFor(word, afterConsonant, afterVowel)}`;
