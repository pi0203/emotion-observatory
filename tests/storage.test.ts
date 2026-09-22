import { beforeEach, describe, expect, it } from "vitest";
import { createSession, sessionReducer } from "../lib/session-types";
import { getStorageKeys, loadCompleted, loadDraft, persistSession } from "../lib/storage";

const completedQuick = () => {
  let state = sessionReducer(createSession(), { type: "START_QUICK" });
  state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 2, activation: 5 } });
  state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: [{ label: "긴장", source: "suggested" }] });
  state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: "긴장" });
  return sessionReducer(state, { type: "COMPLETE_QUICK" });
};

describe("local-first persistence", () => {
  beforeEach(() => window.localStorage.clear());

  it("saves an in-progress session as a draft and restores it", () => {
    let state = sessionReducer(createSession(), { type: "START_DEEP" });
    state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
    state = sessionReducer(state, { type: "SET_BODY", body: [{ label: "어깨가 굳음" }] });
    persistSession(state);
    expect(loadDraft()).toMatchObject({ id: state.id, stage: "affect" });
    expect(loadDraft()?.deepReflection?.body).toEqual([{ label: "어깨가 굳음" }]);
  });

  it("moves completed sessions out of the draft store", () => {
    const draft = sessionReducer(createSession(), { type: "START_QUICK" });
    persistSession(draft);
    const completed = { ...draft, status: "completed" as const };
    persistSession(completed);
    expect(loadDraft()).toBeNull();
    expect(loadCompleted()[0]).toMatchObject({ id: draft.id, status: "completed" });
  });

  it("recovers a reopened session after a refresh, with the quick check intact", () => {
    const quick = completedQuick();
    persistSession(quick);
    let state = sessionReducer(quick, { type: "ENTER_DEEP" });
    state = sessionReducer(state, { type: "SET_ENTRY", decision: "observe" });
    persistSession(state);

    const recovered = loadDraft();
    expect(recovered?.id).toBe(quick.id);
    expect(recovered?.stage).toBe("body");
    expect(recovered?.quickCheck?.selected.map((item) => item.label)).toEqual(["긴장"]);
  });

  it("does not leave a reopened session in both stores", () => {
    const quick = completedQuick();
    persistSession(quick);
    expect(loadCompleted()).toHaveLength(1);
    persistSession(sessionReducer(quick, { type: "ENTER_DEEP" }));
    expect(loadCompleted()).toHaveLength(0);
    expect(loadDraft()?.id).toBe(quick.id);
  });

  it("stores a re-completed session once, not twice", () => {
    const quick = completedQuick();
    persistSession(quick);
    persistSession(quick);
    const reopened = sessionReducer(quick, { type: "ENTER_DEEP" });
    persistSession(reopened);
    persistSession({ ...reopened, status: "completed" });
    const completed = loadCompleted();
    expect(completed).toHaveLength(1);
    expect(completed[0].id).toBe(quick.id);
  });

  it("keeps stopped sessions alongside completed ones", () => {
    const stopped = sessionReducer(completedQuick(), { type: "STOP", reason: "user" });
    persistSession(stopped);
    expect(loadCompleted()[0]).toMatchObject({ id: stopped.id, status: "stopped" });
    expect(loadDraft()).toBeNull();
  });

  it("survives unreadable storage without throwing", () => {
    window.localStorage.setItem(getStorageKeys().DRAFT_KEY, "{not json");
    expect(loadDraft()).toBeNull();
  });
});
