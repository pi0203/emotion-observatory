import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import emotions from "../data/emotions.ko.json";
import { coachSets } from "../lib/coach";
import { createSession, sessionReducer } from "../lib/session-types";
import { persistSession } from "../lib/storage";

const openCoach = (word = coachSets[0].words[0]) => {
  let state = sessionReducer(createSession(), { type: "START_QUICK" });
  state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.2, activation: 0.9 } });
  state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: [{ label: word, source: "suggested" }] });
  persistSession(sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: word }));
  render(<Home />);
  fireEvent.click(screen.getByRole("button", { name: /지난 기록 이어하기/ }));
  fireEvent.click(screen.getByRole("button", { name: /표현 사이의 차이 살펴보기/ }));
};

const next = () => fireEvent.click(screen.getByRole("button", { name: /다음/ }));

/** Runs a check on each of the three coach screens in turn. */
const onEachCoachScreen = (check: (screenIndex: number) => void) => {
  for (let index = 0; index < 3; index += 1) {
    check(index);
    if (index < 2) next();
  }
};

describe("coach zones", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  // 1
  it.each(coachSets.map((set) => [set.id, set] as const))("labels the example as text in the DOM on all three screens (%s)", (_id, set) => {
    openCoach(set.words[0]);
    onEachCoachScreen(() => {
      const zone = document.querySelector(".zone-example")!;
      const label = zone.querySelector(".zone-label")!;
      // a real text node, so a screen reader reads it; not CSS `content`
      expect(label.textContent).toMatch(/예시/);
      expect(screen.getByRole("region", { name: label.textContent! })).toBe(zone);
    });
  });

  // 2
  it("gives the example and what the user picks different role classes", () => {
    openCoach();
    onEachCoachScreen((index) => {
      const example = document.querySelector(".zone-example")!;
      expect(example.classList.contains("zone-mine")).toBe(false);
      if (index < 2) {
        const mine = screen.getByRole("group", { name: "내 선택" });
        expect(mine.classList.contains("zone-mine")).toBe(true);
        expect(mine.classList.contains("zone-example")).toBe(false);
        // the choices live inside the user's own zone, not inside the example
        expect(mine.querySelector("button[aria-pressed]")).not.toBeNull();
        expect(example.querySelector("button, input")).toBeNull();
      } else {
        const note = screen.getByRole("complementary", { name: "참고 설명" });
        expect(note.classList.contains("zone-note")).toBe(true);
        expect(note.classList.contains("zone-example")).toBe(false);
      }
    });
  });

  // 3
  it("names nothing after an emotion or a feeling's colour, and sets no inline colour", () => {
    const vocabulary = (emotions.items as { label: string }[]).map((item) => item.label);
    const feelingWords = /anger|angry|joy|sad|fear|calm|happy|relief|content|annoy|frustrat|pleasant|unpleasant|positive|negative|valence|mood|emotion|red|green|blue|yellow|confidence|score/i;
    for (const set of coachSets) {
      cleanup();
      window.localStorage.clear();
      openCoach(set.words[0]);
      onEachCoachScreen(() => {
        const classes = new Set(Array.from(document.querySelectorAll(".screen [class]")).flatMap((node) => Array.from(node.classList)));
        for (const name of classes) {
          expect(name).not.toMatch(feelingWords);
          for (const word of vocabulary) expect(name).not.toContain(word);
        }
        for (const node of Array.from(document.querySelectorAll(".screen [style]"))) {
          expect(node.getAttribute("style")).not.toMatch(/color|background|border/i);
        }
      });
    }
  });
});

// 4
describe("text contrast inside the coach zones, computed from the tokens in globals.css", () => {
  const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8");
  const root = css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));
  const token = (name: string) => {
    const match = root.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
    if (!match) throw new Error(`no token --${name}`);
    return match[1];
  };
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255)
      .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (text: string, background: string) => {
    const [a, b] = [luminance(token(text)), luminance(token(background))].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
  };

  // every text-on-surface pair the zones use, with where it appears
  const pairs: [string, string, string][] = [
    ["ink", "warm", "예시 영역 본문 · 라벨 · 결과 행 이름"],
    ["ink", "card", "내 선택 영역의 선택지·칩 글자"],
    ["muted", "card", "내 선택 영역의 안내·입력 라벨·눈에 띈 것"],
    ["ink", "accent-soft", "고른 선택지·칩"],
    ["accent-ink", "accent-soft", "고른 항목의 ✓"],
    ["accent-ink", "card", "✓ (선택 직후 hover 해제 상태 포함)"],
    ["muted", "paper", "참고 설명 문단"],
  ];

  it.each(pairs)("%s on %s reaches 4.5:1 (%s)", (text, background) => {
    expect(ratio(text, background)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps --muted off --warm, because that pair falls short", () => {
    expect(ratio("muted", "warm")).toBeLessThan(4.5);
    const exampleRules = css.match(/\.zone-example[^{]*\{[^}]*\}/g) ?? [];
    expect(exampleRules.length).toBeGreaterThan(0);
    for (const rule of exampleRules) expect(rule).not.toContain("var(--muted)");
  });
});
