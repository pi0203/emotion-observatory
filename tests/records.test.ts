import { beforeEach, describe, expect, it } from "vitest";
import { formatWhen, responseLabels, summarise } from "../lib/records";
import { createSession, sessionReducer } from "../lib/session-types";
import { loadCompleted, saveCompleted } from "../lib/storage";
import type { EmotionSession } from "../lib/session-types";

const finished = (): EmotionSession => {
  let state = sessionReducer(createSession(), { type: "START_QUICK" });
  state = sessionReducer(state, { type: "SET_QUICK_AFFECT", affect: { valence: 0.2, activation: 0.9 } });
  state = sessionReducer(state, { type: "SET_QUICK_CANDIDATES", candidatePool: [{ label: "짜증", source: "suggested" }] });
  state = sessionReducer(state, { type: "TOGGLE_QUICK_CANDIDATE", label: "짜증" });
  state = sessionReducer(state, { type: "COMPLETE_QUICK" });
  state = sessionReducer(state, { type: "OPEN_SUPPORT" });
  state = sessionReducer(state, { type: "CHOOSE_NEED", id: "express" });
  return sessionReducer(state, { type: "TOGGLE_RESPONSE", id: "one-sentence" });
};

describe("what a past record shows", () => {
  it("shows the date, the depth, the words and what was chosen", () => {
    const item = summarise(finished());
    expect(item.depthLabel).toBe("빠른 확인");
    expect(item.words).toEqual(["짜증"]);
    expect(item.needLabel).toBe("누군가에게 표현할 준비하기");
    expect(item.responseLabels).toEqual(["전하고 싶은 핵심을 한 문장으로 적기"]);
  });

  it("offers a follow-up only where something was chosen to try", () => {
    expect(summarise(finished()).canFollowUp).toBe(true);
    let bare = sessionReducer(createSession(), { type: "START_QUICK" });
    bare = sessionReducer(bare, { type: "SET_QUICK_AFFECT", affect: { valence: 0.5, activation: 0.5 } });
    expect(summarise(sessionReducer(bare, { type: "COMPLETE_QUICK" })).canFollowUp).toBe(false);
  });

  it("carries no score, rating or interpretation", () => {
    const item = summarise(finished());
    expect(Object.keys(item)).not.toContain("score");
    expect(JSON.stringify(item)).not.toMatch(/정확|개선|향상|점수|추천|성공률/);
  });

  it("reads responses across every direction the user looked at", () => {
    let state = sessionReducer(finished(), { type: "CHOOSE_NEED", id: "pace" });
    state = sessionReducer(state, { type: "TOGGLE_RESPONSE", id: "loosen" });
    expect(responseLabels(state)).toEqual(expect.arrayContaining([
      "전하고 싶은 핵심을 한 문장으로 적기",
      "긴장된 곳 한 군데를 조금 움직여보기",
    ]));
  });

  it("formats a time and survives a broken one", () => {
    expect(formatWhen("2026-09-22T14:05:00.000Z")).toMatch(/2026\. 09\. 22/);
    expect(formatWhen("not a date")).toBe("");
  });
});

describe("recording a follow-up later", () => {
  beforeEach(() => window.localStorage.clear());

  it("updates the stored record in place rather than adding another", () => {
    const session = finished();
    saveCompleted(session);
    saveCompleted({ ...session, support: { ...session.support!, followUp: { tried: "partly", at: "2026-09-23T09:00:00.000Z" } } });

    const stored = loadCompleted();
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(session.id);
    expect(stored[0].support?.followUp?.tried).toBe("partly");
    // everything the session already held is still there
    expect(stored[0].support?.need).toBe("express");
    expect(stored[0].quickCheck?.selected.map((item) => item.label)).toEqual(["짜증"]);
  });

  it("lets an answer be changed without losing the other one", () => {
    const session = finished();
    saveCompleted({ ...session, support: { ...session.support!, followUp: { tried: "yes" } } });
    const first = loadCompleted()[0];
    saveCompleted({ ...first, support: { ...first.support!, followUp: { ...first.support?.followUp, helped: "somewhat" } } });
    const second = loadCompleted()[0];
    expect(second.support?.followUp).toMatchObject({ tried: "yes", helped: "somewhat" });
    expect(loadCompleted()).toHaveLength(1);
  });

  it("keeps 아니요 as an ordinary answer", () => {
    const session = finished();
    saveCompleted({ ...session, support: { ...session.support!, followUp: { tried: "no" } } });
    expect(loadCompleted()[0].support?.followUp?.tried).toBe("no");
    expect(summarise(loadCompleted()[0]).followUpAnswered).toBe(true);
  });
});
