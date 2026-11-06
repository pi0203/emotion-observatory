/**
 * How much text one field accepts, in characters. The records live in
 * localStorage, which a browser caps at a few megabytes for the whole origin,
 * and a field with no ceiling lets one paste fill that or draw a chip the
 * width of the room. The limits are a safety net against an accidental paste,
 * not a length anyone should reach by typing (raised 2026-10-31 at the
 * owner's request, after 40 characters cut off a sentence in 「내 말로 적기」):
 * a word or a few sentences, a note, or a longer account.
 */
export const INPUT_LIMITS = {
  /** an emotion word, a body sensation, an appraisal in one's own words */
  word: 500,
  /** what a word means to me, a closing note */
  line: 1000,
  /** what happened, a correction to the summary */
  text: 4000,
} as const;
