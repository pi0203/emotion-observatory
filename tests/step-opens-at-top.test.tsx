import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { revealWords, startQuick } from "./helpers/start";
import { ko } from "../lib/i18n/messages.ko";

/**
 * A new step opens at the top of the page, with focus on its title (2026-11-15).
 * On the live site at 1280px, the quick summary opened about 650px down after
 * 여기까지: the page kept the scroll of the step before, so the summary's title
 * and its small pad were out of view. Each step change now jumps to the top
 * (instantly, never smooth) and moves focus to the new step's title.
 */
const title = () => document.activeElement as HTMLElement | null;
const scrolledToTop = (spy: ReturnType<typeof vi.spyOn>) =>
  expect(spy).toHaveBeenLastCalledWith({ top: 0, left: 0, behavior: "instant" });

describe("a new step opens at its top, its title in focus", () => {
  let scrollTo: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    window.localStorage.clear();
    // jsdom has no layout and does not implement scrolling
    scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  });
  afterEach(() => {
    cleanup();
    scrollTo.mockRestore();
  });

  it("follows the quick look the owner showed: pad, next, words, a word, 여기까지", () => {
    render(<Home />);
    startQuick();
    scrolledToTop(scrollTo);
    expect(title()?.tagName).toBe("H1");
    expect(title()?.textContent).toBe(ko.quickAffect.title);

    fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));
    scrolledToTop(scrollTo);
    // before 단어 보기 the second step's title asks for the person's own words
    expect(title()?.textContent).toBe(ko.words.beforeTitle);

    // revealing the words and picking one stay on the same step: no jump, focus left where the person is
    const calls = scrollTo.mock.calls.length;
    revealWords();
    const word = document.querySelector<HTMLButtonElement>('.screen button[aria-pressed="false"]');
    expect(word).toBeTruthy();
    // jsdom does not move focus on a click, so put it on the word as a browser would
    word!.focus();
    fireEvent.click(word!);
    expect(word!.getAttribute("aria-pressed")).toBe("true");
    expect(scrollTo.mock.calls.length).toBe(calls);
    expect(title()).toBe(word);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.quickCandidates.finish}`) }));
    scrolledToTop(scrollTo);
    expect(title()?.tagName).toBe("H1");
    expect(title()?.textContent).toBe(ko.quickSummary.title);
    // a reading stop, not a control: focusable by code only
    expect(title()?.getAttribute("tabindex")).toBe("-1");
  });

  it("does the same on the way back and into the slower look", () => {
    render(<Home />);
    startQuick();
    fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));

    scrollTo.mockClear();
    fireEvent.click(screen.getByRole("button", { name: ko.common.stepBack }));
    scrolledToTop(scrollTo);
    expect(title()?.textContent).toBe(ko.quickAffect.title);

    fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));
    scrollTo.mockClear();
    fireEvent.click(screen.getByRole("button", { name: ko.quickCandidates.deep }));
    scrolledToTop(scrollTo);
    expect(title()?.tagName).toBe("H1");
    expect(document.querySelector(".screen h1")).toBe(title());
  });

  it("never asks for smooth scrolling", () => {
    render(<Home />);
    startQuick();
    fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.quickCandidates.finish}`) }));
    expect(scrollTo.mock.calls.length).toBeGreaterThan(0);
    for (const [options] of scrollTo.mock.calls) expect((options as ScrollToOptions).behavior).not.toBe("smooth");
  });
});
