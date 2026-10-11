import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { hasMessages } from "../lib/i18n";
import { en, reviewStatus } from "../lib/i18n/messages.en";
import { ko } from "../lib/i18n/messages.ko";

/**
 * The not-a-crisis-service notice (SAFETY.md, 2026-10-12). It appears on the
 * landing, the stopped screen and, only after the user picks "더 불편해짐", on
 * the outcome screen. It reacts to the user's own choice and judges nothing.
 */
const notices = () => [...document.querySelectorAll(".safety-note")].map((node) => node.textContent);
/** Matches a button by the start of its name: some names end in an arrow (→). */
const click = (name: string) => fireEvent.click(screen.getAllByRole("button", { name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) })[0]);

/** Through the slower pass, skipping every step, up to the outcome question. */
const toOutcome = () => {
  click("조금 더 천천히 살펴보기");
  click("조금 살펴보고 싶어요");
  for (let step = 0; step < 5; step += 1) click("건너뛰기");
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.outcome.title);
};

const PHONE = /\b(109|119|112|1577-?0199|1393|1588-?9191)\b/;
const KO_FORBIDDEN = /안전하게|안심|입증|효과가 있|보장/;
const EN_FORBIDDEN = /\bsafely\b|\bsafe\b|reassur|proven|guarantee|\bwill help\b|\bcure\b/i;

describe("not-a-crisis-service notice", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("is on the landing, right after the storage note", () => {
    render(<Home />);
    expect(notices()).toEqual([ko.safety.landing]);
    const storage = screen.getByText(ko.landing.storageNote);
    expect(storage.nextElementSibling?.className).toBe("safety-note");
  });

  it("is on the stopped screen, before its buttons", () => {
    render(<Home />);
    click("조금 더 천천히 살펴보기");
    click("지금은 그만 생각하고 싶어요");
    expect(notices()).toEqual([ko.safety.stopped]);
    const note = document.querySelector(".safety-note")!;
    expect(note.compareDocumentPosition(screen.getByRole("link", { name: ko.stopped.home })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("appears on the outcome screen only after the user picks 더 불편해짐, inside a polite live region", () => {
    render(<Home />);
    toOutcome();
    expect(notices()).toEqual([]);
    for (const value of ["much_clearer", "clearer", "same", "more_complex"] as const) {
      click(ko.outcome.clarity[value]);
      expect(notices(), value).toEqual([]);
    }
    click(ko.outcome.clarity.more_distressed);
    expect(notices()).toEqual([ko.safety.moreDistressed]);
    const region = document.querySelector(".safety-note")!.closest('[role="status"]');
    expect(region).not.toBeNull();
    click(ko.outcome.clarity.same);
    expect(notices()).toEqual([]);
  });

  it("is not added to the middle of the flow", () => {
    render(<Home />);
    click("빠르게 살펴보기");
    expect(notices()).toEqual([]);
    click("잘 모르겠음");
    expect(notices()).toEqual([]);
  });

  it("does not interrupt the keyboard: it is plain text, not a control or a focus target", () => {
    render(<Home />);
    const note = document.querySelector(".safety-note")!;
    expect(note.tagName).toBe("P");
    expect(note.getAttribute("tabindex")).toBeNull();
    expect(within(note as HTMLElement).queryAllByRole("button")).toHaveLength(0);
    expect(within(note as HTMLElement).queryAllByRole("link")).toHaveLength(0);
  });
});

describe("notice wording", () => {
  it("makes no promise of safety or effect, in Korean or the English draft", () => {
    for (const text of Object.values(ko.safety)) expect(text).not.toMatch(KO_FORBIDDEN);
    for (const text of Object.values(en.safety)) expect(text).not.toMatch(EN_FORBIDDEN);
  });

  it("shows no phone number anywhere in the messages until contacts are reviewed", () => {
    expect(JSON.stringify(ko)).not.toMatch(PHONE);
    expect(JSON.stringify(en)).not.toMatch(PHONE);
  });

  it("shows no phone number on the three screens", () => {
    window.localStorage.clear();
    render(<Home />);
    expect(document.body.textContent).not.toMatch(PHONE);
    cleanup();
    render(<Home />);
    toOutcome();
    click(ko.outcome.clarity.more_distressed);
    expect(document.body.textContent).not.toMatch(PHONE);
    cleanup();
  });

  it("keeps the English notices as a draft, switched off", () => {
    expect(reviewStatus).toBe("draft");
    expect(hasMessages("en")).toBe(false);
    expect(Object.keys(en.safety).sort()).toEqual(Object.keys(ko.safety).sort());
  });
});
