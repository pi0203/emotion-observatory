import { DEFAULT_LOCALE, type Locale } from "./locale";
import { getT } from "./t";

const formatters = new Map<Locale, Intl.DateTimeFormat>();

/** Two-digit, 24-hour parts in the viewer's own time zone, as the screen always showed them. */
const formatterFor = (locale: Locale) => {
  const cached = formatters.get(locale);
  if (cached) return cached;
  const formatter = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    numberingSystem: "latn",
  });
  formatters.set(locale, formatter);
  return formatter;
};

/**
 * When a record was made. Intl supplies the numbers; the order and punctuation
 * come from the message `records.when`, so Korean reads exactly as before.
 */
export const formatWhen = (iso: string, locale: Locale = DEFAULT_LOCALE) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const parts = Object.fromEntries(formatterFor(locale).formatToParts(date).map((part) => [part.type, part.value]));
  return getT(locale)("records.when", { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute });
};
