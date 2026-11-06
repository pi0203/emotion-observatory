import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";
import { getStorageAdapter } from "../lib/storage-adapter";
import { DAY_STRIP_LENGTH, recentDays } from "../lib/records";
import type { EmotionSession } from "../lib/session-types";

/**
 * The last 14 days above the records list (owner's decision 2026-10-30, second
 * round C): a dot on a day with a record, an open dashed space otherwise.
 */
const NOW = new Date(2026, 9, 30, 15, 0); // 30 Oct 2026, 15:00 local
const at = (daysAgo: number, hour = 10) => new Date(2026, 9, 30 - daysAgo, hour, 0).toISOString();
const record = (id: string, iso: string): EmotionSession => ({
  id, createdAt: iso, completedAt: iso, status: "completed", stage: "quick-summary", entry: "quick",
  quickCheck: { candidatePool: [], selected: [{ label: `말${id}`, source: "custom" }] },
});

describe("recentDays", () => {
  it("gives fourteen local days, oldest first, today last", () => {
    const days = recentDays([], NOW);
    expect(DAY_STRIP_LENGTH).toBe(14);
    expect(days).toHaveLength(14);
    expect(days[13].key).toBe("2026-10-30");
    expect(days[0].key).toBe("2026-10-17");
  });

  it("keeps one mark per day, the first record of that day in the list's order", () => {
    const days = recentDays([record("late", at(0, 20)), record("early", at(0, 8)), record("three", at(3))], NOW);
    expect(days[13].firstId).toBe("late");
    expect(days[10].firstId).toBe("three");
    expect(days.filter((day) => day.firstId)).toHaveLength(2);
  });

  it("leaves out records older than the strip, and days without a record carry nothing", () => {
    const days = recentDays([record("old", at(20))], NOW);
    expect(days.every((day) => day.firstId === undefined)).toBe(true);
    expect(Object.keys(days[0])).toEqual(["key", "iso", "firstId"]);
  });
});

describe("on the records screen", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  const open = (records: EmotionSession[]) => {
    for (const item of [...records].reverse()) getStorageAdapter().saveCompleted(item);
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    return document.querySelector(".day-strip") as HTMLElement;
  };

  it("sits at the top, above the list, with dots and open spaces and today at the right end", () => {
    const strip = open([record("a", at(0)), record("b", at(0, 9)), record("c", at(5))]);
    expect(strip.compareDocumentPosition(document.querySelector(".record-list")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const cells = strip.querySelectorAll(".day-cell");
    expect(cells).toHaveLength(14);
    expect(strip.querySelectorAll(".day-cell.has-record")).toHaveLength(2);
    expect(strip.querySelectorAll(".day-cell.is-open")).toHaveLength(12);
    expect(cells[13].className).toContain("has-record");
    expect(strip.querySelector(".day-ends")!.lastElementChild!.textContent).toBe(ko.records.days.today);
  });

  it("counts nothing: no number of days, no run, no word for a missed day", () => {
    const strip = open([record("a", at(0)), record("c", at(1))]);
    const text = strip.textContent ?? "";
    // the only figures are the window's own name and its first day, never a count of records or days kept
    expect(text.replace(ko.records.days.title, "").replace("10/17", "")).not.toMatch(/\d/);
    expect(text).not.toMatch(/연속|안 한|빠진|놓친|streak|missed/i);
    for (const cell of strip.querySelectorAll(".day-cell.is-open")) {
      expect(cell.getAttribute("aria-hidden")).toBe("true");
      expect(cell.tagName).toBe("SPAN");
    }
  });

  it("takes a dot to that day's first record in the list", () => {
    const strip = open([record("a", at(0)), record("c", at(5))]);
    const dot = within(strip).getByRole("button", { name: ko.records.days.goTo.replace("{date}", "10/25") });
    fireEvent.click(dot);
    expect(document.activeElement).toBe(document.getElementById("record-c"));
  });

  it("is not drawn when there are no records yet", () => {
    open([]);
    expect(document.querySelector(".day-strip")).toBeNull();
  });
});

describe("fitting 390px", () => {
  it("lays fourteen shrinking columns on one line, so the width always holds them", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/\.day-cells \{[^}]*grid-template-columns: repeat\(14, minmax\(0, 1fr\)\)/);
    expect(css).not.toMatch(/\.day-cells \{[^}]*flex-wrap/);
    // the open space has no fill: it is not coloured as a missed day
    expect(css).toMatch(/\.day-cell\.is-open \{[^}]*background: transparent/);
  });
});

describe("English wording", () => {
  it("has its own words for the strip", () => {
    expect(en.records.days.goTo).toContain("{date}");
    expect(en.records.days.today).toBe("Today");
  });
});
