import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import emotions from "../data/emotions.ko.json";
import { ko } from "../lib/i18n/messages.ko";
import { summarise } from "../lib/records";
import { buildExport, parseImport, serializeExport } from "../lib/record-transfer";
import { createSession, sessionReducer, type EmotionSession } from "../lib/session-types";
import { getStorageKeys } from "../lib/storage";
import { buildSynthesis } from "../lib/synthesis";

/**
 * A word the vocabulary no longer offers under that name still belongs to the
 * records that chose it. 분개 became an alias of 분노 on 2026-10-31; a record
 * that says 분개 must keep saying 분개 everywhere it is shown, moved or read
 * back. The record holds the word as text, and nothing resolves it through
 * the vocabulary.
 */
const RETIRED = "분개";

const saved = (id: string): EmotionSession => ({
  id, createdAt: "2026-10-01T09:00:00.000Z", completedAt: "2026-10-01T09:04:00.000Z", status: "completed", stage: "quick-summary", entry: "quick", locale: "ko",
  quickCheck: { affect: { valence: 0.2, activation: 0.8 }, candidatePool: [{ label: RETIRED, source: "suggested" }], selected: [{ label: RETIRED, source: "suggested" }] },
});

const deepWith = (label: string): EmotionSession => {
  let state = sessionReducer(createSession(), { type: "START_QUICK" });
  state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.2, activation: 0.8 } });
  state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: [{ label, source: "suggested" }] });
  state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label });
  state = sessionReducer(state, { type: "COMPLETE_QUICK" });
  state = sessionReducer(state, { type: "ENTER_DEEP" });
  state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
  state = sessionReducer(state, { type: "SET_BODY", body: [{ label: "목·어깨가 긴장됨" }] });
  state = sessionReducer(state, { type: "SET_AFFECT", affect: { valence: 0.2, activation: 0.8 } });
  state = sessionReducer(state, { type: "SET_CONTEXT", context: { eventText: "회의에서 말을 못 했다", source: "event" } });
  state = sessionReducer(state, { type: "SET_CONCERNS", concerns: ["공정했으면 했다"] });
  state = sessionReducer(state, { type: "SET_EMOTIONS", emotionCandidates: [{ label, source: "suggested" }] });
  return sessionReducer(state, { type: "SET_OUTCOME", outcome: { clarity: "clearer", usefulness: "helpful" } });
};

describe("a record that chose a word the list has since renamed", () => {
  it("is the case for 분개: now an alias, no longer a label", () => {
    const labels = emotions.items.map((item) => item.label);
    expect(labels).not.toContain(RETIRED);
    expect(emotions.items.find((item) => item.label === "분노")?.aliases).toContain(RETIRED);
  });

  it("keeps the word in the past-records summary", () => {
    expect(summarise(saved("a")).words).toEqual([RETIRED]);
    expect(summarise(deepWith(RETIRED)).words).toEqual([RETIRED]);
  });

  it("still builds the summary's synthesis, without a family or tags for the word", () => {
    const synthesis = buildSynthesis(deepWith(RETIRED));
    expect(synthesis.observed.length + synthesis.meaning.length + synthesis.unknown.length).toBeGreaterThan(0);
    // what was chosen is repeated as text, exactly as written then
    expect(JSON.stringify(synthesis)).toContain(RETIRED);
  });

  it("survives export and import as the same text", () => {
    const text = serializeExport(buildExport([saved("a"), deepWith(RETIRED)]));
    const parsed = parseImport(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.invalid).toBe(0);
    expect(parsed.records.map((record) => record.quickCheck?.selected?.[0]?.label)).toEqual([RETIRED, RETIRED]);
    expect(parsed.records[1].deepReflection?.emotionCandidates?.[0]?.label).toBe(RETIRED);
  });
});

describe("on the records screen", () => {
  beforeEach(() => { window.localStorage.clear(); window.localStorage.setItem(getStorageKeys().COMPLETED_KEY, JSON.stringify([saved("old"), { ...deepWith(RETIRED), id: "old-deep" }])); });
  afterEach(cleanup);

  it("lists the word and shows it again in the opened record", () => {
    render(<Home />);
    fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
    const rows = screen.getAllByText(RETIRED);
    expect(rows.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(rows[0].closest("button") as HTMLElement);
    expect(screen.getAllByText(new RegExp(RETIRED)).length).toBeGreaterThan(0);
  });
});
