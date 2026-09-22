import { beforeEach, describe, expect, it } from "vitest";
import { getLegacyStorageKeys, hasLegacyStorage, migrateLegacyStorage, migrateSession } from "../lib/migrations";
import { getStorageKeys, loadCompleted, loadDraft } from "../lib/storage";
import { sessionDepth } from "../lib/session-types";

const { V1_DRAFT_KEY, V1_COMPLETED_KEY } = getLegacyStorageKeys();

const v1QuickOnly = {
  id: "quick-1",
  createdAt: "2026-09-20T01:00:00.000Z",
  completedAt: "2026-09-20T01:00:20.000Z",
  status: "completed" as const,
  mode: "quick" as const,
  stage: "quick-summary" as const,
  body: [],
  concerns: [],
  emotionCandidates: [{ label: "짜증", source: "suggested" as const }],
  quickCandidatePool: [
    { label: "긴장", source: "suggested" as const },
    { label: "짜증", source: "suggested" as const },
  ],
  quickAffect: { valence: 2 as const, activation: 4 as const },
};

const v1QuickToDeep = {
  id: "quick-deep-1",
  createdAt: "2026-09-20T02:00:00.000Z",
  completedAt: "2026-09-20T02:04:00.000Z",
  status: "completed" as const,
  mode: "quick-to-deep" as const,
  stage: "summary" as const,
  entryDecision: "observe" as const,
  body: [{ label: "어깨가 굳음" }],
  affect: { valence: 3 as const, activation: 2 as const },
  context: { eventText: "회의에서 말을 못 했다", source: "event" as const },
  concerns: ["존중받고 싶었다"],
  emotionCandidates: [{ label: "억울함", source: "suggested" as const }],
  quickCandidatePool: [{ label: "답답함", source: "suggested" as const }],
  quickAffect: { valence: 2 as const, activation: 5 as const },
  outcome: { clarity: "clearer" as const, usefulness: "helpful" as const },
};

const v1DeepOnly = {
  id: "deep-1",
  createdAt: "2026-09-20T03:00:00.000Z",
  completedAt: "2026-09-20T03:05:00.000Z",
  status: "completed" as const,
  mode: "deep" as const,
  stage: "summary" as const,
  entryDecision: "observe" as const,
  body: [{ label: "숨이 얕음" }],
  affect: { valence: 2 as const, activation: 3 as const },
  concerns: [],
  emotionCandidates: [{ label: "걱정", source: "suggested" as const }],
};

describe("v1 record mapping", () => {
  it("reads a quick-only record's pool and picks from their v1 fields", () => {
    const session = migrateSession(v1QuickOnly);
    expect(session.entry).toBe("quick");
    expect(session.quickCheck?.candidatePool.map((item) => item.label)).toEqual(["긴장", "짜증"]);
    expect(session.quickCheck?.selected.map((item) => item.label)).toEqual(["짜증"]);
    expect(session.quickCheck?.affect).toEqual({ valence: 2, activation: 4 });
    expect(session.quickCheck?.endedAt).toBe(v1QuickOnly.completedAt);
    expect(session.deepReflection).toBeUndefined();
    expect(sessionDepth(session)).toBe("quick");
    expect(session.migratedFromV1).toBe(true);
  });

  it("reads a quick-to-deep record's quick picks out of quickCandidatePool", () => {
    const session = migrateSession(v1QuickToDeep);
    // v1 stored the user's quick picks in this field, so the offered pool is lost.
    expect(session.quickCheck?.selected.map((item) => item.label)).toEqual(["답답함"]);
    expect(session.quickCheck?.candidatePool).toEqual([]);
    expect(session.quickCheck?.affect).toEqual({ valence: 2, activation: 5 });
    expect(session.deepReflection?.emotionCandidates.map((item) => item.label)).toEqual(["억울함"]);
    expect(session.deepReflection?.affect).toEqual({ valence: 3, activation: 2 });
    expect(session.deepReflection?.context?.eventText).toBe("회의에서 말을 못 했다");
    expect(session.deepReflection?.outcome?.usefulness).toBe("helpful");
    expect(sessionDepth(session)).toBe("quick+deep");
  });

  it("maps a deep-only record with no quick check", () => {
    const session = migrateSession(v1DeepOnly);
    expect(session.entry).toBe("deep");
    expect(session.quickCheck).toBeUndefined();
    expect(session.deepReflection?.body.map((item) => item.label)).toEqual(["숨이 얕음"]);
    expect(session.deepReflection?.startedAt).toBe(v1DeepOnly.createdAt);
    expect(sessionDepth(session)).toBe("deep");
  });

  it("does not invent a deep reflection for a record that stopped at the gate", () => {
    const session = migrateSession({
      id: "stopped-1",
      createdAt: "2026-09-20T04:00:00.000Z",
      status: "stopped" as const,
      mode: "quick-to-deep" as const,
      stage: "stopped" as const,
      body: [],
      concerns: [],
      emotionCandidates: [],
      quickCandidatePool: [{ label: "긴장", source: "suggested" as const }],
      stopReason: "entry" as const,
    });
    expect(session.deepReflection).toBeUndefined();
    expect(session.stopReason).toBe("entry");
    expect(sessionDepth(session)).toBe("quick");
  });
});

describe("v1 to v2 storage migration", () => {
  beforeEach(() => window.localStorage.clear());

  it("moves completed records into the v2 store and discards the v1 draft", () => {
    window.localStorage.setItem(V1_COMPLETED_KEY, JSON.stringify([v1QuickToDeep, v1QuickOnly]));
    window.localStorage.setItem(V1_DRAFT_KEY, JSON.stringify({ id: "half-written", status: "draft", mode: "deep" }));

    expect(hasLegacyStorage()).toBe(true);
    expect(migrateLegacyStorage()).toBe(2);

    const completed = loadCompleted();
    expect(completed.map((item) => item.id)).toEqual(["quick-deep-1", "quick-1"]);
    expect(completed.every((item) => item.migratedFromV1)).toBe(true);
    expect(loadDraft()).toBeNull();
    expect(window.localStorage.getItem(V1_COMPLETED_KEY)).toBeNull();
    expect(window.localStorage.getItem(V1_DRAFT_KEY)).toBeNull();
    expect(hasLegacyStorage()).toBe(false);
  });

  it("is idempotent and does not duplicate on a second run", () => {
    window.localStorage.setItem(V1_COMPLETED_KEY, JSON.stringify([v1QuickOnly]));
    expect(migrateLegacyStorage()).toBe(1);
    expect(migrateLegacyStorage()).toBe(0);
    expect(loadCompleted()).toHaveLength(1);
  });

  it("appends migrated records after existing v2 records, which are newer", () => {
    window.localStorage.setItem(getStorageKeys().COMPLETED_KEY, JSON.stringify([{ id: "v2-new", status: "completed", entry: "quick" }]));
    window.localStorage.setItem(V1_COMPLETED_KEY, JSON.stringify([v1QuickOnly]));
    migrateLegacyStorage();
    expect(loadCompleted().map((item) => item.id)).toEqual(["v2-new", "quick-1"]);
  });

  it("clears unreadable v1 data instead of failing the app", () => {
    window.localStorage.setItem(V1_COMPLETED_KEY, "{not json");
    expect(migrateLegacyStorage()).toBe(0);
    expect(window.localStorage.getItem(V1_COMPLETED_KEY)).toBeNull();
  });

  it("does nothing when there is no v1 data", () => {
    expect(hasLegacyStorage()).toBe(false);
    expect(migrateLegacyStorage()).toBe(0);
  });
});
