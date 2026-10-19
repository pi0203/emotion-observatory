/**
 * How much text one field accepts, in characters. The records live in
 * localStorage, which a browser caps at a few megabytes for the whole origin,
 * and a field with no ceiling lets one paste fill that or draw a chip the
 * width of the room. The limits are generous for what each field is for:
 * a word or short phrase, one line, or a few sentences.
 */
export const INPUT_LIMITS = {
  /** an emotion word, a body sensation, an appraisal in one's own words */
  word: 40,
  /** what a word means to me, a closing note */
  line: 200,
  /** what happened, a correction to the summary */
  text: 1000,
} as const;
