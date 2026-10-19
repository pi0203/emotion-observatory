import type { Metadata } from "next";
import { SITE_URL } from "../site";
import { type Locale } from "./locale";
import { getT, hasMessages } from "./t";

/**
 * The <head> for a language: title, description, canonical address and the
 * card shown when the link is shared (Open Graph / Twitter). The share image
 * itself comes from app/opengraph-image.png by file convention. A language
 * without messages gets a plain development notice instead of borrowing
 * Korean, so it is obvious in the tab that nothing has been written for it yet.
 */
export const metadataFor = (locale: Locale): Metadata => {
  if (!hasMessages(locale)) {
    return { metadataBase: new URL(SITE_URL), title: `[${locale}] messages not written`, description: `Development only: no messages for "${locale}" yet. See docs/I18N_PLAN.md.`, robots: { index: false } };
  }
  const t = getT(locale);
  const path = locale === "ko" ? "/" : `/${locale}`;
  return {
    metadataBase: new URL(SITE_URL),
    title: t("meta.title"),
    description: t("meta.description"),
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: t("meta.title"), title: t("meta.title"), description: t("meta.description"), url: path, locale: locale === "ko" ? "ko_KR" : "en_US" },
    twitter: { card: "summary_large_image", title: t("meta.title"), description: t("meta.description") },
  };
};
