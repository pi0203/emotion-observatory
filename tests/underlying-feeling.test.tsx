import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";
import { getStorageAdapter } from "../lib/storage-adapter";
import { createSession, sessionReducer, type EmotionSession } from "../lib/session-types";
import { buildExport, parseImport, serializeExport } from "../lib/record-transfer";
import { buildSynthesis } from "../lib/synthesis";
import { INPUT_LIMITS } from "../lib/limits";
import { startDeep, startQuick } from "./helpers/start";

/**
 * 「이 느낌 아래에 다른 느낌이 먼저 있었나요?」 on the slower look's summary
 * (owner's decision 2026-10-30, second round D). Kept and shown back only.
 */
const Q = ko.underlyingFeeling;
const toDeepSummary = () => {
  render(<Home />);
  startDeep();
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.entry.observe}`) }));
  for (let i = 0; i < 5; i++) fireEvent.click(screen.getAllByRole("button", { name: ko.common.skip })[0]);
  fireEvent.click(screen.getByRole("button", { name: ko.outcome.clarity.clearer }));
  fireEvent.click(screen.getByRole("button", { name: ko.outcome.usefulness.helpful }));
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));
};
const saved = () => getStorageAdapter().loadCompleted()[0];
const noteField = () => screen.queryByLabelText(new RegExp(`^${Q.noteLabel}`)) as HTMLInputElement | null;

describe("on the summary", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("sits right under the 사람에게 말해 볼 생각 question, in the same form, with nothing chosen", () => {
    toDeepSummary();
    const talk = screen.getByRole("heading", { level: 2, name: ko.talkToSomeone.question });
    const question = screen.getByRole("heading", { level: 2, name: Q.question });
    expect(talk.closest("section")!.nextElementSibling).toBe(question.closest("section"));
    expect(question.closest("section")!.className).toBe(talk.closest("section")!.className);
    for (const value of ["yes", "no", "unsure"] as const) expect(screen.getByRole("button", { name: Q.answers[value] })).toHaveAttribute("aria-pressed", "false");
    expect(noteField()).toBeNull();
  });

  it("keeps the answer and stays on the same screen, offering no words", () => {
    toDeepSummary();
    const chips = document.querySelectorAll(".chip").length;
    fireEvent.click(screen.getByRole("button", { name: Q.answers.unsure }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(ko.summary.title);
    expect(saved().underlyingFeeling?.answer).toBe("unsure");
    expect(document.querySelectorAll(".chip").length).toBe(chips);
    expect(screen.queryByRole("button", { name: ko.words.reveal })).toBeNull();
  });

  it("opens one optional line on 있었다, kept with the answer and not in the names layer", () => {
    toDeepSummary();
    fireEvent.click(screen.getByRole("button", { name: Q.answers.yes }));
    fireEvent.change(noteField()!, { target: { value: " 서운함이 먼저 " } });
    expect(saved().underlyingFeeling).toMatchObject({ answer: "yes", note: "서운함이 먼저" });
    expect(saved().labelsLater).toBeUndefined();
    fireEvent.click(screen.getByRole("button", { name: Q.answers.no }));
    expect(noteField()).toBeNull();
    expect(saved().underlyingFeeling?.note).toBeUndefined();
  });

  it("is shown back in the record, answer and line, each marked as the person's", () => {
    toDeepSummary();
    fireEvent.click(screen.getByRole("button", { name: Q.answers.yes }));
    fireEvent.change(noteField()!, { target: { value: "부끄러움" } });
    cleanup();
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    fireEvent.click(document.querySelector(".record-row")!);
    const rows = [...document.querySelectorAll(".summary-row")];
    const answer = rows.find((row) => row.textContent?.startsWith(Q.recordLabel))!;
    const line = rows.find((row) => row.textContent?.startsWith(Q.noteRecordLabel))!;
    expect(answer.textContent).toContain(Q.answers.yes);
    expect(answer.className).toContain("source-mine");
    expect(line.textContent).toContain("부끄러움");
    expect(line.textContent).toContain(ko.recordDetail.source.wrote);
    // not in the names layer
    expect(document.querySelector(".names-layer")!.textContent).not.toContain("부끄러움");
  });

  it("is not asked on the quick look", () => {
    render(<Home />);
    startQuick();
    fireEvent.click(screen.getByRole("button", { name: ko.quickAffect.unknown }));
    expect(screen.queryByText(Q.question)).toBeNull();
  });
});

describe("the reducer", () => {
  const deep = (): EmotionSession => ({ ...createSession("deep"), status: "completed", stage: "summary", deepReflection: { startedAt: "2026-10-30T00:00:00.000Z", body: [], concerns: [], emotionCandidates: [] } });

  it("is not a step, and writes nothing on a record without a slower look", () => {
    const before = deep();
    const after = sessionReducer(before, { type: "SET_UNDERLYING_FEELING", answer: "yes" });
    expect(after.stage).toBe("summary");
    expect(after.history).toEqual(before.history);
    const quickOnly = { ...createSession(), status: "completed" as const, stage: "quick-summary" as const };
    expect(sessionReducer(quickOnly, { type: "SET_UNDERLYING_FEELING", answer: "yes" })).toBe(quickOnly);
  });

  it("takes a line only after 있었다, trimmed and capped at INPUT_LIMITS.line", () => {
    expect(sessionReducer(deep(), { type: "SET_UNDERLYING_NOTE", note: "x" }).underlyingFeeling).toBeUndefined();
    const yes = sessionReducer(deep(), { type: "SET_UNDERLYING_FEELING", answer: "yes" });
    expect(sessionReducer(yes, { type: "SET_UNDERLYING_NOTE", note: "가".repeat(INPUT_LIMITS.line + 9) }).underlyingFeeling?.note).toHaveLength(INPUT_LIMITS.line);
  });

  it("stays out of the generated summary", () => {
    const session = sessionReducer(sessionReducer(deep(), { type: "SET_UNDERLYING_FEELING", answer: "yes" }), { type: "SET_UNDERLYING_NOTE", note: "숨은느낌" });
    expect(JSON.stringify(buildSynthesis(session, "ko"))).not.toContain("숨은느낌");
  });
});

describe("carrying it over", () => {
  const record = (extra: Record<string, unknown>): EmotionSession => ({
    id: "u1", createdAt: "2026-10-30T01:00:00.000Z", status: "completed", stage: "summary", entry: "deep",
    deepReflection: { startedAt: "2026-10-30T01:00:00.000Z", body: [], concerns: [], emotionCandidates: [] }, ...extra,
  } as EmotionSession);

  it("keeps it through export and import, and still opens a record without it", () => {
    const value = { answer: "yes", note: "먼저", at: "2026-10-30T01:02:00.000Z" };
    const parsed = parseImport(serializeExport(buildExport([record({ underlyingFeeling: value }), record({ id: "u2" })])));
    expect(parsed.ok && parsed.records.map((item) => item.underlyingFeeling)).toEqual([value, undefined]);
  });

  it("refuses an answer it does not know", () => {
    const parsed = parseImport(serializeExport(buildExport([record({ underlyingFeeling: { answer: "maybe", at: "2026-10-30T01:02:00.000Z" } })])));
    expect(parsed.ok && parsed.invalid).toBe(1);
  });
});

describe("English wording", () => {
  it("is written for English readers", () => {
    expect(en.underlyingFeeling.question).not.toBe(Q.question);
    expect(Object.keys(en.underlyingFeeling.answers)).toEqual(["yes", "no", "unsure"]);
  });
});
