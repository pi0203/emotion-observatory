import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import EnglishPage from "../app/(en)/en/page";
import EnglishStatus from "../app/(en)/en/EnglishStatus";
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

  it("shows the English app in a production build, since the owner opened English (2026-10-19)", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(EnglishPage());
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/Before you name it/); // placeholder title since 2026-10-30
    // the only Korean on the English landing is the name of the other language, on the switch
    expect(document.body.textContent?.replace("한국어", "")).not.toMatch(HANGUL);
  });

  it("keeps the development status frame plain English, with no Korean in its place", () => {
    render(<EnglishStatus />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toMatch(/\/en/);
    expect(screen.getAllByText("written")).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(HANGUL);
  });

  it("gives English its own title, description and address, and names both languages", () => {
    const en = metadataFor("en");
    expect(en).toMatchObject({ title: "Emotion Observatory", alternates: { canonical: "/en", languages: { ko: "/", en: "/en" } } });
    expect(en.openGraph).toMatchObject({ locale: "en_US", url: "/en" });
    expect(en.robots).toBeUndefined();
    expect(String(en.description)).not.toMatch(HANGUL);
    const ko = metadataFor("ko");
    expect(ko).toMatchObject({ title: "감정 관찰실 · Emotion Observatory", description: "몸, 상황, 의미를 천천히 구별해보는 자기관찰 도구" });
    // the share card and canonical address point at the public site, not at a preview
    expect(String(ko.metadataBase)).toBe("https://emotion-observatory.vercel.app/");
    expect(ko.alternates?.canonical).toBe("/");
    expect(ko.openGraph).toMatchObject({ title: "감정 관찰실 · Emotion Observatory", siteName: "감정 관찰실", locale: "ko_KR", url: "/" });
    expect(ko.twitter).toMatchObject({ title: "감정 관찰실 · Emotion Observatory" });
    expect(en.openGraph).toMatchObject({ title: "Emotion Observatory" });
    expect(en.twitter).toMatchObject({ title: "Emotion Observatory" });
    expect(ko.alternates).toMatchObject({ languages: { ko: "/", en: "/en" } });
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

  it("frames it in English but keeps the words exactly as they were stored", () => {
    const record = koreanRecord();
    // the record's words are never translated or dropped (docs/I18N_PLAN.md stage E)
    expect(summarise(record, "en").words).toEqual(["짜증", "억울함"]);
    expect(summarise(record, "en").depthLabel).toBe("Quick look");
    const synthesis = buildSynthesis(record, "en");
    expect(synthesis.lead).toMatch(/^Putting together/);
    expect(JSON.stringify(synthesis)).toMatch(/짜증/);
    expect(formatWhen(record.createdAt, "en")).not.toMatch(HANGUL);
    // the Korean screen reads the same record exactly as before
    expect(summarise(record).words).toEqual(["짜증", "억울함"]);
  });
});

describe("the English document", () => {
  it("uses the same type as Korean, so headings stay in the serif face", () => {
    const layout = readFileSync(join(__dirname, "../app/(en)/en/layout.tsx"), "utf8");
    expect(layout).toMatch(/<html lang="en" className=\{fontVariables\}>/);
  });
});
