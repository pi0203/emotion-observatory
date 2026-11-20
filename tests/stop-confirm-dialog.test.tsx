import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { createSession, sessionReducer } from "../lib/session-types";
import { loadCompleted, loadDraft, persistSession } from "../lib/storage";
import type { EmotionSession } from "../lib/session-types";

/**
 * The window that asks after 그만하기 (2026-11-20): it is named by its own title,
 * focus goes into it, Escape closes it on the side that keeps the record, and
 * focus then returns to 그만하기. The two buttons do what they did before.
 */
const atCandidates = (): EmotionSession => {
  let state = sessionReducer(createSession(), { type: "START_QUICK" });
  state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.2, activation: 0.9 } });
  state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: [{ label: "긴장", source: "suggested" }] });
  return sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: "긴장" });
};
const stopButton = () => screen.getByRole("button", { name: ko.common.stop });
const openConfirm = () => {
  const draft = atCandidates();
  persistSession(draft);
  render(<Home />);
  fireEvent.click(screen.getByRole("button", { name: /지난 기록 이어하기/ }));
  fireEvent.click(stopButton());
  return draft;
};

describe("the window that asks after 그만하기", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("is named by the title written inside it", () => {
    openConfirm();
    const dialog = screen.getByRole("dialog");
    const title = dialog.querySelector("h2")!;
    expect(title.textContent).toBe(ko.stopModal.title.replace(/\n/g, ""));
    expect(dialog.getAttribute("aria-labelledby")).toBe(title.id);
    expect(title.id).not.toBe("");
    // the title is two lines on screen; the name carries the same letters in the same order
    const escaped = ko.stopModal.title.split("\n").map((line) => line.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    expect(dialog).toHaveAccessibleName(new RegExp(`^${escaped.join("\\s*")}$`));
  });

  it("takes focus when it opens, on the button that keeps the record going", () => {
    openConfirm();
    const dialog = screen.getByRole("dialog");
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: ko.stopModal.keepGoing }));
  });

  it("closes on Escape without stopping, and hands focus back to 그만하기", () => {
    const draft = openConfirm();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    // the step is still the one being recorded, and nothing was stopped or dropped
    expect(stopButton()).toBeTruthy();
    expect(loadDraft()?.id).toBe(draft.id);
    expect(loadDraft()?.stage).toBe(draft.stage);
    expect(loadDraft()?.quickCheck?.selected).toEqual(draft.quickCheck?.selected);
    expect(loadDraft()?.status).toBe("draft");
    expect(loadCompleted()).toEqual([]);
    expect(document.activeElement).toBe(stopButton());
  });

  it("keeps both buttons as they were: one goes on, the other stops", () => {
    const draft = openConfirm();
    fireEvent.click(screen.getByRole("button", { name: ko.stopModal.keepGoing }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(loadDraft()?.status).toBe("draft");
    expect(loadCompleted()).toEqual([]);
    expect(document.activeElement).toBe(stopButton());

    fireEvent.click(stopButton());
    fireEvent.click(screen.getByRole("button", { name: ko.stopModal.stop }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(loadCompleted().map((item) => [item.id, item.status])).toEqual([[draft.id, "stopped"]]);
  });
});
