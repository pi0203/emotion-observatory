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
 * chosen keep their own text (docs/CROSS_PROJECT_2026_10_26.md f). The record
 * detail screen follows the same rule.
 */
const { DRAFT_KEY, COMPLETED_KEY } = getStorageKeys();
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
      expect(row(label).querySelector("strong")?.textContent).toBe(ko.common.leftEmpty);
      expect(row(label).classList.contains("is-empty")).toBe(true);
    }
    expect(screen.queryByText("기록하지 않음")).toBeNull();
  });

  it("keeps what was chosen as it is, and quiets only the skipped steps", () => {
    toSummary({ body: [{ id: "chest-tight", label: "가슴이 답답함" }], affect: {}, context: { eventText: "회의에서 말이 끊겼다" }, concerns: [] });
    expect(row(ko.summary.body).querySelector("strong")?.textContent).toBe("가슴이 답답함");
    expect(row(ko.summary.context).querySelector("strong")?.textContent).toBe("회의에서 말이 끊겼다");
    for (const label of [ko.summary.body, ko.summary.context]) expect(row(label).classList.contains("is-empty")).toBe(false);
    for (const label of [ko.summary.affect, ko.summary.concerns, ko.summary.words]) {
      expect(row(label).querySelector("strong")?.textContent).toBe(ko.common.leftEmpty);
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

  it("says Left blank in English (approved 2026-10-26)", () => {
    expect(en.common.leftEmpty).toBe("Left blank");
  });
});

const openRecord = (session: Record<string, unknown>) => {
  window.localStorage.setItem(COMPLETED_KEY, JSON.stringify([{
    id: "done-1", createdAt: "2026-10-26T09:00:00.000Z", completedAt: "2026-10-26T09:05:00.000Z", status: "completed", stage: "summary", locale: "ko", ...session,
  }]));
  render(<Home />);
  fireEvent.click(button(ko.landing.records));
  fireEvent.click(document.querySelector(".record-row")!);
};

describe("the record detail screen", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("shows a skipped overall feeling and no words as 비워 둠, quietly", () => {
    openRecord({ entry: "deep", deepReflection: { entryDecision: "observe", body: [], affect: {} } });
    for (const label of [ko.recordDetail.deepAffect, ko.recordDetail.words]) {
      expect(row(label).querySelector("strong")?.textContent).toBe(ko.common.leftEmpty);
      expect(row(label).classList.contains("is-empty")).toBe(true);
    }
  });

  it("keeps 잘 모르겠음 and chosen words as answers", () => {
    openRecord({ entry: "deep", deepReflection: { entryDecision: "observe", body: [], affect: { unknown: true }, emotionCandidates: [{ label: "서운함", source: "suggested" }] } });
    expect(row(ko.recordDetail.deepAffect).querySelector("strong")?.textContent).toBe(ko.common.unsure);
    expect(row(ko.recordDetail.words).querySelector("strong")?.textContent).toBe("서운함");
    for (const label of [ko.recordDetail.deepAffect, ko.recordDetail.words]) expect(row(label).classList.contains("is-empty")).toBe(false);
  });

  it("shows 가까운 말이 없음 from the quick look as an answer, not a blank", () => {
    openRecord({ entry: "quick", quickCheck: { affect: { valence: 0.2, activation: 0.4 }, candidatePool: [], selected: [], candidateResponse: "none-close" } });
    expect(row(ko.recordDetail.words).querySelector("strong")?.textContent).toBe(ko.quickCandidates.decline["none-close"]);
    expect(row(ko.recordDetail.words).classList.contains("is-empty")).toBe(false);
  });
});
