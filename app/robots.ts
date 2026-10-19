import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/site";

/** Everything public may be indexed; the development-only screens are 404 in production anyway. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/proto/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
