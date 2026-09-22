import { describe, expect, it } from "vitest";
import { createSession, sessionDepth, sessionReducer } from "../lib/session-types";
import type { EmotionSession } from "../lib/session-types";

const startQuick = () => sessionReducer(createSession(), { type: "START_QUICK" });

const quickToCandidates = () => {
  let state = startQuick();
  state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 2, activation: 5 } });
  return sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: [{ label: "긴장", source: "suggested" }, { label: "짜증", source: "suggested" }] });
};

const completedQuick = () => {
  let state = quickToCandidates();
  state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: "긴장" });
  return sessionReducer(state, { type: "COMPLETE_QUICK" });
};

const runDeepToSummary = (start: EmotionSession) => {
  let state = sessionReducer(start, { type: "SET_BODY", body: [{ label: "어깨가 굳음" }] });
  state = sessionReducer(state, { type: "SET_AFFECT", affect: { valence: 3, activation: 2 } });
  state = sessionReducer(state, { type: "SET_CONTEXT", context: { eventText: "회의에서 말을 못 했다", source: "event" } });
  state = sessionReducer(state, { type: "SET_CONCERNS", concerns: ["존중받고 싶었다"] });
  state = sessionReducer(state, { type: "SET_EMOTIONS", emotionCandidates: [{ label: "억울함", source: "suggested" }] });
  return sessionReducer(state, { type: "SET_OUTCOME", outcome: { clarity: "clearer", usefulness: "helpful" } });
};

describe("quick only", () => {
  it("completes as a single quick record with no deep reflection", () => {
    const state = completedQuick();
    expect(state.stage).toBe("quick-summary");
    expect(state.status).toBe("completed");
    expect(state.entry).toBe("quick");
    expect(state.quickCheck?.selected.map((item) => item.label)).toEqual(["긴장"]);
    expect(state.quickCheck?.endedAt).toBeTruthy();
    expect(state.deepReflection).toBeUndefined();
    expect(sessionDepth(state)).toBe("quick");
  });

  it("ends with unknown affect without selecting a word", () => {
    const state = sessionReducer(startQuick(), { type: "SET_QUICK_UNKNOWN" });
    expect(state.stage).toBe("quick-summary");
    expect(state.status).toBe("completed");
    expect(state.quickCheck?.affect?.unknown).toBe(true);
    expect(state.quickCheck?.selected).toEqual([]);
  });

  it("records 가까운 말이 없음 as its own normal state and stays on the step", () => {
    const state = sessionReducer(quickToCandidates(), { type: "SET_QUICK_CANDIDATE_RESPONSE", response: "none-close" });
    expect(state.quickCheck?.candidateResponse).toBe("none-close");
    expect(state.quickCheck?.selected).toEqual([]);
    expect(state.stage).toBe("quick-candidates");
  });

  it("distinguishes 잘 모르겠음 from 가까운 말이 없음", () => {
    const state = sessionReducer(quickToCandidates(), { type: "SET_QUICK_CANDIDATE_RESPONSE", response: "unsure" });
    expect(state.quickCheck?.candidateResponse).toBe("unsure");
  });

  it("keeps the non-selection answer through completion", () => {
    let state = sessionReducer(quickToCandidates(), { type: "SET_QUICK_CANDIDATE_RESPONSE", response: "none-close" });
    state = sessionReducer(state, { type: "COMPLETE_QUICK" });
    expect(state.status).toBe("completed");
    expect(state.quickCheck?.candidateResponse).toBe("none-close");
  });

  it("drops the non-selection answer when a word is picked after all", () => {
    let state = sessionReducer(quickToCandidates(), { type: "SET_QUICK_CANDIDATE_RESPONSE", response: "unsure" });
    state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: "긴장" });
    expect(state.quickCheck?.candidateResponse).toBeUndefined();
    expect(state.quickCheck?.selected.map((item) => item.label)).toEqual(["긴장"]);
  });

  it("never picks a concept for the user who answers 잘 모르겠음 in the coach", () => {
    let state = quickToCandidates();
    state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: "긴장" });
    state = sessionReducer(state, { type: "OPEN_GRANULARITY" });
    expect(state.stage).toBe("granularity");
    state = sessionReducer(state, { type: "SKIP_GRANULARITY" });
    expect(state.quickCheck?.concept).toBeUndefined();
    expect(state.quickCheck?.granularityResponse).toBe("unsure");
    expect(state.stage).toBe("quick-summary");
    expect(state.quickCheck?.selected.map((item) => item.label)).toEqual(["긴장"]);
  });

  it("walks the granularity coach through to a completed quick record", () => {
    let state = quickToCandidates();
    state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: "긴장" });
    state = sessionReducer(state, { type: "OPEN_GRANULARITY" });
    state = sessionReducer(state, { type: "CHOOSE_GRANULARITY", concept: "긴장" });
    expect(state.stage).toBe("context-contrast");
    state = sessionReducer(state, { type: "SET_CONTRAST", answer: "A" });
    expect(state.stage).toBe("micro-learning");
    state = sessionReducer(state, { type: "DISMISS_MICRO_LEARNING" });
    expect(state.quickCheck?.contrastAnswer).toBe("A");
    expect(state.quickCheck?.microLearningSeen).toBe(true);
    expect(state.status).toBe("completed");
  });
});

