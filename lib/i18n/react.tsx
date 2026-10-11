"use client";

import { createContext, Fragment, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "./locale";
import { getT, type MessageKey, type ParamsFor, type Translate } from "./t";

const I18nContext = createContext<Translate | null>(null);

/** Gives every screen below it the messages for one language. */
export function I18nProvider({ locale = DEFAULT_LOCALE, children }: { locale?: Locale; children: ReactNode }) {
  const t = useMemo(() => getT(locale), [locale]);
  return <I18nContext.Provider value={t}>{children}</I18nContext.Provider>;
}

/** Without a provider the app speaks its default language, as it always has. */
export const useT = (): Translate => useContext(I18nContext) ?? getT(DEFAULT_LOCALE);

export const useLocale = (): Locale => useT().locale;

/**
 * Renders a message that carries a line break (`\n` becomes `<br />`) or
 * emphasis (`<b>...</b>` becomes `<strong>`), producing the same elements the
 * screen had when the Korean was written inline.
 */
export const renderRich = (text: string): ReactNode =>
  text.split("\n").map((line, lineIndex) => (
    <Fragment key={lineIndex}>
      {lineIndex > 0 && <br />}
      {line.split(/(<b>.*?<\/b>)/).filter(Boolean).map((part, partIndex) =>
        part.startsWith("<b>") ? <strong key={partIndex}>{part.slice(3, -4)}</strong> : <Fragment key={partIndex}>{part}</Fragment>)}
    </Fragment>
  ));

/** `useT()` for a rich message: `<Rich k="landing.title" />`. */
export function Rich<K extends MessageKey>({ k, params }: { k: K; params?: ParamsFor<K>[0] }) {
  const t = useT();
  const text = (t as unknown as (key: K, params?: unknown) => string)(k, params);
  return <>{renderRich(text)}</>;
}
