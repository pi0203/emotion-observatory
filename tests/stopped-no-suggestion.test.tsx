import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import EnglishPage from "../app/(en)/en/page";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";

/**
 * Stopping at the gate ends on 여기까지 with no suggestion of what to do next
 * (2026-11-14, 본인 결정): no 물 한 잔 · 잠깐 걷기 · 선택해보세요 line.
 */
const stopAtGate = (m: typeof ko | typeof en) => {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${m.landing.start}`) }));
  fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${m.common.next}`) }));
  fireEvent.click(screen.getByRole("button", { name: m.quickCandidates.deep }));
  fireEvent.click(screen.getByRole("button", { name: m.entry.stop }));
};

describe("the stopped screen after stopping at the gate", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("shows no suggestion in Korean", () => {
    render(<Home />);
    stopAtGate(ko);
    expect(screen.getByText(ko.stopped.eyebrow)).toBeInTheDocument();
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("선택해보세요");
    expect(text).not.toContain("물 한 잔");
  });

  it("shows no suggestion in English", () => {
    render(<EnglishPage />);
    stopAtGate(en);
    expect(screen.getByText(en.stopped.eyebrow)).toBeInTheDocument();
    const text = document.body.textContent ?? "";
    expect(text).not.toContain("glass of water");
    expect(text).not.toContain("short walk");
  });
});