describe("own words and synthesis feedback", () => {
  it("adds a word the user typed, marked as their own", () => {
    const state = sessionReducer(quickToCandidates(), { type: "ADD_QUICK_CUSTOM", label: "  뒤통수 맞은 느낌  " });
    expect(state.quickCheck?.selected).toEqual([{ label: "뒤통수 맞은 느낌", source: "custom" }]);
  });

  it("ignores an empty entry and a duplicate", () => {
    let state = sessionReducer(quickToCandidates(), { type: "ADD_QUICK_CUSTOM", label: "   " });
    expect(state.quickCheck?.selected).toEqual([]);
    state = sessionReducer(state, { type: "ADD_QUICK_CUSTOM", label: "서운함" });
    state = sessionReducer(state, { type: "ADD_QUICK_CUSTOM", label: "서운함" });
    expect(state.quickCheck?.selected).toHaveLength(1);
  });

  it("clears a declined-candidates answer once the user writes their own word", () => {
    let state = sessionReducer(quickToCandidates(), { type: "SET_QUICK_CANDIDATE_RESPONSE", response: "none-close" });
    state = sessionReducer(state, { type: "ADD_QUICK_CUSTOM", label: "멍함" });
    expect(state.quickCheck?.candidateResponse).toBeUndefined();
  });

  it("records how well the synthesis fit without ending or reopening the session", () => {
    const completed = completedQuick();
    const rated = sessionReducer(completed, { type: "SET_SYNTHESIS_FEEDBACK", fit: "partly" });
    expect(rated.synthesisFeedback).toEqual({ fit: "partly" });
    expect(rated.stage).toBe(completed.stage);
    expect(rated.status).toBe("completed");
    expect(rated.completedAt).toBe(completed.completedAt);
  });

  it("keeps the rating and the rewrite independent of each other", () => {
    let state = sessionReducer(completedQuick(), { type: "SET_SYNTHESIS_FEEDBACK", fit: "close" });
    state = sessionReducer(state, { type: "SET_SYNTHESIS_FEEDBACK", correction: "사실은 그냥 지쳤던 것 같다" });
    expect(state.synthesisFeedback).toEqual({ fit: "close", correction: "사실은 그냥 지쳤던 것 같다" });
    state = sessionReducer(state, { type: "SET_SYNTHESIS_FEEDBACK", fit: "partly" });
    expect(state.synthesisFeedback?.correction).toBe("사실은 그냥 지쳤던 것 같다");
  });

  it("does not answer the rating when only a rewrite is saved", () => {
    const state = sessionReducer(completedQuick(), { type: "SET_SYNTHESIS_FEEDBACK", correction: "내 말로 적은 설명" });
    expect(state.synthesisFeedback?.fit).toBeUndefined();
    expect(state.synthesisFeedback?.correction).toBe("내 말로 적은 설명");
  });

  it("clears a rewrite that is emptied out", () => {
    let state = sessionReducer(completedQuick(), { type: "SET_SYNTHESIS_FEEDBACK", correction: "처음 적은 것" });
    state = sessionReducer(state, { type: "SET_SYNTHESIS_FEEDBACK", correction: "   " });
    expect(state.synthesisFeedback?.correction).toBeUndefined();
  });
});

