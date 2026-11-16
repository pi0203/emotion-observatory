import { beforeEach, describe, expect, it } from "vitest";
import { createSession, sessionReducer } from "../lib/session-types";
import type { EmotionSession, SessionAction } from "../lib/session-types";
import { getStorageKeys, persistSession } from "../lib/storage";

/**
 * A finished quick look reopened with 조금 더 천천히 들여다보기 and then left with
 * 한 단계 뒤로 must be a finished record again (2026-11-16, before the 11/18 demo).
 * Before this, it stayed a draft: 지난 기록 lost it, and 이어하던 기록을 지우고 새로
 * 시작 deleted it. Every step here is persisted the way the app does on each change.
 */
const { DRAFT_KEY, COMPLETED_KEY } = getStorageKeys();
const stored = () => ({
  draft: window.localStorage.getItem(DRAFT_KEY),
  completed: JSON.parse(window.localStorage.getItem(COMPLETED_KEY) ?? "[]") as EmotionSession[],
});

const step = (state: EmotionSession, action: SessionAction) => {
  const next = sessionReducer(state, action);
  persistSession(next);
  return next;
};

/** 지금 기록 → 한 점 → 다음 → 내 말 추가 → 여기까지 */
const finishedQuick = () => {
  let state = step(createSession(), { type: "START_QUICK" });
  state = step(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.2, activation: 0.9 } });
  state = step(state, { type: "SET_QUICK_CANDIDATES", candidatePool: [{ label: "긴장", source: "suggested" }] });
  state = step(state, { type: "ADD_QUICK_CUSTOM", label: "멍함" });
  return step(state, { type: "COMPLETE_QUICK" });
};

const expectFinishedOnly = (state: EmotionSession, completedAt: string) => {
  expect(state.status).toBe("completed");
  expect(state.completedAt).toBe(completedAt);
  const { draft, completed } = stored();
  expect(draft).toBeNull();
  expect(completed).toHaveLength(1);
  expect(completed[0].id).toBe(state.id);
  expect(completed[0].status).toBe("completed");
  expect(completed[0].completedAt).toBe(completedAt);
};

describe("a finished quick look that is reopened and left again", () => {
  beforeEach(() => window.localStorage.clear());

  it("is a finished record again after going back from the gate", () => {
    const done = finishedQuick();
    const finishedAt = done.completedAt!;
    expect(finishedAt).toBe(done.quickCheck?.endedAt);
    expectFinishedOnly(done, finishedAt);

    // 조금 더 천천히 들여다보기: while the slower look is open, the record is a draft
    const reopened = step(done, { type: "ENTER_DEEP" });
    expect(reopened.stage).toBe("entry");
    expect(reopened.status).toBe("draft");
    expect(reopened.completedAt).toBeUndefined();
    expect(stored().completed).toHaveLength(0);
    expect(JSON.parse(stored().draft!).id).toBe(done.id);

    // 한 단계 뒤로: back on 여기까지 살펴보았습니다, and finished as it was
    const back = step(reopened, { type: "BACK" });
    expect(back.stage).toBe("quick-summary");
    expect(back.id).toBe(done.id);
    expect(back.quickCheck).toEqual(done.quickCheck);
    expect(back.deepReflection).toBeUndefined();
    expectFinishedOnly(back, finishedAt);
  });

  it("is a finished record again after writing the body step and going back twice", () => {
    const done = finishedQuick();
    const finishedAt = done.completedAt!;
    let state = step(done, { type: "ENTER_DEEP" });
    state = step(state, { type: "SET_ENTRY", decision: "observe" });
    state = step(state, { type: "SET_BODY", body: [{ label: "가슴이 답답함" }] });
    expect(state.stage).toBe("affect");

    state = step(state, { type: "BACK" }); // -> body, still the slower look
    expect(state.stage).toBe("body");
    expect(state.status).toBe("draft");
    expect(state.deepReflection?.body).toEqual([{ label: "가슴이 답답함" }]);

    state = step(state, { type: "BACK" }); // -> entry, still the slower look
    expect(state.stage).toBe("entry");
    expect(state.status).toBe("draft");
    expect(stored().completed).toHaveLength(0);

    state = step(state, { type: "BACK" }); // -> the quick summary
    expect(state.stage).toBe("quick-summary");
    // owner's decision 2026-11-16: what was written in the unfinished slower look is not kept
    expect(state.deepReflection).toBeUndefined();
    expect(state.quickCheck).toEqual(done.quickCheck);
    expectFinishedOnly(state, finishedAt);
  });

  it("goes back the same way after 잘 모르겠다 at the gate", () => {
    const done = finishedQuick();
    let state = step(done, { type: "ENTER_DEEP" });
    state = step(state, { type: "SET_ENTRY", decision: "unsure" });
    expect(state.stage).toBe("entry-mini");
    state = step(state, { type: "BACK" });
    state = step(state, { type: "BACK" });
    expect(state.stage).toBe("quick-summary");
    expectFinishedOnly(state, done.completedAt!);
  });

  it("is a finished record again when reopened from 도움이 될 것 고르기", () => {
    const done = finishedQuick();
    let state = step(done, { type: "OPEN_SUPPORT" });
    state = step(state, { type: "CHOOSE_NEED", id: "understand" });
    state = step(state, { type: "ENTER_DEEP" });
    expect(state.status).toBe("draft");
    state = step(state, { type: "BACK" });
    expect(state.stage).toBe("support");
    expect(state.support).toEqual(done.support ?? { chosen: [], need: "understand" });
    expectFinishedOnly(state, done.completedAt!);
    state = step(state, { type: "BACK" });
    expect(state.stage).toBe("quick-summary");
    expectFinishedOnly(state, done.completedAt!);
  });

  it("still finishes the slower look as the same single record", () => {
    const done = finishedQuick();
    let state = step(done, { type: "ENTER_DEEP" });
    state = step(state, { type: "BACK" });
    state = step(state, { type: "ENTER_DEEP" });
    state = step(state, { type: "SET_ENTRY", decision: "observe" });
    state = step(state, { type: "SET_BODY", body: [{ label: "어깨가 굳음" }] });
    state = step(state, { type: "SET_AFFECT", affect: { valence: 0.3, activation: 0.7 } });
    state = step(state, { type: "SET_CONTEXT", context: { eventText: "회의", source: "event" } });
    state = step(state, { type: "SET_CONCERNS", concerns: [] });
    state = step(state, { type: "SET_EMOTIONS", emotionCandidates: [] });
    state = step(state, { type: "SET_OUTCOME", outcome: { clarity: "clearer", usefulness: "helpful" } });
    expect(state.stage).toBe("summary");
    expect(state.deepReflection?.body).toEqual([{ label: "어깨가 굳음" }]);
    const { draft, completed } = stored();
    expect(draft).toBeNull();
    expect(completed.map((item) => item.id)).toEqual([done.id]);
  });

  it("still turns into a stopped record when 그만두기 is pressed at the gate (unchanged)", () => {
    const done = finishedQuick();
    let state = step(done, { type: "ENTER_DEEP" });
    state = step(state, { type: "SET_ENTRY", decision: "stop" });
    expect(state.status).toBe("stopped");
  });
});
