import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";
import { getStorageKeys } from "../lib/storage";
import { MAP_GAP_DAYS, mapPoints } from "../lib/records";
import type { EmotionSession } from "../lib/session-types";

/**
 * 내 지도 (third round, 2026-11-05): every record with a spot on one pad under
 * the 14-day strip, joined in time order, older fainter, the latest larger.
 */
const day = (n: number) => new Date(Date.UTC(2026, 9, n, 3, 0)).toISOString();
const quick = (id: string, at: string, valence?: number, activation?: number): EmotionSession => ({
  id, createdAt: at, completedAt: at, status: "completed", stage: "quick-summary", entry: "quick", locale: "ko",
  quickCheck: { affect: valence === undefined ? { unknown: true } : { valence, activation }, candidatePool: [], selected: [] },
});

describe("mapPoints", () => {
  it("orders by time whatever the stored order, and keeps only records with a spot", () => {
    const points = mapPoints([quick("c", day(20), 0.9, 0.9), quick("none", day(15)), quick("a", day(1), 0.1, 0.1), quick("b", day(5), 0.5, 0.5)]);
    expect(points.map((point) => point.id)).toEqual(["a", "b", "c"]);
    expect(points[0].afterGap).toBeUndefined();
  });

  it("marks a gap of more than fourteen days, and only that", () => {
    expect(MAP_GAP_DAYS).toBe(14);
    const points = mapPoints([quick("a", day(1), 0.1, 0.1), quick("b", day(15), 0.5, 0.5), quick("c", day(30), 0.9, 0.9)]);
    expect(points.map((point) => point.afterGap)).toEqual([undefined, false, true]);
  });

  it("takes the spot from after the slower look when a record has both", () => {
    const both: EmotionSession = { ...quick("d", day(2), 0.1, 0.9), deepReflection: { startedAt: day(2), body: [], concerns: [], emotionCandidates: [], affect: { valence: 0.7, activation: 0.3 } } };
    expect(mapPoints([both])[0]).toMatchObject({ valence: 0.7, activation: 0.3 });
    const skippedDeep: EmotionSession = { ...both, deepReflection: { startedAt: day(2), body: [], concerns: [], emotionCandidates: [], affect: {} } };
    expect(mapPoints([skippedDeep])[0]).toMatchObject({ valence: 0.1, activation: 0.9 });
  });

  it("leaves out a record whose time cannot be read", () => {
    expect(mapPoints([quick("bad", "not a date", 0.5, 0.5)])).toEqual([]);
  });
});

describe("on the records screen", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);
  const open = (records: EmotionSession[]) => {
    window.localStorage.setItem(getStorageKeys().COMPLETED_KEY, JSON.stringify(records));
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    return document.querySelector(".records-map") as HTMLElement | null;
  };

  it("sits right under the 14-day strip", () => {
    const map = open([quick("a", day(1), 0.2, 0.2)])!;
    expect(document.querySelector(".day-strip")!.nextElementSibling).toBe(map);
    expect(within(map).getByText(ko.records.map.title)).toBeTruthy();
  });

  it("with one record shows one point and nothing else: no line, no next spot, no count", () => {
    const map = open([quick("a", day(1), 0.2, 0.2)])!;
    expect(map.querySelectorAll(".map-point")).toHaveLength(1);
    expect(map.querySelector(".map-lines")).toBeNull();
    expect(map.textContent!.replace(ko.records.map.title, "")).not.toMatch(/\d|다음|더|개/);
  });

  it("joins the points in time order, fading the older ones and enlarging the latest", () => {
    const map = open([quick("c", day(25), 0.8, 0.8), quick("b", day(3), 0.5, 0.5), quick("a", day(1), 0.2, 0.2)])!;
    const points = [...map.querySelectorAll<HTMLElement>(".map-point")];
    expect(points).toHaveLength(3);
    const opacity = points.map((point) => Number((point.querySelector(".map-dot") as HTMLElement).style.opacity));
    expect(opacity[0]).toBeLessThan(opacity[1]);
    expect(opacity[1]).toBeLessThan(opacity[2]);
    expect(opacity[2]).toBe(1);
    expect(points.map((point) => point.classList.contains("is-latest"))).toEqual([false, false, true]);
    const lines = map.querySelectorAll(".map-lines line");
    expect(lines).toHaveLength(2);
    // 3 → 25 October is more than fourteen days: that line alone is dotted
    expect([...lines].map((line) => line.classList.contains("is-gap"))).toEqual([false, true]);
    expect(map.querySelector(".map-lines")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("opens a record from its point, by pointer or keyboard", () => {
    const map = open([quick("b", day(3), 0.5, 0.5), quick("a", day(1), 0.2, 0.2)])!;
    const first = within(map).getAllByRole("button")[0];
    expect(first.tagName).toBe("BUTTON"); // reachable with Tab, opened with Enter or Space
    expect(first.getAttribute("aria-label")).toMatch(/기록 열기$/);
    fireEvent.click(first);
    expect(screen.getByRole("button", { name: ko.recordDetail.backToList })).toBeTruthy();
  });

  it("is not drawn when no record has a spot, and not at all with no records", () => {
    expect(open([quick("none", day(1))])).toBeNull();
    cleanup();
    window.localStorage.clear();
    expect(open([])).toBeNull();
  });

  it("skips records without a spot, which stay in the list below", () => {
    const map = open([quick("a", day(1), 0.2, 0.2), quick("none", day(2)), quick("b", day(3), 0.6, 0.6)])!;
    expect(map.querySelectorAll(".map-point")).toHaveLength(2);
    expect(document.querySelectorAll(".record-row")).toHaveLength(3);
  });
});

describe("in English", () => {
  it("has its own words", () => {
    expect(en.records.map.title).toBe("My map");
    expect(en.records.map.open).toContain("{when}");
  });
});
