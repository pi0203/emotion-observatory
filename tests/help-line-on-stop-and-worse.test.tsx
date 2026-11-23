import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import EnglishPage from "../app/(en)/en/page";
import { ko } from "../lib/i18n/messages.ko";
import { en, enOnly } from "../lib/i18n/messages.en";
import { getStorageKeys } from "../lib/storage";

/**
 * Before the 11/18 demo (2026-11-17): the 그만하기 screen and the 더 불편해졌어요
 * screen carry the same help line as the closing screens, with 109, 1577-0199
 * and 1388 as tel: links, shown as it is and not folded. The folded
 * 「도움받을 수 있는 곳 보기」 stays below it. Nothing reads the entry (SAFETY.md).
 */
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const button = (name: string) => screen.getByRole("button", { name: new RegExp(`^${escape(name)}`) });
const NUMBERS = [["109", "tel:109"], ["1577-0199", "tel:1577-0199"], ["1388", "tel:1388"]];
const dialled = (line: Element) => Array.from(line.querySelectorAll("a")).map((link) => [link.textContent, link.getAttribute("href")]);

const stopAtGate = (m: typeof ko | typeof en) => {
  fireEvent.click(button(m.landing.start));
  fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
  fireEvent.click(button(m.common.next));
  fireEvent.click(screen.getByRole("button", { name: m.quickCandidates.deep }));
  fireEvent.click(screen.getByRole("button", { name: m.entry.stop }));
};

const worsen = (eventText: string) => {
  const { DRAFT_KEY } = getStorageKeys();
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
    id: "draft-1", createdAt: "2026-11-17T09:00:00.000Z", status: "draft", entry: "deep", locale: "ko", stage: "outcome",
    deepReflection: { entryDecision: "observe", body: [], affect: {}, context: { eventText } },
  }));
  render(<Home />);
  fireEvent.click(button(ko.landing.resume));
  fireEvent.click(button(ko.outcome.clarity.more_distressed));
  fireEvent.click(button(ko.outcome.usefulness.unhelpful));
  fireEvent.click(button(ko.common.next));
  expect(screen.getByText(ko.worsened.eyebrow)).toBeTruthy();
};

// shown on the screen itself, not inside the folded help
const expectOpenLine = (expected: string) => {
  const screenEl = document.querySelector("section.screen")!;
  const line = screenEl.querySelector(":scope > .result-help")!;
  expect(line).not.toBeNull();
  expect(line.closest("details")).toBeNull();
  expect(line.textContent).toBe(expected);
  expect(dialled(line)).toEqual(NUMBERS);
  const help = screenEl.querySelector(":scope > details.help-reveal") as HTMLDetailsElement;
  expect(help.open).toBe(false);
  expect(line.compareDocumentPosition(help) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  return line;
};

const KO_LINE = "지금 많이 힘드시다면 혼자 견디지 않아도 돼요. 자살예방상담전화 109(24시간), 정신건강 위기상담전화 1577-0199(24시간). 청소년은 1388.";
const EN_LINE = "If things are very hard right now, you don’t have to get through it alone. In Korea: Suicide Prevention Counseling Line 109, Mental Health Crisis Counseling Line 1577-0199 (24 hours). For young people, 1388.";

describe("the help line on the 그만하기 and 더 불편해졌어요 screens", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("shows 109, 1577-0199 and 1388 unfolded after 그만하기", () => {
    render(<Home />);
    stopAtGate(ko);
    expect(screen.getByText(ko.stopped.eyebrow)).toBeTruthy();
    expectOpenLine(KO_LINE);
  });

  it("shows the same line, with the draft line under it, after Stop in English", () => {
    render(<EnglishPage />);
    stopAtGate(en);
    const line = expectOpenLine(EN_LINE);
    expect(line.nextElementSibling!.textContent).toBe(enOnly.draftNote);
  });

  it("shows 109, 1577-0199 and 1388 unfolded after 더 불편해졌어요", () => {
    worsen("");
    expectOpenLine(KO_LINE);
  });

  it("is the same line whatever was written, since nothing reads the entry", () => {
    const lines: string[] = [];
    for (const text of ["죽고 싶다는 생각이 들었다", "점심을 먹었다"]) {
      worsen(text);
      lines.push(document.querySelector("section.screen > .result-help")!.outerHTML);
      cleanup();
      window.localStorage.clear();
    }
    expect(lines[0]).toBe(lines[1]);
  });
});

describe("the footer's line on how the text was written", () => {
  afterEach(cleanup);

  it("is in the Korean footer, and in the English one with the draft line", () => {
    render(<Home />);
    expect(document.querySelector(".site-footer .site-footer-ai")!.textContent).toBe("화면의 글은 AI(Claude)와 함께 썼고, 만든 사람이 확인합니다.");
    expect(document.querySelector(".site-footer .draft-note")).toBeNull();
    cleanup();
    render(<EnglishPage />);
    const line = document.querySelector(".site-footer .site-footer-ai")!;
    expect(line.textContent).toBe("The text on these screens was written with AI (Claude) and checked by the maker.");
    expect(line.nextElementSibling!.textContent).toBe(enOnly.draftNote);
  });
});

describe("the English changed before the demo", () => {
  it("is listed in docs/EN_REVIEW.md as 검토 전", async () => {
    const { readFileSync } = await import("node:fs");
    const review = readFileSync("docs/EN_REVIEW.md", "utf8").split("\n");
    for (const sentence of [en.crisis.emergency, en.crisis.lifeline109, en.crisis.mental1577, en.shell.aiNote]) {
      const row = review.find((text) => text.includes(sentence));
      expect(row, sentence).toBeTruthy();
      expect(row, sentence).toContain("검토 전");
    }
  });

  it("ends the English crisis card with the draft line, and leaves the Korean card without one", () => {
    render(<EnglishPage />);
    const card = screen.getAllByRole("complementary", { name: en.crisis.title })[0];
    expect(card.lastElementChild!.textContent).toBe(enOnly.draftNote);
    cleanup();
    render(<Home />);
    expect(screen.getByRole("complementary", { name: ko.crisis.title }).querySelector(".draft-note")).toBeNull();
  });
});
