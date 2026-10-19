import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { INPUT_LIMITS } from "../lib/limits";
import { persistSession, saveCompleted, saveDraft } from "../lib/storage";
import { createSession } from "../lib/session-types";

const stubGridSize = () => {
  Element.prototype.getBoundingClientRect = function () {
    return { left: 0, top: 0, right: 400, bottom: 300, width: 400, height: 300, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
};

const openQuickWords = () => {
  render(<Home />);
  fireEvent.click(screen.getByRole("button", { name: /빠르게 살펴보기/ }));
  fireEvent(screen.getByRole("application", { name: /불쾌함과 유쾌함/ }), new MouseEvent("pointerdown", { bubbles: true, clientX: 40, clientY: 30 }));
  fireEvent.click(screen.getByRole("button", { name: /다음/ }));
};

describe("own-words fields have a ceiling", () => {
  beforeEach(() => { window.localStorage.clear(); stubGridSize(); });
  afterEach(cleanup);

  it("caps a custom word at the word limit, so one paste cannot fill the chip row or the storage", () => {
    openQuickWords();
    const input = screen.getByRole("textbox", { name: "내 말로 적기" });
    expect(input).toHaveAttribute("maxlength", String(INPUT_LIMITS.word));
  });

  it("keeps the limits in the order word < line < text", () => {
    expect(INPUT_LIMITS.word).toBeLessThan(INPUT_LIMITS.line);
    expect(INPUT_LIMITS.line).toBeLessThan(INPUT_LIMITS.text);
  });
});

describe("when the browser refuses to write", () => {
  beforeEach(() => { window.localStorage.clear(); stubGridSize(); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });

  const quotaFull = () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("quota", "QuotaExceededError"); });
  };

  it("the storage functions report false instead of throwing", () => {
    quotaFull();
    const session = createSession();
    expect(saveDraft(session)).toBe(false);
    expect(saveCompleted({ ...session, status: "completed" })).toBe(false);
    expect(persistSession(session)).toBe(false);
    expect(persistSession({ ...session, status: "completed" })).toBe(false);
  });

  it("the steps keep working and a note says the record is not being kept", () => {
    quotaFull();
    openQuickWords();
    // the screen moved on to the words even though nothing could be saved
    expect(screen.getByRole("textbox", { name: "내 말로 적기" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/저장하지 못하고/);
  });

  it("shows no such note while writes succeed", () => {
    openQuickWords();
    expect(screen.queryByText(/저장하지 못하고/)).toBeNull();
  });
});
