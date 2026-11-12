import { describe, expect, it } from "vitest";
import sitemap from "../app/sitemap";
import { SITE_URL } from "../lib/site";

/** The sitemap lists every public page with a date, and / and /en carry the same ko·en·x-default pairs as their <head> (2026-11-12). */
describe("the sitemap", () => {
  it("lists the five public pages, each with a lastModified date, and not /proto/", () => {
    const pages = sitemap();
    expect(pages.map((p) => p.url)).toEqual([`${SITE_URL}/`, `${SITE_URL}/en`, `${SITE_URL}/terms`, `${SITE_URL}/privacy`, `${SITE_URL}/words`]);
    for (const page of pages) expect(page.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(pages.some((p) => p.url.includes("/proto"))).toBe(false);
  });

  it("gives / and /en the ko·en·x-default pairs, and the Korean-only pages none", () => {
    const languages = { ko: `${SITE_URL}/`, en: `${SITE_URL}/en`, "x-default": `${SITE_URL}/` };
    const [ko, en, ...koreanOnly] = sitemap();
    expect(ko.alternates).toEqual({ languages });
    expect(en.alternates).toEqual({ languages });
    for (const page of koreanOnly) expect(page.alternates).toBeUndefined();
  });
});
