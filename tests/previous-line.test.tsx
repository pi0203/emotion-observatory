import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";
import { getStorageKeys } from "../lib/storage";
import { previousRecord } from "../lib/records";
import type { EmotionSession } from "../lib/session-types";

/**
 * 「지난번 (11/03): …」 (third round, 2026-11-05): under body, names, what
 * mattered and the direction needed, only when the record just before had the
 * same line. Side by side, never compared.
 */
const at = (day: number) => new Date(2026, 10, day, 12, 0).toISOString();
const deep = (id: string, day: number, parts: { body?: string[]; concerns?: string[]; word?: string; need?: string }): EmotionSession => ({
  id, createdAt: at(day), completedAt: at(day), status: "completed", stage: "summary", entry: "quick", locale: "ko",
  quickCheck: { affect: { valence: 0.4, activation: 0.6 }, candidatePool: [], selected: [] },
  deepReflection: {
    startedAt: at(day),
    body: parts.body?.map((label) => ({ label })),
    concerns: parts.concerns,
    emotionCandidates: parts.word ? [{ label: parts.word, source: "suggested" }] : undefined,
    outcome: { clarity: "clearer", usefulness: "helpful" },
  },
  support: parts.need ? { chosen: [], need: parts.need } : undefined,
});

const openDetail = (records: EmotionSession[], id: string) => {
  window.localStorage.setItem(getStorageKeys().COMPLETED_KEY, JSON.stringify(records));
  render(<Home />);
  fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
  fireEvent.click(document.getElementById(`record-${id}`)!);
  return [...document.querySelectorAll(".previous-line")].map((line) => line.textContent);
};

describe("previousRecord", () => {
  it("is the one just before in time, whatever the stored order", () => {
    const a = deep("a", 1, {}), b = deep("b", 3, {}), c = deep("c", 5, {});
    expect(previousRecord(c, [a, c, b])?.id).toBe("b");
    expect(previousRecord(a, [a, c, b])).toBeUndefined();
  });
});

describe("in the record detail", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("puts the line before's value under each of the four lines, with its date", () => {
    const before = deep("before", 3, { body: ["어깨가 뭉침"], concerns: ["존중받고 싶었다"], word: "억울함", need: "pace" });
    const now = deep("now", 5, { body: ["숨이 얕음"], concerns: ["쉬고 싶었다"], word: "서운함", need: "sort-thoughts" });
    const lines = openDetail([now, before], "now");
    expect(lines).toEqual(["지난번 (11/03): 어깨가 뭉침", "지난번 (11/03): 존중받고 싶었다", "지난번 (11/03): 몸과 마음의 속도를 조금 조절하기", "지난번 (11/03): 억울함"]);
    expect(document.querySelector(".names-layer .previous-line")!.textContent).toBe("지난번 (11/03): 억울함");
  });

  it("says nothing for the first record", () => {
    const first = deep("first", 3, { body: ["어깨가 뭉침"] });
    const later = deep("later", 5, { body: ["숨이 얕음"] });
    expect(openDetail([later, first], "first")).toEqual([]);
  });

  it("says nothing where the record just before has no such line, and does not look further back", () => {
    const old = deep("old", 1, { body: ["배가 아픔"] });
    const before = deep("before", 3, { concerns: ["존중받고 싶었다"] });
    const now = deep("now", 5, { body: ["숨이 얕음"], concerns: ["쉬고 싶었다"] });
    expect(openDetail([now, before, old], "now")).toEqual(["지난번 (11/03): 존중받고 싶었다"]);
  });

  it("says nothing where this record has no such line", () => {
    const before = deep("before", 3, { body: ["어깨가 뭉침"] });
    const now = deep("now", 5, { concerns: ["쉬고 싶었다"] });
    expect(openDetail([now, before], "now")).toEqual([]);
  });

  it("uses no comparing or reading word", () => {
    expect(ko.recordDetail.previous).toBe("지난번 ({date}): {value}");
    expect(en.recordDetail.previous).toBe("Last time ({date}): {value}");
    expect(ko.recordDetail.previous + en.recordDetail.previous).not.toMatch(/늘|줄|나아|좋아|나빠|more|less|better|worse/i);
  });
});
