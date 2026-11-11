import type { Metadata } from "next";
import { SITE_URL } from "../site";
import { type Locale } from "./locale";
import { englishAvailable } from "./availability";
import { getT, hasMessages } from "./t";

/**
 * The <head> for a language: title, description, canonical address and the
 * card shown when the link is shared (Open Graph / Twitter). The share image
 * is a plain file in public/, named here explicitly: the opengraph-image file
 * convention attaches to a segment's layout, and with one root layout per
 * language there is none at app/ for it to attach to (Turbopack emitted no tag). A language
 * without messages gets a plain development notice instead of borrowing
 * Korean, so it is obvious in the tab that nothing has been written for it yet.
 */
/**
 * The document title (<title>, og:title, twitter:title). The Korean pages add
 * the English name after the Korean one, so a search for "emotion observatory"
 * finds them too (owner's decision 2026-11-02); the name on the screen stays
 * Korean only. The English name is the one in messages.en.ts.
 */
export const documentTitle = (locale: Locale): string =>
  locale === "ko" ? `${getT("ko")("meta.title")} · ${getT("en")("meta.title")}` : getT(locale)("meta.title");

/**
 * Naver Search Advisor's ownership tag (owner's decision 2026-11-11). Every page
 * takes its <head> from metadataFor through its root layout, and the pages that
 * set their own title (/terms, /privacy, /words) do not touch `verification`,
 * so the tag is on every page once.
 */
const verification: Metadata["verification"] = { other: { "naver-site-verification": "76a44d979154532ba02f91cb1b13f44e3f335f87" } };

export const metadataFor = (locale: Locale): Metadata => {
  if (!hasMessages(locale)) {
    return { metadataBase: new URL(SITE_URL), verification, title: `[${locale}] messages not written`, description: `Development only: no messages for "${locale}" yet. See docs/I18N_PLAN.md.`, robots: { index: false } };
  }
  const t = getT(locale);
  const path = locale === "ko" ? "/" : `/${locale}`;
  const title = documentTitle(locale);
  const image = { url: "/og-image.png", width: 1200, height: 630, alt: t("meta.shareImageAlt") };
  return {
    metadataBase: new URL(SITE_URL),
    verification,
    title,
    description: t("meta.description"),
    // each language names the other, so search engines treat them as one page in two languages
    alternates: englishAvailable() ? { canonical: path, languages: { ko: "/", en: "/en" } } : { canonical: path },
    openGraph: { type: "website", siteName: t("meta.title"), title, description: t("meta.description"), url: path, locale: locale === "ko" ? "ko_KR" : "en_US", images: [image] },
    twitter: { card: "summary_large_image", title, description: t("meta.description"), images: [image] },
  };
};
