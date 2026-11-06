import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { getStorageKeys } from "../lib/storage";
import type { EmotionSession } from "../lib/session-types";

/**
 * Third round (2026-11-05): where the record said 「패드 위의 한 점」, a small
 * read-only pad now shows the spot. With a quick and a slower spot, both sit on
 * the same pad, each with a small label.
 */
const both: EmotionSession = {
  id: "pad-both", createdAt: "2026-11-03T02:00:00.000Z", completedAt: "2026-11-03T02:10:00.000Z", status: "completed",
  stage: "summary", entry: "quick", locale: "ko",
  quickCheck: { affect: { valence: 0.2, activation: 0.8 }, candidatePool: [], selected: [{ label: "짜증", source: "suggested" }] },
  deepReflection: { startedAt: "2026-11-03T02:02:00.000Z", body: [], concerns: [], emotionCandidates: [], affect: { valence: 0.3, activation: 0.6 }, outcome: { clarity: "clearer", usefulness: "helpful" } },
};
const quickOnly: EmotionSession = { ...both, id: "pad-quick", stage: "quick-summary", deepReflection: undefined };
const unsure: EmotionSession = { ...both, id: "pad-unsure", stage: "quick-summary", quickCheck: { affect: { unknown: true }, candidatePool: [], selected: [] }, deepReflection: undefined };

const openDetail = (record: EmotionSession) => {
  window.localStorage.setItem(getStorageKeys().COMPLETED_KEY, JSON.stringify([record]));
  render(<Home />);
  fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
  fireEvent.click(document.getElementById(`record-${record.id}`)!);
};

describe("the spot drawn on a small pad", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("replaces the words 「패드 위의 한 점」 in the record detail", () => {
    openDetail(quickOnly);
    expect(document.body.textContent).not.toContain("패드 위의 한 점");
    const pad = document.querySelector(".mini-pad-wrap") as HTMLElement;
    expect(pad.getAttribute("aria-hidden")).toBe("true");
    const dot = pad.querySelector(".mini-dot") as HTMLElement;
    expect(parseFloat(dot.style.left)).toBeCloseTo(20, 5);
    expect(parseFloat(dot.style.top)).toBeCloseTo(20, 5);
    // one spot: no label on it
    expect(pad.querySelector(".mini-label")).toBeNull();
  });

  it("puts both spots on the same pad, each with its small label, and shows no number", () => {
    openDetail(both);
    const pads = document.querySelectorAll(".mini-pad");
    expect(pads).toHaveLength(1);
    expect(pads[0].querySelectorAll(".mini-dot")).toHaveLength(2);
    expect([...pads[0].querySelectorAll(".mini-label")].map((label) => label.textContent)).toEqual(["빠른 확인", "자세히 본 뒤"]);
    const wrap = document.querySelector(".mini-pad-wrap")!;
    expect(wrap.textContent).not.toMatch(/\d/);
    // the pad's own axis names
    for (const name of [ko.affectPad.top, ko.affectPad.bottom, ko.affectPad.left, ko.affectPad.right]) expect(wrap.textContent).toContain(name);
    // read-only: nothing to press, and no line between the two
    expect(wrap.querySelector("button, [tabindex], svg")).toBeNull();
  });

  it("draws nothing for a record ended at 아직 모르겠다", () => {
    openDetail(unsure);
    expect(document.querySelector(".mini-pad-wrap")).toBeNull();
  });

  it("puts both spots on the slower look's closing screen too", () => {
    window.localStorage.setItem(getStorageKeys().DRAFT_KEY, JSON.stringify({ ...both, status: "draft", completedAt: undefined }));
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.resume }));
    const section = screen.getByRole("heading", { level: 1, name: ko.summary.title }).closest("section")!;
    expect(section.querySelectorAll(".mini-pad .mini-dot")).toHaveLength(2);
    expect([...section.querySelectorAll(".mini-label")].map((label) => label.textContent)).toEqual(["빠른 확인", "자세히 본 뒤"]);
  });
});
