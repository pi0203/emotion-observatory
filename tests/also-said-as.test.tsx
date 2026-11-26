import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import EmotionApp from "../app/emotion-app";
import emotions from "../data/emotions.ko.json";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";
import { getStorageAdapter } from "../lib/storage-adapter";
import { buildExport, serializeExport } from "../lib/record-transfer";
import { revealWords, startDeep, startQuick } from "./helpers/start";

/**
 * 이렇게도 말해요 (owner's decision 2026-11-01, (나)): after 단어 보기, each
 * picked list word with dictionary expressions gets one plain line under the
 * chips, and the source is said once. Nothing of it is pressed or stored.
 */
const lineOf = (label: string) => {
  const texts = (emotions.items as { label: string; expressions?: { text: string }[] }[]).find((item) => item.label === label)!.expressions!.map((expression) => expression.text);
  return `${label} · ${ko.words.alsoSaidAs}: ${texts.join(", ")}`;
};
const block = () => document.querySelector(".also-said");
const pick = (label: string) => fireEvent.click(screen.getByRole("button", { name: label }));

/** The quick look's word step; the keyboard puts the spot in the middle, where 못마땅함, 감동 and 자책 are offered (the Korean study order, 2026-11-26). */
const toQuickWords = () => {
  render(<Home />);
  startQuick();
  fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.common.next}`) }));
};

describe("이렇게도 말해요 under the picked words", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("shows no expression before 단어 보기", () => {
    toQuickWords();
    expect(block()).toBeNull();
    expect(screen.queryByText(new RegExp(ko.words.alsoSaidAs))).toBeNull();
    expect(screen.queryByText(ko.words.expressionSource)).toBeNull();
  });

  it("shows 못마땅함's expressions and the source once 못마땅함 is picked, as plain text", () => {
    toQuickWords();
    revealWords();
    pick("못마땅함");
    expect(lineOf("못마땅함")).toBe("못마땅함 · 이렇게도 말해요: 눈이 시다, 배알이 꼴리다, 비위가 사납다");
    expect(screen.getByText(lineOf("못마땅함"))).toBeTruthy();
    expect(block()!.textContent).toContain("눈이 시다");
    expect(block()!.textContent).toContain("배알이 꼴리다");
    expect(screen.getAllByText(ko.words.expressionSource)).toHaveLength(1);
    // nothing to press or follow
    expect(block()!.querySelectorAll("button, a, input, [role=button], [tabindex]")).toHaveLength(0);
  });

  it("puts one line per word in the order picked, with the source said once under them", () => {
    toQuickWords();
    revealWords();
    pick("감동");
    pick("못마땅함");
    const lines = [...block()!.querySelectorAll("p")].map((p) => p.textContent);
    expect(lines).toEqual([lineOf("감동"), lineOf("못마땅함"), ko.words.expressionSource]);
  });

  it("takes the line away when the word is unpicked", () => {
    toQuickWords();
    revealWords();
    pick("못마땅함");
    expect(block()).not.toBeNull();
    pick("못마땅함");
    expect(block()).toBeNull();
    expect(screen.queryByText(ko.words.expressionSource)).toBeNull();
  });

  it("shows neither a line nor the source for a word without expressions (자책)", () => {
    expect((emotions.items as { label: string; expressions?: unknown }[]).find((item) => item.label === "자책")!.expressions).toBeUndefined();
    toQuickWords();
    revealWords();
    pick("자책");
    expect(block()).toBeNull();
    expect(screen.queryByText(new RegExp(ko.words.alsoSaidAs))).toBeNull();
    expect(screen.queryByText(ko.words.expressionSource)).toBeNull();
  });

  it("shows nothing for a word the person wrote, even when it is spelled like a list word", () => {
    toQuickWords();
    revealWords();
    fireEvent.change(screen.getByLabelText(ko.common.ownWordsPlaceholder), { target: { value: "답답함" } });
    fireEvent.click(screen.getByRole("button", { name: ko.words.add }));
    expect(screen.getByText(ko.words.mine)).toBeTruthy();
    expect(block()).toBeNull();
  });

  it("works the same on the slower look's word step", () => {
    render(<Home />);
    startDeep();
    fireEvent.click(screen.getByRole("button", { name: /조금 살펴보고 싶어요/ }));
    for (let step = 0; step < 4; step += 1) fireEvent.click(screen.getAllByRole("button", { name: ko.common.skip })[0]); // body, affect, context, meaning
    expect(block()).toBeNull();
    revealWords();
    pick("못마땅함");
    expect(screen.getByText(lineOf("못마땅함"))).toBeTruthy();
    expect(screen.getAllByText(ko.words.expressionSource)).toHaveLength(1);
    pick("못마땅함");
    expect(block()).toBeNull();
  });

  it("does not appear on the English screen", () => {
    render(<EmotionApp locale="en" />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${en.landing.start}`) }));
    fireEvent.keyDown(document.querySelector(".affect-grid")!, { key: "Enter" });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${en.common.next}`) }));
    fireEvent.click(screen.getByRole("button", { name: en.words.reveal }));
    const chips = [...document.querySelectorAll<HTMLButtonElement>(".chip-grid .chip")];
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) fireEvent.click(chip);
    expect(chips.every((chip) => chip.getAttribute("aria-pressed") === "true")).toBe(true);
    expect(block()).toBeNull();
    expect(screen.queryByText(new RegExp(en.words.alsoSaidAs))).toBeNull();
    expect(screen.queryByText(en.words.expressionSource)).toBeNull();
  });

  it("keeps no expression in the saved record, in storage or in the export file", () => {
    toQuickWords();
    revealWords();
    pick("감동");
    pick("못마땅함");
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${ko.quickCandidates.finish}`) }));
    const [saved] = getStorageAdapter().loadCompleted();
    expect(saved.quickCheck?.selected).toEqual([{ label: "감동", source: "suggested" }, { label: "못마땅함", source: "suggested" }]);

    const allExpressions = (emotions.items as { expressions?: { text: string; dict: string }[] }[]).flatMap((item) => item.expressions ?? []);
    const stored = Object.keys(window.localStorage).map((key) => window.localStorage.getItem(key) ?? "").join("\n");
    const exported = serializeExport(buildExport(getStorageAdapter().loadCompleted()));
    for (const text of [JSON.stringify(saved), stored, exported]) {
      expect(text).not.toMatch(/expressions|wordNo|alsoSaid|표준국어대사전/);
      for (const expression of allExpressions) {
        expect(text).not.toContain(expression.text);
        expect(text).not.toContain(expression.dict);
      }
    }
  });
});
