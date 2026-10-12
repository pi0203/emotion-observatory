import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import Home from "../app/(ko)/page";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";

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

describe("English crisis card (English is off; the strings are drafted)", () => {
  it("calls 988, texts HOME to 741741, and links to findahelpline.com as a web page", () => {
    expect(en.crisis.href109).toBe("tel:988");
    expect(en.crisis.href1577).toMatch(/^sms:741741\?&body=HOME$/);
    expect(en.crisis.href1388).toBe("https://findahelpline.com");
  });

  it("never dials something that is not a phone number", () => {
    for (const messages of [ko, en]) {
      for (const href of [messages.crisis.href109, messages.crisis.href1577, messages.crisis.href1388]) {
        if (href.startsWith("tel:")) expect(href).toMatch(/^tel:[\d-]+$/);
        else expect(href).toMatch(/^(sms:\d+|https:\/\/)/);
      }
    }
  });
});
