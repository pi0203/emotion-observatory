import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import EmotionApp from "../app/emotion-app";
import { koOnly } from "../lib/i18n/messages.ko";
import { enOnly } from "../lib/i18n/messages.en";

/** 「상담·수련 현장에서 보시는 분께」 (2026-11-02, docs/FIELD_NOTES_2026-11-02.md). */
describe("practitioner note on the landing", () => {
  afterEach(cleanup);

  it("sits folded right after 「참고한 연구」, with four lines and a mail link", () => {
    const { container } = render(<EmotionApp locale="ko" />);
    const folds = [...container.querySelectorAll("details.about-fold")];
    const titles = folds.map((fold) => fold.querySelector("summary")?.textContent);
    const at = titles.indexOf(koOnly.practitioner.summary);
    expect(at).toBeGreaterThan(-1);
    expect(titles[at - 1]).toMatch(/^참고한 연구/);
    const fold = folds[at] as HTMLDetailsElement;
    expect(fold.open).toBe(false);
    expect(fold.querySelectorAll("li")).toHaveLength(4);
    const mail = fold.querySelector("a")!;
    expect(mail.getAttribute("href")).toBe("mailto:a5897@icloud.com");
    expect(mail.textContent).toBe("a5897@icloud.com");
    expect(mail.parentElement!.textContent).toBe("단어 목록, 문장, 안전 안내에서 개선이 필요한 곳이 있으면 a5897@icloud.com으로 알려 주세요. 내담자 정보나 사례는 적지 말아 주세요.");
    expect(fold.textContent).not.toMatch(/청소년|감정카드/);
  });

  it("is on the English screen as a draft, with the same mail link and a not-reviewed line at its end (2026-11-10)", () => {
    const { container } = render(<EmotionApp locale="en" />);
    expect(screen.queryByText(koOnly.practitioner.summary)).toBeNull();
    const fold = [...container.querySelectorAll("details.about-fold")].find((d) => d.querySelector("summary")?.textContent === enOnly.practitioner.summary)!;
    expect(fold).toBeTruthy();
    expect(fold.querySelectorAll("li")).toHaveLength(4);
    expect(fold.querySelector("a")!.getAttribute("href")).toBe(`mailto:${koOnly.practitioner.mailAddress}`);
    expect(fold.lastElementChild!.className).toBe("draft-note");
    expect(fold.lastElementChild!.textContent).toBe(enOnly.draftNote);
  });
});
