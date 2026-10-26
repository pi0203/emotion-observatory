import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";
import { getStorageKeys } from "../lib/storage";

/**
 * A step skipped on the slower look reads as 비워 둠 in the summary, in the
 * muted colour and never an error colour, while 잘 모르겠음 and anything
 * chosen keep their own text (docs/CROSS_PROJECT_2026_10_26.md f).
 */
const { DRAFT_KEY } = getStorageKeys();
const button = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) });
const toSummary = (deepReflection: Record<string, unknown>) => {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
    id: "draft-1", createdAt: "2026-10-26T09:00:00.000Z", status: "draft", entry: "deep", locale: "ko", stage: "outcome",
    deepReflection: { entryDecision: "observe", ...deepReflection },
  }));
  render(<Home />);
  fireEvent.click(button(ko.landing.resume));
  fireEvent.click(button(ko.outcome.clarity.same));
  fireEvent.click(button(ko.outcome.usefulness.helpful));
  fireEvent.click(button(ko.common.next));
};
const row = (label: string) => screen.getByText(label, { selector: ".summary-row span" }).parentElement!;
const deepRows = [ko.summary.body, ko.summary.affect, ko.summary.context, ko.summary.concerns, ko.summary.words];

describe("the summary of a slower look", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("shows every skipped step as 비워 둠, quietly", () => {
    toSummary({ body: [], affect: {} });
    for (const label of deepRows) {
      expect(row(label).querySelector("strong")?.textContent).toBe(ko.summary.leftEmpty);
      expect(row(label).classList.contains("is-empty")).toBe(true);
    }
    expect(screen.queryByText(ko.common.notRecorded)).toBeNull();
  });

  it("keeps what was chosen as it is, and quiets only the skipped steps", () => {
    toSummary({ body: [{ id: "chest-tight", label: "가슴이 답답함" }], affect: {}, context: { eventText: "회의에서 말이 끊겼다" }, concerns: [] });
    expect(row(ko.summary.body).querySelector("strong")?.textContent).toBe("가슴이 답답함");
    expect(row(ko.summary.context).querySelector("strong")?.textContent).toBe("회의에서 말이 끊겼다");
    for (const label of [ko.summary.body, ko.summary.context]) expect(row(label).classList.contains("is-empty")).toBe(false);
    for (const label of [ko.summary.affect, ko.summary.concerns, ko.summary.words]) {
      expect(row(label).querySelector("strong")?.textContent).toBe(ko.summary.leftEmpty);
      expect(row(label).classList.contains("is-empty")).toBe(true);
    }
  });

  it("keeps 잘 모르겠음 as an answer, not a blank", () => {
    toSummary({ body: [], affect: { unknown: true }, emotionCandidates: [{ label: ko.emotion.escapes.unsure, source: "suggested" }] });
    for (const label of [ko.summary.affect, ko.summary.words]) {
      expect(row(label).querySelector("strong")?.textContent).toBe(ko.common.unsure);
      expect(row(label).classList.contains("is-empty")).toBe(false);
    }
  });

  it("uses the muted colour for a blank and no error colour", () => {
    const css = readFileSync("app/globals.css", "utf8");
    const rule = css.match(/\.summary-row\.is-empty strong \{([^}]*)\}/)?.[1] ?? "";
    expect(rule.trim()).toBe("color: var(--muted);");
  });

  it("leaves the English wording as it was until it is reviewed", () => {
    expect(en.summary.leftEmpty).toBe("Not recorded");
  });
});
