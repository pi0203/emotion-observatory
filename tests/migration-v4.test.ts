import { beforeEach, describe, expect, it } from "vitest";
import { getLegacyStorageKeys, migrateLegacyStorage } from "../lib/migrations";
import { loadCompleted, loadDraft } from "../lib/storage";

const { V3_DRAFT_KEY, V3_COMPLETED_KEY } = getLegacyStorageKeys();

const v3WithSupport = {
  id: "v3-1",
  createdAt: "2026-09-22T10:00:00.000Z",
  completedAt: "2026-09-22T10:02:00.000Z",
  status: "completed" as const,
  stage: "quick-summary" as const,
  entry: "quick" as const,
  quickCheck: { affect: { valence: 0.25, activation: 1 }, candidatePool: [], selected: [{ label: "짜증", source: "suggested" as const }] },
  // v3 stored need ids in `chosen`, which the new shape would read as responses
  support: { chosen: ["settle-body", "put-in-words"] },
  synthesisFeedback: { fit: "partly" as const },
};

describe("v3 support records are not read as responses", () => {
  beforeEach(() => window.localStorage.clear());

  it("moves the first stored id into need and clears chosen", () => {
    window.localStorage.setItem(V3_COMPLETED_KEY, JSON.stringify([v3WithSupport]));
    migrateLegacyStorage();
    const [session] = loadCompleted();
    expect(session.support?.need).toBe("pace"); // settle-body was renamed
    expect(session.support?.chosen).toEqual([]);
    expect(session.support?.choicesByNeed).toBeUndefined();
  });

  it("leaves everything else about the session alone", () => {
    window.localStorage.setItem(V3_COMPLETED_KEY, JSON.stringify([v3WithSupport]));
    migrateLegacyStorage();
    const [session] = loadCompleted();
    expect(session.id).toBe("v3-1");
    expect(session.quickCheck?.affect).toEqual({ valence: 0.25, activation: 1 });
    expect(session.quickCheck?.selected.map((item) => item.label)).toEqual(["짜증"]);
    expect(session.synthesisFeedback).toEqual({ fit: "partly" });
  });

  it("leaves a session that never opened the support screen untouched", () => {
    window.localStorage.setItem(V3_COMPLETED_KEY, JSON.stringify([{ ...v3WithSupport, support: undefined }]));
    migrateLegacyStorage();
    expect(loadCompleted()[0].support).toBeUndefined();
  });

  it("moves a draft parked on a renamed coach screen to the new one", () => {
    window.localStorage.setItem(V3_DRAFT_KEY, JSON.stringify({ ...v3WithSupport, status: "draft", completedAt: undefined, stage: "context-contrast" }));
    migrateLegacyStorage();
    expect(loadDraft()?.stage).toBe("coach-words");
  });

  it("clears the v3 keys so the move runs once", () => {
    window.localStorage.setItem(V3_COMPLETED_KEY, JSON.stringify([v3WithSupport]));
    expect(migrateLegacyStorage()).toBeGreaterThan(0);
    expect(window.localStorage.getItem(V3_COMPLETED_KEY)).toBeNull();
    expect(migrateLegacyStorage()).toBe(0);
    expect(loadCompleted()).toHaveLength(1);
  });
});
