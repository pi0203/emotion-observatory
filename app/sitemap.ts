import type { MetadataRoute } from "next";
import { englishAvailable } from "../lib/i18n/availability";
import { SITE_URL } from "../lib/site";

/** The public pages: Korean at /, and English at /en once the owner has opened it (docs/I18N_PLAN.md). */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages: MetadataRoute.Sitemap = [{ url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 }];
  if (englishAvailable()) pages.push({ url: `${SITE_URL}/en`, changeFrequency: "monthly", priority: 0.8 });
  return pages;
}