describe("quick to deep", () => {
  it("keeps one session id across the handoff", () => {
    const quick = completedQuick();
    const reopened = sessionReducer(quick, { type: "ENTER_DEEP" });
    expect(reopened.id).toBe(quick.id);
    expect(reopened.createdAt).toBe(quick.createdAt);
  });

  it("preserves both affect readings instead of overwriting the quick one", () => {
    const quick = completedQuick();
    let state = sessionReducer(quick, { type: "ENTER_DEEP" });
    state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
    state = runDeepToSummary(state);
    expect(state.quickCheck?.affect).toEqual({ valence: 2, activation: 5 });
    expect(state.deepReflection?.affect).toEqual({ valence: 3, activation: 2 });
    expect(state.quickCheck?.selected.map((item) => item.label)).toEqual(["긴장"]);
    expect(state.deepReflection?.emotionCandidates.map((item) => item.label)).toEqual(["억울함"]);
    expect(state.stage).toBe("summary");
    expect(state.status).toBe("completed");
    expect(sessionDepth(state)).toBe("quick+deep");
  });

  it("does not leave an empty deep reflection when the user stops at the reopened gate", () => {
    let state = sessionReducer(completedQuick(), { type: "ENTER_DEEP" });
    state = sessionReducer(state, { type: "SET_ENTRY", decision: "stop" });
    expect(state.deepReflection).toBeUndefined();
    expect(state.status).toBe("stopped");
    expect(sessionDepth(state)).toBe("quick");
    expect(state.quickCheck?.endedAt).toBeTruthy();
  });
});

describe("deep direct entry", () => {
  it("runs body to outcome without any quick check", () => {
    let state = sessionReducer(createSession(), { type: "START_DEEP" });
    expect(state.entry).toBe("deep");
    expect(state.stage).toBe("entry");
    state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
    expect(state.stage).toBe("body");
    state = runDeepToSummary(state);
    expect(state.quickCheck).toBeUndefined();
    expect(state.deepReflection?.entryDecision).toBe("observe");
    expect(state.deepReflection?.startedAt).toBeTruthy();
    expect(sessionDepth(state)).toBe("deep");
  });

  it("keeps unknown and skip as valid transitions", () => {
    let state = sessionReducer(createSession(), { type: "START_DEEP" });
    state = sessionReducer(state, { type: "SET_ENTRY", decision: "unsure" });
    expect(state.stage).toBe("entry-mini");
    expect(state.deepReflection).toBeUndefined();
    state = sessionReducer(state, { type: "SET_ENTRY_MINI", helpful: "yes" });
    expect(state.stage).toBe("body");
    expect(state.deepReflection?.entryDecision).toBe("unsure");
    state = sessionReducer(state, { type: "SET_BODY", body: [] });
    expect(state.stage).toBe("affect");
  });

  it("reports deep depth even when the gate is refused before anything is recorded", () => {
    let state = sessionReducer(createSession(), { type: "START_DEEP" });
    state = sessionReducer(state, { type: "SET_ENTRY", decision: "stop" });
    expect(state.deepReflection).toBeUndefined();
    expect(sessionDepth(state)).toBe("deep");
  });
});

describe("reopen completed quick", () => {
  it("clears completion so the same record can be continued", () => {
    const quick = completedQuick();
    expect(quick.status).toBe("completed");
    expect(quick.completedAt).toBeTruthy();
    const reopened = sessionReducer(quick, { type: "ENTER_DEEP" });
    expect(reopened.status).toBe("draft");
    expect(reopened.completedAt).toBeUndefined();
    expect(reopened.stage).toBe("entry");
    expect(reopened.quickCheck).toEqual(quick.quickCheck);
  });

  it("re-completes as the same id rather than a second record", () => {
    const quick = completedQuick();
    let state = sessionReducer(quick, { type: "ENTER_DEEP" });
    state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
    state = runDeepToSummary(state);
    expect(state.id).toBe(quick.id);
    expect(state.status).toBe("completed");
  });
});

describe("stop flow", () => {
  it("stops from the quick check without turning into a risk classifier", () => {
    const state = sessionReducer(quickToCandidates(), { type: "STOP", reason: "user" });
    expect(state.stage).toBe("stopped");
    expect(state.status).toBe("stopped");
    expect(state.stopReason).toBe("user");
  });

  it("stops mid deep reflection and keeps what was recorded", () => {
    let state = sessionReducer(createSession(), { type: "START_DEEP" });
    state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
    state = sessionReducer(state, { type: "SET_BODY", body: [{ label: "숨이 얕음" }] });
    state = sessionReducer(state, { type: "STOP", reason: "user" });
    expect(state.status).toBe("stopped");
    expect(state.deepReflection?.body.map((item) => item.label)).toEqual(["숨이 얕음"]);
  });

  it("stops from the entry gate with its own reason", () => {
    let state = sessionReducer(createSession(), { type: "START_DEEP" });
    state = sessionReducer(state, { type: "SET_ENTRY", decision: "unsure" });
    state = sessionReducer(state, { type: "SET_ENTRY_MINI", helpful: "no" });
    expect(state.stage).toBe("stopped");
    expect(state.stopReason).toBe("entry");
  });
});
