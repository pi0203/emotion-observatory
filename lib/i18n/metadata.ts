import type { Metadata } from "next";
import { type Locale } from "./locale";
import { getT, hasMessages } from "./t";

/**
 * The <head> title and description for a language. A language without
 * messages gets a plain development notice instead of borrowing Korean, so it
 * is obvious in the tab that nothing has been written for it yet.
 */
export const metadataFor = (locale: Locale): Metadata => {
  if (!hasMessages(locale)) {
    return { title: `[${locale}] messages not written`, description: `Development only: no messages for "${locale}" yet. See docs/I18N_PLAN.md.` };
  }
  const t = getT(locale);
  return { title: t("meta.title"), description: t("meta.description") };
};
