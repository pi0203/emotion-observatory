import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import EnglishPage from "../app/(en)/en/page";
import { onUnpleasantSide, quickValence } from "../lib/affect-labels";
import needsKo from "../data/needs.ko.json";
import needsEn from "../data/needs.en.json";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";
import { startQuick } from "./helpers/start";
import { summarise } from "../lib/records";
import type { EmotionSession } from "../lib/session-types";

/**
 * 지금 필요한 것 on a record read as 불쾌함 쪽 (owner's decision 2026-11-23):
 * the two directions that speak of a good moment are not shown. Everywhere else
 * all eleven stay, in the same order.
 */
const GOOD_MOMENT = ["savour", "conditions"];
const labelsOf = (data: typeof needsKo) => data.needs.map((item) => item.label);
const without = (data: typeof needsKo) => data.needs.filter((item) => !GOOD_MOMENT.includes(item.id)).map((item) => item.label);

const stubGridSize = () => {
  Element.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
};

/** Every direction button on the screen, in the order shown. */
const shownNeeds = (all: string[]) =>
  Array.from(document.querySelectorAll(".choice-list.compact button")).map((button) => button.textContent ?? "").filter((text) => all.includes(text));

const tapPad = (clientX: number, name: RegExp, next: RegExp) => {
  fireEvent(screen.getByRole("application", { name }), new MouseEvent("pointerdown", { bubbles: true, clientX, clientY: 150 }));
  fireEvent.click(screen.getByRole("button", { name: next }));
};

/** Pad, one word, 여기까지, then 지금 필요한 것. */
const toNeedsKo = (clientX?: number) => {
  render(<Home />);
  startQuick();
  if (clientX === undefined) {
    fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));
  } else tapPad(clientX, /불쾌함과 유쾌함/, new RegExp(`^${ko.common.next}`));
  fireEvent.click(screen.getByRole("button", { name: "가까운 말이 없음" }));
  fireEvent.click(screen.getByRole("button", { name: /여기까지/ }));
  fireEvent.click(screen.getByRole("button", { name: ko.quickSummary.support }));
};

describe("지금 필요한 것 follows the record's overall feeling", () => {
  beforeEach(() => {
    window.localStorage.clear();
    stubGridSize();
  });
  afterEach(cleanup);

  it("uses the summary's own bands: 불쾌함 쪽 and 조금 불쾌함 쪽, nothing else", () => {
    for (let step = 0; step <= 100; step += 1) {
      const valence = step / 100;
      expect(onUnpleasantSide({ valence, activation: 0.5 })).toBe(quickValence(valence).includes("불쾌"));
    }
    expect(onUnpleasantSide({ unknown: true })).toBe(false);
    expect(onUnpleasantSide({})).toBe(false);
    expect(onUnpleasantSide(undefined)).toBe(false);
  });

  it("shows nine on the unpleasant side, without the two good-moment lines", () => {
    toNeedsKo(40);
    expect(shownNeeds(labelsOf(needsKo))).toEqual(without(needsKo));
    expect(shownNeeds(labelsOf(needsKo))).toHaveLength(9);
    expect(screen.queryByRole("button", { name: "좋은 경험에 조금 더 머물기" })).toBeNull();
    expect(screen.queryByRole("button", { name: "이 좋은 상태를 만든 조건 살펴보기" })).toBeNull();
    // the groups stay as they were
    for (const group of needsKo.groups) expect(screen.getByText(group, { selector: ".tier-label" })).toBeTruthy();
  });

  it("shows all eleven on the pleasant side and in between", () => {
    toNeedsKo(360);
    expect(shownNeeds(labelsOf(needsKo))).toEqual(labelsOf(needsKo));
    cleanup();
    window.localStorage.clear();
    toNeedsKo();
    expect(shownNeeds(labelsOf(needsKo))).toEqual(labelsOf(needsKo));
  });

  it("shows all eleven after 아직 모르겠다", () => {
    render(<Home />);
    startQuick();
    fireEvent.click(screen.getByRole("button", { name: ko.quickAffect.unknown }));
    fireEvent.click(screen.getByRole("button", { name: ko.quickSummary.support }));
    expect(shownNeeds(labelsOf(needsKo))).toEqual(labelsOf(needsKo));
  });

  it("does the same on the English screen", () => {
    render(EnglishPage());
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${en.landing.start}`) }));
    tapPad(40, new RegExp(en.affectPad.ariaLabel.slice(0, 12)), new RegExp(`^${en.common.next}`));
    fireEvent.click(screen.getByRole("button", { name: "No word comes close" }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(en.quickCandidates.finish) }));
    fireEvent.click(screen.getByRole("button", { name: en.quickSummary.support }));
    expect(shownNeeds(labelsOf(needsEn))).toEqual(without(needsEn));
  });

  it("follows the slower look's pad once it was taken, and shows all eleven when that pad was left empty", () => {
    render(<Home />);
    startQuick();
    tapPad(40, /불쾌함과 유쾌함/, new RegExp(`^${ko.common.next}`));
    const press = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));
    press(ko.quickCandidates.deep);
    press(/조금 살펴보고 싶어요/);
    press(new RegExp(`^${ko.common.skip}`)); // body
    press(new RegExp(`^${ko.common.skip}`)); // affect, left empty
    press(new RegExp(`^${ko.common.next}`)); // context
    press(new RegExp(`^${ko.common.next}`)); // meaning
    press(new RegExp(`^${ko.common.skip}`)); // words
    press("조금 더 분명해짐");
    press("도움됨");
    press(new RegExp(`^${ko.common.next}`));
    press(new RegExp(`^${ko.summary.support}`));
    expect(shownNeeds(labelsOf(needsKo))).toEqual(labelsOf(needsKo));
  });

  it("leaves a direction kept in an earlier record as it was", () => {
    const old: EmotionSession = {
      id: "old-1", createdAt: "2026-11-01T09:00:00.000Z", completedAt: "2026-11-01T09:03:00.000Z",
      status: "completed", stage: "quick-summary", entry: "quick", locale: "ko",
      quickCheck: { affect: { valence: 0.05, activation: 0.8 }, candidatePool: [], selected: [] },
      support: { need: "savour", chosen: ["share"], choicesByNeed: { savour: ["share"] } },
    };
    expect(summarise(old).needLabel).toBe("좋은 경험에 조금 더 머물기");
    expect(summarise(old).responseLabels).toEqual(["누군가와 나누기"]);
  });
});
