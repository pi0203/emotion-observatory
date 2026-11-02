import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import Terms, { metadata } from "../app/(ko)/terms/page";
import Home from "../app/(ko)/page";
import EmotionApp from "../app/emotion-app";
import sitemap from "../app/sitemap";
import terms from "../data/terms.ko.json";
import { ko, koOnly } from "../lib/i18n/messages.ko";
import { SITE_URL } from "../lib/site";
import { CONTACTS_CHECKED_ON, parseTerms, TERMS_EFFECTIVE, TERMS_MAIL, TERMS_PATH } from "../lib/terms";

/**
 * The terms of use at /terms (docs/TERMS.md). The table 「약속 대조표」 there
 * says what keeps each promise; this file holds the ones that tie the text to
 * the rest of the app: the helplines, the dates, the sitemap and the links.
 */
const article = (id: string) => document.getElementById(id)!;
const links = (root: Element) => [...root.querySelectorAll("a")].map((a) => [a.textContent, a.getAttribute("href")]);

describe("the terms page", () => {
  afterEach(cleanup);

  it("has the eleven articles, then 알려 주세요 and 바뀐 내용, each with an id to link to", () => {
    render(<Terms />);
    const sections = [...document.querySelectorAll("article.terms > section")];
    expect(sections.map((section) => section.id)).toEqual([...Array.from({ length: 11 }, (_, index) => `article-${index + 1}`), "contact", "changes"]);
    const titles = screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
    expect(titles.slice(0, 11).every((title, index) => title!.startsWith(`제${index + 1}조 (`))).toBe(true);
    expect(titles.slice(11)).toEqual(["알려 주세요", "바뀐 내용"]);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(terms.title);
  });

  it("starts with the way back to the first screen, in the landing's frame", () => {
    render(<Terms />);
    const main = screen.getByRole("main");
    const back = main.querySelector("a")!;
    expect(back.getAttribute("href")).toBe("/");
    expect(back.textContent).toContain(ko.common.backToStart);
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(within(screen.getByRole("contentinfo")).getByRole("link", { name: koOnly.termsLink }).getAttribute("href")).toBe(TERMS_PATH);
  });

  it("is titled and addressed as its own page", () => {
    expect(metadata.title).toBe(`${terms.title} · ${ko.meta.title}`);
    expect(metadata.title).toBe("이용약관 · 감정 관찰실");
    expect(metadata.alternates).toEqual({ canonical: "/terms" });
    expect(metadata.openGraph).toMatchObject({ url: "/terms", title: metadata.title });
  });

  it("is in the sitemap", () => {
    expect(sitemap().map((page) => page.url)).toContain(`${SITE_URL}/terms`);
  });
});

describe("the helplines in 제8조", () => {
  afterEach(cleanup);

  it("are never written into the terms text, only named there", () => {
    // what is left once the {num119}-style names are taken out
    const text = readFileSync("data/terms.ko.json", "utf8").replace(/\{num\d+\}/g, "");
    for (const number of ["119", "112", "109", "1577", "1388"]) expect(text, number).not.toContain(number);
    expect(JSON.stringify(terms)).toMatch(/\{num119\}.*\{num112\}.*\{num109\}.*\{num1577\}.*\{num1388\}/);
  });

  it("dial the very numbers the crisis card shows, from the card's own messages", () => {
    render(<Home />);
    const card = screen.getAllByRole("complementary", { name: ko.crisis.title })[0];
    const emergency = [...card.querySelector(".crisis-emergency")!.querySelectorAll("strong")].map((strong) => strong.textContent);
    const counselling = links(card);
    cleanup();
    render(<Terms />);
    const dialled = links(article("article-8"));
    expect(dialled.slice(0, 2).map(([number]) => number)).toEqual(emergency);
    expect(dialled.slice(0, 2)).toEqual([[ko.crisis.num119, ko.crisis.href119], [ko.crisis.num112, ko.crisis.href112]]);
    expect(dialled.slice(2).map(([, href]) => href)).toEqual(counselling.map(([, href]) => href));
    expect(dialled.slice(2).map(([number]) => number)).toEqual([ko.crisis.num109, ko.crisis.num1577, ko.crisis.num1388]);
  });

  it("are each kept on one line, like the crisis card's numbers", () => {
    render(<Terms />);
    const numbers = [...document.querySelectorAll("article.terms a[href^='tel:']")];
    expect(numbers.map((a) => a.textContent)).toEqual([ko.crisis.num119, ko.crisis.num112, ko.crisis.num109, ko.crisis.num1577, ko.crisis.num1388]);
    for (const a of numbers) expect(a.classList.contains("terms-tel"), a.textContent!).toBe(true);
    expect(readFileSync("app/globals.css", "utf8")).toMatch(/\.terms-tel \{[^}]*text-wrap: nowrap;[^}]*\}/);
  });

  it("keep the card's names and hours beside each number", () => {
    render(<Terms />);
    const text = article("article-8").textContent!;
    // 119 and 112 exactly as the card's first line puts them: <b>119</b>(구급) 또는 <b>112</b>(경찰)
    const [, num119, what119, num112, what112] = ko.crisis.emergency.match(/<b>(\d+)<\/b>(\([^)]+\)) 또는 <b>(\d+)<\/b>(\([^)]+\))/)!;
    expect([num119, num112]).toEqual([ko.crisis.num119, ko.crisis.num112]);
    expect(text).toContain(`${num119}${what119} 또는 ${num112}${what112}`);
    // 「자살예방상담전화 (24시간)」 on the card reads 「109(자살예방상담전화, 24시간)」 here
    for (const [label, number] of [[ko.crisis.lifeline109, ko.crisis.num109], [ko.crisis.mental1577, ko.crisis.num1577], [ko.crisis.youth1388, ko.crisis.num1388]]) {
      const [, name, detail] = label.match(/^(.+) \((.+)\)$/)!;
      expect(text, label).toContain(`${number}(${name}, ${detail})`);
    }
  });

  it("carry the latest check in SAFETY.md 「연락처 확인 기록」 as their checked date", () => {
    const safety = readFileSync("SAFETY.md", "utf8");
    const log = safety.split("### 연락처 확인 기록")[1].split(/\n#{2,3} /)[0];
    const rows = log.split("\n").filter((line) => /^\| (109|1577-0199|1388|119|112) \|/.test(line));
    expect(rows).toHaveLength(5);
    // the 확인일 column, the fifth
    const checked = rows.flatMap((row) => row.split("|")[5].match(/\d{4}-\d{2}-\d{2}/g) ?? []);
    expect(checked.length).toBeGreaterThanOrEqual(5);
    expect(CONTACTS_CHECKED_ON).toBe(checked.sort().at(-1));
    render(<Terms />);
    expect(article("article-8").textContent).toContain(`${CONTACTS_CHECKED_ON}.`);
  });
});

