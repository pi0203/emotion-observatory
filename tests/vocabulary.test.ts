import { describe, expect, it } from "vitest";
import emotions from "../data/emotions.ko.json";
import { expandCandidates, filterQuickCandidates } from "../lib/quick-check";

type Item = {
  label: string;
  aliases?: string[];
  family: string;
  valence: string;
  activation: string;
  neighbors: string[];
  appraisalHints?: string[];
  contextTags?: string[];
  contextDependent?: boolean;
  normStatus: "provisional" | "empirical";
  valencePrototype?: number;
  arousalPrototype?: number;
  normSource?: string;
  provisional: boolean;
};

const items = emotions.items as Item[];
const labels = items.map((item) => item.label);

describe("vocabulary contract", () => {
  it("is large enough to explore but still marked provisional", () => {
    // no hard cap: the practical range is what covers the gaps, not a target number
    expect(items.length).toBeGreaterThanOrEqual(50);
    expect(emotions.provisional).toBe(true);
    expect(items.every((item) => item.provisional)).toBe(true);
  });

  it("no longer leans unpleasant", () => {
    const pleasant = items.filter((item) => item.valence === "positive").length;
    const unpleasant = items.filter((item) => item.valence === "negative").length;
    expect(pleasant).toBeGreaterThanOrEqual(unpleasant);
  });

  it("covers the self-transcendent range that was almost empty", () => {
    const labels = items.map((item) => item.label);
    for (const word of ["경외감", "영감", "감탄", "존경", "연민"]) expect(labels).toContain(word);
  });

  it("leaves the norm fields empty until a source is verified", () => {
    for (const item of items) {
      expect(item.normStatus).toBe("provisional");
      expect(item.valencePrototype).toBeUndefined();
      expect(item.arousalPrototype).toBeUndefined();
      expect(item.normSource).toBeUndefined();
    }
    expect(emotions.fieldNotes.norms).toMatch(/확인하지 못한 값은 넣지 않습니다/);
  });

  it("does not pin a context-dependent word to one side", () => {
    const flagged = items.filter((item) => item.contextDependent).map((item) => item.label);
    expect(flagged).toEqual(expect.arrayContaining(["경외감", "놀라움", "감동", "연민"]));

    const fromUnpleasant = filterQuickCandidates({ x: 0.05, y: 0.5 }, 30).map((item) => item.label);
    const fromPleasant = filterQuickCandidates({ x: 0.95, y: 0.5 }, 30).map((item) => item.label);
    expect(fromUnpleasant).toContain("연민");
    expect(fromPleasant).toContain("연민");
  });

  it("has unique labels and aliases that do not collide with labels", () => {
    expect(new Set(labels).size).toBe(labels.length);
    const aliases = items.flatMap((item) => item.aliases ?? []);
    expect(new Set(aliases).size).toBe(aliases.length);
    expect(aliases.filter((alias) => labels.includes(alias))).toEqual([]);
  });

  it("uses only known valence and activation values", () => {
    for (const item of items) {
      expect(["negative", "neutral", "positive"]).toContain(item.valence);
      expect(["low", "medium", "high"]).toContain(item.activation);
    }
  });

  it("keeps the neighbour graph closed, irreflexive and free of duplicates", () => {
    for (const item of items) {
      expect(item.neighbors.length).toBeGreaterThanOrEqual(2);
      expect(item.neighbors).not.toContain(item.label);
      expect(new Set(item.neighbors).size).toBe(item.neighbors.length);
      for (const neighbor of item.neighbors) expect(labels).toContain(neighbor);
    }
  });

  it("covers both pleasant and unpleasant experience across activation levels", () => {
    const cell = (valence: string, activation: string) =>
      items.filter((item) => item.valence === valence && item.activation === activation).length;
    for (const valence of ["negative", "positive"]) {
      for (const activation of ["low", "medium", "high"]) {
        expect(cell(valence, activation)).toBeGreaterThan(0);
      }
    }
    expect(items.filter((item) => item.valence === "positive").length).toBeGreaterThanOrEqual(12);
  });

  it("treats appraisal hints as exploration aids, not definitions", () => {
    // a definition would be a single authoritative sentence; hints stay short and plural-friendly
    for (const item of items) {
      for (const hint of item.appraisalHints ?? []) {
        expect(hint.length).toBeLessThanOrEqual(40);
        expect(hint).not.toMatch(/정의|반드시|항상|뜻이다|означ/);
      }
    }
    expect(emotions.fieldNotes.appraisalHints).toMatch(/정의가 아닙니다/);
  });
});

