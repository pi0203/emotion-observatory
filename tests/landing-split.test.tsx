import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";

/**
 * Third round (2026-11-05): the 답답함 example from the folded 「왜 감정을 조금 더
 * 자세히 살펴볼까요?」, drawn under the buttons, with one line under it.
 */
describe("the split drawing on the landing", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("sits under the buttons: one word, two kinds, what each calls for, and one line", () => {
    render(<Home />);
    const figure = document.querySelector(".split-figure") as HTMLElement;
    expect(figure).toBeTruthy();
    const start = screen.getByRole("button", { name: new RegExp(`^${ko.landing.start}`) });
    expect(start.compareDocumentPosition(figure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(figure.querySelector(".split-word")!.textContent).toBe(ko.landing.split.word);
    const branches = [...figure.querySelectorAll(".split-branch")].map((item) => item.textContent);
    expect(branches).toEqual([ko.landing.split.tired + ko.landing.split.tiredNeed, ko.landing.split.stuck + ko.landing.split.stuckNeed]);
    expect(figure.querySelector("figcaption")!.textContent).toBe("좋은지 싫은지 잘 몰라도 괜찮아요. 이쯤이라고 눌러 두면, 쌓인 점들이 내 쪽을 보여 줘요.");
    // the lines are decoration only
    for (const svg of figure.querySelectorAll("svg")) expect(svg.getAttribute("aria-hidden")).toBe("true");
  });

  it("keeps the folded text where it was", () => {
    render(<Home />);
    expect(screen.getByText(ko.whyThis.summary)).toBeTruthy();
    expect(screen.getByText(ko.whyThis.distinguish)).toBeTruthy();
  });

  it("adds one line and no other paragraph", () => {
    render(<Home />);
    expect(document.querySelectorAll(".split-figure p")).toHaveLength(1); // the word bubble
    expect(document.querySelectorAll(".split-figure figcaption")).toHaveLength(1);
  });
});

describe("its motion", () => {
  const css = readFileSync("app/globals.css", "utf8");
  it("draws once in about a second, and not at all with reduced motion", () => {
    expect(css).toMatch(/\.split-play \.split-lines \{[^}]*animation: split-draw \.55s ease-out \.15s forwards/);
    expect(css).toMatch(/\.split-play \.split-need \{[^}]*\.3s ease-out \.9s/);
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toMatch(/\.split-play \.split-lines, \.split-play \.split-stem \{ animation: none; clip-path: none; \}/);
    expect(reduced).toMatch(/\.split-play \.split-need \{ animation: none; opacity: 1; \}/);
  });

  it("uses no colour per feeling", () => {
    const block = css.slice(css.indexOf(".split-figure {"));
    expect(block).not.toMatch(/--tone-/);
  });
});

describe("in English", () => {
  it("has the drawing's words and no nickname", () => {
    expect(Object.keys(en.landing.split)).toEqual(Object.keys(ko.landing.split));
    expect(JSON.stringify(en.landing)).not.toMatch(/이쯤|Ijjeum/);
  });
});
