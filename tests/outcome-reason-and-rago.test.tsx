import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import EnglishPage from "../app/(en)/en/page";
import { ko } from "../lib/i18n/messages.ko";
import { en, enOnly } from "../lib/i18n/messages.en";
import { interpolate, particleFor } from "../lib/i18n";
import { getStorageKeys } from "../lib/storage";

/**
 * Two small fixes from the 390px check before the 11/25 demo (2026-11-19).
 * 1. Step 6 needs both questions for 「다음」 (DeepOutcome keeps both). With one
 *    answered, a line next to the button says the other is still open, and the
 *    button points to it. English carries the draft note after it.
 * 2. The summary sentence about the situation takes 이라고 after a final
 *    consonant and 라고 after a vowel; Latin, digits and symbols keep 라고.
 */
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const button = (name: string) => screen.getByRole("button", { name: new RegExp(`^${escape(name)}`) });

const openOutcome = (locale: "ko" | "en") => {
  const { DRAFT_KEY } = getStorageKeys();
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
    id: "draft-1", createdAt: "2026-11-19T09:00:00.000Z", status: "draft", entry: "deep", locale, stage: "outcome",
    deepReflection: { entryDecision: "observe", body: [], affect: {}, context: { eventText: "" } },
  }));
  render(locale === "ko" ? <Home /> : <EnglishPage />);
  fireEvent.click(button((locale === "ko" ? ko : en).landing.resume));
};

const next = (m: typeof ko | typeof en) => button(m.common.next) as HTMLButtonElement;

describe("step 6: why 「다음」 is off", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("shows no line before anything is chosen", () => {
    openOutcome("ko");
    expect(next(ko).disabled).toBe(true);
    expect(screen.queryByRole("status")).toBeNull();
    expect(next(ko).getAttribute("aria-describedby")).toBeNull();
  });

  it("asks for the question below when only the one above has an answer, and the button points to it", () => {
    openOutcome("ko");
    fireEvent.click(button(ko.outcome.clarity.clearer));
    expect(next(ko).disabled).toBe(true);
    const line = screen.getByRole("status");
    expect(line.textContent).toBe("아래 질문도 하나 골라 주세요. 건너뛰어도 됩니다.");
    expect(next(ko).getAttribute("aria-describedby")).toBe(line.id);
    // the line sits right above the buttons
    expect(line.nextElementSibling!.classList.contains("navigation")).toBe(true);
    // 건너뛰기 stays open
    expect((button(ko.common.skip) as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(button(ko.outcome.usefulness.unsure));
    expect(next(ko).disabled).toBe(false);
    expect(screen.queryByRole("status")).toBeNull();
    expect(next(ko).getAttribute("aria-describedby")).toBeNull();
  });

  it("asks for the question above when only the one below has an answer", () => {
    openOutcome("ko");
    fireEvent.click(button(ko.outcome.usefulness.helpful));
    expect(screen.getByRole("status").textContent).toBe(ko.outcome.pickAboveToo);
  });

  it("says the same in English, with the draft note after it", () => {
    openOutcome("en");
    fireEvent.click(button(en.outcome.clarity.clearer));
    const line = screen.getByRole("status");
    expect(line.textContent).toBe(en.outcome.pickBelowToo);
    expect(line.nextElementSibling!.textContent).toBe(enOnly.draftNote);
    expect(next(en).getAttribute("aria-describedby")).toBe(line.id);
  });
});

describe("이라고 / 라고 after what the person wrote", () => {
  const context = (event: string) => interpolate(ko.synthesis.observed.context, { event, source: "지금 벌어지고 있는 일" });

  it("takes 이라고 after a final consonant and 라고 after a vowel", () => {
    expect(context("발표 준비가 밀림")).toContain("“발표 준비가 밀림”이라고 적었고");
    expect(context("회의가 길어짐")).toContain("“회의가 길어짐”이라고 적었고");
    expect(context("친구와 다툼 뒤 집에 옴")).toContain("“친구와 다툼 뒤 집에 옴”이라고 적었고");
    expect(context("시험 전날")).toContain("“시험 전날”이라고 적었고");
    expect(context("회의")).toContain("“회의”라고 적었고");
  });

  it("keeps 라고 after Latin, a digit or a symbol, as before", () => {
    expect(context("deadline")).toContain("“deadline”라고 적었고");
    expect(context("오후 3")).toContain("“오후 3”라고 적었고");
    expect(context("발표 준비가 밀림.")).toContain("“발표 준비가 밀림.”라고 적었고");
    expect(particleFor("OK", "이라고", "라고")).toBe("라고");
  });

  it("reads a decomposed word by its last syllable", () => {
    expect(particleFor("밀림".normalize("NFD"), "이라고", "라고")).toBe("이라고");
  });

  it("leaves the other pairs as they were", () => {
    expect(particleFor("OK", "을", "를")).toBe("을(를)");
    expect(particleFor("OK", "으로", "로")).toBe("으로(로)");
    expect(particleFor("말", "이라고", "라고")).toBe("이라고");
  });
});
