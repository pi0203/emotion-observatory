import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";
import { PAUSE_LINE_CORNER, showsPauseLine } from "../lib/quick-check";
import { getStorageAdapter } from "../lib/storage-adapter";
import { startDeep, startQuick } from "./helpers/start";

/**
 * 「멈춰도 됩니다」 lines (owner's decision 2026-10-30, second round B). No new
 * button: 그만하기 already exists. No warning colour, no crisis wording.
 */
describe("the corner that brings the quick line", () => {
  it("is unpleasant below 0.35 and energy above 0.65, strict on both edges", () => {
    expect(PAUSE_LINE_CORNER).toEqual({ valenceBelow: 0.35, activationAbove: 0.65 });
    expect(showsPauseLine({ valence: 0.2, activation: 0.9 })).toBe(true);
    expect(showsPauseLine({ valence: 0.34, activation: 0.66 })).toBe(true);
    expect(showsPauseLine({ valence: 0.35, activation: 0.9 })).toBe(false);
    expect(showsPauseLine({ valence: 0.2, activation: 0.65 })).toBe(false);
    // the other three corners and the middle
    for (const affect of [{ valence: 0.8, activation: 0.9 }, { valence: 0.2, activation: 0.2 }, { valence: 0.8, activation: 0.2 }, { valence: 0.5, activation: 0.5 }]) {
      expect(showsPauseLine(affect)).toBe(false);
    }
    expect(showsPauseLine({ unknown: true })).toBe(false);
    expect(showsPauseLine(undefined)).toBe(false);
  });
});

describe("on screen", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);
  const pad = () => document.querySelector(".affect-grid")!;
  const press = (key: string, times = 1) => { for (let i = 0; i < times; i += 1) fireEvent.keyDown(pad(), { key }); };
  const next = () => fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));

  it("puts the quick line at the top of the second step after a spot in that corner, and changes nothing else", () => {
    render(<Home />);
    startQuick();
    press("Enter");
    press("ArrowLeft", 4); // 0.30
    press("ArrowUp", 4); // 0.70
    next();
    const line = screen.getByText(ko.quickCandidates.pause);
    expect(line.className).toBe("pause-line pause-line-banner");
    expect(line.getAttribute("role")).toBeNull();
    // above the step's own heading
    expect(line.compareDocumentPosition(screen.getByRole("heading", { level: 1 })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // the same buttons as anywhere else on the pad
    for (const name of [ko.quickCandidates.finish, ko.quickCandidates.deep, ko.words.reveal]) expect(screen.getByRole("button", { name })).toBeInTheDocument();
    // not stored, so nothing in the record says it was shown
    fireEvent.click(screen.getByRole("button", { name: ko.quickCandidates.finish }));
    expect(JSON.stringify(getStorageAdapter().loadCompleted()[0])).not.toContain("pause");
  });

  it("does not show the quick line elsewhere on the pad", () => {
    render(<Home />);
    startQuick();
    press("Enter");
    next();
    expect(screen.queryByText(ko.quickCandidates.pause)).toBeNull();
  });

  it("puts the body line right under the body step's title, with no new button", () => {
    render(<Home />);
    startDeep();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.entry.observe}`) }));
    const title = screen.getByRole("heading", { level: 1 });
    expect(title.textContent).toBe(ko.body.title);
    const line = title.nextElementSibling!;
    expect(line.textContent).toBe(ko.body.pause);
    expect(line.className).toBe("pause-line");
    expect(screen.getAllByRole("button", { name: ko.common.stop })).toHaveLength(1);
  });
});

describe("the wording", () => {
  const all = [ko.body.pause, ko.quickCandidates.pause, en.body.pause, en.quickCandidates.pause];
  it("names no state and no risk, and points at no helpline", () => {
    for (const text of all) expect(text).not.toMatch(/위험|위기|걱정|괜찮으세요|힘드시|불안|risk|crisis|worr|are you ok|distress|109|1577|1388/i);
  });
  it("is written anew in English", () => {
    expect(en.body.pause).not.toBe(ko.body.pause);
    expect(en.quickCandidates.pause.length).toBeGreaterThan(0);
  });
});
