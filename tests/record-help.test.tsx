import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import Home from "../app/(ko)/page";
import EnglishPage from "../app/(en)/en/page";
import Terms from "../app/(ko)/terms/page";
import Words from "../app/(ko)/words/page";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";
import { getStorageKeys } from "../lib/storage";
import type { EmotionSession } from "../lib/session-types";

/**
 * 도움 on every card of 「지난 기록」 and at the top of a record (2026-11-10).
 * Every card carries one and the same, whatever the record says: nothing is read
 * for risk (SAFETY.md). Pressing it opens the header's help card, not the record.
 */
const record = (id: string, text: string, locale: "ko" | "en" = "ko", minute = 0): EmotionSession => ({
  id, createdAt: `2026-11-0${3 + minute}T02:00:00.000Z`, completedAt: `2026-11-0${3 + minute}T02:05:00.000Z`, status: "completed",
  stage: "quick-summary", entry: "quick", locale,
  quickCheck: { affect: { valence: 0.2, activation: 0.8 }, candidatePool: [], selected: [], context: { eventText: text } },
});
const KO_TEXTS = ["버스를 놓쳤다", "죽고 싶어", "아무 일도 없었다", "자해하고 싶다는 생각이 들었다"];
const EN_TEXTS = ["Missed the bus", "I want to die", "Nothing happened"];

const store = (records: EmotionSession[]) => window.localStorage.setItem(getStorageKeys().COMPLETED_KEY, JSON.stringify(records));
const openKoRecords = (records: EmotionSession[]) => {
  store(records);
  render(<Home />);
  fireEvent.click(screen.getByRole("button", { name: ko.landing.records }));
};
const openEnRecords = (records: EmotionSession[]) => {
  store(records);
  render(EnglishPage());
  fireEvent.click(screen.getByRole("button", { name: en.landing.records }));
};

describe("도움 on every record card", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

  for (const [name, open, texts, messages, locale] of [
    ["Korean", openKoRecords, KO_TEXTS, ko, "ko"],
    ["English", openEnRecords, EN_TEXTS, en, "en"],
  ] as const) {
    it(`${name}: each card has exactly one, the same whatever the record says`, () => {
      if (locale === "en") vi.stubEnv("NODE_ENV", "production");
      open(texts.map((text, index) => record(`r${index}`, text, locale, index)));
      const cards = Array.from(document.querySelectorAll(".record-list > .record-card"));
      expect(cards).toHaveLength(texts.length);
      const helps = cards.map((card) => {
        const found = card.querySelectorAll(".record-help");
        expect(found).toHaveLength(1);
        // a sibling of the card's own button, never inside it
        expect(found[0].closest(".record-row")).toBeNull();
        return found[0];
      });
      expect(new Set(helps.map((help) => help.outerHTML)).size).toBe(1);
      expect(helps[0].textContent).toBe(messages.common.helpShort);
      expect(helps[0].getAttribute("aria-label")).toBe(messages.common.helpLink);
      // same place in every card: last child, after the record's button
      for (const card of cards) expect(card.lastElementChild!.className).toBe("record-help");
    });

    it(`${name}: opens the help card and stays on the list`, () => {
      if (locale === "en") vi.stubEnv("NODE_ENV", "production");
      open(texts.map((text, index) => record(`r${index}`, text, locale, index)));
      const cards = document.querySelectorAll(".record-card");
      fireEvent.click(cards[1].querySelector(".record-help")!);
      const dialog = screen.getByRole("dialog", { name: messages.crisis.title });
      expect(dialog.querySelector(".crisis-card")).toBeTruthy();
      expect(within(dialog).getByText(messages.crisis.mental1577)).toBeTruthy();
      // the record did not open behind it
      expect(document.querySelectorAll(".record-card")).toHaveLength(texts.length);
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(messages.records.title);
    });
  }

  it("sits at the top of a record too, the same whatever the record says", () => {
    const tops: string[] = [];
    for (const text of ["버스를 놓쳤다", "죽고 싶어"]) {
      openKoRecords([record("a", text)]);
      fireEvent.click(document.querySelector(".record-row")!);
      const top = document.querySelector("section.screen .record-detail-top")!;
      expect(top).toBeTruthy();
      expect(top.querySelectorAll(".record-help")).toHaveLength(1);
      tops.push(top.outerHTML);
      fireEvent.click(top.querySelector(".record-help")!);
      expect(screen.getByRole("dialog", { name: ko.crisis.title })).toBeTruthy();
      cleanup();
      window.localStorage.clear();
    }
    expect(tops[0]).toBe(tops[1]);
  });

  it("reads nothing in a record in the code that draws it", () => {
    const source = readFileSync("app/emotion-app.tsx", "utf8");
    const start = source.indexOf("function RecordHelp(");
    const body = source.slice(start, source.indexOf("\n}\n", start));
    expect(body).not.toMatch(/session|text|keyword|risk|words/i);
  });
});

/** 1577-0199 goes by the ministry's name everywhere (mohw.go.kr, 2026-11-10). */
const OLD_NAME = "정신건강 상담전화";
const NEW_NAME = "정신건강 위기상담전화";

describe("the 1577-0199 name", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("is the new one on the landing, in the help card, on /terms and on /words", () => {
    render(<Home />);
    expect(document.body.textContent).not.toContain(OLD_NAME);
    expect(document.body.textContent).toContain(NEW_NAME);
    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: ko.common.helpLink }));
    expect(screen.getByRole("dialog", { name: ko.crisis.title }).textContent).toContain(NEW_NAME);
    expect(document.body.textContent).not.toContain(OLD_NAME);
    cleanup();
    for (const Page of [Terms, Words]) {
      render(<Page />);
      expect(document.body.textContent).not.toContain(OLD_NAME);
      expect(document.body.textContent).toContain(NEW_NAME);
      cleanup();
    }
  });

  it("is in no text the screens draw from", () => {
    const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : [path];
    });
    for (const path of [...files("app"), ...files("lib"), ...files("data")].filter((p) => /\.(tsx?|json)$/.test(p))) {
      const text = readFileSync(path, "utf8");
      expect(text, path).not.toContain(OLD_NAME);
      expect(text, path).not.toContain("Mental Health Counseling Line");
    }
  });
});

describe("the practitioner fold", () => {
  afterEach(cleanup);
  it("says nothing leaves the device, with no 「로그인하지 않으면」", () => {
    render(<Home />);
    expect(document.body.textContent).toContain("적은 내용은 이 기기 밖 어디로도 보내지지 않습니다.");
    expect(document.body.textContent).not.toContain("로그인하지 않으면");
  });
});
