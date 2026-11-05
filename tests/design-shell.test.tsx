import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import Home from "../app/(ko)/page";
import EmotionApp from "../app/emotion-app";
import { ko, koOnly } from "../lib/i18n/messages.ko";
import { getStorageKeys } from "../lib/storage";
import { startQuick } from "./helpers/start";

/**
 * The homepage frame (docs/DESIGN_ALIGNMENT.md §5): header, menu and footer on
 * the landing and record screens; the steps, the coach and the stopped screen
 * keep only their minimal top bar.
 */
const click = (name: string) => fireEvent.click(screen.getAllByRole("button", { name: new RegExp(`^${name}`) })[0]);
const record = {
  id: "shell-1", createdAt: "2026-10-01T09:00:00.000Z", completedAt: "2026-10-01T09:04:00.000Z", status: "completed",
  stage: "quick-summary", entry: "quick", locale: "ko",
  quickCheck: { affect: { valence: 0.2, activation: 0.8 }, candidatePool: [{ label: "짜증", source: "suggested" }], selected: [{ label: "짜증", source: "suggested" }] },
};
const hasFrame = () => ({
  header: document.querySelector(".site-header") !== null,
  footer: document.querySelector(".site-footer") !== null,
  homepageLinks: [...document.querySelectorAll("a")].filter((a) => a.getAttribute("href")?.startsWith("https://eunchanjoe.vercel.app")).length,
});

describe("homepage frame on the landing and record screens", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(getStorageKeys().COMPLETED_KEY, JSON.stringify([record]));
  });
  afterEach(cleanup);

  it("shows the homepage header with its wordmark and menu, as banner and navigation landmarks", () => {
    render(<Home />);
    const banner = screen.getByRole("banner");
    expect(within(banner).getByRole("link", { name: "Eunchan Joe" }).getAttribute("href")).toBe("https://eunchanjoe.vercel.app/");
    const nav = within(banner).getByRole("navigation", { name: ko.shell.siteNav });
    const links = within(nav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Me", "Reading", "Threads", "Map"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://eunchanjoe.vercel.app/me/", "https://eunchanjoe.vercel.app/reading/", "https://eunchanjoe.vercel.app/threads/", "https://eunchanjoe.vercel.app/map/",
    ]);
    for (const link of [...links, within(banner).getByRole("link", { name: "Eunchan Joe" })]) expect(link.getAttribute("target")).toBeNull();
  });

  it("puts the homepage's wildflower mark before the wordmark, hidden from screen readers", () => {
    render(<Home />);
    const logo = within(screen.getByRole("banner")).getByRole("link", { name: "Eunchan Joe" });
    const mark = logo.firstElementChild;
    expect(mark?.tagName.toLowerCase()).toBe("svg");
    expect(mark?.getAttribute("aria-hidden")).toBe("true");
    expect(mark?.getAttribute("focusable")).toBe("false");
    expect(logo.textContent).toBe("Eunchan Joe");
  });

  it("keeps the app's own name in the eyebrow", () => {
    render(<Home />);
    expect(within(screen.getByRole("main")).getAllByText(ko.common.appName).length).toBeGreaterThan(0);
  });

  it("has a small footer without a mail address or a licence line", () => {
    render(<Home />);
    const footer = screen.getByRole("contentinfo");
    expect(footer.textContent).toContain(ko.common.appName);
    expect(footer.textContent).toContain(ko.shell.owner);
    // the way back to the homepage, then the terms (Korean only, 2026-11-01) and the privacy policy (2026-11-02)
    expect(within(footer).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["https://eunchanjoe.vercel.app/", "/terms", "/privacy"]);
    expect(within(footer).getByRole("link", { name: koOnly.termsLink })).toBeTruthy();
    expect(footer.innerHTML).not.toMatch(/mailto:|@|CC BY|license|licence|라이선스|저작권/i);
    expect(footer.textContent).not.toMatch(/위기|crisis/i);
  });

  it("leaves the terms link out of the English footer, since the terms are Korean only", () => {
    render(<EmotionApp locale="en" />);
    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["https://eunchanjoe.vercel.app/"]);
    expect(footer.textContent).not.toContain(koOnly.termsLink);
  });

  it("starts with a skip link to the main content", () => {
    render(<Home />);
    const first = document.querySelector(".site-frame")!.querySelector("a, button")!;
    expect(first.textContent).toBe(ko.shell.skipToContent);
    expect(first.getAttribute("href")).toBe("#main");
    expect(screen.getByRole("main").id).toBe("main");
  });

  it("frames the records list and a record's detail the same way", () => {
    render(<Home />);
    click(ko.landing.records);
    expect(hasFrame()).toMatchObject({ header: true, footer: true });
    fireEvent.click(document.querySelector(".record-row")!);
    expect(screen.getByRole("heading", { level: 1 }).textContent).not.toBe(ko.records.title);
    expect(hasFrame()).toMatchObject({ header: true, footer: true });
  });
});

describe("no homepage frame while working through the steps", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("the first quick step keeps only the app name and 그만하기", () => {
    render(<Home />);
    startQuick();
    expect(hasFrame()).toEqual({ header: false, footer: false, homepageLinks: 0 });
    expect(screen.getByRole("button", { name: ko.common.stop })).toBeTruthy();
  });

  it("the coach and the stopped screen have no homepage frame either", () => {
    render(<Home />);
    startQuick();
    // move to the unpleasant, activated corner with the keyboard (a pointer has no size in jsdom)
    const pad = document.querySelector(".affect-grid")!;
    fireEvent.keyDown(pad, { key: "Enter" });
    for (let step = 0; step < 7; step += 1) {
      fireEvent.keyDown(pad, { key: "ArrowLeft" });
      fireEvent.keyDown(pad, { key: "ArrowUp" });
    }
    click("다음");
    click(ko.words.reveal);
    const coachWord = [...document.querySelectorAll(".chip")].find((chip) => ["짜증", "억울함", "답답함"].includes(chip.textContent ?? ""));
    expect(coachWord).toBeDefined();
    fireEvent.click(coachWord!);
    click("표현 사이의 차이 살펴보기");
    expect(document.querySelector(".example-notice")).not.toBeNull();
    expect(hasFrame()).toEqual({ header: false, footer: false, homepageLinks: 0 });
    click(ko.common.stop);
    click("여기서 그만하기");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("지금은 더 살펴보지");
    expect(hasFrame()).toEqual({ header: false, footer: false, homepageLinks: 0 });
  });
});