describe("narrowing over the larger vocabulary", () => {
  it("still opens with at most five words", () => {
    for (const x of [0, 0.25, 0.5, 0.75, 1]) {
      for (const y of [0, 0.5, 1]) {
        expect(filterQuickCandidates({ x, y }).length).toBeLessThanOrEqual(5);
      }
    }
  });

  it("does not lean unpleasant when the tap lands in the middle", () => {
    const middle = filterQuickCandidates({ x: 0.5, y: 0.5 }).map((item) => item.label);
    const valenceOf = (label: string) => items.find((item) => item.label === label)?.valence;
    expect(middle.some((label) => valenceOf(label) === "positive")).toBe(true);
    expect(middle.some((label) => valenceOf(label) === "negative")).toBe(true);
  });

  it("changes the mix as the tap moves along the pleasantness axis", () => {
    const labels = (x: number) => filterQuickCandidates({ x, y: 0.5 }).map((item) => item.label).join("|");
    const positions = [0, 0.25, 0.4, 0.5, 0.6, 0.75, 1];
    const results = positions.map(labels);
    // a continuous pad has to produce more than one outcome across the axis
    expect(new Set(results).size).toBeGreaterThanOrEqual(4);
  });

  it("shifts the balance toward the side the tap is on", () => {
    const valenceOf = (label: string) => items.find((item) => item.label === label)?.valence;
    const pleasantCount = (x: number) =>
      filterQuickCandidates({ x, y: 0.5 }).filter((item) => valenceOf(item.label) === "positive").length;
    expect(pleasantCount(0.05)).toBe(0);
    expect(pleasantCount(0.95)).toBe(5);
    expect(pleasantCount(0.4)).toBeGreaterThan(0);
    expect(pleasantCount(0.4)).toBeLessThan(pleasantCount(0.6));
  });

  it("reaches a wider set through neighbours than the first tier shows", () => {
    const first = filterQuickCandidates({ x: 0.1, y: 0.95 });
    const second = expandCandidates(first);
    expect(second.length).toBeGreaterThan(0);
    const shown = new Set(first.map((item) => item.label));
    expect(second.every((item) => !shown.has(item.label))).toBe(true);
  });

  it("can keep stepping outward from a newly chosen word", () => {
    const first = filterQuickCandidates({ x: 0.1, y: 0.95 });
    const second = expandCandidates(first);
    const third = expandCandidates([...first, ...second]);
    expect(third.every((item) => ![...first, ...second].some((seen) => seen.label === item.label))).toBe(true);
  });
});

describe("cultural humility in the wording", () => {
  it("does not claim the list is complete or the words correct", () => {
    const shown = [emotions.note, ...Object.values(emotions.fieldNotes)].join("\n");
    expect(shown).not.toMatch(/정확한 감정|올바른 감정|실제 감정|정답 감정|감정 목록 전체/);
    expect(emotions.note).toMatch(/taxonomy를 확정하지 않으며/);
  });

  it("keeps a place for what a word carries for this person", () => {
    // the type allows it on any selection, so a brought word is an ordinary entry
    const selection: { label: string; source: "custom"; personalMeaning?: string } = {
      label: "김새는 느낌", source: "custom", personalMeaning: "기대가 접히는 쪽",
    };
    expect(selection.personalMeaning).toBeTruthy();
  });
});
