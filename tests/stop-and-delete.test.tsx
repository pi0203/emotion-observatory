import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { createSession, sessionReducer } from "../lib/session-types";
import { loadCompleted, loadDraft, persistSession, saveCompleted } from "../lib/storage";
import type { EmotionSession } from "../lib/session-types";

const atCandidates = (word = "긴장"): EmotionSession => {
  let state = sessionReducer(createSession(), { type: "START_QUICK" });
  state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.2, activation: 0.9 } });
  state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: [{ label: word, source: "suggested" }] });
  return sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: word });
};

/** Resumes the parked draft, stops it, and returns what the user sees. */
const stopFromDraft = (draft: EmotionSession) => {
  persistSession(draft);
  render(<Home />);
  fireEvent.click(screen.getByRole("button", { name: /지난 기록 이어하기/ }));
  fireEvent.click(screen.getByRole("button", { name: "그만하기" }));
  fireEvent.click(screen.getByRole("button", { name: "여기서 그만하기" }));
};

describe("deleting a stopped record", () => {
  const reload = vi.fn();
  beforeEach(() => {
    window.localStorage.clear();
    reload.mockClear();
    Object.defineProperty(window, "location", { value: { ...window.location, reload }, writable: true, configurable: true });
  });
  afterEach(cleanup);

  it("keeps the stopped record until the user asks to delete it", () => {
    const draft = atCandidates();
    stopFromDraft(draft);
    expect(loadCompleted().map((item) => [item.id, item.status])).toEqual([[draft.id, "stopped"]]);
  });

  it("removes the stopped record from this device when asked", () => {
    const draft = atCandidates();
    stopFromDraft(draft);
    fireEvent.click(screen.getByRole("button", { name: "이 기록을 지우기" }));
    expect(loadCompleted()).toEqual([]);
    expect(loadDraft()).toBeNull();
    expect(reload).toHaveBeenCalled();
  });

  it("deletes only that record, leaving every other one alone", () => {
    const other = { ...sessionReducer(atCandidates("설렘"), { type: "COMPLETE_QUICK" }), id: "kept" };
    saveCompleted(other);
    const draft = atCandidates();
    stopFromDraft(draft);
    fireEvent.click(screen.getByRole("button", { name: "이 기록을 지우기" }));
    expect(loadCompleted().map((item) => item.id)).toEqual(["kept"]);
  });
});
