import bodySignals from "../data/body-signals.ko.json";
import concernTags from "../data/concern-tags.ko.json";
import concerns from "../data/concerns.ko.json";
import emotions from "../data/emotions.ko.json";
import granularity from "../data/granularity.ko.json";
import needs from "../data/needs.ko.json";
import stepNotes from "../data/step-notes.ko.json";
import bodySignalsEn from "../data/body-signals.en.json";
import concernTagsEn from "../data/concern-tags.en.json";
import concernsEn from "../data/concerns.en.json";
import emotionsEn from "../data/emotions.en.json";
import granularityEn from "../data/granularity.en.json";
import needsEn from "../data/needs.en.json";
import stepNotesEn from "../data/step-notes.en.json";
import { englishAvailable } from "./i18n/availability";
import { DEFAULT_LOCALE, type Locale } from "./i18n/locale";

/**
 * An expression listed in the Standard Korean Language Dictionary, shown as
 * 이렇게도 말해요 under a picked word (owner's decision 2026-11-01). Only `text`
 * is drawn; the rest says where it sits in the dictionary
 * (docs/vocab-sources/EXPRESSIONS_2026_11_01.md). Never stored in a record.
 */
export type DictionaryExpression = { text: string; dict: string; kind: string; sense?: string; headword: string; wordNo: number };

/**
 * The vocabulary, written out instead of taken from the Korean file, because
 * only the Korean words carry `expressions` (2026-11-01): the English list is
 * written on its own and not paired with the Korean.
 */
export type Vocabulary = {
  provisional: boolean;
  note: string;
  fieldNotes: Record<string, string>;
  items: {
    label: string; aliases?: string[]; family: string; valence: string; activation: string;
    neighbors: string[]; appraisalHints: string[]; contextTags: string[]; contextDependent?: boolean;
    provisional: boolean; normStatus: string; expressions?: DictionaryExpression[];
  }[];
};

/**
 * Everything the screens offer as choices: vocabulary, body signals, concerns,
 * needs, coach sets. Unlike the messages, this is content, and each language
 * gets its own, written for that language rather than translated
 * (docs/I18N_PLAN.md). The Korean files are used exactly as they are.
 */
export type LocaleContent = {
  bodySignals: typeof bodySignals;
  /** Keyed by the language's own concern sentences, so the keys differ between languages. */
  concernTags: { note: string; map: Record<string, string[]> };
  concerns: typeof concerns;
  emotions: Vocabulary;
  granularity: typeof granularity;
  needs: typeof needs;
  stepNotes: typeof stepNotes;
};

const ko: LocaleContent = { bodySignals, concernTags, concerns, emotions, granularity, needs, stepNotes };

/**
 * English content is a draft written for English readers (data/*.en.json,
 * 2026-10-19). Like the messages, it is used only where `englishAvailable()`
 * allows: the development server, or production after the owner's review.
 */
const en: LocaleContent = { bodySignals: bodySignalsEn, concernTags: concernTagsEn, concerns: concernsEn, emotions: emotionsEn, granularity: granularityEn, needs: needsEn, stepNotes: stepNotesEn };

/** `null` means the content for that language is not written or not yet open. */
const CONTENT: Record<Locale, LocaleContent | null> = { ko, en: englishAvailable() ? en : null };

export const hasContent = (locale: Locale) => CONTENT[locale] !== null;

/** The content for a language, or `null` while it does not exist. */
export const getContent = (locale: Locale = DEFAULT_LOCALE): LocaleContent | null => CONTENT[locale];

/** For code that cannot go on without content: fails with a clear reason instead of showing another language. */
export const requireContent = (locale: Locale = DEFAULT_LOCALE): LocaleContent => {
  const content = CONTENT[locale];
  if (!content) throw new Error(`Content for locale "${locale}" has not been written yet. See docs/I18N_PLAN.md.`);
  return content;
};
