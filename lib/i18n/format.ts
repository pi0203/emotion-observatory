/**
 * The message format, kept deliberately small.
 *
 *   {name}          the value of `name`
 *   {~name|A/B}     only a particle: A after a final consonant, B after a vowel,
 *                   chosen by the last syllable of `name`. Korean grammar stays in
 *                   the Korean messages instead of in the code.
 *
 * Rich text (line breaks and emphasis) is handled by the React layer, not here.
 */
export type ParamValue = string | number;
export type Params = Record<string, ParamValue>;

const PLACEHOLDER = /\{(~?)([A-Za-z][A-Za-z0-9]*)(?:\|([^/{}]*)\/([^{}]*))?\}/g;

/** Picks the Korean particle that fits the last syllable of `word`. */
export const particleFor = (word: string, afterConsonant: string, afterVowel: string) => {
  const last = word.trim().at(-1) ?? "";
  const code = last.charCodeAt(0);
  const isHangulSyllable = code >= 0xac00 && code <= 0xd7a3;
  if (!isHangulSyllable) return afterVowel;
  return (code - 0xac00) % 28 === 0 ? afterVowel : afterConsonant;
};

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
