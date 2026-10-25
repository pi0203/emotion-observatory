// @vitest-environment node
import { describe, expect, it } from "vitest";
import emotionsEn from "../data/emotions.en.json";
import concernsEn from "../data/concerns.en.json";
import concernTagsEn from "../data/concern-tags.en.json";
import bodyEn from "../data/body-signals.en.json";
import { en, enOnly } from "../lib/i18n/messages.en";

/**
 * Decisions from the English review of 2026-10-19 (blind back-translation, then
 * visitor, translator and linguist reviews; docs/EN_REVIEW_2026_10_19.md).
 */
type Tree = { [key: string]: string | readonly string[] | Tree };
const values = (tree: Tree): string[] => Object.values(tree).flatMap((v) => (typeof v === "string" ? [v] : Array.isArray(v) ? [...v] : values(v as Tree)));
// paper titles in about.refs keep their own wording (one of them says “self-monitoring”)
const { refs: _refs, ...aboutWithoutRefs } = en.about;
const all = values({ ...en, about: aboutWithoutRefs } as unknown as Tree);

describe("English review decisions (2026-10-19)", () => {
  it("keeps the crisis card as strong as the Korean, and says the numbers are Korean", () => {
    expect(en.crisis.emergency).toMatch(/^If you are physically hurt or in immediate danger/);
    expect(en.crisis.intro).toMatch(/in South Korea/);
    expect(enOnly.outsideKorea).toBe("All numbers on this card are for South Korea. If you are outside Korea, call your local emergency number.");
  });

  it("keeps the Korean “not yet” in the evidence sentences", () => {
    expect(en.about.not).toMatch(/has not yet been shown/);
    expect(en.about.refsClosing).toMatch(/No study has tested this app itself yet/);
    expect(en.about.refsSummary).toBe("Six studies consulted");
  });

  it("uses one word for one thing: entries, in progress, slow look, real emotion", () => {
    for (const text of all) {
      expect(text).not.toMatch(/\bunfinished\b/i);
      expect(text).not.toMatch(/\brecords\b/i);
      expect(text).not.toMatch(/true emotion/i);
      expect(text).not.toMatch(/\bself-monitoring\b/i);
      // the app never speaks as “we” (the human “how we put emotions into words” is fine)
      expect(text).not.toMatch(/(^|[.!?]\s+)We\b/);
    }
    for (const key of ["landing", "quickSummary", "quickCandidates", "need"] as const) {
      const deep = (en[key] as { deep?: string; routeDeep?: string }).deep ?? (en[key] as { routeDeep?: string }).routeDeep;
      expect(deep, key).toBe("Take a slower look");
    }
  });

  it("offers only labels that work after “I feel”, keeping the old words as aliases", () => {
    const labels = new Set(emotionsEn.items.map((item) => item.label));
    const renamed: [string, string][] = [["hard on myself", "self-critical"], ["on edge", "irritable"], ["helpless", "unmotivated"], ["small", "inadequate"], ["absorbed", "focused"], ["stuck", "lost"], ["unburdened", "lighter"], ["admiring", "full of admiration"]];
    for (const [old, now] of renamed) {
      expect(labels.has(old), old).toBe(false);
      const item = emotionsEn.items.find((i) => i.label === now);
      expect(item?.aliases, now).toContain(old);
    }
    expect(labels.has("upset")).toBe(true);
    expect(labels.has("displeased")).toBe(true);
  });

  it("keeps the concern tags in step with the renamed concerns, and body words free of loaded idioms", () => {
    for (const concern of concernsEn.filter((c) => c !== "I’m not sure")) expect(Object.keys(concernTagsEn.map), concern).toContain(concern);
    const body = bodyEn.items.map((i) => i.label).join(" | ");
    expect(body).not.toMatch(/grounded|prickly/);
    expect(bodyEn.regions).toContain("Energy and heaviness");
  });
});
