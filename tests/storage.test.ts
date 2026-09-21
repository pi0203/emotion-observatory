import { beforeEach, describe, expect, it } from "vitest";
import { createSession, sessionReducer } from "../lib/session-types";
import { getStorageKeys, loadDraft, persistSession } from "../lib/storage";

describe("local-first persistence", () => {
  beforeEach(() => window.localStorage.clear());

  it("saves an in-progress session as a draft and restores it", () => {
    const session = { ...createSession(), stage: "context" as const, context: { eventText: "로컬에 남는 초안", source: "event" as const } };
    persistSession(session);
    expect(loadDraft()).toMatchObject({ id: session.id, stage: "context", context: session.context });
  });

  it("moves completed sessions out of the draft store", () => {
    const draft = { ...createSession(), stage: "body" as const };
    persistSession(draft);
    const completed = sessionReducer(draft, { type: "SET_OUTCOME", outcome: { clarity: "clearer", usefulness: "helpful" } });
    persistSession(completed);
    expect(loadDraft()).toBeNull();
    expect(JSON.parse(window.localStorage.getItem(getStorageKeys().COMPLETED_KEY) ?? "[]")[0]).toMatchObject({ id: draft.id, status: "completed" });
  });
});
