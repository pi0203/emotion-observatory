import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import Home from "../app/(ko)/page";
import EnglishPage from "../app/(en)/en/page";
import { metadataFor } from "../lib/i18n/metadata";

/**
 * The JSON-LD on "/" and "/en" and Naver's ownership tag (owner's decision
 * 2026-11-11, values from the Aside instruction of that day).
 */
const jsonLdOf = () => {
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');
  expect(scripts).toHaveLength(1);
  return JSON.parse(scripts[0].innerHTML.replace(/\\u003c/g, "<"));
};

const person = {
  "@type": "Person",
  "@id": "https://eunchanjoe.vercel.app/#person",
  name: "조은찬",
  alternateName: "Eunchan Joe",
  url: "https://eunchanjoe.vercel.app/",
  description: "임상심리학을 공부합니다.",
};

describe("structured data", () => {
  afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

  it("/ has one JSON-LD with what the app is, what it is not, and who made it", () => {
    render(<Home />);
    expect(jsonLdOf()).toEqual({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebApplication",
          "@id": "https://emotion-observatory.vercel.app/#app",
          name: "감정 관찰실",
          alternateName: "Emotion Observatory",
          url: "https://emotion-observatory.vercel.app/",
          inLanguage: ["ko", "en"],
          description: "몸, 상황, 의미를 천천히 구별해보는 자기관찰 도구",
          disambiguatingDescription: "글을 분석하거나 감정을 판정하는 도구가 아닙니다. 지금 느껴지는 것을 몸, 상황, 의미로 나누어 내가 직접 적어 보는 자기관찰 기록 도구이고, 기록은 쓰는 브라우저 안에만 저장됩니다.",
          applicationCategory: "LifestyleApplication",
          operatingSystem: "웹 브라우저",
          isAccessibleForFree: true,
          creator: { "@id": "https://eunchanjoe.vercel.app/#person" },
        },
        person,
      ],
    });
  });

  it("/en has one JSON-LD, in English where the instruction asks, with the /en meta description and the same person", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(EnglishPage());
    const [app, maker] = jsonLdOf()["@graph"];
    expect(app).toMatchObject({
      "@id": "https://emotion-observatory.vercel.app/en#app",
      url: "https://emotion-observatory.vercel.app/en",
      description: metadataFor("en").description,
      disambiguatingDescription: "Not a tool that analyzes text or judges emotions. A self-observation log where you write down, yourself, what you notice in your body, the situation, and what it meant to you. Records stay only in the browser you use.",
      operatingSystem: "Web browser",
      creator: { "@id": person["@id"] },
    });
    expect(maker).toEqual(person);
  });

  it("every language's head carries Naver's ownership tag", () => {
    for (const locale of ["ko", "en"] as const) {
      expect(metadataFor(locale).verification).toEqual({ other: { "naver-site-verification": "76a44d979154532ba02f91cb1b13f44e3f335f87" } });
    }
  });
});
