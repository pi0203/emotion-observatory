import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { SaveIsland } from "../app/save-island";
import { startDeep } from "./helpers/start";
import { ko } from "../lib/i18n/messages.ko";

/**
 * The saved notes under the closing questions grow from a small pill when an answer
 * is picked or changed (app/save-island.tsx, 2026-11-16). jsdom has no layout and no
 * matchMedia, so the tests give the note a size, a motion setting and a frame clock.
 */
const stubGridSize = () => {
  Element.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
};

const toDeepSummary = () => {
  render(<Home />);
  startDeep();
  fireEvent.click(screen.getByRole("button", { name: /조금 살펴보고 싶어요/ }));
  for (let i = 0; i < 5; i++) fireEvent.click(screen.getAllByRole("button", { name: "건너뛰기" })[0]);
  fireEvent.click(screen.getByRole("button", { name: "조금 더 분명해짐" }));
  fireEvent.click(screen.getByRole("button", { name: "도움됨" }));
  fireEvent.click(screen.getByRole("button", { name: /다음/ }));
};

let frames: FrameRequestCallback[] = [];
let clock = 0;
const runFrames = (count: number) => act(() => {
  for (let i = 0; i < count && frames.length; i++) {
    const due = frames;
    frames = [];
    clock += 16;
    due.forEach((callback) => callback(clock));
  }
});

const giveLayout = (reduce: boolean) => {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal("cancelAnimationFrame", () => { frames = []; });
  vi.spyOn(performance, "now").mockImplementation(() => clock);
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get() { return 320; } });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get() { return 48; } });
};

const restoreLayout = () => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete (HTMLElement.prototype as { offsetWidth?: number }).offsetWidth;
  delete (HTMLElement.prototype as { offsetHeight?: number }).offsetHeight;
};

describe("the saved note under the closing questions", () => {
  beforeEach(() => { window.localStorage.clear(); stubGridSize(); frames = []; clock = 0; });
  afterEach(() => { cleanup(); restoreLayout(); });

  it("keeps its words and its status role", () => {
    toDeepSummary();
    fireEvent.click(screen.getByRole("button", { name: "아직" }));
    expect(screen.getByRole("status")).toHaveTextContent(ko.talkToSomeone.saved);
  });

  it("grows sideways first, then down, and lets go of its size once settled", () => {
    giveLayout(false);
    toDeepSummary();
    fireEvent.click(screen.getByRole("button", { name: "아직" }));
    const note = screen.getByRole("status");
    expect(note.style.width).toBe("126px");
    expect(note.style.height).toBe("36px");
    runFrames(6);
    const width = parseFloat(note.style.width);
    const height = parseFloat(note.style.height);
    expect((width - 126) / (320 - 126)).toBeGreaterThan((height - 36) / (48 - 36));
    runFrames(200);
    expect(frames).toHaveLength(0);
    expect(note.style.width).toBe("");
    expect(note.style.height).toBe("");
  });

  it("moves again when the answer changes, and not at all with nothing pressed", () => {
    giveLayout(false);
    const { rerender } = render(<SaveIsland show replay="yes">saved</SaveIsland>);
    expect(screen.getByRole("status").style.width).toBe("");
    rerender(<SaveIsland show replay="yes">saved</SaveIsland>);
    expect(frames).toHaveLength(0);
    rerender(<SaveIsland show replay="no">saved</SaveIsland>);
    expect(screen.getByRole("status").style.width).toBe("126px");
    expect(frames).toHaveLength(1);
  });

  it("just appears when reduced motion is on", () => {
    giveLayout(true);
    toDeepSummary();
    fireEvent.click(screen.getByRole("button", { name: "예" }));
    expect(screen.getByRole("status").style.width).toBe("");
    expect(frames).toHaveLength(0);
  });
});
