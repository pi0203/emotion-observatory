import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { getStorageKeys, loadDraft } from "../lib/storage";

/**
 * 내 말로 적기 on the 중요했던 것 step (2026-11-20): spaces alone are not an
 * entry, and what is written is kept without the spaces around it, the way the
 * body step already does.
 */
const { DRAFT_KEY } = getStorageKeys();
const button = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) });
const atMeaning = () => {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
    id: "draft-1", createdAt: "2026-11-20T09:00:00.000Z", status: "draft", entry: "deep", locale: "ko", stage: "meaning",
    deepReflection: { entryDecision: "observe", body: [], affect: {} },
  }));
  render(<Home />);
  fireEvent.click(button(ko.landing.resume));
};
const writeOwnWords = (value: string) => fireEvent.change(screen.getByPlaceholderText(ko.common.ownWordsPlaceholder), { target: { value } });
const row = (label: string) => screen.getByText(label, { selector: ".summary-row span" }).parentElement!;

describe("내 말로 적기 on the 중요했던 것 step", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("saves nothing when only spaces were typed, and the summary shows the step as left empty", () => {
    atMeaning();
    writeOwnWords("   　 ");
    fireEvent.click(button(ko.common.next));
    expect(loadDraft()?.stage).toBe("emotion");
    expect(loadDraft()?.deepReflection?.concerns).toEqual([]);

    fireEvent.click(button(ko.common.next));
    fireEvent.click(button(ko.outcome.clarity.same));
    fireEvent.click(button(ko.outcome.usefulness.helpful));
    fireEvent.click(button(ko.common.next));
    expect(row(ko.summary.concerns).querySelector("strong")?.textContent).toBe(ko.common.leftEmpty);
    expect(row(ko.summary.concerns).classList.contains("is-empty")).toBe(true);
  });

  it("keeps what was written, without the spaces around it", () => {
    atMeaning();
    writeOwnWords("  쉬고 싶었다  ");
    fireEvent.click(button(ko.common.next));
    expect(loadDraft()?.deepReflection?.concerns).toEqual(["쉬고 싶었다"]);
  });

  it("keeps a chosen item and the written one together, in that order", () => {
    atMeaning();
    const first = screen.getAllByRole("button", { pressed: false }).find((item) => item.closest(".choice-list"))!;
    const chosen = first.textContent;
    fireEvent.click(first);
    writeOwnWords(" 내 속도대로 하고 싶었다 ");
    fireEvent.click(button(ko.common.next));
    expect(loadDraft()?.deepReflection?.concerns).toEqual([chosen, "내 속도대로 하고 싶었다"]);
  });
});
