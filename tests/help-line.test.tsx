import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";
import { getStorageKeys } from "../lib/storage";
import type { EmotionSession } from "../lib/session-types";

/**
 * 도움 한 줄 (third round, 2026-11-05): the same line at the foot of the records
 * list and of a record, opening the header's help card. Nothing in a record
 * changes it.
 */
const record = (id: string, text: string): EmotionSession => ({
  id, createdAt: "2026-11-03T02:00:00.000Z", completedAt: "2026-11-03T02:05:00.000Z", status: "completed",
  stage: "quick-summary", entry: "quick", locale: "ko",
  quickCheck: { affect: { valence: 0.2, activation: 0.8 }, candidatePool: [], selected: [], context: { eventText: text } },
});
const lineText = `${ko.common.helpLine} →`;

describe("the help line", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);
  const openRecords = (records: EmotionSession[]) => {
    window.localStorage.setItem(getStorageKeys().COMPLETED_KEY, JSON.stringify(records));
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
  };

  it("sits under the records list, and opens the same card as the header's 도움", () => {
    openRecords([record("a", "버스를 놓쳤다")]);
    const line = document.querySelector(".help-line")!;
    expect(document.querySelector(".record-list")!.compareDocumentPosition(line) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(line.textContent).toBe(lineText);
    fireEvent.click(within(line as HTMLElement).getByRole("button"));
    const dialog = screen.getByRole("dialog", { name: ko.crisis.title });
    expect(dialog.querySelector(".crisis-card")).toBeTruthy();
  });

  it("is there with no records too", () => {
    openRecords([]);
    expect(document.querySelector(".help-line")!.textContent).toBe(lineText);
  });

  it("sits at the very foot of a record, the same whatever the record says", () => {
    const texts: string[] = [];
    for (const text of ["버스를 놓쳤다", "죽고 싶다는 생각이 들었다"]) {
      openRecords([record("a", text)]);
      fireEvent.click(document.querySelector(".record-row")!);
      const screenEl = document.querySelector("section.screen")!;
      const line = screenEl.lastElementChild!;
      expect(line.className).toBe("help-line");
      texts.push(screenEl.querySelectorAll(".help-line").length + line.outerHTML);
      cleanup();
      window.localStorage.clear();
    }
    expect(texts[0]).toBe(texts[1]);
  });

  it("reads nothing for risk in the code that draws it", () => {
    const source = readFileSync("app/emotion-app.tsx", "utf8");
    const helpLine = source.slice(source.indexOf("function HelpLine"), source.indexOf("/** The helplines, folded"));
    expect(helpLine).not.toMatch(/session|text|keyword|risk\(/i);
  });

  it("has English words", () => {
    expect(en.common.helpLine).toBeTruthy();
  });
});
