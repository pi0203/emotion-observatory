import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Home from "../app/(ko)/page";
import EnglishPage from "../app/(en)/en/page";
import { ko } from "../lib/i18n/messages.ko";
import { en, enOnly } from "../lib/i18n/messages.en";
import { getStorageKeys } from "../lib/storage";
import type { EmotionSession } from "../lib/session-types";

/**
 * The counselor line under 「지난 기록」 (2026-11-15): shown when three or more
 * entries are kept, hidden with two or fewer. The count is the only condition,
 * so two sets of three entries with different contents show the same line.
 */
const KO_LINE = "기록이 몇 번 쌓였어요. 비슷한 날이 이어지거나 혼자 보기 버겁다면, 이 기록을 내려받아 상담자와 함께 보는 방법도 있어요.";
const EN_LINE = "You’ve saved a few entries. If similar days keep coming or they feel heavy to look at alone, you can export them to a file and go over them with a counselor.";

const record = (id: string, minute: number, body: Partial<EmotionSession>, locale: "ko" | "en" = "ko"): EmotionSession => ({
  id, createdAt: `2026-11-0${3 + minute}T02:00:00.000Z`, completedAt: `2026-11-0${3 + minute}T02:05:00.000Z`, status: "completed",
  stage: "quick-summary", entry: "quick", locale, ...body,
});
const plain = (id: string, minute: number, locale: "ko" | "en" = "ko") => record(id, minute, {
  quickCheck: { affect: { valence: 0.7, activation: 0.3 }, candidatePool: [], selected: [], context: { eventText: "산책했다" } },
}, locale);
const heavy = (id: string, minute: number, locale: "ko" | "en" = "ko") => record(id, minute, {
  quickCheck: { affect: { valence: 0.05, activation: 0.95 }, candidatePool: [], selected: [], context: { eventText: "죽고 싶어" } },
}, locale);

const store = (records: EmotionSession[]) => window.localStorage.setItem(getStorageKeys().COMPLETED_KEY, JSON.stringify(records));
const openKo = (records: EmotionSession[]) => {
  store(records);
  render(<Home />);
  fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
};
const line = () => document.querySelector(".with-counselor");

describe("counselor line under the records list", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

  it("keeps the Korean and English wording", () => {
    expect(ko.records.withCounselor.replace("{counselor}", ko.records.withCounselorWord)).toBe(KO_LINE);
    expect(en.records.withCounselor.replace("{counselor}", en.records.withCounselorWord)).toBe(EN_LINE);
  });

  for (const [count, shown] of [[0, false], [2, false], [3, true]] as const) {
    it(`${count} entries: ${shown ? "shown" : "not shown"}`, () => {
      openKo(Array.from({ length: count }, (_, index) => plain(`r${index}`, index)));
      if (shown) expect(line()?.textContent).toBe(KO_LINE);
      else expect(line()).toBeNull();
    });
  }

  it("does not change with what the entries say: three plain and three heavy show the same line", () => {
    openKo([0, 1, 2].map((index) => plain(`p${index}`, index)));
    const first = line()!.outerHTML;
    cleanup();
    window.localStorage.clear();
    openKo([0, 1, 2].map((index) => heavy(`h${index}`, index)));
    expect(line()!.outerHTML).toBe(first);
    // two heavy entries stay below the count, so nothing appears for content alone
    cleanup();
    window.localStorage.clear();
    openKo([0, 1].map((index) => heavy(`h${index}`, index)));
    expect(line()).toBeNull();
  });

  it("sits under the list and above the help line, outside the folded 기록 관리", () => {
    openKo([0, 1, 2].map((index) => plain(`r${index}`, index)));
    const found = line()!;
    expect(found.previousElementSibling?.className).toBe("record-list");
    expect(found.nextElementSibling?.className).toBe("help-line");
    expect(found.closest("details")).toBeNull();
  });

  it("상담자 goes back to the landing's 「위기는 아니지만」 section, with no outside link", () => {
    openKo([0, 1, 2].map((index) => plain(`r${index}`, index)));
    expect(line()!.querySelectorAll("a")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: ko.records.withCounselorWord }));
    const title = document.getElementById("next-step-title")!;
    expect(title.textContent).toBe(ko.nextStep.title);
    expect(document.activeElement).toBe(title);
    expect(line()).toBeNull();
  });

  it("English: the same line, followed by the not-reviewed draft line, and listed in docs/EN_REVIEW.md as 검토 전", () => {
    vi.stubEnv("NODE_ENV", "production");
    store([0, 1, 2].map((index) => plain(`e${index}`, index, "en")));
    render(EnglishPage());
    fireEvent.click(screen.getByRole("button", { name: en.landing.records }));
    expect(line()?.textContent).toBe(EN_LINE);
    expect(line()!.nextElementSibling?.textContent).toBe(enOnly.draftNote);
    const review = readFileSync(join(process.cwd(), "docs/EN_REVIEW.md"), "utf8").split("\n");
    for (const sentence of [en.records.withCounselor, en.records.withCounselorWord]) {
      const row = review.find((text) => text.includes(`| ${sentence} |`));
      expect(row, sentence).toContain("검토 전");
    }
  });

  it("Korean has no draft line", () => {
    openKo([0, 1, 2].map((index) => plain(`r${index}`, index)));
    expect(line()!.nextElementSibling?.className).not.toBe("draft-note");
  });
});
