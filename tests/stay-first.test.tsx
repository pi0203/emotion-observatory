import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { getStorageAdapter } from "../lib/storage-adapter";
import { startQuick } from "./helpers/start";

/**
 * 머무르기가 먼저, 이름은 겹쓴다 (owner's decisions 2026-10-30, docs/EVIDENCE_CHAIN.md §7).
 */
describe("one way in", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("puts only 지금 기록 and a small 지난 기록 link on the first card, with no fork and no badges", () => {
    render(<Home />);
    const card = document.querySelector(".hero-card") as HTMLElement;
    const buttons = within(card).getAllByRole("button").map((button) => button.textContent?.replace("→", "").trim());
    expect(buttons).toEqual([ko.landing.start, ko.landing.records]);
    expect(card.querySelector(".badges")).toBeNull();
    expect(screen.queryByRole("button", { name: /조금 더 천천히 살펴보기|빠르게 살펴보기/ })).toBeNull();
  });

  it("opens the quick look from 지금 기록", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.landing.start}`) }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.quickAffect.title);
  });

  it("carries the help button in the landing header, opening the same crisis card", () => {
    render(<Home />);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: ko.common.helpLink }));
    const dialog = screen.getByRole("dialog", { name: ko.crisis.title });
    for (const number of ["109", "1577-0199", "1388"]) expect(within(dialog).getByText(number)).toBeInTheDocument();
  });
});

describe("아직 모르겠다 weighs the same as 다음", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("is an outlined button beside 다음 in the same row, not a quiet text button", () => {
    render(<Home />);
    startQuick();
    const unsure = screen.getByRole("button", { name: ko.quickAffect.unknown });
    const next = screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) });
    expect(unsure.className).toBe("secondary-button");
    expect(unsure.parentElement).toBe(next.parentElement);
    expect(unsure.parentElement!.className).toContain("even-actions");
  });

  it("saves a finished record that the summary and the list say back without any 없음", () => {
    render(<Home />);
    startQuick();
    fireEvent.click(screen.getByRole("button", { name: ko.quickAffect.unknown }));
    const [saved] = getStorageAdapter().loadCompleted();
    expect(saved.status).toBe("completed");
    expect(saved.quickCheck?.affect).toEqual({ unknown: true });
    const card = document.querySelector(".summary-card")!;
    expect(card.textContent).toContain(ko.quickAffect.unknown);
    expect(card.textContent).not.toMatch(/없음|고르지 않음|비워 둠/);
    cleanup();

    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    const row = document.querySelector(".record-row")!;
    expect(row.textContent).toContain(ko.quickAffect.unknown);
    expect(row.textContent).not.toContain("없음");
  });
});
