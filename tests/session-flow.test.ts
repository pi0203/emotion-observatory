import { describe, expect, it } from "vitest";
import { createSession, sessionReducer } from "../lib/session-types";

describe("vertical slice session machine", () => {
  it("supports quick check, optional granularity, and deep reflection handoff", () => {
    let state = sessionReducer(createSession(), { type: "START_QUICK" });
    expect(state.stage).toBe("quick-affect");
    state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 2, activation: 5 } });
    state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", emotionCandidates: [{ label: "긴장", source: "suggested" }] });
    state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: "긴장" });
    state = sessionReducer(state, { type: "OPEN_GRANULARITY", concept: "긴장" });
    expect(state.stage).toBe("granularity");
    state = sessionReducer(state, { type: "CHOOSE_GRANULARITY", concept: "긴장" });
    state = sessionReducer(state, { type: "SET_CONTRAST", answer: "A" });
    state = sessionReducer(state, { type: "DISMISS_MICRO_LEARNING" });
    expect(state.stage).toBe("quick-summary");
    expect(state.status).toBe("completed");
    const quickSessionId = state.id;
    state = sessionReducer(state, { type: "ENTER_DEEP" });
    expect(state.stage).toBe("entry");
    expect(state.mode).toBe("quick-to-deep");
    expect(state.id).not.toBe(quickSessionId);
    expect(state.emotionCandidates).toEqual([]);
    expect(state.affect).toEqual({ valence: 2, activation: 5 });
  });

  it("lets quick check end with unknown without selecting a word", () => {
    let state = sessionReducer(createSession(), { type: "START_QUICK" });
    state = sessionReducer(state, { type: "SET_QUICK_UNKNOWN" });
    expect(state.stage).toBe("quick-summary");
    expect(state.quickAffect?.unknown).toBe(true);
    expect(state.emotionCandidates).toEqual([]);
  });

  it("moves through the normal body-to-outcome flow", () => {
    let state = createSession();
    state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
    expect(state.stage).toBe("body");
    state = sessionReducer(state, { type: "SET_BODY", body: [{ label: "편안함" }] });
    state = sessionReducer(state, { type: "SET_AFFECT", affect: { valence: 4, activation: 2 } });
    state = sessionReducer(state, { type: "SET_CONTEXT", context: { eventText: "좋은 대화를 나눴다", source: "event" } });
    state = sessionReducer(state, { type: "SET_CONCERNS", concerns: ["연결되고 싶었다"] });
    state = sessionReducer(state, { type: "SET_EMOTIONS", emotionCandidates: [{ label: "안도", source: "suggested" }] });
    state = sessionReducer(state, { type: "SET_OUTCOME", outcome: { clarity: "clearer", usefulness: "helpful" } });
    expect(state.stage).toBe("summary");
    expect(state.status).toBe("completed");
  });

  it("keeps unknown and skip as valid transitions", () => {
    let state = createSession();
    state = sessionReducer(state, { type: "SET_ENTRY", decision: "unsure" });
    expect(state.stage).toBe("entry-mini");
    state = sessionReducer(state, { type: "SET_ENTRY_MINI", helpful: "yes" });
    expect(state.stage).toBe("body");
    state = sessionReducer(state, { type: "SET_BODY", body: [] });
    expect(state.stage).toBe("affect");
  });

  it("records “가까운 말이 없음” as its own normal state", () => {
    let state = sessionReducer(createSession(), { type: "START_QUICK" });
    state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 2, activation: 5 } });
    state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", emotionCandidates: [{ label: "긴장", source: "suggested" }] });
    state = sessionReducer(state, { type: "SET_QUICK_CANDIDATE_RESPONSE", response: "none-close" });
    expect(state.quickCandidateResponse).toBe("none-close");
    expect(state.emotionCandidates).toEqual([]);
    expect(state.stage).toBe("quick-candidates");
  });

  it("distinguishes “잘 모르겠음” from “가까운 말이 없음” at the candidate step", () => {
    let state = sessionReducer(createSession(), { type: "START_QUICK" });
    state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 2, activation: 5 } });
    state = sessionReducer(state, { type: "SET_QUICK_CANDIDATE_RESPONSE", response: "unsure" });
    expect(state.quickCandidateResponse).toBe("unsure");
  });

  it("lets the user finish after answering neither candidate option", () => {
    let state = sessionReducer(createSession(), { type: "START_QUICK" });
    state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 2, activation: 5 } });
    state = sessionReducer(state, { type: "SET_QUICK_CANDIDATE_RESPONSE", response: "none-close" });
    state = sessionReducer(state, { type: "COMPLETE_QUICK" });
    expect(state.stage).toBe("quick-summary");
    expect(state.status).toBe("completed");
    expect(state.quickCandidateResponse).toBe("none-close");
  });

  it("drops the non-selection answer when the user picks a word after all", () => {
    let state = sessionReducer(createSession(), { type: "START_QUICK" });
    state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 2, activation: 5 } });
    state = sessionReducer(state, { type: "SET_QUICK_CANDIDATE_RESPONSE", response: "unsure" });
    state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: "긴장" });
    expect(state.quickCandidateResponse).toBeUndefined();
    expect(state.emotionCandidates.map((item) => item.label)).toEqual(["긴장"]);
  });

  it("never picks a concept for the user who answers “잘 모르겠음” in the coach", () => {
    let state = sessionReducer(createSession(), { type: "START_QUICK" });
    state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 2, activation: 5 } });
    state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", emotionCandidates: [{ label: "긴장", source: "suggested" }] });
    state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: "긴장" });
    state = sessionReducer(state, { type: "OPEN_GRANULARITY", concept: "긴장" });
    state = sessionReducer(state, { type: "SKIP_GRANULARITY" });
    expect(state.quickConcept).toBeUndefined();
    expect(state.quickGranularityResponse).toBe("unsure");
    expect(state.stage).toBe("quick-summary");
    expect(state.status).toBe("completed");
    expect(state.emotionCandidates.map((item) => item.label)).toEqual(["긴장"]);
  });

  it("supports the stop path without turning it into a risk classifier", () => {
    let state = createSession();
    state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
    state = sessionReducer(state, { type: "STOP", reason: "user" });
    expect(state.stage).toBe("stopped");
    expect(state.status).toBe("stopped");
  });
});
