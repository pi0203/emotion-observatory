import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Words from "../app/(ko)/words/page";
import Home from "../app/(ko)/page";
import sitemap from "../app/sitemap";
import emotions from "../data/emotions.ko.json";
import { ko, koOnly } from "../lib/i18n/messages.ko";
import { WORDS_PATH, wordCards, wordId } from "../lib/words";
import { revealWords, startQuick } from "./helpers/start";

/** /words (2026-11-02, docs/FIELD_NOTES_2026-11-02.md): every word on one page, outside the recording flow. */
const items = emotions.items as { label: string; family: string; valence: string; activation: string; normStatus: string; contextTags: string[] }[];
const list = () => document.querySelector(".words-list") as HTMLElement;
const cards = () => [...list().querySelectorAll(":scope > li.word-card")] as HTMLElement[];

describe("/words", () => {
  afterEach(cleanup);

  it("draws one card per word, as many as the data has, and says that number", () => {
    render(<Words />);
    expect(cards()).toHaveLength(items.length);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(koOnly.words.title);
    expect(document.querySelector(".terms-intro")!.textContent).toContain(`단어 ${items.length}개를`);
  });

  it("puts the words in 가나다 order", () => {
    render(<Words />);
    const labels = cards().map((card) => card.querySelector("h2")!.textContent!);
    expect(labels).toEqual([...items.map((item) => item.label)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  });

  it("shows none of the hidden values: family, valence, activation, norm status, context tags, numbers", () => {
    render(<Words />);
    const text = list().textContent!;
    const hidden = new Set(items.flatMap((item) => [item.family, item.valence, item.activation, item.normStatus]));
    for (const value of hidden) expect(text).not.toContain(value);
    // a context tag may also be an ordinary word in a hint; only tags that no drawn field uses must be absent
    const drawn = JSON.stringify(wordCards(emotions.items));
    for (const tag of new Set(items.flatMap((item) => item.contextTags))) if (!drawn.includes(tag)) expect(text).not.toContain(tag);
    expect(text).not.toMatch(/\d|%/);
    expect(list().innerHTML).not.toMatch(/style=/);
  });

  it("links every word to compare to a card on this page", () => {
    render(<Words />);
    const links = [...list().querySelectorAll(".word-neighbors a")] as HTMLAnchorElement[];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      const href = link.getAttribute("href")!;
      expect(href).toBe(`#${wordId(link.textContent!)}`);
      expect(document.getElementById(href.slice(1))?.classList.contains("word-card")).toBe(true);
    }
  });

  it("keeps the crisis card and has a print button", () => {
    render(<Words />);
    expect(document.querySelector(".crisis-card")).not.toBeNull();
    expect(screen.getByRole("button", { name: koOnly.words.print })).toBeTruthy();
  });

  it("is in the sitemap", () => {
    expect(sitemap().some((page) => page.url.endsWith(WORDS_PATH))).toBe(true);
  });
});

describe("the way in to /words", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);
  const wordsLinks = () => document.querySelectorAll(`a[href="${WORDS_PATH}"]`);

  it("is one link on the landing, right under 상담·수련 현장에서 보시는 분께", () => {
    render(<Home />);
    expect(wordsLinks()).toHaveLength(1);
    const link = wordsLinks()[0];
    expect(link.textContent).toBe(koOnly.practitioner.wordsLink);
    expect(link.parentElement!.previousElementSibling!.querySelector("summary")!.textContent).toBe(koOnly.practitioner.summary);
  });

  it("is nowhere in the recording flow", () => {
    render(<Home />);
    startQuick(); // the quick look's first step
    expect(wordsLinks()).toHaveLength(0);
    fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) })); // its word step
    expect(wordsLinks()).toHaveLength(0);
    revealWords();
    expect(wordsLinks()).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: ko.quickCandidates.deep })); // the slower look
    expect(wordsLinks()).toHaveLength(0);
    // in the code, too: the path is used once, by the landing's 이 도구에 대하여
    const source = readFileSync(join(process.cwd(), "app/emotion-app.tsx"), "utf8");
    expect(source.match(/href=\{WORDS_PATH\}/g)).toHaveLength(1);
    expect(source.slice(source.indexOf("function AboutTool"), source.indexOf("href={WORDS_PATH}")).includes("\nfunction ")).toBe(false);
  });
});
