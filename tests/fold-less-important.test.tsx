import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";
import { getStorageKeys } from "../lib/storage";
import type { EmotionSession } from "../lib/session-types";

/**
 * Third round (2026-11-05): the less important parts start folded. In the record
 * detail, the source labels and 살펴본 정도 wait behind one button at the foot;
 * the bands stay. On the records screen, moving and deleting sit behind 기록 관리,
 * open when the person came from 기록 보기·지우기.
 */
const record: EmotionSession = {
  id: "fold-1", createdAt: "2026-11-03T02:00:00.000Z", completedAt: "2026-11-03T02:05:00.000Z", status: "completed",
  stage: "quick-summary", entry: "quick", locale: "ko",
  quickCheck: { affect: { valence: 0.2, activation: 0.8 }, candidatePool: [], selected: [{ label: "짜증", source: "custom" }], context: { eventText: "버스를 놓쳤다" } },
};

describe("the record detail", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(getStorageKeys().COMPLETED_KEY, JSON.stringify([record]));
  });
  afterEach(cleanup);
  const open = () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    fireEvent.click(document.querySelector(".record-row")!);
  };

  it("hides the source labels, 살펴본 정도 and the legend at first, and keeps the bands", () => {
    open();
    expect(document.querySelector(".source-label")).toBeNull();
    expect(screen.queryByText(ko.recordDetail.depth)).toBeNull();
    expect(screen.queryByRole("list", { name: ko.recordDetail.legend.title })).toBeNull();
    const rows = [...document.querySelectorAll(".with-sources .summary-row")];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.classList.contains("has-source"))).toBe(true);
  });

  it("shows them all from one button at the foot, and folds them again", () => {
    open();
    const toggle = screen.getByRole("button", { name: ko.recordDetail.sourcesShow });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    // at the foot: after every line of the record
    const lastCard = [...document.querySelectorAll(".summary-card")].at(-1)!;
    expect(lastCard.compareDocumentPosition(toggle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelectorAll(".source-label").length).toBeGreaterThan(0);
    expect(screen.getByText(ko.recordDetail.depth)).toBeTruthy();
    expect(screen.getByRole("list", { name: ko.recordDetail.legend.title })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: ko.recordDetail.sourcesHide }));
    expect(document.querySelector(".source-label")).toBeNull();
  });

  it("changes nothing that is stored", () => {
    open();
    const before = window.localStorage.getItem(getStorageKeys().COMPLETED_KEY);
    fireEvent.click(screen.getByRole("button", { name: ko.recordDetail.sourcesShow }));
    expect(window.localStorage.getItem(getStorageKeys().COMPLETED_KEY)).toBe(before);
  });
});

describe("the records screen", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(getStorageKeys().COMPLETED_KEY, JSON.stringify([record]));
  });
  afterEach(cleanup);
  const manage = () => document.querySelector("details.record-manage") as HTMLDetailsElement;

  it("folds moving and deleting into one line, 기록 관리, when opened from 지난 기록", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    expect(manage().open).toBe(false);
    expect(manage().querySelector("summary")!.textContent).toBe(ko.records.manage);
    expect(manage().querySelector("#record-transfer-title")!.textContent).toBe(ko.recordTransfer.title);
  });

  it("opens it when the person came from 기록 보기·지우기", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.storageManage }));
    expect(manage().open).toBe(true);
  });
});

describe("in English", () => {
  it("has its own words", () => {
    expect(en.records.manage).toBe("Manage entries");
    expect(en.recordDetail.sourcesShow).toBeTruthy();
    expect(en.recordDetail.sourcesHide).toBeTruthy();
  });
});
