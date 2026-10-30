import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { getStorageAdapter } from "../lib/storage-adapter";
import { getStorageKeys } from "../lib/storage";
import { revealWords, startDeep, startQuick } from "./helpers/start";

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

describe("words are thought of before they are seen", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);
  const toWordStep = () => {
    render(<Home />);
    startQuick();
    fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));
  };
  const draft = () => getStorageAdapter().loadDraft();

  it("draws no offered word on the quick step until 단어 보기, while the own-words field and every way out stay", () => {
    toWordStep();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.words.beforeTitle);
    expect(document.querySelectorAll(".chip")).toHaveLength(0);
    expect(screen.queryByText(ko.common.provisionalNote)).toBeNull();
    expect(screen.getByLabelText(ko.common.ownWordsPlaceholder)).toBeTruthy();
    expect(screen.getByRole("button", { name: ko.words.add })).toBeTruthy();
    for (const name of [ko.quickCandidates.decline["none-close"], ko.quickCandidates.decline.unsure, ko.quickCandidates.finish, ko.quickCandidates.deep]) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toBeTruthy();
    }
    expect(draft()?.quickCheck?.wordsRevealed).toBeUndefined();

    revealWords();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.quickCandidates.title);
    expect(document.querySelectorAll(".chip").length).toBeGreaterThan(0);
    expect(document.querySelectorAll(".chip").length).toBeLessThanOrEqual(5);
    expect(screen.getByText(ko.common.provisionalNote)).toBeTruthy();
    expect(screen.getByRole("button", { name: ko.words.more })).toBeTruthy();
  });

  it("keeps the time 단어 보기 was first pressed, and nothing when it never was", () => {
    toWordStep();
    revealWords();
    const at = draft()?.quickCheck?.wordsRevealed?.at;
    expect(Number.isNaN(Date.parse(at ?? ""))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.quickCandidates.finish}`) }));
    expect(getStorageAdapter().loadCompleted()[0].quickCheck?.wordsRevealed).toEqual({ at });
    cleanup();
    window.localStorage.clear();

    toWordStep();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.quickCandidates.finish}`) }));
    expect("wordsRevealed" in getStorageAdapter().loadCompleted()[0].quickCheck!).toBe(false);
  });

  it("does the same on the slower look's word step", () => {
    render(<Home />);
    startDeep();
    fireEvent.click(screen.getByRole("button", { name: /조금 살펴보고 싶어요/ }));
    for (let step = 0; step < 4; step += 1) fireEvent.click(screen.getAllByRole("button", { name: ko.common.skip })[0]); // body, affect, context, meaning
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.words.beforeTitle);
    expect(document.querySelectorAll(".chip")).toHaveLength(0);
    for (const name of [ko.emotion.escapes.several, ko.emotion.escapes.unsure]) expect(screen.getByRole("button", { name })).toBeTruthy();
    revealWords();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.emotion.title);
    expect(draft()?.deepReflection?.wordsRevealed?.at).toBeTruthy();
    expect(draft()?.quickCheck?.wordsRevealed).toBeUndefined();
  });
});

describe("each line of a past record says where it came from", () => {
  const record = {
    id: "source-1", createdAt: "2026-10-30T02:00:00.000Z", completedAt: "2026-10-30T02:07:00.000Z", status: "completed",
    stage: "summary", entry: "quick", locale: "ko",
    quickCheck: {
      affect: { valence: 0.2, activation: 0.8 }, candidatePool: [{ label: "짜증", source: "suggested" }],
      selected: [{ label: "짜증", source: "suggested" }], wordsRevealed: { at: "2026-10-30T02:01:00.000Z" }, endedAt: "2026-10-30T02:02:00.000Z",
    },
    deepReflection: {
      startedAt: "2026-10-30T02:02:00.000Z", body: [{ label: "어깨가 뭉침" }], concerns: ["존중받고 싶었다"],
      context: { eventText: "회의에서 말이 끊겼다", source: "event" },
      emotionCandidates: [{ label: "억울함", source: "suggested" }, { label: "뒤통수 맞은 느낌", source: "custom" }],
      outcome: { clarity: "clearer", usefulness: "helpful" },
    },
  };
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(getStorageKeys().COMPLETED_KEY, JSON.stringify([record]));
  });
  afterEach(cleanup);

  const rowOf = (label: string, value: string) => [...document.querySelectorAll(".summary-row")]
    .find((row) => row.querySelector("span")?.textContent === label && row.querySelector("strong")?.textContent === value) as HTMLElement;

  it("bands and labels every line: pressed, worked out by the app, written, or picked from the list", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    fireEvent.click(document.querySelector(".record-row")!);
    expect(screen.getByRole("list", { name: ko.recordDetail.legend.title })).toBeTruthy();
    const rows = [...document.querySelectorAll(".with-sources .summary-row")];
    expect(rows.every((row) => row.classList.contains("has-source") && row.querySelector(".source-label"))).toBe(true);

    const expectSource = (row: HTMLElement, kind: string, label: string) => {
      expect(row, label).toBeTruthy();
      expect(row.className).toContain(`source-${kind}`);
      expect(row.querySelector(".source-label")!.textContent).toBe(label);
    };
    expectSource(rowOf(ko.recordDetail.depth, ko.records.depth["quick+deep"]), "app", ko.recordDetail.source.depth);
    expectSource(rowOf(ko.recordDetail.quickSpot, ko.recordDetail.spotValue), "mine", ko.recordDetail.source.pressed);
    // the spot and the sentence the app made of it are two lines, never one mixed line
    const sentence = [...document.querySelectorAll(".summary-row")].find((row) => row.querySelector("span")?.textContent === ko.recordDetail.quickAffect) as HTMLElement;
    expectSource(sentence, "app", ko.recordDetail.source.sentence);
    expectSource(rowOf(ko.recordDetail.words, "억울함"), "mine", ko.recordDetail.source.picked);
    expectSource(rowOf(ko.recordDetail.words, "뒤통수 맞은 느낌"), "mine", ko.recordDetail.source.wrote);
    expectSource(rowOf(ko.recordDetail.body, "어깨가 뭉침"), "mine", ko.recordDetail.source.pressed);
    expectSource(rowOf(ko.recordDetail.context, "회의에서 말이 끊겼다"), "mine", ko.recordDetail.source.wrote);
    expectSource(rowOf(ko.recordDetail.concerns, "존중받고 싶었다"), "mine", ko.recordDetail.source.pressed);
  });

  it("says a list word was picked after 단어 보기 when the list was opened with it", () => {
    window.localStorage.setItem(getStorageKeys().COMPLETED_KEY, JSON.stringify([{ ...record, deepReflection: undefined, stage: "quick-summary" }]));
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    fireEvent.click(document.querySelector(".record-row")!);
    expect(rowOf(ko.recordDetail.words, "짜증").querySelector(".source-label")!.textContent).toBe(ko.recordDetail.source.pickedAfterReveal);
  });
});
