import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { getStorageKeys } from "../lib/storage";
import type { EmotionSession } from "../lib/session-types";
import { startQuick } from "./helpers/start";

/**
 * The pad is a true circle (owner's decision 2026-11-24): the egg shape read as
 * a squashed circle. The pressing pad, the small pad on a record, the map and
 * the drawing on the first screen share one shape, so a spot lands at the same
 * place on each.
 */
const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");
const rules = (selector: string) => [...css.matchAll(new RegExp(`(?:^|[}\\s])${selector.replace(".", "\\.")} \\{([^}]*)\\}`, "g"))].map((match) => match[1]);

describe("one round shape for every pad", () => {
  for (const selector of [".affect-grid", ".mini-pad", ".map-pad", ".hero-pad"]) {
    it(`${selector} is square and fully round, on phones too`, () => {
      const shaped = rules(selector).filter((body) => /aspect-ratio|border-radius/.test(body));
      expect(shaped.length).toBeGreaterThan(0);
      for (const body of shaped) {
        expect(body).toMatch(/aspect-ratio: 1;/);
        expect(body).toMatch(/border-radius: 50%;/);
      }
    });
  }
});

describe("pressing the round pad", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  // jsdom gives the pad no size: give it a 300px square at (10, 20)
  const pad = () => {
    const element = document.querySelector(".affect-grid") as HTMLElement;
    element.getBoundingClientRect = () => ({ left: 10, top: 20, width: 300, height: 300, right: 310, bottom: 320, x: 10, y: 20, toJSON: () => ({}) });
    return element;
  };
  const pressAt = (x: number, y: number) => {
    // jsdom has no PointerEvent, so a mouse event named pointerdown carries the place
    fireEvent(pad(), new MouseEvent("pointerdown", { bubbles: true, clientX: 10 + x * 300, clientY: 20 + y * 300 }));
    const dot = document.querySelector(".affect-dot") as HTMLElement;
    return { left: parseFloat(dot.style.left), top: parseFloat(dot.style.top) };
  };

  it("puts the spot in the middle for the middle, and at each of the four ends for the four ends", () => {
    render(<Home />);
    startQuick();
    expect(pressAt(0.5, 0.5)).toEqual({ left: 50, top: 50 });
    expect(pressAt(0, 0.5)).toEqual({ left: 0, top: 50 });
    expect(pressAt(1, 0.5)).toEqual({ left: 100, top: 50 });
    expect(pressAt(0.5, 0)).toEqual({ left: 50, top: 0 });
    expect(pressAt(0.5, 1)).toEqual({ left: 50, top: 100 });
  });
});

describe("a saved spot on the small pads", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  const record = (id: string, createdAt: string, valence: number, activation: number): EmotionSession => ({
    id, createdAt, completedAt: createdAt, status: "completed", stage: "quick-summary", entry: "quick", locale: "ko",
    quickCheck: { affect: { valence, activation }, candidatePool: [], selected: [{ label: "짜증", source: "suggested" }] },
  });

  it("sits at the same share across and down as it was saved, on the map and on the record", () => {
    const saved = [record("old-a", "2026-11-03T02:00:00.000Z", 0.2, 0.8), record("old-b", "2026-11-02T02:00:00.000Z", 0.75, 0.3)];
    window.localStorage.setItem(getStorageKeys().COMPLETED_KEY, JSON.stringify(saved));
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    const at = (element: Element) => ({ left: parseFloat((element as HTMLElement).style.left), top: parseFloat((element as HTMLElement).style.top) });
    const onMap = [...document.querySelectorAll(".map-pad .map-point")].map(at);
    expect(onMap).toHaveLength(2);
    for (const spot of [{ left: 20, top: 20 }, { left: 75, top: 70 }]) {
      expect(onMap.some((point) => Math.abs(point.left - spot.left) < 1e-6 && Math.abs(point.top - spot.top) < 1e-6)).toBe(true);
    }
    fireEvent.click(document.getElementById("record-old-a")!);
    const dot = at(document.querySelector(".mini-pad .mini-dot")!);
    expect(dot.left).toBeCloseTo(20, 6);
    expect(dot.top).toBeCloseTo(20, 6);
  });
});
