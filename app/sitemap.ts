import type { MetadataRoute } from "next";
import { englishAvailable } from "../lib/i18n/availability";
import { SITE_URL } from "../lib/site";
import { PRIVACY_PATH, TERMS_PATH } from "../lib/terms";
import { WORDS_PATH } from "../lib/words";

/** The public pages: Korean at /, the terms at /terms the privacy policy at /privacy and the word list at /words (Korean only), and English at /en once the owner has opened it (docs/I18N_PLAN.md). */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [{ url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 }];
  if (englishAvailable()) pages.push({ url: `${SITE_URL}/en`, changeFrequency: "monthly", priority: 0.8 });
  pages.push({ url: `${SITE_URL}${TERMS_PATH}`, changeFrequency: "yearly", priority: 0.3 });
  pages.push({ url: `${SITE_URL}${PRIVACY_PATH}`, changeFrequency: "yearly", priority: 0.3 });
  pages.push({ url: `${SITE_URL}${WORDS_PATH}`, changeFrequency: "monthly", priority: 0.5 });
  return pages;
}
