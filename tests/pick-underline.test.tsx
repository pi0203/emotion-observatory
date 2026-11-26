import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import Home from "../app/(ko)/page";
import { PickUnderline } from "../app/pick-underline";
import { ko } from "../lib/i18n/messages.ko";
import { revealWords, startQuick } from "./helpers/start";

/** The line under a picked emotion word is drawn once when it is picked (2026-11-16, owner's decision 「구현」). */
const toQuickWords = () => {
  render(<Home />);
  startQuick();
  fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));
  revealWords();
};
const chip = (label: string) => screen.getByRole("button", { name: label });
const lineIn = (label: string) => chip(label).querySelector("[data-pick-line]");

describe("line under a picked emotion word", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("has no line before a pick, draws it on the pick, and keeps the word's text as it was", () => {
    toQuickWords();
    expect(lineIn("못마땅함")).toBeNull();
    fireEvent.click(chip("못마땅함"));
    expect(lineIn("못마땅함")!.getAttribute("data-pick-line")).toBe("draw");
    expect(lineIn("못마땅함")!.getAttribute("aria-hidden")).toBe("true");
    expect(chip("못마땅함").textContent).toBe("✓ 못마땅함");
    fireEvent.animationEnd(lineIn("못마땅함")!);
    expect(lineIn("못마땅함")!.getAttribute("data-pick-line")).toBe("still");
    fireEvent.click(chip("못마땅함"));
    expect(lineIn("못마땅함")).toBeNull();
  });

  it("does not draw for a word already picked when the screen opens", () => {
    render(<button className="chip selected">못마땅함<PickUnderline on /></button>);
    expect(document.querySelector("[data-pick-line]")!.getAttribute("data-pick-line")).toBe("still");
  });

  it("draws within half a second, and not at all with reduced motion", () => {
    const css = readFileSync("app/pick-underline.module.css", "utf8");
    expect(css).toMatch(/0 3px 0 var\(--pick-underline\)/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.draw \{ animation: none; \}/);
    expect(css).not.toMatch(/infinite|alternate/);
    const code = readFileSync("app/pick-underline.tsx", "utf8");
    expect(code).toMatch(/const MAX_MS = 500;/);
  });
});
