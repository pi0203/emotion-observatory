import { describe, expect, it } from "vitest";
import { createSession, sessionReducer, understandRoute } from "../lib/session-types";
import { coachSetFor } from "../lib/coach";
import needs from "../data/needs.ko.json";
import type { EmotionSession } from "../lib/session-types";

const quick = (words: string[] = ["짜증"]): EmotionSession => {
  let state = sessionReducer(createSession(), { type: "START_QUICK" });
  state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.2, activation: 0.9 } });
  state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: words.map((label) => ({ label, source: "suggested" as const })) });
  for (const label of words) state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label });
  return sessionReducer(state, { type: "COMPLETE_QUICK" });
};

const deep = (words: string[] = ["억울함"]): EmotionSession => {
  let state = sessionReducer(quick(), { type: "ENTER_DEEP" });
  state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
  state = sessionReducer(state, { type: "SET_BODY", body: [{ label: "가슴이 답답함" }] });
  state = sessionReducer(state, { type: "SET_AFFECT", affect: { valence: 0.4, activation: 0.6 } });
  state = sessionReducer(state, { type: "SET_CONTEXT", context: { eventText: "요청이 무시됐다", source: "event" } });
  state = sessionReducer(state, { type: "SET_CONCERNS", concerns: ["공정했으면 했다"] });
  state = sessionReducer(state, { type: "SET_EMOTIONS", emotionCandidates: words.map((label) => ({ label, source: "suggested" as const })) });
  return sessionReducer(state, { type: "SET_OUTCOME", outcome: { clarity: "clearer", usefulness: "helpful" } });
};

describe("needs and responses", () => {
  it("offers a direction to try, never a verdict about what the user needs", () => {
    // only what the user actually reads; the file's own notes describe the rule itself
    const shown = needs.needs.flatMap((need) => [need.label, need.because ?? "", ...(need.responses ?? []).map((r) => r.label)]);
    for (const text of shown) {
      expect(text).not.toMatch(/당신에게 필요한 것은|당신의 진짜|해야 하므로|쌓이므로|하셔야|권장합니다/);
    }
    for (const need of needs.needs) {
      if (need.because) expect(need.because).toContain("고르셨기 때문에");
    }
  });

  it("keeps a way out inside every set of responses", () => {
    for (const need of needs.needs) {
      if (!need.responses) continue;
      expect(need.responses.length).toBeGreaterThanOrEqual(2);
      expect(need.responses.length).toBeLessThanOrEqual(4);
    }
  });

  it("treats savouring and looking at the conditions as separate directions", () => {
    const ids = needs.needs.map((need) => need.id);
    expect(ids).toContain("savour");
    expect(ids).toContain("conditions");
  });

  it("records one need at a time and several responses under it", () => {
    let state = sessionReducer(quick(), { type: "OPEN_SUPPORT" });
    state = sessionReducer(state, { type: "CHOOSE_NEED", id: "express" });
    expect(state.support?.need).toBe("express");
    state = sessionReducer(state, { type: "TOGGLE_RESPONSE", id: "one-sentence" });
    state = sessionReducer(state, { type: "TOGGLE_RESPONSE", id: "timing" });
    expect(state.support?.choicesByNeed?.express).toEqual(["one-sentence", "timing"]);
    expect(state.support?.chosen).toEqual(["one-sentence", "timing"]);
  });

  it("keeps what was chosen under a need the user steps away from and back to", () => {
    let state = sessionReducer(quick(), { type: "OPEN_SUPPORT" });
    state = sessionReducer(state, { type: "CHOOSE_NEED", id: "express" });
    state = sessionReducer(state, { type: "TOGGLE_RESPONSE", id: "one-sentence" });
    state = sessionReducer(state, { type: "CHOOSE_NEED", id: "pace" });
    expect(state.support?.choicesByNeed?.express).toEqual(["one-sentence"]);
    state = sessionReducer(state, { type: "TOGGLE_RESPONSE", id: "loosen" });
    state = sessionReducer(state, { type: "CHOOSE_NEED", id: "express" });
    expect(state.support?.choicesByNeed?.express).toEqual(["one-sentence"]);
    expect(state.support?.chosen).toEqual(expect.arrayContaining(["one-sentence", "loosen"]));
  });

  it("does not end or reopen the session", () => {
    const finished = quick();
    let state = sessionReducer(finished, { type: "OPEN_SUPPORT" });
    state = sessionReducer(state, { type: "CHOOSE_NEED", id: "nothing" });
    expect(state.status).toBe("completed");
    expect(state.completedAt).toBe(finished.completedAt);
    expect(state.id).toBe(finished.id);
  });
});

