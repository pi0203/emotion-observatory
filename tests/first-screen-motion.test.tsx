import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import Home from "../app/(ko)/page";
import { FIRST_OPEN_INIT, introPhrases, resetFirstOpen } from "../app/first-open";
import { PLUM_DARK_ART, PLUM_DARK_BOX, PLUM_LIGHT_ART, PLUM_LIGHT_BOX } from "../app/plum-art";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";

/** First-open motions on the landing (2026-11-16, owner's decision 「셋 다」): the intro sentence and the plum blossom. */
describe("first screen motion", () => {
  beforeEach(() => { window.localStorage.clear(); resetFirstOpen(); });
  afterEach(cleanup);

  it("splits the intro into three phrases in both languages, and they join back into the sentence", () => {
    expect(introPhrases(ko.landing.title)).toEqual(["이름 붙이기 전에,", "지금 느껴지는 것을", "그대로 남겨 둡니다."]);
    expect(introPhrases(en.landing.title)).toEqual(["Before you name it,", "keep what you feel", "just as it is."]);
    for (const text of [ko.landing.title, en.landing.title]) expect(introPhrases(text).join(" ")).toBe(text);
    expect(introPhrases("한 구절")).toEqual(["한 구절"]);
  });

  it("the first open shows the phrases and the opening petals; the sentence reads whole", () => {
    render(<Home />);
    const title = document.querySelector(".hero-title") as HTMLElement;
    expect(title.querySelectorAll(".intro-phrase")).toHaveLength(3);
    expect(title.textContent).toBe(ko.landing.title);
    expect(title.getAttribute("aria-hidden")).toBeNull();
    expect(title.querySelector("[aria-hidden]")).toBeNull();
    const petals = document.querySelectorAll(".site-logo-mark.plum-bloom .plum-petal");
    expect(petals.length).toBe(10); // five in each of the light and dark drawings
    expect(document.querySelector(".site-logo-mark.plum-bloom")!.getAttribute("aria-hidden")).toBe("true");
  });

  it("the second time the landing is shown in a visit nothing moves", () => {
    render(<Home />);
    cleanup();
    render(<Home />);
    expect(document.querySelectorAll(".intro-phrase")).toHaveLength(0);
    expect(document.querySelectorAll(".plum-petal")).toHaveLength(0);
    expect(document.querySelector(".hero-title")!.textContent).toBe(ko.landing.title);
    // the mark is the same drawing, still and inline: no image file is fetched (2026-11-20)
    expect(document.querySelector(".site-logo-mark img")).toBeNull();
    expect(document.querySelector(".site-logo-mark.plum-bloom")).toBeNull();
    for (const name of ["light", "dark"]) {
      const file = readFileSync(`public/logo/plum-header-${name}.svg`, "utf8").trim();
      const drawn = document.querySelector(`.site-logo-mark svg.plum-${name}`)!;
      const original = document.createElement("div");
      original.innerHTML = file;
      expect(drawn.getAttribute("viewBox")).toBe(original.querySelector("svg")!.getAttribute("viewBox"));
      expect(drawn.innerHTML).toBe(original.querySelector("svg")!.innerHTML);
    }
    expect(document.querySelector(".site-logo-mark")!.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.common.appName);
  });

  it("a page load reached from this site counts as the same visit; one from elsewhere does not", () => {
    const run = (referrer: string) => {
      document.documentElement.removeAttribute("data-first-open-done");
      Object.defineProperty(document, "referrer", { value: referrer, configurable: true });
      new Function(FIRST_OPEN_INIT)();
      return document.documentElement.hasAttribute("data-first-open-done");
    };
    expect(run(`${location.origin}/`)).toBe(true);
    expect(run("")).toBe(false);
    expect(run("https://eunchanjoe.vercel.app/")).toBe(false);
    expect(run("not a url")).toBe(false);
    document.documentElement.removeAttribute("data-first-open-done");
  });

  it("a reload is a new visit even when the page before it was on this site", () => {
    const original = performance.getEntriesByType;
    const run = (referrer: string, type?: string) => {
      document.documentElement.removeAttribute("data-first-open-done");
      Object.defineProperty(document, "referrer", { value: referrer, configurable: true });
      performance.getEntriesByType = ((kind: string) => kind === "navigation" && type ? [{ type }] : []) as unknown as typeof performance.getEntriesByType;
      new Function(FIRST_OPEN_INIT)();
      return document.documentElement.hasAttribute("data-first-open-done");
    };
    try {
      // back on the landing through 「처음으로 돌아가기」, then reloaded: the referrer is still this site
      expect(run(`${location.origin}/`, "reload")).toBe(false);
      // the plain ways back (a link, 「←」, the language links) stay the same visit
      expect(run(`${location.origin}/`, "navigate")).toBe(true);
      expect(run(`${location.origin}/`, "back_forward")).toBe(true);
      expect(run(`${location.origin}/`)).toBe(true);
      expect(run("", "reload")).toBe(false);
    } finally {
      performance.getEntriesByType = original;
      document.documentElement.removeAttribute("data-first-open-done");
    }
  });

  it("the title, the nickname, the lede and the buttons are not animated", () => {
    render(<Home />);
    const moving = [...document.querySelectorAll(".intro-phrase, .plum-petal")];
    for (const selector of [".hero-name", ".hero-alias", ".lede", ".start-button", ".records-link"]) {
      const element = document.querySelector(selector) as HTMLElement;
      expect(element).toBeTruthy();
      expect(moving.some((item) => item === element || element.contains(item))).toBe(false);
    }
  });

  it("the inline drawings are the logo files with each petal wrapped, nothing else changed", () => {
    const unwrap = (art: string) => art.replace(/<g class="plum-petal" style="--i:\d">(<g transform="[^"]+">.*?<\/g>)<\/g>/g, "$1");
    for (const [name, art, box] of [["light", PLUM_LIGHT_ART, PLUM_LIGHT_BOX], ["dark", PLUM_DARK_ART, PLUM_DARK_BOX]] as const) {
      const file = readFileSync(`public/logo/plum-header-${name}.svg`, "utf8").trim();
      expect(file).toBe(`<svg viewBox="${box}" xmlns="http://www.w3.org/2000/svg">${unwrap(art)}</svg>`);
    }
  });

  it("the motion stays within 1.5 s, has no overshoot, and is off with reduced motion", () => {
    const css = readFileSync("app/globals.css", "utf8");
    expect(css).toMatch(/\.intro-phrase \{[^}]*animation: intro-sharpen \.55s cubic-bezier\(\.22, \.61, \.36, 1\) backwards; animation-delay: calc\(var\(--i\) \* \.45s\)/);
    expect(css).toMatch(/@keyframes intro-sharpen \{ from \{ filter: blur\(6px\)/);
    expect(css).toMatch(/\.plum-petal \{[^}]*animation: plum-open \.9s cubic-bezier\(\.22, \.61, \.36, 1\) backwards; animation-delay: calc\(var\(--i\) \* \.11s\)/);
    // last phrase ends at 2 * .45 + .55 = 1.45 s, last petal at 4 * .11 + .9 = 1.34 s
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{ \.intro-phrase, \.plum-petal \{ animation: none; \} \}/);
    expect(css).toMatch(/html\[data-first-open-done\] \.intro-phrase, html\[data-first-open-done\] \.plum-petal \{ animation: none; \}/);
    expect(css).not.toMatch(/infinite/);
  });

  it("the exception is written in both rule documents", () => {
    for (const file of ["docs/design.md", "CONTRIBUTING.md"]) expect(readFileSync(file, "utf8")).toMatch(/첫 화면 소개글과 로고는 처음 열 때 한 번, 1\.5초 안/);
  });
});
