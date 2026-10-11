import { beforeEach, describe, expect, it } from "vitest";
import { localeOf } from "../lib/i18n";
import { coachResult, coachSetFor } from "../lib/coach";
import { getLegacyStorageKeys, migrateLegacyStorage, migrateSession } from "../lib/migrations";
import { summarise } from "../lib/records";
import { createSession, sessionReducer, type EmotionSession } from "../lib/session-types";
import { getStorageKeys, loadCompleted, loadDraft, persistSession } from "../lib/storage";
import { buildSynthesis } from "../lib/synthesis";

/** A completed record exactly as the app stored it before `locale` existed. */
const savedBeforeLocale = (): EmotionSession => ({
  id: "old-1",
  createdAt: "2026-09-30T05:00:00.000Z",
  completedAt: "2026-09-30T05:03:00.000Z",
  status: "completed",
  stage: "quick-summary",
  entry: "quick",
  quickCheck: {
    affect: { valence: 0.2, activation: 0.8 },
    candidatePool: [{ label: "짜증", source: "suggested" }],
    selected: [{ label: "짜증", source: "suggested" }, { label: "억울함", source: "suggested" }],
    endedAt: "2026-09-30T05:03:00.000Z",
  },
  support: { need: "sort-thoughts", chosen: [] },
  coach: { origin: "example-practice", setId: "friction-unfair-stuck", wordsBefore: ["짜증"], appraisals: ["none"], wordsAfter: ["여러 개"] },
});

describe("records and their language", () => {
  beforeEach(() => localStorage.clear());

  it("reads a record with no locale as Korean", () => {
    const old = savedBeforeLocale();
    expect("locale" in old).toBe(false);
    expect(localeOf(old)).toBe("ko");
    expect(localeOf(undefined)).toBe("ko");
    expect(localeOf({ locale: "fr" })).toBe("ko");
  });

  it("loads an old stored record unchanged, under the same key, and reads it in Korean", () => {
    const { COMPLETED_KEY } = getStorageKeys();
    localStorage.setItem(COMPLETED_KEY, JSON.stringify([savedBeforeLocale()]));
    const [loaded] = loadCompleted();
    expect(loaded).toEqual(savedBeforeLocale());
    expect(localeOf(loaded)).toBe("ko");

    const summary = summarise(loaded);
    expect(summary.depthLabel).toBe("빠른 확인");
    expect(summary.words).toEqual(["짜증", "억울함"]);

    const synthesis = buildSynthesis(loaded);
    expect(synthesis.lead).toBe("당신이 고른 내용을 연결하면 이렇게 정리해볼 수 있습니다.");
    expect(synthesis.observed.map((line) => line.text)).toContain("가까운 말로는 “짜증”, “억울함”을 골랐습니다.");

    expect(coachSetFor(loaded)?.words).toContain("짜증");
    expect(coachResult(loaded)?.observations).toEqual(["어느 것도 아니다."]);
  });

  it("migrates older versions without adding a locale, and they still read as Korean", () => {
    const migrated = migrateSession({ id: "v1", createdAt: "2026-09-01T00:00:00.000Z", mode: "quick" } as Parameters<typeof migrateSession>[0]);
    expect(migrated.locale).toBeUndefined();
    expect(localeOf(migrated)).toBe("ko");

    const { V3_COMPLETED_KEY } = getLegacyStorageKeys();
    localStorage.setItem(V3_COMPLETED_KEY, JSON.stringify([{ ...savedBeforeLocale(), id: "v3" }]));
    migrateLegacyStorage();
    const fromV3 = loadCompleted().find((item) => item.id === "v3");
    expect(fromV3).toBeDefined();
    expect(localeOf(fromV3)).toBe("ko");
  });

  it("writes the current locale into a new record and keeps it through saving", () => {
    expect(createSession().locale).toBe("ko");
    const started = sessionReducer(createSession(), { type: "START_QUICK", locale: "ko" });
    expect(started.locale).toBe("ko");
    persistSession(started);
    expect(loadDraft()?.locale).toBe("ko");

    const deep = sessionReducer(createSession(), { type: "START_DEEP" });
    expect(deep.locale).toBe("ko");
  });

  it("does not add a locale to a record resumed from before", () => {
    const old = { ...savedBeforeLocale(), status: "draft" as const };
    const resumed = sessionReducer(createSession(), { type: "RESUME", session: old });
    expect(resumed.locale).toBeUndefined();
    expect(localeOf(resumed)).toBe("ko");
  });
});
