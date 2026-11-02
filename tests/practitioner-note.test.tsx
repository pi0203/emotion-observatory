import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import EmotionApp from "../app/emotion-app";
import { koOnly } from "../lib/i18n/messages.ko";

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
    expect(fold.textContent).not.toMatch(/청소년|감정카드/);
  });

  it("is not on the English screen", () => {
    render(<EmotionApp locale="en" />);
    expect(screen.queryByText(koOnly.practitioner.summary)).toBeNull();
  });
});
