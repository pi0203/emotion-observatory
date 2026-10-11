import bodySignals from "../data/body-signals.ko.json";
import concernTags from "../data/concern-tags.ko.json";
import concerns from "../data/concerns.ko.json";
import emotions from "../data/emotions.ko.json";
import granularity from "../data/granularity.ko.json";
import needs from "../data/needs.ko.json";
import stepNotes from "../data/step-notes.ko.json";
import { DEFAULT_LOCALE, type Locale } from "./i18n/locale";

/**
 * Everything the screens offer as choices: vocabulary, body signals, concerns,
 * needs, coach sets. Unlike the messages, this is content, and each language
 * gets its own, written for that language rather than translated
 * (docs/I18N_PLAN.md). The Korean files are used exactly as they are.
 */
export type LocaleContent = {
  bodySignals: typeof bodySignals;
  concernTags: typeof concernTags;
  concerns: typeof concerns;
  emotions: typeof emotions;
  granularity: typeof granularity;
  needs: typeof needs;
  stepNotes: typeof stepNotes;
};

const ko: LocaleContent = { bodySignals, concernTags, concerns, emotions, granularity, needs, stepNotes };

/** `null` means the content for that language has not been written yet. */
const CONTENT: Record<Locale, LocaleContent | null> = { ko, en: null };

export const hasContent = (locale: Locale) => CONTENT[locale] !== null;

/** The content for a language, or `null` while it does not exist. */
export const getContent = (locale: Locale = DEFAULT_LOCALE): LocaleContent | null => CONTENT[locale];

/** For code that cannot go on without content: fails with a clear reason instead of showing another language. */
export const requireContent = (locale: Locale = DEFAULT_LOCALE): LocaleContent => {
  const content = CONTENT[locale];
  if (!content) throw new Error(`Content for locale "${locale}" has not been written yet. See docs/I18N_PLAN.md.`);
  return content;
};
