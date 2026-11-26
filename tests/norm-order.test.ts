import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import emotions from "../data/emotions.ko.json";
import quickOrder from "../data/quick-order.ko.json";
import wordSources from "../data/word-sources.ko.json";
import nine from "./fixtures/quick-order-nine.json";
import enMain from "./fixtures/quick-candidates-en-main.json";
import { filterQuickCandidates } from "../lib/quick-check";

/**
 * The Korean candidate order follows the Korean emotion word studies by name and
 * rank only (docs/NORMS.md, 「2026-11-26 대조와 결정」; owner's decision
 * 「1 연구 순서로 · 2 연구 이름 한 줄」).
 */
const labels = (x: number, y: number, locale?: "ko" | "en") =>
  filterQuickCandidates({ x: x / 100, y: y / 100 }, 5, locale).map((item) => item.label);

/** The fixture lists the unpleasant words, then the pleasant ones; the screen alternates them (3 + 2 in the middle column). */
const asShown = (row: { x: number; after: string[] }) =>
  row.x === 50 ? [row.after[0], row.after[3], row.after[1], row.after[4], row.after[2]] : row.after;

describe("the Korean study order (2026-11-26)", () => {
  it.each(nine.rows)("$tap gives the first five worked out beforehand", (row) => {
    expect(labels(row.x, row.y)).toEqual(asShown(row));
  });

  it("never shows one word twice, at the nine taps and at 200 other spots", () => {
    let seed = 20261126;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % 101;
    };
    const spots = [...nine.rows.map((row) => [row.x, row.y]), ...Array.from({ length: 200 }, () => [next(), next()])];
    for (const [x, y] of spots) {
      const shown = labels(x, y);
      expect(shown).toHaveLength(5);
      expect(new Set(shown).size).toBe(shown.length);
    }
  });

  it("moved exactly five words to another band", () => {
    const band = Object.fromEntries(emotions.items.map((item) => [item.label, item.activation]));
    expect({ 혐오: band["혐오"], 감탄: band["감탄"], 즐거움: band["즐거움"], 후회: band["후회"], 감사: band["감사"] })
      .toEqual({ 혐오: "high", 감탄: "high", 즐거움: "high", 후회: "medium", 감사: "low" });
  });

  it("lists every word once, in its own band, by name only", () => {
    const listed = Object.entries(quickOrder.order).flatMap(([activation, names]) => names.map((name) => ({ name, activation })));
    expect(listed.map((entry) => entry.name).sort()).toEqual(emotions.items.map((item) => item.label).sort());
    for (const entry of listed) expect(emotions.items.find((item) => item.label === entry.name)!.activation).toBe(entry.activation);
    expect(quickOrder.leanSide).toEqual({ 감동: "positive" });
  });

  it("leaves English as it was on main", () => {
    expect(enMain.rows).toHaveLength(441);
    for (const row of enMain.rows) expect(labels(row.x, row.y, "en")).toEqual(row.labels);
  });
});

describe("no study value in what this change wrote", () => {
  const decimal = /\d+\.\d+/;
  const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

  it.each(["data/quick-order.ko.json", "data/word-sources.ko.json", "data/emotions.ko.json", "lib/words.ts", "lib/i18n/messages.ko.ts"])("%s has no decimal number", (file) => {
    expect(read(file)).not.toMatch(decimal);
  });

  it("the NORMS section and the PROJECT_CONTEXT line of 2026-11-26 have no decimal number", () => {
    const norms = read("docs/NORMS.md");
    const section = norms.slice(norms.indexOf("## 2026-11-26 대조와 결정"));
    expect(section.length).toBeGreaterThan(100);
    expect(section).not.toMatch(decimal);
    const line = read("PROJECT_CONTEXT.md").split("\n").find((text) => text.startsWith("- 2026-11-26: 낱말 73개"));
    expect(line).toBeDefined();
    expect(line).not.toMatch(decimal);
  });

  it("the source file carries one line for each of the 73 words and nothing but kind and text", () => {
    const entries = Object.entries(wordSources.words);
    expect(entries.map(([label]) => label).sort()).toEqual(emotions.items.map((item) => item.label).sort());
    for (const [, value] of entries) expect(Object.keys(value).sort()).toEqual(["kind", "text"]);
  });
});
