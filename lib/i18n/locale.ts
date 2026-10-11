/**
 * The languages the app is built to speak. Korean is the default and, for now,
 * the only one with content: English is planned as newly written content, not a
 * translation of the Korean (docs/I18N_PLAN.md).
 */
export const LOCALES = ["ko", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ko";

export const isLocale = (value: unknown): value is Locale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

/**
 * The language a record was written in. Records saved before `locale` existed
 * were all written in Korean, so a missing or unknown value reads as Korean.
 */
export const localeOf = (record?: { locale?: unknown } | null): Locale =>
  isLocale(record?.locale) ? record.locale : DEFAULT_LOCALE;
