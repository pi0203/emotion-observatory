import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site";

/** One public page. /en joins when English is switched on (docs/I18N_PLAN.md). */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 }];
}