describe("the dates of the terms (제11조)", () => {
  afterEach(cleanup);

  it("apply from the day on the first line of 바뀐 내용, newest first", () => {
    expect(TERMS_EFFECTIVE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(terms.changes[0].date).toBe(TERMS_EFFECTIVE);
    const dates = terms.changes.map((change) => change.date);
    expect(dates).toEqual([...dates].sort().reverse());
    render(<Terms />);
    expect(document.querySelector(".terms-intro")!.textContent!.startsWith(`${TERMS_EFFECTIVE}`)).toBe(true);
    expect(article("changes").querySelector("li")!.textContent!.startsWith(`${TERMS_EFFECTIVE}: `)).toBe(true);
  });
});

describe("the links to and from the terms", () => {
  afterEach(cleanup);

  it("ask for word by mail at the homepage's address, and link the homepage as the footer does", () => {
    render(<Terms />);
    const footerHome = within(screen.getByRole("contentinfo")).getAllByRole("link")[0].getAttribute("href");
    expect(links(article("contact")).map(([, href]) => href)).toEqual([TERMS_MAIL, footerHome]);
    expect(TERMS_MAIL).toBe("mailto:a5897@icloud.com");
  });

  it("send the Korean storage answer to 제6조, and the English one nowhere", () => {
    render(<Home />);
    expect(screen.getByRole("link", { name: koOnly.termsStorageLink }).getAttribute("href")).toBe(`${TERMS_PATH}#article-6`);
    cleanup();
    render(<Terms />);
    expect(article("article-6").querySelector("h2")!.textContent!.startsWith("제6조")).toBe(true);
    cleanup();
    render(<EmotionApp locale="en" />);
    expect([...document.querySelectorAll("a")].some((a) => a.getAttribute("href")?.startsWith(TERMS_PATH))).toBe(false);
  });
});

describe("reading the marks in data/terms.ko.json", () => {
  it("finds emphasis, dates, numbers and the two links, and leaves the rest as text", () => {
    expect(parseTerms("<b>먼저 {num119}(구급)</b> 확인: {checked}. [메일](mail) · [홈](home)")).toEqual([
      { kind: "bold", pieces: [{ kind: "text", text: "먼저 " }, { kind: "line", line: "119" }, { kind: "text", text: "(구급)" }] },
      { kind: "text", text: " 확인: " }, { kind: "date", which: "checked" }, { kind: "text", text: ". " },
      { kind: "link", to: "mail", text: "메일" }, { kind: "text", text: " · " }, { kind: "link", to: "home", text: "홈" },
    ]);
    expect(parseTerms("{num999} [x](elsewhere) <script>")).toEqual([{ kind: "text", text: "{num999} [x](elsewhere) <script>" }]);
  });
});
