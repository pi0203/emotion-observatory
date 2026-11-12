import type { MetadataRoute } from "next";
import { englishAvailable } from "../lib/i18n/availability";
import { LANGUAGES } from "../lib/i18n/metadata";
import { SITE_URL } from "../lib/site";
import { PRIVACY_PATH, TERMS_PATH } from "../lib/terms";
import { WORDS_PATH } from "../lib/words";

/**
 * The public pages: Korean at /, the terms at /terms the privacy policy at /privacy and the word list at /words (Korean only), and English at /en once the owner has opened it (docs/I18N_PLAN.md).
 * /proto/ is blocked in robots.ts and is not listed.
 *
 * lastModified (2026-11-12) is the date of the last commit to each page's own text:
 * / and /en and /words: lib/i18n/messages.*.ts and app/emotion-app.tsx; /terms and /privacy: data/terms.ko.json and data/privacy.ko.json.
 * Change the date here when that text changes.
 * / and /en carry the same ko·en·x-default pairs as their <link rel="alternate"> (lib/i18n/metadata.ts).
 */
export const LAST_MODIFIED = { landing: "2026-11-12", terms: "2026-11-10", privacy: "2026-11-10", words: "2026-11-12" } as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const en = englishAvailable();
  const alternates = en
    ? { languages: Object.fromEntries(Object.entries(LANGUAGES).map(([lang, path]) => [lang, path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`])) }
    : undefined;
  const pages: MetadataRoute.Sitemap = [{ url: `${SITE_URL}/`, lastModified: LAST_MODIFIED.landing, changeFrequency: "monthly", priority: 1, ...(alternates && { alternates }) }];
  if (en) pages.push({ url: `${SITE_URL}/en`, lastModified: LAST_MODIFIED.landing, changeFrequency: "monthly", priority: 0.8, alternates });
  pages.push({ url: `${SITE_URL}${TERMS_PATH}`, lastModified: LAST_MODIFIED.terms, changeFrequency: "yearly", priority: 0.3 });
  pages.push({ url: `${SITE_URL}${PRIVACY_PATH}`, lastModified: LAST_MODIFIED.privacy, changeFrequency: "yearly", priority: 0.3 });
  pages.push({ url: `${SITE_URL}${WORDS_PATH}`, lastModified: LAST_MODIFIED.words, changeFrequency: "monthly", priority: 0.5 });
  return pages;
}
