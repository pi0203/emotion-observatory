import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { getStorageKeys } from "../lib/storage";
import { buildSynthesis } from "../lib/synthesis";
import type { EmotionSession } from "../lib/session-types";

/**
 * The follow-up items in docs/REVIEW_2026_10_13.md: a skipped overall feeling
 * is not shown as the middle, 더 불편해짐 ends without more reflection, a new
 * start never silently replaces an unfinished entry, and the first card says
 * the browser storage is not encrypted.
 */
const { DRAFT_KEY } = getStorageKeys();
const button = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) });
const storedDraft = () => JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "null") as EmotionSession | null;
const seedDraft = (session: Record<string, unknown>) => window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
  id: "draft-1", createdAt: "2026-10-13T09:00:00.000Z", status: "draft", entry: "deep", locale: "ko", ...session,
}));
const resumeDraft = () => { render(<Home />); fireEvent.click(button(ko.landing.resume)); };

describe("a skipped overall feeling", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("records nothing on skip, even with the quick look's spot placed", () => {
    seedDraft({ stage: "affect", quickCheck: { affect: { valence: 0.2, activation: 0.8 }, candidatePool: [], selected: [] }, deepReflection: { entryDecision: "observe", body: [] } });
    resumeDraft();
    expect(screen.getByText(ko.affect.hint)).toBeTruthy();
    fireEvent.click(button(ko.common.skip));
    expect(storedDraft()?.deepReflection?.affect).toEqual({});
  });

  it("does not mention the quick look when the deep pass was started directly", () => {
    seedDraft({ stage: "affect", deepReflection: { entryDecision: "observe", body: [] } });
    resumeDraft();
    expect(screen.getByText(ko.affect.hintFresh)).toBeTruthy();
    expect(screen.queryByText(ko.affect.hint)).toBeNull();
  });

  it("reads as not recorded in the summary, not as 중간 · 중간", () => {
    seedDraft({ stage: "outcome", deepReflection: { entryDecision: "observe", body: [], affect: {} } });
    resumeDraft();
    fireEvent.click(button(ko.outcome.clarity.same));
    fireEvent.click(button(ko.outcome.usefulness.helpful));
    fireEvent.click(button(ko.common.next));
    const row = screen.getByText(ko.summary.affect).parentElement!;
    // left empty, quietly (2026-10-26: 비워 둠 replaced 기록하지 않음 on this screen)
    expect(row.querySelector("strong")?.textContent).toBe(ko.summary.leftEmpty);
  });

  it("is left out of the observed lines and the before/after comparison", () => {
    const session = { id: "s", createdAt: "", status: "completed", stage: "summary", entry: "quick", locale: "ko",
      quickCheck: { affect: { valence: 0.2, activation: 0.8 }, candidatePool: [], selected: [] },
      deepReflection: { body: [], affect: {} } } as unknown as EmotionSession;
    const ids = buildSynthesis(session).observed.map((line) => line.id);
    expect(ids).not.toContain("deep-affect");
    expect(ids).not.toContain("affect-before-after");
    expect(ids).toContain("quick-affect");
  });
});

describe("after 더 불편해짐", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("ends without the summary or its questions, with stopping first and help folded", () => {
    seedDraft({ stage: "outcome", deepReflection: { entryDecision: "observe", body: [], affect: {} } });
    resumeDraft();
    fireEvent.click(button(ko.outcome.clarity.more_distressed));
    fireEvent.click(button(ko.outcome.usefulness.unhelpful));
    fireEvent.click(button(ko.common.next));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("더 불편해졌다고");
    expect(screen.queryByText(ko.synthesisSection.questions)).toBeNull();
    expect(screen.queryByText(ko.summary.support)).toBeNull();
    expect(screen.getByRole("link", { name: ko.worsened.finish }).getAttribute("href")).toBe("/");
    const help = screen.getByText(ko.worsened.showHelp).closest("details")!;
    expect(help.open).toBe(false);
    expect(help.querySelector('a[href="tel:109"]')).not.toBeNull();
  });
});

describe("starting again with an unfinished entry", () => {
  beforeEach(() => {
    window.localStorage.clear();
    seedDraft({ stage: "body", deepReflection: { entryDecision: "observe", body: [{ label: "어깨" }] } });
  });
  afterEach(cleanup);

  for (const start of [ko.landing.quick, ko.landing.deep]) {
    it(`asks first for ${start}, and cancelling keeps the entry to continue`, () => {
      render(<Home />);
      fireEvent.click(button(start));
      expect(screen.getByText(ko.landing.draftConfirm.title)).toBeTruthy();
      expect(storedDraft()?.id).toBe("draft-1");
      fireEvent.click(button(ko.landing.draftConfirm.cancel));
      expect(storedDraft()?.id).toBe("draft-1");
      fireEvent.click(button(ko.landing.resume));
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.body.title);
    });

    it(`replaces the entry for ${start} only after the explicit choice`, () => {
      render(<Home />);
      fireEvent.click(button(start));
      fireEvent.click(button(ko.landing.draftConfirm.discard));
      expect(storedDraft()?.id).not.toBe("draft-1");
    });
  }

  it("starts straight away when there is no unfinished entry", () => {
    window.localStorage.clear();
    render(<Home />);
    fireEvent.click(button(ko.landing.quick));
    expect(screen.queryByText(ko.landing.draftConfirm.title)).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.quickAffect.title);
  });
});

describe("the storage note on the first card", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("says the entries are not encrypted and links to seeing or deleting them, with no lock", () => {
    render(<Home />);
    const card = document.querySelector(".hero-card")!;
    expect(card.textContent).toContain("암호화되지 않습니다");
    expect(card.textContent).toContain("암호화 안 됨");
    expect(card.textContent).not.toContain("🔒");
    fireEvent.click(button(ko.landing.storageManage));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.records.title);
  });
});
