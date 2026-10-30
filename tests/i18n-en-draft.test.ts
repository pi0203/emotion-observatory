// @vitest-environment node
import { describe, expect, it } from "vitest";
import { hasMessages, isWellFormed, placeholdersOf } from "../lib/i18n";
import { en, enOnly, reviewStatus } from "../lib/i18n/messages.en";
import { ko } from "../lib/i18n/messages.ko";

type Tree = { [key: string]: string | readonly string[] | Tree };
const flatten = (tree: Tree, prefix = ""): Map<string, string | readonly string[]> =>
  new Map(Object.entries(tree).flatMap(([key, value]) =>
    typeof value === "string" || Array.isArray(value) ? [[`${prefix}${key}`, value as string | readonly string[]]] : [...flatten(value as Tree, `${prefix}${key}.`)]));

const koMessages = flatten(ko as unknown as Tree);
const enMessages = flatten(en as unknown as Tree);
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/;

describe("English messages (stage C draft)", () => {
  it("has exactly the Korean keys, each of the same kind", () => {
    expect([...enMessages.keys()].sort()).toEqual([...koMessages.keys()].sort());
    for (const [key, value] of koMessages) {
      const twin = enMessages.get(key)!;
      expect(Array.isArray(twin), key).toBe(Array.isArray(value));
      if (Array.isArray(value)) expect((twin as readonly string[]).length, key).toBe(value.length);
    }
  });

  it("uses only parameters the code already passes for the Korean message", () => {
    const extra: string[] = [];
    for (const [key, value] of enMessages) {
      if (typeof value !== "string") continue;
      expect(isWellFormed(value), key).toBe(true);
      const allowed = new Set(placeholdersOf(koMessages.get(key) as string));
      for (const name of placeholdersOf(value)) if (!allowed.has(name)) extra.push(`${key}: {${name}}`);
    }
    expect(extra).toEqual([]);
  });

  it("drops Korean particle placeholders, keeps line breaks and emphasis well formed", () => {
    for (const [key, value] of enMessages) {
      const text = typeof value === "string" ? value : value.join(" ");
      expect(text, key).not.toMatch(/\{~/);
      expect(text.split("<b>").length, key).toBe(text.split("</b>").length);
    }
  });

  it("is written in English, without em dashes or reassuring promises", () => {
    for (const [key, value] of enMessages) {
      const text = typeof value === "string" ? value : value.join(" ");
      // the one exception: the switch names Korean in Korean, as language menus do (it carries lang="ko")
      if (key !== "shell.otherLanguage") expect(text, key).not.toMatch(HANGUL);
      expect(text, key).not.toMatch(/—/);
      expect(text, key).not.toMatch(/\bsafe(ly)?\b|\bguarantee(s|d)?\b(?! health)|\bcure\b|\bimprove(s|d)?\b|\bproven\b/i);
    }
  });

  it("follows American usage: curly apostrophes, double quotes, punctuation inside them", () => {
    for (const [key, value] of enMessages) {
      const text = typeof value === "string" ? value : value.join(" ");
      expect(text, key).not.toMatch(/'/);
      expect(text, key).not.toMatch(/[‘]/);
      expect(text, key).not.toMatch(/”[.,]/);
      expect(text, key).not.toMatch(/\b(afterwards|towards|analyse|cancelled)\b/);
    }
  });

  it("keeps the tagline in English only, outside the shared keys", () => {
    expect(enOnly.tagline).toBe("A place to look closely at emotions we are still learning to understand.");
    expect([...koMessages.keys()].some((key) => /tagline/i.test(key))).toBe(false);
    expect([...enMessages.keys()].some((key) => /tagline/i.test(key))).toBe(false);
  });

  it("keeps the principle and safety sentences", () => {
    // placeholder subtitle since 2026-10-30; the principle that it is not a test stays
    expect(en.landing.lede).toMatch(/not a test/);
    expect(en.whyThis.research).toMatch(/none of them tested this app/);
    expect(en.synthesis.caveat).toMatch(/not an interpretation or a diagnosis/);
    expect(en.recordTransfer.exportNote).toMatch(/not encrypted/);
    expect(en.recordTransfer.deleteAllConfirmBody).toMatch(/cannot be brought back/);
  });

  it("is switched on because the owner marked it reviewed (2026-10-19)", () => {
    expect(reviewStatus).toBe("reviewed");
    expect(hasMessages("en")).toBe(true);
  });
});
