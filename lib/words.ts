/**
 * /words, every word of the app on one page (2026-11-02), for reading the whole
 * list before choosing, or printing it (docs/FIELD_NOTES_2026-11-02.md, the
 * first note). Korean only for now (docs/I18N_PLAN.md).
 *
 * Only what helps a reader tell words apart is drawn: the word, its other
 * names, the hints, the words to compare and the dictionary expressions.
 * Family, valence, activation, context tags, norm status and how often a word
 * was met in the vocabulary sources stay out (docs/vocab-sources/
 * DECISIONS_2026_10_31.md §1-2), and no colour tells one feeling from another
 * (PRODUCT_SPEC §19).
 */
export const WORDS_PATH = "/words";

/** The fields the page draws. Anything else an item carries is never read. */
export type WordCard = {
  label: string;
  aliases: string[];
  hints: string[];
  neighbors: string[];
  expressions: string[];
};

type Item = {
  label: string;
  aliases?: readonly string[];
  appraisalHints?: readonly string[];
  neighbors?: readonly string[];
  expressions?: readonly { text: string }[];
};

/** The words in 가나다 order, each with only the fields above. */
export const wordCards = (items: readonly Item[]): WordCard[] =>
  items
    .map((item) => ({
      label: item.label,
      aliases: [...(item.aliases ?? [])],
      hints: [...(item.appraisalHints ?? [])],
      neighbors: [...(item.neighbors ?? [])],
      expressions: (item.expressions ?? []).map((expression) => expression.text),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));

/** The card's id on the page, so 견줘 볼 말 can point at it. */
export const wordId = (label: string) => `word-${label.replace(/\s+/g, "-")}`;
