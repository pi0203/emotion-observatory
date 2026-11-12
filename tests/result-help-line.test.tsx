import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Home from "../app/(ko)/page";
import EmotionApp from "../app/emotion-app";
import { ko, type Messages } from "../lib/i18n/messages.ko";
import { en, enOnly } from "../lib/i18n/messages.en";
import { getStorageKeys } from "../lib/storage";

/**
 * Check H1 (2026-11-11): someone wrote 「죽고 싶어」 in 내 말로 적기, pressed
 * 여기까지, and the closing screen showed no helpline number, only the small
 * 도움 button in the header. Nothing reads the entry for risk (SAFETY.md), so
 * both closing screens now carry one small sentence with 109, 1577-0199 and
 * 1388 as tel: links, the same for every entry. Since 2026-11-12 ((나)안) it
 * sits right under the summary card, above the footnote, so it is on the first
 * screen at 390px without scrolling.
 *
 * jsdom has no layout, so the 390px check is made here by order: the line is the
 * card's next sibling in the DOM, and globals.css gives it the card's flex order
 * (3), ahead of the footnote (4) and the rest (5). The height itself is measured
 * on the preview with Playwright.
 */
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const button = (name: string) => screen.getByRole("button", { name: new RegExp(`^${escape(name)}`) });

const quickSummaryWith = (messages: Messages, ownWord: string) => {
  fireEvent.click(button(messages.landing.start));
  // the keyboard puts the spot in the middle, since jsdom gives the pad no size
  fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
  fireEvent.click(button(messages.common.next));
  fireEvent.change(screen.getByRole("textbox", { name: messages.common.ownWordsPlaceholder }), { target: { value: ownWord } });
  fireEvent.click(button(messages.words.add));
  fireEvent.click(button(messages.quickCandidates.finish));
  expect(screen.getByText(messages.quickSummary.title)).toBeTruthy();
  return document.querySelector("section.screen")!;
};

const dialled = (line: Element) => Array.from(line.querySelectorAll("a")).map((link) => [link.textContent, link.getAttribute("href")]);
const NUMBERS = [["109", "tel:109"], ["1577-0199", "tel:1577-0199"], ["1388", "tel:1388"]];
const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
const orderOf = (selector: string) => {
  const rule = css.split("\n").find((text) => text.startsWith(".reveal-screen > ") && text.split("{")[0].split(",").map((part) => part.trim().replace(/^\.reveal-screen > /, "")).includes(selector));
  return Number(rule?.match(/order:\s*(\d+)/)?.[1]);
};

// right under the summary card, above the footnote and everything after it
const expectRightUnderCard = (screenEl: Element, line: Element) => {
  const card = screenEl.querySelector(":scope > .summary-card")!;
  expect(card.nextElementSibling).toBe(line);
  expect(line.compareDocumentPosition(screenEl.querySelector(":scope > .summary-footnote")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(line.compareDocumentPosition(screenEl.querySelector(".stack-actions")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // it comes in with the card, not after the rest
  expect(line.classList.contains("reveal-step")).toBe(true);
  expect((line as HTMLElement).style.getPropertyValue("--d")).toBe((card as HTMLElement).style.getPropertyValue("--d"));
};

describe("the help sentence under the summary on the closing screens", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("shows 109 and 1577-0199 after 「죽고 싶어」 is written and 여기까지 is pressed, each one dialling", () => {
    render(<Home />);
    const screenEl = quickSummaryWith(ko, "죽고 싶어");
    const line = screenEl.querySelector(".result-help")!;
    expect(line.textContent).toBe("지금 많이 힘드시다면 혼자 견디지 않아도 돼요. 자살예방상담전화 109, 정신건강 위기상담전화 1577-0199(24시간). 청소년은 1388.");
    expect(dialled(line)).toEqual(NUMBERS);
    expectRightUnderCard(screenEl, line);
  });

  it("is laid out in the card's place, ahead of the footnote, so it stays on the first screen", () => {
    expect(orderOf(".summary-card")).toBe(3);
    expect(orderOf(".result-help")).toBe(3);
    expect(orderOf(".result-help + .draft-note")).toBe(3);
    expect(orderOf(".summary-footnote")).toBe(4);
    expect(orderOf("*")).toBe(5);
  });

  it("is the same line whatever was written, since nothing reads the entry", () => {
    const lines: string[] = [];
    for (const word of ["죽고 싶어", "홀가분함"]) {
      render(<Home />);
      lines.push(quickSummaryWith(ko, word).querySelector(".result-help")!.outerHTML);
      cleanup();
      window.localStorage.clear();
    }
    expect(lines[0]).toBe(lines[1]);
  });

  it("sits under the summary of the slower look too", () => {
    const { DRAFT_KEY } = getStorageKeys();
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
      id: "draft-1", createdAt: "2026-11-12T09:00:00.000Z", status: "draft", entry: "deep", locale: "ko", stage: "outcome",
      deepReflection: { entryDecision: "observe", context: { eventText: "죽고 싶다는 생각이 들었다" } },
    }));
    render(<Home />);
    fireEvent.click(button(ko.landing.resume));
    fireEvent.click(button(ko.outcome.clarity.same));
    fireEvent.click(button(ko.outcome.usefulness.helpful));
    fireEvent.click(button(ko.common.next));
    expect(screen.getByText(ko.summary.title)).toBeTruthy();
    const screenEl = document.querySelector("section.screen")!;
    const line = screenEl.querySelector(".result-help")!;
    expect(dialled(line)).toEqual(NUMBERS);
    expectRightUnderCard(screenEl, line);
  });

  it("takes its numbers from the crisis card's own messages", () => {
    for (const messages of [ko, en]) {
      expect(messages.common.resultHelp).toContain("{num109}");
      expect(messages.common.resultHelp).toContain("{num1577}");
      expect(messages.common.resultHelp).toContain("{num1388}");
      expect(messages.common.resultHelp.replace(/\{num\d+\}/g, "")).not.toMatch(/109|1577|1388|—/);
    }
  });

  it("in English: the same place, the same numbers, and the draft line under it", () => {
    render(<EmotionApp locale="en" />);
    const screenEl = quickSummaryWith(en, "I want to die");
    const line = screenEl.querySelector(".result-help")!;
    expect(line.textContent).toBe("If things are very hard right now, you don’t have to get through it alone. Suicide Prevention Counseling Line 109, Mental Health Crisis Counseling Line 1577-0199 (24 hours). For young people, 1388.");
    expect(dialled(line)).toEqual(NUMBERS);
    expectRightUnderCard(screenEl, line);
    expect(line.nextElementSibling!.textContent).toBe(enOnly.draftNote);
    expect(line.nextElementSibling!.nextElementSibling!.className).toContain("summary-footnote");
  });

  it("lists the English sentence in docs/EN_REVIEW.md as 검토 전", () => {
    const review = readFileSync(join(process.cwd(), "docs/EN_REVIEW.md"), "utf8");
    const row = review.split("\n").find((text) => text.includes(en.common.resultHelp));
    expect(row).toBeTruthy();
    expect(row).toContain("검토 전");
  });
});
