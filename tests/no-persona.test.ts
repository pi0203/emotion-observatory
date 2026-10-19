// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { en } from "../lib/i18n/messages.en";
import { ko } from "../lib/i18n/messages.ko";

/**
 * The app never speaks as a someone (PRODUCT_SPEC §17 「Form constraints」,
 * §18). It has no name and no feelings, so no sentence on screen may use the
 * speaker's own first person. The user's first person is normal and stays:
 * 「내 말로 적기」, “I’m not sure” are the person's words, not the app's.
 *
 * Modelled on the homepage's build check for first person in the AI layer
 * (homepage scripts/check-first-person.mjs). Unlike that check, this one fails:
 * there is no case in this app where the app should say 「저는」.
 */
type Tree = { [key: string]: string | readonly string[] | Tree };
const strings = (tree: Tree, prefix = ""): [string, string][] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" ? [[`${prefix}${key}`, value] as [string, string]]
      : Array.isArray(value) ? value.map((item, index) => [`${prefix}${key}[${index}]`, String(item)] as [string, string])
        : strings(value as Tree, `${prefix}${key}.`));

const dataStrings = (): [string, string][] =>
  readdirSync("data").filter((name) => name.endsWith(".json")).flatMap((name) => {
    const found: [string, string][] = [];
    const walk = (value: unknown, path: string) => {
      if (typeof value === "string") found.push([path, value]);
      else if (Array.isArray(value)) value.forEach((item, index) => walk(item, `${path}[${index}]`));
      else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) walk(item, `${path}.${key}`);
    };
    walk(JSON.parse(readFileSync(`data/${name}`, "utf8")), name);
    return found;
  });

// the speaker's polite first person, with its particles; bounded so 저장 · 저녁 · 제1조 · 「저 멀리」 never match
const KO_SPEAKER = /(?<![가-힣])(저는|저도|저를|저의|저에게|저한테|저만|제가|제게|저희(?:가|는|의|도|를|에게|한테|만)?)(?![가-힣])/;
// counsellor idioms aimed at the person (PRODUCT_SPEC §18, English). Aimed at “you”,
// so the person's own question “What if I notice nothing in my body?” is not caught.
const EN_PERSONA = /\b(I notice (?:that )?you|It sounds like (?:you|that)|I[’']m here for you|I understand (?:you|how you|what you)|I remember (?:you|when you|what you)|I[’']m worried about you|I care about you)\b/i;

describe("the app does not speak as a person", () => {
  it("no Korean message or content file uses the speaker's first person", () => {
    const hits = [...strings(ko as unknown as Tree), ...dataStrings()].filter(([, text]) => KO_SPEAKER.test(text)).map(([path, text]) => `${path}: ${text}`);
    expect(hits).toEqual([]);
  });

  it("no English message uses a counsellor's first-person idiom", () => {
    const hits = strings(en as unknown as Tree).filter(([, text]) => EN_PERSONA.test(text)).map(([path, text]) => `${path}: ${text}`);
    expect(hits).toEqual([]);
  });

  it("the pattern catches what it should and spares look-alike words", () => {
    for (const sentence of ["저는 걱정돼요", "제가 함께 있을게요", "저희가 기억할게요"]) expect(KO_SPEAKER.test(sentence)).toBe(true);
    for (const sentence of ["이 브라우저에 저장됩니다", "저녁에 적은 기록", "제1조", "내 말로 적기", "저 멀리 있는 일"]) expect(KO_SPEAKER.test(sentence)).toBe(false);
    for (const sentence of ["It sounds like you had a hard day", "I notice you wrote less today", "I’m here for you"]) expect(EN_PERSONA.test(sentence)).toBe(true);
    for (const sentence of ["I’m not sure", "What if I notice nothing in my body?", "In my own words"]) expect(EN_PERSONA.test(sentence)).toBe(false);
  });
});
