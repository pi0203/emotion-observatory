import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko, type Messages } from "../lib/i18n/messages.ko";
import { en, pendingReview, reviewStatus } from "../lib/i18n/messages.en";

/**
 * The crisis card at the bottom of the landing. The three Korean lines must be
 * there, with the right numbers, and each must dial that number. If a number is
 * changed or removed, this fails.
 */
const KOREAN_LINES = [
  { name: "자살예방상담전화", number: "109", href: "tel:109" },
  { name: "정신건강위기상담전화", number: "1577-0199", href: "tel:1577-0199" },
  { name: "청소년상담전화", number: "1388", href: "tel:1388" },
];

describe("crisis card on the landing", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(cleanup);

  it("lists exactly the three Korean helplines, each dialling its own number", () => {
    render(<Home />);
    const card = screen.getByRole("complementary", { name: ko.crisis.title });
    const links = within(card).getAllByRole("link");
    expect(links).toHaveLength(3);
    links.forEach((link, index) => {
      const line = KOREAN_LINES[index];
      expect(link.textContent).toContain(line.name);
      expect(link.querySelector("strong")?.textContent).toBe(line.number);
      expect(link.getAttribute("href")).toBe(line.href);
    });
  });

  it("keeps the numbers in the Korean messages", () => {
    expect([ko.crisis.num109, ko.crisis.num1577, ko.crisis.num1388]).toEqual(["109", "1577-0199", "1388"]);
    expect([ko.crisis.href109, ko.crisis.href1577, ko.crisis.href1388]).toEqual(["tel:109", "tel:1577-0199", "tel:1388"]);
  });

  it("comes right after the about section, whose last sentence says it is not a crisis service", () => {
    render(<Home />);
    const card = screen.getByRole("complementary", { name: ko.crisis.title });
    const about = card.previousElementSibling;
    expect(about?.classList.contains("about")).toBe(true);
    expect(about?.lastElementChild?.textContent).toContain("위기 상담 도구가 아니고");
  });
});

/** Every string under `crisis`, joined, for one language. */
const crisisText = (messages: Messages) => Object.values(messages.crisis).join("\n");
/** The numbers the owner checked against official sources on 2026-10-13 (SAFETY.md). */
const KOREAN_NUMBERS = ["119", "112", "109", "1577-0199", "1388"];
/** US lines the English draft used to carry. None may come back. */
const US_LINES = /988|741741|findahelpline|crisis text line|lifeline \(us/i;

describe("crisis card wording (owner, 2026-10-13)", () => {
  afterEach(cleanup);

  it("puts the emergency line first, then the intro, then the three lines, in Korean", () => {
    expect(ko.crisis.emergency).toBe("몸을 다쳤거나 지금 당장 위험하다면 <b>119</b>(구급) 또는 <b>112</b>(경찰)에 바로 연락하세요.");
    expect(ko.crisis.intro).toBe("이야기를 나눌 사람이 필요하다면, 24시간 열려 있는 상담 전화가 있습니다.");
    expect([ko.crisis.lifeline109, ko.crisis.mental1577, ko.crisis.youth1388]).toEqual([
      "자살예방상담전화 (24시간)", "정신건강위기상담전화 (24시간)", "청소년상담전화 (9~24세)",
    ]);
    render(<Home />);
    const card = screen.getByRole("complementary", { name: ko.crisis.title });
    const [emergency, intro] = Array.from(card.children);
    expect(emergency.textContent).toBe("몸을 다쳤거나 지금 당장 위험하다면 119(구급) 또는 112(경찰)에 바로 연락하세요.");
    expect(Array.from(emergency.querySelectorAll("strong")).map((node) => node.textContent)).toEqual(["119", "112"]);
    expect(intro.textContent).toBe(ko.crisis.intro);
  });

  for (const [name, messages] of [["Korean", ko], ["English", en]] as const) {
    it(`${name}: carries 119, 112, 109, 1577-0199 and 1388 exactly as written, and no US line`, () => {
      const text = crisisText(messages);
      for (const number of KOREAN_NUMBERS) expect(text, number).toContain(number);
      expect([messages.crisis.num109, messages.crisis.num1577, messages.crisis.num1388]).toEqual(["109", "1577-0199", "1388"]);
      expect([messages.crisis.href109, messages.crisis.href1577, messages.crisis.href1388]).toEqual(["tel:109", "tel:1577-0199", "tel:1388"]);
      expect(messages.crisis.emergency).toMatch(/<b>119<\/b>.*<b>112<\/b>/);
      expect(text).not.toMatch(US_LINES);
    });
  }

  it("English keeps the meaning of (24시간) and (9~24세)", () => {
    expect(en.crisis.lifeline109).toMatch(/\(24 hours\)$/);
    expect(en.crisis.mental1577).toMatch(/\(24 hours\)$/);
    expect(en.crisis.youth1388).toMatch(/\(ages 9 to 24\)$/);
  });

  it("opens English only with nothing left pending, and still does not draw the outside-Korea line", () => {
    // reviewed by the owner with the rest of the English on 2026-10-19
    expect(en.crisis.emergency).toBe("If you are hurt or in immediate danger, call <b>119</b> (ambulance) or <b>112</b> (police) right away.");
    // English cannot be marked reviewed while a sentence is still waiting for the owner.
    if (reviewStatus === "reviewed") expect(pendingReview.keys).toEqual([]);
    // the outside-Korea sentence is a separate decision (SAFETY.md): written, but used nowhere
    expect(pendingReview.outsideKorea).toBe("If you are outside Korea, please contact your local emergency number.");
    const app = readFileSync(join(__dirname, "../app/emotion-app.tsx"), "utf8");
    expect(app).not.toMatch(/outsideKorea/);
  });

  it("uses no warning colour and no icon", () => {
    render(<Home />);
    const card = screen.getByRole("complementary", { name: ko.crisis.title });
    expect(card.querySelector("svg, img, [role='img'], [aria-hidden='true']")).toBeNull();
    expect(card.textContent).not.toMatch(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u26A0]/u);
    // Every CSS rule that styles the card: no coral, red, warning or error tokens, and no drawn icon.
    const css = readFileSync(join(__dirname, "../app/globals.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const rules = css.match(/[^{}]*crisis[^{}]*\{[^}]*\}/g) ?? [];
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule).not.toMatch(/--pick-underline|--site-hover|danger|warn|error|alert|\bred\b|#f{1,2}0{2,4}\b|(?<![-\w])content\s*:/i);
    }
  });
});

describe("helpline links", () => {
  it("never dials something that is not a phone number", () => {
    for (const messages of [ko, en]) {
      for (const href of [messages.crisis.href109, messages.crisis.href1577, messages.crisis.href1388]) {
        if (href.startsWith("tel:")) expect(href).toMatch(/^tel:[\d-]+$/);
        else expect(href).toMatch(/^(sms:\d+|https:\/\/)/);
      }
    }
  });
});
