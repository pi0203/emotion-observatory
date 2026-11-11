/**
 * The message format, kept deliberately small.
 *
 *   {name}          the value of `name`
 *   {~name|A/B}     only a particle: A after a final consonant, B after a vowel,
 *                   chosen by the last syllable of `name` (으로/로 also takes B after ㄹ). Korean grammar stays in
 *                   the Korean messages instead of in the code.
 *
 * Rich text (line breaks and emphasis) is handled by the React layer, not here.
 */
export type ParamValue = string | number;
export type Params = Record<string, ParamValue>;

const PLACEHOLDER = /\{(~?)([A-Za-z][A-Za-z0-9]*)(?:\|([^/{}]*)\/([^{}]*))?\}/g;

/**
 * Picks the Korean particle that fits the last syllable of `word`.
 * A word typed or pasted in decomposed form (NFD, as macOS and iOS can give)
 * is composed first, so its final consonant is read (「“피곤함”를」, 2026-11-10).
 * A word that ends in Latin, a digit or a symbol gets both forms: 「을(를)」.
 * One exception to the final-consonant rule: 「으로/로」 takes 「로」 after ㄹ too
 * (「말로」, 「물로」, not 「말으로」), as Korean grammar has it (2026-11-10);
 * so do 으로서/로서 and 으로써/로써, which share the shape.
 */
export const particleFor = (word: string, afterConsonant: string, afterVowel: string) => {
  const last = word.normalize("NFC").trim().at(-1) ?? "";
  const code = last.charCodeAt(0);
  const isHangulSyllable = code >= 0xac00 && code <= 0xd7a3;
  if (!isHangulSyllable) return `${afterConsonant}(${afterVowel})`;
  const final = (code - 0xac00) % 28;
  if (final === 0) return afterVowel;
  if (final === FINAL_RIEUL && afterConsonant === EU + afterVowel) return afterVowel;
  return afterConsonant;
};

/** The index of ㄹ among the final consonants of a Hangul syllable (0 is none). */
const FINAL_RIEUL = 8;
/**
 * The syllable 으 (U+C73C), from its code point like the syllable arithmetic above,
 * so the grammar stays a rule and no Korean wording is written into the code.
 * A pair whose consonant form is 으 + its vowel form (으로/로, 으로서/로서,
 * 으로써/로써) takes the vowel form after ㄹ.
 */
const EU = String.fromCharCode(0xc73c);

/** Every parameter a message refers to, particles included. */
export const placeholdersOf = (template: string): string[] =>
  [...new Set([...template.matchAll(PLACEHOLDER)].map((match) => match[2]))];

/** A `{` or `}` that is not part of a well-formed placeholder is a typo in the message. */
export const isWellFormed = (template: string) => !/[{}]/.test(template.replace(PLACEHOLDER, ""));

export const interpolate = (template: string, params: Params = {}): string =>
  template.replace(PLACEHOLDER, (whole, particleOnly: string, name: string, afterConsonant?: string, afterVowel?: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`Missing message parameter "${name}" in "${template}"`);
    const text = String(value);
    if (particleOnly) return particleFor(text, afterConsonant ?? "", afterVowel ?? "");
    return text;
  });
