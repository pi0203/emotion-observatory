import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render } from "@testing-library/react";
import EmotionApp from "../app/emotion-app";
import { en, enOnly } from "../lib/i18n/messages.en";
import { koOnly } from "../lib/i18n/messages.ko";
import { WORDS_PATH } from "../lib/words";

/**
 * Three things that were on the Korean landing only, now on /en as drafts
 * (2026-11-10): the practitioner fold, the brain map line and the word list
 * link. Each block ends with the not-reviewed line, and every new sentence is
 * listed as 「검토 전」 in docs/EN_REVIEW.md.
 */
describe("the English landing's three draft blocks", () => {
  afterEach(cleanup);
  const english = () => render(<EmotionApp locale="en" />).container;

  it("has the practitioner fold, ending with the draft line", () => {
    const fold = [...english().querySelectorAll("details.about-fold")].find((d) => d.querySelector("summary")?.textContent === enOnly.practitioner.summary)!;
    expect(fold.lastElementChild!.textContent).toBe(enOnly.draftNote);
  });

  it("has the brain map line, with the draft line right after it", () => {
    const link = english().querySelector('a[href="https://eunchanjoe.vercel.app/map/brain/"]')!;
    expect(link.textContent).toBe(`${en.about.atlasLink} →`);
    expect(link.getAttribute("hreflang")).toBe("ko");
    const line = link.parentElement!;
    expect(line.textContent).toContain(en.about.atlasLead);
    expect(line.nextElementSibling!.className).toBe("draft-note");
  });

  it("has the word list link, marked as Korean, with the draft line right after it", () => {
    const link = english().querySelector(`a[href="${WORDS_PATH}"]`)!;
    expect(link.textContent).toBe(enOnly.practitioner.wordsLink);
    expect(link.getAttribute("hreflang")).toBe("ko");
    expect(link.parentElement!.nextElementSibling!.textContent).toBe(enOnly.draftNote);
  });

  it("shows three draft lines in English and none in Korean", () => {
    expect(english().querySelectorAll(".draft-note")).toHaveLength(3);
    cleanup();
    const { container } = render(<EmotionApp locale="ko" />);
    expect(container.querySelectorAll(".draft-note")).toHaveLength(0);
  });

  it("keeps the English drafts' shape the same as the Korean, and lists every new sentence in docs/EN_REVIEW.md as 검토 전", () => {
    expect(enOnly.practitioner.lines).toHaveLength(koOnly.practitioner.lines.length);
    const review = readFileSync(join(process.cwd(), "docs/EN_REVIEW.md"), "utf8");
    const sentences = [
      enOnly.draftNote, enOnly.practitioner.summary, ...enOnly.practitioner.lines,
      enOnly.practitioner.mailBefore.trim(), enOnly.practitioner.mailAfter.replace(/^\. /, ""), enOnly.practitioner.wordsLink,
      en.about.atlasLead, en.about.atlasLink,
    ];
    for (const sentence of sentences) {
      const row = review.split("\n").find((line) => line.includes(sentence));
      expect(row, sentence).toBeTruthy();
      expect(row, sentence).toContain("검토 전");
    }
  });

  it("follows the English rules of the reviewed text: curly quotes, no em dash, no reassuring promises", () => {
    const text = JSON.stringify(enOnly.practitioner) + enOnly.draftNote;
    expect(text).not.toMatch(/'|—/);
    expect(text).not.toMatch(/[가-힣]/);
    expect(text).not.toMatch(/\bsafe(ly)?\b|\bguarantee(s|d)?\b|\bcure\b|\bproven\b/i);
    expect(text).not.toMatch(/”[.,]/);
  });
});
