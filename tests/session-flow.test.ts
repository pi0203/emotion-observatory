import { describe, expect, it } from "vitest";
import { createSession, sessionReducer } from "../lib/session-types";

describe("vertical slice session machine", () => {
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

  it("supports the stop path without turning it into a risk classifier", () => {
    let state = createSession();
    state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
    state = sessionReducer(state, { type: "STOP", reason: "user" });
    expect(state.stage).toBe("stopped");
    expect(state.status).toBe("stopped");
  });
});
