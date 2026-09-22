import { describe, expect, it } from "vitest";
import { filterQuickCandidates } from "../lib/quick-check";

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
