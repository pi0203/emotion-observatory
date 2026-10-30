import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import Home from "../app/(ko)/page";
import { revealWords, startQuick } from "./helpers/start";

const stubGridSize = () => {
  Element.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
};

const toQuickSummary = (unsure = false) => {
  render(<Home />);
  startQuick();
  if (unsure) {
    // 잘 모르겠음 on the pad finishes the quick look straight away
    fireEvent.click(screen.getByRole("button", { name: "아직 모르겠다" }));
  } else {
    fireEvent(screen.getByRole("application", { name: /불쾌함과 유쾌함/ }), new MouseEvent("pointerdown", { bubbles: true, clientX: 40, clientY: 30 }));
    fireEvent.click(screen.getByRole("button", { name: /다음/ }));
    revealWords();
    fireEvent.click(screen.getByRole("button", { name: "짜증" }));
    fireEvent.click(screen.getByRole("button", { name: /^여기까지$/ }));
  }
  return screen.getByRole("heading", { level: 1, name: "여기까지 살펴보았습니다." }).closest("section")!;
};

describe("the closing screen puts the chosen pieces together, once", () => {
  beforeEach(() => { window.localStorage.clear(); stubGridSize(); });
  afterEach(cleanup);

  it("plays the first time and draws the marked spot on a small pad", () => {
    const section = toQuickSummary();
    expect(section).toHaveClass("reveal-screen", "reveal");
    const dot = section.querySelector(".mini-dot") as HTMLElement;
    expect(dot).not.toBeNull();
    expect(parseFloat(dot.style.left)).toBeCloseTo(10, 5);
    expect(parseFloat(dot.style.top)).toBeCloseTo(10, 5);
    expect(section.querySelector(".mini-pad")).toHaveAttribute("aria-hidden", "true");
  });

  it("keeps the title first in the document, so it is read before the summary", () => {
    const section = toQuickSummary();
    const title = screen.getByRole("heading", { level: 1 });
    const card = section.querySelector(".summary-card")!;
    expect(title.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not replay after a step back", () => {
    toQuickSummary();
    fireEvent.click(screen.getByRole("button", { name: /그래서 지금 무엇이 필요할지 살펴보기/ }));
    fireEvent.click(screen.getAllByRole("button", { name: /한 단계 뒤로/ })[0]);
    const section = screen.getByRole("heading", { level: 1, name: "여기까지 살펴보았습니다." }).closest("section")!;
    expect(section).toHaveClass("reveal-screen");
    expect(section).not.toHaveClass("reveal");
  });

  it("draws no pad when the spot was left as unsure", () => {
    const section = toQuickSummary(true);
    expect(section.querySelector(".mini-pad")).toBeNull();
  });

  it("stands still when the system asks for reduced motion", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.reveal \.reveal-step, \.reveal \.mini-dot \{ animation: none !important; \}/);
  });
});
