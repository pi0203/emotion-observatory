import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import BreadPrototype from "../app/proto/bread/BreadPrototype";
import BreadPrototypePage from "../app/proto/bread/page";

const SCENARIO_TITLES = ["중요한 발표 직전", "롤러코스터 꼭대기", "동료의 부당한 성과 가로채기", "비 오는 늦은 밤 서재", "인적이 끊긴 낯선 방"];

const NO_SETTLED_FEELING = /구워져 나온 감정/;
const NO_PHYSIOLOGY_CLAIM = /물리적으로 거의 동일|완벽히 동일/;
const NO_FINGERPRINT = /지문|fingerprint/i;
const NO_EFFECT_PROMISE = /정확|개선|향상|효과가 있|돕기 위함/;

const shown = () => document.body.textContent ?? "";
const resultSection = () => screen.getByRole("region", { name: /^예시 · / });

describe("bread prototype copy", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("settles no feeling, claims no identical physiology, no fingerprint and no effect, in any example", () => {
    render(<BreadPrototype />);
    for (const title of SCENARIO_TITLES) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(title) }));
      for (const pattern of [NO_SETTLED_FEELING, NO_PHYSIOLOGY_CLAIM, NO_FINGERPRINT, NO_EFFECT_PROMISE]) {
        expect(shown()).not.toMatch(pattern);
      }
    }
  });

  it("labels each example and offers several words with 잘 모르겠음", () => {
    render(<BreadPrototype />);
    for (const title of SCENARIO_TITLES) {
      fireEvent.click(screen.getByRole("button", { name: new RegExp(title) }));
      const result = resultSection();
      expect(within(result).getByText(`예시 · ${title}`)).toBeTruthy();
      const words = within(result).getAllByRole("listitem").map((item) => item.textContent);
      expect(words.length).toBeGreaterThanOrEqual(3);
      expect(words).toContain("잘 모르겠음");
      expect(within(result).getByText(/다른 말이 더 가까울 수도 있습니다/)).toBeTruthy();
    }
  });

  it("calls the Barrett view one theoretical position, not the answer", () => {
    render(<BreadPrototype />);
    expect(shown()).toMatch(/하나의 이론적 입장에서 나온 비유/);
    expect(shown()).toMatch(/최종 정답으로 구현하지 않습니다/);
    expect(shown()).toMatch(/검증되지 않았습니다/);
  });

  it("does not let the body choices decide the words", () => {
    render(<BreadPrototype />);
    const before = within(resultSection()).getAllByRole("listitem").map((item) => item.textContent);
    for (const label of ["느림", "깊고 고름", "이완됨 (풀림)", "서늘함"]) fireEvent.click(screen.getByRole("button", { name: label }));
    expect(within(resultSection()).getAllByRole("listitem").map((item) => item.textContent)).toEqual(before);
  });

  it("uses text labels, not emoji", () => {
    render(<BreadPrototype />);
    expect(shown()).not.toMatch(/\p{Emoji_Presentation}/u);
  });
});

describe("bread prototype route", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it("renders the 404 page in a production build", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => BreadPrototypePage()).toThrow(/NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it("stays open in development", () => {
    vi.stubEnv("NODE_ENV", "development");
    render(BreadPrototypePage());
    expect(screen.getByRole("heading", { level: 1, name: "빵 비유로 살펴보기" })).toBeTruthy();
  });
});
