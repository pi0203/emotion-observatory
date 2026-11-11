import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

  it("puts the homepage's plum-blossom mark before the wordmark, hidden from screen readers, light or dark with the page", () => {
    render(<Home />);
    const logo = within(screen.getByRole("banner")).getByRole("link", { name: "Eunchan Joe" });
    const mark = logo.firstElementChild!;
    expect(mark.tagName.toLowerCase()).toBe("picture");
    expect(mark.getAttribute("aria-hidden")).toBe("true");
    expect(mark.querySelector("img")?.getAttribute("alt")).toBe("");
    expect(mark.querySelector("img")?.getAttribute("src")).toBe("/logo/plum-header-light.svg");
    expect(mark.querySelector("source")?.getAttribute("media")).toBe("(prefers-color-scheme: dark)");
    expect(logo.textContent).toBe("Eunchan Joe");
  });

  it("titles the first screen with the app's name, the nickname 이쯤 in a small line under it (2026-11-10)", () => {
    render(<Home />);
    const main = within(screen.getByRole("main"));
    const title = main.getByRole("heading", { level: 1 });
    expect(title.textContent).toBe(ko.common.appName);
    expect(title.nextElementSibling!.textContent).toBe(koOnly.alias);
    expect(title.nextElementSibling!.className).toBe("hero-alias");
    // the old title sentence stays, word for word, right after the nickname
    expect(title.nextElementSibling!.nextElementSibling!.textContent).toBe(ko.landing.title);
    // the header keeps its link to the homepage
    expect(within(screen.getByRole("banner")).getByRole("link", { name: "Eunchan Joe" }).getAttribute("href")).toBe("https://eunchanjoe.vercel.app/");
  });

  it("sets the header wordmark at the homepage's size, below the title's", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/--site-wordmark: 1\.3rem;/);
    expect(css).toMatch(/\.site-logo \{[^}]*font-size: var\(--site-wordmark\);[^}]*letter-spacing: \.01em;/);
    expect(css).toMatch(/\.hero-title \{[^}]*font-size: var\(--t-lead\)/);
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

  it("links the English footer to the Korean terms and privacy policy in the same places, as Terms · Privacy (2026-11-10)", () => {
    render(<EmotionApp locale="en" />);
    const footer = screen.getByRole("contentinfo");
    const links = within(footer).getAllByRole("link");
    expect(links.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["eunchanjoe.vercel.appKO (in Korean)", "https://eunchanjoe.vercel.app/"], ["TermsKO (in Korean)", "/terms"], ["PrivacyKO (in Korean)", "/privacy"],
    ]);
    // there is no English text behind them yet: say so to the browser and to screen readers
    expect(links.map((link) => link.getAttribute("hreflang"))).toEqual(["ko", "ko", "ko"]);
    expect(footer.textContent).not.toContain(koOnly.termsLink);
  });

  it("sends the English menu to the homepage's English reading where it exists: only /en/me/ for now (2026-11-10)", () => {
    render(<EmotionApp locale="en" />);
    const nav = within(screen.getByRole("banner")).getByRole("navigation");
    const links = within(nav).getAllByRole("link");
    // the Korean-only pages carry a small KO mark, read as "(in Korean)", and hreflang ko (2026-11-10)
    expect(links.map((link) => link.textContent)).toEqual(["Me", "ReadingKO (in Korean)", "ThreadsKO (in Korean)", "MapKO (in Korean)"]);
    expect(links.map((link) => link.getAttribute("hreflang"))).toEqual([null, "ko", "ko", "ko"]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "https://eunchanjoe.vercel.app/en/me/", "https://eunchanjoe.vercel.app/reading/", "https://eunchanjoe.vercel.app/threads/", "https://eunchanjoe.vercel.app/map/",
    ]);
  });

  it("marks every English-screen link that opens a Korean page, and none on the Korean screen (2026-11-10)", () => {
    const toKorean = (a: HTMLAnchorElement) => {
      const href = a.getAttribute("href") ?? "";
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("https://doi.org/")) return false;
      if (href === "/" ) return false; // the language switch, marked by its own lang
      if (href.startsWith("https://eunchanjoe.vercel.app/en/")) return false;
      return href.startsWith("/") || href.startsWith("https://eunchanjoe.vercel.app");
    };
    const { container } = render(<EmotionApp locale="en" />);
    const korean = [...container.querySelectorAll("a")].filter(toKorean);
    expect(korean.length).toBeGreaterThanOrEqual(8);
    for (const a of korean) {
      expect(a.getAttribute("hreflang"), a.outerHTML).toBe("ko");
      // the word list link says "(in Korean)" in its own words
      if (a.getAttribute("href") === "/words") expect(a.textContent).toContain("(in Korean)");
      else expect(a.querySelector(".ko-mark"), a.outerHTML).not.toBeNull();
    }
    cleanup();
    render(<Home />);
    expect(document.querySelector(".ko-mark")).toBeNull();
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
