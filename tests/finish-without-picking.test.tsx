import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Home from "../app/(ko)/page";
import needs from "../data/needs.ko.json";
import { ko } from "../lib/i18n/messages.ko";
import { summarise } from "../lib/records";
import { loadCompleted } from "../lib/storage";
import { startQuick } from "./helpers/start";

/**
 * 이용약관 제3조④ (data/terms.ko.json): 「어느 묶음에서든 아무것도 고르지 않고
 * 마칠 수 있습니다.」 (owner's wording, 2026-11-01). For every direction that
 * opens a set of things to try, the person can open it, pick nothing, and leave
 * with 여기까지; the record keeps the direction and no picked item, and the past
 * records list shows no 해보기로 한 것 line for it.
 */
const SETS_IN_THE_TERMS = ["pace", "savour", "sort-thoughts", "conditions", "express", "ask-help", "boundary", "solve"];
const sets = needs.needs.filter((need) => need.responses?.length);

const toDirections = () => {
  render(<Home />);
  startQuick();
  // the keyboard puts the spot in the middle, since jsdom gives the pad no size
  fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.quickCandidates.finish}`) }));
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.quickSummary.support}`) }));
  expect(screen.getByText(ko.need.title)).toBeTruthy();
};

describe("terms 3④: every set can be left with nothing picked", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("covers the eight sets the terms speak of", () => {
    expect(sets.map((need) => need.id)).toEqual(expect.arrayContaining(SETS_IN_THE_TERMS));
  });

  it.each(sets.map((need) => [need.id, need] as const))("%s: open it, pick nothing, finish, and nothing is recorded as picked", (id, need) => {
    toDirections();
    fireEvent.click(screen.getByRole("button", { name: need.label }));

    // the set is open, none of its items is pressed, and 여기까지 is there to leave by
    for (const option of need.responses!) {
      expect(screen.getByRole("button", { name: option.label }).getAttribute("aria-pressed")).toBe("false");
    }
    const finish = screen.getByRole("link", { name: new RegExp(`^${ko.need.finish}`) });
    expect(finish.getAttribute("href")).toBe("/");
    expect(finish.getAttribute("aria-disabled")).toBeNull();

    // what 여기까지 leaves behind: the stored record holds the direction and nothing picked
    const [record] = loadCompleted();
    expect(record.support?.need).toBe(id);
    expect(record.support?.chosen).toEqual([]);
    expect(record.support?.choicesByNeed?.[id]).toBeUndefined();
    const item = summarise(record);
    expect(item.responseLabels).toEqual([]);
    expect(item.canFollowUp).toBe(false);

    // opening the app again, the past records list shows the direction and no 해보기로 한 것 line
    cleanup();
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    const rows = document.querySelectorAll(".record-row");
    expect(rows).toHaveLength(1);
    const row = rows[0] as HTMLElement;
    expect(within(row).getByText(ko.records.needLine.replace("{label}", need.label))).toBeTruthy();
    expect(row.textContent).not.toContain(ko.records.responsesLine.split(" · ")[0]);
  });
});
