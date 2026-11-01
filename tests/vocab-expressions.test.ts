// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import emotions from "../data/emotions.ko.json";
import emotionsEn from "../data/emotions.en.json";

/**
 * 「이렇게도 말해요」 (owner's decision 2026-11-01, (나)): expressions listed in
 * the Standard Korean Language Dictionary, shown under a picked word.
 * Only the expression and where it sits in the dictionary are kept, never a
 * definition or an example sentence (CC BY-SA 2.0 KR, docs/THIRD_PARTY.md §5).
 * Sources: docs/vocab-sources/EXPRESSIONS_2026_11_01.md.
 */
type Expression = { text: string; dict: string; kind: string; sense?: string; headword: string; wordNo: number };
type Item = { label: string; expressions?: Expression[] };

const ROOT = path.resolve(__dirname, "..");
const DOC = "docs/vocab-sources/EXPRESSIONS_2026_11_01.md";
const items = emotions.items as Item[];
const labels = items.map((item) => item.label);
const withExpressions = items.filter((item) => item.expressions);
const all = withExpressions.flatMap((item) => item.expressions!.map((expression) => ({ label: item.label, ...expression })));

/** The table in §3 of the evidence document: word → the expressions shown on screen. */
const tableOfDoc = (): Record<string, string[]> => {
  const lines = readFileSync(path.join(ROOT, DOC), "utf8").split("\n");
  const start = lines.findIndex((line) => line.startsWith("## 3."));
  const rows = lines.slice(start).filter((line) => line.startsWith("| ") && !line.startsWith("| 단어") && !line.startsWith("|---"));
  return Object.fromEntries(rows.map((row) => {
    const [label, shown] = row.split("|").slice(1, 3).map((cell) => cell.trim());
    return [label, shown.split(" · ")];
  }));
};

describe("dictionary expressions in the vocabulary", () => {
  it("adds 62 expressions to 34 words", () => {
    expect(withExpressions).toHaveLength(34);
    expect(all).toHaveLength(62);
  });

  it("gives every expression its text, dictionary form, kind, headword and word_no, and nothing else", () => {
    for (const expression of all) {
      for (const key of ["text", "dict", "kind", "headword"] as const) expect(typeof expression[key] === "string" && expression[key].length > 0, `${expression.label} ${key}`).toBe(true);
      expect(typeof expression.wordNo).toBe("number");
      if ("sense" in expression) expect(typeof expression.sense === "string" && expression.sense.length > 0).toBe(true);
      // no definition or example sentence travels with it
      expect(Object.keys(expression).filter((key) => key !== "label").every((key) => ["text", "dict", "kind", "sense", "headword", "wordNo"].includes(key)), expression.text).toBe(true);
    }
  });

  it("uses only 관용구, 용례 and 표제어 as kinds", () => {
    for (const expression of all) expect(["관용구", "용례", "표제어"]).toContain(expression.kind);
  });

  it("points at a dictionary entry with a positive whole word_no", () => {
    for (const expression of all) {
      expect(Number.isInteger(expression.wordNo), expression.text).toBe(true);
      expect(expression.wordNo).toBeGreaterThan(0);
    }
  });

  it("does not repeat an expression within one word", () => {
    for (const item of withExpressions) {
      const texts = item.expressions!.map((expression) => expression.text);
      expect(new Set(texts).size, item.label).toBe(texts.length);
    }
  });

  it("shares an expression between two words only where the evidence document means it", () => {
    const wordsOf = new Map<string, string[]>();
    for (const { label, text } of all) wordsOf.set(text, [...(wordsOf.get(text) ?? []), label]);
    const shared = Object.fromEntries([...wordsOf].filter(([, words]) => words.length > 1).map(([text, words]) => [text, [...words].sort()]));
    const sorted = (words: string[]) => [...words].sort();
    expect(shared).toEqual({ "가슴이 미어지다": sorted(["슬픔", "감동"]), "숨이 막히다": sorted(["답답함", "긴장"]), "어깨가 처지다": sorted(["실망", "좌절"]) });
  });

  it("is kept only on words that are in the vocabulary, the same words and expressions as the evidence document", () => {
    const table = tableOfDoc();
    for (const label of Object.keys(table)) expect(labels).toContain(label);
    expect(Object.fromEntries(withExpressions.map((item) => [item.label, item.expressions!.map((expression) => expression.text)]))).toEqual(table);
  });

  it("carries 속 터짐 as 답답함's expressions and 속 시원함 as 개운함's", () => {
    const textsOf = (label: string) => items.find((item) => item.label === label)?.expressions?.map((expression) => expression.text);
    expect(textsOf("답답함")).toEqual(expect.arrayContaining(["속이 터지다", "복장이 터지다"]));
    expect(textsOf("개운함")).toContain("속이 시원하다");
    expect(labels).not.toContain("속 터짐");
  });

  it("explains the field and points at the evidence document", () => {
    expect(emotions.fieldNotes.expressions).toBe("표준국어대사전에 실린 표현. 화면의 '이렇게도 말해요'에만 쓰고 기록에는 남기지 않는다. 출처와 위치: docs/vocab-sources/EXPRESSIONS_2026_11_01.md");
    expect(existsSync(path.join(ROOT, DOC))).toBe(true);
    expect(readFileSync(path.join(ROOT, "docs/THIRD_PARTY.md"), "utf8")).toMatch(/표준국어대사전\(국립국어원\)[\s\S]*CC BY-SA 2\.0 KR/);
  });

  it("leaves the English vocabulary without expressions, since it is not paired with the Korean", () => {
    expect((emotionsEn.items as Record<string, unknown>[]).some((item) => "expressions" in item)).toBe(false);
  });
});