describe("where 더 이해하기 leads", () => {
  it("sends a quick-only session into the deep pass", () => {
    expect(understandRoute(quick())).toBe("deep");
  });

  it("sends a finished deep session to the coach when a set matches", () => {
    expect(understandRoute(deep(["억울함"]))).toBe("coach");
  });

  it("says there is nowhere to go when no set covers the chosen words", () => {
    expect(understandRoute(deep(["감사"]))).toBe("none");
  });
});

describe("granularity coach v2", () => {
  it("picks the set from the words the user most recently chose", () => {
    expect(coachSetFor(deep(["억울함"]))?.id).toBe("friction-unfair-stuck");
    expect(coachSetFor(quick(["짜증"]))?.id).toBe("friction-unfair-stuck");
    expect(coachSetFor(deep(["감사"]))).toBeUndefined();
  });

  it("asks what mattered before it shows any word", () => {
    const state = sessionReducer(deep(), { type: "OPEN_COACH" });
    expect(state.stage).toBe("coach-appraisal");
    expect(state.coach?.wordsBefore).toEqual(["억울함"]);
    expect(state.coach?.wordsAfter).toEqual([]);
  });

  it("never maps an appraisal to a word", () => {
    const blob = JSON.stringify(coachSetFor(deep()));
    for (const word of ["짜증", "억울함", "답답함"]) {
      // the words appear in `words` and in the closing note, never inside an appraisal
      for (const appraisal of coachSetFor(deep())!.appraisals) expect(appraisal.text).not.toContain(word);
    }
    expect(blob).not.toMatch(/에는 ‘[^’]+’(이|가) 더 가까/);
  });

  it("carries the appraisal through and lets the words be chosen again", () => {
    let state = sessionReducer(deep(), { type: "OPEN_COACH" });
    state = sessionReducer(state, { type: "SET_APPRAISAL", id: "unfair" });
    expect(state.coach?.appraisal).toBe("unfair");
    expect(state.stage).toBe("coach-words");
    state = sessionReducer(state, { type: "TOGGLE_COACH_WORD", label: "답답함" });
    state = sessionReducer(state, { type: "TOGGLE_COACH_WORD", label: "짜증" });
    expect(state.coach?.wordsAfter).toEqual(["답답함", "짜증"]);
    state = sessionReducer(state, { type: "FINISH_COACH" });
    expect(state.stage).toBe("coach-note");
  });

  it("accepts 잘 모르겠음 without choosing a word for the user", () => {
    let state = sessionReducer(deep(), { type: "OPEN_COACH" });
    state = sessionReducer(state, { type: "SET_APPRAISAL", id: "unsure" });
    state = sessionReducer(state, { type: "FINISH_COACH" });
    expect(state.coach?.appraisal).toBe("unsure");
    expect(state.coach?.wordsAfter).toEqual([]);
  });

  it("takes a word the user typed instead of the offered ones", () => {
    let state = sessionReducer(deep(), { type: "OPEN_COACH" });
    state = sessionReducer(state, { type: "SET_APPRAISAL", id: "stuck" });
    state = sessionReducer(state, { type: "SET_COACH_OWN_WORD", label: "  김새는 느낌 " });
    expect(state.coach?.ownWord).toBe("김새는 느낌");
  });

  it("returns to the summary it came from", () => {
    let fromDeep = sessionReducer(deep(), { type: "OPEN_COACH" });
    fromDeep = sessionReducer(fromDeep, { type: "SET_APPRAISAL", id: "unfair" });
    fromDeep = sessionReducer(fromDeep, { type: "FINISH_COACH" });
    expect(sessionReducer(fromDeep, { type: "CLOSE_COACH" }).stage).toBe("summary");

    let fromQuick = sessionReducer(quick(), { type: "OPEN_COACH" });
    fromQuick = sessionReducer(fromQuick, { type: "SET_APPRAISAL", id: "unfair" });
    fromQuick = sessionReducer(fromQuick, { type: "FINISH_COACH" });
    expect(sessionReducer(fromQuick, { type: "CLOSE_COACH" }).stage).toBe("quick-summary");
  });

  it("records a change without calling it an improvement", () => {
    let state = sessionReducer(deep(["억울함"]), { type: "OPEN_COACH" });
    state = sessionReducer(state, { type: "SET_APPRAISAL", id: "stuck" });
    state = sessionReducer(state, { type: "TOGGLE_COACH_WORD", label: "답답함" });
    state = sessionReducer(state, { type: "FINISH_COACH" });
    expect(state.coach?.wordsBefore).toEqual(["억울함"]);
    expect(state.coach?.wordsAfter).toEqual(["답답함"]);
    expect(JSON.stringify(state.coach)).not.toMatch(/정확|개선|향상|improved/);
  });
});
