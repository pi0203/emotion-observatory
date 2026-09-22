import { describe, expect, it } from "vitest";
import { canGoBack, createSession, sessionReducer } from "../lib/session-types";
import type { EmotionSession } from "../lib/session-types";

const deepToContext = () => {
  let state = sessionReducer(createSession(), { type: "START_DEEP" });
  state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
  state = sessionReducer(state, { type: "SET_BODY", body: [{ label: "가슴이 답답함" }] });
  state = sessionReducer(state, { type: "SET_AFFECT", affect: { valence: 0.3, activation: 0.8 } });
  return sessionReducer(state, { type: "SET_CONTEXT", context: { eventText: "회의", source: "event" } });
};

describe("going back a step", () => {
  it("has nowhere to go from the first screen", () => {
    expect(canGoBack(createSession())).toBe(false);
    expect(canGoBack(sessionReducer(createSession(), { type: "START_DEEP" }))).toBe(false);
  });

  it("returns to the previous step without starting a new session", () => {
    const forward = deepToContext();
    const back = sessionReducer(forward, { type: "BACK" });
    expect(back.stage).toBe("context");
    expect(back.id).toBe(forward.id);
    expect(back.createdAt).toBe(forward.createdAt);
  });

  it("keeps everything the user already entered", () => {
    let state = sessionReducer(deepToContext(), { type: "BACK" }); // -> context
    state = sessionReducer(state, { type: "BACK" }); // -> affect
    state = sessionReducer(state, { type: "BACK" }); // -> body
    expect(state.stage).toBe("body");
    expect(state.deepReflection?.body).toEqual([{ label: "가슴이 답답함" }]);
    expect(state.deepReflection?.affect).toEqual({ valence: 0.3, activation: 0.8 });
    expect(state.deepReflection?.context?.eventText).toBe("회의");
  });

  it("updates only the field that was changed on the way forward again", () => {
    let state = sessionReducer(deepToContext(), { type: "BACK" });
    state = sessionReducer(state, { type: "BACK" }); // affect
    state = sessionReducer(state, { type: "SET_AFFECT", affect: { valence: 0.9, activation: 0.2 } });
    expect(state.deepReflection?.affect).toEqual({ valence: 0.9, activation: 0.2 });
    expect(state.deepReflection?.body).toEqual([{ label: "가슴이 답답함" }]);
    expect(state.deepReflection?.context?.eventText).toBe("회의");
  });

  it("walks back through the quick check too", () => {
    let state = sessionReducer(createSession(), { type: "START_QUICK" });
    state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.2, activation: 0.9 } });
    state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: [{ label: "긴장", source: "suggested" }] });
    state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: "긴장" });
    expect(canGoBack(state)).toBe(true);

    state = sessionReducer(state, { type: "BACK" });
    expect(state.stage).toBe("quick-affect");
    expect(state.quickCheck?.affect).toEqual({ valence: 0.2, activation: 0.9 });
    expect(state.quickCheck?.selected.map((item) => item.label)).toEqual(["긴장"]);
  });

  it("does not treat picking a chip as a step to go back through", () => {
    let state = sessionReducer(createSession(), { type: "START_QUICK" });
    state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.2, activation: 0.9 } });
    state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: [{ label: "긴장", source: "suggested" }] });
    const depth = state.history?.length ?? 0;
    state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: "긴장" });
    state = sessionReducer(state, { type: "ADD_QUICK_CUSTOM", label: "멍함" });
    expect(state.history?.length ?? 0).toBe(depth);
  });

  it("goes back from the reopened gate to the quick summary", () => {
    let state = sessionReducer(createSession(), { type: "START_QUICK" });
    state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.2, activation: 0.9 } });
    state = sessionReducer(state, { type: "COMPLETE_QUICK" });
    state = sessionReducer(state, { type: "ENTER_DEEP" });
    expect(state.stage).toBe("entry");
    state = sessionReducer(state, { type: "BACK" });
    expect(state.stage).toBe("quick-summary");
    expect(state.id).toBeTruthy();
  });

  it("cannot rewind a finished session past its summary", () => {
    let state = sessionReducer(createSession(), { type: "START_QUICK" });
    state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.2, activation: 0.9 } });
    state = sessionReducer(state, { type: "COMPLETE_QUICK" });
    expect(canGoBack(state)).toBe(false);
  });

  it("survives a resumed draft that was written before history existed", () => {
    const legacy = { ...deepToContext(), history: undefined } as EmotionSession;
    expect(canGoBack(legacy)).toBe(false);
    expect(sessionReducer(legacy, { type: "BACK" })).toEqual(legacy);
  });
});

describe("choosing what would help", () => {
  const finished = () => {
    let state = sessionReducer(createSession(), { type: "START_QUICK" });
    state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.2, activation: 0.9 } });
    return sessionReducer(state, { type: "COMPLETE_QUICK" });
  };

  it("opens from a finished session and comes back to it", () => {
    const summary = finished();
    const support = sessionReducer(summary, { type: "OPEN_SUPPORT" });
    expect(support.stage).toBe("support");
    expect(support.status).toBe("completed");
    expect(sessionReducer(support, { type: "BACK" }).stage).toBe("quick-summary");
  });

  it("stores several directions at once and lets them be unpicked", () => {
    let state = sessionReducer(finished(), { type: "OPEN_SUPPORT" });
    state = sessionReducer(state, { type: "TOGGLE_SUPPORT", id: "settle-body" });
    state = sessionReducer(state, { type: "TOGGLE_SUPPORT", id: "boundary" });
    expect(state.support?.chosen).toEqual(["settle-body", "boundary"]);
    state = sessionReducer(state, { type: "TOGGLE_SUPPORT", id: "settle-body" });
    expect(state.support?.chosen).toEqual(["boundary"]);
  });

  it("does not end or reopen the session", () => {
    const summary = finished();
    let state = sessionReducer(summary, { type: "OPEN_SUPPORT" });
    state = sessionReducer(state, { type: "TOGGLE_SUPPORT", id: "nothing" });
    expect(state.status).toBe("completed");
    expect(state.completedAt).toBe(summary.completedAt);
    expect(state.id).toBe(summary.id);
  });
});
