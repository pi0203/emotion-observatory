// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import emotionsEn from "../data/emotions.en.json";
import emotionsKo from "../data/emotions.ko.json";
import needsEn from "../data/needs.en.json";
import needsKo from "../data/needs.ko.json";
import granularityEn from "../data/granularity.en.json";
import granularityKo from "../data/granularity.ko.json";
import { reviewStatus } from "../lib/i18n/messages.en";

const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힣]/;
const EN_FILES = ["body-signals", "concern-tags", "concerns", "emotions", "granularity", "needs", "step-notes"].map((name) => `data/${name}.en.json`);

describe("English content drafts (data/*.en.json, 2026-10-19)", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

  it("are written in English and marked as drafts", () => {
    for (const file of EN_FILES) {
      const text = readFileSync(file, "utf8");
      expect(text, file).not.toMatch(HANGUL);
      expect(text, file).not.toMatch(/—/);
      const json = JSON.parse(text);
      if (!Array.isArray(json)) expect(String(json.note), file).toMatch(/^DRAFT/);
    }
  });

  it("keep every word's neighbours inside the English vocabulary", () => {
    const labels = new Set(emotionsEn.items.map((item) => item.label));
    for (const item of emotionsEn.items) for (const neighbour of item.neighbors ?? []) expect(labels.has(neighbour), `${item.label} → ${neighbour}`).toBe(true);
  });

  it("keep the ids the code relies on", () => {
    expect(needsEn.needs.map((need) => need.id)).toEqual(needsKo.needs.map((need) => need.id));
    expect(granularityEn.sets.map((set) => set.id)).toEqual(granularityKo.sets.map((set) => set.id));
    const families = (items: { family?: string }[]) => [...new Set(items.map((item) => item.family))].sort();
    expect(families(emotionsEn.items)).toEqual(families(emotionsKo.items));
  });

  it("stay off in production until the owner marks the English as reviewed", async () => {
    expect(reviewStatus).toBe("draft");
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { englishAvailable } = await import("../lib/i18n/availability");
    const { hasContent } = await import("../lib/content");
    const { hasMessages } = await import("../lib/i18n/t");
    expect(englishAvailable()).toBe(false);
    expect(hasContent("en")).toBe(false);
    expect(hasMessages("en")).toBe(false);
  });

  it("open on the development server so the drafts can be read in place", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.resetModules();
    const { hasContent } = await import("../lib/content");
    const { hasMessages } = await import("../lib/i18n/t");
    expect(hasContent("en")).toBe(true);
    expect(hasMessages("en")).toBe(true);
  });
});
