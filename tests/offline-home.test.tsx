import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, createEvent, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import Home from "../app/(ko)/page";
import { resetFirstOpen } from "../app/first-open";
import { ko } from "../lib/i18n/messages.ko";
import { getStorageKeys, loadCompleted, loadDraft } from "../lib/storage";

/**
 * The buttons that end a record go back to the first screen inside the app (2026-11-20).
 * They used to load the page again (a plain link to "/", window.location.reload()), so with
 * no connection they ended on the browser's error page. A click that is cancelled never
 * reaches the browser's navigation, so no page is requested; that, and reload() never being
 * called, is what these tests hold on to.
 */
const { DRAFT_KEY } = getStorageKeys();
const button = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });
const link = (name: string) => screen.getByRole("link", { name: new RegExp(`^${name}`) });
const title = () => screen.getByRole("heading", { level: 1 }).textContent;

const start = () => { render(<Home />); fireEvent.click(button(ko.landing.start)); };
/** The quick record to its summary: a spot on the pad, 다음, then 여기까지. */
const toQuickSummary = () => {
  start();
  fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
  fireEvent.click(button(ko.common.next));
  fireEvent.click(screen.getByRole("button", { name: ko.quickCandidates.finish }));
};
/** A slower look parked at its last step, resumed and answered. */
const toOutcomeEnd = (clarity: string, usefulness: string) => {
  window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ id: "draft-1", createdAt: "2026-10-13T09:00:00.000Z", status: "draft", entry: "deep", locale: "ko", stage: "outcome", deepReflection: { entryDecision: "observe", body: [], affect: {} } }));
  render(<Home />);
  fireEvent.click(button(ko.landing.resume));
  fireEvent.click(button(clarity));
  fireEvent.click(button(usefulness));
  fireEvent.click(button(ko.common.next));
};
const toStopped = () => {
  start();
  fireEvent.click(button(ko.common.stop));
  fireEvent.click(button(ko.stopModal.stop));
};

/** Clicks the link and says whether the browser would have followed it. */
const followed = (element: HTMLElement, init?: MouseEventInit) => {
  const event = createEvent.click(element, init);
  fireEvent(element, event);
  return !event.defaultPrevented;
};

const onTheFirstScreen = () => {
  expect(title()).toBe(ko.common.appName);
  expect(button(ko.landing.start)).toBeTruthy();
  // nothing of the step is left: no top bar, no step heading, no question waiting
  expect(document.querySelector(".topbar")).toBeNull();
  expect(document.querySelector(".draft-confirm")).toBeNull();
};

describe("the last buttons go back to the first screen without loading a page", () => {
  const reload = vi.fn();
  beforeEach(() => {
    window.localStorage.clear();
    resetFirstOpen();
    reload.mockClear();
    Object.defineProperty(window, "location", { value: { ...window.location, reload }, writable: true, configurable: true });
  });
  afterEach(cleanup);

  const sixLinks: [string, () => void, () => HTMLElement, string][] = [
    ["quick summary 「처음으로 돌아가기」", toQuickSummary, () => link(ko.common.backToStart), "completed"],
    ["summary 「처음으로 돌아가기」", () => toOutcomeEnd(ko.outcome.clarity.same, ko.outcome.usefulness.helpful), () => link(ko.common.backToStart), "completed"],
    ["directions 「여기까지」", () => { toQuickSummary(); fireEvent.click(button(ko.quickSummary.support)); }, () => link(ko.need.finish), "completed"],
    ["a past record's 「처음으로」", () => { toQuickSummary(); fireEvent.click(link(ko.common.backToStart)); fireEvent.click(button(ko.landing.records)); fireEvent.click(document.querySelector(".record-row")!); }, () => document.querySelector<HTMLElement>(".navigation a.primary-button")!, "completed"],
    ["stopped 「기록실로 돌아가기」", toStopped, () => link(ko.stopped.home), "stopped"],
    ["more uncomfortable 「여기서 마치기」", () => toOutcomeEnd(ko.outcome.clarity.more_distressed, ko.outcome.usefulness.unhelpful), () => link(ko.worsened.finish), "completed"],
  ];

  it.each(sixLinks)("%s: no page is asked for, the record is kept, the first screen shows", (_name, reach, target, status) => {
    reach();
    const element = target();
    // still the same link to "/", so its name, look and place in the tab order are unchanged
    expect(element.tagName).toBe("A");
    expect(element.getAttribute("href")).toBe("/");
    const kept = loadCompleted();
    expect(kept.map((item) => item.status)).toEqual([status]);

    expect(followed(element)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    onTheFirstScreen();
    expect(loadCompleted()).toEqual(kept);
    expect(loadDraft()).toBeNull();
    // the same visit: the first-open motions do not play a second time
    expect(document.querySelectorAll(".intro-phrase")).toHaveLength(0);
    // and the record is there in 지난 기록
    fireEvent.click(button(ko.landing.records));
    expect(document.querySelectorAll(".record-row")).toHaveLength(1);
  });

  it("the app's name at the top of a step: no reload, the draft waits on the first screen", () => {
    start();
    const wordmark = document.querySelector<HTMLElement>(".topbar a.wordmark")!;
    expect(followed(wordmark)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    onTheFirstScreen();
    expect(loadDraft()?.stage).toBe("quick-affect");
    expect(button(ko.landing.resume)).toBeTruthy();
    // this used to be a reload, a new visit: the motions play again, as they did
    expect(document.querySelectorAll(".intro-phrase")).toHaveLength(3);
    expect(document.querySelectorAll(".site-logo-mark .plum-petal")).toHaveLength(10);
  });

  it("「이 기록을 지우기」: the record is gone, no reload, the first screen shows", async () => {
    toStopped();
    expect(loadCompleted()).toHaveLength(1);
    fireEvent.click(button(ko.stopped.delete));
    await waitFor(() => expect(title()).toBe(ko.common.appName));
    expect(reload).not.toHaveBeenCalled();
    onTheFirstScreen();
    expect(loadCompleted()).toEqual([]);
    expect(loadDraft()).toBeNull();
    expect(document.querySelectorAll(".intro-phrase")).toHaveLength(3);
  });

  it("a click with a modifier key or another button is left to the browser", () => {
    toQuickSummary();
    const element = link(ko.common.backToStart);
    expect(followed(element, { metaKey: true })).toBe(true);
    expect(followed(element, { ctrlKey: true })).toBe(true);
    expect(followed(element, { button: 1 })).toBe(true);
    // still on the summary
    expect(title()).not.toBe(ko.common.appName);
  });

  it("a mark set by the page-load script does not hold the motions back on a new visit", () => {
    document.documentElement.setAttribute("data-first-open-done", "");
    start();
    fireEvent.click(document.querySelector<HTMLElement>(".topbar a.wordmark")!);
    expect(document.documentElement.hasAttribute("data-first-open-done")).toBe(false);
  });

  it("the app's screens never reload the page or set its address", () => {
    const source = readFileSync("app/emotion-app.tsx", "utf8");
    expect(source).not.toMatch(/location\s*\.\s*(reload|assign|replace)\s*\(/);
    expect(source).not.toMatch(/location(\.href)?\s*=[^=]/);
    // every link to "/" inside the record screens goes through the in-app way back
    // (the two on /terms and /words are other pages and still load "/")
    const plain = [...source.matchAll(/<a [^>]*href="\/"[^>]*>/g)].map((match) => match[0]).filter((tag) => !tag.includes("onClick={toHome}"));
    expect(plain).toHaveLength(2);
  });
});
