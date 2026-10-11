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
const band = (value: number | undefined, words: readonly string[]) => {
  if (value === undefined || Number.isNaN(value)) return words[Math.floor(words.length / 2)];
  const index = Math.round(Math.max(0, Math.min(1, value)) * (words.length - 1));
  return words[index];
};

export const quickValence = (value?: number, locale: Locale = DEFAULT_LOCALE) =>
  band(value, getT(locale).list("affectBands.quickValence"));

export const quickActivation = (value?: number, locale: Locale = DEFAULT_LOCALE) =>
  band(value, getT(locale).list("affectBands.quickActivation"));

export const scaleLabel = (value?: number, locale: Locale = DEFAULT_LOCALE) =>
  band(value, getT(locale).list("affectBands.valence"));

export const activationLabel = (value?: number, locale: Locale = DEFAULT_LOCALE) =>
  band(value, getT(locale).list("affectBands.activation"));

export const contextSourceLabel = (source?: "event" | "memory" | "anticipation" | "thought", locale: Locale = DEFAULT_LOCALE) =>
  getT(locale)(`contextSource.${source ?? "event"}`);

/** Picks the Korean particle that fits the last syllable of `word`. Kept here for existing callers. */
export const particleFor = pickParticle;

export const withParticle = (word: string, afterConsonant: string, afterVowel: string) =>
  `${word}${particleFor(word, afterConsonant, afterVowel)}`;
