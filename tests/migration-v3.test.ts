import { beforeEach, describe, expect, it } from "vitest";
import { getLegacyStorageKeys, migrateLegacyStorage } from "../lib/migrations";
import { loadCompleted, loadDraft } from "../lib/storage";

const { V2_DRAFT_KEY, V2_COMPLETED_KEY } = getLegacyStorageKeys();

/** A record written by the v2 build: affect is a 1-5 step, everything else is v3-shaped. */
const v2Completed = {
  id: "v2-session-1",
  createdAt: "2026-09-21T10:00:00.000Z",
  completedAt: "2026-09-21T10:04:00.000Z",
  status: "completed" as const,
  stage: "summary" as const,
  entry: "quick" as const,
  quickCheck: {
    affect: { valence: 1, activation: 5 },
    candidatePool: [{ label: "긴장", source: "suggested" as const }],
    selected: [{ label: "긴장", source: "suggested" as const }],
    endedAt: "2026-09-21T10:00:30.000Z",
  },
  deepReflection: {
    startedAt: "2026-09-21T10:01:00.000Z",
    entryDecision: "observe" as const,
    body: [{ label: "어깨가 굳음" }],
    affect: { valence: 3, activation: 2 },
    context: { eventText: "회의에서 말을 못 했다", source: "event" as const },
    concerns: ["존중받고 싶었다"],
    emotionCandidates: [{ label: "억울함", source: "suggested" as const }],
    outcome: { clarity: "clearer" as const, usefulness: "helpful" as const },
  },
  synthesisFeedback: { fit: "partly" as const, correction: "사실은 그냥 지쳤다" },
};

const v2Draft = {
  id: "v2-draft-1",
  createdAt: "2026-09-21T11:00:00.000Z",
  status: "draft" as const,
  stage: "context" as const,
  entry: "deep" as const,
  deepReflection: { startedAt: "2026-09-21T11:00:10.000Z", body: [], concerns: [], emotionCandidates: [], affect: { valence: 4, activation: 4 } },
};

describe("v2 records survive the move to continuous affect", () => {
  beforeEach(() => window.localStorage.clear());

  it("converts the 1-5 steps to the same position on the continuous axis", () => {
    window.localStorage.setItem(V2_COMPLETED_KEY, JSON.stringify([v2Completed]));
    migrateLegacyStorage();

    const [session] = loadCompleted();
    // (n - 1) / 4 keeps the recorded position exactly where it was
    expect(session.quickCheck?.affect).toEqual({ valence: 0, activation: 1 });
    expect(session.deepReflection?.affect).toEqual({ valence: 0.5, activation: 0.25 });
  });

  it("does not lose anything else about the session", () => {
    window.localStorage.setItem(V2_COMPLETED_KEY, JSON.stringify([v2Completed]));
    migrateLegacyStorage();

    const [session] = loadCompleted();
    expect(session.id).toBe("v2-session-1");
    expect(session.createdAt).toBe(v2Completed.createdAt);
    expect(session.completedAt).toBe(v2Completed.completedAt);
    expect(session.status).toBe("completed");
    expect(session.entry).toBe("quick");
    expect(session.quickCheck?.selected.map((item) => item.label)).toEqual(["긴장"]);
    expect(session.quickCheck?.endedAt).toBe(v2Completed.quickCheck.endedAt);
    expect(session.deepReflection?.body).toEqual([{ label: "어깨가 굳음" }]);
    expect(session.deepReflection?.context?.eventText).toBe("회의에서 말을 못 했다");
    expect(session.deepReflection?.concerns).toEqual(["존중받고 싶었다"]);
    expect(session.deepReflection?.outcome?.usefulness).toBe("helpful");
    expect(session.synthesisFeedback).toEqual({ fit: "partly", correction: "사실은 그냥 지쳤다" });
  });

  it("carries an in-progress v2 draft over instead of discarding it", () => {
    window.localStorage.setItem(V2_DRAFT_KEY, JSON.stringify(v2Draft));
    migrateLegacyStorage();

    const draft = loadDraft();
    expect(draft?.id).toBe("v2-draft-1");
    expect(draft?.stage).toBe("context");
    expect(draft?.deepReflection?.affect).toEqual({ valence: 0.75, activation: 0.75 });
  });

  it("keeps an unknown quick affect unknown", () => {
    window.localStorage.setItem(
      V2_COMPLETED_KEY,
      JSON.stringify([{ ...v2Completed, quickCheck: { ...v2Completed.quickCheck, affect: { unknown: true } }, deepReflection: undefined }]),
    );
    migrateLegacyStorage();
    expect(loadCompleted()[0].quickCheck?.affect).toEqual({ unknown: true });
  });

  it("clears the v2 keys so the move runs once", () => {
    window.localStorage.setItem(V2_COMPLETED_KEY, JSON.stringify([v2Completed]));
    window.localStorage.setItem(V2_DRAFT_KEY, JSON.stringify(v2Draft));
    expect(migrateLegacyStorage()).toBeGreaterThan(0);

    expect(window.localStorage.getItem(V2_COMPLETED_KEY)).toBeNull();
    expect(window.localStorage.getItem(V2_DRAFT_KEY)).toBeNull();
    expect(migrateLegacyStorage()).toBe(0);
    expect(loadCompleted()).toHaveLength(1);
  });

  it("chains a v1 record all the way through to continuous affect", () => {
    const { V1_COMPLETED_KEY } = getLegacyStorageKeys();
    window.localStorage.setItem(
      V1_COMPLETED_KEY,
      JSON.stringify([{
        id: "v1-session-1",
        createdAt: "2026-09-20T09:00:00.000Z",
        completedAt: "2026-09-20T09:03:00.000Z",
        status: "completed",
        mode: "deep",
        stage: "summary",
        body: [{ label: "몸이 무거움" }],
        affect: { valence: 2, activation: 1 },
        concerns: [],
        emotionCandidates: [{ label: "슬픔", source: "suggested" }],
      }]),
    );
    migrateLegacyStorage();

    const [session] = loadCompleted();
    expect(session.id).toBe("v1-session-1");
    expect(session.migratedFromV1).toBe(true);
    expect(session.deepReflection?.affect).toEqual({ valence: 0.25, activation: 0 });
  });
});
