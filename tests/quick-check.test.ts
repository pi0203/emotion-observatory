import { describe, expect, it } from "vitest";
import { expandCandidates, filterQuickCandidates } from "../lib/quick-check";

describe("quick candidate narrowing", () => {
  it("returns a small provisional set without a confidence score", () => {
    const candidates = filterQuickCandidates({ x: 0.1, y: 0.95 });
    expect(candidates.length).toBeLessThanOrEqual(5);
    expect(candidates.every((item) => item.source === "suggested" && !("confidence" in item))).toBe(true);
    expect(candidates.map((item) => item.label)).toContain("긴장");
  });

  it("includes positive vocabulary for pleasant, activated states", () => {
    const labels = filterQuickCandidates({ x: 0.9, y: 0.9 }).map((item) => item.label);
    expect(labels.some((label) => ["활기", "즐거움", "흥미", "뿌듯함"].includes(label))).toBe(true);
  });
});

describe("second tier of candidates", () => {
  it("offers related words that are not already on screen", () => {
    const shown = [{ label: "짜증", source: "suggested" as const }];
    const labels = expandCandidates(shown).map((item) => item.label);
    expect(labels).toContain("억울함");
    expect(labels).not.toContain("짜증");
  });

  it("leaves out words the first tier already shows", () => {
    const shown = [
      { label: "짜증", source: "suggested" as const },
      { label: "억울함", source: "suggested" as const },
    ];
    expect(expandCandidates(shown).map((item) => item.label)).not.toContain("억울함");
  });

  it("returns no duplicates and respects the limit", () => {
    const shown = [
      { label: "서운함", source: "suggested" as const },
      { label: "실망", source: "suggested" as const },
    ];
    const labels = expandCandidates(shown, 2).map((item) => item.label);
    expect(labels).toHaveLength(2);
    expect(new Set(labels).size).toBe(2);
  });

  it("returns nothing for a word with no recorded relations", () => {
    expect(expandCandidates([{ label: "내가 적은 말", source: "custom" }])).toEqual([]);
  });
});
