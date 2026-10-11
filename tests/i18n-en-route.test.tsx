import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import EnglishPage from "../app/(en)/en/page";
import { coachSetFor } from "../lib/coach";
import { localeOf } from "../lib/i18n";
import { metadataFor } from "../lib/i18n/metadata";
import { formatWhen, summarise } from "../lib/records";
import type { EmotionSession } from "../lib/session-types";
import { getStorageKeys } from "../lib/storage";
import { buildSynthesis } from "../lib/synthesis";

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/;

/** A record written on the Korean screen, as it sits in storage. */
const koreanRecord = (): EmotionSession => ({
  id: "ko-1",
  createdAt: "2026-10-01T09:00:00.000Z",
  completedAt: "2026-10-01T09:04:00.000Z",
  status: "completed",
  stage: "quick-summary",
  entry: "quick",
  locale: "ko",
  quickCheck: { affect: { valence: 0.2, activation: 0.8 }, candidatePool: [], selected: [{ label: "짜증", source: "suggested" }, { label: "억울함", source: "suggested" }] },
  support: { need: "sort-thoughts", chosen: [] },
});

describe("/en route", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("renders the 404 page in a production build", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => EnglishPage()).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it("opens in development and says plainly what is not written, with no Korean in its place", () => {
    vi.stubEnv("NODE_ENV", "development");
    render(EnglishPage());
    expect(screen.getByRole("heading", { level: 1, name: "/en is not written yet" })).toBeTruthy();
    expect(screen.getAllByText("not written")).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(HANGUL);
  });

  it("names itself as unwritten in the tab instead of borrowing the Korean title", () => {
    expect(metadataFor("en").title).toBe("[en] messages not written");
    expect(String(metadataFor("en").description)).not.toMatch(HANGUL);
    expect(metadataFor("ko")).toEqual({ title: "감정 관찰실", description: "몸, 상황, 의미를 천천히 구별해보는 자기관찰 도구" });
  });
});

describe("the English screen meeting a record written in Korean", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("leaves Korean records in storage untouched: it neither reads them into view nor writes", () => {
    const { COMPLETED_KEY } = getStorageKeys();
    const stored = JSON.stringify([koreanRecord()]);
    window.localStorage.setItem(COMPLETED_KEY, stored);
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    const removeItem = vi.spyOn(Storage.prototype, "removeItem");
    vi.stubEnv("NODE_ENV", "development");
    render(EnglishPage());
    expect(document.body.textContent).not.toMatch(/짜증|억울함/);
    expect(setItem).not.toHaveBeenCalled();
    expect(removeItem).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(COMPLETED_KEY)).toBe(stored);
  });

  it("still knows the record is Korean, and finds its coach set in Korean content", () => {
    const record = koreanRecord();
    expect(localeOf(record)).toBe("ko");
    expect(coachSetFor(record)?.words).toContain("짜증");
  });

  it("refuses to describe it in English words that do not exist yet, rather than quietly using Korean", () => {
    const record = koreanRecord();
    expect(() => summarise(record, "en")).toThrow(/No messages for locale "en"/);
    expect(() => buildSynthesis(record, "en")).toThrow(/No messages for locale "en"/);
    expect(() => formatWhen(record.createdAt, "en")).toThrow(/No messages for locale "en"/);
    // the Korean screen reads the same record exactly as before
    expect(summarise(record).words).toEqual(["짜증", "억울함"]);
  });
});
