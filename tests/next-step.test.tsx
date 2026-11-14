// 2026-11-14 본인 답(2 (Korea) 넣기)으로 영어 두 줄 바꿈
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import Home from "../app/(ko)/page";
import EnglishPage from "../app/(en)/en/page";
import { ko } from "../lib/i18n/messages.ko";
import { en } from "../lib/i18n/messages.en";

/**
 * The next step for someone not in crisis, right under the crisis card on the
 * landing, and the one stage line (owner's approval 2026-11-10). The wording is
 * the instruction's, character for character; sources are in SAFETY.md.
 */
const KO = [
  "위기는 아니지만, 혼자 감당하기 어렵다면",
  "사는 곳의 정신건강복지센터에서 우울·불안·스트레스 상담과 검사를 무료로 받을 수 있어요. 시·군·구마다 있고, 평일 9시부터 18시까지예요. 어디인지 모르겠다면 1577-0199에 걸어 보세요. 휴대전화가 있는 곳에서 가까운 센터로 이어져요.",
  "정신건강복지센터나 대학 상담센터에서 심리상담이 필요하다는 의뢰서를 받으면, 전문 심리상담을 8회까지 지원받을 수 있어요(정신건강 심리상담 바우처, 문의 129). 본인 부담은 소득에 따라 달라요.",
  "여기서 기록하는 대신 사람에게 먼저 가는 것도 잘 고른 길이에요.",
  "번호와 제도는 보건복지부 누리집에서 2026-11-10에 확인했습니다.",
];
const EN = [
  "Not in crisis, but hard to carry alone",
  "Your local mental health welfare center (정신건강복지센터) offers free counseling and screening for depression, anxiety and stress. There is one in every city, county and district, open weekdays 9:00 to 18:00. If you don’t know which one is yours, call 1577-0199 (Korea); it connects you to a center near where your phone is.",
  "With a referral from a mental health welfare center or a university counseling center, you can get up to eight sessions of professional counseling through the national counseling voucher (ask 129 in Korea). How much you pay depends on your income.",
  "Going to a person first, instead of writing here, is also a good choice.",
  "Numbers and programs checked on the Ministry of Health and Welfare website on 2026-11-10.",
];
const STAGE_KO = "개념 시제품입니다. 연구나 전문가 검토를 거치기 전, 아이디어를 보여 주려고 만든 시험판입니다.";
const STAGE_EN = "This is a concept prototype: a trial version made to show an idea before research or expert review.";

const count = (text: string, part: string) => text.split(part).length - 1;

describe("next step under the crisis card", () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

  it("keeps the wording exactly as approved, in both languages", () => {
    const { title, center, voucher, person, checked } = ko.nextStep;
    expect([title, center, voucher, person, checked]).toEqual(KO);
    expect([en.nextStep.title, en.nextStep.center, en.nextStep.voucher, en.nextStep.person, en.nextStep.checked]).toEqual(EN);
    expect(ko.about.stage).toBe(STAGE_KO);
    expect(en.about.stage).toBe(STAGE_EN);
  });

  it.each([
    ["Korean", () => render(<Home />), ko.crisis.title, KO, STAGE_KO],
    ["English", () => { vi.stubEnv("NODE_ENV", "production"); render(EnglishPage()); }, en.crisis.title, EN, STAGE_EN],
  ] as const)("%s landing: sits right under the crisis card, as text with no links, and shows the stage line once", (_name, show, cardName, lines, stage) => {
    show();
    const card = screen.getByRole("complementary", { name: cardName });
    const next = card.nextElementSibling as HTMLElement;
    expect(next.classList.contains("next-step")).toBe(true);
    expect(next.querySelector("h2")?.textContent).toBe(lines[0]);
    expect([...next.querySelectorAll("p")].map((p) => p.textContent)).toEqual(lines.slice(1));
    expect(next.querySelectorAll("a, button, input, select")).toHaveLength(0);
    expect(count(document.body.textContent ?? "", stage)).toBe(1);
  });
});
