import { interpolate, type ParamValue } from "./format";
import { DEFAULT_LOCALE, type Locale } from "./locale";
import { ko, type Messages } from "./messages.ko";
import { en } from "./messages.en";
import { englishAvailable } from "./availability";

type Ko = typeof ko;

/** Dotted paths to every string message, e.g. "landing.title". */
type StringKeys<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : T[K] extends readonly string[] ? never : StringKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Dotted paths to every list message, e.g. "affectBands.valence". */
type ListKeys<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? never : T[K] extends readonly string[] ? `${Prefix}${K}` : ListKeys<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = StringKeys<Ko>;
export type ListKey = ListKeys<Ko>;

type At<T, Path extends string> = Path extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T ? At<T[Head], Rest> : never
  : Path extends keyof T ? T[Path] : never;

type NameOf<Body extends string> = Body extends `~${infer Name}|${string}` ? Name : Body;
type Placeholders<S> = S extends `${string}{${infer Body}}${infer Rest}` ? NameOf<Body> | Placeholders<Rest> : never;

/**
 * The parameters a message needs, worked out from the Korean text itself, so a
 * missing or misspelled parameter is a type error rather than a broken screen.
 */
export type ParamsFor<K extends MessageKey> = [Placeholders<At<Ko, K>>] extends [never]
  ? []
  : [params: Record<Placeholders<At<Ko, K>>, ParamValue>];

export type Translate = {
  <K extends MessageKey>(key: K, ...params: ParamsFor<K>): string;
  list: (key: ListKey) => readonly string[];
  locale: Locale;
};

/**
 * Messages by language. English is new writing, not a translation
 * (docs/I18N_PLAN.md). It is switched on only where `englishAvailable()` says
 * so; elsewhere asking for it fails loudly instead of quietly showing Korean.
 */
const MESSAGES: Record<Locale, Messages | null> = { ko, en: englishAvailable() ? en : null };

export const hasMessages = (locale: Locale) => MESSAGES[locale] !== null;

const lookup = (messages: Messages, key: string): unknown =>
  key.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), messages);

export const createT = (locale: Locale = DEFAULT_LOCALE): Translate => {
  const messages = MESSAGES[locale];
  if (!messages) throw new Error(`No messages for locale "${locale}" yet. See docs/I18N_PLAN.md.`);
  const t = (<K extends MessageKey>(key: K, ...params: ParamsFor<K>) => {
    const template = lookup(messages, key);
    if (typeof template !== "string") throw new Error(`Unknown message key "${key}" for locale "${locale}"`);
    return interpolate(template, params[0]);
  }) as Translate;
  t.list = (key) => {
    const value = lookup(messages, key);
    if (!Array.isArray(value)) throw new Error(`Unknown list key "${key}" for locale "${locale}"`);
    return value;
  };
  t.locale = locale;
  return t;
};

const cache = new Map<Locale, Translate>();

/** The shared translator for a language; built once. */
export const getT = (locale: Locale = DEFAULT_LOCALE): Translate => {
  const cached = cache.get(locale);
  if (cached) return cached;
  const t = createT(locale);
  cache.set(locale, t);
  return t;
};
