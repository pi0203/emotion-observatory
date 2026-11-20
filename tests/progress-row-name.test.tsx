import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { getStorageKeys } from "../lib/storage";

/**
 * The progress line of the slower look (2026-11-20): its aria-label was on a div
 * with no role, so a screen reader could pass over the name. With a role the
 * same name is found, and the figure on screen is the one it always was.
 */
const { DRAFT_KEY } = getStorageKeys();
const resumeAt = (stage: string) => {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify({
    id: "draft-1", createdAt: "2026-11-20T09:00:00.000Z", status: "draft", entry: "deep", locale: "ko", stage,
    deepReflection: { entryDecision: "observe", body: [], affect: {} },
  }));
  render(<Home />);
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.landing.resume}`) }));
};

describe("the progress line", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it.each([["body", "1 / 6"], ["meaning", "4 / 6"], ["outcome", "6 / 6"]])("at %s is found by its role under the name it already had", (stage, step) => {
    resumeAt(stage);
    const name = ko.common.progress.replace("{step}", step);
    const row = screen.getByRole("img", { name });
    expect(row.getAttribute("aria-label")).toBe(name);
    expect(row.classList.contains("progress-row")).toBe(true);
    expect(row.querySelector("span")?.textContent).toBe(step);
  });
});
