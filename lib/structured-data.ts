import ko from "../data/structured-data.ko.json";
import en from "../data/structured-data.en.json";
import { SITE_URL } from "./site";
import { type Locale } from "./i18n/locale";
import { getT } from "./i18n/t";

/**
 * The JSON-LD for "/" and "/en" (owner's decision 2026-11-11): what the app is,
 * what it is not, and who made it, for search engines and AI answers that had
 * described it as a text-analysis service. Nothing here is drawn on screen.
 * The names and the description are the ones in <head> (messages.*.ts); the
 * rest is in data/structured-data.*.json.
 */
export const OWNER_URL = "https://eunchanjoe.vercel.app/";
const PERSON_ID = `${OWNER_URL}#person`;

const values = { ko, en } as const;

export const structuredDataFor = (locale: Locale) => {
  const own = locale === "en" ? values.en : values.ko;
  const url = locale === "ko" ? `${SITE_URL}/` : `${SITE_URL}/${locale}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${url}#app`,
        name: getT("ko")("meta.title"),
        alternateName: getT("en")("meta.title"),
        url,
        inLanguage: ["ko", "en"],
        description: getT(locale)("meta.description"),
        disambiguatingDescription: own.disambiguatingDescription,
        applicationCategory: "LifestyleApplication",
        operatingSystem: own.operatingSystem,
        isAccessibleForFree: true,
        creator: { "@id": PERSON_ID },
      },
      {
        "@type": "Person",
        "@id": PERSON_ID,
        name: ko.creator.name,
        alternateName: ko.creator.alternateName,
        url: OWNER_URL,
        description: ko.creator.description,
      },
    ],
  };
};
